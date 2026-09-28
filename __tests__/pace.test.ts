import { kmSplits, livePace, paceSecPerKm, speedKmh } from '../src/geo/pace';
import { movingTimeS } from '../src/geo/stats';
import { northLine } from './helpers';

describe('paceSecPerKm / speedKmh', () => {
  it('5 km in 25 minutes is 5:00 per km', () => {
    expect(paceSecPerKm(5000, 25 * 60)).toBe(300);
  });

  it('returns null with too little data', () => {
    expect(paceSecPerKm(0, 100)).toBeNull();
    expect(paceSecPerKm(1000, 0)).toBeNull();
  });

  it('computes km/h', () => {
    expect(speedKmh(4000, 3600)).toBe(4);
    expect(speedKmh(4000, 0)).toBeNull();
  });
});

describe('livePace', () => {
  it('uses roughly the last 200 m', () => {
    // First 1 km slow (10 m every 6 s = 10:00/km), then 300 m fast (10 m every 3 s = 5:00/km).
    const slow = northLine(101, 10, 6);
    const lastTs = slow[slow.length - 1].ts;
    const fast = northLine(31, 10, 3, 0, lastTs).map((p) => ({ ...p, lat: p.lat + slow[slow.length - 1].lat }));
    const pace = livePace([...slow, ...fast.slice(1)]);
    expect(pace).not.toBeNull();
    expect(pace!).toBeCloseTo(300, 0);
  });

  it('stays inside the current segment', () => {
    const a = northLine(50, 10, 6, 0);
    const b = northLine(3, 10, 3, 1, 999_000);
    // Only 20 m in the new segment: not enough for a live pace yet.
    expect(livePace([...a, ...b])).toBeNull();
  });

  it('returns null for fewer than two points', () => {
    expect(livePace([])).toBeNull();
  });
});

describe('kmSplits', () => {
  it('splits 2.5 km at a steady 6:00/km', () => {
    const pts = northLine(51, 50, 18); // 50 m every 18 s
    const splits = kmSplits(pts);
    expect(splits).toHaveLength(3);
    expect(splits[0].timeS).toBeCloseTo(360, 6);
    expect(splits[1].timeS).toBeCloseTo(360, 6);
    expect(splits[2].distanceM).toBeCloseTo(500, 6);
    expect(splits[2].timeS).toBeCloseTo(180, 6);
  });

  it('excludes pause time between segments', () => {
    const a = northLine(11, 100, 30, 0);
    const b = northLine(11, 100, 30, 1, 10 * 60 * 60 * 1000);
    const splits = kmSplits([...a, ...b]);
    expect(splits.map((s) => Math.round(s.timeS))).toEqual([300, 300]);
  });
});

describe('movingTimeS', () => {
  it('adds the running segment to banked time', () => {
    expect(movingTimeS(600, 1_000, 61_000)).toBe(660);
  });

  it('returns banked time while paused', () => {
    expect(movingTimeS(600, null, 99_000)).toBe(600);
  });
});
