import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { fertileWindow, HORMONE_META, HORMONES_FOR, infoFor, modelFrom, nextPeriod, PHASE_COLORS, type Hormone } from '../../src/lib/cycle';
import { useT } from '../../src/lib/i18n';
import { addDays, dayDiff, iso } from '../../src/lib/orthodox';
import { CycleStage, supabase } from '../../src/lib/supabase';
import { Body, Button, Card, Chips, colors, ga, Input, Label, PageHeader, Screen, serif } from '../../src/lib/ui';

interface Entry { id: string; kind: 'period_start' | 'period_end' | 'note' | 'log'; day: string; note: string | null; flow: string | null; symptoms: string[]; }

const DW = 44;
const PAST = 7;
const FUTURE = 35;
const CH = 170;
const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const;
const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood swings', 'Tender breasts', 'Acne', 'Nausea', 'Cravings', 'Insomnia', 'Back pain', 'Hot flashes'];
const STAGES: CycleStage[] = ['regular', 'contraception', 'pregnant', 'postpartum', 'perimenopause', 'menopause'];

const STAGE_LABEL: Record<CycleStage, string> = {
  regular: 'Regular cycle',
  contraception: 'Hormonal contraception',
  pregnant: 'Pregnant',
  postpartum: 'Postpartum',
  perimenopause: 'Perimenopause',
  menopause: 'Menopause',
};

const PHASE_TIPS: Record<string, string> = {
  Period: 'Rest is part of the rhythm. Be gentle with yourself and keep your prayer rule simple.',
  Follicular: 'Estrogen is rising: energy and focus usually return. A good time to begin something new.',
  Ovulation: 'Peak energy for many women. Estimated fertile days are around now.',
  Luteal: 'Progesterone is high. You may feel more tired or sensitive; steady routines and rest help.',
  'Trimester 1': 'Early pregnancy: nausea and tiredness are common. Rest and ask for help.',
  'Trimester 2': 'Often the most energetic stretch of pregnancy.',
  'Trimester 3': 'Your body is preparing for birth. Rest, and keep your hospital plans ready.',
  'Hormones steady': 'Hormonal contraception keeps hormone levels steady, so the natural cycle curves are flattened.',
  Postpartum: 'Hormones are resetting. Sleep and support matter more than any schedule.',
  'Low hormones': 'Estrogen and progesterone are low after menopause, while FSH and LH stay higher.',
};

function smooth(pts: { x: number; y: number }[]) {
  if (!pts.length) return '';
  let d = `M${pts[0].x},${CH} L${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    d += ` Q${a.x},${a.y} ${(a.x + b.x) / 2},${(a.y + b.y) / 2}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last.x},${last.y} L${last.x},${CH} Z`;
}

function Pill({ label, on, onPress, onLongPress }: { label: string; on: boolean; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: on ? colors.gold : colors.border, backgroundColor: on ? colors.gold : 'transparent' }}>
      <Text style={{ color: on ? colors.bg : colors.text, fontSize: 13, fontWeight: on ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

function CycleCalendar({ model, stage, entries, today, onAdd, onRemove }: {
  model: ReturnType<typeof modelFrom>; stage: CycleStage; entries: Entry[]; today: Date;
  onAdd: (kind: 'period_start' | 'period_end', day: string) => void; onRemove: (id: string) => void;
}) {
  const { t, locale } = useT();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState<Date>(today);
  const todayIso = iso(today);
  const predicts = stage === 'regular' || stage === 'perimenopause' || stage === 'contraception';
  const ends = entries.filter((e) => e.kind === 'period_end').map((e) => e.day);

  const kindOf = (d: Date): 'logged' | 'predicted' | 'fertile' | null => {
    const k = iso(d);
    const started = model.starts.filter((s) => dayDiff(d, s) >= 0).pop();
    if (started) {
      const endDay = ends.map((e) => e).filter((e) => e >= iso(started) && dayDiff(new Date(e + 'T00:00:00'), started) <= 10).sort()[0];
      const stop = endDay ?? iso(addDays(started, model.periodLength - 1));
      if (k <= stop && k <= todayIso) return 'logged';
    }
    if (!predicts || !model.lastStart || k <= todayIso) return null;
    const inf = infoFor(model, d);
    if (inf.phase === 'Period') return 'predicted';
    if (stage === 'regular' && inf.phase === 'Ovulation') return 'fertile';
    return null;
  };

  const first = cursor.getDay();
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: count }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const nav = { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardHi, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border } as const;
  const pk = kindOf(picked);
  const pInfo = model.lastStart ? infoFor(model, picked) : null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => shift(-1)} style={nav}><MaterialCommunityIcons name="chevron-left" size={26} color={colors.gold} /></Pressable>
        <Text style={{ color: colors.text, fontFamily: serif, fontSize: 19 }}>{cursor.toLocaleString(locale, { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => shift(1)} style={nav}><MaterialCommunityIcons name="chevron-right" size={26} color={colors.gold} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' })).map((d, i) => (
          <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: colors.muted }}>{d}</Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: '14.28%', height: 46 }} />;
          const k = kindOf(d);
          const sel = iso(d) === iso(picked);
          const isToday = iso(d) === todayIso;
          return (
            <Pressable key={i} onPress={() => setPicked(d)} style={{ width: '14.28%', height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                backgroundColor: k === 'logged' ? PHASE_COLORS.Period : k === 'fertile' ? ga(0.28) : 'transparent',
                borderWidth: sel || isToday || k === 'predicted' ? 1.5 : 0,
                borderColor: sel ? '#fff' : k === 'predicted' ? PHASE_COLORS.Period : colors.gold,
                borderStyle: k === 'predicted' && !sel && !isToday ? 'dashed' : 'solid',
              }}>
                <Text style={{ color: k === 'logged' ? '#fff' : colors.text, fontWeight: isToday ? '800' : '400' }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <Text style={{ color: PHASE_COLORS.Period, fontSize: 12 }}>● {t('Logged period')}</Text>
        {predicts && <Text style={{ color: PHASE_COLORS.Period, fontSize: 12 }}>○ {t('Predicted period')}</Text>}
        {stage === 'regular' && <Text style={{ color: PHASE_COLORS.Ovulation, fontSize: 12 }}>● {t('Fertile window')}</Text>}
      </View>
      <Body muted small>
        {picked.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
        {pk === 'logged' ? ` · ${t('Logged period')}` : pk === 'predicted' ? ` · ${t('Predicted period')}` : pk === 'fertile' ? ` · ${t('Fertile window')}` : pInfo && stage !== 'pregnant' ? ` · ${t(pInfo.phase)}` : ''}
      </Body>
      {iso(picked) <= todayIso && (
        <View style={{ gap: 8 }}>
          {(['period_start', 'period_end'] as const).map((kind) => {
            const existing = entries.find((e) => e.kind === kind && e.day === iso(picked));
            const label = kind === 'period_start' ? t('Period started this day') : t('Period ended this day');
            return existing
              ? <Button key={kind} variant="ghost" label={`${t('Remove')}: ${label}`} onPress={() => onRemove(existing.id)} />
              : <Button key={kind} variant="ghost" label={label} onPress={() => onAdd(kind, iso(picked))} />;
          })}
          <Body muted small>{t('Tap any past day to record an earlier period. Predictions improve with more cycles.')}</Body>
        </View>
      )}
    </Card>
  );
}

export default function Women() {
  const { session, profile, updateProfile } = useAuth();
  const { t, locale } = useT();
  const uid = session!.user.id;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [note, setNote] = useState('');
  const [flow, setFlow] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState('');
  const [customList, setCustomList] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem('customSymptoms').then((v) => { if (v) try { setCustomList(JSON.parse(v)); } catch {} });
  }, []);
  const [width, setWidth] = useState(0);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const today = new Date();
  const todayIso = iso(today);

  const load = useCallback(async () => {
    const { data } = await supabase.from('cycle_entries').select('*').order('day', { ascending: false });
    const rows = (data ?? []) as Entry[];
    setEntries(rows);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stage: CycleStage = profile?.cycle_stage ?? 'regular';
  const model = modelFrom(stage, entries, { cycle_length: profile?.cycle_length ?? null, period_length: profile?.period_length ?? null });

  const days = Array.from({ length: PAST + FUTURE }, (_, i) => addDays(today, i - PAST));
  const infos = days.map((d) => infoFor(model, d));
  const hormones: Hormone[] = HORMONES_FOR[stage];
  const needsStart = (stage === 'regular' || stage === 'perimenopause' || stage === 'pregnant') && !model.lastStart;
  const now = infos[PAST];

  useEffect(() => {
    if (width) scroller.current?.scrollTo({ x: Math.max(0, PAST * DW + DW / 2 - width / 2), animated: false });
  }, [width, stage, needsStart]);

  // Hard guard in addition to the hidden tab.
  if (profile?.gender === 'male') return null;

  const add = async (kind: Entry['kind'], n?: string, day: string = todayIso) => {
    await supabase.from('cycle_entries').insert({ user_id: uid, kind, day, note: n ?? null });
    load();
  };
  const remove = async (id: string) => { await supabase.from('cycle_entries').delete().eq('id', id); load(); };

  async function saveLog() {
    if (!flow && !symptoms.length) return;
    await supabase.from('cycle_entries').insert({ user_id: uid, kind: 'log', day: todayIso, flow, symptoms });
    setFlow(null); setSymptoms([]); setCustom('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    load();
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!SYMPTOMS.includes(v) && !customList.includes(v)) saveCustom([...customList, v]);
    if (!symptoms.includes(v)) setSymptoms([...symptoms, v]);
    setCustom('');
  }
  function saveCustom(list: string[]) {
    setCustomList(list);
    AsyncStorage.setItem('customSymptoms', JSON.stringify(list));
  }

  const stepper = (label: string, value: number | null, auto: number, min: number, max: number, key: 'cycle_length' | 'period_length') => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Body>{label}</Body>
        {value === null
          ? <Body muted small>{t('Automatic from your logs')}</Body>
          : <Pressable onPress={() => updateProfile({ [key]: null })} hitSlop={8}><Text style={{ color: colors.gold, fontSize: 13 }}>{t('Reset to default')}</Text></Pressable>}
      </View>
      <Pressable onPress={() => updateProfile({ [key]: Math.max(min, (value ?? auto) - 1) })} hitSlop={8}><MaterialCommunityIcons name="minus-circle-outline" size={28} color={colors.gold} /></Pressable>
      <Text style={{ color: colors.text, fontSize: 18, fontFamily: serif, minWidth: 28, textAlign: 'center' }}>{value ?? auto}</Text>
      <Pressable onPress={() => updateProfile({ [key]: Math.min(max, (value ?? auto) + 1) })} hitSlop={8}><MaterialCommunityIcons name="plus-circle-outline" size={28} color={colors.gold} /></Pressable>
    </View>
  );

  // Group consecutive days with the same phase into pill segments.
  const segments: { phase: string; n: number }[] = [];
  infos.forEach((inf) => {
    const last = segments[segments.length - 1];
    if (last && last.phase === inf.phase) last.n += 1;
    else segments.push({ phase: inf.phase, n: 1 });
  });

  const W = days.length * DW;
  const lineX = PAST * DW + DW / 2;
  const next = nextPeriod(model, today);
  const fertile = fertileWindow(model, today);
  const fmt = (d: Date) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const heading = needsStart
    ? t('Log your first period start to see your cycle.')
    : stage === 'pregnant' && now.pregnancyDay !== null
      ? t('Week {w} of pregnancy', { w: Math.floor(now.pregnancyDay / 7) + 1 })
      : now.cycleDay !== null && (stage === 'regular' || stage === 'perimenopause')
        ? t('Cycle day {d} of {n}', { d: now.cycleDay, n: model.length })
        : t(now.phase);

  return (
    <Screen>
      <PageHeader icon="flower-tulip-outline" title={t('Family & Cycle')} subtitle={t('A quiet place for body and family.')} />

      <Card tone="red">
        <Label>{t(now.phase)}</Label>
        <Text style={{ color: colors.text, fontFamily: serif, fontSize: 24 }}>{heading}</Text>
        <Body>{t(PHASE_TIPS[now.phase] ?? '')}</Body>
        {next && <Body muted>{t('Next period expected around {date}', { date: next.toLocaleDateString(locale, { dateStyle: 'long' }) })}{dayDiff(next, today) > 0 ? ` (${t('in {n} days', { n: dayDiff(next, today) })})` : ''}</Body>}
        {fertile && <Body muted>{t('Estimated fertile window: {a} to {b}', { a: fmt(fertile[0]), b: fmt(fertile[1]) })}</Body>}
        <Body muted small>{t('Private to you. Estimates only - not medical advice.')}</Body>
      </Card>

      {!needsStart && (
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {hormones.map((h) => (
              <Text key={h} style={{ color: HORMONE_META[h].color, fontWeight: '800', fontSize: 12, letterSpacing: 0.6 }}>{t(HORMONE_META[h].label).toUpperCase()}</Text>
            ))}
          </View>
          <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
            <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: W }}>
                <View style={{ flexDirection: 'row' }}>
                  {days.map((d, i) => {
                    const on = i === PAST;
                    return (
                      <View key={i} style={{ width: DW, alignItems: 'center', paddingVertical: 6 }}>
                        <Text style={{ color: on ? colors.gold : colors.muted, fontSize: 10, letterSpacing: 0.6 }}>{d.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()}</Text>
                        <Text style={{ color: on ? colors.gold : colors.muted, fontSize: 15, fontWeight: on ? '800' : '400' }}>{d.getDate()}</Text>
                      </View>
                    );
                  })}
                </View>
                <Svg width={W} height={CH}>
                  {days.map((_, i) => <Line key={i} x1={i * DW + DW / 2} x2={i * DW + DW / 2} y1={0} y2={CH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)}
                  {hormones.map((h) => {
                    const pts = infos.map((inf, i) => ({ x: i * DW + DW / 2, y: CH - 6 - (inf.levels[h] ?? 0) * (CH - 24) }));
                    return <Path key={h} d={smooth(pts)} fill={HORMONE_META[h].color} fillOpacity={0.4} stroke={HORMONE_META[h].color} strokeWidth={1.5} />;
                  })}
                  <Line x1={lineX} x2={lineX} y1={0} y2={CH} stroke="#fff" strokeWidth={2.5} />
                </Svg>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  {segments.map((s, i) => (
                    <View key={i} style={{ width: s.n * DW, paddingHorizontal: 2 }}>
                      <View style={{ backgroundColor: PHASE_COLORS[s.phase] ?? colors.card, borderRadius: 20, paddingVertical: 8, alignItems: 'center' }}>
                        <Text numberOfLines={1} style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{s.n >= 2 ? t(s.phase).toUpperCase() : ''}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
          <Body muted small>{t('Illustrative curves based on typical patterns, not lab measurements.')}</Body>
        </Card>
      )}

      <Label>{t('Calendar')}</Label>
      <CycleCalendar model={model} stage={stage} entries={entries} today={today} onAdd={(k, d) => add(k, undefined, d)} onRemove={remove} />

      <Label>{t('Life stage')}</Label>
      <Card>
        <Chips options={STAGES.map((s) => ({ value: s, label: t(STAGE_LABEL[s]) }))} value={stage} onChange={(v) => updateProfile({ cycle_stage: v })} />
        {stage === 'pregnant' && <Body muted small>{t('Log the first day of your last period; it is used to date the pregnancy.')}</Body>}
        {stage === 'perimenopause' && <Body muted small>{t('Cycles often become irregular, so predictions are less certain.')}</Body>}
      </Card>

      {(stage === 'regular' || stage === 'perimenopause' || stage === 'contraception') && (
        <Card>
          {stepper(t('Cycle length (days)'), profile?.cycle_length ?? null, model.length, 20, 45, 'cycle_length')}
          {stepper(t('Period length (days)'), profile?.period_length ?? null, model.periodLength, 2, 10, 'period_length')}
        </Card>
      )}

      <Button label={t('Period started today')} onPress={() => add('period_start')} />
      <Button variant="ghost" label={t('Period ended today')} onPress={() => add('period_end')} />

      <Label>{t('How do you feel today?')}</Label>
      <Card>
        <Body muted small>{t('Flow')}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FLOWS.map((f) => (
            <Pill key={f} on={flow === f} label={t(f)} onPress={() => setFlow(flow === f ? null : f)} />
          ))}
        </View>
        <Body muted small>{t('Symptoms')}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[...SYMPTOMS, ...customList].map((s) => (
            <Pill key={s} on={symptoms.includes(s)} label={SYMPTOMS.includes(s) ? t(s) : s}
              onLongPress={SYMPTOMS.includes(s) ? undefined : () => { saveCustom(customList.filter((x) => x !== s)); setSymptoms(symptoms.filter((x) => x !== s)); }}
              onPress={() => setSymptoms(symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s])} />
          ))}
        </View>
        {customList.length > 0 && <Body muted small>{t('Press and hold one of your own symptoms to remove it.')}</Body>}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Input placeholder={t('Add your own symptom')} value={custom} onChangeText={setCustom} onSubmitEditing={addCustom} /></View>
          <Pressable onPress={addCustom} hitSlop={8}><MaterialCommunityIcons name="plus-circle-outline" size={32} color={colors.gold} /></Pressable>
        </View>
        <Button label={saved ? t('Saved') : t("Save today's log")} onPress={saveLog} />
      </Card>

      <Input placeholder={t('Add a note (family, health, pregnancy, etc.)')} value={note} onChangeText={setNote} multiline />
      <Button variant="ghost" label={t('Save note')} onPress={() => { if (note.trim()) { add('note', note.trim()); setNote(''); } }} />

      {entries.map((e) => (
        <Card key={e.id}>
          <Text style={{ color: colors.gold, fontWeight: '700' }}>{e.day} · {t(e.kind.replace('_', ' '))}</Text>
          {e.flow ? <Body>{t('Flow')}: {t(e.flow)}</Body> : null}
          {e.symptoms?.length ? <Body>{e.symptoms.map((s) => t(s)).join(', ')}</Body> : null}
          {e.note ? <Body>{e.note}</Body> : null}
          <Pressable onPress={() => remove(e.id)}><Text style={{ color: colors.muted }}>{t('Delete')}</Text></Pressable>
        </Card>
      ))}
    </Screen>
  );
}
