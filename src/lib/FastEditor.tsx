import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useT } from './i18n';
import { DETAIL, Fast, FastLevel, iso } from './orthodox';
import { supabase } from './supabase';
import { Body, Chips, colors } from './ui';

export type AppliedFast = Fast & { custom?: boolean; usual?: string };
export const PERIODS = ['Great Lent', 'Dormition Fast', 'Nativity Fast', "Apostles' Fast"];
export const baseOf = (label: string) => label.replace(/ \(.*\)$/, '');
// Feast-day exceptions carry " - " in their label and keep their own rule.
const isException = (label: string) => label.includes(' - ');

interface Rules { days: Record<string, FastLevel>; weekday: Record<string, FastLevel>; period: Record<string, FastLevel>; }
const EMPTY: Rules = { days: {}, weekday: {}, period: {} };

// Priority: a single-day adjustment, then a fasting-period rule, then a weekday rule, then the usual practice.
export function useFastOverrides() {
  const [rules, setRules] = useState<Rules>(EMPTY);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('fast_overrides').select('day, level'),
      supabase.from('fast_rules').select('kind, key, level'),
    ]);
    const next: Rules = { days: {}, weekday: {}, period: {} };
    (a.data ?? []).forEach((r: { day: string; level: FastLevel }) => { next.days[r.day] = r.level; });
    (b.data ?? []).forEach((r: { kind: 'weekday' | 'period'; key: string; level: FastLevel }) => { next[r.kind][r.key] = r.level; });
    setRules(next);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const apply = useCallback((d: Date, fast: Fast): AppliedFast => {
    let level: FastLevel | undefined = rules.days[iso(d)];
    if (!level && !isException(fast.label)) {
      level = rules.period[baseOf(fast.label)];
      if (!level && fast.level !== 'none') level = rules.weekday[String(d.getDay())];
    }
    if (!level || level === fast.level) return fast;
    return { level, label: fast.label, detail: DETAIL[level], custom: true, usual: fast.label };
  }, [rules]);

  const set = useCallback(async (d: Date, uid: string, level: FastLevel | null) => {
    const day = iso(d);
    setRules((r) => {
      const days = { ...r.days };
      if (level) days[day] = level; else delete days[day];
      return { ...r, days };
    });
    if (level) await supabase.from('fast_overrides').upsert({ user_id: uid, day, level });
    else await supabase.from('fast_overrides').delete().eq('day', day);
  }, []);

  const setRule = useCallback(async (kind: 'weekday' | 'period', key: string, uid: string, level: FastLevel | null) => {
    setRules((r) => {
      const group = { ...r[kind] };
      if (level) group[key] = level; else delete group[key];
      return { ...r, [kind]: group };
    });
    if (level) await supabase.from('fast_rules').upsert({ user_id: uid, kind, key, level });
    else await supabase.from('fast_rules').delete().eq('kind', kind).eq('key', key);
  }, []);

  return { apply, set, setRule, rules };
}

const LEVELS: FastLevel[] = ['none', 'fish', 'wine-oil', 'strict'];

export function useLevelLabels() {
  const { t } = useT();
  return { none: t('No fast'), fish: t('fish'), 'wine-oil': t('wine & oil'), strict: t('strict') } as Record<FastLevel, string>;
}

export function FastEditor({ date, fast, uid, onSet }: { date: Date; fast: AppliedFast; uid: string; onSet: (d: Date, uid: string, l: FastLevel | null) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const label = useLevelLabels();
  return (
    <View style={{ gap: 8 }}>
      {fast.custom ? <Body muted small>{t('Adjusted by you. Usual: {label}', { label: t(fast.usual ?? '') })}</Body> : null}
      <Pressable onPress={() => setOpen(!open)} hitSlop={6}>
        <Text style={{ color: colors.gold, fontSize: 13 }}>{open ? t('Close') : t('Adjust this day')}</Text>
      </Pressable>
      {open ? (
        <>
          <Chips options={LEVELS.map((l) => ({ value: l, label: label[l] }))} value={fast.level} onChange={(l) => onSet(date, uid, l)} />
          <Pressable onPress={() => onSet(date, uid, null)} hitSlop={6}><Text style={{ color: colors.muted, fontSize: 13 }}>{t('Reset to the usual rule')}</Text></Pressable>
        </>
      ) : null}
    </View>
  );
}

// Profile card for repeating rules; choosing the usual option removes the rule.
export function FastRulesEditor({ uid }: { uid: string }) {
  const { t, locale } = useT();
  const { rules, setRule } = useFastOverrides();
  const label = useLevelLabels();
  const options = [{ value: 'usual', label: t('Usual') }, ...LEVELS.map((l) => ({ value: l as string, label: label[l] }))];
  const row = (kind: 'weekday' | 'period', key: string, title: string) => (
    <View key={kind + key} style={{ gap: 6 }}>
      <Body>{title}</Body>
      <Chips options={options} value={rules[kind][key] ?? 'usual'} onChange={(v) => setRule(kind, key, uid, v === 'usual' ? null : (v as FastLevel))} />
    </View>
  );
  const dayName = (n: number) => new Date(2023, 0, 1 + n).toLocaleDateString(locale, { weekday: 'long' });
  return (
    <>
      <Body muted small>{t('Repeating rules apply to every matching fasting day. A change to a single day always wins, and feast-day exceptions are left alone.')}</Body>
      {row('weekday', '3', t('Every {day}', { day: dayName(3) }))}
      {row('weekday', '5', t('Every {day}', { day: dayName(5) }))}
      {PERIODS.map((p) => row('period', p, t(p)))}
    </>
  );
}
