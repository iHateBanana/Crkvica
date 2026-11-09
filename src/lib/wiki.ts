import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSamePerson, isSinglePerson, nameWords } from './saintMatch';

const memo = new Map<string, string | null>();
const API = 'https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query';

// Built-in feasts and saints with no story of their own, whose page can't be found by matching the name.
const KNOWN_PAGES: Record<string, string> = {
  'St. Sava of Serbia': 'Saint Sava',
  'St. Prince Lazar (Vidovdan)': 'Lazar of Serbia',
  'St. Paraskeva (Petka)': 'Paraskeva of the Balkans',
  'Ss. Cyril and Methodius': 'Cyril and Methodius',
  'Holy Prophet Elijah (Ilindan)': 'Elijah',
  'Holy Apostle and Evangelist Luke (Lučindan)': 'Luke the Evangelist',
  'Holy Apostle Andrew the First-called': 'Andrew the Apostle',
  'St. Stephen the Protomartyr (Stefanovdan)': 'Saint Stephen',
  'St. Basil of Ostrog (Vasilijevdan)': 'Basil of Ostrog',
  'Theophany (Baptism of the Lord)': 'Baptism of Jesus',
  'Meeting of the Lord': 'Presentation of Jesus',
  'Annunciation of the Theotokos': 'Annunciation',
  'Transfiguration of the Lord': 'Transfiguration of Jesus',
  'Dormition of the Theotokos': 'Dormition of the Mother of God',
  'Nativity of the Theotokos': 'Nativity of Mary',
  'Exaltation of the Holy Cross': 'Feast of the Cross',
  'Protection of the Theotokos': 'Intercession of the Theotokos',
  'Entry of the Theotokos into the Temple': 'Presentation of Mary',
  'Nativity of the Lord': 'Nativity of Jesus',
  'Palm Sunday': 'Palm Sunday',
  'Holy Pascha - Resurrection of the Lord': 'Resurrection of Jesus',
  'Ascension of the Lord': 'Ascension of Jesus',
  'Pentecost': 'Pentecost',
};

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

// The Wikipedia page for this name, or null unless it's clearly the same person.
async function findPage(name: string): Promise<string | null> {
  if (KNOWN_PAGES[name]) return KNOWN_PAGES[name];
  if (!isSinglePerson(name)) return null;
  const q = encodeURIComponent(`${nameWords(name).name.join(' ')} saint`);
  const s = await fetch(`${API}&generator=search&gsrsearch=${q}&gsrlimit=3&prop=description&redirects=1`).then((r) => r.json());
  const pages: any[] = Object.values(s?.query?.pages ?? {});
  pages.sort((a, b) => a.index - b.index);
  return pages.find((p) => isSamePerson(name, { title: p.title, description: p.description }))?.title ?? null;
}

// Looks a saint up on Wikipedia and returns the opening summary, or null when nothing credible is found.
export async function fetchSaintSummary(name: string): Promise<string | null> {
  const key = `wiki3:${name}`;
  if (memo.has(key)) return memo.get(key) ?? null;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) { memo.set(key, cached); return cached; }
    const title = await findPage(name);
    if (!title) { memo.set(key, null); return null; }
    const p = await fetch(`${API}&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`).then((r) => r.json());
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
