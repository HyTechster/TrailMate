import type { Icon } from 'phosphor-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, useTheme, type Palette } from '../theme/tokens';
import { T, type TextVariant } from './T';

interface Props {
  label: string;
  value: string;
  unit?: string;
  icon?: Icon;
  size?: 'hero' | 'live' | 'tile';
  /** Tile gets a card background. Live stats sit on the sheet directly. */
  boxed?: boolean;
  tint?: keyof Palette;
  style?: StyleProp<ViewStyle>;
}

const VALUE_VARIANT: Record<NonNullable<Props['size']>, TextVariant> = {
  hero: 'liveHero',
  live: 'live',
  tile: 'stat',
};

export function StatTile({ label, value, unit, icon: IconCmp, size = 'tile', boxed = size === 'tile', tint = 'surface', style }: Props) {
  const { c } = useTheme();
  return (
    <View
      style={[boxed && [styles.box, { backgroundColor: c[tint] }], style]}
      accessible
      accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}
    >
      <View style={styles.labelRow}>
        {IconCmp ? <IconCmp size={size === 'hero' ? 16 : 14} weight="bold" color={size === 'tile' ? c.moss : c.accent} /> : null}
        <T variant="label" color="inkMuted">
          {label}
        </T>
      </View>
      <View style={styles.valueRow}>
        <T variant={VALUE_VARIANT[size]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </T>
        {unit ? (
          <T variant={size === 'tile' ? 'label' : 'bodyStrong'} color={size === 'tile' ? 'inkMuted' : 'accent'} style={styles.unit}>
            {unit}
          </T>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: space.md, gap: space.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
  unit: { marginBottom: 2 },
});
