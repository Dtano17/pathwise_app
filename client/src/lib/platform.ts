/**
 * Platform Detection Utility for Capacitor Mobile Apps
 *
 * Provides utilities to detect the current platform (web, iOS, Android)
 * and conditionally execute platform-specific code.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if the app is running as a native mobile app (via Capacitor)
 */
export const isNative = (): boolean => {
  const result = Capacitor.isNativePlatform();
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[PLATFORM] isNative() = ${result}, Platform: ${Capacitor.getPlatform()}`);
  }
  return result;
};

/**
 * Check if the app is running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if the app is running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if the app is running in a web browser
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get the current platform name
 * @returns 'web' | 'ios' | 'android'
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
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
