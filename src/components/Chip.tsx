import type { Icon } from 'phosphor-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, useTheme, type Palette } from '../theme/tokens';
import { T } from './T';

interface Props {
  label: string;
  icon?: Icon;
  bg?: keyof Palette;
  fg?: keyof Palette;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, icon: IconCmp, bg = 'surface', fg = 'ink', style }: Props) {
  const { c } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: c[bg] }, style]} accessibilityRole="text">
      {IconCmp ? <IconCmp size={14} weight="bold" color={c[fg]} /> : null}
      <T variant="label" color={fg}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
