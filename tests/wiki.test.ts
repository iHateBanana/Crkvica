import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSaintSummary } from '../src/lib/wiki';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined },
}));

const LIFE = 'A long enough account of this life, written out so that it passes the minimum length check.';

// Answers a search with `pages`, and an extract request with the life of whichever title was asked for.
const mockWiki = (pages: object[]) => {
  const extracts: string[] = [];
  let searches = 0;
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url);
    if (u.searchParams.get('prop') === 'extracts') {
      const title = u.searchParams.get('titles')!;
      extracts.push(title);
      return { json: async () => ({ query: { pages: { 1: { extract: `${title}: ${LIFE}` } } } }) };
    }
    searches++;
    return { json: async () => ({ query: { pages: Object.fromEntries(pages.map((p, i) => [String(i), { index: i + 1, ...p }])) } }) };
  });
  return { extracts, searches: () => searches };
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchSaintSummary', () => {
  it('returns the life of the right saint', async () => {
    mockWiki([{ title: 'Alypius the Stylite', description: 'Christian saint (died 640)' }]);
    expect(await fetchSaintSummary('Ven. Alypius the Stylite')).toContain('Alypius the Stylite:');
  });

  it("refuses a different saint's life", async () => {
    const w = mockWiki([{ title: 'Gregory Palamas', description: 'Byzantine Greek theologian' }]);
    expect(await fetchSaintSummary('St Gregory the Wonderworker')).toBeNull();
    expect(w.extracts).toEqual([]);
  });

  it('refuses a church named after the saint', async () => {
    const w = mockWiki([{ title: 'St. Spyridon Greek Orthodox Church', description: 'Church in Sydney' }]);
    expect(await fetchSaintSummary('St. Spyridon')).toBeNull();
    expect(w.extracts).toEqual([]);
  });

  it('goes straight to the known page for a built-in saint', async () => {
    const w = mockWiki([]);
    expect(await fetchSaintSummary('St. Sava of Serbia')).toContain('Saint Sava:');
    expect(w.searches()).toBe(0);
  });

  it('does not search for groups', async () => {
    const w = mockWiki([{ title: 'Thyrsus', description: 'Christian saint' }]);
    expect(await fetchSaintSummary('Martyrs Thyrsus, Leucis, Callinicus')).toBeNull();
    expect(w.searches()).toBe(0);
  });
});
