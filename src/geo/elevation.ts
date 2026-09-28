import { cumulativeDistances, splitSegments } from './distance';
import type { TrackPoint } from './types';

export const SMOOTHING_WINDOW = 5;
export const HYSTERESIS_M = 3;

/** Centred moving average. The window shrinks at the edges. */
export function movingAverage(values: readonly number[], window = SMOOTHING_WINDOW): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += values[j];
    return sum / (to - from + 1);
  });
}

export interface GainLoss {
  gain: number;
  loss: number;
}

/**
 * Counts climbing and descending with hysteresis. A climb only counts once
 * the altitude moves more than `threshold` metres from the last turning
 * point, so flat ground with GPS noise adds nothing.
 */
export function gainLoss(altitudes: readonly number[], threshold = HYSTERESIS_M): GainLoss {
  if (altitudes.length < 2) return { gain: 0, loss: 0 };

  let gain = 0;
  let loss = 0;
  let ref = altitudes[0];
  let extreme = ref;
  let dir: 0 | 1 | -1 = 0;

  for (let i = 1; i < altitudes.length; i++) {
    const v = altitudes[i];
    if (dir === 0) {
      if (v - ref > threshold) {
        dir = 1;
        extreme = v;
      } else if (ref - v > threshold) {
        dir = -1;
        extreme = v;
      }
    } else if (dir === 1) {
      if (v > extreme) extreme = v;
      else if (extreme - v > threshold) {
        gain += extreme - ref;
        ref = extreme;
        dir = -1;
        extreme = v;
      }
    } else {
      if (v < extreme) extreme = v;
      else if (v - extreme > threshold) {
        loss += ref - extreme;
        ref = extreme;
        dir = 1;
        extreme = v;
      }
    }
  }

  if (dir === 1) gain += extreme - ref;
  if (dir === -1) loss += ref - extreme;
  return { gain, loss };
}

/** Smoothed gain and loss for a whole track, per segment, summed. */
export function trackGainLoss(points: readonly TrackPoint[]): GainLoss {
  let gain = 0;
  let loss = 0;
  for (const seg of splitSegments(points)) {
    const alts = seg.map((p) => p.altitude).filter((a): a is number => a !== null);
    const r = gainLoss(movingAverage(alts));
    gain += r.gain;
    loss += r.loss;
  }
  return { gain, loss };
}

export interface ProfilePoint {
  /** Distance along the route in metres. */
  d: number;
  /** Smoothed altitude in metres. */
  alt: number;
}

/** Distance vs smoothed altitude, for the elevation chart. */
export function elevationProfile(points: readonly TrackPoint[]): ProfilePoint[] {
  const cum = cumulativeDistances(points);
  const withAlt: { d: number; alt: number }[] = [];
  points.forEach((p, i) => {
    if (p.altitude !== null) withAlt.push({ d: cum[i], alt: p.altitude });
  });
  const smoothed = movingAverage(withAlt.map((p) => p.alt));
  return withAlt.map((p, i) => ({ d: p.d, alt: smoothed[i] }));
}
