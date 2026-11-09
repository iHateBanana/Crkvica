import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { PINNED_IMAGES } from './saintImages';
import { isCredibleMatch, isSinglePerson, nameWords } from './saintMatch';

export interface SaintImage {
  uri: string;
  source: string; // page to credit, where the licence and author are shown
}

const WIDTH = 330;

export function pinnedImage(name: string | undefined): SaintImage | undefined {
  const file = name ? PINNED_IMAGES[name] : undefined;
  if (!file) return undefined;
  const encoded = encodeURIComponent(file.replace(/ /g, '_'));
  return {
    uri: `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${WIDTH}`,
    source: `https://commons.wikimedia.org/wiki/File:${encoded}`,
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

export function useSaintImage(name: string | undefined): SaintImage | null {
  const pinned = pinnedImage(name);
  const needsLookup = !!name && !pinned;
  const [found, setFound] = useState<{ name: string; image: SaintImage | null } | null>(null);
  useEffect(() => {
    if (!needsLookup || !name) return;
    let live = true;
    fetchSaintImage(name).then((image) => { if (live) setFound({ name, image }); });
    return () => { live = false; };
  }, [name, needsLookup]);
  return pinned ?? (found && found.name === name ? found.image : null);
}
