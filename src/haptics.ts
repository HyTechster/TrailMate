import * as Haptics from 'expo-haptics';

/** Subtle and meaningful only. Failures are ignored (no haptic engine). */
const safe = (p: Promise<void>) => p.catch(() => undefined);

export const haptic = {
  /** Start, pause, resume, stop. */
  control: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Each full km. */
  km: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Photo taken, and the tick while holding stop. */
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
