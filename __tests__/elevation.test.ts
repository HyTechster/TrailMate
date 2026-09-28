import { elevationProfile, gainLoss, movingAverage, trackGainLoss } from '../src/geo/elevation';
import { northLine } from './helpers';

describe('movingAverage', () => {
  it('averages a centred window of 5', () => {
    expect(movingAverage([0, 0, 10, 0, 0], 5)[2]).toBe(2);
  });

  it('shrinks the window at the edges', () => {
    expect(movingAverage([0, 3, 6], 5)).toEqual([3, 3, 3]);
  });

  it('leaves a constant series alone', () => {
    expect(movingAverage([7, 7, 7, 7, 7, 7])).toEqual([7, 7, 7, 7, 7, 7]);
  });
});

describe('gainLoss', () => {
  it('counts a steady climb in full', () => {
    const climb = Array.from({ length: 11 }, (_, i) => i * 10); // 0..100
    expect(gainLoss(climb)).toEqual({ gain: 100, loss: 0 });
  });

  it('adds nothing for flat ground with GPS noise under 3 m', () => {
    const noisy = [50, 51.5, 49, 52, 50.5, 48.8, 51, 50, 52.9, 50];
    expect(gainLoss(noisy)).toEqual({ gain: 0, loss: 0 });
  });

  it('counts up and back down (a Broga style out-and-back)', () => {
    const up = Array.from({ length: 21 }, (_, i) => 100 + i * 15); // 100 -> 400
    const down = Array.from({ length: 20 }, (_, i) => 385 - i * 15); // 385 -> 100
    const r = gainLoss([...up, ...down]);
    expect(r.gain).toBe(300);
    expect(r.loss).toBe(300);
  });

  it('ignores small bumps inside a climb', () => {
    const r = gainLoss([0, 10, 20, 18, 30, 40]);
    expect(r).toEqual({ gain: 40, loss: 0 });
  });

  it('counts a real dip once it passes the threshold', () => {
    const r = gainLoss([0, 20, 10, 30]);
    expect(r).toEqual({ gain: 40, loss: 10 });
  });

  it('handles short input', () => {
    expect(gainLoss([])).toEqual({ gain: 0, loss: 0 });
    expect(gainLoss([5])).toEqual({ gain: 0, loss: 0 });
  });
});

describe('trackGainLoss', () => {
  it('smooths, then sums per segment', () => {
    const a = northLine(10, 5, 3, 0).map((p, i) => ({ ...p, altitude: 100 + i * 4 }));
    // Second segment starts 200 m higher (you took a car?). The jump between segments must not count.
    const b = northLine(10, 5, 3, 1, 90_000).map((p, i) => ({ ...p, altitude: 300 + i * 4 }));
    const r = trackGainLoss([...a, ...b]);
    // Each segment climbs 36 m raw; smoothing trims the ends a little.
    expect(r.gain).toBeGreaterThan(50);
    expect(r.gain).toBeLessThan(73);
    expect(r.loss).toBe(0);
  });

  it('skips points without altitude', () => {
    const pts = northLine(5, 5, 3);
    expect(trackGainLoss(pts)).toEqual({ gain: 0, loss: 0 });
  });
});

describe('elevationProfile', () => {
  it('pairs distance with smoothed altitude', () => {
    const pts = northLine(3, 100, 30).map((p) => ({ ...p, altitude: 10 }));
    const prof = elevationProfile(pts);
    expect(prof.map((p) => Math.round(p.d))).toEqual([0, 100, 200]);
    expect(prof.every((p) => p.alt === 10)).toBe(true);
  });
});
