"""Collect RSS/Atom headlines into a durable review queue, not map openings.
Only publisher-provided titles, links and publication timestamps are retained.
"""
import json,re,hashlib,xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime,timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
from collect_sfmta import fetch
ROOT=Path(__file__).resolve().parents[1]
FEEDS=[('eater','Eater SF','https://sf.eater.com/rss/index.xml'),('missionlocal','Mission Local','https://missionlocal.org/feed/')]
ATOM='{http://www.w3.org/2005/Atom}'
def canonical(url):
 p=urlsplit(url)
 if p.scheme not in ['http','https'] or not p.netloc:raise ValueError('Invalid article URL')
 return urlunsplit((p.scheme,p.netloc,p.path,urlencode([(k,v) for k,v in parse_qsl(p.query) if not k.startswith('utm_')]),''))
def parse(text):
 root=ET.fromstring(text);entries=[]
 if root.tag==ATOM+'feed':
  for item in root.findall(ATOM+'entry'):
   link=next((a.get('href') for a in item.findall(ATOM+'link') if a.get('rel','alternate')=='alternate'),None)
   entries.append((item.findtext(ATOM+'title'),link,item.findtext(ATOM+'published') or item.findtext(ATOM+'updated')))
 else:
  entries=[(i.findtext('title'),i.findtext('link'),i.findtext('pubDate')) for i in root.findall('./channel/item')]
 if not entries:raise ValueError('Empty or unsupported news feed')
 result=[]
 for title,url,date in entries:
  if not title or not url:raise ValueError('Feed item missing headline or link')
  published=None
  if date:
   try:published=datetime.fromisoformat(date.replace('Z','+00:00')).isoformat()
   except ValueError:published=parsedate_to_datetime(date).isoformat()
  result.append(dict(title=title.strip(),url=canonical(url),publishedAt=published))
 return result

def main():
 output=ROOT/'public/news-review.json'
 old=json.loads(output.read_text()) if output.exists() else {'items':[]}
 byurl={r['url']:r for r in old['items']};now=datetime.now(timezone.utc).isoformat();sources=[]
 decisionsPath=ROOT/'catalog/news-reviews.json';decisions=json.loads(decisionsPath.read_text()) if decisionsPath.exists() else {}
 for id,name,url in FEEDS:
  items=parse(fetch(url));sources.append(dict(id=id,name=name,url=url,records=len(items),retrievedAt=now,health='ok',scope='All entries currently exposed by the publisher feed. Previously collected URLs are retained; not an exhaustive article archive.'))
  for row in items:
   oldrow=byurl.get(row['url'],{})
   row.update(id='news-'+hashlib.sha256(row['url'].encode()).hexdigest()[:16],source=id,sourceName=name,firstSeen=oldrow.get('firstSeen',now),lastSeen=now,possibleChange=bool(re.search(r'open|coming|plan|propos|renovat|construct|develop|launch|new\b|clos',row['title'],re.I)),review=decisions.get(row['url'],{'status':'unreviewed'}))
   byurl[row['url']]=row
 for row in byurl.values():row['review']=decisions.get(row['url'],{'status':'unreviewed'})
 items=sorted(byurl.values(),key=lambda r:r.get('publishedAt') or '',reverse=True)
 data=dict(generatedAt=now,sources=sources,items=items,note='Headlines are discovery leads. They may cover existing places, closures or locations outside SF. No article is automatically promoted to an upcoming map project.')
 temp=output.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));temp.replace(output)
 print(json.dumps({'retainedArticles':len(items),'possibleChanges':sum(r['possibleChange'] for r in items),'sources':[(s['name'],s['records']) for s in sources]}))
if __name__=='__main__':main()
