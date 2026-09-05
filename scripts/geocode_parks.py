"""Resolve named park locations, never treat a park center as a work boundary.
Reject non-SF, low-score, or weak name matches; store full matching provenance.
"""
import json,re,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlencode
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1]
STOP=set('the and of project improvement improvements renovation renewal park playground recreation center construction sf san francisco'.split())
def words(s):return set(re.findall(r'[a-z]+',s.lower()))-STOP
def main():
 p=ROOT/'catalog/park-geocodes.json';cache=json.loads(p.read_text()) if p.exists() else {}
 for row in json.loads((ROOT/'data/parks.json').read_text())['records']:
  key=row['url'].split('/')[3]
  if key in cache or row['group'] or 'Fund' in row['name']:continue
  query=re.sub(r'\b(Renovation|Improvement|Improvements|Project|Renewal)\b','',row['name'],flags=re.I).strip()
  url='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'+urlencode(dict(SingleLine=query+', San Francisco, CA',f='json',outFields='City,Addr_type',maxLocations=3))
  try:
   data=json.load(urlopen(url,timeout=25));candidate=None
   for c in data.get('candidates',[]):
    terms=words(query);overlap=len(terms & words(c['address']))/max(1,len(terms))
    if c['score']>=90 and c['attributes'].get('Addr_type')=='POI' and c['attributes'].get('City')=='San Francisco' and overlap>=.6 and -122.53<c['location']['x']<-122.34 and 37.70<c['location']['y']<37.84:
     candidate=c;break
   cache[key]=dict(query=query,coordinates=[candidate['location']['x'],candidate['location']['y']] if candidate else None,matchedAddress=candidate['address'] if candidate else None,score=candidate['score'] if candidate else None,provider='Esri World Geocoding',checkedAt=datetime.now(timezone.utc).isoformat(),approximate=True,note='Named park location only; not project work extent',sourceUrl=row['url'])
   print(key,'matched' if candidate else 'unmapped',flush=True)
  except Exception as e:print(key,type(e).__name__,flush=True)
  time.sleep(.2)
 temp=p.with_suffix('.tmp');temp.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n');temp.replace(p)
if __name__=='__main__':main()
