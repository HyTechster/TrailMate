import type { Icon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { haptic } from '../haptics';
import { useTheme } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  icon: Icon;
  label: string;
  onComplete: () => void;
  size?: number;
  holdMs?: number;
}

/**
 * Long-press to confirm (stop). Stops accidental taps in a pocket.
 * A light tick while holding, success haptic when the ring closes.
 */
export function HoldButton({ icon: IconCmp, label, onComplete, size = 72, holdMs = 1200 }: Props) {
  const { c } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef(false);

  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const clearTicker = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };

  useEffect(() => clearTicker, []);

  const onPressIn = () => {
    done.current = false;
    haptic.light();
    clearTicker();
    ticker.current = setInterval(() => haptic.light(), 240);
    Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      clearTicker();
      if (finished && !done.current) {
        done.current = true;
        haptic.success();
        onComplete();
        progress.setValue(0);
      }
    });
  };

  const onPressOut = () => {
    clearTicker();
    if (done.current) return;
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold to finish"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={() => undefined}
      delayLongPress={holdMs + 500}
      style={{ width: size, height: size }}
    >
      <View style={[styles.face, { width: size, height: size, borderRadius: size, backgroundColor: c.surfaceAlt }]}>
        <IconCmp size={size * 0.38} weight="fill" color={c.ink} />
      </View>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center' },
});
