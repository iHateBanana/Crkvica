import { describe, expect, it } from 'vitest';
import { makeDate } from '../src/lib/orthodox';
import { normalizeName, toLatin } from '../src/lib/serbian';
import { celebratesName, daysUntilSlava, LEGACY_IDS, searchSlavas, SLAVAS, slavaById, slavaDates, slavaLabel, slavaOn } from '../src/lib/slava';

const stefan = slavaById('stefan')!;

describe('slavaOn, Old calendar, 2026', () => {
  const cases: [number, number, number, string][] = [
    [2026, 1, 14, 'basil'], [2026, 1, 27, 'sava'], [2026, 2, 14, 'trifun'], [2026, 5, 6, 'djordje'],
    [2026, 6, 28, 'vidovdan'], [2026, 7, 12, 'petrovdan'], [2026, 8, 2, 'ilija'], [2026, 8, 28, 'gospojina'],
    [2026, 10, 27, 'petka'], [2026, 11, 8, 'mitrovdan'], [2026, 12, 19, 'nikola'], [2027, 1, 9, 'stefan'],
  ];
  for (const [y, m, d, id] of cases) {
    it(`${y}-${m}-${d} is ${id}`, () => expect(slavaOn(makeDate(y, m, d))?.id).toBe(id));
  }
  it('also works across the 2028 leap day', () => {
    expect(slavaOn(makeDate(2028, 2, 14))?.id).toBe('trifun');
    expect(slavaOn(makeDate(2028, 1, 9))?.id).toBe('stefan');
  });
});

describe('daysUntilSlava', () => {
  it('Stefanovdan around New Year', () => {
    expect(daysUntilSlava(stefan, makeDate(2026, 12, 31))).toBe(9);
    expect(daysUntilSlava(stefan, makeDate(2027, 1, 5))).toBe(4);
    expect(daysUntilSlava(stefan, makeDate(2027, 1, 9))).toBe(0);
    expect(daysUntilSlava(stefan, makeDate(2027, 1, 10))).toBe(364);
  });
  it('counts across the 2028 leap day', () => {
    const nikola = slavaById('nikola')!;
    const expected = Math.round((Date.UTC(2028, 11, 19) - Date.UTC(2028, 1, 28)) / 86400000);
    expect(daysUntilSlava(nikola, makeDate(2028, 2, 28))).toBe(expected);
    expect(daysUntilSlava(slavaById('trifun')!, makeDate(2028, 2, 10))).toBe(4);
  });
  it('always finds the next occurrence within a year', () => {
    for (const s of SLAVAS) {
      const n = daysUntilSlava(s, makeDate(2026, 10, 27));
      expect(n).not.toBeNull();
      expect(n!).toBeGreaterThanOrEqual(0);
      expect(n!).toBeLessThanOrEqual(365);
    }
    expect(daysUntilSlava(slavaById('petka')!, makeDate(2026, 10, 27))).toBe(0);
  });
});

describe('data', () => {
  it('is sorted chronologically by Julian date', () => {
    const keys = SLAVAS.map((s) => s.julian[0] * 100 + s.julian[1]);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    const ids = SLAVAS.map((s) => s.id);
    expect(ids.indexOf('aleksandar')).toBeLessThan(ids.indexOf('katarina'));
  });
  it('keeps the original Julian dates', () => {
    const j = (id: string) => slavaById(id)!.julian;
    expect(j('basil')).toEqual([1, 1]);
    expect(j('petka')).toEqual([10, 14]);
    expect(j('arandjelovdan')).toEqual([11, 8]);
    expect(j('stefan')).toEqual([12, 27]);
  });
  it('ids are plain ASCII and the legacy id still resolves', () => {
    for (const s of SLAVAS) expect(s.id).toMatch(/^[a-z-]+$/);
    expect(LEGACY_IDS['aranđelovdan']).toBe('arandjelovdan');
    expect(slavaById('aranđelovdan')?.id).toBe('arandjelovdan');
    expect(slavaById('arandjelovdan')?.id).toBe('arandjelovdan');
    expect(slavaById(null)).toBeUndefined();
  });
});

describe('transliteration and names', () => {
  it('converts Serbian Cyrillic to Latin', () => {
    expect(toLatin('Љубица Његош Џон Ђорђе Жарко Чачак Ћирило Шабац Јован')).toBe('Ljubica Njegoš Džon Đorđe Žarko Čačak Ćirilo Šabac Jovan');
    expect(toLatin('ЉУБА')).toBe('LJUBA');
    expect(toLatin('Света Петка (Петковдан)')).toBe('Sveta Petka (Petkovdan)');
  });
  it('normalizes names', () => {
    expect(normalizeName('  Đorđe ')).toBe('djordje');
    expect(normalizeName('Ђорђе')).toBe('djordje');
    expect(normalizeName('DJORDJE')).toBe('djordje');
    expect(normalizeName('Šarić Čačak Ćiro Žarko')).toBe('saric cacak ciro zarko');
  });
  it('matches typed Latin, Cyrillic and diacritic-free names', () => {
    const jelena = slavaById('jelena')!;
    expect(celebratesName(jelena, 'Jelena')).toBe(true);
    expect(celebratesName(jelena, ' јелена ')).toBe(true);
    expect(celebratesName(jelena, 'JELENA')).toBe(true);
    expect(celebratesName(jelena, 'Marija')).toBe(false);
    expect(celebratesName(jelena, '')).toBe(false);
    const djordje = slavaById('djordje')!;
    for (const n of ['Đorđe', 'Djordje', 'Ђорђе', 'Đurđe', 'Djurdje']) expect(celebratesName(djordje, n)).toBe(true);
  });
});

describe('labels, dates and search', () => {
  it('derives Latin labels from the Cyrillic name', () => {
    const petka = slavaById('petka')!;
    expect(slavaLabel(petka, 'en')).toBe('St. Paraskevi (Petkovdan)');
    expect(slavaLabel(petka, 'sr')).toBe('Света Петка (Петковдан)');
    expect(slavaLabel(petka, 'sr-Latn')).toBe('Sveta Petka (Petkovdan)');
  });
  it('shows both calendars', () => {
    expect(slavaDates(slavaById('nikola')!, 'en-US', 'Julian', 2026)).toBe('Dec 6 Julian / Dec 19');
    expect(slavaDates(stefan, 'en-US', 'Julian', 2026)).toBe('Dec 27 Julian / Jan 9');
  });
  it('searches English, Cyrillic and Latin, with or without diacritics', () => {
    const ids = (q: string) => searchSlavas(q).map((s) => s.id);
    expect(ids('Djurdjevdan')).toContain('djordje');
    expect(ids('Đurđevdan')).toContain('djordje');
    expect(ids('Ђурђевдан')).toContain('djordje');
    expect(ids('nicholas')).toContain('nikola');
    expect(ids('Aranđelovdan')).toContain('arandjelovdan');
    expect(ids('arandjelovdan')).toContain('arandjelovdan');
    expect(ids('')).toHaveLength(SLAVAS.length);
    expect(ids('zzzz')).toHaveLength(0);
  });
});
