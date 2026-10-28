import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckIn, CheckinRow } from '../../src/lib/CheckIn';
import { quoteFor, readingFor, todosFor } from '../../src/lib/content';
import { useAuth } from '../../src/lib/auth';
import { Readings, SaintStories, SaintsList, SlavaCard } from '../../src/lib/DayParts';
import { useT } from '../../src/lib/i18n';
import { FastEditor, useFastOverrides } from '../../src/lib/FastEditor';
import { useDayInfo } from '../../src/lib/orthocal';
import { fromIso, getDayInfo, iso, remainingCommemorations, upcomingRedLetter } from '../../src/lib/orthodox';
import { streakFrom } from '../../src/lib/streak';
import { supabase } from '../../src/lib/supabase';
import { Body, Card, Check, colors, Cross, fastColor, Hero, Label, Meander, Ornament, Orb, Pill, redLetter, Screen, serif, Title } from '../../src/lib/ui';

type Checkin = CheckinRow;

export default function Today() {
  const { profile, session } = useAuth();
  const { t, locale } = useT();
  const uid = session!.user.id;
  const style = profile?.calendar_style ?? 'new';
  const today = new Date();
  const key = iso(today);
  const { feasts, fast: baseFast, liturgicalDate, ortho, loading: orthoLoading } = useDayInfo(today, style);
  const { apply: applyFast, set: setFast } = useFastOverrides();
  const fast = applyFast(today, baseFast);
  const red = feasts.find((f) => f.red) ?? (ortho && ortho.feastLevel >= 7 ? { name: ortho.saints[0] ?? '', rank: 'great' as const, red: true, about: undefined, story: undefined } : undefined);
  const others = feasts.filter((f) => f !== red);
  const headline = red ?? others[0];
  const [showStory, setShowStory] = useState(false);
  const todos = todosFor(today, feasts, fast, t);
  const quote = quoteFor(today);
  const upcoming = upcomingRedLetter(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12), style, 4);
  const stories = ortho?.stories ?? [];
  const mainName = red?.name ?? others[0]?.name ?? ortho?.saints[0];

  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState<[number, number]>([0, 0]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [history, setHistory] = useState<Checkin[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [{ data: rules }, { data: logs }, { data: cks }, raw] = await Promise.all([
        supabase.from('prayer_rules').select('id'),
        supabase.from('prayer_logs').select('rule_id, day'),
        supabase.from('checkins').select('*').order('day', { ascending: false }).limit(90),
        AsyncStorage.getItem('todos-' + key),
      ]);
      const ids = (rules ?? []).map((r) => r.id as string);
      setStreak(streakFrom(ids, (logs ?? []) as { rule_id: string; day: string }[]));
      setDone([(logs ?? []).filter((l) => l.day === key).length, ids.length]);
      setTicked(raw ? JSON.parse(raw) : []);
      setHistory((cks ?? []) as Checkin[]);
    })();
  }, [key]));

  const tick = (id: string) => {
    const next = ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id];
    setTicked(next);
    AsyncStorage.setItem('todos-' + key, JSON.stringify(next));
  };

  const insight = (() => {
    const top = (xs: string[]) => {
      const c: Record<string, number> = {};
      xs.forEach((x) => (c[x] = (c[x] ?? 0) + 1));
      const m = Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0];
      return m ? t(m).toLowerCase() : '';
    };
    const moods = (h: Checkin) => (h.mood ?? '').split(',').filter(Boolean);
    const withMood = history.filter((h) => h.mood);
    if (withMood.length < 5) return t('Check in on {n} more day(s) to unlock your patterns.', { n: 5 - withMood.length });
    const isFast = (h: Checkin) => getDayInfo(fromIso(h.day), style).fast.level !== 'none';
    const fasting = withMood.filter(isFast).flatMap(moods);
    const normal = withMood.filter((h) => !isFast(h)).flatMap(moods);
    const prayed = withMood.filter((h) => h.deeds.includes('Prayed')).flatMap(moods);
    const parts = [t('You feel {mood} most often.', { mood: top(withMood.flatMap(moods)) })];
    if (fasting.length >= 2) parts.push(t('On fasting days: mostly {mood}.', { mood: top(fasting) }));
    if (normal.length >= 2) parts.push(t('On other days: mostly {mood}.', { mood: top(normal) }));
    if (prayed.length >= 2) parts.push(t('On days you pray: mostly {mood}.', { mood: top(prayed) }));
    return parts.join(' ');
  })();

  const hour = today.getHours();
  const greet = hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening');
  const orbColor = red ? redLetter : fastColor[fast.level];
  const hasStory = stories.length > 0 || !!headline?.story;

  return (
    <Screen>
      <Hero  colorsFrom={red ? colors.heroRed : fast.level === 'none' ? colors.heroFeast : colors.heroFast}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {style === 'old' ? (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {`·  ${t('Julian')} ${liturgicalDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`}
            </Text>
          ) : null}
        </View>
        <Title size={30}>{greet}{profile?.display_name && !profile.display_name.includes('@') ? `, ${profile.display_name}` : ''}</Title>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
          <Orb color={orbColor}>{red ? <MaterialCommunityIcons name="star-four-points" size={30} color={orbColor} /> : <Cross size={34} color={orbColor} />}</Orb>
          <View style={{ flex: 1, gap: 6 }}>
            {red ? <Pill color={redLetter}>{t('RED LETTER DAY')}</Pill> : <Pill color={fastColor[fast.level]}>{t(fast.label)}</Pill>}
            <Text style={{ color: colors.text, fontSize: 19, fontFamily: serif, lineHeight: 25 }}>
              {mainName ? (feasts.length ? t(mainName) : mainName) : t('An ordinary day. Every day is a gift from God.')}
            </Text>
          </View>
        </View>
        {headline?.about ? <Body muted>{t(headline.about)}</Body> : null}
        {stories.length ? <SaintStories stories={stories} mainName={mainName} /> : hasStory ? (
          <>
            {showStory ? <Text style={{ color: colors.text, fontFamily: serif, fontSize: 16.5, lineHeight: 26 }}>{headline?.story}</Text> : null}
            <Pressable onPress={() => setShowStory(!showStory)}>
              <Text style={{ color: colors.gold, fontWeight: '700', letterSpacing: 0.5 }}>{showStory ? t('Show less') + ' ▲' : t('Read the story') + ' ▼'}</Text>
            </Pressable>
          </>
        ) : orthoLoading ? <Body muted small>{t('Loading…')}</Body> : null}
      </Hero>

      <SaintsList saints={remainingCommemorations(ortho?.saints ?? [], mainName ? [mainName] : [])} />

      <Readings day={ortho} loading={orthoLoading} />

      {profile?.show_slava ? <SlavaCard date={today} mySlava={profile.slava} name={profile.display_name} /> : null}

      <Label>{t('Fasting')}</Label>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: fastColor[fast.level] }} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t(fast.label)}</Text>
        </View>
        <Body muted>{t(fast.detail)}</Body>
        <FastEditor date={today} fast={fast} uid={uid} onSet={setFast} />
      </Card>

      <Label>{t("Today's to-do")}</Label>
      <Card>
        {todos.map((x) => <Check key={x.id} done={ticked.includes(x.id)} label={x.text} onPress={() => tick(x.id)} />)}
        <Body muted small>{t('Prayer rule')} {done[0]}/{done[1]}  ·  {t('{n}-day streak', { n: streak })}</Body>
      </Card>

      <Label>{t('Read')}</Label>
      <Card>
        <Text style={{ color: colors.gold, fontFamily: serif, fontSize: 20 }}>{readingFor(today)}</Text>
        <Body muted small>{t("Today's Scripture · one chapter a day through the New Testament")}</Body>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontFamily: serif, fontSize: 18, lineHeight: 27, fontStyle: 'italic' }}>“{t(quote.text)}”</Text>
        <Body muted small>— {t(quote.by)}</Body>
      </Card>

      <CheckIn
        uid={uid} day={key}         name={profile?.display_name?.includes('@') ? null : profile?.display_name} hour={hour} fast={fast} red={red}
        today={history.find((h) => h.day === key)}
        previous={history.find((h) => h.day < key)}
        onSaved={(r) => setHistory([r, ...history.filter((h) => h.day !== key)])}
      />

      <Label>{t('Your patterns')}</Label>
      <Card><Body>{insight}</Body></Card>

      <Label>{t('Coming up · red letter days')}</Label>
      <Card>
        {upcoming.map((u) => (
          <View key={iso(u.date)} style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ color: redLetter, width: 72, fontWeight: '600' }}>{u.date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
            <Text style={{ color: colors.text, flex: 1 }}>{t(u.feast.name)}</Text>
          </View>
        ))}
      </Card>

      <Meander style={{ marginTop: 8 }} />
      <Text style={{ color: colors.muted, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 14 }}>{t('Glory to God for all things.')}</Text>
      <Ornament style={{ marginBottom: 8 }} />
    </Screen>
  );
}
