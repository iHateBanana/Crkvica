import AsyncStorage from '@react-native-async-storage/async-storage';

const memo = new Map<string, string | null>();

// "Rep. Ven. Job of Pochaev (1651)" -> "Job of Pochaev"
export function cleanSaintName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(our|holy|saint|st|sts|ven|rep|righteous|venerable|reverend|martyrs?|hieromartyrs?|great|new|apostles?|prophets?|bishop|archbishop|archimandrite|the|blessed|confessors?|wonderworker|and|his|her|mother|children|virgin|monk|nun|father|fathers)\b\.?/gi, ' ')
    .replace(/[,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Keeps the first few paragraphs (headings dropped) and ends on a full sentence.
function trimLife(extract?: string): string | undefined {
  if (!extract) return undefined;
  const paras = extract.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('=='));
  let out = '';
  for (const para of paras) {
    if (out.length >= 900) break;
    out += (out ? '\n\n' : '') + para;
  }
  if (out.length > 1800) {
    const cut = out.slice(0, 1800);
    out = cut.slice(0, Math.max(cut.lastIndexOf('. '), 600) + 1);
  }
  return out;
}

// Looks a saint up on Wikipedia and returns the opening summary, or null when nothing credible is found.
export async function fetchSaintSummary(name: string): Promise<string | null> {
  const key = `wiki2:${name}`;
  if (memo.has(key)) return memo.get(key) ?? null;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) { memo.set(key, cached); return cached; }
    const clean = cleanSaintName(name);
    if (clean.length < 3) return null;
    const q = encodeURIComponent(`${clean} Orthodox saint`);
    const s = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=3&format=json&origin=*`).then((r) => r.json());
    const hits: { title: string }[] = s?.query?.search ?? [];
    const words = clean.toLowerCase().split(' ').filter((w) => w.length > 2);
    const hit = hits.find((h) => words.some((w) => h.title.toLowerCase().includes(w)));
    if (!hit) { memo.set(key, null); return null; }
    const p = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(hit.title)}&format=json&origin=*`).then((r) => r.json());
    const page: any = Object.values(p?.query?.pages ?? {})[0];
    const text = trimLife(page?.extract);
    if (!text || text.length < 60) { memo.set(key, null); return null; }
    memo.set(key, text);
    AsyncStorage.setItem(key, text).catch(() => {});
    return text;
  } catch {
    return null;
  }
}
