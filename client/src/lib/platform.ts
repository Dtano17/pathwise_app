/**
 * Platform Detection Utility for Capacitor Mobile Apps
 *
 * Provides utilities to detect the current platform (web, iOS, Android)
 * and conditionally execute platform-specific code.
 *
 * Includes fallback detection for cases where Capacitor bridge
 * initialization is delayed (race condition in WebView).
 */

import { Capacitor } from '@capacitor/core';

/**
 * Fallback detection for Android WebView
 * Used when Capacitor.isNativePlatform() returns false due to timing issues
 */
const isAndroidWebView = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  // Check for Android WebView indicators
  return ua.includes('android') && (
    ua.includes('wv') ||                           // Standard WebView marker
    ua.includes('capacitor') ||                    // Capacitor user agent
    document.URL.startsWith('https://localhost') || // Capacitor local server
    document.URL.startsWith('capacitor://') ||     // Capacitor scheme
    document.URL.startsWith('http://localhost')    // Dev server in WebView
  );
};

/**
 * Fallback detection for iOS WebView
 */
const isIOSWebView = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  // Check for iOS WebView indicators
  const isIOS = /iphone|ipad|ipod/.test(ua);
  return isIOS && (
    document.URL.startsWith('capacitor://') ||
    document.URL.startsWith('ionic://') ||
    // Standalone mode (added to home screen)
    (window.navigator as any).standalone === true
  );
};

/**
 * Check if the app is running as a native mobile app (via Capacitor)
 * Includes fallback detection for WebView environments
 */
export const isNative = (): boolean => {
  // Try Capacitor's native detection first
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  } catch (e) {
    // Capacitor not available or errored
  }

  // Fallback: Check for WebView environment
  return isAndroidWebView() || isIOSWebView();
};

/**
 * Check if the app is running on iOS
 * Includes fallback detection for WebView environments
 */
export const isIOS = (): boolean => {
  try {
    if (Capacitor.getPlatform() === 'ios') {
      return true;
    }
  } catch (e) {
    // Capacitor not available
  }
  return isIOSWebView();
};

/**
 * Check if the app is running on Android
 * Includes fallback detection for WebView environments
 */
export const isAndroid = (): boolean => {
  try {
    if (Capacitor.getPlatform() === 'android') {
      return true;
    }
  } catch (e) {
    // Capacitor not available
  }
  return isAndroidWebView();
};

/**
 * Check if the app is running in a web browser
 */
export const isWeb = (): boolean => {
  return !isNative();
};

/**
 * Get the current platform name
 * @returns 'web' | 'ios' | 'android'
 * Includes fallback detection for WebView environments
 */
export const getPlatform = (): 'web' | 'ios' | 'android' => {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
  } catch (e) {
    // Capacitor not available
  }

  // Fallback detection
  if (isAndroidWebView()) return 'android';
  if (isIOSWebView()) return 'ios';
  return 'web';
};

/**
 * Check if the device is a mobile device (iOS or Android)
 */
export const isMobile = (): boolean => {
  return isIOS() || isAndroid();
};

/**
 * Execute platform-specific code
 * @example
 * platformSwitch({
 *   ios: () => console.log('Running on iOS'),
 *   android: () => console.log('Running on Android'),
 *   web: () => console.log('Running on web')
 * });
 */
export const platformSwitch = <T>(options: {
  ios?: () => T;
  android?: () => T;
  web?: () => T;
  native?: () => T;
  default?: () => T;
}): T | undefined => {
  const platform = getPlatform();

  // Check for native-specific handler first
  if (isNative() && options.native) {
    return options.native();
  }

  // Then check platform-specific handlers
  if (platform === 'ios' && options.ios) {
    return options.ios();
  }

  if (platform === 'android' && options.android) {
    return options.android();
  }

  if (platform === 'web' && options.web) {
    return options.web();
  }

  // Fall back to default if provided
  if (options.default) {
    return options.default();
  }

  return undefined;
};

/**
 * Check if a specific Capacitor plugin is available
 * @param pluginName - The name of the plugin (e.g., 'Camera', 'PushNotifications')
 */
export const isPluginAvailable = (pluginName: string): boolean => {
  return Capacitor.isPluginAvailable(pluginName);
};

/**
 * Get platform-specific configuration values
 */
export const getPlatformConfig = () => {
  return {
    platform: getPlatform(),
    isNative: isNative(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isWeb: isWeb(),
    isMobile: isMobile(),
  };
};

/**
 * Convert platform to a human-readable name
 */
export const getPlatformName = (): string => {
  const platform = getPlatform();
  switch (platform) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return platform;
  }
};

/**
 * Check if running on a tablet (iPad or Android tablet)
 * Note: This is a best-effort detection based on screen size
 */
export const isTablet = (): boolean => {
  if (!isNative()) {
    // For web, use screen size heuristic
    const minDimension = Math.min(window.screen.width, window.screen.height);
    const maxDimension = Math.max(window.screen.width, window.screen.height);
    return minDimension >= 768 && maxDimension >= 1024;
  }

  // For native, check device info (would need Device plugin)
  // This is a placeholder - implement with @capacitor/device if needed
  return false;
};

export default {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  isMobile,
  isTablet,
  getPlatform,
  getPlatformName,
  getPlatformConfig,
  platformSwitch,
  isPluginAvailable,
};
