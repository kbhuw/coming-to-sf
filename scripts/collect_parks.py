"""Collect Rec & Park's active directory and its grouped park subdirectories.
Directory membership is not proof of completion status or an opening date.
"""
import json,re
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from collect_sfmta import fetch
ROOT=Path(__file__).resolve().parents[1]
URL='https://sfrecpark.org/1120/Active-Park-Projects'
def parse(html):
 soup=BeautifulSoup(html,'html.parser');rows=[]
 for item in soup.select('.widgetPages li[data-pageid]'):
  a=item.select_one('.widgetTitle a[href]');desc=item.select_one('.widgetDesc')
  if not a:raise ValueError('Park card missing link')
  url=urljoin(URL,a['href']);summary=desc.get_text(' ',strip=True) if desc else ''
  rows.append(dict(url=url,name=a.get_text(' ',strip=True),summary=summary,completed=bool(re.match(r'Completed\b',summary,re.I)),group=summary.startswith('Active projects in ')))
 return rows

def main():
 cache=ROOT/'data/parks-pages';cache.mkdir(parents=True,exist_ok=True)
 queue=[URL];seen=set();rows={}
 while queue:
  url=queue.pop(0)
  if url in seen:continue
  seen.add(url);html=fetch(url);(cache/(url.split('/')[3]+'.html')).write_text(html)
  parsed=parse(html)
  if not parsed:raise ValueError('No park project cards at '+url)
  for row in parsed:
   row['directoryUrl']=url;rows[row['url']]=row
   if row['group']:queue.append(row['url'])
  print(url,len(parsed),'cards',flush=True)
  if len(seen)>20:raise ValueError('Unexpected subdirectory extent')
 result=dict(records=list(rows.values()),retrievedAt=datetime.now(timezone.utc).isoformat(),url=URL,pages=len(seen),scope='Active Park Projects directory plus grouped Active projects in park subdirectories. Includes programs; explicitly completed directory entries are retained separately.')
 p=ROOT/'data/parks.json';tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False));tmp.replace(p)
 print('Verified',len(rows),'park directory records',flush=True)
if __name__=='__main__':main()
