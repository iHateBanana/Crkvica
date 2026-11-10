import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { DAILY_IMAGES } from './saintImagesDaily';
import { PINNED_IMAGES } from './saintImages';
import { ICON_ASPECTS } from './saintImageAspects';
import { imageSubject, isCredibleMatch, isSinglePerson, nameWords } from './saintMatch';

export interface SaintImage {
  uri: string;
  source: string; // page to credit, where the licence and author are shown
  aspect?: number; // height / width, when the icon is known to be much taller or wider than the box
}

// An icon for the day, and who it shows, so an icon of someone other than the day's main saint can be labelled as such.
export interface DayIcon {
  image: SaintImage;
  shows: string | undefined;
}

// The icon box is 104x132, so on a 3x screen an icon needs to be at least 312x396. An upright icon gets that at 330
// wide; a squarer or wider one needs a wider thumbnail to be tall enough. All three are Wikimedia's standard sizes.
const WIDTH = 330;
export const thumbWidth = (aspect: number) => (396 / aspect <= WIDTH ? WIDTH : 396 / aspect <= 500 ? 500 : 960);
const ALL_SAINTS_FEAST = 'Sunday of All Saints';
export const ALL_SAINTS_LABEL = 'All Saints';

export function pinnedImage(name: string | undefined): SaintImage | undefined {
  const file = name ? PINNED_IMAGES[name] ?? DAILY_IMAGES[name] : undefined;
  if (!file) return undefined;
  const encoded = encodeURIComponent(file.replace(/ /g, '_'));
  const aspect = ICON_ASPECTS[file];
  return {
    uri: `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${aspect ? thumbWidth(aspect) : WIDTH}`,
    source: `https://commons.wikimedia.org/wiki/File:${encoded}`,
    ...(aspect ? { aspect } : {}),
  };
}

// Looks up a saint the calendar has no pinned image for. Null means nothing trustworthy was found. Definite answers,
// including "nothing", are remembered on the device; failures (offline, rate limited) are not, so they're tried again.
export async function fetchSaintImage(name: string): Promise<SaintImage | null> {
  if (!isSinglePerson(name)) return null;
  const key = `saintimg1:${name}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const q = encodeURIComponent(`${nameWords(name).name.join(' ')} saint`);
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=3&prop=pageimages|description&piprop=thumbnail|name&pithumbsize=${WIDTH}&pilimit=3&redirects=1&format=json&origin=*`);
    if (!res.ok) return null;
    const json = await res.json();
    const pages: any[] = Object.values(json?.query?.pages ?? {});
    pages.sort((a, b) => a.index - b.index);
    const page = pages.find((p) => p.thumbnail?.source && isCredibleMatch(name, { title: p.title, description: p.description, file: p.pageimage }));
    const image = page
      ? { uri: page.thumbnail.source as string, source: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(page.title).replace(/ /g, '_'))}` }
      : null;
    await AsyncStorage.setItem(key, JSON.stringify(image)).catch(() => undefined);
    return image;
  } catch {
    return null;
  }
}

// Days named after a season or a feast rather than a person, and the feast whose icon suits them. Order matters: the
// more specific names come first, and any other Sunday is a little Pascha.
const SEASONS: readonly [RegExp, string][] = [
  [/great and holy saturday/i, 'Holy Saturday'],
  [/palm sunday/i, 'Palm Sunday'],
  [/mid-pentecost/i, 'Holy Pascha - Resurrection of the Lord'],
  [/holy trinity|leavetaking of pentecost/i, 'Pentecost'],
  [/ascension/i, 'Ascension of the Lord'],
  [/pascha|^bright/i, 'Holy Pascha - Resurrection of the Lord'],
  [/theophany/i, 'Theophany (Baptism of the Lord)'],
  [/meeting/i, 'Meeting of the Lord'],
  [/annunciation|akathist/i, 'Annunciation of the Theotokos'],
  [/transfiguration/i, 'Transfiguration of the Lord'],
  [/dormition/i, 'Dormition of the Theotokos'],
  [/\bentry\b/i, 'Entry of the Theotokos into the Temple'],
  [/^forefeast of nativity$|nativity of the theotokos/i, 'Nativity of the Theotokos'], // Orthocal only uses the bare name for September
  [/nativity/i, 'Nativity of the Lord'],
  [/elevation|exaltation|\bcross\b/i, 'Exaltation of the Holy Cross'],
  [/sunday/i, 'Holy Pascha - Resurrection of the Lord'],
];

export function seasonFeast(names: readonly string[]): string | undefined {
  for (const name of names) {
    const feast = SEASONS.find(([pattern]) => pattern.test(name));
    if (feast) return feast[1];
  }
  return undefined;
}

// Picks the day's icon: the feast or the main saint's own (or their group's), then another saint commemorated that day,
// then the feast or season the day belongs to, then the icon of All Saints. `saints` is undefined until the day has
// loaded and `found` is undefined while a lookup runs; the later steps wait for both, so a general icon can't flash up
// ahead of the right one.
export function chooseDayIcon(mainName: string | undefined, saints: string[] | undefined, found: SaintImage | null | undefined): DayIcon | null {
  if (!mainName) return null;
  const feast = pinnedImage(mainName);
  if (feast) return { image: feast, shows: mainName };
  const subject = imageSubject(mainName, saints ?? []);
  const own = pinnedImage(subject) ?? found;
  if (own) return { image: own, shows: subject };
  if (!saints || found === undefined) return null;
  const other = saints.find((s) => s !== subject && pinnedImage(s));
  if (other) return { image: pinnedImage(other)!, shows: other };
  const season = seasonFeast(saints);
  if (season) return { image: pinnedImage(season)!, shows: season };
  return { image: pinnedImage(ALL_SAINTS_FEAST)!, shows: ALL_SAINTS_LABEL };
}

export function useDayIcon(mainName: string | undefined, saints: string[] | undefined): DayIcon | null {
  const subject = imageSubject(mainName, saints ?? []);
  const needsLookup = !pinnedImage(mainName) && !!subject && !pinnedImage(subject);
  const [found, setFound] = useState<{ name: string; image: SaintImage | null } | null>(null);
  useEffect(() => {
    if (!needsLookup || !subject) return;
    let live = true;
    fetchSaintImage(subject).then((image) => { if (live) setFound({ name: subject, image }); });
    return () => { live = false; };
  }, [subject, needsLookup]);
  const lookup = !needsLookup ? null : found && found.name === subject ? found.image : undefined;
  return chooseDayIcon(mainName, saints, lookup);
}
