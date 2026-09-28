import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Renders the summary card to a 1080x1350 PNG and opens the share menu. */
export async function shareCard(ref: RefObject<View | null>, title: string): Promise<void> {
  if (!ref.current) throw new Error('Card is not ready yet');
  const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1350, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
}
