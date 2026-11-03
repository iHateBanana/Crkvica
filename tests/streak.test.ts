import { describe, expect, it } from 'vitest';
import { addDays, iso } from '../src/lib/orthodox';
import { streakFrom } from '../src/lib/streak';

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
