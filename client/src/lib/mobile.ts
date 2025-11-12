/**
 * Unified Mobile Features Module
 *
 * Central export point for all Capacitor mobile features
 * Provides a single import for all native capabilities
 */

// Platform detection
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
} from './platform';

// Push Notifications
export {
  requestNotificationPermission,
  checkNotificationPermission,
  initializePushNotifications,
  showLocalNotification,
  scheduleReminder,
  cancelNotification,
  getPendingNotifications,
  unregisterDevice,
} from './notifications';

// Camera & Photos
export {
  capturePhoto,
  takePhoto,
  selectFromGallery,
  selectMultiplePhotos,
  compressPhoto,
  isCameraAvailable,
  requestCameraPermissions,
} from './camera';

// Social Sharing
export {
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

// Contacts
export {
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

// Storage & Offline
export {
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

// Haptic Feedback
export {
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

// Geolocation
export {
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
  const { isNative } = await import('./platform');
  const { initializePushNotifications } = await import('./notifications');

  if (isNative()) {
    // Initialize push notifications
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
