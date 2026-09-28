import { useCallback, useSyncExternalStore } from 'react';
import { getSetting, setSetting } from './db/queries';
import type { Units } from './geo/format';

export type GpsMode = 'auto' | 'precise' | 'saver';

export interface Settings {
  units: Units;
  gpsMode: GpsMode;
  kmHaptics: boolean;
}

const DEFAULTS: Settings = { units: 'metric', gpsMode: 'auto', kmHaptics: true };

let cache: Settings | null = null;
const listeners = new Set<() => void>();

export function readSettings(): Settings {
  if (!cache) {
    const raw = getSetting('app');
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  }
  return cache;
}

export function writeSettings(patch: Partial<Settings>): void {
  cache = { ...readSettings(), ...patch };
  setSetting('app', JSON.stringify(cache));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const s = useSyncExternalStore(subscribe, readSettings);
  const set = useCallback((patch: Partial<Settings>) => writeSettings(patch), []);
  return [s, set];
}
