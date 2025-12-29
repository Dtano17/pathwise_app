/**
 * Safe Area Utilities for Capacitor Mobile Apps
 *
 * Handles safe area insets for Android devices where CSS env() doesn't work.
 * On Android, the navigation bar height needs to be calculated and applied manually.
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Standard Android navigation bar heights (in dp, converted to px at runtime)
const ANDROID_NAV_BAR_HEIGHT = 48; // Standard 3-button navigation
const ANDROID_GESTURE_NAV_HEIGHT = 20; // Gesture navigation (pill)

/**
 * Initialize safe area handling for native platforms
 * Call this early in app lifecycle (e.g., in main.tsx)
 */
export async function initializeSafeArea(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[SAFE_AREA] Skipping initialization on web platform');
    return;
  }

  const platform = Capacitor.getPlatform();
  console.log(`[SAFE_AREA] Initializing for ${platform}`);

  if (platform === 'android') {
    await setupAndroidSafeArea();
  } else if (platform === 'ios') {
    // iOS uses CSS env() variables natively, but we ensure they're available
    await setupIOSSafeArea();
  }
}

/**
 * Setup safe area for Android devices
 */
async function setupAndroidSafeArea(): Promise<void> {
  try {
    // Get device pixel ratio for accurate conversion
    const dpr = window.devicePixelRatio || 1;

    // Calculate navigation bar height in CSS pixels
    // On Android, we need to estimate the navigation bar height
    // The actual height depends on the navigation mode (3-button, 2-button, gesture)

    // Use screen height vs viewport height to estimate
    const screenHeight = window.screen.height;
    const viewportHeight = window.innerHeight;
    const statusBarHeight = 24 * dpr; // Standard Android status bar is 24dp

    // Calculate bottom inset (navigation bar area)
    // This is approximate but works for most devices
    let bottomInset = 0;

    // Check if we have a navigation bar by comparing screen vs viewport
    const heightDiff = screenHeight - viewportHeight;
    if (heightDiff > statusBarHeight + 10) {
      // There's a navigation bar
      bottomInset = Math.max(heightDiff - statusBarHeight, ANDROID_NAV_BAR_HEIGHT);
    } else {
      // Gesture navigation - use smaller inset for home indicator
      bottomInset = ANDROID_GESTURE_NAV_HEIGHT;
    }

    // Apply minimum safe area for Android (fallback)
    // This ensures content doesn't overlap with navigation bar
    const minBottomPadding = Math.max(bottomInset / dpr, 48); // At least 48px

    // Set CSS custom properties
    document.documentElement.style.setProperty(
      '--android-safe-area-bottom',
      `${minBottomPadding}px`
    );

    // Add Android-specific class to body for CSS targeting
    document.body.classList.add('platform-android');

    console.log(`[SAFE_AREA] Android bottom inset set to ${minBottomPadding}px`);

    // Also try to use the actual window insets if available via Status Bar plugin
    try {
      const statusBarInfo = await StatusBar.getInfo();
      console.log('[SAFE_AREA] Status bar info:', statusBarInfo);
    } catch (e) {
      console.log('[SAFE_AREA] Status bar info not available');
    }

  } catch (error) {
    console.error('[SAFE_AREA] Error setting up Android safe area:', error);
    // Apply a reasonable default
    document.documentElement.style.setProperty('--android-safe-area-bottom', '48px');
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
  if (!Capacitor.isNativePlatform()) return;

  const updateSafeArea = () => {
    if (Capacitor.getPlatform() === 'android') {
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
    top: parseInset(computedStyle.getPropertyValue('--safe-area-inset-top')),
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
