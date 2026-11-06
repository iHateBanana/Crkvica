import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { feastsOn, makeDate } from '../src/lib/orthodox';
import { fetchSaintImage, pinnedImage } from '../src/lib/saintImage';
import { PINNED_IMAGES } from '../src/lib/saintImages';

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
