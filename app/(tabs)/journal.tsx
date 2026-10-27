import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useT } from '../../src/lib/i18n';
import { iso } from '../../src/lib/orthodox';
import { supabase } from '../../src/lib/supabase';
import { Body, Button, Card, colors, Input, PageHeader, Screen } from '../../src/lib/ui';

interface Entry { id: string; day: string; title: string | null; body: string; }

export default function Journal() {
  const { session } = useAuth();
  const { t } = useT();
  const uid = session!.user.id;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('journal_entries').select('*').order('day', { ascending: false }).order('created_at', { ascending: false });
    setEntries((data ?? []) as Entry[]);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (!body.trim()) return;
    await supabase.from('journal_entries').insert({ user_id: uid, day: iso(new Date()), title: title.trim() || null, body: body.trim() });
    setTitle(''); setBody('');
    load();
  }

  async function remove(id: string) {
    await supabase.from('journal_entries').delete().eq('id', id);
    load();
  }

  return (
    <Screen>
      <PageHeader icon="book-open-page-variant" title={t('Journal')} subtitle={t('Glory to God for all things.')} />
      <Input placeholder={t('Title (optional)')} value={title} onChangeText={setTitle} />
      <Input placeholder={t('Reflections, thanksgiving, repentance, confession notes…')} multiline style={{ minHeight: 100, textAlignVertical: 'top' }} value={body} onChangeText={setBody} />
      <Button label={t('Save entry')} onPress={save} />
      {entries.map((e) => (
        <Card key={e.id}>
          <Text style={{ color: colors.gold, fontWeight: '700' }}>{e.day}{e.title ? ` · ${e.title}` : ''}</Text>
          <Body>{e.body}</Body>
          <Pressable onPress={() => remove(e.id)}><Text style={{ color: colors.muted }}>{t('Delete')}</Text></Pressable>
        </Card>
      ))}
    </Screen>
  );
}
