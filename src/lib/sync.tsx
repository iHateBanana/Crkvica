import { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from './i18n';
import { getStoredSession, offline, syncNow } from './supabase';
import { colors, webTopInset } from './ui';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Shows a thin bar while offline or while changes made offline are still waiting to sync.
export function SyncBanner() {
  const { t } = useT();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [online, setOnline] = useState(isWeb ? navigator.onLine : true);

  useEffect(() => {
    const refresh = () => {
      offline.pending().then(setPending);
      getStoredSession().then((s) => (s ? offline.failedFor(s.user.id) : 0)).then(setFailed);
    };
    refresh();
    const unsub = offline.subscribe(refresh);
    syncNow().catch(() => undefined);

    const trigger = () => { syncNow().catch(() => undefined); refresh(); };
    const onOnline = () => { setOnline(true); trigger(); };
    const onOffline = () => setOnline(false);
    if (isWeb) {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    }
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') trigger(); });
    const timer = setInterval(() => { offline.pending().then((n) => { if (n > 0) trigger(); }); }, 20000);
    return () => {
      unsub();
      app.remove();
      clearInterval(timer);
      if (isWeb) {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
    };
  }, []);

  if (online && pending === 0 && failed === 0) return null;
  const text = failed > 0
    ? t('{n} change(s) could not be saved and were discarded. Tap to dismiss.').replace('{n}', String(failed))
    : pending > 0
    ? (online ? t('Syncing {n} saved change(s)...') : t('Offline. {n} change(s) will sync when you are back online.')).replace('{n}', String(pending))
    : t('You are offline. Saved days and your data are still available.');
  return (
    <SafeAreaView edges={Platform.OS === 'web' ? [] : ['top']} style={{ backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, paddingTop: webTopInset }}>
      <Pressable disabled={failed === 0} onPress={() => { offline.dismissFailed(); }}>
        <Text style={{ color: failed > 0 ? colors.text : colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 12 }}>{text}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
