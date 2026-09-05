"""Port development cards and leaf project pages in SFUSD's active bond programs.
These are agency scopes, not assertions that every site is new or still unfinished.
"""
import json,re,hashlib
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
from collect_sfmta import fetch
ROOT=Path(__file__).resolve().parents[1]
PORT='https://www.sfport.com/projects-programs'
SCHOOLS=['https://www.sfusd.edu/bond/overview/2024-bond-program','https://www.sfusd.edu/bond/programs/2016']
def port_links(html):
 s=BeautifulSoup(html,'html.parser');view=s.select_one('.view-id-projects')
 if not view or 'Projects In Development' not in view.get_text(' ',strip=True):raise ValueError('Port development view missing')
 rows=[]
 for card in view.select('article.node--type-project'):
  title=card.select_one('.card-title');link=card.select_one('[onclick]')
  match=re.search(r'window.location.href=[\'"]([^\'"]+)',link.get('onclick','')) if link else None
  if not title or not match:raise ValueError('Port project card changed')
  rows.append(dict(name=title.get_text(' ',strip=True),url=urljoin(PORT,match[1]),status='Listed in Projects In Development',completed=None))
 if not rows:raise ValueError('Empty Port development list')
 return rows

def school_links(html,url):
 s=BeautifulSoup(html,'html.parser');nav=s.select_one('.hero-mobile-nav');rows=[]
 if not nav:raise ValueError('SFUSD subpage navigation missing')
 for li in nav.select('li'):
  if li.find('li'):continue
  a=li.find('a',recursive=False)
  if a:rows.append(dict(name=a.get_text(' ',strip=True),url=urljoin(url,a['href']),programUrl=url,status='Bond project; completion not yet verified',completed=None))
 if not rows:raise ValueError('Empty school project list')
 return rows

def detail(row):
 s=BeautifulSoup(fetch(row['url']),'html.parser')
 blocks=s.select('.section-text_group') if 'sfusd.edu' in row['url'] else s.select('.field--name-body')
 paragraphs=[p.get_text(' ',strip=True) for block in blocks for p in block.find_all('p') if p.get_text(' ',strip=True) and '@' not in p.get_text()]
 # Short attributed excerpt, not a reproduced article or contact directory.
 text=next((p for p in paragraphs if len(p.split())>=8),'')
 row['summary']=' '.join(text.split()[:20])+('…' if len(text.split())>20 else '') if text else 'Agency project page; consult the source for scope and current status.'
 updated=s.select_one('.last-updated');row['sourceUpdatedText']=updated.get_text(' ',strip=True) if updated else None
 row['milestones']={}
 for p in paragraphs:
  m=re.fullmatch(r'(?:Project )?(Status|Completion|Construction Completion|Estimated Completion):\s*(.{1,100})',p,re.I)
  if m:
   row['milestones'][m[1]]=m[2]
   if m[1].lower()=='status':row['status']=m[2];row['completed']=m[2].lower() in ['complete','completed']
 return row

def main():
 port=port_links(fetch(PORT));schools={}
 for url in SCHOOLS:
  for r in school_links(fetch(url),url):schools.setdefault(r['url'], r).setdefault('programUrls', []).append(url)
 with ThreadPoolExecutor(max_workers=3) as pool:
  port=list(pool.map(detail,port));school=list(pool.map(detail,schools.values()))
 reviews=json.loads((ROOT/'catalog/civic-reviews.json').read_text())
 for row in port+school:
  row['id']='civic-'+hashlib.sha256(row['url'].encode()).hexdigest()[:16]
  row['review']=reviews.get(row['url'],dict(status='needs-review'))
  if row['review'].get('status')=='opened':
   row['completed']=True;row['status']='Opened · reviewed agency evidence'
 result=dict(retrievedAt=datetime.now(timezone.utc).isoformat(),sources=[dict(id='port',name='Port of San Francisco development projects',url=PORT,scope='Every card in Projects In Development. Area-wide policies and completed-project archives excluded.',records=port),dict(id='sfusd',name='SFUSD active bond-program project pages',url='https://www.sfusd.edu/bond',scope='Every leaf subpage listed under the active 2024 and 2016 bond programs. Includes program-wide work; absence of explicit completion status remains unresolved.',records=school)])
 p=ROOT/'data/civic.json';tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False));tmp.replace(p)
 print(json.dumps({'port':len(port),'sfusd':len(school)}))
if __name__=='__main__':main()
