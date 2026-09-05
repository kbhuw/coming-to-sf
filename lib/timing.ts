export function addMonthsClamped(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}
function windowForExact(project: { date: string | null }, now: Date): 'unknown' | 'past' | 'soon' | 'year' | 'later' {
  if (!project.date) return 'unknown';
  const target = new Date(project.date + 'T23:59:59');
  if (!Number.isFinite(target.getTime())) return 'unknown';
  if (target < now) return 'past';
  const three = addMonthsClamped(now, 3); three.setHours(23, 59, 59, 999);
  const year = addMonthsClamped(now, 12); year.setHours(23, 59, 59, 999);
  return target <= three ? 'soon' : target <= year ? 'year' : 'later';
}

export type ArrivalRange = {start:string;end:string;precision:string;label:string;sourceUrl:string};
export type TimedProject = {date:string|null;arrival?:ArrivalRange};
// Ranges overlap a filter; no arbitrary day is manufactured for a month/season.
export function matchesWindow(p:TimedProject, window:string, now:Date):boolean {
  if(window==='all')return true;
  if(!p.arrival)return windowForExact(p,now)===window;
  const start=new Date(p.arrival.start+'T00:00:00'),end=new Date(p.arrival.end+'T23:59:59');
  if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>end)return window==='unknown';
  const today=new Date(now);today.setHours(0,0,0,0);
  const three=addMonthsClamped(today,3);three.setHours(23,59,59,999);
  const year=addMonthsClamped(today,12);year.setHours(23,59,59,999);
  if(window==='unknown')return false;
  if(window==='past')return end<today;
  if(window==='soon')return end>=today&&start<=three;
  if(window==='year')return end>three&&start<=year;
  if(window==='later')return end>year;
  return false;
}
export function windowFor(p:TimedProject,now:Date):'unknown'|'past'|'soon'|'year'|'later'{
 if(!p.arrival)return windowForExact(p,now);
 for(const w of ['past','soon','year','later'] as const)if(matchesWindow(p,w,now))return w;
 return 'unknown';
}
