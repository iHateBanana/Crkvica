import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../src/lib/auth';
import { SaintsList, SlavaCard } from '../../src/lib/DayParts';
import { useT } from '../../src/lib/i18n';
import { useFastOverrides } from '../../src/lib/FastEditor';
import { useOrthoDay } from '../../src/lib/orthocal';
import { describeDay, iso, makeDate } from '../../src/lib/orthodox';
import { Body, Card, colors, fastColor, Ornament, redLetter, Screen, serif, Title } from '../../src/lib/ui';

const navBtn = () => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }) as const;

export default function CalendarScreen() {
  const { profile } = useAuth();
  const { apply: applyFast } = useFastOverrides();
  const { t, locale } = useT();
  const style = profile?.calendar_style ?? 'new';
  const now = new Date();
  const [cursor, setCursor] = useState(makeDate(now.getFullYear(), now.getMonth() + 1, 1));
  const [selected, setSelected] = useState(now);
  const { day: ortho } = useOrthoDay(selected, style);

  const first = cursor.getDay();
  const daysInMonth = makeDate(cursor.getFullYear(), cursor.getMonth() + 2, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => makeDate(cursor.getFullYear(), cursor.getMonth() + 1, i + 1)),
  ];
  const info = describeDay(selected, style);
  const selFast = applyFast(selected, info.fast);
  const shift = (n: number) => setCursor(makeDate(cursor.getFullYear(), cursor.getMonth() + 1 + n, 1));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => shift(-1)} style={navBtn()}><MaterialCommunityIcons name="chevron-left" size={28} color={colors.gold} /></Pressable>
        <Title>{cursor.toLocaleString(locale, { month: 'long', year: 'numeric' })}</Title>
        <Pressable onPress={() => shift(1)} style={navBtn()}><MaterialCommunityIcons name="chevron-right" size={28} color={colors.gold} /></Pressable>
      </View>
      <Ornament />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 7 }, (_, i) => makeDate(2023, 1, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' })).map((d, i) => (
          <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: colors.muted }}>{d}</Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: '14.28%', height: 52 }} />;
          const { feasts, fast: baseFast } = describeDay(d, style);
          const fast = applyFast(d, baseFast);
          const sel = iso(d) === iso(selected);
          return (
            <Pressable key={i} onPress={() => setSelected(d)} style={{ width: '14.28%', height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? colors.gold : 'transparent', borderWidth: iso(d) === iso(now) ? 1 : 0, borderColor: colors.gold }}>
                <Text style={{ color: sel ? colors.bg : feasts.some((f) => f.red) ? redLetter : d.getDay() === 0 ? '#e8b4a0' : colors.text, fontWeight: feasts.length ? '700' : '400' }}>{d.getDate()}</Text>
              </View>
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 1, backgroundColor: fast.level === 'none' ? 'transparent' : fastColor[fast.level] }} />
            </Pressable>
          );
        })}
      </View>
      </Card>
      <Card tone={info.feasts.some((f) => f.red) ? 'red' : undefined}>
        <Text style={{ color: colors.gold, fontFamily: serif, fontSize: 18 }}>{selected.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}{style === 'old' ? ` · ${t('Julian')} ${info.liturgicalDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}` : ''}</Text>
        {info.feasts.map((f) => (
          <View key={f.name}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{f.red ? <MaterialCommunityIcons name="star-four-points" size={12} color={redLetter} /> : null}<Text style={{ color: f.red ? redLetter : colors.text, fontSize: 16 }}>{t(f.name)}</Text></View>
            {f.about ? <Body muted>{t(f.about)}</Body> : null}
          </View>
        ))}
        <Body muted>{t(selFast.label)} - {t(selFast.detail)}</Body>
      </Card>
      {profile?.show_slava ? <SlavaCard date={selected} mySlava={null} /> : null}
      <SaintsList saints={ortho?.saints ?? []} />
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        <Text style={{ color: redLetter }}>{t('Red')}</Text> = {t('red-letter feast or Sunday')} · {t('dots')}: <Text style={{ color: fastColor.strict }}>{t('strict')}</Text> / <Text style={{ color: fastColor.fish }}>{t('fish')}</Text> / <Text style={{ color: fastColor['wine-oil'] }}>{t('wine & oil')}</Text>
      </Text>
    </Screen>
  );
}
