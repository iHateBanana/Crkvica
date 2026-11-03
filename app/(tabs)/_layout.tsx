import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../src/lib/i18n';
import { colors, Cross } from '../../src/lib/ui';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const icon = (name: Glyph) => ({ color }: { color: unknown }) => <MaterialCommunityIcons name={name} size={24} color={color as string} />;
const crossIcon = ({ color }: { color: unknown }) => <Cross size={26} color={color as string} />;

export default function TabsLayout() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Platform.OS === 'web' ? ('calc(10px + var(--bottom-gap, 0px) + env(safe-area-inset-bottom, 0px) * 0.5)' as any) : 10 + insets.bottom / 2,
          height: 74,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: colors.border,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        tabBarItemStyle: { justifyContent: 'center', paddingVertical: 0 },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.4, lineHeight: 14, marginTop: 2, marginBottom: 0 },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Today'), tabBarIcon: crossIcon }} />
            <Tabs.Screen name="calendar" options={{ title: t('Calendar'), tabBarIcon: icon('calendar-month') }} />
            <Tabs.Screen name="prayer" options={{ title: t('Prayer'), tabBarIcon: icon('candle') }} />
            <Tabs.Screen name="journal" options={{ title: t('Journal'), tabBarIcon: icon('book-open-page-variant') }} />
            <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
