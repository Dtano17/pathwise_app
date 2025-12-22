import admin from 'firebase-admin';
import type { Storage } from '../storage.js';

let fcmApp: admin.app.App | null = null;

/**
 * Initialize Firebase Cloud Messaging for push notifications
 *
 * Requires Firebase service account credentials in environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 */
export function initializePushNotifications() {
  if (fcmApp) {
    console.log('[PUSH] Firebase already initialized');
    return fcmApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[PUSH] Firebase credentials not configured - push notifications disabled');
    console.warn('[PUSH] Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    return null;
  }

  try {
    fcmApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    }, 'push-notifications');

    console.log('[PUSH] Firebase Cloud Messaging initialized successfully');
    return fcmApp;
  } catch (error) {
    console.error('[PUSH] Failed to initialize Firebase:', error);
    return null;
  }
}

export class PushNotificationService {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  /**
   * Send push notification to a specific user across all their devices
   */
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
    if (!fcmApp) {
      console.log('[PUSH] Push notifications not configured, skipping send');
      return { success: false, sentCount: 0, failedCount: 0 };
    }

    try {
      // Get all device tokens for this user
      const devices = await this.storage.getUserDeviceTokens(userId);

      if (devices.length === 0) {
        console.log(`[PUSH] No device tokens found for user ${userId}`);
        return { success: true, sentCount: 0, failedCount: 0 };
      }

      // Extract token strings from DeviceToken objects
      const deviceTokens = devices.map(d => d.token);

      // Send to all devices using FCM multicast
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        // Platform-specific options
        android: {
          priority: 'high',
          notification: {
            channelId: 'group_updates',
            sound: 'default',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging(fcmApp).sendEachForMulticast(message);

      console.log(`[PUSH] Sent to user ${userId}: ${response.successCount}/${deviceTokens.length} devices`);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = (resp.error as any)?.code;
            if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
              failedTokens.push(deviceTokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          // Remove invalid tokens one by one
          await Promise.all(
            failedTokens.map(token => this.storage.deleteDeviceToken(token, userId))
          );
          console.log(`[PUSH] Removed ${failedTokens.length} invalid tokens for user ${userId}`);
        }
      }

      return {
        success: response.successCount > 0,
        sentCount: response.successCount,
        failedCount: response.failureCount,
      };
    } catch (error) {
      console.error(`[PUSH] Error sending to user ${userId}:`, error);
      return { success: false, sentCount: 0, failedCount: 0 };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ): Promise<{ totalSent: number; totalFailed: number }> {
    let totalSent = 0;
    let totalFailed = 0;

    // Send to each user in parallel
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        totalSent += result.value.sentCount;
        totalFailed += result.value.failedCount;
      } else {
        console.error(`[PUSH] Failed to send to user ${userIds[idx]}:`, result.reason);
      }
    });

    console.log(`[PUSH] Batch send complete: ${totalSent} sent, ${totalFailed} failed`);

    return { totalSent, totalFailed };
  }

  /**
   * Send notification to all members of a group except the actor
   */
  async sendToGroup(
    groupId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
    excludeUserId?: string
  ): Promise<{ totalSent: number; totalFailed: number }> {
    try {
      // Get all group members
      const members = await this.storage.getGroupMembers(groupId);

      // Filter out the excluded user (usually the person who triggered the notification)
      const recipientIds = members
        .map(m => m.userId)
        .filter(userId => userId !== excludeUserId);

      if (recipientIds.length === 0) {
        console.log(`[PUSH] No recipients for group ${groupId} notification`);
        return { totalSent: 0, totalFailed: 0 };
      }

      console.log(`[PUSH] Sending to group ${groupId}: ${recipientIds.length} members`);

      return await this.sendToUsers(recipientIds, notification);
    } catch (error) {
      console.error(`[PUSH] Error sending to group ${groupId}:`, error);
      return { totalSent: 0, totalFailed: 0 };
    }
  }
}
