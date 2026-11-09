import { addDays, iso } from './orthodox';

interface Log { rule_id: string; day: string }

function walk(ruleIds: string[], logs: Log[], requireAll: boolean) {
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
  return { n, stoppedAt: iso(cur) };
}

// Consecutive days (ending today, or yesterday if today has none yet) with at least one prayer logged,
// or with every prayer logged when requireAll is set.
export function streakFrom(ruleIds: string[], logs: Log[], requireAll = false): number {
  if (!ruleIds.length) return 0;
  return walk(ruleIds, logs, requireAll).n;
}

// Whether these logs, newest first and possibly only part of the history, already show where the streak ends.
// The day it stopped must be newer than the oldest log, because that oldest day may be only partly loaded.
export function streakSettled(ruleIds: string[], logs: Log[], requireAll = false): boolean {
  if (!ruleIds.length || !logs.length) return true;
  return walk(ruleIds, logs, requireAll).stoppedAt > logs[logs.length - 1].day;
}

// Keeps loading older pages of logs only until the streak's end is in view, so a streak can be any length
// while most people download just the first page.
export async function collectStreakLogs<L extends Log>(
  ruleIds: string[],
  requireAll: boolean,
  first: L[],
  nextPage: (offset: number) => Promise<L[] | null>,
  pageSize: number,
): Promise<L[]> {
  const logs = [...first];
  let last = first;
  while (last.length === pageSize && !streakSettled(ruleIds, logs, requireAll)) {
    const next = await nextPage(logs.length);
    if (!next) break; // offline or failed: count what we have
    logs.push(...next);
    last = next;
  }
  return logs;
}
