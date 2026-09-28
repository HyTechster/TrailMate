import {
  defaultTitle,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
} from '../src/geo/format';
import { projectRoute, thin, toPath } from '../src/geo/project';
import { computeTrackStats } from '../src/geo/stats';
import { northLine, pt } from './helpers';

describe('format', () => {
  it('formats distance', () => {
    expect(formatDistance(4321, 'metric')).toEqual({ value: '4.32', unit: 'km' });
    expect(formatDistance(12_345, 'metric')).toEqual({ value: '12.3', unit: 'km' });
    expect(formatDistance(1609.344, 'imperial')).toEqual({ value: '1.00', unit: 'mi' });
  });

  it('formats elevation', () => {
    expect(formatElevation(312.6, 'metric')).toEqual({ value: '313', unit: 'm' });
    expect(formatElevation(100, 'imperial')).toEqual({ value: '328', unit: 'ft' });
  });

  it('formats duration', () => {
    expect(formatDuration(42)).toBe('0:42');
    expect(formatDuration(725)).toBe('12:05');
    expect(formatDuration(3807)).toBe('1:03:27');
  });

  it('formats pace', () => {
    expect(formatPace(332, 'metric')).toEqual({ value: '5:32', unit: '/km' });
    expect(formatPace(null, 'metric').value).toBe('-:--');
    expect(formatPace(300, 'imperial')).toEqual({ value: '8:03', unit: '/mi' });
  });

  it('formats speed', () => {
    expect(formatSpeed(4.23, 'metric')).toEqual({ value: '4.2', unit: 'km/h' });
    expect(formatSpeed(null, 'metric').value).toBe('0.0');
  });

  it('builds a default title from time of day and type', () => {
    const sixAm = new Date(2026, 8, 12, 6, 10).getTime();
    const sixPm = new Date(2026, 8, 12, 18, 30).getTime();
    expect(defaultTitle('hike', sixAm, 'Bukit Broga')).toBe('Early morning hike at Bukit Broga');
    expect(defaultTitle('run', sixPm)).toBe('Evening run');
  });
});

describe('projectRoute', () => {
  it('fits a north-south line into the box, north at the top', () => {
    const { segments } = projectRoute(northLine(3, 100, 10), 300, 200, 10);
    const [first, , last] = segments[0];
    expect(first.y).toBeCloseTo(190, 6);
    expect(last.y).toBeCloseTo(10, 6);
    expect(first.x).toBeCloseTo(150, 6);
  });

  it('centres a single point', () => {
    const { segments } = projectRoute([pt({ lat: 2.94, lng: 101.9, ts: 0 })], 300, 200, 20);
    expect(segments[0][0].x).toBeCloseTo(150, 6);
    expect(segments[0][0].y).toBeCloseTo(100, 6);
  });

  it('handles an empty route', () => {
    expect(projectRoute([], 100, 100).segments).toEqual([]);
  });

  it('keeps each segment separate', () => {
    const pts = [pt({ lat: 0, lng: 0, ts: 0 }), pt({ lat: 0.001, lng: 0, ts: 1, segment: 1 })];
    expect(projectRoute(pts, 50, 50).segments).toHaveLength(2);
  });

  it('thins and writes paths', () => {
    expect(thin([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)).toEqual([1, 5, 9]);
    expect(toPath([{ x: 0, y: 0 }, { x: 1, y: 2 }])).toBe('M0.0 0.0 L1.0 2.0');
  });
});

describe('computeTrackStats', () => {
  it('filters then measures', () => {
    const pts = northLine(11, 5, 3).map((p, i) => ({ ...p, altitude: 100 + i }));
    pts[5] = { ...pts[5], accuracy: 80 };
    const s = computeTrackStats(pts, 'hike');
    expect(s.kept).toHaveLength(10);
    expect(s.distanceM).toBeCloseTo(50, 6);
    expect(s.gainM).toBeGreaterThan(6);
  });
});
