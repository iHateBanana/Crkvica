import { useAuth } from './auth';
import { SR } from './sr';

export type Lang = 'en' | 'sr' | 'sr-Latn';

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sr', label: 'Српски' },
  { value: 'sr-Latn', label: 'Srpski' },
];

const CYR: Record<string, string> = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J', К: 'K', Л: 'L', Љ: 'Lj',
  М: 'M', Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č',
  Џ: 'Dž', Ш: 'Š',
};

export function toLatin(s: string): string {
  let out = '';
  for (const ch of s) {
    const up = ch.toUpperCase();
    const m = CYR[up];
    if (!m) { out += ch; continue; }
    out += ch === up ? m : m.toLowerCase();
  }
  return out;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = lang === 'en' ? key : SR[key] ?? key;
  if (lang === 'sr-Latn' && SR[key]) s = toLatin(s);
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export const localeFor = (lang: Lang) => (lang === 'en' ? 'en-US' : lang === 'sr' ? 'sr-Cyrl-RS' : 'sr-Latn-RS');

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function useT() {
  const { lang } = useAuth();
  const t: T = (key, vars) => translate(lang, key, vars);
  const locale = localeFor(lang);
  return { t, lang, locale };
}
