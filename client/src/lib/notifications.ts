/**
 * Native Push Notifications Manager for Capacitor
 *
 * Handles both web (browser) and native (iOS/Android) push notifications
 * Provides a unified API for requesting permissions and managing notifications
 *
 * For Android & iOS: Uses @capacitor/local-notifications (official plugin)
 * For Web: Uses browser Notification API
 */

import { isNative, isIOS, isAndroid } from './platform';
import { apiRequest } from './queryClient';

// Dynamically import Capacitor LocalNotifications for native platforms
const getLocalNotifications = async () => {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
};

// =============================================================================
// LEGACY: Custom NativeNotifications plugin (commented out - kept for reference)
// This was used before switching to @capacitor/local-notifications
// =============================================================================
/*
// Define interface for our custom NativeNotifications plugin
interface NativeNotificationsPlugin {
  checkPermission(): Promise<{ granted: boolean; platform: string }>;
  requestPermission(): Promise<{ granted: boolean; platform: string }>;
  show(options: { title: string; body: string; id?: number }): Promise<{ success: boolean; id?: number; error?: string }>;
  cancel(options: { id: number }): Promise<{ success: boolean }>;
  cancelAll(): Promise<{ success: boolean }>;
}

// Get the custom NativeNotifications plugin from the Capacitor bridge
// Uses direct bridge access which works with remote URLs (unlike registerPlugin)
function getNativeNotificationsPlugin(): NativeNotificationsPlugin | null {
  try {
    const capacitor = (window as any).Capacitor;

    // Enhanced diagnostic logging for debugging Android notification issues
    console.log('[NOTIFICATIONS] Plugin lookup:', {
      hasCapacitor: !!capacitor,
      hasPlugins: !!capacitor?.Plugins,
      hasNativeNotifications: !!capacitor?.Plugins?.NativeNotifications,
      allPlugins: capacitor?.Plugins ? Object.keys(capacitor.Plugins) : [],
      isNativePlatform: capacitor?.isNativePlatform?.() ?? false,
      platform: capacitor?.getPlatform?.() ?? 'unknown'
    });

    if (capacitor?.Plugins?.NativeNotifications) {
      return capacitor.Plugins.NativeNotifications as NativeNotificationsPlugin;
    }
    return null;
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to get NativeNotifications plugin:', error);
    return null;
  }
}
*/
// =============================================================================

export interface NotificationPermissionStatus {
  granted: boolean;
  platform: 'web' | 'ios' | 'android';
  token?: string;
}

/**
 * Request notification permissions
 * Works for both web and native platforms
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isAndroid()) {
    return await requestAndroidPermission();
  } else if (isIOS()) {
    return await requestIOSPermission();
  } else {
    return await requestWebPermission();
  }
}

/**
 * Request Android notification permission using official Capacitor plugins
 * Uses @capacitor/local-notifications for local notifications
 * Uses @capacitor/push-notifications for FCM push notifications
 */
async function requestAndroidPermission(): Promise<NotificationPermissionStatus> {
  try {
    console.log('[NOTIFICATIONS] Requesting Android permission via @capacitor/local-notifications');

    // Step 1: Request local notification permission
    const LocalNotifications = await getLocalNotifications();
    const localPermResult = await LocalNotifications.requestPermissions();
    console.log('[NOTIFICATIONS] Local notification permission result:', localPermResult);

    if (localPermResult.display !== 'granted') {
      console.warn('[NOTIFICATIONS] Local notification permission not granted');
      return {
        granted: false,
        platform: 'android',
      };
    }

    // Step 2: Register with FCM to get push token
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request push notification permission (needed on Android 13+)
      const pushPermResult = await PushNotifications.requestPermissions();
      console.log('[NOTIFICATIONS] Push notification permission result:', pushPermResult);

      if (pushPermResult.receive === 'granted') {
        // Add listener for FCM token
        await PushNotifications.addListener('registration', async (token) => {
          console.log('[NOTIFICATIONS] FCM token received:', token.value);

          // Send token to server
          try {
            await apiRequest('POST', '/api/user/device-token', {
              token: token.value,
              platform: 'android',
              deviceName: 'Android Device'
            });
            console.log('[NOTIFICATIONS] FCM token registered with server');
          } catch (serverError) {
            console.error('[NOTIFICATIONS] Failed to send token to server:', serverError);
          }
        });

        // Add listener for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('[NOTIFICATIONS] FCM registration error:', error);
        });

        // Register with FCM
        await PushNotifications.register();
        console.log('[NOTIFICATIONS] FCM registration initiated');
      }

    } catch (fcmError) {
      console.error('[NOTIFICATIONS] FCM registration failed:', fcmError);
      // Permission was granted but FCM failed - still return success for local notifications
    }

    return {
      granted: true,
      platform: 'android',
    };
  } catch (error: any) {
    console.error('[NOTIFICATIONS] Failed to request Android permission:', error);
    // Fallback to web notifications if plugin fails
    return await requestWebPermission();
  }
}

/**
 * Request iOS notification permission using Capacitor plugins and register with APNs
 */
async function requestIOSPermission(): Promise<NotificationPermissionStatus> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive === 'granted') {
      // Add listener for APNs token
      await PushNotifications.addListener('registration', async (token) => {
        console.log('[NOTIFICATIONS] APNs token received:', token.value);

        // Send token to server
        try {
          await apiRequest('POST', '/api/user/device-token', {
            token: token.value,
            platform: 'ios',
            deviceName: 'iOS Device'
          });
          console.log('[NOTIFICATIONS] APNs token registered with server');
        } catch (serverError) {
          console.error('[NOTIFICATIONS] Failed to send token to server:', serverError);
        }
      });

      // Add listener for registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[NOTIFICATIONS] APNs registration error:', error);
      });

      await PushNotifications.register();
      return {
        granted: true,
        platform: 'ios',
      };
    }

    return {
      granted: false,
      platform: 'ios',
    };
  } catch (error: any) {
    console.error('[NOTIFICATIONS] Failed to request iOS permission:', error);
    return {
      granted: false,
      platform: 'ios',
    };
  }
}

/**
 * Request web browser notification permissions
 */
async function requestWebPermission(): Promise<NotificationPermissionStatus> {
  if (!('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return { granted: false, platform: 'web' };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      platform: 'web',
    };
  } catch (error) {
    console.error('Failed to request web notification permission:', error);
    return { granted: false, platform: 'web' };
  }
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isAndroid()) {
    try {
      console.log('[NOTIFICATIONS] Checking Android permission via @capacitor/local-notifications');
      const LocalNotifications = await getLocalNotifications();
      const result = await LocalNotifications.checkPermissions();
      console.log('[NOTIFICATIONS] Android permission status:', result);
      return {
        granted: result.display === 'granted',
        platform: 'android',
      };
    } catch (error: any) {
      console.error('[NOTIFICATIONS] Failed to check Android permission:', error);
      // Fallback to web permission check
      if (!('Notification' in window)) {
        return { granted: false, platform: 'web' };
      }
      return {
        granted: Notification.permission === 'granted',
        platform: 'web',
      };
    }
  } else if (isIOS()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permission = await PushNotifications.checkPermissions();
      return {
        granted: permission.receive === 'granted',
        platform: 'ios',
      };
    } catch (error: any) {
      console.error('[NOTIFICATIONS] Failed to check iOS permission:', error);
      return { granted: false, platform: 'ios' };
    }
  } else {
    if (!('Notification' in window)) {
      return { granted: false, platform: 'web' };
    }
    return {
      granted: Notification.permission === 'granted',
      platform: 'web',
    };
  }
}

/**
 * Initialize push notification listeners for native platforms
 */
export async function initializePushNotifications() {
  if (!isNative()) {
    console.log('Not on native platform, skipping push notification setup');
    return;
  }

  if (isAndroid()) {
    // Android uses @capacitor/local-notifications (official plugin)
    // Set up listeners for notification actions
    try {
      const LocalNotifications = await getLocalNotifications();

      // Listen for notification tap actions
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('[NOTIFICATIONS] Android notification action performed:', action);
        const data = action.notification.extra;
        if (data?.route) {
          window.location.href = data.route;
        }
      });

      console.log('[NOTIFICATIONS] Android native notifications initialized via @capacitor/local-notifications');
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to initialize Android notifications:', error);
    }
    return;
  }

  /* LEGACY: Custom NativeNotifications plugin approach (commented out)
  if (isAndroid()) {
    // Android uses our custom NativeNotifications plugin
    // No additional setup needed - it's ready to use
    console.log('[NOTIFICATIONS] Android native notifications initialized via custom plugin');
    return;
  }
  */

  // iOS uses standard Capacitor PushNotifications
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Test if plugin is actually available
    await PushNotifications.checkPermissions();

    // Registration success - receive APNs token
    PushNotifications.addListener('registration', async (token: any) => {
      console.log('Push registration success, token:', token.value);

      try {
        await apiRequest('POST', '/api/notifications/register-device', {
          token: token.value,
          platform: 'ios',
        });
        console.log('Device token registered with server');
      } catch (error) {
        console.error('Failed to register device token:', error);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: any) => {
        console.log('Push notification received:', notification);
        showLocalNotification({
          title: notification.title || 'JournalMate',
          body: notification.body || '',
          id: Date.now(),
          data: notification.data,
        });
      }
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: any) => {
        console.log('Push notification action performed:', action);
        const data = action.notification.data;
        if (data?.route) {
          window.location.href = data.route;
        }
      }
    );
  } catch (error: any) {
    console.warn('[NOTIFICATIONS] iOS push notifications unavailable:', error?.message);
  }
}

/**
 * Show a local notification (works on both web and native)
 */
export async function showLocalNotification(options: {
  title: string;
  body: string;
  id?: number;
  data?: any;
  scheduleAt?: Date;
}) {
  const notificationId = options.id || Date.now();

  if (isAndroid()) {
    // Use @capacitor/local-notifications for Android (official plugin)
    try {
      console.log('[NOTIFICATIONS] Showing Android notification via @capacitor/local-notifications:', options.title);
      const LocalNotifications = await getLocalNotifications();

      // Check permission first
      const permResult = await LocalNotifications.checkPermissions();
      if (permResult.display !== 'granted') {
        console.warn('[NOTIFICATIONS] Android notification permission not granted, requesting...');
        const requestResult = await LocalNotifications.requestPermissions();
        if (requestResult.display !== 'granted') {
          console.error('[NOTIFICATIONS] Android notification permission denied');
          showWebNotification(options);
          return;
        }
      }

      // Schedule the notification (immediate if no scheduleAt)
      await LocalNotifications.schedule({
        notifications: [{
          title: options.title,
          body: options.body,
          id: notificationId,
          extra: options.data,
          schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
          // Android-specific options for notification shade appearance
          smallIcon: 'ic_stat_notification',
          largeIcon: 'ic_launcher',
          sound: 'default',
        }],
      });
      console.log('[NOTIFICATIONS] Android notification scheduled successfully, id:', notificationId);
    } catch (error: any) {
      console.error('[NOTIFICATIONS] Failed to show Android notification:', error);
      showWebNotification(options);
    }

    /* LEGACY: Custom NativeNotifications plugin approach (commented out)
    try {
      const plugin = getNativeNotificationsPlugin();
      if (!plugin) {
        console.warn('[NOTIFICATIONS] NativeNotifications plugin not available, using web notification');
        showWebNotification(options);
        return;
      }
      console.log('[NOTIFICATIONS] Showing Android notification:', options.title);
      const result = await plugin.show({
        title: options.title,
        body: options.body,
        id: notificationId,
      });
      console.log('[NOTIFICATIONS] Android notification result:', result);

      if (!result.success) {
        console.error('[NOTIFICATIONS] Android notification failed:', result.error);
        showWebNotification(options);
      }
    } catch (error: any) {
      console.error('[NOTIFICATIONS] Failed to show Android notification:', error);
      showWebNotification(options);
    }
    */
  } else if (isIOS()) {
    // Use Capacitor LocalNotifications for iOS
    try {
      const LocalNotifications = await getLocalNotifications();
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return;
      }

      const notifications = [{
        title: options.title,
        body: options.body,
        id: notificationId,
        extra: options.data,
        schedule: options.scheduleAt ? {
          at: options.scheduleAt
        } : undefined,
      }];

      await LocalNotifications.schedule({ notifications });
    } catch (error: any) {
      console.error('[NOTIFICATIONS] Failed to show iOS notification:', error);
      showWebNotification(options);
    }
  } else {
    // Web platform
    showWebNotification(options);
  }
}

/**
 * Show a web browser notification
 * Used as primary method for web and fallback when native plugins unavailable
 */
function showWebNotification(options: {
  title: string;
  body: string;
  id?: number;
  data?: any;
}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/icons/pwa/icon-192x192.png',
        badge: '/icons/pwa/icon-72x72.png',
        data: options.data,
        tag: options.id?.toString(),
      });

      notification.onclick = () => {
        window.focus();
        if (options.data?.route) {
          window.location.href = options.data.route;
        }
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  } else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showWebNotification(options);
      }
    });
  }
}

/**
 * Schedule a reminder notification
 */
export async function scheduleReminder(options: {
  title: string;
  body: string;
  scheduleAt: Date;
  reminderId?: string;
  data?: any;
}) {
  await showLocalNotification({
    title: options.title,
    body: options.body,
    id: options.reminderId ? parseInt(options.reminderId, 36) : Date.now(),
    data: { ...options.data, reminderId: options.reminderId },
    scheduleAt: options.scheduleAt,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(id: number) {
  if (isAndroid()) {
    // Use @capacitor/local-notifications for Android
    try {
      const LocalNotifications = await getLocalNotifications();
      await LocalNotifications.cancel({ notifications: [{ id }] });
      console.log('[NOTIFICATIONS] Android notification cancelled, id:', id);
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to cancel Android notification:', error);
    }

    /* LEGACY: Custom NativeNotifications plugin approach (commented out)
    try {
      const plugin = getNativeNotificationsPlugin();
      if (plugin) {
        await plugin.cancel({ id });
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to cancel Android notification:', error);
    }
    */
  } else if (isIOS()) {
    try {
      const LocalNotifications = await getLocalNotifications();
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to cancel iOS notification:', error);
    }
  }
  // Web notifications auto-expire, no cancel needed
}

/**
 * Get all pending/scheduled notifications
 */
export async function getPendingNotifications() {
  // Now works for both iOS and Android since we use @capacitor/local-notifications for both
  if (isIOS() || isAndroid()) {
    try {
      const LocalNotifications = await getLocalNotifications();
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }
  // Web doesn't support pending notifications query
  return [];
}

/**
 * Remove device token from server (logout/disable notifications)
 */
export async function unregisterDevice() {
  if (isNative()) {
    try {
      console.log('Unregistering device...');
      await apiRequest('POST', '/api/notifications/unregister-device', {
        platform: isIOS() ? 'ios' : 'android',
      });

      if (isIOS()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.removeAllListeners();
      }
    } catch (error) {
      console.error('Failed to unregister device:', error);
    }
  }
}

export default {
  requestNotificationPermission,
  checkNotificationPermission,
  initializePushNotifications,
  showLocalNotification,
  scheduleReminder,
  cancelNotification,
  getPendingNotifications,
  unregisterDevice,
};
