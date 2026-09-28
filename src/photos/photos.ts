import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { getLatestPoint, insertPhoto, type Photo } from '../db/queries';

const PHOTO_DIR = 'photos';

function photoDir(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Photos are stored relative to the document directory because the absolute
 * app container path can change between app updates on iOS.
 */
export function photoUri(relative: string): string {
  return new File(Paths.document, relative).uri;
}

/** Copies a picked or bundled image into app storage. Returns the relative path. */
export async function importPhotoFile(sourceUri: string): Promise<string> {
  const name = `${randomUUID()}.jpg`;
  const dest = new File(photoDir(), name);
  await new File(sourceUri).copy(dest);
  return `${PHOTO_DIR}/${name}`;
}

export type TakePhotoResult = { ok: true; photo: Photo } | { ok: false; reason: 'permission' | 'cancelled' };

/**
 * Opens the camera and pins the photo to the latest tracked GPS point
 * (not EXIF, which is often missing or stripped).
 */
export async function takePhoto(activityId: string): Promise<TakePhotoResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8, exif: false });
  if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'cancelled' };

  return { ok: true, photo: await savePhoto(activityId, result.assets[0].uri) };
}

async function savePhoto(activityId: string, sourceUri: string): Promise<Photo> {
  const relative = await importPhotoFile(sourceUri);
  const at = getLatestPoint(activityId);
  return insertPhoto({
    activity_id: activityId,
    ts: Date.now(),
    lat: at?.lat ?? null,
    lng: at?.lng ?? null,
    uri: relative,
    caption: null,
  });
}

/**
 * Low-memory Android phones can kill TrailMate while the camera app is open.
 * The photo survives as a pending result; save it once the app is back.
 */
export async function recoverPendingPhoto(activityId: string): Promise<Photo | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    if (!pending || !('canceled' in pending) || pending.canceled || pending.assets.length === 0) return null;
    return await savePhoto(activityId, pending.assets[0].uri);
  } catch (e) {
    console.warn('[TrailMate] could not recover photo', e);
    return null;
  }
}

export function deletePhotoFiles(relativePaths: readonly string[]): void {
  for (const rel of relativePaths) {
    try {
      const f = new File(Paths.document, rel);
      if (f.exists) f.delete();
    } catch (e) {
      console.warn('[TrailMate] could not delete photo', rel, e);
    }
  }
}
