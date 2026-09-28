import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getRecordingActivity, insertPoints, type NewPoint } from '../db/queries';
import { emitPoints } from './events';

export const LOCATION_TASK = 'trailmate-location';

export function toNewPoint(l: LocationObject): NewPoint {
  return {
    ts: l.timestamp,
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    altitude: l.coords.altitude ?? null,
    accuracy: l.coords.accuracy ?? null,
    speed: l.coords.speed ?? null,
  };
}

/**
 * Writes fixes straight into SQLite for whichever activity is recording.
 * Used by the background task and by the foreground fallback watcher.
 * Never touches React state.
 */
export function recordLocations(locations: readonly LocationObject[]): void {
  const activity = getRecordingActivity();
  if (!activity || locations.length === 0) return;
  const points = locations
    .filter((l) => l.timestamp >= (activity.segment_started_at ?? activity.started_at) - 2000)
    .map(toNewPoint)
    .sort((a, b) => a.ts - b.ts);
  insertPoints(activity.id, activity.current_segment, points);
  emitPoints();
}

// Defined at module scope and imported from the app entry, so the OS can
// start it with no UI mounted.
TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[TrailMate] location task error', error.message);
    return;
  }
  try {
    recordLocations(data?.locations ?? []);
  } catch (e) {
    console.warn('[TrailMate] failed to save points', e);
  }
});
