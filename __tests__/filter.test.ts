import { filterPoints, REANCHOR_AFTER } from '../src/geo/filter';
import { M_PER_DEG_LAT, northLine, pt } from './helpers';

describe('filterPoints', () => {
  it('drops points with accuracy worse than 25 m', () => {
    const pts = northLine(4, 5, 3);
    pts[1] = { ...pts[1], accuracy: 40 };
    pts[2] = { ...pts[2], accuracy: 25 };
    expect(filterPoints(pts, 'hike')).toHaveLength(3);
  });

  it('keeps points without an accuracy value', () => {
    const pts = northLine(3, 5, 3).map((p) => ({ ...p, accuracy: null }));
    expect(filterPoints(pts, 'hike')).toHaveLength(3);
  });

  it('drops a jump that is too fast for a hike but fine for a run', () => {
    // 15 m in 3 s = 5 m/s
    const pts = northLine(3, 15, 3);
    expect(filterPoints(pts, 'hike')).toHaveLength(1);
    expect(filterPoints(pts, 'run')).toHaveLength(3);
  });

  it('drops a single spike and continues from the last good point', () => {
    const pts = northLine(5, 5, 3);
    pts[2] = { ...pts[2], lat: pts[2].lat + 300 / M_PER_DEG_LAT };
    const kept = filterPoints(pts, 'hike');
    expect(kept).toHaveLength(4);
    expect(kept).not.toContain(pts[2]);
  });

  it('re-anchors after a long run of rejects instead of losing the whole track', () => {
    const start = pt({ lat: 0, lng: 0, ts: 0, accuracy: 5 });
    // The first fix was wrong: the real track is 500 m away.
    const real = northLine(REANCHOR_AFTER + 3, 3, 3, 0, 3000).map((p) => ({
      ...p,
      lat: p.lat + 500 / M_PER_DEG_LAT,
    }));
    const kept = filterPoints([start, ...real], 'hike');
    expect(kept.length).toBeGreaterThan(2);
  });

  it('starts fresh in a new segment', () => {
    const a = northLine(2, 5, 3, 0);
    const b = northLine(2, 5, 3, 1, 60_000).map((p) => ({ ...p, lat: p.lat + 1 }));
    expect(filterPoints([...a, ...b], 'hike')).toHaveLength(4);
  });

  it('drops duplicate timestamps', () => {
    const pts = northLine(2, 1, 3);
    expect(filterPoints([pts[0], { ...pts[1], ts: pts[0].ts }], 'hike')).toHaveLength(1);
  });
});
