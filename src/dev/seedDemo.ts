import { Asset } from 'expo-asset';
import { getOpenActivity, insertSeedActivity, type SeedActivity } from '../db/queries';
import { splitSegments } from '../geo/distance';
import { defaultTitle } from '../geo/format';
import { computeTrackStats } from '../geo/stats';
import type { ActivityType, TrackPoint } from '../geo/types';
import { importPhotoFile } from '../photos/photos';
import { BROGA_UP, buildRoute, CYBERJAYA_LAKE, FRIM_LOOP, outAndBack, TITIWANGSA_LAKE, type Waypoint } from './routes';

/* eslint-disable @typescript-eslint/no-require-imports */
const PHOTOS = {
  brogaSunrise: require('../../assets/demo/broga-sunrise.jpg'),
  brogaSummit: require('../../assets/demo/broga-summit.jpg'),
  brogaRidge: require('../../assets/demo/broga-ridge.jpg'),
  frimPath: require('../../assets/demo/frim-path.jpg'),
  frimStream: require('../../assets/demo/frim-stream.jpg'),
  frimMoss: require('../../assets/demo/frim-moss.jpg'),
  lakePath: require('../../assets/demo/lake-path.jpg'),
  lakeReeds: require('../../assets/demo/lake-reeds.jpg'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

type PhotoKey = keyof typeof PHOTOS;

interface DemoSpec {
  type: ActivityType;
  title: string;
  daysAgo: number;
  hour: number;
  minute: number;
  route: Waypoint[];
  speed: number;
  stepM: number;
  seed: number;
  pauseAt?: number;
  pauseS?: number;
  /** Photo and where along the route (0..1) it was taken. */
  photos: [PhotoKey, number][];
}

function demoSpecs(now: Date): DemoSpec[] {
  // Put the sunrise hike on today if it's already past, so "This week" has data.
  const brogaToday = now.getHours() >= 9;
  return [
    {
      type: 'hike',
      title: 'Sunrise hike at Bukit Broga',
      daysAgo: brogaToday ? 0 : 1,
      hour: 5,
      minute: 48,
      route: outAndBack(BROGA_UP),
      speed: 1.25,
      stepM: 6,
      seed: 11,
      pauseAt: 0.5,
      pauseS: 14 * 60,
      photos: [
        ['brogaRidge', 0.22],
        ['brogaSunrise', 0.49],
        ['brogaSummit', 0.52],
      ],
    },
    {
      type: 'run',
      title: 'Evening run at Cyberjaya Lake',
      daysAgo: brogaToday ? 1 : 2,
      hour: 18,
      minute: 42,
      route: CYBERJAYA_LAKE,
      speed: 2.95,
      stepM: 8,
      seed: 23,
      photos: [['lakeReeds', 0.64]],
    },
    {
      type: 'hike',
      title: 'Morning hike at FRIM',
      daysAgo: 4,
      hour: 7,
      minute: 36,
      route: FRIM_LOOP,
      speed: 1.2,
      stepM: 6,
      seed: 37,
      photos: [
        ['frimPath', 0.12],
        ['frimMoss', 0.41],
        ['frimStream', 0.78],
      ],
    },
    {
      type: 'run',
      title: 'Titiwangsa lake laps',
      daysAgo: 9,
      hour: 6,
      minute: 52,
      route: TITIWANGSA_LAKE,
      speed: 3.2,
      stepM: 8,
      seed: 41,
      photos: [['lakePath', 0.3]],
    },
  ];
}

async function localPhoto(key: PhotoKey): Promise<string> {
  const asset = Asset.fromModule(PHOTOS[key]);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return importPhotoFile(uri);
}

function movingTime(points: readonly TrackPoint[]): number {
  return splitSegments(points).reduce((t, seg) => t + (seg[seg.length - 1].ts - seg[0].ts) / 1000, 0);
}

/** Dev only: adds realistic finished activities for screenshots. Returns how many. */
export async function seedDemo(): Promise<number> {
  if (!__DEV__) return 0;
  const now = new Date();
  const specs = demoSpecs(now);
  for (const s of specs) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - s.daysAgo, s.hour, s.minute).getTime();
    const points = buildRoute(s.route, {
      type: s.type,
      startTs: start,
      speed: s.speed,
      stepM: s.stepM,
      seed: s.seed,
      pauseAt: s.pauseAt,
      pauseS: s.pauseS,
    });
    const stats = computeTrackStats(points, s.type);
    const photos: SeedActivity['photos'] = [];
    for (const [key, at] of s.photos) {
      const p = points[Math.min(points.length - 1, Math.round(at * (points.length - 1)))];
      photos.push({ ts: p.ts + 4000, lat: p.lat, lng: p.lng, uri: await localPhoto(key), caption: null });
    }
    insertSeedActivity({
      type: s.type,
      title: s.title,
      startedAt: start,
      endedAt: points[points.length - 1].ts,
      movingTimeS: movingTime(points),
      distanceM: stats.distanceM,
      gainM: stats.gainM,
      lossM: stats.lossM,
      points,
      photos,
    });
  }
  return specs.length;
}

/**
 * Dev only: an in-progress hike partway up Bukit Broga, ending right now, for
 * the live record screenshot. Point the emulator GPS at the returned position
 * so tracking carries on from there.
 */
export async function seedLiveRecording(): Promise<{ lat: number; lng: number; alt: number } | null> {
  if (!__DEV__ || getOpenActivity()) return null;
  const draft = buildRoute(BROGA_UP, { type: 'hike', startTs: 0, speed: 1.25, stepM: 6, seed: 5 });
  const upTo = draft.slice(0, Math.round(draft.length * 0.72));
  const now = Date.now();
  const shift = now - 3000 - upTo[upTo.length - 1].ts;
  const points = upTo.map((p) => ({ ...p, ts: p.ts + shift }));
  const start = points[0].ts;
  const ridge = points[Math.round(points.length * 0.55)];
  const stats = computeTrackStats(points, 'hike');
  insertSeedActivity({
    type: 'hike',
    title: defaultTitle('hike', start),
    startedAt: start,
    endedAt: now,
    movingTimeS: 0,
    distanceM: stats.distanceM,
    gainM: stats.gainM,
    lossM: stats.lossM,
    points,
    photos: [{ ts: ridge.ts + 4000, lat: ridge.lat, lng: ridge.lng, uri: await localPhoto('brogaRidge'), caption: null }],
    status: 'recording',
    currentSegment: 0,
    segmentStartedAt: start,
  });
  const last = points[points.length - 1];
  return { lat: last.lat, lng: last.lng, alt: last.altitude ?? 0 };
}
