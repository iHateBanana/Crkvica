import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { OrthoDay, OrthoReading } from './orthocal';
import { celebratesName, daysUntilSlava, slavaById, slavaLabel, slavaOn } from './slava';
import { toLatin, useT } from './i18n';
import { Body, Card, colors, Cross, Label, serif, Spinner } from './ui';

function Story({ title, text, last, hideTitle }: { title: string; text: string; last?: boolean; hideTitle?: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ paddingVertical: 12, gap: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: 'rgba(227,185,92,0.18)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: hideTitle ? 'flex-end' : 'flex-start' }}>
        {hideTitle ? null : <Cross size={16} color={colors.gold} />}
        {hideTitle ? null : <Text style={{ flex: 1, color: colors.text, fontFamily: serif, fontSize: 16.5, lineHeight: 22 }}>{title}</Text>}
        <Pressable
          onPress={() => setOpen(!open)}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10, paddingRight: 6, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(227,185,92,0.55)', backgroundColor: open ? 'rgba(227,185,92,0.16)' : 'transparent' }}
        >
          <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 12 }}>{open ? t('Show less') : t('Read the story')}</Text>
          <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gold} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: 'rgba(227,185,92,0.4)', paddingLeft: 12 }}>
          <Text style={{ color: colors.text, opacity: 0.9, fontFamily: serif, fontSize: 16, lineHeight: 26 }}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// `mainName` is the feast already shown as the page headline, so its story row doesn't repeat the title.
export function SaintStories({ stories, mainName }: { stories: OrthoDay['stories']; mainName?: string }) {
  const main = mainName ? plain(mainName) : '';
  const same = (title: string) => {
    const x = plain(title);
    return !!main && !!x && (x === main || x.includes(main) || main.includes(x));
  };
  return (
    <View style={{ marginTop: 4 }}>
      {stories.map((s, i) => <Story key={s.title} title={s.title} text={s.text} last={i === stories.length - 1} hideTitle={same(s.title)} />)}
    </View>
  );
}

function Reading({ r }: { r: OrthoReading }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>{t(r.source)}</Text>
          <Text style={{ color: colors.text, fontFamily: serif, fontSize: 18 }}>{r.display}</Text>
        </View>
        <Text style={{ color: colors.gold }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? <Text style={{ color: colors.text, fontFamily: serif, fontSize: 16, lineHeight: 26 }}>{r.text}</Text> : null}
    </View>
  );
}

export function Readings({ day, loading }: { day: OrthoDay | null; loading: boolean }) {
  const { t, lang } = useT();
  const items = day?.readings ?? [];
  return (
    <>
      <Label>{t('Epistle & Gospel')}</Label>
      <Card tone="gold">
        {items.length ? items.map((r, i) => <Reading key={r.source + r.display + i} r={r} />) : loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><Spinner size={26} label={t('Loading…')} /></View>
        ) : (
          <Body muted>{t('Readings are unavailable offline.')}</Body>
        )}
        {items.length && lang !== 'en' ? <Body muted small>{t('Readings are shown in English (KJV).')}</Body> : null}
      </Card>
    </>
  );
}

export function SaintsList({ saints }: { saints: string[] }) {
  const { t } = useT();
  if (!saints.length) return null;
  return (
    <>
      <Label>{t('Saints & commemorations')}</Label>
      <Card>
        {saints.map((s) => (
          <View key={s} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ marginTop: 3 }}><Cross size={18} color={colors.gold} /></View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 15.5, lineHeight: 22 }}>{s}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

export function SlavaCard({ date, mySlava, name }: { date: Date; mySlava?: string | null; name?: string | null }) {
  const { t, lang } = useT();
  const today = slavaOn(date);
  const mine = slavaById(mySlava);
  const left = mine ? daysUntilSlava(mine, date) : null;
  if (!today && !mine) return null;
  const names = today ? (lang === 'sr-Latn' ? today.names.map(toLatin) : today.names) : [];
  const myNameDay = today && name && celebratesName(today, name);
  return (
    <>
      <Label>{t('Slava & name days')}</Label>
      <Card tone="gold">
        {today ? (
          <>
            <Text style={{ color: colors.gold, fontFamily: serif, fontSize: 19 }}>{t('Today is a slava: {name}', { name: slavaLabel(today, lang) })}</Text>
            {names.length ? <Body>{t('Name day (imendan) for: {names}', { names: names.join(', ') })}</Body> : null}
            {myNameDay ? <Body>{t('Happy name day, {name}!', { name: name! })}</Body> : null}
          </>
        ) : null}
        {mine && left !== null ? (
          <Body muted>
            {left === 0 ? t('Your slava is today. Slava mu i milost!') : t('Your slava, {name}, is in {n} days.', { name: slavaLabel(mine, lang), n: left })}
          </Body>
        ) : null}
      </Card>
    </>
  );
}
