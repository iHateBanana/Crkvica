import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/auth';
import { useT } from '../../src/lib/i18n';
import { iso } from '../../src/lib/orthodox';
import { streakFrom } from '../../src/lib/streak';
import { supabase } from '../../src/lib/supabase';
import { Body, Button, Card, colors, Input, PageHeader, Screen } from '../../src/lib/ui';

interface Rule { id: string; title: string; }
interface Log { rule_id: string; day: string; }

export default function Prayer() {
  const { session } = useAuth();
  const { t } = useT();
  const uid = session!.user.id;
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [title, setTitle] = useState('');
  const today = iso(new Date());

  const load = useCallback(async () => {
    const [r, l] = await Promise.all([
      supabase.from('prayer_rules').select('id, title').order('sort').order('created_at'),
      supabase.from('prayer_logs').select('rule_id, day'),
    ]);
    setRules((r.data ?? []) as Rule[]);
    setLogs((l.data ?? []) as Log[]);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isDone = (id: string) => logs.some((l) => l.rule_id === id && l.day === today);

  async function toggle(id: string) {
    if (isDone(id)) {
      setLogs(logs.filter((l) => !(l.rule_id === id && l.day === today)));
      await supabase.from('prayer_logs').delete().eq('rule_id', id).eq('day', today);
    } else {
      setLogs([...logs, { rule_id: id, day: today }]);
      await supabase.from('prayer_logs').insert({ rule_id: id, user_id: uid, day: today });
    }
  }

  async function add() {
    if (!title.trim()) return;
    await supabase.from('prayer_rules').insert({ user_id: uid, title: title.trim(), sort: rules.length });
    setTitle('');
    load();
  }

  async function remove(id: string) {
    await supabase.from('prayer_rules').delete().eq('id', id);
    load();
  }

  const streak = streakFrom(rules.map((r) => r.id), logs);

  return (
    <Screen>
      <PageHeader icon="candle" title={t('Prayer Rule')} subtitle={t('Pray without ceasing.')} />
      <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="fire" size={22} color={colors.gold} /><Body>{t('{n}-day streak', { n: streak })}</Body></View></Card>
      {rules.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => toggle(r.id)} style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <MaterialCommunityIcons name={isDone(r.id) ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={26} color={colors.gold} />
              <Text style={{ color: colors.text, fontSize: 16, textDecorationLine: isDone(r.id) ? 'line-through' : 'none' }}>{r.title}</Text>
            </Pressable>
            <Pressable onPress={() => remove(r.id)} hitSlop={8}><MaterialCommunityIcons name="close" size={20} color={colors.muted} /></Pressable>
          </View>
        </Card>
      ))}
      {!rules.length && <Body muted>{t('Add prayers such as Morning Prayers, Evening Prayers, Jesus Prayer 100x, Scripture reading.')}</Body>}
      <Input placeholder={t('New prayer or practice')} value={title} onChangeText={setTitle} onSubmitEditing={add} />
      <Button label={t('Add')} onPress={add} />
    </Screen>
  );
}
