import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Session } from '@supabase/supabase-js';
import { createOffline } from './offline';

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const authKey = `sb-${new URL(URL_).hostname.split('.')[0]}-auth-token`;

// The session saved on the device, even if its access token has expired (the app is offline and cannot refresh it).
export async function getStoredSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(authKey);
    const s = raw ? JSON.parse(raw) : null;
    return s?.user?.id ? (s as Session) : null;
  } catch {
    return null;
  }
}

export const offline = createOffline({
  storage: AsyncStorage,
  baseFetch: (...args) => fetch(...args),
  storedUser: async () => (await getStoredSession())?.user.id ?? null,
});

export const supabase = createClient(
  URL_,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    global: { fetch: offline.fetch },
  },
);

// Replays writes that were queued while offline.
export async function syncNow() {
  const { data } = await supabase.auth.getSession();
  await offline.flush(data.session?.access_token ?? null);
}

export interface Profile {
  id: string;
  display_name: string | null;
  gender: 'male' | 'female' | 'unspecified';
  calendar_style: 'new' | 'old';
  cycle_tracking_enabled: boolean;
  language: 'en' | 'sr' | 'sr-Latn';
  show_slava: boolean;
  slava: string | null;
  cycle_stage: CycleStage;
  cycle_length: number | null;
  period_length: number | null;
}

export type CycleStage = 'regular' | 'contraception' | 'pregnant' | 'postpartum' | 'perimenopause' | 'menopause';
