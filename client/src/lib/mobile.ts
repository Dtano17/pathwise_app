/**
 * Unified Mobile Features Module
 *
 * Central export point for all Capacitor mobile features
 * Provides a single import for all native capabilities
 */

// Import all platform detection functions
import {
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
} from './platform';

// Import notifications
import {
  requestNotificationPermission,
  checkNotificationPermission,
  initializePushNotifications,
  showLocalNotification,
  scheduleReminder,
  cancelNotification,
  getPendingNotifications,
  unregisterDevice,
} from './notifications';

// Import camera functions
import {
  capturePhoto,
  takePhoto,
  selectFromGallery,
  selectMultiplePhotos,
  compressPhoto,
  isCameraAvailable,
  requestCameraPermissions,
} from './camera';

// Import sharing functions
import {
  share,
  shareActivity,
  shareJournal,
  shareAchievement,
  shareAppInvite,
  shareToSocialMedia,
  shareViaMessage,
  canShareContent,
  generateActivityShareLink,
  generateJournalShareLink,
  copyToClipboard,
  SocialPlatforms,
} from './sharing';

// Import contacts functions
import {
  requestContactsPermission,
  checkContactsPermission,
  getContacts,
  searchContacts,
  getContactById,
  pickContact,
  inviteContacts,
  syncContactsWithServer,
  getContactsOnJournalMate,
} from './contacts';

// Import storage functions
import {
  saveData,
  loadData,
  removeData,
  clearAllData,
  saveFile,
  readFile,
  deleteFile,
  fileExists,
  cacheData,
  getCachedData,
  saveJournalOffline,
  getOfflineJournals,
  syncOfflineJournals,
  saveImageToCache,
  getImageFromCache,
  getStorageInfo,
} from './storage';

// Import haptics functions
import {
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
} from './haptics';

// Import geolocation functions
import {
  requestLocationPermission,
  checkLocationPermission,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  calculateDistance,
  formatDistance,
  getAddressFromCoordinates,
  getCurrentLocationWithAddress,
  isNearLocation,
  generateMapsLink,
  openInMaps,
} from './geolocation';

// Re-export everything as named exports
export {
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
  requestNotificationPermission,
  checkNotificationPermission,
  initializePushNotifications,
  showLocalNotification,
  scheduleReminder,
  cancelNotification,
  getPendingNotifications,
  unregisterDevice,
  capturePhoto,
  takePhoto,
  selectFromGallery,
  selectMultiplePhotos,
  compressPhoto,
  isCameraAvailable,
  requestCameraPermissions,
  share,
  shareActivity,
  shareJournal,
  shareAchievement,
  shareAppInvite,
  shareToSocialMedia,
  shareViaMessage,
  canShareContent,
  generateActivityShareLink,
  generateJournalShareLink,
  copyToClipboard,
  SocialPlatforms,
  requestContactsPermission,
  checkContactsPermission,
  getContacts,
  searchContacts,
  getContactById,
  pickContact,
  inviteContacts,
  syncContactsWithServer,
  getContactsOnJournalMate,
  saveData,
  loadData,
  removeData,
  clearAllData,
  saveFile,
  readFile,
  deleteFile,
  fileExists,
  cacheData,
  getCachedData,
  saveJournalOffline,
  getOfflineJournals,
  syncOfflineJournals,
  saveImageToCache,
  getImageFromCache,
  getStorageInfo,
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
  requestLocationPermission,
  checkLocationPermission,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  calculateDistance,
  formatDistance,
  getAddressFromCoordinates,
  getCurrentLocationWithAddress,
  isNearLocation,
  generateMapsLink,
  openInMaps,
};

// Convenience re-exports of types
export type { NotificationPermissionStatus } from './notifications';
export type { CameraOptions, CapturedPhoto } from './camera';
export type { ShareContentOptions, ShareActivityOptions, ShareJournalOptions, ShareAchievementOptions } from './sharing';
export type { SimpleContact, ContactInviteOptions } from './contacts';
export type { CachedData, StorageOptions } from './storage';
export type { HapticFeedbackType } from './haptics';
export type { LocationCoords, LocationWithAddress } from './geolocation';

/**
 * Initialize all mobile features on app startup
 */
export async function initializeMobileFeatures() {
  if (isNative()) {
    initializePushNotifications();
    console.log('Mobile features initialized');
  }
}

// Default export with all features
export default {
  // Platform
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  isMobile,
  getPlatform,
  platformSwitch,

  // Notifications
  requestNotificationPermission,
  initializePushNotifications,
  showLocalNotification,

  // Camera
  takePhoto,
  selectFromGallery,
  capturePhoto,

  // Sharing
  share,
  shareActivity,
  shareAppInvite,

  // Contacts
  getContacts,
  inviteContacts,

  // Storage
  saveData,
  loadData,
  cacheData,
  getCachedData,

  // Haptics
  triggerHaptic,
  hapticsSuccess,
  hapticsError,

  // Location
  getCurrentLocation,
  getCurrentLocationWithAddress,

  // Init
  initializeMobileFeatures,
};
