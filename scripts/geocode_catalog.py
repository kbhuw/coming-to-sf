"""Geocode public announced addresses once; preserve response provenance in catalog.
Only accepted SF candidates scoring >=90, inside city bounds; otherwise unmapped.
"""
import json,urllib.parse,urllib.request,time,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'catalog/geocodes.json';cache=json.loads(path.read_text()) if path.exists() else {}
for p in json.loads((ROOT/'catalog/announcements.json').read_text()):
    a=p['address']
    if a in cache:continue
    url='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'+urllib.parse.urlencode({'SingleLine':a+', San Francisco, CA','f':'json','outFields':'City,Addr_type','maxLocations':3})
    try:
        r=json.load(urllib.request.urlopen(url,timeout=25));c=next((c for c in r.get('candidates',[]) if c['score']>=90 and c['attributes'].get('City')=='San Francisco' and -122.53<c['location']['x']<-122.34 and 37.70<c['location']['y']<37.84),None)
        cache[a]={'coordinates':[c['location']['x'],c['location']['y']] if c else None,'matchedAddress':c['address'] if c else None,'score':c['score'] if c else None,'provider':'Esri World Geocoding','checkedAt':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'approximate':True}
        print(a,'matched' if c else 'UNMAPPED')
    except Exception as e:print(a,type(e).__name__)
    time.sleep(.2)
path.write_text(json.dumps(cache,indent=2)+'\n')
