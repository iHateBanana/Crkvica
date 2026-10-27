import { useAuth } from './auth';
import { toLatin } from './serbian';
import { SR } from './sr';

export { toLatin };
export type Lang = 'en' | 'sr' | 'sr-Latn';

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sr', label: 'Српски' },
  { value: 'sr-Latn', label: 'Srpski' },
];

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
