import { totalDistance } from './distance';
import { trackGainLoss } from './elevation';
import { filterPoints } from './filter';
import type { ActivityType, TrackPoint } from './types';

export interface TrackStats {
  distanceM: number;
  gainM: number;
  lossM: number;
  /** Filtered points the stats were computed from. */
  kept: TrackPoint[];
}

/** Everything the summary needs, computed from raw points. */
export function computeTrackStats(points: readonly TrackPoint[], type: ActivityType): TrackStats {
  const kept = filterPoints(points, type);
  const { gain, loss } = trackGainLoss(kept);
  return { distanceM: totalDistance(kept), gainM: gain, lossM: loss, kept };
}

/**
 * Moving time in seconds from wall-clock segment bookkeeping: time banked from
 * finished segments plus the running one.
 */
export function movingTimeS(bankedS: number, segmentStartedAt: number | null, now: number): number {
  if (segmentStartedAt === null) return bankedS;
  return bankedS + Math.max(0, (now - segmentStartedAt) / 1000);
}
