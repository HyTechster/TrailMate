import type { Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, touch, useTheme, type Palette } from '../theme/tokens';
import { T } from './T';

type Variant = 'accent' | 'forest' | 'soft' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  icon?: Icon;
  variant?: Variant;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityHint?: string;
}

function colors(v: Variant, c: Palette): { bg: string; fg: keyof Palette; border?: string } {
  switch (v) {
    case 'accent':
      return { bg: c.accent, fg: 'onAccent' };
    case 'forest':
      return { bg: c.forest, fg: 'onForest' };
    case 'soft':
      return { bg: c.surfaceAlt, fg: 'ink' };
    case 'danger':
      return { bg: 'transparent', fg: 'danger', border: c.danger };
    default:
      return { bg: 'transparent', fg: 'ink', border: c.line };
  }
}

export function Button({ label, onPress, icon: IconCmp, variant = 'accent', size = 'md', style, disabled, accessibilityHint }: Props) {
  const { c } = useTheme();
  const col = colors(variant, c);
  const height = size === 'lg' ? 60 : touch.min + 4;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          backgroundColor: col.bg,
          borderColor: col.border ?? 'transparent',
          borderWidth: col.border ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {IconCmp ? <IconCmp size={size === 'lg' ? 24 : 20} weight="bold" color={c[col.fg]} /> : null}
        <T variant="bodyStrong" color={col.fg} style={size === 'lg' ? styles.lgLabel : undefined} numberOfLines={1}>
          {label}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  lgLabel: { fontSize: 18 },
});
