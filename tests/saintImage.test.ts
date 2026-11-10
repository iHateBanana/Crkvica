import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { feastsOn, makeDate } from '../src/lib/orthodox';
import { ALL_SAINTS_LABEL, chooseDayIcon, fetchSaintImage, pinnedImage, seasonFeast, thumbWidth } from '../src/lib/saintImage';
import { ICON_ASPECTS } from '../src/lib/saintImageAspects';
import { PINNED_IMAGES } from '../src/lib/saintImages';
import { DAILY_IMAGES } from '../src/lib/saintImagesDaily';

const mem = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => { mem.set(k, v); },
  },
}));

const respond = (body: unknown, ok = true) => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => { calls.push(url); return { ok, json: async () => body }; });
  return calls;
};
const wiki = (...pages: object[]) => ({ query: { pages: Object.fromEntries(pages.map((p, i) => [String(i), { index: i + 1, ...p }])) } });
const ALYPIUS = { title: 'Alypius the Stylite', description: 'Christian saint (died 640)', pageimage: 'Saint_Alypius_stylite.gif', thumbnail: { source: 'https://upload.wikimedia.org/alypius.gif' } };

beforeEach(() => mem.clear());
afterEach(() => vi.unstubAllGlobals());

describe('pinned images', () => {
  it('only uses names that are real feasts, so none can silently stop matching', () => {
    const names = new Set<string>();
    for (const year of [2026, 2027]) {
      for (let day = 1; day <= 366; day++) feastsOn(makeDate(year, 1, day), 'new').forEach((f) => names.add(f.name));
    }
    expect(Object.keys(PINNED_IMAGES).filter((n) => !names.has(n))).toEqual([]);
  });

  it('covers the Great Feasts that have an entry and points at Commons, with spaces and Cyrillic encoded', () => {
    const img = pinnedImage('Annunciation of the Theotokos')!;
    expect(img.uri).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/%D0%91/);
    expect(img.uri).toContain('?width=330');
    expect(img.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  });

  it('has nothing for an unknown name', () => {
    expect(pinnedImage('Nobody')).toBeUndefined();
    expect(pinnedImage(undefined)).toBeUndefined();
  });
});

describe('fetchSaintImage', () => {
  it('returns the thumbnail of a credible page and credits it', async () => {
    respond(wiki(ALYPIUS));
    expect(await fetchSaintImage('Ven. Alypius the Stylite')).toEqual({ uri: 'https://upload.wikimedia.org/alypius.gif', source: 'https://en.wikipedia.org/wiki/Alypius_the_Stylite' });
  });

  it('skips a wrong first result in favour of a right one', async () => {
    respond(wiki({ title: 'Alypius the Stylite Church', description: 'Church in Greece', pageimage: 'a.jpg', thumbnail: { source: 'https://x/church.jpg' } }, ALYPIUS));
    expect((await fetchSaintImage('Ven. Alypius the Stylite'))?.uri).toBe('https://upload.wikimedia.org/alypius.gif');
  });

  it('never asks the network about groups or days', async () => {
    const calls = respond(wiki());
    expect(await fetchSaintImage('Martyrs Thyrsus, Leucis, Callinicus')).toBeNull();
    expect(await fetchSaintImage('23rd Sunday after Pentecost')).toBeNull();
    expect(calls).toEqual([]);
  });

  it('remembers both a match and "nothing found"', async () => {
    let calls = respond(wiki(ALYPIUS));
    await fetchSaintImage('Ven. Alypius the Stylite');
    await fetchSaintImage('Ven. Alypius the Stylite');
    expect(calls.length).toBe(1);
    calls = respond({});
    expect(await fetchSaintImage('Ven. Patapius of Thebes')).toBeNull();
    expect(await fetchSaintImage('Ven. Patapius of Thebes')).toBeNull();
    expect(calls.length).toBe(1);
  });

  it('does not remember a failure, so it tries again later', async () => {
    respond({}, false);
    expect(await fetchSaintImage('Ven. Alypius the Stylite')).toBeNull();
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => { throw new SyntaxError('You are making too many requests'); } }));
    expect(await fetchSaintImage('Ven. Alypius the Stylite')).toBeNull();
    vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch'); });
    expect(await fetchSaintImage('Ven. Alypius the Stylite')).toBeNull();
    expect(mem.size).toBe(0);
    respond(wiki(ALYPIUS));
    expect((await fetchSaintImage('Ven. Alypius the Stylite'))?.uri).toBe('https://upload.wikimedia.org/alypius.gif');
  });
});

describe('daily icons', () => {
  it('keys are single commemorations, as the day title is split, and every file looks like an image', () => {
    for (const [name, file] of Object.entries(DAILY_IMAGES)) {
      expect(name).toBe(name.trim());
      expect(name).not.toContain(';');
      expect(file).toMatch(/.(jpe?g|png|gif|webp)$/i);
    }
  });

  it('finds a pinned Orthocal name', () => {
    expect(pinnedImage('Ven. Macarius the Great')?.uri).toContain('Macarius_the_Elder_Crop');
  });
});

describe('icon sizes', () => {
  it('asks for a thumbnail tall enough for the box on a 3x screen', () => {
    expect(thumbWidth(1.33)).toBe(330);
    expect(thumbWidth(1)).toBe(500);
    expect(thumbWidth(0.5)).toBe(960);
    expect(thumbWidth(0.2)).toBe(960); // Wikimedia's largest size we use; panoramas are cropped anyway
  });

  it('knows the shape of every listed icon that is far from the box shape', () => {
    for (const file of Object.keys(ICON_ASPECTS)) expect([...Object.values(PINNED_IMAGES), ...Object.values(DAILY_IMAGES)], file).toContain(file);
    const tall = pinnedImage('Ven. Onuphrius the Great');
    expect(tall?.aspect).toBeGreaterThan(3);
    expect(tall?.uri).toContain('width=330');
    const wide = pinnedImage('Martyr Anastasia the Roman');
    expect(wide?.aspect).toBeLessThan(1);
    expect(wide?.uri).toMatch(/width=(500|960)$/);
  });
});

describe('seasonFeast', () => {
  const cases: [string, string][] = [
    ['31st Sunday after Pentecost', 'Holy Pascha - Resurrection of the Lord'],
    ['Leavetaking of Pentecost', 'Pentecost'],
    ['Leavetaking of Mid-Pentecost', 'Holy Pascha - Resurrection of the Lord'],
    ['8th Sunday of Pascha: Feast of the Holy Trinity', 'Pentecost'],
    ['Leavetaking of Pascha / Forefeast of Ascension', 'Ascension of the Lord'],
    ['Forefeast of Theophany', 'Theophany (Baptism of the Lord)'],
    ['Forefeast of Nativity', 'Nativity of the Theotokos'],
    ['Leavetaking of the Nativity', 'Nativity of the Lord'],
    ['Saturday before Elevation', 'Exaltation of the Holy Cross'],
    ['Forefeast of the Procession of the Lifegiving Cross', 'Exaltation of the Holy Cross'],
    ['Palm Sunday: Entrance of Our Lord into Jerusalem', 'Palm Sunday'],
    ['Great and Holy Saturday', 'Holy Saturday'],
    ['Saturday of the Akathist to the Most-Holy Theotokos', 'Annunciation of the Theotokos'],
  ];
  it.each(cases)('%s', (name, feast) => {
    expect(seasonFeast([name])).toBe(feast);
    expect(pinnedImage(feast)).toBeDefined();
  });

  it('has nothing for a saint or a memorial Saturday', () => {
    expect(seasonFeast(['Memorial Saturday', 'Ven. Nobody'])).toBeUndefined();
  });
});

describe('chooseDayIcon', () => {
  const MAIN = 'Ven. Macarius the Great';
  const OTHER = 'Ven. Euthymius the Great';
  const UNKNOWN = 'Martyr Nobody of Nowhere';
  const found = { uri: 'https://x/found.jpg', source: 'https://x' };

  it('uses a named feast even when its name is a day', () => {
    expect(chooseDayIcon('Palm Sunday', ['Palm Sunday', OTHER], null)?.shows).toBe('Palm Sunday');
  });

  it('prefers the main saint, then what the lookup found', () => {
    expect(chooseDayIcon(MAIN, [MAIN, OTHER], null)?.shows).toBe(MAIN);
    expect(chooseDayIcon(UNKNOWN, [UNKNOWN, OTHER], found)).toEqual({ image: found, shows: UNKNOWN });
  });

  it('labels another saint of the day when the main one has no icon', () => {
    expect(chooseDayIcon(UNKNOWN, [UNKNOWN, OTHER], null)?.shows).toBe(OTHER);
  });

  it('falls back to the season, then All Saints', () => {
    expect(chooseDayIcon('5th Sunday after Pentecost', ['5th Sunday after Pentecost'], null)?.shows).toBe('Holy Pascha - Resurrection of the Lord');
    expect(chooseDayIcon(UNKNOWN, [UNKNOWN], null)?.shows).toBe(ALL_SAINTS_LABEL);
  });

  it('shows nothing general until the day has loaded and the lookup has finished', () => {
    expect(chooseDayIcon(UNKNOWN, undefined, null)).toBeNull();
    expect(chooseDayIcon(UNKNOWN, [UNKNOWN, OTHER], undefined)).toBeNull();
    expect(chooseDayIcon(undefined, [], null)).toBeNull();
  });
});
