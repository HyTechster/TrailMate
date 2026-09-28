import type { TrackPoint } from '../src/geo/types';

/** Metres per degree of latitude with the haversine earth radius. */
export const M_PER_DEG_LAT = (2 * Math.PI * 6_371_008.8) / 360;

export function pt(partial: Partial<TrackPoint> & { lat: number; lng: number; ts: number }): TrackPoint {
  return { altitude: null, accuracy: 5, speed: null, segment: 0, ...partial };
}

/**
 * A straight walk due north along the equator meridian: one point every
 * `stepM` metres and `stepS` seconds.
 */
export function northLine(count: number, stepM: number, stepS: number, segment = 0, startTs = 0): TrackPoint[] {
  return Array.from({ length: count }, (_, i) =>
    pt({ lat: (i * stepM) / M_PER_DEG_LAT, lng: 0, ts: startTs + i * stepS * 1000, segment }),
  );
}
