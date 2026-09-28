import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { BackgroundExplainer } from '../components/BackgroundExplainer';
import { getSetting, setSetting } from '../db/queries';
import type { ActivityType } from '../geo/types';
import { haptic } from '../haptics';
import {
  canAskBackgroundAgain,
  ensureLocationServices,
  requestBackground,
  requestForeground,
  requestNotifications,
} from './permissions';
import { startActivity } from './tracker';

/**
 * Permission flow, then start. Foreground first; then, once, explain why
 * before asking for background. Recording still starts if background is denied.
 */
export function useStartActivity() {
  const [explain, setExplain] = useState(false);
  const pending = useRef<((allow: boolean) => void) | null>(null);
  const [busy, setBusy] = useState(false);

  const askExplained = () =>
    new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setExplain(true);
    });

  const answer = (allow: boolean) => {
    setExplain(false);
    pending.current?.(allow);
    pending.current = null;
  };

  const start = useCallback(async (type: ActivityType) => {
    if (busy) return;
    setBusy(true);
    try {
      const fg = await requestForeground();
      if (fg === 'denied') {
        Alert.alert('Location is off', 'TrailMate needs your location to draw the route.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      if (fg === 'approximate') {
        Alert.alert(
          'Turn on precise location',
          'Approximate location can be off by a few km, so TrailMate cannot draw your route. Switch on "Precise location" for TrailMate.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
            // Android 12+ shows its own "Change to precise location" dialog when asked again.
            ...(Platform.OS === 'android' ? [{ text: 'Try again', onPress: () => start(type) }] : []),
          ],
        );
        return;
      }
      if (!(await ensureLocationServices())) {
        Alert.alert('Location services are off', 'Turn on location in your phone settings, then try again.');
        return;
      }
      await requestNotifications();
      if ((await canAskBackgroundAgain()) && getSetting('bgAsked') !== '1') {
        const allow = await askExplained();
        setSetting('bgAsked', '1');
        if (allow) await requestBackground();
      }
      await startActivity(type);
      haptic.control();
      router.push('/record');
    } catch (e) {
      Alert.alert('Could not start', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const modal = <BackgroundExplainer visible={explain} onAllow={() => answer(true)} onSkip={() => answer(false)} />;
  return { start, busy, modal };
}
