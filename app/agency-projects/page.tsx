'use client';
import {useState} from 'react';
import directory from '@/public/civic-directory.json';

type Review = {status:string; evidenceUrl?:string; note?:string};
export default function AgencyProjects(){
 const [query,setQuery]=useState(''),[source,setSource]=useState('all');
 const rows=directory.sources.flatMap(s=>s.records.map(r=>({...r,sourceId:s.id,sourceName:s.name,review:r.review as Review})));
 const items=rows.filter(r=>(source==='all'||r.sourceId===source)&&`${r.name} ${r.summary}`.toLowerCase().includes(query.toLowerCase()));
 return <main className="updates-page">
  <a href="/">← Back to the map</a>
  <h1>Waterfront & school projects</h1>
  <p>Agency project pages collected for review. Some describe ongoing programs or already completed work. These records do not automatically appear as upcoming openings on the map.</p>
  <p className="updates-meta">Collected {directory.retrievedAt.slice(0,10)} · {rows.length} agency records</p>
  <div className="updates-controls">
   <input aria-label="Search agency projects" placeholder="Search a school or waterfront project" value={query} onChange={e=>setQuery(e.target.value)}/>
   <label>Source <select aria-label="Agency source" value={source} onChange={e=>setSource(e.target.value)}><option value="all">All agencies</option>{directory.sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  </div>
  <p>{items.length} matching records</p>
  <section aria-label="Agency projects">{items.map(r=><article key={r.id} className="updates-card">
   <small>{r.sourceName}</small>
   <h2><a href={r.url} target="_blank" rel="noreferrer">{r.name} ↗</a></h2>
   <p>{r.summary}</p>
   <strong>{r.completed?'Completed / opened':'Current completion status unverified'}</strong>
   <p>{r.status}</p>
   {r.review.note&&<p>{r.review.note} <a href={r.review.evidenceUrl} target="_blank" rel="noreferrer">Reviewed evidence ↗</a></p>}
   {r.sourceUpdatedText&&<small>{r.sourceUpdatedText} · page update, not an opening date</small>}
  </article>)}</section>
  {!items.length&&<p>No matching agency records. Try a broader search.</p>}
  <footer><h2>Coverage</h2>{directory.sources.map(s=><p key={s.id}><a href={s.url}>{s.name}</a>: {s.scope}</p>)}<a href="/civic-directory.json">Download agency records</a> · <a href="/updates">Local reporting</a></footer>
 </main>;
}
