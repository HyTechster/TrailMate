import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { ProfilePoint } from '../geo/elevation';
import { formatDistance, formatElevation, type Units } from '../geo/format';
import { thin } from '../geo/project';
import { useLayoutSize } from '../hooks';
import { space, useTheme } from '../theme/tokens';
import { T } from './T';

interface Props {
  profile: readonly ProfilePoint[];
  units: Units;
  height?: number;
}

/** Hand-drawn elevation profile: distance on x, smoothed altitude on y. */
export const ElevationChart = memo(function ElevationChart({ profile, units, height = 150 }: Props) {
  const { c } = useTheme();
  const [size, onLayout] = useLayoutSize();
  const width = size.width;
  const chartH = height;
  const padTop = 10;

  const data = useMemo(() => {
    const pts = thin(profile, 160);
    if (pts.length < 2 || width === 0) return null;
    const maxD = pts[pts.length - 1].d || 1;
    let min = Infinity;
    let max = -Infinity;
    for (const p of pts) {
      min = Math.min(min, p.alt);
      max = Math.max(max, p.alt);
    }
    // Keep a sensible vertical range so a flat run doesn't look like Everest.
    const range = Math.max(max - min, 30);
    const lo = min - range * 0.08;
    const hi = lo + range * 1.16;
    const x = (d: number) => (d / maxD) * width;
    const y = (a: number) => padTop + (1 - (a - lo) / (hi - lo)) * (chartH - padTop);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)} ${y(p.alt).toFixed(1)}`).join(' ');
    const area = `${line} L${width} ${chartH} L0 ${chartH} Z`;
    const peak = pts.reduce((a, b) => (b.alt > a.alt ? b : a));
    return { line, area, min, max, maxD, peakX: x(peak.d), peakY: y(peak.alt) };
  }, [profile, width, chartH]);

  const hi = data ? formatElevation(data.max, units) : null;
  const lo = data ? formatElevation(data.min, units) : null;
  const total = data ? formatDistance(data.maxD, units) : null;

  return (
    <View accessible accessibilityLabel={hi && lo ? `Elevation from ${lo.value} to ${hi.value} ${hi.unit}` : 'Elevation chart'}>
      <View style={{ height: chartH }} onLayout={onLayout}>
        {data ? (
          <Svg width={width} height={chartH}>
            <Defs>
              <LinearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.chartFill} stopOpacity={0.45} />
                <Stop offset="1" stopColor={c.chartFill} stopOpacity={0.04} />
              </LinearGradient>
            </Defs>
            <Line x1={0} x2={width} y1={chartH - 0.5} y2={chartH - 0.5} stroke={c.line} strokeWidth={1} />
            <Path d={data.area} fill="url(#elevFill)" />
            <Path d={data.line} stroke={c.chartFill} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
            <Line x1={data.peakX} x2={data.peakX} y1={data.peakY} y2={chartH} stroke={c.accent} strokeWidth={1.5} strokeDasharray="3 4" />
          </Svg>
        ) : (
          <View style={[styles.empty, { borderColor: c.line }]}>
            <T variant="caption" color="inkMuted">
              Not enough altitude data for a chart.
            </T>
          </View>
        )}
      </View>
      {data && hi && lo && total ? (
        <View style={styles.axis}>
          <T variant="caption" color="inkMuted">
            Low {lo.value} {lo.unit}
          </T>
          <T variant="caption" color="accent">
            Peak {hi.value} {hi.unit}
          </T>
          <T variant="caption" color="inkMuted">
            {total.value} {total.unit}
          </T>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12 },
});
