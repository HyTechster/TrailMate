import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/tokens';

interface Props {
  /** Fade it in with scroll. Defaults to always visible. */
  opacity?: Animated.AnimatedInterpolation<number> | number;
}

/**
 * Android draws edge to edge, so scrolled content slides under the status
 * bar icons. This strip keeps the clock and battery readable.
 */
export function StatusBarScrim({ opacity = 1 }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return <Animated.View pointerEvents="none" style={[styles.scrim, { height: insets.top, backgroundColor: c.bg, opacity }]} />;
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
});
