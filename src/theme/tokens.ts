import { useColorScheme, type TextStyle } from 'react-native';

/**
 * TrailMate design tokens. Forest greens and bone for calm, one trail-blaze
 * orange for the record button and live numbers. Components never hard-code
 * colours; they read from here.
 */

const light = {
  bg: '#EDF1E8',
  surface: '#FAFCF7',
  surfaceAlt: '#E0E8DA',
  ink: '#0F2419',
  inkMuted: '#4A6153',
  inkFaint: '#7C9184',
  line: '#C9D5C3',

  forest: '#1D4A33',
  forestDeep: '#12301F',
  moss: '#5E7F34',
  onForest: '#F0F5EA',
  onForestMuted: '#A9C3B0',
  contour: '#2C6247',

  accent: '#FF5A1F',
  accentSoft: '#FFE3D6',
  onAccent: '#1A0C04',

  route: '#FF5A1F',
  routeCasing: '#FAFCF7',
  chartFill: '#5E7F34',
  danger: '#C23B22',
  warningBg: '#FFF1C7',
  warningInk: '#5A4300',
  mapBlank: '#DCE6D5',
  scrim: 'rgba(8, 20, 13, 0.55)',
  shadow: '#1D4A33',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#0B1611',
  surface: '#12211A',
  surfaceAlt: '#1A2F24',
  ink: '#E8F0E3',
  inkMuted: '#9DB3A4',
  inkFaint: '#6D8577',
  line: '#27402F',

  forest: '#173D2A',
  forestDeep: '#0E2519',
  moss: '#9CC46A',
  onForest: '#EAF3E3',
  onForestMuted: '#8FB29B',
  contour: '#23563C',

  accent: '#FF6B33',
  accentSoft: '#3A1F12',
  onAccent: '#1A0C04',

  route: '#FF6B33',
  routeCasing: '#0B1611',
  chartFill: '#9CC46A',
  danger: '#FF7A5C',
  warningBg: '#3A3113',
  warningInk: '#FFE08A',
  mapBlank: '#15271D',
  scrim: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export const palettes = { light, dark };

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

/** Cards 24, tiles 16, small chips 10, buttons full pill. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'BricolageGrotesque_400Regular',
  bodyMedium: 'BricolageGrotesque_500Medium',
  bodySemi: 'BricolageGrotesque_600SemiBold',
  num: 'SpaceGrotesk_700Bold',
  numMedium: 'SpaceGrotesk_500Medium',
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const type = {
  hero: { fontFamily: font.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: font.bodySemi, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: font.bodySemi, fontSize: 13, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 15 },
  /** Live stats on the record screen. Big and tabular for sunlight. */
  liveHero: { fontFamily: font.num, fontSize: 76, lineHeight: 80, letterSpacing: -2, fontVariant: tabular },
  live: { fontFamily: font.num, fontSize: 40, lineHeight: 44, letterSpacing: -1, fontVariant: tabular },
  stat: { fontFamily: font.num, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, fontVariant: tabular },
  statSmall: { fontFamily: font.numMedium, fontSize: 15, lineHeight: 18, fontVariant: tabular },
} satisfies Record<string, TextStyle>;

/** Minimum touch target on the record screen (gloves, sweaty hands). */
export const touch = { min: 48, record: 88 } as const;

export interface Theme {
  scheme: 'light' | 'dark';
  c: Palette;
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, c: palettes[scheme] };
}
