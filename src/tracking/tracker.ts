import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import {
  createActivity,
  deleteActivity,
  finishActivity,
  getActivity,
  getLatestPoint,
  getPoints,
  pauseActivity,
  resumeActivity,
  type Activity,
} from '../db/queries';
import { defaultTitle } from '../geo/format';
import { computeTrackStats, movingTimeS } from '../geo/stats';
import type { ActivityType } from '../geo/types';
import { deletePhotoFiles } from '../photos/photos';
import { readSettings } from '../settings';
import { palettes } from '../theme/tokens';
import { LOCATION_TASK, recordLocations } from './locationTask';
import { getLocationAccess } from './permissions';

const KEEP_AWAKE_TAG = 'trailmate-recording';

let watcher: Location.LocationSubscription | null = null;

export type TrackingMode = 'background' | 'screen-on';

function locationOptions(type: ActivityType): Location.LocationOptions {
  const { gpsMode } = readSettings();
  const accuracy =
    gpsMode === 'saver'
      ? Location.Accuracy.Balanced
      : gpsMode === 'precise' || type === 'run'
        ? Location.Accuracy.BestForNavigation
        : Location.Accuracy.High;
  return {
    accuracy,
    distanceInterval: gpsMode === 'saver' ? 10 : 5,
    timeInterval: gpsMode === 'saver' ? 5000 : 3000,
  };
}

async function startUpdates(type: ActivityType): Promise<TrackingMode> {
  await stopUpdates();
  const access = await getLocationAccess();
  if (access === 'denied') throw new Error('Location permission is needed to record.');

  const opts = locationOptions(type);
  const label = type === 'hike' ? 'hike' : 'run';

  // iOS needs "Always" for the background task. Android's foreground service
  // works with while-in-use, as long as it starts while the app is open.
  const useTask = access === 'background' || Platform.OS === 'android';

  if (useTask) {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        ...opts,
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: `TrailMate is recording your ${label}`,
          notificationBody: 'Tap to see your live stats.',
          notificationColor: palettes.light.forest,
          killServiceOnDestroy: false,
        },
      });
      if (access !== 'background') await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      return access === 'background' ? 'background' : 'screen-on';
    } catch (e) {
      console.warn('[TrailMate] background updates unavailable, using screen-on mode', e);
    }
  }

  watcher = await Location.watchPositionAsync(opts, (l) => recordLocations([l]));
  await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
  return 'screen-on';
}

async function stopUpdates(): Promise<void> {
  watcher?.remove();
  watcher = null;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    // Task was never registered. Nothing to stop.
  }
  deactivateKeepAwake(KEEP_AWAKE_TAG);
}

export async function isTracking(): Promise<boolean> {
  if (watcher) return true;
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startActivity(type: ActivityType): Promise<{ activity: Activity; mode: TrackingMode }> {
  const now = Date.now();
  const activity = createActivity(type, now, defaultTitle(type, now));
  try {
    const mode = await startUpdates(type);
    return { activity, mode };
  } catch (e) {
    deleteActivity(activity.id);
    throw e;
  }
}

export async function pause(id: string): Promise<void> {
  await stopUpdates();
  pauseActivity(id, Date.now());
}

export async function resume(id: string): Promise<TrackingMode> {
  const a = getActivity(id);
  if (!a) throw new Error('Activity not found');
  resumeActivity(id, Date.now());
  return startUpdates(a.type);
}

/**
 * Crash recovery: the app died while recording. Close the old segment at the
 * last fix we saved, then start a fresh one so the gap adds no distance or
 * moving time.
 */
export async function recoverAndResume(id: string): Promise<TrackingMode> {
  const a = getActivity(id);
  if (!a) throw new Error('Activity not found');
  if (a.status === 'recording') {
    const last = getLatestPoint(id);
    pauseActivity(id, last?.ts ?? a.segment_started_at ?? a.started_at);
  }
  return resume(id);
}

/** Keep recording if the OS task died but the activity says recording. */
export async function ensureRunning(a: Activity): Promise<TrackingMode | null> {
  if (a.status !== 'recording') return null;
  if (await isTracking()) {
    return (await getLocationAccess()) === 'background' ? 'background' : 'screen-on';
  }
  return recoverAndResume(a.id);
}

export async function finish(id: string, opts: { recovered?: boolean } = {}): Promise<void> {
  await stopUpdates();
  const a = getActivity(id);
  if (!a) return;
  const points = getPoints(id);
  const last = points[points.length - 1];
  // After a crash, the activity really ended at the last saved fix.
  const endedAt = opts.recovered ? (last?.ts ?? a.started_at) : Date.now();
  const stats = computeTrackStats(points, a.type);
  finishActivity(id, {
    endedAt,
    movingTimeS: movingTimeS(a.moving_time_s, a.status === 'recording' ? a.segment_started_at : null, endedAt),
    distanceM: stats.distanceM,
    gainM: stats.gainM,
    lossM: stats.lossM,
  });
}

export async function discard(id: string): Promise<void> {
  await stopUpdates();
  deletePhotoFiles(deleteActivity(id));
}

/** Removes a finished activity and its photo files. */
export function removeActivity(id: string): void {
  deletePhotoFiles(deleteActivity(id));
}
