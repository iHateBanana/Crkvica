import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { SyncBanner } from '../src/lib/sync';
import { ThemeProvider, useTheme } from '../src/lib/theme';
import { colors } from '../src/lib/ui';

function Routes() {
  const { session, loading } = useAuth();
  const { theme, ready } = useTheme();
  if (loading || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.gold} /></View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
  return (
    <ThemeProvider>
      <AuthProvider>
        <Head><title>Crkvica · Orthodox daily companion</title></Head>
        <StatusBar style="light" />
        <Routes />
      </AuthProvider>
    </ThemeProvider>
  );
}
