import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/tokens';
import { T } from './T';

interface Props {
  size?: number;
  /** Colour of the wordmark text. */
  tone?: 'ink' | 'onForest';
  wordmark?: boolean;
}

/**
 * The TrailMate mark: two painted trail blazes, the kind you follow on tree
 * trunks, offset like a turn marker.
 */
export function BlazeMark({ size = 22, tone = 'ink', wordmark = true }: Props) {
  const { c } = useTheme();
  const w = size * 0.42;
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="TrailMate">
      <View style={{ width: size * 0.8, height: size, justifyContent: 'space-between' }}>
        <View style={{ width: w, height: size * 0.44, borderRadius: size * 0.1, backgroundColor: c.accent }} />
        <View style={{ width: w, height: size * 0.44, borderRadius: size * 0.1, backgroundColor: c.accent, marginLeft: size * 0.36 }} />
      </View>
      {wordmark ? (
        <T variant="title" color={tone} style={{ fontSize: size * 1.15, lineHeight: size * 1.3 }}>
          TrailMate
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
