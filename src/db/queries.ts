import { randomUUID } from 'expo-crypto';
import type { ActivityType, TrackPoint } from '../geo/types';
import { getDb } from './client';

export type ActivityStatus = 'recording' | 'paused' | 'finished';

export interface Activity {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  started_at: number;
  ended_at: number | null;
  moving_time_s: number;
  distance_m: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  title: string | null;
  current_segment: number;
  segment_started_at: number | null;
}

export interface Photo {
  id: string;
  activity_id: string;
  ts: number;
  lat: number | null;
  lng: number | null;
  /** Path relative to the app document directory, e.g. "photos/abc.jpg". */
  uri: string;
  caption: string | null;
}

export interface NewPoint {
  ts: number;
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
}

// ---------- activities ----------

export function createActivity(type: ActivityType, startedAt: number, title: string): Activity {
  const id = randomUUID();
  getDb().runSync(
    `INSERT INTO activities (id, type, status, started_at, title, current_segment, segment_started_at)
     VALUES (?, ?, 'recording', ?, ?, 0, ?)`,
    id,
    type,
    startedAt,
    title,
    startedAt,
  );
  return getActivity(id)!;
}

export function getActivity(id: string): Activity | null {
  return getDb().getFirstSync<Activity>('SELECT * FROM activities WHERE id = ?', id);
}

/** The unfinished activity, if any (recording or paused). */
export function getOpenActivity(): Activity | null {
  return getDb().getFirstSync<Activity>(
    `SELECT * FROM activities WHERE status != 'finished' ORDER BY started_at DESC LIMIT 1`,
  );
}

/** The activity the location task should write into. */
export function getRecordingActivity(): Activity | null {
  return getDb().getFirstSync<Activity>(
    `SELECT * FROM activities WHERE status = 'recording' ORDER BY started_at DESC LIMIT 1`,
  );
}

export function listFinishedActivities(limit = 500): Activity[] {
  return getDb().getAllSync<Activity>(
    `SELECT * FROM activities WHERE status = 'finished' ORDER BY started_at DESC LIMIT ?`,
    limit,
  );
}

/** Bank the running segment and mark paused. */
export function pauseActivity(id: string, now: number): void {
  getDb().runSync(
    `UPDATE activities
       SET status = 'paused',
           moving_time_s = moving_time_s + MAX(0, (? - COALESCE(segment_started_at, ?)) / 1000),
           segment_started_at = NULL
     WHERE id = ? AND status = 'recording'`,
    now,
    now,
    id,
  );
}

/** Start a new segment. Distance never joins across segments. */
export function resumeActivity(id: string, now: number): void {
  getDb().runSync(
    `UPDATE activities
       SET status = 'recording',
           current_segment = current_segment + 1,
           segment_started_at = ?
     WHERE id = ? AND status = 'paused'`,
    now,
    id,
  );
}

export interface FinishStats {
  endedAt: number;
  movingTimeS: number;
  distanceM: number;
  gainM: number;
  lossM: number;
}

export function finishActivity(id: string, s: FinishStats): void {
  getDb().runSync(
    `UPDATE activities
       SET status = 'finished', ended_at = ?, moving_time_s = ?, distance_m = ?,
           elevation_gain_m = ?, elevation_loss_m = ?, segment_started_at = NULL
     WHERE id = ?`,
    s.endedAt,
    Math.round(s.movingTimeS),
    s.distanceM,
    s.gainM,
    s.lossM,
    id,
  );
}

export function updateTitle(id: string, title: string): void {
  getDb().runSync('UPDATE activities SET title = ? WHERE id = ?', title, id);
}

/** Deletes the activity and returns its photo paths so the files can go too. */
export function deleteActivity(id: string): string[] {
  const db = getDb();
  const uris = db.getAllSync<{ uri: string }>('SELECT uri FROM photos WHERE activity_id = ?', id).map((r) => r.uri);
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM points WHERE activity_id = ?', id);
    db.runSync('DELETE FROM photos WHERE activity_id = ?', id);
    db.runSync('DELETE FROM activities WHERE id = ?', id);
  });
  return uris;
}

// ---------- points ----------

export function insertPoints(activityId: string, segment: number, points: readonly NewPoint[]): void {
  if (points.length === 0) return;
  const db = getDb();
  db.withTransactionSync(() => {
    for (const p of points) {
      db.runSync(
        `INSERT INTO points (activity_id, ts, lat, lng, altitude, accuracy, speed, segment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        activityId,
        p.ts,
        p.lat,
        p.lng,
        p.altitude,
        p.accuracy,
        p.speed,
        segment,
      );
    }
  });
}

const POINT_COLUMNS = 'ts, lat, lng, altitude, accuracy, speed, segment';

export function getPoints(activityId: string): TrackPoint[] {
  return getDb().getAllSync<TrackPoint>(
    `SELECT ${POINT_COLUMNS} FROM points WHERE activity_id = ? ORDER BY ts, id`,
    activityId,
  );
}

/** Points newer than `afterTs`, for cheap polling while recording. */
export function getPointsAfter(activityId: string, afterTs: number): TrackPoint[] {
  return getDb().getAllSync<TrackPoint>(
    `SELECT ${POINT_COLUMNS} FROM points WHERE activity_id = ? AND ts > ? ORDER BY ts, id`,
    activityId,
    afterTs,
  );
}

export function getLatestPoint(activityId: string): TrackPoint | null {
  return getDb().getFirstSync<TrackPoint>(
    `SELECT ${POINT_COLUMNS} FROM points WHERE activity_id = ? ORDER BY ts DESC, id DESC LIMIT 1`,
    activityId,
  );
}

// ---------- photos ----------

export function insertPhoto(p: Omit<Photo, 'id'>): Photo {
  const id = randomUUID();
  getDb().runSync(
    'INSERT INTO photos (id, activity_id, ts, lat, lng, uri, caption) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    p.activity_id,
    p.ts,
    p.lat,
    p.lng,
    p.uri,
    p.caption,
  );
  return { id, ...p };
}

export function getPhotos(activityId: string): Photo[] {
  return getDb().getAllSync<Photo>('SELECT * FROM photos WHERE activity_id = ? ORDER BY ts', activityId);
}

// ---------- settings ----------

export function getSetting(key: string): string | null {
  return getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

// ---------- demo seeding (dev only) ----------

export interface SeedActivity {
  type: ActivityType;
  title: string;
  startedAt: number;
  endedAt: number;
  movingTimeS: number;
  distanceM: number;
  gainM: number;
  lossM: number;
  points: TrackPoint[];
  photos: { ts: number; lat: number; lng: number; uri: string; caption: string | null }[];
  /** Defaults to finished. A recording seed is used for live-screen screenshots. */
  status?: ActivityStatus;
  currentSegment?: number;
  segmentStartedAt?: number | null;
}

export function insertSeedActivity(a: SeedActivity): string {
  const db = getDb();
  const id = randomUUID();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO activities (id, type, status, started_at, ended_at, moving_time_s, distance_m,
                               elevation_gain_m, elevation_loss_m, title, current_segment, segment_started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      a.type,
      a.status ?? 'finished',
      a.startedAt,
      a.status && a.status !== 'finished' ? null : a.endedAt,
      Math.round(a.movingTimeS),
      a.distanceM,
      a.gainM,
      a.lossM,
      a.title,
      a.currentSegment ?? 0,
      a.segmentStartedAt ?? null,
    );
    for (const p of a.points) {
      db.runSync(
        `INSERT INTO points (activity_id, ts, lat, lng, altitude, accuracy, speed, segment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        p.ts,
        p.lat,
        p.lng,
        p.altitude,
        p.accuracy,
        p.speed,
        p.segment,
      );
    }
    for (const ph of a.photos) {
      db.runSync(
        'INSERT INTO photos (id, activity_id, ts, lat, lng, uri, caption) VALUES (?, ?, ?, ?, ?, ?, ?)',
        randomUUID(),
        id,
        ph.ts,
        ph.lat,
        ph.lng,
        ph.uri,
        ph.caption,
      );
    }
  });
  return id;
}
