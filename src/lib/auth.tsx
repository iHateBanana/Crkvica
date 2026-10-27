import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { Lang } from './i18n';
import { Profile, supabase } from './supabase';

interface Ctx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<Ctx>({
  session: null, profile: null, loading: true, lang: 'en', setLang: async () => {}, updateProfile: async () => {},
});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem('lang').then((l) => { if (l === 'en' || l === 'sr' || l === 'sr-Latn') setLangState(l); });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setProfile(null); setLoading(false); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    supabase.auth.getUser().then(({ error }) => {
      // The account no longer exists server-side (e.g. deleted): drop the stale local session.
      if (error && (error.status === 401 || error.status === 403 || error.status === 404 || /not exist|does not exist|invalid/i.test(error.message))) supabase.auth.signOut();
    });
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(({ data, error }) => {
      const p = data as Profile | null;
      // Only treat a missing row as a deleted account; a network error should not sign the user out.
      if (!p && !error) { supabase.auth.signOut(); return; }
      if (p) {
        setProfile(p);
        if (p.language) { setLangState(p.language); AsyncStorage.setItem('lang', p.language); }
      }
      setLoading(false);
    });
  }, [userId]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!userId) return;
    setProfile((p) => (p ? { ...p, ...patch } : p));
    await supabase.from('profiles').update(patch).eq('id', userId);
  }, [userId]);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('lang', l);
    if (userId) {
      const patch: Partial<Profile> = { language: l };
      if (l !== 'en') patch.show_slava = true;
      await updateProfile(patch);
    }
  }, [userId, updateProfile]);

  return <AuthContext.Provider value={{ session, profile, loading, lang, setLang, updateProfile }}>{children}</AuthContext.Provider>;
}
