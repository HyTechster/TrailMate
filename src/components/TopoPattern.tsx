import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  width: number;
  height: number;
  color: string;
  seed?: number;
  opacity?: number;
  /** Number of summits the contour rings circle around. */
  peaks?: number;
  rings?: number;
}

/** Small deterministic PRNG so the same seed always draws the same hills. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function contourPaths(width: number, height: number, seed = 7, peaks = 3, rings = 9): string[] {
  const rnd = mulberry32(seed);
  const paths: string[] = [];
  const base = Math.max(width, height);
  for (let p = 0; p < peaks; p++) {
    const cx = width * (0.1 + rnd() * 0.8);
    const cy = height * (0.1 + rnd() * 0.8);
    const k1 = 2 + Math.floor(rnd() * 2);
    const k2 = 3 + Math.floor(rnd() * 3);
    const ph1 = rnd() * Math.PI * 2;
    const ph2 = rnd() * Math.PI * 2;
    const stretch = 0.7 + rnd() * 0.6;
    const step = (base / rings) * (0.45 + rnd() * 0.25);
    for (let r = 1; r <= rings; r++) {
      const radiusR = r * step;
      const pts: string[] = [];
      const n = 64;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2;
        const wobble = 1 + 0.16 * Math.sin(k1 * t + ph1 + r * 0.35) + 0.07 * Math.sin(k2 * t + ph2 - r * 0.2);
        const x = cx + Math.cos(t) * radiusR * wobble * stretch;
        const y = cy + Math.sin(t) * radiusR * wobble;
        pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      paths.push(pts.join(' ') + 'Z');
    }
  }
  return paths;
}

/** Faint topographic contour lines. Decorative only. */
export const TopoPattern = memo(function TopoPattern({ width, height, color, seed = 7, opacity = 1, peaks = 3, rings = 9 }: Props) {
  const paths = useMemo(() => contourPaths(width, height, seed, peaks, rings), [width, height, seed, peaks, rings]);
  if (width <= 0 || height <= 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} opacity={opacity}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={color} strokeWidth={i % 3 === 2 ? 1.6 : 1} fill="none" />
        ))}
      </Svg>
    </View>
  );
});
