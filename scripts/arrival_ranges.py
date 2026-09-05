"""Conservative normalization of explicit completion labels, not start dates.
Season conventions: spring Mar-May, summer Jun-Aug, fall Sep-Nov. Winter,
multi-phase labels and durations remain unresolved rather than invented dates.
"""
import calendar,re
MONTHS='January February March April May June July August September October November December'.split()
def completion_range(label,url):
 label=label.strip();start=end=None;precision=None
 m=re.fullmatch(r'(\w+) (20\d{2})',label)
 if m and m[1].title() in MONTHS:
  month=MONTHS.index(m[1].title())+1;year=int(m[2]);start=f'{year}-{month:02d}-01';end=f'{year}-{month:02d}-{calendar.monthrange(year,month)[1]}';precision='month'
 elif m and m[1].lower() in ['spring','summer','fall','autumn']:
  lo,hi={'spring':(3,5),'summer':(6,8),'fall':(9,11),'autumn':(9,11)}[m[1].lower()];year=int(m[2]);start=f'{year}-{lo:02d}-01';end=f'{year}-{hi:02d}-{calendar.monthrange(year,hi)[1]}';precision='season'
 else:
  y=re.fullmatch(r'(?:End of )?(20\d{2})',label,re.I)
  if y:start=y[1]+'-01-01';end=y[1]+'-12-31';precision='year'
 return dict(start=start,end=end,precision=precision,label=label+' · agency construction-end target',sourceUrl=url) if start else None
