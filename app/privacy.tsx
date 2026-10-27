import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useT } from '../src/lib/i18n';
import { Body, Button, Card, Label, PageHeader, Screen } from '../src/lib/ui';

const SECTIONS: [string, string][] = [
  ['What we store', 'Your account (email, name, gender if you choose), your language and calendar choices, prayer rule and streaks, journal entries, daily check-ins (feelings, energy, gratitude, intentions, names you pray for), fasting preferences, and, if you use the Family tab, your cycle entries and symptoms. Guests are stored under an anonymous account.'],
  ['How it is used', 'Only to run the app for you: to show your own data back to you and to tailor optional features. We do not sell your data, show ads, or share it with third parties for marketing.'],
  ['Who can see it', 'Only you. Every record is protected so an account can read and write only its own rows. Our hosting and database provider (Supabase) processes the data on our behalf.'],
  ['Saints and readings', 'Daily readings and saint lives are fetched from Orthocal (orthocal.info). Your personal data is not sent to it.'],
  ['On your device', 'Your language choice, session and any custom feelings or symptoms you add are kept in the app or browser storage on your device.'],
  ['Deleting your data', 'Profile, then "Delete my account" permanently erases your account and everything above. This cannot be undone.'],
  ['Not medical or spiritual advice', 'The cycle tracker shows estimates only. Fasting guidance is general; follow your parish and spiritual father.'],
  ['Contact', 'Questions or requests: jelenabatanjski@yahoo.com.'],
];

export default function Privacy() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useT();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        {session && <Button variant="ghost" label={t('Return to Profile')} onPress={() => router.replace('/(tabs)/profile')} />}
        <PageHeader title={t('Privacy Policy')} subtitle="Theosis" />
        <Body muted small>{t('Last updated: October 2026')}</Body>
        {SECTIONS.map(([h, b]) => (
          <Card key={h} compactTop>
            <Label raised>{t(h)}</Label>
            <Body>{t(b)}</Body>
          </Card>
        ))}
      </Screen>
    </>
  );
}
