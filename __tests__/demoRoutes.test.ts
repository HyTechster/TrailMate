import { BROGA_UP, buildRoute, CYBERJAYA_LAKE, FRIM_LOOP, outAndBack } from '../src/dev/routes';
import { splitSegments } from '../src/geo/distance';
import { paceSecPerKm } from '../src/geo/pace';
import { computeTrackStats } from '../src/geo/stats';

// The demo routes include GPS noise and bad fixes, so these double as an
// end-to-end check that filtering and smoothing give believable numbers.

describe('demo routes', () => {
  it('Bukit Broga out-and-back is about 4 km with about 290 m of climbing', () => {
    const pts = buildRoute(outAndBack(BROGA_UP), { type: 'hike', startTs: 0, speed: 1.25, stepM: 6, seed: 11, pauseAt: 0.5, pauseS: 840 });
    const s = computeTrackStats(pts, 'hike');
    expect(splitSegments(pts)).toHaveLength(2);
    expect(s.distanceM).toBeGreaterThan(3500);
    expect(s.distanceM).toBeLessThan(5000);
    expect(s.gainM).toBeGreaterThan(260);
    expect(s.gainM).toBeLessThan(340);
    expect(Math.abs(s.gainM - s.lossM)).toBeLessThan(40);
  });

  it('FRIM loop climbs without inventing extra metres', () => {
    const pts = buildRoute(FRIM_LOOP, { type: 'hike', startTs: 0, speed: 1.2, stepM: 6, seed: 37 });
    const s = computeTrackStats(pts, 'hike');
    expect(s.gainM).toBeGreaterThan(160);
    expect(s.gainM).toBeLessThan(215);
  });

  it('Cyberjaya lake run is flat with a sensible pace', () => {
    const pts = buildRoute(CYBERJAYA_LAKE, { type: 'run', startTs: 0, speed: 2.95, stepM: 8, seed: 23 });
    const s = computeTrackStats(pts, 'run');
    const t = (pts[pts.length - 1].ts - pts[0].ts) / 1000;
    const pace = paceSecPerKm(s.distanceM, t)!;
    expect(s.gainM).toBeLessThan(15);
    expect(pace).toBeGreaterThan(5 * 60);
    expect(pace).toBeLessThan(6.5 * 60);
  });
});
