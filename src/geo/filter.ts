import { haversine } from './distance';
import type { ActivityType, TrackPoint } from './types';

export const MAX_ACCURACY_M = 25;

/** Fastest believable speed in m/s. Anything quicker is a GPS jump. */
export const MAX_SPEED_MS: Record<ActivityType, number> = {
  hike: 3,
  run: 8,
};

/**
 * If this many points in a row get rejected as jumps, the last kept point was
 * probably the bad one. Re-anchor on the new position instead of dropping the
 * rest of the activity.
 */
export const REANCHOR_AFTER = 5;

export function isAccurate(p: TrackPoint): boolean {
  return p.accuracy === null || p.accuracy <= MAX_ACCURACY_M;
}

/**
 * Drops inaccurate fixes and jumps that imply an impossible speed.
 * Points are compared with the last kept point in the same segment.
 */
export function filterPoints(points: readonly TrackPoint[], type: ActivityType): TrackPoint[] {
  const maxSpeed = MAX_SPEED_MS[type];
  const kept: TrackPoint[] = [];
  let rejectedRun = 0;

  for (const p of points) {
    if (!isAccurate(p)) continue;

    const last = kept[kept.length - 1];
    if (!last || last.segment !== p.segment) {
      kept.push(p);
      rejectedRun = 0;
      continue;
    }

    const dt = (p.ts - last.ts) / 1000;
    if (dt <= 0) continue;

    const speed = haversine(last, p) / dt;
    if (speed > maxSpeed) {
      rejectedRun++;
      if (rejectedRun >= REANCHOR_AFTER) {
        kept.push(p);
        rejectedRun = 0;
      }
      continue;
    }

    kept.push(p);
    rejectedRun = 0;
  }

  return kept;
}
