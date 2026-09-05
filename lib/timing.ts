export function addMonthsClamped(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}
export function windowFor(project: { date: string | null }, now: Date): 'unknown' | 'past' | 'soon' | 'year' | 'later' {
  if (!project.date) return 'unknown';
  const target = new Date(project.date + 'T23:59:59');
  if (!Number.isFinite(target.getTime())) return 'unknown';
  if (target < now) return 'past';
  const three = addMonthsClamped(now, 3); three.setHours(23, 59, 59, 999);
  const year = addMonthsClamped(now, 12); year.setHours(23, 59, 59, 999);
  return target <= three ? 'soon' : target <= year ? 'year' : 'later';
}
