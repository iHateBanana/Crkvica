import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../src/lib/auth';
import { LANGS, useT } from '../src/lib/i18n';
import { supabase } from '../src/lib/supabase';
import { Body, Button, Chips, colors, Cross, Input, Ornament, Orb, Screen, Title } from '../src/lib/ui';

export default function Login() {
  const { t } = useT();
  const router = useRouter();
  const { lang, setLang } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('unspecified');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    const { error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: name, gender } } });
    setBusy(false);
    if (error) setMsg({ error: true, text: error.message });
    else if (mode === 'up') setMsg({ error: false, text: t('Account created. If you are not signed in automatically, confirm your email, then sign in.') });
  }

  async function guest() {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setMsg({ error: true, text: t('Guest mode is not available right now.') + ' ' + error.message });
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, marginTop: 40, marginBottom: 16 }}>
        <Orb color={colors.gold} size={96}><Cross size={56} color={colors.gold} /></Orb>
        <Title size={36}>Crkvica</Title>
        <Ornament style={{ width: 220, alignSelf: 'center' }} />
        <Text style={{ color: colors.muted, textAlign: 'center', lineHeight: 22 }}        >{t('Your daily Orthodox companion: feasts, fasts, prayer and reflection.')}</Text>
      </View>
      <Chips center options={LANGS} value={lang} onChange={(v) => setLang(v)} />
      {mode === 'up' && (
        <>
          <Input placeholder={t('Name')} value={name} onChangeText={setName} />
          <Text style={{ color: colors.muted }}>{t('Gender (used only to tailor optional features)')}</Text>
          <Chips
            options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }, { value: 'unspecified', label: t('Prefer not to say') }]}
            value={gender}
            onChange={setGender}
          />
        </>
      )}
      <Input placeholder={t('Email')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Input placeholder={t('Password')} secureTextEntry value={password} onChangeText={setPassword} />
      {msg && <Text style={{ color: msg.error ? '#e07070' : '#7fc08c' }}>{msg.text}</Text>}
      <Button label={busy ? '...' : mode === 'in' ? t('Sign in') : t('Create account')} onPress={submit} />
      <Button variant="ghost" label={mode === 'in' ? t('New here? Create account') : t('Have an account? Sign in')} onPress={() => setMode(mode === 'in' ? 'up' : 'in')} />
      <Button variant="ghost" label={t('Continue as guest')} onPress={guest} />
      <Button variant="ghost" label={t('Privacy Policy')} onPress={() => router.push('/privacy')} />
    </Screen>
  );
}
