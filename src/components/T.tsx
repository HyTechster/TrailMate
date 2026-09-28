import { Text, type TextProps } from 'react-native';
import { type Palette, type as typeScale, useTheme } from '../theme/tokens';

export type TextVariant = keyof typeof typeScale;

type Props = TextProps & {
  variant?: TextVariant;
  color?: keyof Palette;
};

const NUMERIC: TextVariant[] = ['liveHero', 'live', 'stat', 'statSmall'];

/** Themed text. Respects the system font scale, capped on big live numbers. */
export function T({ variant = 'body', color = 'ink', style, ...rest }: Props) {
  const { c } = useTheme();
  const numeric = NUMERIC.includes(variant);
  return (
    <Text
      maxFontSizeMultiplier={numeric ? 1.25 : 1.6}
      {...rest}
      style={[typeScale[variant], { color: c[color] }, style]}
    />
  );
}
