import { describe, expect, it } from 'vitest';
import { addDays, iso } from '../src/lib/orthodox';
import { collectStreakLogs, streakFrom } from '../src/lib/streak';

const day = (n: number) => iso(addDays(new Date(), -n));

describe('streakFrom', () => {
  const rules = ['a', 'b'];
  const logs = [
    { rule_id: 'a', day: day(0) },
    { rule_id: 'a', day: day(1) }, { rule_id: 'b', day: day(1) },
    { rule_id: 'b', day: day(2) },
  ];

  it('counts a day when at least one prayer was done', () => {
    expect(streakFrom(rules, logs)).toBe(3);
  });

  it('requires every prayer when strict', () => {
    expect(streakFrom(rules, logs, true)).toBe(1);
  });

  it('strict mode keeps yesterday when today is incomplete', () => {
    expect(streakFrom(rules, logs.filter((l) => l.day !== day(0)), true)).toBe(1);
  });

  it('ignores logs of deleted prayers and returns 0 with no prayers', () => {
    expect(streakFrom([], logs)).toBe(0);
    expect(streakFrom(['a'], [{ rule_id: 'gone', day: day(0) }])).toBe(0);
  });
});

describe('long streaks', () => {
  const rule = ['a'];
  // `days` consecutive days ending today, newest first, as the server returns them.
  const history = (days: number) => Array.from({ length: days }, (_, i) => ({ rule_id: 'a', day: day(i) }));
  const paged = (all: { rule_id: string; day: string }[], size: number) => {
    const offsets: number[] = [];
    return { offsets, next: async (o: number) => { offsets.push(o); return all.slice(o, o + size); } };
  };

  it('counts a streak longer than the server row limit by loading more pages', async () => {
    const all = history(2500);
    const p = paged(all, 500);
    const logs = await collectStreakLogs(rule, false, all.slice(0, 500), p.next, 500);
    expect(streakFrom(rule, logs)).toBe(2500);
    expect(p.offsets).toEqual([500, 1000, 1500, 2000, 2500]);
  });

  it('stops after the first page when the streak ended inside it', async () => {
    const recent = history(10);
    const old = Array.from({ length: 490 }, (_, i) => ({ rule_id: 'a', day: day(20 + i) }));
    const p = paged([...recent, ...old, { rule_id: 'a', day: day(600) }], 500);
    const logs = await collectStreakLogs(rule, false, [...recent, ...old], p.next, 500);
    expect(streakFrom(rule, logs)).toBe(10);
    expect(p.offsets).toEqual([]);
  });

  it('loads the next page when a day is cut in half at the page edge in strict mode', async () => {
    const two = ['a', 'b'];
    // Days 0-1 have both prayers, and the page ends after only one of day 2's rows.
    const all = [
      { rule_id: 'a', day: day(0) }, { rule_id: 'b', day: day(0) },
      { rule_id: 'a', day: day(1) }, { rule_id: 'b', day: day(1) },
      { rule_id: 'a', day: day(2) }, { rule_id: 'b', day: day(2) },
    ];
    const p = paged(all, 5);
    const logs = await collectStreakLogs(two, true, all.slice(0, 5), p.next, 5);
    expect(streakFrom(two, logs, true)).toBe(3);
    expect(p.offsets).toEqual([5]);
  });

  it('keeps what it has when a later page fails, as when offline', async () => {
    const all = history(600);
    const logs = await collectStreakLogs(rule, false, all.slice(0, 500), async () => null, 500);
    expect(streakFrom(rule, logs)).toBe(500);
  });

  it('never asks for more when the first page was not full', async () => {
    const p = paged(history(30), 500);
    await collectStreakLogs(rule, false, history(30), p.next, 500);
    expect(p.offsets).toEqual([]);
  });
});
