"""Public Works directory/map and SFPUC San Francisco construction directory.
Preserve agency status and milestones; never use sort timestamps as arrival dates.
"""
import json,re,html as htmlmod
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
from collect_sfmta import fetch
ROOT=Path(__file__).resolve().parents[1]
PW='https://sfpublicworks.org';PUC='https://www.sfpuc.gov'
def pw_records(directory,map_html):
 soup=BeautifulSoup(directory,'html.parser');rows={}
 for card in soup.select('.project-item .project'):
  a=card.select_one('.portfolio-title a[href]');id=card.get('data-history-node-id')
  if not a or not id:raise ValueError('Malformed PW project card')
  completed='completed' in card.get('class',[])
  rows[id]=dict(id='pw-'+id,name=a.get_text(' ',strip=True),url=urljoin(PW,a['href']),status='Completed' if completed else 'In progress' if 'in-progress' in card.get('class',[]) else 'Status not supplied',completed=completed,coordinates=None,summary='Public Works project. Consult the agency page for current work and timing.')
 pattern=r'\[([\d.\-]+)\s*,\s*([\d.\-]+)\s*\]\)(.*?if\((\d+) == nodeID.*?markers.push\(\[m,\s*([01]?))'
 blocks=map_html.split('var marker = L.marker(')[1:]
 matches=[re.match(pattern,block,re.S) for block in blocks]
 if not all(matches):raise ValueError('PW map parser missed markers')
 for m in matches:
  lat,lon,body,id,status=m.groups();c=[float(lon),float(lat)]
  if id not in rows:
   title=re.search(r'<h2>(.*?)</h2>',body,re.S)
   if not title:raise ValueError('PW map title missing')
   rows[id]=dict(id='pw-'+id,name=htmlmod.unescape(title[1]),url=PW+'/node/'+id,status='Completed' if status=='1' else 'In progress' if status=='0' else 'Status not supplied',completed=status=='1',summary='Public Works map record; consult the official project page.')
  if -122.53<=c[0]<=-122.34 and 37.70<=c[1]<=37.84:rows[id]['coordinates']=c
  else:rows[id]['coordinates']=None
  rows[id]['mapStatus']='Completed' if status=='1' else 'In progress' if status=='0' else 'Status not supplied'
 if not rows or not matches:raise ValueError('Empty PW directory/map')
 return list(rows.values()),len(matches)
def puc_links(html):
 soup=BeautifulSoup(html,'html.parser')
 for group in soup.select('.accordion-item'):
  title=group.select_one('.accordion-title')
  if title and title.get_text(' ',strip=True)=='San Francisco':
   return [dict(name=a.get_text(' ',strip=True),url=urljoin(PUC,a['href'])) for a in group.select('.accordion-content a[href]')]
 raise ValueError('SFPUC San Francisco section missing')
def puc_detail(row):
 text=fetch(row['url']);soup=BeautifulSoup(text,'html.parser');facts={}
 for li in soup.select('#at-a-glance .overview li'):
  label=li.select_one('strong')
  if label:
   key=label.get_text(' ',strip=True).rstrip(':');value=li.get_text(' ',strip=True)[len(label.get_text(' ',strip=True)):].strip();facts[key]=value
 phase=facts.get('Project Phase','Status not supplied')
 return dict(**row,status=phase,completed=phase.lower() in ['completed','complete'],coordinates=None,facts=facts,summary='Water, power or sewer infrastructure project. Agency milestones: '+('; '.join(k+': '+v for k,v in facts.items()) or 'not provided in structured page fields')+'.')
def main():
 directory=fetch(PW+'/projects');map_html=fetch(PW+'/project-map');rows,markers=pw_records(directory,map_html)
 links=puc_links(fetch(PUC+'/construction-contracts/construction-projects'))
 if not links:raise ValueError('No SFPUC links')
 with ThreadPoolExecutor(max_workers=3) as pool:puc=list(pool.map(puc_detail,links))
 now=datetime.now(timezone.utc).isoformat()
 result=dict(retrievedAt=now,sources=[dict(id='publicworks',name='SF Public Works directory and project map',url=PW+'/projects',records=rows,mapMarkers=markers,scope='Every project card on the directory and every published project-map marker; includes completed historical work.'),dict(id='sfpuc',name='SFPUC San Francisco construction projects',url=PUC+'/construction-contracts/construction-projects',records=puc,scope='Every link in the San Francisco accordion. Other regional sections excluded. Agency region labels can include cross-boundary infrastructure.')])
 p=ROOT/'data/infrastructure.json';tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False));tmp.replace(p)
 print(json.dumps({'publicworks':len(rows),'mapMarkers':markers,'sfpuc':len(puc)}))
if __name__=='__main__':main()
