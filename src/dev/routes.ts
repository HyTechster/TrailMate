import type { ActivityType, TrackPoint } from '../geo/types';

/**
 * Made-up but realistic demo routes. Waypoints are [lat, lng, altitude m].
 * Pure and deterministic so it can also feed the emulator route player.
 */

export type Waypoint = [number, number, number];

const M_PER_DEG = 111_195;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stretches a route away from its first point, keeping altitudes. */
function scaleFrom(wps: Waypoint[], k: number): Waypoint[] {
  const [la0, lo0] = wps[0];
  return wps.map(([la, lo, alt]) => [la0 + (la - la0) * k, lo0 + (lo - lo0) * k, alt]);
}

/** Bukit Broga: car park, up through the grass ridge to three peaks, and back. */
export const BROGA_UP: Waypoint[] = scaleFrom([
  [2.93968, 101.90112, 112],
  [2.94022, 101.90174, 128],
  [2.94061, 101.90248, 151],
  [2.94118, 101.90282, 176],
  [2.94162, 101.90351, 205],
  [2.94221, 101.90389, 238],
  [2.94268, 101.90457, 262],
  [2.94322, 101.90503, 284],
  [2.94371, 101.90566, 301], // first peak
  [2.94409, 101.90611, 296],
  [2.94462, 101.90668, 326],
  [2.94513, 101.90702, 349], // second peak
  [2.94552, 101.90755, 344],
  [2.94601, 101.90812, 371],
  [2.94648, 101.90861, 398],
  [2.94687, 101.90902, 403], // Bukit Tok Wan
], 1.7);

/** FRIM Kepong: a forest loop past the canopy walkway hill. */
export const FRIM_LOOP: Waypoint[] = scaleFrom([
  [3.23542, 101.63318, 86],
  [3.23611, 101.63242, 94],
  [3.23702, 101.63188, 112],
  [3.23768, 101.63097, 138],
  [3.23851, 101.63031, 171],
  [3.23912, 101.62938, 204],
  [3.23987, 101.62872, 236],
  [3.24058, 101.62795, 262],
  [3.24121, 101.62861, 271],
  [3.24163, 101.62962, 248],
  [3.24142, 101.63071, 219],
  [3.24087, 101.63168, 186],
  [3.24011, 101.63249, 158],
  [3.23928, 101.63322, 131],
  [3.23846, 101.63398, 118],
  [3.23751, 101.63441, 104],
  [3.23652, 101.63402, 95],
  [3.23572, 101.63357, 88],
], 1.8);

function ellipse(lat: number, lng: number, rLatM: number, rLngM: number, alt: number, n: number, wobble: number, seed: number): Waypoint[] {
  const rnd = mulberry32(seed);
  const out: Waypoint[] = [];
  const kLng = M_PER_DEG * Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const w = 1 + wobble * Math.sin(3 * t + 0.7) + wobble * 0.5 * Math.sin(5 * t);
    out.push([
      lat + (Math.sin(t) * rLatM * w) / M_PER_DEG,
      lng + (Math.cos(t) * rLngM * w) / kLng,
      alt + (rnd() - 0.5) * 3,
    ]);
  }
  return out;
}

/** Cyberjaya Lake Gardens: one big loop of the lake plus the park path. */
export const CYBERJAYA_LAKE: Waypoint[] = [
  ...ellipse(2.92148, 101.65462, 520, 380, 34, 48, 0.08, 3),
  ...ellipse(2.92148, 101.65462, 300, 240, 33, 30, 0.06, 4),
];

/** Titiwangsa: two laps of the lake path. */
export const TITIWANGSA_LAKE: Waypoint[] = [
  ...ellipse(3.17852, 101.70631, 340, 420, 58, 40, 0.07, 9),
  ...ellipse(3.17852, 101.70631, 340, 420, 58, 40, 0.07, 10).slice(1),
];

export interface BuildOptions {
  type: ActivityType;
  startTs: number;
  /** Flat-ground speed in m/s. */
  speed: number;
  stepM: number;
  seed: number;
  /** Pause after this fraction of the route (0..1) for `pauseS` seconds, starting a new segment. */
  pauseAt?: number;
  pauseS?: number;
}

/** Walks the waypoints and produces GPS-like points with noise, like a real phone would. */
export function buildRoute(wps: readonly Waypoint[], o: BuildOptions): TrackPoint[] {
  const rnd = mulberry32(o.seed);
  const pts: TrackPoint[] = [];
  let ts = o.startTs;
  let segment = 0;

  let totalLen = 0;
  const legLen: number[] = [];
  for (let i = 1; i < wps.length; i++) {
    const [la, lo] = wps[i - 1];
    const [lb, lob] = wps[i];
    const k = Math.cos((la * Math.PI) / 180);
    const d = Math.hypot((lb - la) * M_PER_DEG, (lob - lo) * M_PER_DEG * k);
    legLen.push(d);
    totalLen += d;
  }

  let travelled = 0;
  let paused = false;
  let meander = 0;
  for (let i = 1; i < wps.length; i++) {
    const [la, lo, aa] = wps[i - 1];
    const [lb, lob, ab] = wps[i];
    const d = legLen[i - 1];
    const steps = Math.max(1, Math.round(d / o.stepM));
    const grade = (ab - aa) / Math.max(d, 1);
    const k = Math.cos((la * Math.PI) / 180);
    // Unit vector perpendicular to the leg, for sideways wander.
    const nx = -((lb - la) * M_PER_DEG) / Math.max(d, 1);
    const ny = ((lob - lo) * M_PER_DEG * k) / Math.max(d, 1);

    for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
      const f = s / steps;
      meander += (rnd() - 0.5) * 0.6;
      meander *= 0.92;
      const side = meander + (rnd() - 0.5) * 1.6;
      const lat = la + (lb - la) * f + (ny * side) / M_PER_DEG;
      const lng = lo + (lob - lo) * f + (nx * side) / (M_PER_DEG * k);
      const bad = rnd() < 1 / 180;
      const accuracy = bad ? 35 + rnd() * 30 : 3.5 + rnd() * 8;
      const jitter = bad ? 40 / M_PER_DEG : 0;

      if (s > 0 || i === 1) {
        const segSpeed =
          o.type === 'hike'
            ? o.speed / (1 + 7 * Math.max(grade, 0)) * (grade < -0.05 ? 0.85 : 1)
            : o.speed * (1 - 2.5 * Math.max(grade, 0));
        const v = segSpeed * (0.88 + rnd() * 0.24);
        if (pts.length) ts += (o.stepM / v) * 1000;
      }

      pts.push({
        ts: Math.round(ts),
        lat: lat + jitter,
        lng,
        altitude: aa + (ab - aa) * f + (rnd() - 0.5) * 3,
        accuracy,
        speed: null,
        segment,
      });
      travelled += d / steps;

      if (!paused && o.pauseAt !== undefined && travelled / totalLen >= o.pauseAt) {
        paused = true;
        segment += 1;
        ts += (o.pauseS ?? 600) * 1000;
      }
    }
  }
  return pts;
}

/** Out and back: the waypoints, then reversed. */
export function outAndBack(wps: readonly Waypoint[]): Waypoint[] {
  return [...wps, ...[...wps].reverse().slice(1)];
}
