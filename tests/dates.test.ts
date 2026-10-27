import { describe, expect, it } from 'vitest';
import { addDays, dayDiff, feastsOn, fastOn, getDayInfo, iso, julianOf, julianToCivil, makeDate, pascha, remainingCommemorations } from '../src/lib/orthodox';

const utcDays = (a: [number, number, number], b: [number, number, number]) =>
  Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 86400000);

describe('Julian offset', () => {
  it('converts civil <-> Julian with one offset', () => {
    expect(iso(julianOf(makeDate(2026, 10, 27)))).toBe('2026-10-14');
    expect(iso(julianToCivil(2026, 10, 14))).toBe('2026-10-27');
    expect(iso(julianToCivil(2026, 12, 27))).toBe('2027-01-09');
  });

  it('handles the 2028 leap year', () => {
    expect(iso(julianOf(makeDate(2028, 2, 29)))).toBe('2028-02-16');
    expect(iso(julianOf(makeDate(2028, 3, 1)))).toBe('2028-02-17');
    expect(iso(julianOf(makeDate(2028, 3, 13)))).toBe('2028-02-29');
    expect(iso(julianToCivil(2028, 2, 29))).toBe('2028-03-13');
  });

  it('computes Orthodox Pascha', () => {
    expect(iso(pascha(2026))).toBe('2026-04-12');
    expect(iso(pascha(2027))).toBe('2027-05-02');
    expect(iso(pascha(2028))).toBe('2028-04-16');
  });
});

describe('getDayInfo, Old calendar', () => {
  it('27 Oct 2026 is Julian Oct 14 whatever the time of day (Today uses new Date())', () => {
    for (const d of [makeDate(2026, 10, 27), new Date(2026, 9, 27, 0, 5), new Date(2026, 9, 27, 23, 59)]) {
      const info = getDayInfo(d, 'old');
      expect(iso(info.julian)).toBe('2026-10-14');
      expect(iso(info.liturgicalDate)).toBe('2026-10-14');
    }
  });

  it('Today and Calendar paths agree', () => {
    const today = getDayInfo(new Date(2026, 9, 27, 14, 30), 'old');
    const cell = getDayInfo(makeDate(2026, 10, 27), 'old');
    expect(today.feasts).toEqual(cell.feasts);
    expect(today.fast).toEqual(cell.fast);
    expect(iso(today.julian)).toBe(iso(cell.julian));
  });

  it('puts Pokrov (Julian Oct 1) on civil Oct 14, in red, and not on Oct 27', () => {
    const pokrov = feastsOn(makeDate(2026, 10, 14), 'old');
    expect(pokrov.map((f) => f.name)).toContain('Protection of the Theotokos');
    expect(pokrov.some((f) => f.red)).toBe(true);
    expect(feastsOn(makeDate(2026, 10, 27), 'old').map((f) => f.name)).not.toContain('Protection of the Theotokos');
  });

  it('fixed feasts follow the Julian date; Nativity is Jan 7', () => {
    expect(feastsOn(makeDate(2027, 1, 7), 'old').map((f) => f.name)).toContain('Nativity of the Lord');
    expect(feastsOn(makeDate(2026, 12, 25), 'old').map((f) => f.name)).not.toContain('Nativity of the Lord');
    expect(feastsOn(makeDate(2026, 4, 7), 'old').map((f) => f.name)).toContain('Annunciation of the Theotokos');
  });
});

describe('getDayInfo, New calendar', () => {
  it('fixed feasts keep their civil date', () => {
    expect(feastsOn(makeDate(2026, 12, 25), 'new').map((f) => f.name)).toContain('Nativity of the Lord');
    expect(feastsOn(makeDate(2027, 1, 7), 'new').map((f) => f.name)).not.toContain('Nativity of the Lord');
    expect(feastsOn(makeDate(2026, 3, 25), 'new').map((f) => f.name)).toContain('Annunciation of the Theotokos');
    expect(iso(getDayInfo(makeDate(2026, 10, 27), 'new').julian)).toBe('2026-10-14');
    expect(iso(getDayInfo(makeDate(2026, 10, 27), 'new').liturgicalDate)).toBe('2026-10-27');
  });
});

describe('movable feasts are the same in both calendars', () => {
  const p = pascha(2026);
  const cases: [number, string][] = [[-7, 'Palm Sunday'], [0, 'Holy Pascha - Resurrection of the Lord'], [39, 'Ascension of the Lord'], [49, 'Pentecost']];
  for (const style of ['new', 'old'] as const) {
    for (const [off, name] of cases) {
      it(`${name} (${style})`, () => {
        expect(feastsOn(addDays(p, off), style).map((f) => f.name)).toContain(name);
      });
    }
  }
  it('Pascha 2026 is Apr 12 in both modes', () => {
    expect(feastsOn(makeDate(2026, 4, 12), 'new').some((f) => f.name.startsWith('Holy Pascha'))).toBe(true);
    expect(feastsOn(makeDate(2026, 4, 12), 'old').some((f) => f.name.startsWith('Holy Pascha'))).toBe(true);
  });
});

describe('fasting text', () => {
  it('a fast-free day does not repeat its label in the detail', () => {
    const f = fastOn(makeDate(2026, 10, 27), 'old');
    expect(f.level).toBe('none');
    expect(f.detail.startsWith(f.label)).toBe(false);
    expect(`${f.label} - ${f.detail}`).not.toMatch(/No fast - No fast/);
  });
});

describe('remainingCommemorations', () => {
  const saints = ['Protection (Pokrov) of the Most-Holy Theotokos', 'Ven. Romanos the Melodist'];
  it('drops the saint already shown as the main feast', () => {
    expect(remainingCommemorations(saints, ['Protection of the Theotokos'])).toEqual(['Ven. Romanos the Melodist']);
  });
  it('drops the first entry when it is the main name itself', () => {
    expect(remainingCommemorations(saints, [saints[0]])).toEqual([saints[1]]);
  });
  it('keeps everything when nothing matches', () => {
    expect(remainingCommemorations(saints, ['Nativity of the Lord'])).toEqual(saints);
  });
});

// DST: run the same checks with the process in a US and a European time zone.
describe.each([
  ['America/New_York', ['2026-03-08', '2026-11-01'], 300, 240],
  ['Europe/Belgrade', ['2026-03-29', '2026-10-25'], -60, -120],
] as const)('DST safety in %s', (tz, changes, winterOffset, summerOffset) => {
  it('runs in the requested time zone', () => {
    process.env.TZ = tz;
    expect(new Date(2026, 0, 15, 12).getTimezoneOffset()).toBe(winterOffset);
    expect(new Date(2026, 6, 15, 12).getTimezoneOffset()).toBe(summerOffset);
  });

  it('addDays and dayDiff move exactly one calendar day across each change', () => {
    process.env.TZ = tz;
    for (const c of changes) {
      const start = makeDate(+c.slice(0, 4), +c.slice(5, 7), +c.slice(8, 10) - 3);
      for (let i = 0; i < 8; i++) {
        const a = addDays(start, i);
        const b = addDays(start, i + 1);
        expect(dayDiff(b, a)).toBe(1);
        expect(a.getHours()).toBe(12);
        expect(iso(b)).toBe(iso(makeDate(b.getFullYear(), b.getMonth() + 1, b.getDate())));
      }
      expect(dayDiff(addDays(start, 7), start)).toBe(7);
    }
  });

  it('a day count across the whole year matches pure UTC arithmetic', () => {
    process.env.TZ = tz;
    expect(dayDiff(makeDate(2026, 12, 31), makeDate(2026, 1, 1))).toBe(utcDays([2026, 12, 31], [2026, 1, 1]));
    expect(dayDiff(makeDate(2027, 3, 1), makeDate(2026, 10, 24))).toBe(utcDays([2027, 3, 1], [2026, 10, 24]));
    expect(iso(addDays(makeDate(2026, 10, 24), 3))).toBe('2026-10-27');
  });

  it('offset conversions are unaffected by DST dates', () => {
    process.env.TZ = tz;
    expect(iso(julianOf(makeDate(2026, 3, 29)))).toBe('2026-03-16');
    expect(iso(julianOf(makeDate(2026, 11, 1)))).toBe('2026-10-19');
    expect(iso(julianToCivil(2026, 10, 12))).toBe('2026-10-25');
  });
});
