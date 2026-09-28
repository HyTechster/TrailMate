import type { ActivityType } from './types';

export type Units = 'metric' | 'imperial';

const M_PER_MILE = 1609.344;
const FT_PER_M = 3.28084;

export function formatDistance(m: number, units: Units): { value: string; unit: string } {
  if (units === 'imperial') {
    const mi = m / M_PER_MILE;
    return { value: mi.toFixed(mi < 10 ? 2 : 1), unit: 'mi' };
  }
  const km = m / 1000;
  return { value: km.toFixed(km < 10 ? 2 : 1), unit: 'km' };
}

export function formatElevation(m: number, units: Units): { value: string; unit: string } {
  if (units === 'imperial') return { value: Math.round(m * FT_PER_M).toString(), unit: 'ft' };
  return { value: Math.round(m).toString(), unit: 'm' };
}

/** 0:42, 12:05, 1:03:27 */
export function formatDuration(totalS: number): string {
  const s = Math.max(0, Math.floor(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Pace in the user's units: "5:32" per km or per mile. */
export function formatPace(secPerKm: number | null, units: Units): { value: string; unit: string } {
  const unit = units === 'imperial' ? '/mi' : '/km';
  if (secPerKm === null || !Number.isFinite(secPerKm) || secPerKm > 60 * 60) {
    return { value: '-:--', unit };
  }
  const perUnit = units === 'imperial' ? secPerKm * (M_PER_MILE / 1000) : secPerKm;
  const rounded = Math.round(perUnit);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return { value: `${m}:${s.toString().padStart(2, '0')}`, unit };
}

export function formatSpeed(kmh: number | null, units: Units): { value: string; unit: string } {
  if (kmh === null || !Number.isFinite(kmh)) return { value: '0.0', unit: units === 'imperial' ? 'mph' : 'km/h' };
  if (units === 'imperial') return { value: (kmh / 1.609344).toFixed(1), unit: 'mph' };
  return { value: kmh.toFixed(1), unit: 'km/h' };
}

export function timeOfDay(date: Date): 'Early morning' | 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  const h = date.getHours();
  if (h >= 4 && h < 7) return 'Early morning';
  if (h >= 7 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 20) return 'Evening';
  return 'Night';
}

/** "Morning hike", "Evening run". A place name is added when we have one. */
export function defaultTitle(type: ActivityType, startedAt: number, place?: string): string {
  const base = `${timeOfDay(new Date(startedAt))} ${type}`;
  return place ? `${base} at ${place}` : base;
}
