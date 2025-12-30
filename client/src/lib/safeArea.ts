/**
 * Safe Area Utilities for Capacitor Mobile Apps
 *
 * Handles safe area insets for Android devices where CSS env() doesn't work.
 * On Android, both status bar (top) and navigation bar (bottom) heights
 * need to be calculated and applied manually.
 */

import { StatusBar } from '@capacitor/status-bar';
import { isNative, isAndroid, isIOS, getPlatform } from './platform';

// Standard Android dimensions (in dp)
const ANDROID_STATUS_BAR_HEIGHT = 24; // Standard status bar
const ANDROID_NAV_BAR_HEIGHT = 48; // Standard 3-button navigation
const ANDROID_GESTURE_NAV_HEIGHT = 20; // Gesture navigation (pill)

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
 */
async function setupAndroidSafeArea(): Promise<void> {
  try {
    // Get device pixel ratio for accurate conversion
    const dpr = window.devicePixelRatio || 1;

    // Calculate status bar height (top)
    // Standard Android status bar is 24dp
    const topInset = Math.round(ANDROID_STATUS_BAR_HEIGHT * dpr / dpr); // ~24px

    // Use screen height vs viewport height to estimate navigation bar
    const screenHeight = window.screen.height;
    const viewportHeight = window.innerHeight;
    const statusBarHeightPx = 24 * dpr;

    // Calculate bottom inset (navigation bar area)
    let bottomInset = 0;

    // Check if we have a navigation bar by comparing screen vs viewport
    const heightDiff = screenHeight - viewportHeight;
    if (heightDiff > statusBarHeightPx + 10) {
      // There's a navigation bar
      bottomInset = Math.max(heightDiff - statusBarHeightPx, ANDROID_NAV_BAR_HEIGHT);
    } else {
      // Gesture navigation - use smaller inset for home indicator
      bottomInset = ANDROID_GESTURE_NAV_HEIGHT;
    }

    // Apply minimum safe areas for Android
    const minTopPadding = Math.max(topInset, 24); // At least 24px for status bar
    const minBottomPadding = Math.max(bottomInset / dpr, 48); // At least 48px for nav bar

    // Set CSS custom properties for BOTH top and bottom
    document.documentElement.style.setProperty(
      '--android-safe-area-top',
      `${minTopPadding}px`
    );
    document.documentElement.style.setProperty(
      '--android-safe-area-bottom',
      `${minBottomPadding}px`
    );

    // Add Android-specific class to body for CSS targeting
    document.body.classList.add('platform-android');

    console.log(`[SAFE_AREA] Android safe areas set: top=${minTopPadding}px, bottom=${minBottomPadding}px`);

    // Try to get actual status bar info if available
    try {
      const statusBarInfo = await StatusBar.getInfo();
      console.log('[SAFE_AREA] Status bar info:', statusBarInfo);
    } catch (e) {
      console.log('[SAFE_AREA] Status bar info not available');
    }

  } catch (error) {
    console.error('[SAFE_AREA] Error setting up Android safe area:', error);
    // Apply reasonable defaults for Android
    document.documentElement.style.setProperty('--android-safe-area-top', '24px');
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
