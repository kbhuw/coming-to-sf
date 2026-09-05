"""Collect bounded, explicitly scoped city feeds; atomic snapshots + health ledger.
No permit/registration date is an opening date. No secret or owner/mail fields exported.
"""
import argparse, datetime as dt, hashlib, json, time, urllib.parse, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; DATA.mkdir(exist_ok=True)
def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ComingToSF/1.0 (+https://github.com/kbhuw/coming-to-sf)'}),timeout=30) as r:return r.read()
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)
def query(dataset,params):return json.loads(fetch('https://data.sfgov.org/resource/'+dataset+'.json?'+urllib.parse.urlencode(params)))
def collect(spec):
    base={'$where':spec['where']};count=int(query(spec['dataset'],{**base,'$select':'count(*)'})[0]['count'])
    rows=[]
    while len(rows)<count:
        page=query(spec['dataset'],{**base,'$select':spec['select'],'$limit':5000,'$offset':len(rows),'$order':spec['key']})
        if not page:raise RuntimeError('Pagination ended early')
        rows.extend(page)
    end=int(query(spec['dataset'],{**base,'$select':'count(*)'})[0]['count'])
    if len(rows)!=count or count!=end or len({r[spec['key']] for r in rows})!=count:raise RuntimeError('Source changed or duplicate IDs: refuse incomplete snapshot')
    meta=json.loads(fetch('https://data.sfgov.org/api/views/'+spec['dataset']+'.json'))
    raw=json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode();path=DATA/(spec['id']+'.json');temp=path.with_suffix('.tmp');temp.write_bytes(raw);temp.replace(path)
    return {'id':spec['id'],'name':spec['name'],'status':'ok','records':len(rows),'scope':spec['where'],'retrievedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'updated':dt.datetime.fromtimestamp(meta['rowsUpdatedAt'],dt.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'url':'https://data.sfgov.org/d/'+spec['dataset']}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--since',default=(dt.date.today()-dt.timedelta(days=365)).isoformat());args=ap.parse_args();dt.date.fromisoformat(args.since)
    specs=[
      {'id':'businesses','name':'SF registered business locations','dataset':'g8m3-pdis','key':'uniqueid','where':f"upper(city) = 'SAN FRANCISCO' AND location_end_date IS NULL AND location_start_date >= '{args.since}T00:00:00'",'select':'uniqueid,dba_name,full_business_address,location_start_date,self_reported_naics_code,lic_code_description,location,neighborhoods_analysis_boundaries,data_as_of'},
      {'id':'permits','name':'SF building permit applications','dataset':'i98e-djp9','key':'record_id','where':f"filed_date >= '{args.since}T00:00:00'",'select':'record_id,permit_number,street_number,street_number_suffix,street_name,street_suffix,description,status,status_date,filed_date,completed_date,existing_use,proposed_use,location,neighborhoods_analysis_boundaries,data_as_of'},
    ]
    ledger=json.loads((DATA/'source-health.json').read_text()) if (DATA/'source-health.json').exists() else {}
    for spec in specs:
        try:ledger[spec['id']]=collect(spec);print(spec['id'],ledger[spec['id']]['records'],'rows verified')
        except Exception as e:
            old=ledger.get(spec['id'],{});ledger[spec['id']]={**old,'id':spec['id'],'name':spec['name'],'status':'failed','lastAttempt':dt.datetime.now(dt.timezone.utc).isoformat(),'error':str(e),'scope':spec['where']};print(spec['id'],'FAILED',str(e))
    (DATA/'source-health.json').write_text(json.dumps(ledger,indent=2))
    if any(v['status']=='failed' for v in ledger.values()):raise SystemExit(1)
if __name__=='__main__':main()
