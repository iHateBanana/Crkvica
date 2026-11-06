import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { useT } from '../src/lib/i18n';
import { pruneStorage } from '../src/lib/prune';
import { SyncBanner } from '../src/lib/sync';
import { ThemeProvider, useTheme } from '../src/lib/theme';
import { colors, Loading } from '../src/lib/ui';

function Routes() {
  const { session, loading } = useAuth();
  const { theme, ready } = useTheme();
  const { t } = useT();
  if (loading || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Loading size={64} /></View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Head><title>{`Crkvica · ${t('Orthodox daily companion')}`}</title></Head>
      {session && <SyncBanner />}
      <Stack key={theme} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Screen name="privacy" />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => { pruneStorage(AsyncStorage).catch(() => undefined); }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Routes />
      </AuthProvider>
    </ThemeProvider>
  );
}
