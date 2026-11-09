import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Icon } from '../../src/lib/Icon';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckIn, CheckinRow } from '../../src/lib/CheckIn';
import { quoteFor, readingFor, todosFor } from '../../src/lib/content';
import { useAuth } from '../../src/lib/auth';
import { MainStory, Readings, SaintFigure, SaintsList, SlavaCard } from '../../src/lib/DayParts';
import { useT } from '../../src/lib/i18n';
import { FastEditor, useFastOverrides } from '../../src/lib/FastEditor';
import { useDayInfo } from '../../src/lib/orthocal';
import { fromIso, getDayInfo, iso, remainingCommemorations, upcomingRedLetter } from '../../src/lib/orthodox';
import { loadPrayerData } from '../../src/lib/prayerData';
import { useSaintImage } from '../../src/lib/saintImage';
import { imageSubject } from '../../src/lib/saintMatch';
import { streakFrom } from '../../src/lib/streak';
import { supabase } from '../../src/lib/supabase';
import { Body, Card, Check, colors, Cross, fastColor, Hero, Label, Ornament, Orb, Pill, redLetter, Screen, serif, Title } from '../../src/lib/ui';

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
  const subject = imageSubject(mainName, ortho?.saints ?? []);
  const saintImage = useSaintImage(subject);

  const [rules, setRules] = useState<{ id: string; title: string }[]>([]);
  const [streakLogs, setStreakLogs] = useState<{ rule_id: string; day: string }[]>([]);
  const requireAll = !!profile?.streak_requires_all;
  const streak = streakFrom(rules.map((r) => r.id), streakLogs, requireAll);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [history, setHistory] = useState<Checkin[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [{ rules: list, logs }, { data: cks }, raw] = await Promise.all([
        loadPrayerData(requireAll),
        supabase.from('checkins').select('*').order('day', { ascending: false }).limit(90),
        AsyncStorage.getItem('todos-' + key),
      ]);
      setRules(list);
      setStreakLogs(logs);
      setDoneIds([...new Set(logs.filter((l) => l.day === key).map((l) => l.rule_id))]);
      setTicked(raw ? JSON.parse(raw) : []);
      setHistory((cks ?? []) as Checkin[]);
    })();
  }, [key, requireAll]));

  const togglePrayer = async (id: string) => {
    const on = doneIds.includes(id);
    setDoneIds(on ? doneIds.filter((x) => x !== id) : [...doneIds, id]);
    setStreakLogs(on ? streakLogs.filter((l) => !(l.rule_id === id && l.day === key)) : [...streakLogs, { rule_id: id, day: key }]);
    if (on) await supabase.from('prayer_logs').delete().eq('rule_id', id).eq('day', key);
    else await supabase.from('prayer_logs').insert({ rule_id: id, user_id: uid, day: key });
  };

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

  return (
    <Screen>
      <Hero  colorsFrom={red ? colors.heroRed : fast.level === 'none' ? colors.heroFeast : colors.heroFast}>
        <View style={{ gap: 3 }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {style === 'old' ? (
            <Text style={{ color: colors.gold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.9 }}>
              {`${t('Julian')} ${liturgicalDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`}
            </Text>
          ) : null}
        </View>
        <Title size={30}>{greet}{profile?.display_name && !profile.display_name.includes('@') ? `, ${profile.display_name}` : ''}</Title>
        <View style={{ alignSelf: 'flex-start' }}>
          {red ? <Pill color={redLetter}>{t('RED LETTER DAY')}</Pill> : <Pill color={fastColor[fast.level]}>{t(fast.label)}</Pill>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <SaintFigure image={saintImage} subject={subject} mainName={mainName} fallback={<Orb color={orbColor}>{red ? <Icon name="star-four-points" size={30} color={orbColor} /> : <Cross size={34} color={orbColor} />}</Orb>} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 19, fontFamily: serif, lineHeight: 25 }}>
            {mainName ? (feasts.length ? t(mainName) : mainName) : t('An ordinary day. Every day is a gift from God.')}
          </Text>
        </View>
        {headline?.about ? <Body muted>{t(headline.about)}</Body> : null}
        {headline?.story ? (
          <>
            {showStory ? <Text style={{ color: colors.text, fontFamily: serif, fontSize: 16.5, lineHeight: 26 }}>{headline?.story}</Text> : null}
            <Pressable onPress={() => setShowStory(!showStory)}>
              <Text style={{ color: colors.gold, fontWeight: '700', letterSpacing: 0.5 }}>{showStory ? t('Show less') + ' ▲' : t('Read the story') + ' ▼'}</Text>
            </Pressable>
          </>
        ) : <MainStory stories={stories} mainName={mainName} tucked={!saintImage} />}
      </Hero>

      <SaintsList saints={remainingCommemorations(ortho?.saints ?? [], mainName ? [mainName] : [])} stories={stories} mainName={mainName} />

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
        {rules.map((r) => <Check key={r.id} done={doneIds.includes(r.id)} label={r.title} onPress={() => togglePrayer(r.id)} />)}
        {todos.map((x) => <Check key={x.id} done={ticked.includes(x.id)} label={x.text} onPress={() => tick(x.id)} />)}
        <Body muted small>{rules.length ? `${t('Prayer rule')} ${doneIds.length}/${rules.length}  ·  ` : `${t('Add your prayers in the Prayer tab.')}  ·  `}{t('{n}-day streak', { n: streak })}</Body>
      </Card>

      <Label>{t('Read')}</Label>
      <Card>
        <Text style={{ color: colors.gold, fontFamily: serif, fontSize: 20 }}>{readingFor(today, t)}</Text>
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

      <Text style={{ color: colors.muted, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 14, marginTop: 8 }}>{t('Glory to God for all things.')}</Text>
      <Ornament style={{ marginBottom: 8 }} />
    </Screen>
  );
}
