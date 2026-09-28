import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

export type LocationAccess = 'background' | 'foreground' | 'denied';

export async function getLocationAccess(): Promise<LocationAccess> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.granted ? 'background' : 'foreground';
}

/**
 * Android 12+ and iOS 14+ let people grant only approximate location
 * (accurate to a few km). Every fix would fail our 25 m filter, so treat it
 * as its own case.
 */
export type ForegroundResult = 'precise' | 'approximate' | 'denied';

function toResult(res: Location.LocationPermissionResponse): ForegroundResult {
  if (!res.granted) return 'denied';
  if (res.android?.accuracy === 'coarse' || res.ios?.accuracy === 'reduced') return 'approximate';
  return 'precise';
}

/** Step 1: while-in-use location. Required to record at all. */
export async function requestForeground(): Promise<ForegroundResult> {
  return toResult(await Location.requestForegroundPermissionsAsync());
}

/**
 * Step 2: "Allow all the time". Only call after explaining why on screen.
 * Recording still works without it, with the screen kept on.
 */
export async function requestBackground(): Promise<boolean> {
  const res = await Location.requestBackgroundPermissionsAsync();
  return res.granted;
}

export async function canAskBackgroundAgain(): Promise<boolean> {
  const bg = await Location.getBackgroundPermissionsAsync();
  return !bg.granted && bg.canAskAgain;
}

/**
 * The phone's location switch can be off even with permission granted.
 * On Android we can show the system "turn on location" dialog.
 */
export async function ensureLocationServices(): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (Platform.OS !== 'android') return false;
  try {
    await Location.enableNetworkProviderAsync();
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * Android 13+ hides the "TrailMate is recording" notification unless the
 * user allows notifications. Tracking still works without it.
 */
export async function requestNotifications(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // Not critical.
  }
}
