import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { DEEDS } from './content';
import { T, useT } from './i18n';
import { Fast, Feast } from './orthodox';
import { supabase } from './supabase';
import { Body, Button, Card, colors, Input, Label, serif } from './ui';

export interface CheckinRow {
  day: string;
  mood: string | null;
  deeds: string[];
  energy?: number | null;
  gratitude?: string | null;
  intention?: string | null;
  pray_for?: string | null;
  reflection?: string | null;
}

export const MOOD_OPTIONS: { v: string; e: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { v: 'Peaceful', e: 'white-balance-sunny' }, { v: 'Grateful', e: 'hands-pray' }, { v: 'Joyful', e: 'emoticon-happy-outline' }, { v: 'Hopeful', e: 'weather-sunset-up' },
  { v: 'Tired', e: 'sleep' }, { v: 'Anxious', e: 'emoticon-confused-outline' }, { v: 'Distracted', e: 'blur' }, { v: 'Sorrowful', e: 'emoticon-sad-outline' }, { v: 'Tempted', e: 'sword-cross' },
];

const ENERGY = ['Drained', 'Low', 'Steady', 'Good', 'Vibrant'];

// Mood-aware, context-aware words offered back to the user.
function response(moods: string[], fast: Fast, t: T, red?: Feast): string {
  const m: Record<string, string> = {
    Peaceful: 'Peace is a gift. Rest in it, and give thanks.',
    Grateful: 'A thankful heart is already a prayer.',
    Joyful: 'Rejoice! Share this joy with someone today.',
    Hopeful: 'Hope does not disappoint. Keep going.',
    Tired: 'Be gentle with yourself. Even a short prayer counts today.',
    Anxious: '"Be anxious for nothing, but in everything by prayer…" (Phil 4:6). Try the Jesus Prayer slowly.',
    Distracted: 'Come back, again and again. That returning is the work.',
    Sorrowful: 'The Lord is near to the broken-hearted (Ps 34:18). You are not alone.',
    Tempted: 'Do not be ashamed to ask for help. Call on the Lord and, if you can, speak to your spiritual father.',
  };
  // Heavier feelings come first so they are met with care before encouragement.
  const order = ['Sorrowful', 'Tempted', 'Anxious', 'Tired', 'Distracted', 'Hopeful', 'Grateful', 'Peaceful', 'Joyful'];
  const picked = order.filter((k) => moods.includes(k)).slice(0, 2);
  let s = picked.map((k) => t(m[k])).join(' ');
  if (red) s += ' ' + t('Today is {feast}, so let the feast lift you.', { feast: t(red.name) });
  else if (fast.level !== 'none') s += ' ' + t('You are in {fast}. Struggle in it is part of the path.', { fast: t(fast.label).toLowerCase() });
  return s;
}

function prompts(hour: number, fast: Fast, t: T, red?: Feast) {
  const morning = hour < 12;
  const main = red
    ? t('Today is {feast}. What does this feast mean to you?', { feast: t(red.name) })
    : fast.level !== 'none'
    ? t('How is the fast going? What is it showing you about yourself?')
    : morning
    ? t('What do you want to offer to God today?')
    : t('Where did you see God in your day?');
  return { morning, main };
}

export function CheckIn({
  uid, day, name, hour, fast, red, today, previous, onSaved,
}: {
  uid: string; day: string; name?: string | null; hour: number; fast: Fast; red?: Feast;
  today?: CheckinRow; previous?: CheckinRow; onSaved: (r: CheckinRow) => void;
}) {
  const [moods, setMoods] = useState<string[]>([]);
  const [customMoods, setCustomMoods] = useState<string[]>([]);
  const [customMood, setCustomMood] = useState('');
  useEffect(() => {
    AsyncStorage.getItem('customMoods').then((v) => { if (v) try { setCustomMoods(JSON.parse(v)); } catch {} });
  }, []);
  const saveMoods = (list: string[]) => { setCustomMoods(list); AsyncStorage.setItem('customMoods', JSON.stringify(list)); };
  const addMood = () => {
    const v = customMood.trim().replace(/,/g, ' ');
    if (!v) return;
    if (!MOOD_OPTIONS.some((o) => o.v.toLowerCase() === v.toLowerCase()) && !customMoods.includes(v)) saveMoods([...customMoods, v]);
    if (!moods.includes(v)) { setMoods([...moods, v]); setSaved(false); }
    setCustomMood('');
  };
  const [energy, setEnergy] = useState<number | null>(null);
  const [deeds, setDeeds] = useState<string[]>([]);
  const [gratitude, setGratitude] = useState('');
  const [intention, setIntention] = useState('');
  const [prayFor, setPrayFor] = useState('');
  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!today) return;
    setMoods((today.mood ?? '').split(',').filter(Boolean)); setEnergy(today.energy ?? null); setDeeds(today.deeds ?? []);
    setGratitude(today.gratitude ?? ''); setIntention(today.intention ?? '');
    setPrayFor(today.pray_for ?? ''); setReflection(today.reflection ?? '');
    setSaved(true);
  }, [today?.day, today?.mood]);

  const touch = <V,>(set: (v: V) => void) => (v: V) => { set(v); setSaved(false); };
  const { t } = useT();
  const { morning, main } = prompts(hour, fast, t, red);
  const first = name?.trim().split(' ')[0];

  async function save() {
    const row: CheckinRow = {
      day, mood: moods.length ? moods.join(',') : null, deeds, energy,
      gratitude: gratitude.trim() || null, intention: intention.trim() || null,
      pray_for: prayFor.trim() || null, reflection: reflection.trim() || null,
    };
    const { error } = await supabase.from('checkins').upsert({ user_id: uid, ...row });
    if (error) { setErr(error.message); return; }
    setErr(''); setSaved(true); onSaved(row);
  }

  return (
    <>
      <Label>{t('Daily check-in')}</Label>
      <Card>
        <Text style={{ color: colors.text, fontFamily: serif, fontSize: 21, lineHeight: 28 }}>
          {morning ? t('Good morning') : hour < 18 ? t('Hello') : t('Good evening')}{first ? `, ${first}` : ''}. {t('How is your heart?')}
        </Text>
        {previous?.mood && (
          <Body muted small>
            {t('Yesterday you felt {mood}', { mood: previous.mood.split(',').map((m) => t(m).toLowerCase()).join(', ') })}
            {previous.intention ? t(', and you wanted to: “{intention}”', { intention: previous.intention }) : ''}.
          </Body>
        )}

        <Body muted small>{t('Choose all that apply.')}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {[...MOOD_OPTIONS.map((o) => ({ v: o.v, e: o.e as React.ComponentProps<typeof MaterialCommunityIcons>['name'], custom: false })), ...customMoods.map((v) => ({ v, e: 'heart-outline' as const, custom: true }))].map((o) => {
            const on = moods.includes(o.v);
            return (
              <Pressable key={o.v} onLongPress={o.custom ? () => { saveMoods(customMoods.filter((x) => x !== o.v)); setMoods(moods.filter((x) => x !== o.v)); } : undefined} onPress={() => touch(setMoods)(on ? moods.filter((x) => x !== o.v) : [...moods, o.v])} style={{ alignItems: 'center', width: '30%', flexGrow: 1, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: on ? colors.gold : colors.border, backgroundColor: on ? 'rgba(227,185,92,0.18)' : colors.cardHi }}>
                <MaterialCommunityIcons name={o.e} size={26} color={on ? colors.gold : colors.text} />
                <Text style={{ color: on ? colors.gold : colors.text, fontSize: 13, marginTop: 2 }}>{o.custom ? o.v : t(o.v)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Input placeholder={t('Add your own feeling')} value={customMood} onChangeText={setCustomMood} onSubmitEditing={addMood} /></View>
          <Pressable onPress={addMood} hitSlop={8}><MaterialCommunityIcons name="plus-circle-outline" size={32} color={colors.gold} /></Pressable>
        </View>
        {customMoods.length > 0 && <Body muted small>{t('Press and hold one of your own feelings to remove it.')}</Body>}
        {moods.length ? <Text style={{ color: colors.text, fontStyle: 'italic', lineHeight: 22, marginTop: 4 }}>{response(moods, fast, t, red)}</Text> : null}

        <Label>{t('Energy')}</Label>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {ENERGY.map((l, i) => {
            const on = energy === i + 1;
            return (
              <Pressable key={l} onPress={() => touch(setEnergy)(i + 1)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: on ? colors.gold : colors.cardHi }}>
                <Text style={{ color: on ? colors.bg : colors.muted, fontSize: 11.5, fontWeight: on ? '700' : '400' }}>{t(l)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Label>{main}</Label>
        <Input
          placeholder={morning ? t('My intention for today…') : t('My reflection on today…')}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top' }}
          value={morning ? intention : reflection}
          onChangeText={touch(morning ? setIntention : setReflection)}
        />

        <Label>{t("One thing I'm grateful for")}</Label>
        <Input placeholder={t('Glory to God for…')} value={gratitude} onChangeText={touch(setGratitude)} />

        <Label>{t('Who I will pray for')}</Label>
        <Input placeholder={t('Names of the living or departed…')} value={prayFor} onChangeText={touch(setPrayFor)} />

        <Label>{t('Today I…')}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DEEDS.map((d) => {
            const on = deeds.includes(d);
            return (
              <Pressable key={d} onPress={() => touch(setDeeds)(on ? deeds.filter((x) => x !== d) : [...deeds, d])} style={{ backgroundColor: on ? colors.gold : 'transparent', borderColor: 'rgba(227,185,92,0.35)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: on ? colors.bg : colors.text }}>{t(d)}</Text>
              </Pressable>
            );
          })}
        </View>

        {err ? <Text style={{ color: '#e07070' }}>{err}</Text> : null}
        <Button label={saved ? t('Saved') : t('Save check-in')} onPress={save} />
      </Card>
    </>
  );
}
