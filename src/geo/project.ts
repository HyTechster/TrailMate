import { splitSegments } from './distance';
import type { LatLng, TrackPoint } from './types';

export interface XY {
  x: number;
  y: number;
}

/** About 130 m of latitude. */
const MIN_SPAN_DEG = 0.0012;

export interface Projection {
  /** One polyline per segment, in view coordinates. */
  segments: XY[][];
  project: (p: LatLng) => XY;
}

/**
 * Fits the route into a width x height box with padding, keeping its real
 * shape (longitude scaled by cos(latitude)). North is up.
 */
export function projectRoute(
  points: readonly TrackPoint[],
  width: number,
  height: number,
  padding = 0,
): Projection {
  if (points.length === 0) {
    return { segments: [], project: () => ({ x: width / 2, y: height / 2 }) };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  // A lone point or a tiny route gets a minimum extent (about 130 m) so it
  // sits in the middle instead of being blown up to fill the box.
  const spanX = Math.max((maxLng - minLng) * kx, MIN_SPAN_DEG);
  const spanY = Math.max(maxLat - minLat, MIN_SPAN_DEG);
  const innerW = Math.max(width - padding * 2, 1);
  const innerH = Math.max(height - padding * 2, 1);
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const project = (p: LatLng): XY => ({
    x: width / 2 + (p.lng - midLng) * kx * scale,
    y: height / 2 - (p.lat - midLat) * scale,
  });

  return {
    segments: splitSegments(points).map((seg) => seg.map(project)),
    project,
  };
}

/** Evenly thins a polyline to at most `max` points, keeping both ends. */
export function thin<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max || max < 2) return [...items];
  const out: T[] = [];
  const step = (items.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(items[Math.round(i * step)]);
  return out;
}

/** SVG path data for a polyline. */
export function toPath(pts: readonly XY[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}
