import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/lib/auth';
import { useT } from '../../src/lib/i18n';
import { colors, Cross } from '../../src/lib/ui';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const icon = (name: Glyph) => ({ color }: { color: unknown }) => <MaterialCommunityIcons name={name} size={24} color={color as string} />;
const crossIcon = ({ color }: { color: unknown }) => <Cross size={26} color={color as string} />;

export default function TabsLayout() {
  const { profile } = useAuth();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const showWomen = !!profile && profile.gender !== 'male' && profile.cycle_tracking_enabled;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: Platform.OS === 'web' ? ('calc(74px + env(safe-area-inset-bottom, 0px))' as any) : 74 + insets.bottom, paddingTop: 8, paddingBottom: Platform.OS === 'web' ? ('calc(10px + env(safe-area-inset-bottom, 0px))' as any) : 10 + insets.bottom },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.4, lineHeight: 14, marginTop: 2 },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Today'), tabBarIcon: crossIcon }} />
            <Tabs.Screen name="calendar" options={{ title: t('Calendar'), tabBarIcon: icon('calendar-month') }} />
            <Tabs.Screen name="prayer" options={{ title: t('Prayer'), tabBarIcon: icon('candle') }} />
            <Tabs.Screen name="journal" options={{ title: t('Journal'), tabBarIcon: icon('book-open-page-variant') }} />
            <Tabs.Screen name="women" options={{ title: t('Family'), tabBarIcon: icon('flower-tulip-outline'), href: showWomen ? undefined : null }} />
            <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
