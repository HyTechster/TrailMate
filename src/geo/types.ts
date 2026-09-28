export type ActivityType = 'hike' | 'run';

/** A raw GPS fix as stored in the `points` table. */
export interface TrackPoint {
  ts: number;
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  segment: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}
