import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { CalendarStyle, getDayInfo, iso, liturgicalDate, makeDate } from './orthodox';

export interface OrthoReading { source: string; display: string; short_display: string; text: string; }
export interface OrthoDay {
  date: string; // the day Orthocal says it is describing (Julian date for the Old calendar), ISO
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
    date: iso(makeDate(j.year, j.month, j.day)),
    title: j.summary_title ?? '',
    saints: String(j.summary_title ?? '').split(';').map((s: string) => s.trim()).filter(Boolean),
    feastLevel: j.feast_level ?? 0,
    stories: (j.stories ?? []).map((s: any) => ({ title: s.title, text: htmlToText(s.story ?? '') })),
    readings,
  };
}

// Orthocal's /julian/ and /gregorian/ endpoints both take the CIVIL (Gregorian) date in the path.
// /julian/ then returns the Old Calendar day for it (its own year/month/day fields are the Julian date),
// so the date must NOT be converted before the request.
export function orthocalUrl(d: Date, style: CalendarStyle): string {
  return `https://orthocal.info/api/${style === 'old' ? 'julian' : 'gregorian'}/${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}/`;
}

export async function fetchDay(d: Date, style: CalendarStyle): Promise<OrthoDay | null> {
  const key = `oc2-${style}-${iso(d)}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const res = await fetch(orthocalUrl(d, style));
    if (!res.ok) return null;
    const day = parse(await res.json());
    // Never show a different day than the one asked for.
    if (day.date !== iso(liturgicalDate(d, style))) return null;
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

// The one lookup used by Today and Calendar: local day info plus saints and readings from Orthocal.
export function useDayInfo(d: Date, style: CalendarStyle) {
  const info = getDayInfo(d, style);
  const { day: ortho, loading } = useOrthoDay(d, style);
  return { ...info, ortho, loading };
}

