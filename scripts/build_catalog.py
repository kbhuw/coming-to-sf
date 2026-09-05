"""Deterministic evidence assembly. Offline; inputs stay separate from generated outputs."""
import json,re,hashlib,datetime as dt
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p,default=None):
 f=ROOT/p
 return json.loads(f.read_text()) if f.exists() else default
def xy(v):
 c=v.get('coordinates') if isinstance(v,dict) else v
 if isinstance(c,list) and len(c)==2 and -122.53<=float(c[0])<=-122.34 and 37.70<=float(c[1])<=37.84:return list(map(float,c))
 return None
def addr(s):return re.sub(r'[^a-z0-9]','',s.lower().replace('street','st').replace('avenue','ave').replace('boulevard','blvd'))
def save(name,obj):
 p=ROOT/'public'/name;t=p.with_suffix('.tmp');t.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')));t.replace(p)
def project(id,name,address,description,category,c,source,reference,kind=None):
 return dict(id=id,name=name or address,address=address,description=description,summary=description,category=category,coordinates=c,locations=[c] if c else [],neighborhood='San Francisco',status='Unverified lead',statusDate=None,date=None,dateKind=None,dateSource=None,lifecycle='lead',recordLabel='Discovery lead · opening unverified',kindOverride=kind,sources=[dict(source=source,reference=reference,url='https://data.sfgov.org/d/'+{'businesses':'g8m3-pdis','permits':'i98e-djp9'}[source])])
def main():
 base=read('data/base-projects.json');assert base and base['projects'],'Run base refresh first'
 details=read('lib/project-details.json',{}); geocodes=read('catalog/geocodes.json',{}); health=read('data/source-health.json',{})
 projects=base['projects']
 for p in projects:
  p.update(details.get(p['id'],{}));p['lifecycle']='project'
  if 'Already open' in p.get('recordLabel',''):p['lifecycle']='opened'
  if p['category']=='Food & shops':p['lifecycle']='lead' if p['lifecycle']!='opened' else 'opened'
  p['evidenceType']='city-record'
 index={p['id']:p for p in projects}
 for a in read('catalog/announcements.json',[]):
  id=a.get('mergeInto','ann-'+a['id'])
  if a.get('mergeInto') and id not in index:raise ValueError('Missing explicit merge target: '+id)
  existing=index.get(id)
  c=xy(geocodes.get(a['address'],{}).get('coordinates'))
  if existing is None:
   existing=project(id,a['name'],a['address'],a['summary'],a['category'],c,'businesses',a['id']);existing['sources']=[];projects.append(existing);index[id]=existing
  existing.update({k:v for k,v in a.items() if k not in ['id','mergeInto','evidence']});existing['evidence']=a['evidence'];existing['evidenceUrl']=a['evidence'][0]['url'];existing['status']='Announced; opening not yet verified';existing['geocoding']=geocodes.get(a['address'])
  existing['sources'] += [dict(source='announcements',reference='Announcement · '+(e.get('publishedAt') or e['checkedAt']),url=e['url']) for e in a['evidence']]
 # Attach agency evidence only on an exact, unique normalized project title.
 agency=read('data/sfmta.json',{})
 def title_key(name):return re.sub(r'[^a-z0-9]','',name.lower())
 titles={}
 for p in projects:titles.setdefault(title_key(p['name']),[]).append(p)
 agencyMerged=0
 for r in agency.get('records',[]):
  candidates=titles.get(title_key(r['name']),[])
  evidence=dict(source='sfmta',reference=r['status'],url=r['url'])
  if len(candidates)==1:
   p=candidates[0];p['sources'].append(evidence);p['agencyStatus']=r['status'];agencyMerged+=1
   if r['lifecycle']=='opened':p['lifecycle']='opened';p['status']=r['status']
   continue
  p=dict(id='sfmta-'+hashlib.sha256(r['url'].encode()).hexdigest()[:16],name=r['name'],address='San Francisco · location not yet verified',description=r['summary'],category='Streets & transit',coordinates=None,locations=[],neighborhood='San Francisco',status=r['status'],statusDate=None,date=None,dateKind=None,dateSource=None,lifecycle=r['lifecycle'],recordLabel='Agency project / program',evidenceType='agency-directory',sources=[evidence])
  projects.append(p)
 # Reviewed identity merges preserve every source link and old IDs as aliases.
 for merge in read('catalog/merges.json',[]):
  byid={p['id']:p for p in projects}
  target=byid[merge['canonicalId']]
  for memberId in merge['memberIds']:
   member=byid[memberId]
   target.setdefault('aliases',[]).append(memberId)
   target['sources']+=member['sources']
   target.setdefault('mergedRecords',[]).append(member)
   projects.remove(member)
  target.setdefault('identityEvidence',[]).append(merge)
 parks=read('data/parks.json',{})
 parkGeo=read('catalog/park-geocodes.json',{})
 for r in parks.get('records',[]):
  key=r['url'].split('/')[3];c=xy(parkGeo.get(key,{}).get('coordinates'))
  projects.append(dict(id='park-'+key,name=r['name'],address=parkGeo.get(key,{}).get('matchedAddress') or 'San Francisco · location not yet verified',description=r['summary'] or 'Park project; consult the linked agency page.',category='Parks & recreation',coordinates=c,locations=[c] if c else [],neighborhood='San Francisco',status='Completed (directory description)' if r['completed'] else 'Listed in active park directory; timing unverified',statusDate=None,date=None,dateKind=None,dateSource=None,lifecycle='opened' if r['completed'] else 'project',recordLabel='Park project / program',evidenceType='agency-directory',geocoding=parkGeo.get(key),sources=[dict(source='parks',reference='Agency project page',url=r['url'])]))
 leads=[]; exclusions=Counter()
 for r in read('data/businesses.json',[]):
  n=r.get('self_reported_naics_code','');kind='restaurant' if n.startswith('7225') else 'bar' if n.startswith('7224') else 'hotel' if n.startswith('721') else 'retail' if n.startswith(('44','45')) else 'health' if n.startswith('62') else 'fitness' if n.startswith('71394') else 'shops' if n.startswith(('72','81')) else 'other'
  category='Other places' if kind=='other' else 'Food & shops';c=xy(r.get('location'))
  desc='Registered business location. Registration start '+r.get('location_start_date','unknown')[:10]+'. Industry code: '+(n or 'not reported')+'. Registration can reflect an existing business or ownership change; it is not an opening announcement.'
  p=project('reg-'+r['uniqueid'],r.get('dba_name'),r.get('full_business_address',''),desc,category,c,'businesses',r['uniqueid'],kind)
  p.update(status='Business registration',statusDate=r.get('location_start_date','')[:10] or None,neighborhood=r.get('neighborhoods_analysis_boundaries') or 'San Francisco',evidenceType='registration');leads.append(p)
 for r in read('data/permits.json',[]):
  if r.get('status','').lower() in ['complete','completed','cancelled','canceled','withdrawn','expired','disapproved']:exclusions['terminalPermits']+=1;continue
  desc=r.get('description','');use=r.get('proposed_use','')
  if not re.search(r'restaurant|retail|store|cafe|café|bakery|gym|fitness|salon|clinic|child.?care|day.?care|hotel|\bbar\b',use+' '+desc,re.I):exclusions['nonBusinessPermits']+=1;continue
  address=' '.join(str(r.get(k,'')) for k in ['street_number','street_number_suffix','street_name','street_suffix']).strip();address=re.sub(r'\s+',' ',address)
  p=project('bp-'+r['record_id'],'Permit work · '+address,address,desc,'Food & shops',xy(r.get('location')),'permits',r['permit_number'])
  p.update(status=r.get('status','Permit application'),statusDate=r.get('status_date','')[:10] or None,neighborhood=r.get('neighborhoods_analysis_boundaries') or 'San Francisco',evidenceType='permit',recordLabel='Permit work · opening unverified');p.pop('kindOverride',None);leads.append(p)
 # Suggestions are auditable; address-only matches never become automatic entity merges.
 addressIndex={}
 for p in projects:addressIndex.setdefault(addr(p['address']),[]).append(p['id'])
 matches=[]
 for p in leads:
  candidates=addressIndex.get(addr(p['address']),[])
  if candidates:p['relatedProjectIds']=candidates;matches.append({'leadId':p['id'],'projectIds':candidates,'method':'normalized address only; not a confirmed match'})
 sources=base['sources']+[{'id':'announcements','name':'Reviewed operator announcements & local reporting','url':'https://github.com/kbhuw/coming-to-sf/tree/main/catalog','updated':max(a['reviewedAt'] for a in read('catalog/announcements.json')),'records':len(read('catalog/announcements.json')),'note':'Manually reviewed evidence. Month/season/year windows preserve uncertainty. This is not a complete index of announcements.'}]
 for key,h in health.items():sources.append({'id':key,'name':h['name'],'url':h.get('url','https://data.sfgov.org'),'updated':h.get('updated'),'records':h.get('records',0),'note':h.get('scope',''),'health':h['status'],'retrievedAt':h.get('retrievedAt')})
 if agency:sources.append(dict(id='sfmta',name='SFMTA project directory',url=agency['url'],updated=None,records=len(agency['records']),note=agency['scope'],retrievedAt=agency['retrievedAt'],health='ok',pages=agency['pages'],statusPages=agency['statusPages'],unfilteredOmissions=agency['unfilteredOmissions'],completed=agency['completed'],exactTitleMatches=agencyMerged))
 if parks:sources.append(dict(id='parks',name='SF Rec & Park active project directory',url=parks['url'],updated=None,records=len(parks['records']),note=parks['scope'],retrievedAt=parks['retrievedAt'],health='ok',pages=parks['pages']))
 publicHealth={'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'sources':sources,'leadCounts':dict(Counter(p['evidenceType'] for p in leads)),'exclusions':dict(exclusions),'possibleAddressMatches':len(matches),'limitations':['Registration and permit dates are not opening dates.','Business registration import includes all industries; missing industry codes remain Other.','Permit lead selection uses business-use keywords and can include unrelated alterations.','ABC bulk and direct daily imports returned HTTP 403; browser-readable daily reports are not automated yet.','Park directories are connected; detailed phases, utilities, schools and neighborhood reporting remain incomplete.']}
 base.update(projects=projects,sources=sources,generatedAt=publicHealth['generatedAt'])
 base['coverage'].update(unmapped=sum(not p['coordinates'] for p in projects),leadRecords=len(leads),announcements=len(read('catalog/announcements.json')),note='City project feeds plus reviewed opening announcements. Additional registrations and permit leads are available separately. Counts reflect these sources, not every future opening in SF. See the coverage ledger for scope and gaps.')
 assert len({p['id'] for p in projects+leads})==len(projects)+len(leads),'Duplicate stable IDs'
 if parks:save('parks-directory.json',parks)
 if agency:save('sfmta-directory.json',agency)
 save('projects.json',base);save('business-leads.json',{'projects':leads,'generatedAt':publicHealth['generatedAt']});save('source-health.json',publicHealth);save('possible-matches.json',matches)
 print(json.dumps({'projects':len(projects),'announcements':base['coverage']['announcements'],'leads':len(leads),'leadCounts':publicHealth['leadCounts'],'excluded':dict(exclusions)}))
if __name__=='__main__':main()
