// PushNotifications import is handled dynamically to avoid errors on web
import { Capacitor } from '@capacitor/core';
import { isNative } from '@/lib/mobile';

let isInitialized = false;

/**
 * Initialize push notifications for the current user
 * Call this after user authentication
 */
export async function initializePushNotifications(userId: string): Promise<void> {
  if (isInitialized) {
    console.log('[PUSH] Already initialized');
    return;
  }

  // Only initialize on native platforms (iOS/Android)
  if (!isNative()) {
    console.log('[PUSH] Web push notifications not yet supported');
    return;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    console.log('[PUSH] Initializing for user:', userId);

    // Request permission to receive push notifications
    const permResult = await PushNotifications.requestPermissions();

    if (permResult.receive !== 'granted') {
      console.warn('[PUSH] Permission not granted:', permResult.receive);
      return;
    }

    console.log('[PUSH] Permission granted');

    // Register with APNs/FCM to get a token
    await PushNotifications.register();

    // Listen for registration success
    await PushNotifications.addListener('registration', async (token: any) => {
      console.log('[PUSH] Registration success:', token.value);

      // Send token to backend
      await registerDeviceToken(token.value, userId);
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[PUSH] Registration error:', error);
    });

    // Listen for push notifications when app is in foreground
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: any) => {
        console.log('[PUSH] Received notification (foreground):', notification);

        // You can show a custom in-app notification here
        // For now, just log it
      }
    );

    // Listen for notification tap (when app is in background)
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: any) => {
        console.log('[PUSH] Notification action performed:', notification);

        // Handle deep linking based on notification data
        const data = notification.notification.data;
        if (data?.route) {
          // Navigate to the route specified in notification data
          window.location.href = data.route;
        }
      }
    );

    isInitialized = true;
    console.log('[PUSH] Initialization complete');
  } catch (error) {
    console.error('[PUSH] Initialization failed:', error);
  }
}

/**
 * Register device token with backend
 */
async function registerDeviceToken(token: string, userId: string): Promise<void> {
  try {
    const platform = Capacitor.getPlatform();
    const deviceName = await getDeviceName();

    const response = await fetch('/api/user/device-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        token,
        platform,
        deviceName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register device token');
    }

    console.log('[PUSH] Device token registered with backend');
  } catch (error) {
    console.error('[PUSH] Failed to register token with backend:', error);
  }
}

/**
 * Get device name for display purposes
 */
async function getDeviceName(): Promise<string> {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') {
    return 'iPhone'; // You could use Device plugin to get actual model
  } else if (platform === 'android') {
    return 'Android Device';
  } else {
    return 'Web Browser';
  }
}

/**
 * Unregister push notifications (call on logout)
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!isNative() || !isInitialized) {
    return;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    console.log('[PUSH] Unregistering...');

    // Get current token to unregister from backend
    const channels = await PushNotifications.listChannels();
    console.log('[PUSH] Available channels:', channels);

    // Remove all listeners
    await PushNotifications.removeAllListeners();

    // Note: We don't actually unregister from APNs/FCM as the token
    // is still valid. We just remove our listeners and mark it inactive
    // on the backend when the user logs out.

    isInitialized = false;
    console.log('[PUSH] Unregistered successfully');
  } catch (error) {
    console.error('[PUSH] Unregistration failed:', error);
  }
}

/**
 * Check if push notifications are supported on this platform
 */
export function isPushNotificationsSupported(): boolean {
  return isNative();
}
