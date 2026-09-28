import { haversine } from './distance';
import type { TrackPoint } from './types';

export const LIVE_PACE_WINDOW_M = 200;

/** Seconds per km, or null when there isn't enough distance to say. */
export function paceSecPerKm(distanceM: number, timeS: number): number | null {
  if (distanceM < 10 || timeS <= 0) return null;
  return timeS / (distanceM / 1000);
}

/** km/h, or null. */
export function speedKmh(distanceM: number, timeS: number): number | null {
  if (timeS <= 0) return null;
  return distanceM / 1000 / (timeS / 3600);
}

/**
 * Pace over roughly the last `windowM` metres of the current segment.
 * Expects filtered points in time order.
 */
export function livePace(points: readonly TrackPoint[], windowM = LIVE_PACE_WINDOW_M): number | null {
  const n = points.length;
  if (n < 2) return null;
  const last = points[n - 1];
  let dist = 0;
  let i = n - 1;
  while (i > 0 && points[i - 1].segment === last.segment && dist < windowM) {
    dist += haversine(points[i - 1], points[i]);
    i--;
  }
  const dt = (last.ts - points[i].ts) / 1000;
  // Need a meaningful stretch before showing anything.
  if (dist < windowM / 4) return null;
  return paceSecPerKm(dist, dt);
}

export interface Split {
  km: number;
  /** Seconds taken for this km (or partial km for the last one). */
  timeS: number;
  /** Distance covered in this split in metres (1000 except maybe the last). */
  distanceM: number;
}

/**
 * Per-km splits using point timestamps. Time spent in pauses is excluded
 * because segment gaps add no time.
 */
export function kmSplits(points: readonly TrackPoint[]): Split[] {
  const splits: Split[] = [];
  let dist = 0;
  let time = 0;
  let splitStartDist = 0;
  let splitStartTime = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.segment !== b.segment) continue;
    const d = haversine(a, b);
    const t = (b.ts - a.ts) / 1000;
    const nextKm = (splits.length + 1) * 1000;
    if (dist + d >= nextKm && d > 0) {
      const frac = (nextKm - dist) / d;
      const crossTime = time + t * frac;
      splits.push({ km: splits.length + 1, timeS: crossTime - splitStartTime, distanceM: 1000 });
      splitStartDist = nextKm;
      splitStartTime = crossTime;
    }
    dist += d;
    time += t;
  }

  const rest = dist - splitStartDist;
  if (rest >= 50) {
    splits.push({ km: splits.length + 1, timeS: time - splitStartTime, distanceM: rest });
  }
  return splits;
}
