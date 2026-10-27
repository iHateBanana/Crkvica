import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { applyTheme, ThemeName } from './ui';

interface Ctx { theme: ThemeName; setTheme: (t: ThemeName) => void; ready: boolean }

const ThemeContext = createContext<Ctx>({ theme: 'crimson', setTheme: () => {}, ready: false });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('crimson');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then((v) => {
      if (v === 'blue') { applyTheme('blue'); setThemeState('blue'); }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const setTheme = (t: ThemeName) => {
    applyTheme(t);
    setThemeState(t);
    AsyncStorage.setItem('theme', t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme, ready }}>{children}</ThemeContext.Provider>;
}
