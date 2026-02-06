/**
 * Safe Area Utilities for Capacitor Mobile Apps
 *
 * Android: Uses fitsSystemWindows=true in MainActivity which automatically
 * handles status bar and navigation bar insets at the native level.
 * CSS padding is not needed and would cause double-insets.
 *
 * iOS: Uses CSS env() variables which work natively in iOS WebViews.
 */

import { StatusBar } from '@capacitor/status-bar';
import { isNative, isAndroid, isIOS, getPlatform } from './platform';

/**
 * Initialize safe area handling for native platforms
 * Call this early in app lifecycle (e.g., in main.tsx)
 */
export async function initializeSafeArea(): Promise<void> {
  console.log('[SAFE_AREA] initializeSafeArea called, isNative:', isNative());

  if (!isNative()) {
    console.log('[SAFE_AREA] Skipping initialization on web platform');
    // Ensure safe areas are reset on web
    document.documentElement.style.setProperty('--android-safe-area-top', '0px');
    document.documentElement.style.setProperty('--android-safe-area-bottom', '0px');
    return;
  }

  const platform = getPlatform();
  console.log(`[SAFE_AREA] Initializing for ${platform}`);

  if (platform === 'android' || isAndroid()) {
    await setupAndroidSafeArea();
  } else if (platform === 'ios' || isIOS()) {
    // iOS uses CSS env() variables natively, ensure Android variables are 0
    document.documentElement.style.setProperty('--android-safe-area-top', '0px');
    document.documentElement.style.setProperty('--android-safe-area-bottom', '0px');
    await setupIOSSafeArea();
  }
}

/**
 * Setup safe area for Android devices
 *
 * With fitsSystemWindows=true in MainActivity, the Android system automatically
 * handles status bar and navigation bar insets. We set CSS variables to 0
 * to prevent double-insets from CSS padding.
 */
async function setupAndroidSafeArea(): Promise<void> {
  try {
    // With fitsSystemWindows=true, Android system handles insets automatically
    // Set CSS variables to 0 to prevent double-padding
    document.documentElement.style.setProperty('--android-safe-area-top', '0px');
    document.documentElement.style.setProperty('--android-safe-area-bottom', '0px');

    // Add Android-specific class to body for CSS targeting (if needed)
    document.body.classList.add('platform-android');

    console.log('[SAFE_AREA] Android using fitsSystemWindows - CSS safe areas set to 0');

    // Log status bar info for debugging
    try {
      const statusBarInfo = await StatusBar.getInfo();
      console.log('[SAFE_AREA] Status bar info:', statusBarInfo);
    } catch (e) {
      console.log('[SAFE_AREA] Status bar info not available');
    }

  } catch (error) {
    console.error('[SAFE_AREA] Error setting up Android safe area:', error);
    // Set to 0 - native fitsSystemWindows handles it
    document.documentElement.style.setProperty('--android-safe-area-top', '0px');
    document.documentElement.style.setProperty('--android-safe-area-bottom', '0px');
    document.body.classList.add('platform-android');
  }
}

/**
 * Setup safe area for iOS devices
 */
async function setupIOSSafeArea(): Promise<void> {
  // iOS uses CSS env() automatically, just add platform class
  document.body.classList.add('platform-ios');
  console.log('[SAFE_AREA] iOS platform class added');
}

/**
 * Update safe area on orientation change or resize
 */
export function setupSafeAreaListeners(): void {
  // Use robust platform detection
  if (!isNative()) return;

  const updateSafeArea = () => {
    if (isAndroid()) {
      setupAndroidSafeArea();
    }
  };

  window.addEventListener('resize', updateSafeArea);
  window.addEventListener('orientationchange', updateSafeArea);
}

/**
 * Get current safe area insets
 */
export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const computedStyle = getComputedStyle(document.documentElement);

  const parseInset = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  return {
    top: parseInset(computedStyle.getPropertyValue('--safe-area-inset-top')) ||
         parseInset(computedStyle.getPropertyValue('--android-safe-area-top')),
    bottom: parseInset(computedStyle.getPropertyValue('--safe-area-inset-bottom')) ||
            parseInset(computedStyle.getPropertyValue('--android-safe-area-bottom')),
    left: parseInset(computedStyle.getPropertyValue('--safe-area-inset-left')),
    right: parseInset(computedStyle.getPropertyValue('--safe-area-inset-right')),
  };
}

export default {
  initializeSafeArea,
  setupSafeAreaListeners,
  getSafeAreaInsets,
};
