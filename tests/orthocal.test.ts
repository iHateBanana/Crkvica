import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined },
}));

import { fetchDay, orthocalUrl } from '../src/lib/orthocal';
import { getDayInfo, iso, makeDate } from '../src/lib/orthodox';

// Recorded from orthocal.info: /julian/2026/10/27/ returns the Old Calendar day for CIVIL Oct 27, dated Julian Oct 14.
const PARASKEVA = { year: 2026, month: 10, day: 14, summary_title: 'Ven. Parasceva of Serbia; Holy Martyrs Nazarius, Gervasius, Protasius, and Celsus of Milan (1st c.); Saint Cosmas the Hymnographer (8th c.)', feast_level: 2, readings: [], stories: [] };
// /julian/2026/10/14/ is dated Julian Oct 1 (Pokrov).
const POKROV = { year: 2026, month: 10, day: 1, summary_title: 'Protection (Pokrov) of the Most-Holy Theotokos', feast_level: 6, readings: [], stories: [] };

const mockApi = (table: Record<string, unknown>) => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url);
    const body = table[url];
    return body ? { ok: true, json: async () => body } : { ok: false, json: async () => ({}) };
  });
  return calls;
};

afterEach(() => vi.unstubAllGlobals());

describe('Orthocal requests', () => {
  it('send the civil date unchanged to both endpoints', () => {
    expect(orthocalUrl(makeDate(2026, 10, 27), 'old')).toBe('https://orthocal.info/api/julian/2026/10/27/');
    expect(orthocalUrl(makeDate(2026, 10, 27), 'new')).toBe('https://orthocal.info/api/gregorian/2026/10/27/');
  });

  it('27 Oct 2026 in Old mode shows St. Paraskeva, not Pokrov', async () => {
    const calls = mockApi({
      'https://orthocal.info/api/julian/2026/10/27/': PARASKEVA,
      'https://orthocal.info/api/julian/2026/10/14/': POKROV,
    });
    const d = makeDate(2026, 10, 27);
    const day = await fetchDay(d, 'old');
    expect(calls).toEqual(['https://orthocal.info/api/julian/2026/10/27/']);
    expect(day?.saints[0]).toMatch(/Parasceva/);
    expect(day?.title).not.toMatch(/Pokrov/);
    expect(day?.date).toBe('2026-10-14');
    expect(iso(getDayInfo(d, 'old').julian)).toBe(day?.date);
  });

  it('Today and Calendar get identical results for the same date', async () => {
    mockApi({ 'https://orthocal.info/api/julian/2026/10/27/': PARASKEVA });
    const today = await fetchDay(new Date(2026, 9, 27, 16, 5), 'old');
    const calendar = await fetchDay(makeDate(2026, 10, 27), 'old');
    expect(today).toEqual(calendar);
  });

  it('refuses a response dated for a different day', async () => {
    mockApi({ 'https://orthocal.info/api/julian/2026/10/27/': POKROV });
    expect(await fetchDay(makeDate(2026, 10, 27), 'old')).toBeNull();
  });

  it('New mode expects the same civil date back', async () => {
    mockApi({ 'https://orthocal.info/api/gregorian/2026/10/27/': { ...PARASKEVA, day: 27 } });
    expect((await fetchDay(makeDate(2026, 10, 27), 'new'))?.date).toBe('2026-10-27');
  });
});

// Run with ORTHOCAL_LIVE=1 to check the real API still agrees with our Julian conversion.
describe.skipIf(!process.env.ORTHOCAL_LIVE)('live Orthocal', () => {
  const days: [number, number, number][] = [[2026, 10, 27], [2026, 10, 14], [2027, 1, 9], [2028, 2, 29], [2028, 3, 1], [2026, 4, 12]];
  for (const [y, m, d] of days) {
    it(`${y}-${m}-${d} (old) matches our Julian date`, async () => {
      const date = makeDate(y, m, d);
      const day = await fetchDay(date, 'old');
      expect(day?.date).toBe(iso(getDayInfo(date, 'old').julian));
    });
  }
});
