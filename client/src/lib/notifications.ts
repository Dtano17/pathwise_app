/**
 * Native Push Notifications Manager for Capacitor
 *
 * Handles both web (browser) and native (iOS/Android) push notifications
 * Provides a unified API for requesting permissions and managing notifications
 */

import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative, isIOS, isAndroid } from './platform';
import { apiRequest } from './queryClient';

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
  if (isNative()) {
    return await requestNativePermission();
  } else {
    return await requestWebPermission();
  }
}

/**
 * Request native push notification permissions (iOS/Android)
 */
async function requestNativePermission(): Promise<NotificationPermissionStatus> {
  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive === 'granted') {
      // Register with FCM/APNs
      await PushNotifications.register();

      return {
        granted: true,
        platform: isIOS() ? 'ios' : 'android',
      };
    }

    return {
      granted: false,
      platform: isIOS() ? 'ios' : 'android',
    };
  } catch (error) {
    console.error('Failed to request native push permission:', error);
    return {
      granted: false,
      platform: isIOS() ? 'ios' : 'android',
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
  if (isNative()) {
    const permission = await PushNotifications.checkPermissions();
    return {
      granted: permission.receive === 'granted',
      platform: isIOS() ? 'ios' : 'android',
    };
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
export function initializePushNotifications() {
  if (!isNative()) {
    console.log('Not on native platform, skipping push notification setup');
    return;
  }

  // Registration success - receive FCM/APNs token
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('Push registration success, token:', token.value);

    // Send token to backend
    try {
      await apiRequest('POST', '/api/notifications/register-device', {
        token: token.value,
        platform: isIOS() ? 'ios' : 'android',
      });
      console.log('Device token registered with server');
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  });

  // Registration failed
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Push registration error:', error);
  });

  // Notification received while app is in foreground
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);

      // Show as local notification when app is open
      showLocalNotification({
        title: notification.title || 'JournalMate',
        body: notification.body || '',
        id: Date.now(),
        data: notification.data,
      });
    }
  );

  // Notification tapped/clicked
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);

      // Handle notification tap - navigate to relevant screen
      const data = action.notification.data;
      if (data?.route) {
        // Navigate to route (implement based on your routing)
        window.location.href = data.route;
      }
    }
  );
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
  if (isNative()) {
    // Use Capacitor Local Notifications for native
    try {
      // Request permission if not already granted
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return;
      }

      const notifications = [{
        title: options.title,
        body: options.body,
        id: options.id || Date.now(),
        extra: options.data,
        schedule: options.scheduleAt ? {
          at: options.scheduleAt
        } : undefined,
      }];

      await LocalNotifications.schedule({ notifications });
    } catch (error) {
      console.error('Failed to show local notification:', error);
    }
  } else {
    // Use browser Notification API for web
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: '/icons/pwa/icon-192x192.png',
          badge: '/icons/pwa/icon-72x72.png',
          data: options.data,
          tag: options.id?.toString(),
        });

        // Handle notification click
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
    }
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
  if (isNative()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }
  // Web notifications auto-expire, no cancel needed
}

/**
 * Get all pending/scheduled notifications
 */
export async function getPendingNotifications() {
  if (isNative()) {
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }
  return [];
}

/**
 * Remove device token from server (logout/disable notifications)
 */
export async function unregisterDevice() {
  if (isNative()) {
    try {
      // Get current token first
      const deliveredNotifications = await PushNotifications.getDeliveredNotifications();
      console.log('Unregistering device, delivered:', deliveredNotifications);

      // Remove from server
      await apiRequest('POST', '/api/notifications/unregister-device', {
        platform: isIOS() ? 'ios' : 'android',
      });

      // Remove all listeners
      await PushNotifications.removeAllListeners();
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
