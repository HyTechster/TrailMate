import { forwardRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BlazeMark } from '../components/BlazeMark';
import { RouteShape } from '../components/RouteShape';
import { T } from '../components/T';
import { TopoPattern } from '../components/TopoPattern';
import type { Activity } from '../db/queries';
import { formatDistance, formatDuration, formatElevation, formatPace, type Units } from '../geo/format';
import { paceSecPerKm } from '../geo/pace';
import type { TrackPoint } from '../geo/types';
import { palettes, space } from '../theme/tokens';

/** Laid out at 360x450 and captured at 3x: 1080x1350 (4:5). */
export const CARD_W = 360;
export const CARD_H = 450;

interface Props {
  activity: Activity;
  points: readonly TrackPoint[];
  coverUri: string | null;
  units: Units;
}

// The card is an image people post, so it keeps one look in light and dark mode.
const c = palettes.dark;

export const SummaryCard = forwardRef<View, Props>(function SummaryCard({ activity: a, points, coverUri, units }, ref) {
  const dist = formatDistance(a.distance_m, units);
  const gain = formatElevation(a.elevation_gain_m, units);
  const pace = formatPace(paceSecPerKm(a.distance_m, a.moving_time_s), units);
  const date = new Date(a.started_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  const stats =
    a.type === 'hike'
      ? [
          { label: 'Distance', value: dist.value, unit: dist.unit },
          { label: 'Climb', value: gain.value, unit: gain.unit },
          { label: 'Time', value: formatDuration(a.moving_time_s), unit: '' },
        ]
      : [
          { label: 'Distance', value: dist.value, unit: dist.unit },
          { label: 'Pace', value: pace.value, unit: pace.unit },
          { label: 'Time', value: formatDuration(a.moving_time_s), unit: '' },
        ];

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: c.forest }]}>
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <TopoPattern width={CARD_W} height={CARD_H} color={c.contour} seed={a.started_at % 1000} peaks={3} rings={12} />
      )}
      <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.forestDeep} stopOpacity={coverUri ? 0.55 : 0} />
            <Stop offset="0.45" stopColor={c.forestDeep} stopOpacity={coverUri ? 0.15 : 0} />
            <Stop offset="1" stopColor={c.forestDeep} stopOpacity={0.92} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill="url(#scrim)" />
      </Svg>

      <View style={styles.top}>
        <BlazeMark size={16} tone="onForest" />
        <T variant="label" color="onForest" style={styles.date}>
          {date}
        </T>
      </View>

      <View style={styles.route}>
        <RouteShape
          points={points}
          width={CARD_W - space.xl * 2}
          height={190}
          color={c.accent}
          casing={c.onForest}
          strokeWidth={4}
          padding={6}
          endColor={c.onForest}
        />
      </View>

      <View style={styles.bottom}>
        <T variant="title" color="onForest" numberOfLines={2} style={styles.title}>
          {a.title}
        </T>
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <T variant="caption" color="onForestMuted" style={styles.statLabel}>
                {s.label}
              </T>
              <View style={styles.valueRow}>
                <T variant="stat" color="onForest" style={styles.statValue} allowFontScaling={false}>
                  {s.value}
                </T>
                {s.unit ? (
                  <T variant="label" color="accent" allowFontScaling={false}>
                    {s.unit}
                  </T>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Square corners: the exported PNG must have no transparent edges.
  card: { width: CARD_W, height: CARD_H, overflow: 'hidden' },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  date: { opacity: 0.9 },
  route: { alignItems: 'center', marginTop: space.md },
  bottom: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl, gap: space.md },
  title: { fontSize: 26, lineHeight: 30 },
  statsRow: { flexDirection: 'row', gap: space.lg },
  stat: { gap: 2 },
  statLabel: { textTransform: 'uppercase', letterSpacing: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: { fontSize: 24 },
});
