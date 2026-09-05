'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as GLMap, GeoJSONSource } from 'maplibre-gl';
import { Wrench, Trees, ArrowUpRight, Search, MapPin, Layers, LocateFixed, Building2, TrainFront, Store, ArrowRight, X, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import 'maplibre-gl/dist/maplibre-gl.css';
import { registerMapTools, type MapActions } from '@/lib/webmcp';
import { findPlaces, type Place } from '@/lib/places';
import { BUSINESS_KINDS, projectKind, kindLabel } from '@/lib/project-kind';
import { MAP_ICONS } from '@/lib/map-icons';
import { windowFor, matchesWindow, type ArrivalRange } from '@/lib/timing';

type Source = { id: string; name: string; url: string; updated: string|null; records:number; note:string };
type Project = { id:string; aliases?:string[]; name:string; arrival?:ArrivalRange; lifecycle?:string; evidenceType?:string; evidence?:{url:string;type:string;publishedAt?:string;checkedAt:string;claim?:string}[]; summary?:string; recordLabel?:string; kindOverride?:string; reviewedAt?:string; evidenceUrl?:string; arrivalLabel?:string; address:string; description:string; category:string; coordinates:[number,number]|null; locations:[number,number][]; paths?:[number,number][][]; neighborhood:string; status:string; statusDate:string|null; date:string|null; dateKind:string|null; dateSource:string|null; units?:number|null; affordableUnits?:number|null; sources:{source:string;reference:string;url:string}[] };
type Data = { projects:Project[]; retrievedAt:string; sources:Source[]; coverage:{unmapped:number; excludedTransport:number;mergedHousing:number;note:string} };
const WINDOWS = [
  {id:'soon',label:'Next 3 months',color:'#008047',short:'0–3 months'},
  {id:'year',label:'3–12 months',color:'#bb6b00',short:'3–12 months'},
  {id:'later',label:'1+ years',color:'#7028d8',short:'1+ years'},
  {id:'unknown',label:'Date unknown',color:'#688399',short:'Date unknown'},
  {id:'past',label:'Past estimate',color:'#bd303b',short:'Needs update'},
];
const CATEGORIES=['All projects','Housing','Food & shops','Streets & transit','Parks & recreation','Utilities & public works','Other places'];
function fmt(d:string|null){return d?new Date(d.slice(0,10)+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not published';}
function CategoryIcon({category}:{category:string}){return category==='Utilities & public works'?<Wrench size={16}/>:category==='Parks & recreation'?<Trees size={16}/>:category==='Housing'?<Building2 size={16}/>:category==='Streets & transit'?<TrainFront size={16}/>:category==='Food & shops'?<Store size={16}/>:<MapPin size={16}/>;}
export default function Home(){
  const [data,setData]=useState<Data|null>(null),[loadError,setLoadError]=useState('');
  const [query,setQuery]=useState(''),[category,setCategory]=useState('All projects'),[window,setWindow]=useState('all'),[page,setPage]=useState(0);
  const [businessKind,setBusinessKind]=useState('all');
  const [viewRevision,setViewRevision]=useState(0);
  const [scope,setScope]=useState('projects'),[leadState,setLeadState]=useState('idle');
  const matchesScope=(p:Project)=>scope==='all'||(scope==='announced'?p.lifecycle==='announced':scope==='leads'?p.lifecycle==='lead':p.lifecycle!=='lead'&&p.lifecycle!=='opened');
  const leadRequest=useRef<Promise<void>|null>(null);
  const ensureLeads=useCallback(async()=>{
    if(leadRequest.current)return leadRequest.current;
    setLeadState('loading');
    leadRequest.current=fetch('/business-leads.json').then(r=>{if(!r.ok)throw Error('Business leads could not load');return r.json();}).then(d=>{const old=dataRef.current;if(!old)throw Error('Base data is still loading');const next={...old,projects:[...old.projects,...d.projects]};dataRef.current=next;setData(next);setLeadState('loaded');}).catch(e=>{leadRequest.current=null;setLeadState('error');throw e;});
    return leadRequest.current;
  },[]);
  useEffect(()=>{if(['leads','all'].includes(scope)&&leadState==='idle'&&data)void ensureLeads().catch(()=>{});},[scope,leadState,data,ensureLeads]);
  const resetFilters=()=>{setQuery('');setCategory('All projects');setBusinessKind('all');setWindow('all');setScope('projects');setPage(0);};
  const changeCategory=(c:string)=>{setCategory(c);setBusinessKind('all');setWindow('all');setQuery('');setPage(0);};
  const [overlaps,setOverlaps]=useState<Project[]>([]);
  const [selected,setSelected]=useState<Project|null>(null),[about,setAbout]=useState(false),[mapError,setMapError]=useState('');
  const [ready,setReady]=useState(false),[now]=useState(()=>new Date()),[mobileList,setMobileList]=useState(false);
  const mapRef=useRef<GLMap|null>(null),container=useRef<HTMLDivElement>(null),dataRef=useRef<Data|null>(null);
  const [placeQuery,setPlaceQuery]=useState(''),[places,setPlaces]=useState<Place[]>([]),[placeStatus,setPlaceStatus]=useState(''),[placeBusy,setPlaceBusy]=useState(false);
  const locationMarker=useRef<import('maplibre-gl').Marker|null>(null);
  const sequence=useRef(0);
  const locate=useCallback(async(q:string)=>{
    const seq=++sequence.current;setMobileList(false);setPlaceQuery(q);setPlaceBusy(true);setPlaceStatus('');setPlaces([]);
    try{const results=await findPlaces(q);if(seq===sequence.current){setPlaces(results);setPlaceStatus(results.length?'Choose a location below.':'No SF location found. Try a full street address.');}return results;}
    catch(e){if(seq===sequence.current)setPlaceStatus((e as Error).message);throw e;}
    finally{if(seq===sequence.current)setPlaceBusy(false);}
  },[]);
  const goToPlace=useCallback(async(p:Place)=>{
    const map=mapRef.current;if(!map)throw Error('Map is still loading');
    const gl=await import('maplibre-gl');locationMarker.current?.remove();
    const el=document.createElement('div');el.className='home-marker';el.textContent='⌂';el.title=p.label;
    locationMarker.current=new gl.Marker({element:el}).setLngLat(p.coordinates).addTo(map);
    setPlaceQuery(p.label);setPlaces([]);setPlaceStatus('Showing '+p.label);setMobileList(false);
    map.flyTo({center:p.coordinates,zoom:p.kind==='Locality'?14:16,duration:650});
    await new Promise<void>(resolve=>{map.once('moveend',()=>resolve());setTimeout(resolve,900);});
    return {location:p.label,coordinates:p.coordinates,zoom:map.getZoom()};
  },[]);
  const choose=useCallback((p:Project)=>{setSelected(p);if(p.coordinates)mapRef.current?.flyTo({center:p.coordinates,zoom:15,duration:650});},[]);
  useEffect(()=>{let active=true;fetch('/projects.json').then(r=>{if(!r.ok)throw Error();return r.json() as Promise<Data>;}).then(d=>{if(active){setData(d);dataRef.current=d;}}).catch(()=>active&&setLoadError('Project data could not load. Please reload to try again.'));return()=>{active=false;};},[]);
  useEffect(()=>{
    let disposed=false;
    import('maplibre-gl').then(gl=>{
      if(disposed||!container.current)return;
      gl.setWorkerUrl('/maplibre-gl-worker.mjs');gl.setWorkerCount(2);
      const map=new gl.Map({maxTileCacheSize:32,maxTileCacheZoomLevels:2,pixelRatio:Math.min(globalThis.devicePixelRatio||1,1.5),container:container.current,center:[-122.438,37.765],zoom:12.8,minZoom:10,maxZoom:18,maxBounds:[[-122.58,37.65],[-122.28,37.88]],style:{version:8,sources:{basemap:{type:'raster',tiles:['/api/tiles/{z}/{x}/{y}'],tileSize:256,maxzoom:16,attribution:'Map tiles by <a href="https://stamen.com">Stamen Design</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="https://watercolormaps.collection.cooperhewitt.org">Cooper Hewitt</a> · Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA</a>'}},layers:[{id:'basemap',type:'raster',source:'basemap',paint:{'raster-saturation':0,'raster-opacity':1}}]},attributionControl:{compact:true}});
      map.on('moveend',()=>setViewRevision(v=>v+1));
      mapRef.current=map;map.addControl(new gl.NavigationControl({showCompass:false}),'bottom-right');
      map.on('load',async()=>{
        map.addSource('projects',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        await Promise.all(Object.entries(MAP_ICONS).flatMap(([kind,svg])=>WINDOWS.map(w=>new Promise<void>((resolve,reject)=>{
          const image=new Image();
          image.onload=()=>{if(disposed){resolve();return;}const canvas=document.createElement('canvas');canvas.width=56;canvas.height=56;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,56,56);map.addImage(kind+'-'+w.id,ctx.getImageData(0,0,56,56),{pixelRatio:2});resolve();};
          image.onerror=()=>reject(Error('Project icon failed to load'));
          const glyph=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
          const art='<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="5" fill="'+(w.id==='unknown'?'#fff':w.color)+'" stroke="'+(w.id==='unknown'?'#64748b':'#fff')+'" stroke-width="2"/><g transform="translate(4 4)" fill="none" stroke="'+(w.id==='unknown'?'#475569':'#fff')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+glyph+'</g></svg>';
          image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art);
        })))).catch(()=>setMapError('Project icons could not load. Please reload.'));
        if(disposed)return;
        map.addLayer({id:'project-points',type:'symbol',source:'projects',layout:{'icon-image':['get','icon'],'icon-size':0.9,'icon-allow-overlap':true,'icon-ignore-placement':true}});
        const popup=new gl.Popup({closeButton:false,closeOnClick:false,offset:15});
        map.on('mousemove','project-points',e=>{const p=dataRef.current?.projects.find(p=>p.id===e.features?.[0]?.properties?.id);if(p)popup.setLngLat(e.lngLat).setText(p.name+' · '+kindLabel(p)+' · '+(p.arrivalLabel||(p.date?fmt(p.date):'Date unknown'))).addTo(map);});
        map.on('mouseleave','project-points',()=>popup.remove());
        map.addSource('project-paths',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        map.addLayer({id:'project-lines',type:'line',source:'project-paths',paint:{'line-color':['get','color'],'line-width':3,'line-opacity':0.7}},'project-points');
        map.on('click','project-points',e=>{popup.remove();const ids=new Set(e.features?.map(f=>f.properties?.id));const matches=dataRef.current?.projects.filter(p=>ids.has(p.id))||[];if(matches.length>1)setOverlaps(matches);else if(matches[0])choose(matches[0]);});
        map.on('mouseenter','project-points',()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave','project-points',()=>{map.getCanvas().style.cursor='';});setReady(true);
      });
      map.on('error',e=>{if(e.error?.message?.includes('WebGL'))setMapError('The map is unavailable on this device. You can still explore every project in the list.');});
    }).catch(()=>setMapError('The map could not load. You can still explore every project in the list.'));
    return()=>{disposed=true;mapRef.current?.remove();mapRef.current=null;};
  },[choose]);
  const filtered=useMemo(()=>{
    if(!data)return [];
    const q=query.trim().toLowerCase();return data.projects.filter(p=>matchesScope(p)&&(category==='All projects'||p.category===category)&&(category!=='Food & shops'||businessKind==='all'||projectKind(p)===businessKind)&&matchesWindow(p,window,now)&&(!q||[p.name,p.address,p.neighborhood,p.description,...p.sources.map(s=>s.reference)].join(' ').toLowerCase().includes(q))).sort((a,b)=>{
      const rank=(p:Project)=>({soon:0,year:1,later:2,unknown:3,past:4}[windowFor(p,now)]);
      return rank(a)-rank(b)||(a.date||'9999').localeCompare(b.date||'9999')||a.name.localeCompare(b.name);
    });
  },[data,query,category,window,now,businessKind,scope]);
  useEffect(()=>{setPage(0);},[query,category,window,businessKind]);
  useEffect(()=>{
    if(!ready||!mapRef.current)return;
    const features=[...filtered].reverse().flatMap(p=>p.locations.map(x=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:x},properties:{id:p.id,icon:projectKind(p)+'-'+windowFor(p,now),timing:windowFor(p,now),color:WINDOWS.find(w=>w.id===windowFor(p,now))!.color}})));
    (mapRef.current.getSource('projects') as GeoJSONSource)?.setData({type:'FeatureCollection',features});
    (mapRef.current.getSource('project-paths') as GeoJSONSource)?.setData({type:'FeatureCollection',features:filtered.flatMap(p=>(p.paths||[]).map(coordinates=>({type:'Feature' as const,geometry:{type:'LineString' as const,coordinates},properties:{color:WINDOWS.find(w=>w.id===windowFor(p,now))!.color}})))});
  },[filtered,ready,now]);
  const actions=useRef<MapActions>(null!);
  actions.current={
    search:async(q)=>{if(!dataRef.current)throw Error('Data is still loading');await ensureLeads();setMobileList(true);setQuery(q);setScope('all');setCategory('All projects');setBusinessKind('all');setWindow('all');setPage(0);await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));const matches=dataRef.current.projects.filter(p=>[p.name,p.address,p.description,p.neighborhood,...p.sources.map(s=>s.reference)].join(' ').toLowerCase().includes(q.trim().toLowerCase()));return {total:matches.length,projects:matches.slice(0,20).map(p=>({id:p.id,name:p.name,date:p.date,status:p.status}))};},
    locate:async(q)=>{const known=places.find(p=>p.label===q);if(known)return goToPlace(known);const results=await locate(q);if(results.length===1)return goToPlace(results[0]);return {matches:results,message:results.length?'Choose a returned label with focus_location.':'No SF location found'};},
    filter:async(c,w,k,s)=>{if(s&&['leads','all'].includes(s))await ensureLeads();setScope(s||'projects');setQuery('');setBusinessKind(k||'all');setCategory(c);setWindow(w);setMobileList(false);await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return {category:c,timing:w,businessKind:k||'all',scope:s||'projects'};},
    read:async()=>({selected:selected?.id||null,visibleProjects:filtered.filter(p=>p.locations.some(c=>mapRef.current?.getBounds().contains(c))).slice(0,40).map(p=>({id:p.id,name:p.name,category:p.category,kind:kindLabel(p),date:p.date})),query,category,businessKind,scope,leadState,timing:window,location:placeStatus,zoom:mapRef.current?.getZoom(),total:filtered.length,projects:filtered.slice(0,20).map(p=>({id:p.id,name:p.name,category:p.category,kind:kindLabel(p),date:p.date,summary:p.summary,recordLabel:p.recordLabel,arrivalLabel:p.arrivalLabel,evidenceUrl:p.evidenceUrl,arrival:p.arrival,lifecycle:p.lifecycle,sources:p.sources}))}),
    open:async(id)=>{const p=dataRef.current?.projects.find(p=>p.id===id||p.aliases?.includes(id));if(!p)throw Error('Project not found');choose(p);await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return {id:p.id,name:p.name,date:p.date,summary:p.summary,recordLabel:p.recordLabel,arrivalLabel:p.arrivalLabel,evidenceUrl:p.evidenceUrl,arrival:p.arrival,lifecycle:p.lifecycle,sources:p.sources};}
  };
  useEffect(()=>registerMapTools(()=>actions.current),[]);
  const timingCounts=useMemo(()=>Object.fromEntries(WINDOWS.map(w=>[w.id,data?.projects.filter(p=>matchesScope(p)&&(category==='All projects'||p.category===category)&&(category!=='Food & shops'||businessKind==='all'||projectKind(p)===businessKind)&&(!query.trim()||[p.name,p.address,p.neighborhood,p.description,...p.sources.map(s=>s.reference)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))&&matchesWindow(p,w.id,now)).length||0])),[data,now,category,businessKind,query,scope]);
  const inView=useMemo(()=>filtered.filter(p=>p.locations.some(c=>mapRef.current?.getBounds().contains(c))).length,[filtered,viewRevision,ready]);
  const showMatches=()=>{const points=filtered.flatMap(p=>p.locations);if(!points.length)return;mapRef.current?.fitBounds([[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]],{padding:65,maxZoom:15,duration:650});};
  const totalPages=Math.ceil(filtered.length/30),shown=filtered.slice(page*30,(page+1)*30),mapped=filtered.filter(p=>p.coordinates).length;
  return <main className="atlas">
    <header className="topbar"><a className="wordmark" href="/" aria-label="Coming to SF home"><span className="brand-symbol"><ArrowUpRight size={23}/></span><span>coming to <b>SF</b><span className="brand-period">.</span></span></a><button className="about-button" onClick={()=>setAbout(true)}><Info size={16}/><span>Sources & coverage</span></button></header>
    <div className="map-toolbar">
        <div className="location-search">
          <form onSubmit={e=>{e.preventDefault();void locate(placeQuery).catch(()=>{});}}><MapPin size={18}/><Input aria-label="Your SF neighborhood or address" placeholder="Neighborhood or home address" value={placeQuery} onChange={e=>setPlaceQuery(e.target.value)}/><button disabled={placeBusy||!placeQuery.trim()}>{placeBusy?'Finding…':'Zoom in'}</button></form>
          {places.length>0&&<div className="place-results">{places.map(p=><button key={p.label} onClick={()=>void goToPlace(p)}><MapPin size={16}/>{p.label}</button>)}</div>}
          {placeStatus&&!placeStatus.startsWith('Showing')&&<p role="status">{placeStatus}</p>}
          <small>Address lookup by Esri. Searches aren’t saved.</small>
        </div>
      <label className="timing-filter">Show <select aria-label="Filter by evidence" value={scope} onChange={e=>{setScope(e.target.value);setWindow('all');setBusinessKind('all');setQuery('');}}><option value="projects">Announcements & city projects</option><option value="announced">Announced openings only</option><option value="leads">Unverified business leads</option><option value="all">All records, including already open</option></select></label>
      <div className="type-filters" aria-label="Filter by project type">{CATEGORIES.map(c=><button key={c} aria-pressed={category===c} onClick={()=>changeCategory(c)}>{c!=='All projects'&&<CategoryIcon category={c}/>}{{'All projects':'All','Housing':'Homes','Food & shops':'Shops','Streets & transit':'Transit','Parks & recreation':'Parks','Utilities & public works':'Works','Other places':'Other'}[c]}</button>)}</div>
      {category==='Food & shops'&&<label className="timing-filter">Kind <select aria-label="Filter by business kind" value={businessKind} onChange={e=>{setBusinessKind(e.target.value);setWindow('all');}}><option value="all">All kinds</option>{Object.entries(BUSINESS_KINDS).map(([k,label])=>{const count=data?.projects.filter(p=>matchesScope(p)&&p.category==='Food & shops'&&projectKind(p)===k&&(!query.trim()||[p.name,p.address,p.neighborhood,p.description,...p.sources.map(s=>s.reference)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))).length||0;return <option key={k} value={k} disabled={!count}>{label} ({count})</option>;})}</select></label>}
      <label className="timing-filter">When <select aria-label="Filter by arrival time" value={window} onChange={e=>setWindow(e.target.value)}><option value="all">Any time</option>{WINDOWS.map(w=><option key={w.id} value={w.id} disabled={!timingCounts[w.id]}>{w.label} ({timingCounts[w.id]})</option>)}</select></label>
      {query&&<p className="active-search">Search: “{query}” <button onClick={()=>setQuery('')}>Clear search</button></p>}
      {(category!=='All projects'||window!=='all'||query||businessKind!=='all'||scope!=='projects')&&<button className="clear-filters" onClick={resetFilters}>Clear filters</button>}
      {category==='Food & shops'&&data&&<p className="undated-note">Colors include published month/season targets. Broad targets can overlap time filters. Unknown dates stay white. Counts are source coverage, not a citywide total.</p>}
    </div>
    {leadState==='loading'&&<p role="status" className="undated-note">Loading business and permit leads…</p>}{leadState==='error'&&<p role="alert" className="undated-note">Business leads could not load. <button onClick={()=>setLeadState('idle')}>Retry</button></p>}
    <div className="workspace">
      <aside className={'project-browser '+(mobileList?'mobile-open':'')}>
        <div className="browser-heading"><div className="eyebrow"><span className="live-dot"/> SAN FRANCISCO</div><h1>What’s coming<br/>around you?</h1><p>New places. New homes. New ways to get around.</p><div className="search-field"><Search size={18}/><Input aria-label="Search projects, streets or neighborhoods" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Street, neighborhood or project"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={16}/></button>}</div>
        <div className="category-row" aria-label="Project categories">{CATEGORIES.map(c=><button key={c} aria-pressed={category===c} onClick={()=>changeCategory(c)}>{c}</button>)}</div></div>
        <div className="result-heading"><span><strong>{filtered.length.toLocaleString()}</strong> projects{window!=='all'&&' · '+WINDOWS.find(w=>w.id===window)?.short}</span><span>SOONEST FIRST</span></div>
        <div className="project-list" aria-label="Upcoming projects" aria-live="polite">{loadError?<div className="empty-state">{loadError}</div>:!data?<div className="empty-state">Loading city records…</div>:!filtered.length?<div className="empty-state"><Search size={25}/><h2>No matching projects</h2><p>Try another street or clear your filters.</p><button onClick={resetFilters}>Clear filters</button></div>:shown.map(p=>{const w=WINDOWS.find(w=>w.id===windowFor(p,now))!;return <button className="project-row" key={p.id} onClick={()=>choose(p)}><span className="row-dot" style={{background:w.color}}/><div className="row-body"><span className="row-meta"><CategoryIcon category={p.category}/>{kindLabel(p)}</span><h2>{p.name}</h2><p className="row-description">{p.summary||p.description}</p>{p.recordLabel&&<span className="record-label">{p.recordLabel}</span>}<div className="row-bottom"><span style={{color:w.id==='unknown'?'#50697c':w.color}}>{p.arrivalLabel||(p.date?fmt(p.date):'Date not announced')}</span><ArrowUpRight size={15}/></div>{w.id==='past'&&<span className="stale-label">Past estimate · current timing unconfirmed</span>}{!p.coordinates&&<span className="stale-label">Location not mapped</span>}</div></button>;})}</div>
        {totalPages>1&&<div className="pagination"><button disabled={page===0} aria-label="Previous projects" onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/></button><span>{page*30+1}–{Math.min((page+1)*30,filtered.length)} of {filtered.length.toLocaleString()}</span><button disabled={page+1>=totalPages} aria-label="Next projects" onClick={()=>setPage(p=>p+1)}><ChevronRight size={18}/></button></div>}
        <div className="browser-footer">Public records, connected. <button onClick={()=>setAbout(true)}>What’s covered <ArrowUpRight size={13}/></button></div>
      </aside>
      <section className="map-section" aria-label="Map of upcoming San Francisco projects"><div ref={container} className="map"/>
        <button className="reset-map" aria-label="Reset map to San Francisco" onClick={()=>{locationMarker.current?.remove();setPlaceStatus('');setPlaceQuery('');setPlaces([]);mapRef.current?.flyTo({center:[-122.438,37.765],zoom:12.8});}}><LocateFixed size={19}/></button>
        {mapError&&<div className="map-error" role="alert">{mapError}</div>}
        {data&&ready&&!loadError&&((!filtered.length&&leadState!=='loading')||!inView&&filtered.length>0)&&<div className="map-results-notice" role="status">{!filtered.length?<><strong>No matching projects</strong><span>Try another filter or clear your selection.</span><button onClick={resetFilters}>Clear all filters</button></>:<><strong>{filtered.length} matching projects{mapped?' · outside this view':' · no mapped locations'}</strong><span>{mapped?'Your map is zoomed away from these results.':'These records are available in the list.'}</span>{mapped>0&&<button onClick={showMatches}>Show matches on map</button>}<button onClick={()=>setMobileList(true)}>View matching list</button></>}</div>}
        <div className="timing-key" aria-label="Timing colors"><strong>Color = arrival</strong>{WINDOWS.map(w=><button key={w.id} disabled={!timingCounts[w.id]&&window!==w.id} title={timingCounts[w.id]+' matching projects'} aria-pressed={window===w.id} onClick={()=>setWindow(window===w.id?'all':w.id)}><i style={{background:w.id==='unknown'?'white':w.color,border:'1px solid '+w.color}}/>{w.label}</button>)}</div>
        <button className="mobile-toggle" onClick={()=>setMobileList(!mobileList)}><Layers size={17}/>{mobileList?'Show map':`List · ${filtered.length.toLocaleString()}`}</button>
      </section>
    </div>
    <Dialog open={overlaps.length>0} onOpenChange={open=>{if(!open)setOverlaps([]);}}><DialogContent className="coverage-dialog"><DialogHeader><DialogTitle>Projects at this location</DialogTitle><DialogDescription>Choose a project to see its timing and public record.</DialogDescription></DialogHeader><div className="coverage-body">{overlaps.map(p=><button className="project-row" key={p.id} onClick={()=>{setOverlaps([]);choose(p);}}><CategoryIcon category={p.category}/><span>{p.name}<small style={{display:'block'}}>{p.category} · {p.date?fmt(p.date):'Date unknown'}</small></span></button>)}</div></DialogContent></Dialog>
    <Sheet open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}><SheetContent className="detail-sheet">{selected&&<><SheetHeader><span className="eyebrow"><CategoryIcon category={selected.category}/>{kindLabel(selected)}</span><SheetTitle className="detail-title">{selected.name}</SheetTitle><SheetDescription>{selected.address}{selected.neighborhood!=='San Francisco'?' · '+selected.neighborhood:''}</SheetDescription></SheetHeader><div className="detail-body"><div className="arrival" style={{borderColor:WINDOWS.find(w=>w.id===windowFor(selected,now))!.color}}><span className="eyebrow">{selected.dateKind||'ARRIVAL DATE'}</span><strong>{selected.arrivalLabel||(selected.date?fmt(selected.date):'Not announced')}</strong><p>{selected.arrivalLabel?'See the linked evidence below. A month, season or year target is not an exact opening date.':windowFor(selected,now)==='past'?'This estimate has passed. The source still lists this project as active; a new date or completion confirmation is needed.':selected.date?'The source’s published estimate. It may change.':'No published completion date in the connected records. We do not predict timing from permit status.'}</p></div>{selected.category==='Food & shops'&&!selected.recordLabel&&<p className="source-explainer">Business kind inferred from the project description; not a confirmed opening.</p>}<h3>What’s changing</h3>{selected.recordLabel&&<span className="record-label">{selected.recordLabel}</span>}<p className="description">{selected.summary||selected.description}</p>{selected.evidenceUrl&&<a className="source-link" href={selected.evidenceUrl} target="_blank" rel="noreferrer">Read the supporting source <ArrowUpRight size={18}/></a>}{selected.reviewedAt&&<p className="source-explainer">Reviewed {fmt(selected.reviewedAt)}. Permit proposals may have changed or already been completed.</p>}{selected.summary&&<details><summary>Original city description</summary><p className="description">{selected.description}</p></details>}<dl className="facts"><div><dt>Recorded stage</dt><dd>{selected.status}</dd></div>{selected.statusDate&&<div><dt>Stage recorded</dt><dd>{fmt(selected.statusDate)}</dd></div>}{selected.units&&<div><dt>{selected.sources.some(s=>s.source==='planning')?'Net new homes':'Project homes'}</dt><dd>{selected.units.toLocaleString()}</dd></div>}{!!selected.affordableUnits&&<div><dt>Affordable homes</dt><dd>{selected.affordableUnits}</dd></div>}</dl>{selected.evidence&&<><h3>Evidence & timeline</h3>{selected.evidence.map((e,i)=><div key={i} className="coverage-source"><a href={e.url} target="_blank" rel="noreferrer">{e.type} · {new URL(e.url).hostname}</a><small>{e.publishedAt?'Published '+fmt(e.publishedAt)+' · ':''}Checked {fmt(e.checkedAt)}</small>{e.claim&&<p>{e.claim}</p>}</div>)}</>}<h3>The public record</h3><p className="source-explainer">Descriptions and dates come from the linked city records. Use the reference below to locate the entry.</p>{selected.sources.map((s,i)=><a className="source-link" key={i} href={s.url} target="_blank" rel="noreferrer"><span>{data?.sources.find(a=>a.id===s.source)?.name}<small>{s.reference}</small></span><ArrowUpRight size={18}/></a>)}</div></>}</SheetContent></Sheet>
    <Dialog open={about} onOpenChange={setAbout}><DialogContent className="coverage-dialog"><DialogHeader><DialogTitle>What’s on this map</DialogTitle><DialogDescription>A citywide view of published development, affordable housing and transportation projects.</DialogDescription></DialogHeader><div className="coverage-body"><p>{data?.coverage.note}</p><h3>When’s it coming?</h3><p>Green: within 3 months. Amber: 3–12 months. Purple: more than a year. White with a gray outline: no published date. Terracotta: an estimate has passed without a confirmed update. Windows are calculated from today.</p><p>Housing dates are estimated construction completion; transportation dates are estimated open-for-use. Neither guarantees an opening. A permit approval is not an arrival date.</p><p>Business kinds are inferred from the proposed uses described in each record. Other / mixed use means the record does not clearly identify a single business kind. These are projects, not confirmed business openings.</p><p><a href="/source-health.json" target="_blank">Download source coverage & health</a> · <a href="https://github.com/kbhuw/coming-to-sf/tree/main/docs" target="_blank">Pipeline documentation</a> · <a href="/projects.json" target="_blank">Project data</a> · <a href="/business-leads.json" target="_blank">Business leads</a></p><h3>Connected sources</h3>{data?.sources.map(s=><div key={s.id} className="coverage-source"><a href={s.url} target="_blank" rel="noreferrer">{s.name} <ArrowUpRight size={15}/></a><small>{s.records.toLocaleString()} source records · {s.updated?'Source updated '+fmt(s.updated):'Update date not provided'}</small><p>{s.note}</p></div>)}<p>{data?.projects.length.toLocaleString()} loaded records. {data?.projects.filter(p=>!p.coordinates).length.toLocaleString()} have no mapped SF location and remain searchable. Multiple sites can produce multiple dots for one project. Affordable housing records merge into planning records only on a unique case match.</p><p>Snapshot retrieved {data?fmt(data.retrievedAt):'…'}. Structured sources are refreshed by the documented pipeline. Announcements require evidence review. No source guarantees an opening date.</p></div></DialogContent></Dialog>
  </main>;
}
