import { addDays, fromIso, iso } from './orthodox';

// Past days stay readable offline for this long. A day from Orthocal is about 10 KB and browsers allow about 5 MB.
const KEEP_DAYS = 45;

// Local keys that are safe to delete: old cached Orthocal days, previous cache formats (wiki2 could hold the wrong
// saint's life), and to-do ticks from earlier days (only today's are ever read).
export function staleKeys(keys: readonly string[], today: string): string[] {
  const cutoff = iso(addDays(fromIso(today), -KEEP_DAYS));
  return keys.filter((k) => {
    if (k.startsWith('oc1-') || k.startsWith('wiki2:')) return true;
    const day = /^oc2-(?:new|old)-(\d{4}-\d{2}-\d{2})$/.exec(k)?.[1];
    if (day) return day < cutoff;
    const todo = /^todos-(\d{4}-\d{2}-\d{2})$/.exec(k)?.[1];
    return !!todo && todo < today;
  });
}

export async function pruneStorage(
  storage: { getAllKeys(): Promise<readonly string[]>; removeItem(k: string): Promise<unknown> },
  today: string = iso(new Date()),
) {
  const stale = staleKeys(await storage.getAllKeys(), today);
  await Promise.all(stale.map((k) => storage.removeItem(k)));
}
