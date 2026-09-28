import { PersonSimpleHikeIcon, PersonSimpleRunIcon } from 'phosphor-react-native';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { getPoints, type Activity } from '../db/queries';
import { formatDistance, formatDuration, formatElevation, formatPace, type Units } from '../geo/format';
import { paceSecPerKm } from '../geo/pace';
import { thin } from '../geo/project';
import type { TrackPoint } from '../geo/types';
import { radius, space, useTheme } from '../theme/tokens';
import { RouteShape } from './RouteShape';
import { T } from './T';
import { TopoPattern } from './TopoPattern';

const previewCache = new Map<string, TrackPoint[]>();

export function routePreview(id: string): TrackPoint[] {
  let pts = previewCache.get(id);
  if (!pts) {
    pts = thin(getPoints(id), 150);
    previewCache.set(id, pts);
  }
  return pts;
}

export function forgetPreview(id: string) {
  previewCache.delete(id);
}

export function formatWhen(ts: number): string {
  const d = new Date(ts);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

interface Props {
  activity: Activity;
  units: Units;
  onPress: () => void;
}

export const ActivityCard = memo(function ActivityCard({ activity: a, units, onPress }: Props) {
  const { c } = useTheme();
  const points = useMemo(() => routePreview(a.id), [a.id]);
  const dist = formatDistance(a.distance_m, units);
  const gain = formatElevation(a.elevation_gain_m, units);
  const pace = formatPace(paceSecPerKm(a.distance_m, a.moving_time_s), units);
  const TypeIcon = a.type === 'hike' ? PersonSimpleHikeIcon : PersonSimpleRunIcon;
  const thumb = 88;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${a.title ?? a.type}, ${dist.value} ${dist.unit}`}
      style={({ pressed }) => [styles.card, { backgroundColor: c.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={[styles.thumb, { width: thumb, height: thumb, backgroundColor: c.forest }]}>
        <TopoPattern width={thumb} height={thumb} color={c.contour} seed={a.started_at % 97} peaks={2} rings={6} />
        <RouteShape points={points} width={thumb} height={thumb} color={c.accent} casing={c.forest} strokeWidth={2.5} padding={10} endColor={c.onForest} />
        <View style={[styles.typeBadge, { backgroundColor: c.surface }]}>
          <TypeIcon size={14} weight="bold" color={c.forest} />
        </View>
      </View>
      <View style={styles.body}>
        <T variant="bodyStrong" numberOfLines={2} style={styles.title}>
          {a.title ?? (a.type === 'hike' ? 'Hike' : 'Run')}
        </T>
        <T variant="caption" color="inkMuted">
          {formatWhen(a.started_at)}
        </T>
        <View style={styles.stats}>
          <Stat value={dist.value} unit={dist.unit} />
          {a.type === 'hike' ? (
            <Stat value={`+${gain.value}`} unit={gain.unit} />
          ) : (
            <Stat value={pace.value} unit={pace.unit} />
          )}
          <Stat value={formatDuration(a.moving_time_s)} />
        </View>
      </View>
    </Pressable>
  );
});

function Stat({ value, unit }: { value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <T variant="statSmall">{value}</T>
      {unit ? (
        <T variant="caption" color="inkMuted">
          {unit}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  thumb: { borderRadius: radius.md, overflow: 'hidden' },
  typeBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 17 },
  stats: { flexDirection: 'row', gap: space.md, marginTop: 6, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
});
