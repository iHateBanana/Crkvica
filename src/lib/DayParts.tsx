import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { OrthoDay, OrthoReading } from './orthocal';
import { localSaintStory } from './orthodox';
import { fetchSaintSummary } from './wiki';
import { celebratesName, daysUntilSlava, slavaById, slavaLabel, slavaOn } from './slava';
import { toLatin, useT } from './i18n';
import { Body, Card, colors, Cross, ga, Label, serif, Spinner } from './ui';

function Story({ title, lookup, text, last, hero }: { title?: string; lookup?: string; text?: string; last?: boolean; hero?: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string | null | undefined>(text);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    const name = lookup ?? title;
    if (next && body === undefined && name) {
      setBusy(true);
      setBody(await fetchSaintSummary(name));
      setBusy(false);
    }
  };
  return (
    <View style={{ paddingVertical: hero ? 0 : 10, gap: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: ga(0.18) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {title ? <Cross size={16} color={colors.gold} /> : null}
        {title ? <Text style={{ flex: 1, color: colors.text, fontSize: 15.5, lineHeight: 22 }}>{title}</Text> : <View style={{ flex: 1 }} />}
        <Pressable
          onPress={toggle}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 136, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: open ? colors.gold : ga(0.18) }}
        >
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={15} color={open ? colors.bg : colors.gold} />
          <Text style={{ color: open ? colors.bg : colors.gold, fontWeight: '700', fontSize: 12, letterSpacing: 0.3 }}>{open ? t('Show less') : t('Read the story')}</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: ga(0.4), paddingLeft: 12, gap: 6 }}>
          {busy ? <Spinner size={28} /> : (
            <>
              <Text style={{ color: colors.text, opacity: 0.9, fontFamily: serif, fontSize: 16, lineHeight: 26 }}>
                {body ?? t('No written life of this saint is available yet.')}
              </Text>
              {body && text === undefined ? <Text style={{ color: colors.muted, fontSize: 12 }}>{t('Summary from Wikipedia')}</Text> : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameName = (a: string, b: string) => {
  const x = plain(a);
  const y = plain(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

// The story for the day's headline saint: Orthocal's if it has one, otherwise our own (else looked up on demand).
export function mainSaintStory(stories: OrthoDay['stories'], mainName?: string): string | undefined {
  if (!mainName) return undefined;
  return stories.find((s) => sameName(s.title, mainName))?.text ?? localSaintStory(mainName);
}

// The headline saint's story button, right-aligned under the name in the hero.
export function MainStory({ stories, mainName }: { stories: OrthoDay['stories']; mainName?: string }) {
  if (!mainName) return null;
  const text = mainSaintStory(stories, mainName);
  return (
    <View style={{ alignItems: 'flex-end', marginTop: -26 }}>
      <View style={{ alignSelf: 'stretch' }}>
        <Story key={mainName} lookup={mainName} text={text} last hero />
      </View>
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

export function SaintsList({ saints, stories = [], mainName }: { saints: string[]; stories?: OrthoDay['stories']; mainName?: string }) {
  const { t } = useT();
  // Every other saint of the day, each with its story button where we have one.
  const rest = stories.filter((s) => !mainName || !sameName(s.title, mainName));
  const used = new Set<string>();
  const rows: { title: string; text?: string }[] = saints.map((s) => {
    const m = rest.find((x) => sameName(x.title, s));
    if (m) used.add(m.title);
    return { title: s, text: m?.text ?? localSaintStory(s) };
  });
  rest.filter((x) => !used.has(x.title)).forEach((x) => rows.push({ title: x.title, text: x.text }));
  if (!rows.length) return null;
  return (
    <>
      <Label>{t('Saints & commemorations')}</Label>
      <Card>
        {rows.map((r, i) => (
          <Story key={r.title} title={r.title} text={r.text} last={i === rows.length - 1} />
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
