import type { Icon } from 'phosphor-react-native';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { radius, touch, useTheme, type Palette } from '../theme/tokens';

interface Props {
  icon: Icon;
  label: string;
  onPress: () => void;
  size?: number;
  bg?: keyof Palette;
  fg?: keyof Palette;
  style?: StyleProp<ViewStyle>;
}

/** Round icon-only button. Always at least 48dp. */
export function IconButton({ icon: IconCmp, label, onPress, size = touch.min, bg = 'surface', fg = 'ink', style }: Props) {
  const { c } = useTheme();
  const s = Math.max(size, touch.min);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: s,
          height: s,
          borderRadius: radius.pill,
          backgroundColor: c[bg],
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      <IconCmp size={Math.round(s * 0.44)} weight="bold" color={c[fg]} />
    </Pressable>
  );
}
