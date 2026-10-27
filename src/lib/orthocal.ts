import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { addDays, CalendarStyle, iso } from './orthodox';

export interface OrthoReading { source: string; display: string; short_display: string; text: string; }
export interface OrthoDay {
  title: string;
  saints: string[];
  feastLevel: number;
  stories: { title: string; text: string }[];
  readings: OrthoReading[];
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&mdash;': '—', '&ndash;': '–' };

export function htmlToText(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim();
}

function parse(j: any): OrthoDay {
  const readings: OrthoReading[] = (j.readings ?? [])
    .filter((r: any) => r.source === 'Epistle' || r.source === 'Gospel')
    .map((r: any) => ({
      source: r.source,
      display: r.display,
      short_display: r.short_display,
      text: (r.passage ?? []).map((v: any) => v.content).join(' '),
    }));
  return {
    title: j.summary_title ?? '',
    saints: String(j.summary_title ?? '').split(';').map((s: string) => s.trim()).filter(Boolean),
    feastLevel: j.feast_level ?? 0,
    stories: (j.stories ?? []).map((s: any) => ({ title: s.title, text: htmlToText(s.story ?? '') })),
    readings,
  };
}

// New calendar uses the civil date; Old calendar uses the equivalent Julian date.
export async function fetchDay(d: Date, style: CalendarStyle): Promise<OrthoDay | null> {
  const key = `oc1-${style}-${iso(d)}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const q = style === 'old' ? addDays(d, -13) : d;
    const url = `https://orthocal.info/api/${style === 'old' ? 'julian' : 'gregorian'}/${q.getFullYear()}/${q.getMonth() + 1}/${q.getDate()}/`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const day = parse(await res.json());
    await AsyncStorage.setItem(key, JSON.stringify(day));
    return day;
  } catch {
    return null;
  }
}

export function useOrthoDay(d: Date, style: CalendarStyle) {
  const [day, setDay] = useState<OrthoDay | null>(null);
  const [loading, setLoading] = useState(true);
  const k = iso(d);
  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchDay(d, style).then((r) => { if (live) { setDay(r); setLoading(false); } });
    return () => { live = false; };
  }, [k, style]);
  return { day, loading };
}
