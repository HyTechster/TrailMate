import type { LatLng, TrackPoint } from './types';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two coordinates. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance travelled along the route at each point, in metres.
 * Gaps between segments (pauses) add nothing.
 */
export function cumulativeDistances(points: readonly TrackPoint[]): number[] {
  const out: number[] = new Array(points.length);
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    if (prev && prev.segment === cur.segment) total += haversine(prev, cur);
    out[i] = total;
  }
  return out;
}

/** Total distance in metres, never joining across segments. */
export function totalDistance(points: readonly TrackPoint[]): number {
  const cum = cumulativeDistances(points);
  return cum.length ? cum[cum.length - 1] : 0;
}

/** Split points into one array per segment, keeping order. */
export function splitSegments(points: readonly TrackPoint[]): TrackPoint[][] {
  const segments: TrackPoint[][] = [];
  let current: TrackPoint[] | null = null;
  let currentId: number | null = null;
  for (const p of points) {
    if (current === null || p.segment !== currentId) {
      current = [];
      currentId = p.segment;
      segments.push(current);
    }
    current.push(p);
  }
  return segments;
}

/** Distance along the route to the point closest in time to `ts`. */
export function distanceAtTime(points: readonly TrackPoint[], ts: number): number {
  if (points.length === 0) return 0;
  const cum = cumulativeDistances(points);
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < points.length; i++) {
    const gap = Math.abs(points[i].ts - ts);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return cum[best];
}
