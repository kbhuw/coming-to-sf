"""Refresh public source snapshots, verify complete pagination, then rebuild map data.

Run: python3 scripts/sync.py
No credentials are persisted. SFCTA's public map read token is obtained from its
published application on each run, just as the public map does.
"""
import json, re, subprocess, sys, urllib.request
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
def request(url,headers=None):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=60) as r:return r.read()
def get(url,headers=None):return json.loads(request(url,headers))
def socrata(dataset):
    rows=[];offset=0
    count=int(get('https://data.sfgov.org/resource/'+dataset+'.json?$select=count(*)')[0]['count'])
    while True:
        page=get('https://data.sfgov.org/resource/'+dataset+'.json?$limit=5000&$offset='+str(offset)+'&$order=:id')
        rows.extend(page)
        if len(page)<5000:break
        offset+=len(page)
    if len(rows)!=count:raise RuntimeError('Source changed during retrieval; retry for a consistent snapshot')
    return rows,get('https://data.sfgov.org/api/views/'+dataset+'.json')
(ROOT/'data').mkdir(exist_ok=True)
metadata={}
for name,dataset in [('pipeline','6jgi-cpb4'),('affordable','aaxw-2cb8')]:
    rows,meta=socrata(dataset)
    (ROOT/'data'/f'{name}.json').write_text(json.dumps(rows))
    metadata[name]={'updated':datetime.fromtimestamp(meta['rowsUpdatedAt'],timezone.utc).date().isoformat(),'retrievedAt':datetime.now(timezone.utc).isoformat()}
    print(name,len(rows),'records')
html=request('https://mystreetsf.sfcta.org/').decode()
path=re.search(r'src=(/static/js/app\.[^ >]+)',html).group(1).strip('"\'')
script=request('https://mystreetsf.sfcta.org'+path).decode()
token=re.search(r'API_TOKEN:"([^"]+)"',script).group(1)
rows=get('https://portal.sfcta.org/api/v1/project_locations',{'X_USER_TOKEN':token})
if not isinstance(rows,list) or not rows:raise RuntimeError('Unexpected transport feed')
(ROOT/'data'/'transport.json').write_text(json.dumps(rows))
metadata['transport']={'retrievedAt':datetime.now(timezone.utc).isoformat()}
(ROOT/'data'/'metadata.json').write_text(json.dumps(metadata))
print('transport',len(rows),'records')
subprocess.run([sys.executable,str(ROOT/'scripts'/'assemble.py')],check=True)

subprocess.run([sys.executable,str(ROOT/'scripts'/'collect_sources.py')],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts'/'build_catalog.py')],check=True)
