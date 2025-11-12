/**
 * Haptic Feedback Manager for Capacitor
 *
 * Provides tactile feedback for user interactions to enhance
 * the mobile experience
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

/**
 * Trigger haptic feedback
 */
export async function triggerHaptic(type: HapticFeedbackType = 'light'): Promise<void> {
  if (!isNative()) {
    // Web fallback: vibration API (limited browser support)
    if ('vibrate' in navigator) {
      const patterns: Record<HapticFeedbackType, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 50, 10],
        warning: [10, 50, 10, 50, 10],
        error: [50, 30, 50],
        selection: 5,
      };

      navigator.vibrate(patterns[type]);
    }
    return;
  }

  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'selection':
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
        break;
    }
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
  }
}

/**
 * Light haptic feedback (for subtle interactions)
 */
export async function hapticsLight(): Promise<void> {
  await triggerHaptic('light');
}

/**
 * Medium haptic feedback (for standard interactions)
 */
export async function hapticsMedium(): Promise<void> {
  await triggerHaptic('medium');
}

/**
 * Heavy haptic feedback (for important actions)
 */
export async function hapticsHeavy(): Promise<void> {
  await triggerHaptic('heavy');
}

/**
 * Success haptic feedback
 */
export async function hapticsSuccess(): Promise<void> {
  await triggerHaptic('success');
}

/**
 * Warning haptic feedback
 */
export async function hapticsWarning(): Promise<void> {
  await triggerHaptic('warning');
}

/**
 * Error haptic feedback
 */
export async function hapticsError(): Promise<void> {
  await triggerHaptic('error');
}

/**
 * Selection haptic feedback (for picker/selector changes)
 */
export async function hapticsSelection(): Promise<void> {
  await triggerHaptic('selection');
}

/**
 * Haptic feedback for button press
 */
export async function hapticsButtonPress(): Promise<void> {
  await triggerHaptic('light');
}

/**
 * Haptic feedback for toggle/switch
 */
export async function hapticsToggle(enabled: boolean): Promise<void> {
  await triggerHaptic(enabled ? 'light' : 'medium');
}

/**
 * Haptic feedback for task completion
 */
export async function hapticsTaskComplete(): Promise<void> {
  await triggerHaptic('success');
}

/**
 * Haptic feedback for deletion
 */
export async function hapticsDelete(): Promise<void> {
  await triggerHaptic('warning');
}

/**
 * Haptic feedback for swipe action
 */
export async function hapticsSwipe(): Promise<void> {
  await triggerHaptic('light');
}

/**
 * Haptic feedback for pull-to-refresh
 */
export async function hapticsRefresh(): Promise<void> {
  await triggerHaptic('medium');
}

/**
 * Haptic feedback for long press
 */
export async function hapticsLongPress(): Promise<void> {
  await triggerHaptic('heavy');
}

/**
 * Check if haptics are supported
 */
export function isHapticsSupported(): boolean {
  if (isNative()) {
    return true; // Always supported on native
  }
  return 'vibrate' in navigator;
}

export default {
  triggerHaptic,
  hapticsLight,
  hapticsMedium,
  hapticsHeavy,
  hapticsSuccess,
  hapticsWarning,
  hapticsError,
  hapticsSelection,
  hapticsButtonPress,
  hapticsToggle,
  hapticsTaskComplete,
  hapticsDelete,
  hapticsSwipe,
  hapticsRefresh,
  hapticsLongPress,
  isHapticsSupported,
};
