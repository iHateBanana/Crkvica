import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Switch, View } from 'react-native';
import { useAuth } from '../../src/lib/auth';
import { slavaName } from '../../src/lib/DayParts';
import { LANGS, useT } from '../../src/lib/i18n';
import { FastRulesEditor } from '../../src/lib/FastEditor';
import { SLAVAS } from '../../src/lib/slava';
import { useTheme } from '../../src/lib/theme';
import { supabase } from '../../src/lib/supabase';
import { Body, Button, Card, Chips, Input, Label, PageHeader, Screen } from '../../src/lib/ui';

function CreateProfile() {
  const { t } = useT();
  const { updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('unspecified');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error: boolean; text: string } | null>(null);

  async function create() {
    if (!email.trim() || password.length < 6) { setMsg({ error: true, text: t('Enter an email and a password of at least 6 characters.') }); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim(), password, data: { display_name: name, gender } });
    if (!error) await updateProfile({ display_name: name || null, gender });
    setBusy(false);
    setMsg(error
      ? { error: true, text: error.message }
      : { error: false, text: t('Profile created. Everything you saved as a guest is kept.') });
  }

  return (
    <>
      <Label>{t('Create your profile')}</Label>
      <Card tone="red">
        <Body>{t('You are using Crkvica as a guest. Create a profile to keep your prayer rule, journal and check-ins safe and use them on any device.')}</Body>
        <Input placeholder={t('Name')} value={name} onChangeText={setName} />
        <Chips
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }, { value: 'unspecified', label: t('Prefer not to say') }]}
          value={gender}
          onChange={setGender}
        />
        <Input placeholder={t('Email')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder={t('Password')} secureTextEntry value={password} onChangeText={setPassword} />
        {msg && <Body muted>{msg.text}</Body>}
        <Button label={busy ? '...' : t('Create profile')} onPress={create} />
      </Card>
    </>
  );
}

function DeleteAccount() {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  async function go() {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) { setErr(error.message); return; }
    await supabase.auth.signOut();
  }
  if (step === 0) return <Button variant="ghost" label={t('Delete my account')} onPress={() => setStep(1)} />;
  return (
    <Card tone="red">
      <Body>{t('This permanently deletes your account and all your saved data. It cannot be undone.')}</Body>
      {err ? <Body muted>{err}</Body> : null}
      <Button label={t('Yes, delete everything')} onPress={go} />
      <Button variant="ghost" label={t('Cancel')} onPress={() => setStep(0)} />
    </Card>
  );
}

export default function Profile() {
  const router = useRouter();
  const { profile, session, updateProfile, lang, setLang } = useAuth();
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  const [nm, setNm] = useState(profile?.display_name?.includes('@') ? '' : profile?.display_name ?? '');
  const [nmSaved, setNmSaved] = useState(false);
  if (!profile) return null;
  return (
    <Screen>
      <PageHeader title={t('Profile')} subtitle={session?.user.is_anonymous ? t('Guest') : session?.user.email ?? undefined} />
      {session?.user.is_anonymous && <CreateProfile />}

      <Card>
        <Body>{t('Your name')}</Body>
        <Input placeholder={t('What should we call you?')} value={nm} onChangeText={(v) => { setNm(v); setNmSaved(false); }} />
        <Button label={nmSaved ? t('Saved') : t('Save')} onPress={async () => { await updateProfile({ display_name: nm.trim() || null }); setNmSaved(true); }} />
      </Card>

      <Card>
        <Body>{t('Language')}</Body>
        <Chips options={LANGS} value={lang} onChange={(v) => setLang(v)} />
      </Card>

      <Card>
        <Body>{t('Appearance')}</Body>
        <Chips
          options={[{ value: 'crimson', label: t('Crimson & gold') }, { value: 'blue', label: t('Blue & silver') }]}
          value={theme}
          onChange={(v) => setTheme(v)}
        />
      </Card>

      <Card>
        <Body>{t('Calendar')}</Body>
        <Chips
          options={[{ value: 'new', label: t('New (Revised Julian)') }, { value: 'old', label: t('Old (Julian)') }]}
          value={profile.calendar_style}
          onChange={(v) => updateProfile({ calendar_style: v })}
        />
        <Body muted small>{t('Serbian, Russian and other Old Calendar churches use the Old (Julian) calendar.')}</Body>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Body>{t('Slava & name days')}</Body>
            <Body muted small>{t('Show the slava and name days of the day.')}</Body>
          </View>
          <Switch value={profile.show_slava} onValueChange={(v) => updateProfile({ show_slava: v })} />
        </View>
        {profile.show_slava ? (
          <>
            <Label>{t('My family slava')}</Label>
            <Chips
              options={[{ value: '', label: t('None') }, ...SLAVAS.map((s) => ({ value: s.id, label: slavaName(s, lang) }))]}
              value={profile.slava ?? ''}
              onChange={(v) => updateProfile({ slava: v || null })}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <Label>{t('Fasting rules')}</Label>
        <FastRulesEditor uid={session!.user.id} />
      </Card>

      <Card>
        <Body>{t('Gender')}</Body>
        <Chips
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }, { value: 'unspecified', label: t('Prefer not to say') }]}
          value={profile.gender}
          onChange={(v) => updateProfile(v === 'male' ? { gender: v, cycle_tracking_enabled: false } : { gender: v })}
        />
      </Card>
      {profile.gender !== 'male' && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Body>{t('Enable period & family tracker')}</Body>
            <Switch value={profile.cycle_tracking_enabled} onValueChange={(v) => updateProfile({ cycle_tracking_enabled: v })} />
          </View>
        </Card>
      )}
      <Button variant="ghost" label={t('Sign out')} onPress={() => supabase.auth.signOut()} />
      <DeleteAccount />
      <Button variant="ghost" label={t('Privacy Policy')} onPress={() => router.push('/privacy')} />
      {session?.user.is_anonymous && <Body muted small>{t('Signing out as a guest will lose your saved data. Create a profile first.')}</Body>}
    </Screen>
  );
}
