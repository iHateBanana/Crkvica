import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

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
