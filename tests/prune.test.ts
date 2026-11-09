import { describe, expect, it } from 'vitest';
import { pruneStorage, staleKeys } from '../src/lib/prune';

const TODAY = '2026-11-06';

describe('staleKeys', () => {
  it('drops Orthocal days older than the keep window, on both calendars', () => {
    expect(staleKeys(['oc2-new-2026-09-01', 'oc2-old-2025-01-01'], TODAY)).toEqual(['oc2-new-2026-09-01', 'oc2-old-2025-01-01']);
  });

  it('keeps recent and future Orthocal days', () => {
    expect(staleKeys(['oc2-new-2026-09-22', 'oc2-new-2026-11-06', 'oc2-old-2027-01-07'], TODAY)).toEqual([]);
  });

  it('drops previous cache formats', () => {
    expect(staleKeys(['oc1-new-2026-11-06', 'wiki2:St. Job'], TODAY)).toEqual(['oc1-new-2026-11-06', 'wiki2:St. Job']);
  });

  it('keeps only to-do ticks from today onward', () => {
    expect(staleKeys(['todos-2026-11-05', 'todos-2026-11-06'], TODAY)).toEqual(['todos-2026-11-05']);
  });

  it('never touches the session, settings, offline data or saint stories', () => {
    const keep = ['sb-abc-auth-token', 'theme', 'lang', 'customMoods', 'oq:queue', 'oq:failed', 'oc:user:a:https://x/rest/v1/checkins', 'oc:user:profile', 'wiki3:St. Job', 'saintimg1:St. Job'];
    expect(staleKeys(keep, TODAY)).toEqual([]);
  });
});

describe('pruneStorage', () => {
  it('removes only the stale keys', async () => {
    const mem = new Map([['oc2-new-2020-01-01', 'x'], ['oc2-new-2026-11-06', 'y'], ['theme', 'blue']]);
    await pruneStorage({ getAllKeys: async () => [...mem.keys()], removeItem: async (k) => mem.delete(k) }, TODAY);
    expect([...mem.keys()]).toEqual(['oc2-new-2026-11-06', 'theme']);
  });
});
