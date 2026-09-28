import { cumulativeDistances, distanceAtTime, haversine, splitSegments, totalDistance } from '../src/geo/distance';
import { M_PER_DEG_LAT, northLine, pt } from './helpers';

describe('haversine', () => {
  it('is zero for the same point', () => {
    expect(haversine({ lat: 2.94, lng: 101.9 }, { lat: 2.94, lng: 101.9 })).toBe(0);
  });

  it('measures one degree of latitude', () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(M_PER_DEG_LAT, 3);
  });

  it('shrinks longitude with latitude', () => {
    const atEquator = haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 });
    const at60 = haversine({ lat: 60, lng: 0 }, { lat: 60, lng: 0.01 });
    expect(at60 / atEquator).toBeCloseTo(0.5, 3);
  });

  it('matches a known city distance (KL to Penang, about 293 km)', () => {
    const d = haversine({ lat: 3.139, lng: 101.6869 }, { lat: 5.4141, lng: 100.3288 });
    expect(d / 1000).toBeGreaterThan(285);
    expect(d / 1000).toBeLessThan(300);
  });
});

describe('totalDistance', () => {
  it('sums a straight 1 km line', () => {
    expect(totalDistance(northLine(11, 100, 30))).toBeCloseTo(1000, 6);
  });

  it('never joins across segments', () => {
    const a = northLine(6, 100, 30, 0);
    // Second segment starts 5 km away. That gap must not count.
    const b = northLine(6, 100, 30, 1).map((p) => ({ ...p, lat: p.lat + 5000 / M_PER_DEG_LAT }));
    expect(totalDistance([...a, ...b])).toBeCloseTo(1000, 6);
  });

  it('is zero for zero or one point', () => {
    expect(totalDistance([])).toBe(0);
    expect(totalDistance([pt({ lat: 1, lng: 1, ts: 0 })])).toBe(0);
  });
});

describe('cumulativeDistances / splitSegments / distanceAtTime', () => {
  const pts = [...northLine(3, 100, 10, 0), ...northLine(3, 100, 10, 1, 60_000)];

  it('keeps the running total flat across a pause', () => {
    const cum = cumulativeDistances(pts);
    expect(cum.map((d) => Math.round(d))).toEqual([0, 100, 200, 200, 300, 400]);
  });

  it('splits by segment', () => {
    expect(splitSegments(pts).map((s) => s.length)).toEqual([3, 3]);
  });

  it('finds distance along the route at a time', () => {
    expect(Math.round(distanceAtTime(pts, 11_000))).toBe(100);
    expect(distanceAtTime([], 0)).toBe(0);
  });
});
