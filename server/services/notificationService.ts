/**
 * Push Notification Service
 * Handles sending push notifications via FCM (Android) and APNs (iOS)
 */

import type { IStorage } from '../storage';
import { PushNotificationService } from './pushNotificationService';
import { SocketService } from './socketService';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  route?: string; // Deep link route
}

export interface GroupNotificationOptions {
  groupId: string;
  actorUserId?: string; // Who triggered the notification
  excludeUserIds?: string[]; // Users to exclude from notification
  notificationType: 'member_added' | 'member_removed' | 'activity_shared' | 'task_completed' | 'task_added' | 'activity_updated';
  payload: NotificationPayload;
}

/**
 * Send push notification to group members
 */
export async function sendGroupNotification(
  storage: IStorage,
  options: GroupNotificationOptions
): Promise<void> {
  const { groupId, actorUserId, excludeUserIds = [], notificationType, payload } = options;

  try {
    // Get all group members
    const memberships = await storage.getGroupMembers(groupId);
    
    // Filter out excluded users and get user IDs
    const targetUserIds = memberships
      .filter(m => !excludeUserIds.includes(m.userId))
      .map(m => m.userId);

    if (targetUserIds.length === 0) {
      console.log(`[NOTIFICATION] No members to notify for group ${groupId}`);
      return;
    }

    // Create in-app notification records for all target users
    const notificationPromises = targetUserIds.map(async (userId) => {
      try {
        // Create in-app notification record in database
        // This will be fetched and displayed by the frontend
        await storage.createUserNotification({
          userId,
          sourceGroupId: groupId,
          actorUserId: actorUserId || null,
          type: notificationType,
          title: payload.title,
          body: payload.body || null,
          metadata: payload.data || {},
        });

        console.log(`[NOTIFICATION] Created in-app notification for user ${userId}:`, {
          title: payload.title,
          body: payload.body,
          type: notificationType,
        });

      } catch (error) {
        console.error(`[NOTIFICATION] Failed to create notification for user ${userId}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    console.log(`[NOTIFICATION] Group notification created for ${targetUserIds.length} members`);

    // Send push notifications to all target users' devices
    const pushService = new PushNotificationService(storage);
    await pushService.sendToUsers(targetUserIds, {
      title: payload.title,
      body: payload.body,
      data: {
        ...payload.data,
        groupId,
        notificationType,
        route: payload.route || `/groups/${groupId}`,
      },
    });
  } catch (error) {
    console.error('[NOTIFICATION] Failed to send group notification:', error);
    throw error;
  }
}

/**
 * Send notification to a specific user
 *
 * This function:
 * 1. ALWAYS creates an in-app notification record (for the bell icon)
 * 2. Optionally sends a push notification if the user has enabled them and has devices
 */
export async function sendUserNotification(
  storage: IStorage,
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    // Check user's notification preferences
    let prefs = await storage.getNotificationPreferences(userId);

    // Create default preferences if none exist (new users should get notifications by default)
    if (!prefs) {
      console.log(`[NOTIFICATION] Creating default notification preferences for user ${userId}`);
      prefs = await storage.createNotificationPreferences({
        userId: userId,
        enableBrowserNotifications: true,
        enableTaskReminders: true,
        enableDeadlineWarnings: true,
        enableDailyPlanning: false,
        enableGroupNotifications: true,
        enableStreakReminders: true,
        enableAccountabilityReminders: true,
        reminderLeadTime: 30,
        dailyPlanningTime: "09:00",
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      });
    }
    // ALWAYS create in-app notification record first (for the bell icon)
    // This should happen regardless of push notification settings
    await storage.createUserNotification({
      userId,
      sourceGroupId: null,
      actorUserId: null,
      type: payload.data?.notificationType || 'general',
      title: payload.title,
      body: payload.body || null,
      metadata: payload.data || {},
    });

    console.log(`[NOTIFICATION] Created in-app notification for user ${userId}:`, {
      title: payload.title,
      body: payload.body,
    });

    // Emit WebSocket event so NotificationBell updates in real-time
    SocketService.emitToUser(userId, 'notification', {
      title: payload.title,
      body: payload.body,
      type: payload.data?.notificationType || 'general',
      timestamp: new Date().toISOString(),
    });

    // Check if user has push notifications enabled (prefs already loaded above)
    if (!prefs?.enableBrowserNotifications) {
      console.log(`[NOTIFICATION] User ${userId} has push notifications disabled, skipping push`);
      return;
    }

    // Get active device tokens for push notifications
    const devices = await storage.getUserDeviceTokens(userId);
    const activeDevices = devices.filter(d => d.isActive);

    if (activeDevices.length === 0) {
      console.log(`[NOTIFICATION] No active devices for user ${userId}, skipping push`);
      return;
    }

    // Send push notification via FCM/APNs
    const pushService = new PushNotificationService(storage);
    const result = await pushService.sendToUser(userId, {
      title: payload.title,
      body: payload.body,
      data: payload.data ? Object.fromEntries(
        Object.entries(payload.data).map(([k, v]) => [k, String(v)])
      ) : undefined,
    });

    console.log(`[NOTIFICATION] Push sent to user ${userId}:`, {
      title: payload.title,
      body: payload.body,
      devices: activeDevices.length,
      sent: result.sentCount,
      failed: result.failedCount,
    });

  } catch (error) {
    console.error(`[NOTIFICATION] Failed to send notification to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if user should notify admin when making changes
 */
export async function shouldNotifyAdmin(
  storage: IStorage,
  userId: string
): Promise<boolean> {
  try {
    const prefs = await storage.getNotificationPreferences(userId);
    return prefs?.notifyAdminOnChanges ?? true; // Default to true
  } catch (error) {
    console.error('[NOTIFICATION] Failed to check admin notification preference:', error);
    return true; // Default to notifying admin on error
  }
}
