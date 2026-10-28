import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

// Three-bar Orthodox cross; the footrest's raised end is on the viewer's left.
export function Cross({ size = 24, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill={color}>
        <Rect x={46.5} y={10} width={7} height={82} rx={1.5} />
        <Rect x={37} y={17} width={26} height={5.5} rx={1.5} />
        <Rect x={26} y={33} width={48} height={6.5} rx={1.5} />
        <Polygon points="38.56,69.63 63.29,77.66 61.44,83.37 36.71,75.34" />
        <Circle cx={50} cy={9.5} r={3.4} />
        <Circle cx={26} cy={36.2} r={3.4} />
        <Circle cx={74} cy={36.2} r={3.4} />
      </G>
    </Svg>
  );
}

export type ThemeName = 'crimson' | 'blue';

// `gold` is the accent colour: gold in the crimson theme, silver in the blue one. `rgb` is the same accent for translucent uses.
const THEMES = {
  crimson: {
    bg: '#2b0a10', card: '#3d1219', cardHi: '#511a23', gold: '#e2b552', rgb: '226,181,82', light: '#f3d68a',
    text: '#f8ecd6', muted: '#c4a592', border: 'rgba(226,181,82,0.22)', deep: '#5a1520',
    heroRed: ['#9c1f2e', '#4a0d16'] as [string, string], heroFeast: ['#8a1a26', '#3d1219'] as [string, string], heroFast: ['#6e1520', '#34101a'] as [string, string],
  },
  blue: {
    bg: '#0a1530', card: '#122248', cardHi: '#1b3262', gold: '#c9d4e6', rgb: '201,212,230', light: '#eef3fb',
    text: '#eef3fb', muted: '#9db0cc', border: 'rgba(201,212,230,0.22)', deep: '#1d3a78',
    heroRed: ['#2a4a9c', '#0f1f4f'] as [string, string], heroFeast: ['#1f3d86', '#122248'] as [string, string], heroFast: ['#17306a', '#0d1a3d'] as [string, string],
  },
};

export const colors = { ...THEMES.crimson, red: '#d9534f', green: '#7fb685' };

// Translucent accent colour.
export const ga = (a: number) => `rgba(${colors.rgb},${a})`;

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });
export const fastColor = { none: colors.green, 'wine-oil': colors.gold, fish: '#6fa8dc', strict: '#ff8566' };

export function applyTheme(name: ThemeName) {
  Object.assign(colors, THEMES[name]);
  fastColor['wine-oil'] = colors.gold;
  s = makeStyles();
}
export const redLetter = '#ff4d4d';

// Loading indicator: a cross glowing like a vigil lamp, ringed by eight small lights that kindle in turn.
export function Spinner({ size = 64, label }: { size?: number; label?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const native = Platform.OS !== 'web';
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    const b = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: native }));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [pulse, turn]);
  const ring = size * 1.7;
  const dot = Math.max(4, size / 9);
  return (
    <View style={{ alignItems: 'center', gap: 14 }} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: ring, height: ring, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          {Array.from({ length: 8 }, (_, i) => {
            const ang = (i / 8) * Math.PI * 2;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute', width: dot, height: dot, borderRadius: dot,
                  left: ring / 2 + Math.sin(ang) * (ring / 2 - dot) - dot / 2,
                  top: ring / 2 - Math.cos(ang) * (ring / 2 - dot) - dot / 2,
                  backgroundColor: colors.gold, opacity: 0.25 + 0.75 * (i / 7),
                }}
              />
            );
          })}
        </Animated.View>
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }] }}>
          <Cross size={size} />
        </Animated.View>
      </View>
      {label ? <Text style={{ color: colors.muted, fontSize: 13, letterSpacing: 0.5 }}>{label}</Text> : null}
    </View>
  );
}

// On the web (installed PWA) the notch / Dynamic Island inset comes straight from the browser's CSS env(), which is
// more reliable than the native-style hook. The extra 12px keeps content clear of the island.
export const webTopInset: any = Platform.OS === 'web' ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : 0;

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const inner = (
    <>
      <Meander style={{ width: '100%', marginTop: 12 }} />
      <View style={[s.column, { paddingTop: 6 }]}>{children}</View>
    </>
  );
  return (
    <SafeAreaView style={s.screen} edges={Platform.OS === 'web' ? [] : ['top']}>
      <Lattice />
      {scroll ? (
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 40, paddingTop: webTopInset }} keyboardShouldPersistTaps="handled">{inner}</ScrollView>
      ) : <View style={{ flex: 1, paddingTop: webTopInset }}>{inner}</View>}
    </SafeAreaView>
  );
}

// A faint gold diamond lattice with a tiny cross in each cell, like woven church embroidery.
function Lattice() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="lattice" width={56} height={56} patternUnits="userSpaceOnUse">
            <Path d="M28 4 L52 28 L28 52 L4 28 Z" fill="none" stroke={colors.gold} strokeOpacity={0.15} strokeWidth={1} />
            <Path d="M28 21 V35 M24 25 H32" stroke={colors.gold} strokeOpacity={0.2} strokeWidth={1.2} />
            <Circle cx={0} cy={0} r={1.8} fill={colors.gold} fillOpacity={0.18} />
            <Circle cx={56} cy={0} r={1.8} fill={colors.gold} fillOpacity={0.18} />
            <Circle cx={0} cy={56} r={1.8} fill={colors.gold} fillOpacity={0.18} />
            <Circle cx={56} cy={56} r={1.8} fill={colors.gold} fillOpacity={0.18} />
          </Pattern>
          <RadialGradient id="glow" cx="50%" cy="0%" rx="75%" ry="45%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.3} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#lattice)" />
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </View>
  );
}

// Gold rule with diamonds and a small cross at the centre.
export function Ornament({ size = 14, style }: { size?: number; style?: object }) {
  const line = { flex: 1, height: 1, backgroundColor: ga(0.4) } as const;
  const diamond = { width: 5, height: 5, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }], opacity: 0.8 } as const;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' }, style]}>
      <View style={line} />
      <View style={diamond} />
      <Cross size={size} color={colors.gold} />
      <View style={diamond} />
      <View style={line} />
    </View>
  );
}

// Greek-key (meander) band, a classic border on Byzantine icons and church walls.
export function Meander({ style }: { style?: object }) {
  const [w, setW] = useState(0);
  // Fit a whole number of tiles to the width so the last key isn't cut off.
  const n = Math.max(1, Math.round(w / 20));
  const tile = w ? w / n : 20;
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ height: 18, alignSelf: 'stretch', opacity: 0.75 }, style]}>
      {w ? (
        <Svg width={w} height="18">
          <Defs>
            <Pattern id="meander" width={tile} height={18} patternUnits="userSpaceOnUse">
              <G transform={`scale(${tile / 20} 1)`}>
                <Path d="M0 16 H20 M16 16 V2 H4 V12 H12 V6 H8" fill="none" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="square" />
              </G>
            </Pattern>
          </Defs>
          <Rect width={w} height="18" fill="url(#meander)" />
        </Svg>
      ) : null}
    </View>
  );
}

// Rays of light fanning out from a corner, like the halo behind a saint.
function Rays() {
  const lines = Array.from({ length: 13 }, (_, i) => {
    const a = (Math.PI / 2) * (1 + i / 12);
    return { x2: 260 + 340 * Math.cos(a), y2: 340 * Math.sin(a), strong: i % 3 === 0 };
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 260, height: 260 }}>
      <Svg width={260} height={260}>
        {lines.map((l, i) => (
          <Line key={i} x1={260} y1={0} x2={l.x2} y2={l.y2} stroke={colors.gold} strokeOpacity={l.strong ? 0.28 : 0.14} strokeWidth={l.strong ? 1.4 : 1} />
        ))}
      </Svg>
    </View>
  );
}

// Centered page header: haloed icon, serif title, ornamental rule.
export function PageHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return (
    <View style={{ alignItems: 'center', gap: 6, marginTop: 0, marginBottom: 4 }}>
      <Orb color={colors.gold} size={64}>
        {icon ? <MaterialCommunityIcons name={icon} size={28} color={colors.gold} /> : <Cross size={30} color={colors.gold} />}
      </Orb>
      <Text style={{ color: colors.text, fontSize: 30, fontFamily: serif, fontWeight: '600', letterSpacing: 0.4, textAlign: 'center' }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', fontStyle: 'italic', fontFamily: serif }}>{subtitle}</Text> : null}
      <Ornament style={{ marginTop: 6 }} />
    </View>
  );
}

export const Title = ({ children, size = 28 }: { children: ReactNode; size?: number }) => (
  <Text style={{ color: colors.text, fontSize: size, fontFamily: serif, fontWeight: '600', letterSpacing: 0.2 }}>{children}</Text>
);

export const Body = ({ children, muted, small }: { children: ReactNode; muted?: boolean; small?: boolean }) => (
  <Text style={{ color: muted ? colors.muted : colors.text, fontSize: small ? 13 : 15.5, lineHeight: small ? 18 : 23 }}>{children}</Text>
);

export const Label = ({ children, raised = false }: { children: ReactNode; raised?: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: raised ? 8 : 14, marginBottom: -2, marginLeft: 2 }}>
    <View style={{ width: 6, height: 6, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }] }} />
    <Text style={{ color: colors.gold, fontSize: 12, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: '700' }}>{children}</Text>
    <View style={{ flex: 1, height: 1,     backgroundColor: ga(0.25) }} />
  </View>
);

// Gold bracket corners, like the frame of an icon.
function Corners({ strong }: { strong?: boolean }) {
  const c = { position: 'absolute', width: 14, height: 14, borderColor: colors.gold, opacity: strong ? 0.95 : 0.5 } as const;
  return (
    <>
      <View pointerEvents="none" style={[c, { top: 5, left: 5, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 8 }]} />
      <View pointerEvents="none" style={[c, { top: 5, right: 5, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 8 }]} />
      <View pointerEvents="none" style={[c, { bottom: 5, left: 5, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 8 }]} />
      <View pointerEvents="none" style={[c, { bottom: 5, right: 5, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 8 }]} />
      {[{ top: 9, left: 9 }, { top: 9, right: 9 }, { bottom: 9, left: 9 }, { bottom: 9, right: 9 }].map((p, i) => (
        <View key={i} pointerEvents="none" style={[{ position: 'absolute', width: 4, height: 4, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }], opacity: strong ? 0.95 : 0.55 }, p]} />
      ))}
    </>
  );
}

// A glint of light along the top edge: a line that fades out at both ends, with a small four-point sparkle.
function Glint({ strong }: { strong?: boolean }) {
  return (
    <>
      <LinearGradient pointerEvents="none" colors={['transparent', ga(strong ? 0.9 : 0.5), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1.5 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: -6, left: '24%' }}>
        <Svg width={13} height={13} viewBox="0 0 12 12">
          <Path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill={colors.light} fillOpacity={strong ? 1 : 0.8} />
        </Svg>
      </View>
    </>
  );
}

export const Card = ({ children, tone, compactTop = false }: { children: ReactNode; tone?: 'red' | 'gold'; compactTop?: boolean }) => (
  <View style={[s.card, compactTop && { paddingTop: 8 }, tone === 'red' && { borderColor: colors.gold, borderWidth: 1.5, backgroundColor: colors.deep }, tone === 'gold' && { borderColor: ga(0.6) }]}>
    <Glint strong={!!tone} />
    <Corners strong={!!tone} />
    {children}
  </View>
);

export function Hero({ colorsFrom, children }: { colorsFrom: [string, string]; children: ReactNode }) {
  return (
    <LinearGradient colors={colorsFrom} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="heroweave" width={34} height={34} patternUnits="userSpaceOnUse">
              <Path d="M17 2 L32 17 L17 32 L2 17 Z" fill="none"               stroke={colors.light} strokeOpacity={0.1} strokeWidth={1} />
                            <Circle cx={17} cy={17} r={1.6} fill={colors.light}  fillOpacity={0.14} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroweave)" />
        </Svg>
      </View>
      <Rays />
      <View pointerEvents="none" style={s.heroInner} />
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, borderWidth: 1,       borderColor: ga(0.25) }} />
            <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: ga(0.18) }} />
      <Corners strong />
      {children}
    </LinearGradient>
  );
}

// An icon-style halo: a gold-leaf disc with a double ring.
export function Orb({ color, size = 84, children }: { color: string; size?: number; children?: ReactNode }) {
  return (
    <View style={{ width: size + 14, height: size + 14, borderRadius: (size + 14) / 2, borderWidth: 1.5, borderColor: ga(0.45), borderStyle: 'dotted', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: ga(0.12) }}>
        <View style={{ width: size * 0.82, height: size * 0.82, borderRadius: size, borderWidth: 1, borderColor: color, backgroundColor: color + '33', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
    </View>
  );
}

export const Pill = ({ color, children }: { color: string; children: ReactNode }) => (
  <View style={{ alignSelf: 'flex-start', backgroundColor: color + '26', borderColor: color + '66', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
    <Text style={{ color, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>{children}</Text>
  </View>
);

export function Check({ done, label, onPress }: { done: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 7 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: done ? colors.gold : colors.muted, backgroundColor: done ? colors.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {done && <MaterialCommunityIcons name="check" size={16} color={colors.bg} />}
      </View>
      <Text style={{ flex: 1, color: done ? colors.muted : colors.text, fontSize: 15.5, textDecorationLine: done ? 'line-through' : 'none' }}>{label}</Text>
    </Pressable>
  );
}

export const Input = (p: TextInputProps) => (
  <TextInput placeholderTextColor={colors.muted} {...p} style={[s.input, p.style]} />
);

export function Button({ label, onPress, variant = 'primary' }: { label: string; onPress: () => void; variant?: 'primary' | 'ghost' }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, variant === 'ghost' && s.ghost, pressed && { opacity: 0.8 }]}>
      <Text style={[s.btnText, variant === 'ghost' && { color: colors.gold }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips<T extends string>({ options, value, onChange, center }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; center?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginVertical: 6, justifyContent: center ? 'center' : 'flex-start' }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, on && s.chipOn]}>
            <Text style={{ color: on ? colors.bg : colors.text, fontSize: 14, fontWeight: on ? '700' : '400' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 18, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  hero: { borderRadius: 26, padding: 22, gap: 10, overflow: 'hidden', borderWidth: 2, borderColor: colors.gold },
  heroInner: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 20, borderWidth: 1, borderColor: ga(0.45) },
  input: { backgroundColor: colors.card, color: colors.text, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, fontSize: 16 },
  btn: { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: ga(0.5) },
  btnText: { color: colors.bg, fontWeight: '700', fontSize: 15.5, letterSpacing: 0.3 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: ga(0.35) },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
});
let s = makeStyles();
