"""Collect every project card in SFMTA's paginated directory, plus completed status.

No dates or coordinates are inferred from project names. Raw page cache supports
review and repeat parsing. Each traversal follows the actual next-page link.
"""
import hashlib,json,time,sys
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urljoin,urlencode
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
BASE='https://www.sfmta.com'
DIRECTORY=BASE+'/sfmta-projects'

def fetch(url):
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':'ComingToSF/1.0 (public civic project directory)'}),timeout=35) as r:return r.read().decode()
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)

def parse(html,url):
 soup=BeautifulSoup(html,'html.parser'); rows=[]
 for card in soup.select('article.node--type-project.node--view-mode-grid'):
  a=card.select_one('h3 a[href]')
  if not a:raise ValueError('Project card missing title/link')
  teaser=card.select_one('.field--name-field-teaser-text')
  rows.append(dict(url=urljoin(BASE,a['href']),name=a.get_text(' ',strip=True),summary=teaser.get_text(' ',strip=True) if teaser else 'SFMTA project or program. See the official project page for details.'))
 nxt=soup.select_one('li.pager__item--next a[href]')
 return rows,urljoin(url,nxt['href']) if nxt else None

def collect(start,label):
 url=start;visited=set();rows={};pages=0
 cache=ROOT/'data'/'sfmta-pages';cache.mkdir(parents=True,exist_ok=True)
 while url:
  if url in visited:raise ValueError('Pagination cycle')
  visited.add(url);cached=cache/(hashlib.sha256(url.encode()).hexdigest()+'.html')
  if '--reuse-cache' in sys.argv and cached.exists() and time.time()-cached.stat().st_mtime<3600:html=cached.read_text()
  else:html=fetch(url);cached.write_text(html)
  page,nxt=parse(html,url)
  if not page:
   if pages==0 and BeautifulSoup(html,'html.parser').select_one('.view-empty') is not None:break
   raise ValueError('Empty directory page: '+url)
  for r in page:rows[r['url']]=r
  pages+=1;print(label,pages,len(rows),flush=True);url=nxt
  if pages>500:raise ValueError('Unexpected pagination extent')
 return rows,pages

def main():
 rows,pages=collect(DIRECTORY,'all')
 completed,completedPages=collect(DIRECTORY+'?field_project_status_value=Completed','completed')
 missing=set(completed)-set(rows)
 rows.update(completed)
 statusPages={'Completed':completedPages}; memberships={url:['Completed'] for url in completed}
 # The unfiltered listing can omit URLs present in status-filtered listings.
 # Traverse every status partition and retain the union instead of dropping them.
 statuses=['Planned','Environmental Review','Preliminary Engineering','Detailed Design','Legislated','Implementation slash Construction','Project Evaluation','Current']
 for status in statuses:
  subset,n=collect(DIRECTORY+'?'+urlencode({'field_project_status_value':status}),status)
  statusPages[status]=n;rows.update(subset)
  for url in subset:memberships.setdefault(url,[]).append(status)

 now=datetime.now(timezone.utc).isoformat()
 for url,r in rows.items():r.update(lifecycle='opened' if url in completed else 'project',status=' / '.join(memberships.get(url,['Listed by SFMTA; status not supplied'])),retrievedAt=now)
 result=dict(records=list(rows.values()),retrievedAt=now,pages=pages,completedPages=completedPages,statusPages=statusPages,unfilteredOmissions=len(missing),completed=len(completed),url=DIRECTORY,scope='Union of every page in the unfiltered directory and all nine status filters. Includes programs and studies. URLs are deduplicated; publication ordering can vary.')
 p=ROOT/'data/sfmta.json';tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False));tmp.replace(p)
 print('Verified',len(rows),'project URLs;',len(completed),'completed',flush=True)
if __name__=='__main__':main()
