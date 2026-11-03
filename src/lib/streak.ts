import { addDays, iso } from './orthodox';

// Consecutive days (ending today, or yesterday if today has none yet) with at least one prayer logged,
// or with every prayer logged when requireAll is set.
export function streakFrom(ruleIds: string[], logs: { rule_id: string; day: string }[], requireAll = false): number {
  if (!ruleIds.length) return 0;
  const byDay = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!ruleIds.includes(l.rule_id)) continue;
    if (!byDay.has(l.day)) byDay.set(l.day, new Set());
    byDay.get(l.day)!.add(l.rule_id);
  }
  const complete = (d: string) => (requireAll ? ruleIds.every((id) => byDay.get(d)?.has(id)) : (byDay.get(d)?.size ?? 0) > 0);
  let cur = new Date();
  if (!complete(iso(cur))) cur = addDays(cur, -1);
  let n = 0;
  while (complete(iso(cur))) { n++; cur = addDays(cur, -1); }
  return n;
}
