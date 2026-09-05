"""Assemble the complete downloaded source snapshots; never infer arrival dates."""
import json, re, math, hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
read = lambda name: json.loads((ROOT / 'data' / (name + '.json')).read_text())
def clean(s): return re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', str(s or ''))).strip()
def num(v):
    try: return float(v or 0)
    except (ValueError, TypeError): return 0
def date(v):
    v = str(v or '')[:10]
    return v if re.match(r'^\d{4}-\d\d-\d\d$', v) else None
def coord(lon, lat):
    x,y=num(lon),num(lat)
    return [x,y] if -122.53 <= x <= -122.34 and 37.70 <= y <= 37.84 else None
sources = [
 {'id':'planning','name':'SF Planning · Development Pipeline','url':'https://data.sfgov.org/Housing-and-Buildings/San-Francisco-Development-Pipeline/6jgi-cpb4','updated':'2026-08-28','records':len(read('pipeline')),'note':'Citywide filed development proposals, approved projects and construction. Does not include every business opening or early concept.'},
 {'id':'housing','name':'MOHCD · Affordable Housing Pipeline','url':'https://data.sfgov.org/Housing-and-Buildings/Mayor-s-Office-of-Housing-and-Community-Development-A/aaxw-2cb8','updated':'2026-05-21','records':len(read('affordable')),'note':'Published construction-completion estimates. Completion is not necessarily the move-in date.'},
 {'id':'transport','name':'SFCTA · MyStreetSF','url':'https://mystreetsf.sfcta.org/','updated':None,'records':len(read('transport')),'note':'Transportation projects funded or overseen by SFCTA. Closed projects are excluded. The source does not expose a dataset-wide update date.'},
]
metadata=read('metadata') if (ROOT/'data'/'metadata.json').exists() else {}
for source,name in zip(sources,['pipeline','affordable','transport']):
    if metadata.get(name,{}).get('updated'): source['updated']=metadata[name]['updated']
projects=[]; cases={}; parcels={}; missing=0; closed=0
def evidence(source, ref, url=None):
    return {'source':source, 'reference':clean(ref), 'url':url or next(s['url'] for s in sources if s['id']==source)}
for r in read('pipeline'):
    xy=coord(r.get('longitude'),r.get('latitude'))
    desc=clean(r.get('description_planning') or r.get('description_dbi'))
    units=int(num(r.get('net_pipeline_units')))
    if units>0: category='Housing'
    elif re.search(r'restaurant|cafe|café|coffee|bakery|bar\b|food',desc,re.I): category='Food & shops'
    elif num(r.get('retnet'))>0 or re.search(r'retail|storefront|shop\b',desc,re.I): category='Food & shops'
    else: category='Other places'
    ref=r.get('case_no') or r.get('bpa_no') or r.get('blklot')
    status={'PL Filed':'Planning application','PL Approved':'Planning approved','BP Filed':'Permit application','BP Approved':'Permit approved','BP Issued':'Permit issued','BP BP Issued':'Permit issued','Construction':'Under construction'}.get(r.get('current_status'),r.get('current_status'))
    p={'id':'pl-'+hashlib.sha1((str(ref)+str(r.get('nameaddr'))).encode()).hexdigest()[:12], 'name':clean(r.get('nameaddr')),'address':clean(r.get('nameaddr')), 'description':desc or 'Development project listed in the city planning pipeline. See the source record for details.', 'category':category,'coordinates':xy,'locations':[xy] if xy else [],'neighborhood':r.get('nhood37') or r.get('nhood41') or 'San Francisco', 'status':status, 'statusDate':date(r.get('current_status_date')), 'date':None,'dateKind':None,'dateSource':None, 'units':units if units>0 else None,'affordableUnits':int(num(r.get('pipeline_affordable_units'))) or None,'sources':[evidence('planning',ref)], 'parcel':r.get('blklot'),'case':r.get('case_no')}
    projects.append(p)
    if r.get('case_no'): cases.setdefault(r['case_no'],[]).append(p)
    parcels.setdefault(r.get('blklot'),[]).append(p)
for r in read('affordable'):
    case=r.get('planning_case_number'); matches=cases.get(case,[]) if case else []
    # Only merge uniquely identified planning cases, never mere name similarity.
    p=matches[0] if len(matches)==1 else None
    xy=coord(r.get('longitude'),r.get('latitude'))
    if p is None:
        p={'id':'ah-'+str(r.get('project_id')),'name':clean(r.get('project_name')),'address':clean(r.get('plannning_approval_address') or r.get('project_name')),'description':clean(r.get('project_type'))+' affordable housing project. '+clean(r.get('construction_status'))+'.','category':'Housing','coordinates':xy,'locations':[xy] if xy else [],'neighborhood':r.get('city_analysis_neighborhood') or 'San Francisco','status':clean(r.get('project_status')),'statusDate':None,'date':None,'dateKind':None,'dateSource':None,'units':int(num(r.get('total_project_units'))) or None,'affordableUnits':int(num(r.get('mohcd_affordable_units'))) or None,'sources':[], 'case':case}
        projects.append(p)
    p['sources'].append(evidence('housing',r.get('project_id')))
    estimate=date(r.get('estimated_construction_completion'))
    if estimate:
        p.update(date=estimate,dateKind='Estimated construction completion',dateSource='housing')
    if r.get('project_name') and r['project_name']!=p['address']: p['name']=clean(r['project_name'])
    if not p['coordinates'] and xy: p.update(coordinates=xy,locations=[xy])
for r in read('transport'):
    if r.get('status')!='active': closed+=1;continue
    geometry=r.get('geometry') or ''
    groups=re.findall(r'<coordinates>(.*?)</coordinates>',geometry,re.S)
    locations=[];paths=[]
    for g in groups:
        pts=[]
        for s in g.split():
            parts=s.split(',')
            if len(parts)>=2:
                xy=coord(parts[0],parts[1])
                if xy: pts.append(xy)
        if len(pts)>1: paths.append(pts);locations.append(pts[len(pts)//2])
        elif pts: locations+=pts
    locations=list({tuple(x):x for x in locations}.values())
    p={'id':'tr-'+r['project_number'],'name':clean(r.get('project_name')),'address':clean(r.get('project_location')) or 'San Francisco','description':clean(r.get('description')) or clean(r.get('project_name')),'category':'Streets & transit','coordinates':locations[0] if locations else None,'locations':locations,'paths':paths,'neighborhood':'San Francisco','status':clean(r.get('current_phase')) or 'Active project','statusDate':None,'date':date(r.get('project_expected_completion')),'dateKind':'Estimated open for use','dateSource':'transport','units':None,'sources':[evidence('transport',r['project_number'],'https://mystreetsf.sfcta.org/projects/'+r['project_number'])]}
    if r.get('project_details_page','').startswith('https://'):p['sources'].append(evidence('transport','Project page',r['project_details_page']))
    projects.append(p)
missing=sum(not p['coordinates'] for p in projects)
out={'retrievedAt':datetime.now(timezone.utc).isoformat(),'sources':sources,'projects':projects,'coverage':{'unmapped':missing,'excludedTransport':closed,'mergedHousing':sum(len(p['sources'])>1 and p['category']=='Housing' for p in projects),'note':'Complete ingestion of these three published feeds; not every future change in SF. Standalone business openings, parks, utilities and schools are not comprehensively covered. Source records can be stale. Date colors use published estimates, never permit-stage predictions.'}}
(ROOT/'data'/'base-projects.json').write_text(json.dumps(out,separators=(',',':')))
print('Projects:',len(projects),'Mapped:',len(projects)-missing,'With dates:',sum(bool(p['date']) for p in projects),'Categories:',dict(Counter(p['category'] for p in projects)))
