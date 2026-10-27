import { addDays, iso } from './orthodox';

// Consecutive days (ending today, or yesterday if today is incomplete) where every rule was completed.
export function streakFrom(ruleIds: string[], logs: { rule_id: string; day: string }[]): number {
  if (!ruleIds.length) return 0;
  const byDay = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!byDay.has(l.day)) byDay.set(l.day, new Set());
    byDay.get(l.day)!.add(l.rule_id);
  }
  const complete = (d: string) => ruleIds.every((id) => byDay.get(d)?.has(id));
  let cur = new Date();
  if (!complete(iso(cur))) cur = addDays(cur, -1);
  let n = 0;
  while (complete(iso(cur))) { n++; cur = addDays(cur, -1); }
  return n;
}
