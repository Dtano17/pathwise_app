/**
 * Smart Notification Scheduler
 *
 * Core service for scheduling and dispatching event-driven notifications.
 * Auto-detects time fields in entities and schedules appropriate notifications.
 */

import { IStorage } from '../storage';
import {
  SmartNotification,
  InsertSmartNotification,
  Task,
  Activity,
  Goal,
  NotificationPreferences
} from '@shared/schema';
import { NotificationTemplates, getTemplateForType } from './notificationTemplates';
import { sendUserNotification } from './notificationService';

// ============================================
// TIME FIELD EXTRACTION
// ============================================

interface TimeField {
  fieldName: string;
  value: Date;
  context: string; // Human-readable context
}

/**
 * Extract all time fields from any entity
 */
export function extractTimeFields(entity: any, entityType: string): TimeField[] {
  const timeFields: TimeField[] = [];

  // Direct date fields
  if (entity.dueDate) timeFields.push({ fieldName: 'dueDate', value: new Date(entity.dueDate), context: 'due' });
  if (entity.startDate) timeFields.push({ fieldName: 'startDate', value: new Date(entity.startDate), context: 'starts' });
  if (entity.endDate) timeFields.push({ fieldName: 'endDate', value: new Date(entity.endDate), context: 'ends' });
  if (entity.deadline) timeFields.push({ fieldName: 'deadline', value: new Date(entity.deadline), context: 'deadline' });
  if (entity.scheduledAt) timeFields.push({ fieldName: 'scheduledAt', value: new Date(entity.scheduledAt), context: 'scheduled' });
  if (entity.releaseDate) timeFields.push({ fieldName: 'releaseDate', value: new Date(entity.releaseDate), context: 'releases' });
  if (entity.departureTime) timeFields.push({ fieldName: 'departureTime', value: new Date(entity.departureTime), context: 'departs' });
  if (entity.arrivalTime) timeFields.push({ fieldName: 'arrivalTime', value: new Date(entity.arrivalTime), context: 'arrives' });
  if (entity.checkInTime) timeFields.push({ fieldName: 'checkInTime', value: new Date(entity.checkInTime), context: 'check-in' });
  if (entity.reservationTime) timeFields.push({ fieldName: 'reservationTime', value: new Date(entity.reservationTime), context: 'reservation' });

  // Nested timeline items (for activities)
  if (entity.timeline && Array.isArray(entity.timeline)) {
    entity.timeline.forEach((item: any, index: number) => {
      if (item.scheduledAt) {
        timeFields.push({
          fieldName: `timeline[${index}].scheduledAt`,
          value: new Date(item.scheduledAt),
          context: item.title || `Step ${index + 1}`
        });
      }
    });
  }

  // JSONB metadata with dates
  if (entity.metadata) {
    if (entity.metadata.flightDeparture) timeFields.push({ fieldName: 'metadata.flightDeparture', value: new Date(entity.metadata.flightDeparture), context: 'flight departs' });
    if (entity.metadata.hotelCheckIn) timeFields.push({ fieldName: 'metadata.hotelCheckIn', value: new Date(entity.metadata.hotelCheckIn), context: 'hotel check-in' });
    if (entity.metadata.eventStart) timeFields.push({ fieldName: 'metadata.eventStart', value: new Date(entity.metadata.eventStart), context: 'event starts' });
    if (entity.metadata.movieRelease) timeFields.push({ fieldName: 'metadata.movieRelease', value: new Date(entity.metadata.movieRelease), context: 'movie releases' });
  }

  return timeFields.filter(f => f.value && !isNaN(f.value.getTime()));
}

// ============================================
// NOTIFICATION INTERVALS
// ============================================

// Different reminder intervals (in minutes) based on what the time represents
const NOTIFICATION_INTERVALS: Record<string, number[]> = {
  // Task due dates - closer reminders
  'due': [30],  // 30 min before

  // Activity/event starts - progressive reminders
  'starts': [10080, 4320, 1440, 0],  // 7 days, 3 days, 1 day, morning of

  // Deadlines - urgent reminders
  'deadline': [10080, 4320, 1440, 60],  // 7 days, 3 days, 1 day, 1 hour

  // Timeline items / scheduled - just before
  'scheduled': [30],  // 30 min before

  // Travel - multiple checkpoints
  'departs': [1440, 240, 60],  // 1 day, 4 hours, 1 hour before
  'arrives': [60],  // 1 hour before arrival

  // Check-in times
  'check-in': [1440, 120],  // 1 day, 2 hours before

  // Reservations
  'reservation': [1440, 120],  // 1 day, 2 hours before

  // Media releases - day of (morning)
  'releases': [0],  // Morning of release day

  // Events
  'event': [1440, 60, 30],  // 1 day, 1 hour, 30 min before
};

function getIntervalsForContext(context: string): number[] {
  return NOTIFICATION_INTERVALS[context] || NOTIFICATION_INTERVALS['scheduled'];
}

// ============================================
// CORE SCHEDULING FUNCTIONS
// ============================================

let storageInstance: IStorage | null = null;

export function initSmartNotificationScheduler(storage: IStorage) {
  storageInstance = storage;
  console.log('[SMART_NOTIFICATIONS] Scheduler initialized');
}

/**
 * Schedule a single smart notification
 */
export async function scheduleSmartNotification(
  storage: IStorage,
  data: InsertSmartNotification
): Promise<SmartNotification | null> {
  try {
    const notification = await storage.createSmartNotification(data);
    console.log(`[SMART_NOTIFICATIONS] Scheduled: ${data.notificationType} for ${data.scheduledAt}`);
    return notification;
  } catch (error) {
    console.error('[SMART_NOTIFICATIONS] Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel all notifications for a specific source
 */
export async function cancelNotificationsForSource(
  storage: IStorage,
  sourceType: string,
  sourceId: string
): Promise<number> {
  try {
    const cancelled = await storage.cancelSmartNotifications(sourceType, sourceId);
    console.log(`[SMART_NOTIFICATIONS] Cancelled ${cancelled} notifications for ${sourceType}:${sourceId}`);
    return cancelled;
  } catch (error) {
    console.error('[SMART_NOTIFICATIONS] Failed to cancel notifications:', error);
    return 0;
  }
}

/**
 * Auto-schedule notifications for all detected time fields in an entity
 */
export async function autoScheduleNotifications(
  storage: IStorage,
  entity: any,
  entityType: string,
  entityId: string,
  userId: string
): Promise<void> {
  const timeFields = extractTimeFields(entity, entityType);
  const user = await storage.getUser(userId);
  const prefs = await storage.getNotificationPreferences(userId);
  const userTimezone = user?.timezone || 'UTC';

  console.log(`[SMART_NOTIFICATIONS] Auto-scheduling for ${entityType}:${entityId}, found ${timeFields.length} time fields`);

  for (const field of timeFields) {
    await scheduleNotificationsForTimeField(
      storage,
      entity,
      entityType,
      entityId,
      userId,
      field,
      userTimezone,
      prefs
    );
  }
}

/**
 * Schedule notifications for a specific time field
 */
async function scheduleNotificationsForTimeField(
  storage: IStorage,
  entity: any,
  entityType: string,
  entityId: string,
  userId: string,
  field: TimeField,
  userTimezone: string,
  prefs: NotificationPreferences | null
): Promise<void> {
  const intervals = getIntervalsForContext(field.context);
  const now = new Date();
  const reminderLeadTime = prefs?.reminderLeadTime || 30;

  for (const intervalMinutes of intervals) {
    // Calculate notification time
    let notificationTime: Date;

    if (intervalMinutes === 0) {
      // "Morning of" - schedule for 8 AM on that day in user's timezone
      notificationTime = getMorningOfDate(field.value, userTimezone);
    } else {
      notificationTime = new Date(field.value.getTime() - (intervalMinutes * 60 * 1000));
    }

    // Skip if notification time is in the past
    if (notificationTime <= now) {
      continue;
    }

    // Generate notification content
    const template = getNotificationTemplate(entityType, field.context, intervalMinutes);
    const { title, body } = generateNotificationContent(template, entity, field, intervalMinutes);
    const route = generateDeepLink(entityType, entityId);
    const haptic = getHapticForContext(field.context, intervalMinutes);
    const channel = getChannelForEntityType(entityType);

    await scheduleSmartNotification(storage, {
      userId,
      sourceType: entityType,
      sourceId: entityId,
      notificationType: `${entityType}_${field.context}_${intervalMinutes}`,
      title,
      body,
      scheduledAt: notificationTime,
      timezone: userTimezone,
      route,
      status: 'pending',
      metadata: {
        location: entity.location,
        haptic,
        channel,
      },
    });
  }
}

// ============================================
// NOTIFICATION PROCESSING
// ============================================

/**
 * Process and dispatch all pending scheduled notifications
 */
export async function processScheduledNotifications(storage: IStorage): Promise<void> {
  const now = new Date();

  try {
    // Get all pending notifications that are due
    const pendingNotifications = await storage.getPendingSmartNotifications(now);

    console.log(`[SMART_NOTIFICATIONS] Processing ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      await dispatchNotification(storage, notification);
    }
  } catch (error) {
    console.error('[SMART_NOTIFICATIONS] Error processing scheduled notifications:', error);
  }
}

/**
 * Dispatch a single notification
 */
async function dispatchNotification(
  storage: IStorage,
  notification: SmartNotification
): Promise<void> {
  try {
    // Get user preferences to check quiet hours
    const prefs = await storage.getNotificationPreferences(notification.userId);
    const user = await storage.getUser(notification.userId);
    const timezone = notification.timezone || user?.timezone || 'UTC';

    // Check quiet hours
    if (isInQuietHours(new Date(), prefs, timezone)) {
      console.log(`[SMART_NOTIFICATIONS] Skipping notification ${notification.id} - user in quiet hours`);
      return;
    }

    // Send the notification
    await sendUserNotification(notification.userId, {
      title: notification.title,
      body: notification.body,
      type: notification.notificationType,
      route: notification.route || undefined,
      metadata: {
        ...notification.metadata,
        notificationId: notification.id,
        sourceType: notification.sourceType,
        sourceId: notification.sourceId,
      },
    });

    // Mark as sent
    await storage.updateSmartNotification(notification.id, {
      status: 'sent',
      sentAt: new Date(),
    });

    // Log to history
    await storage.createNotificationHistory({
      userId: notification.userId,
      notificationType: notification.notificationType,
      title: notification.title,
      body: notification.body,
      channel: notification.metadata?.channel,
      hapticType: notification.metadata?.haptic,
      sentAt: new Date(),
      sourceType: notification.sourceType,
      sourceId: notification.sourceId || undefined,
      metadata: notification.metadata,
    });

    console.log(`[SMART_NOTIFICATIONS] Dispatched notification ${notification.id}: ${notification.title}`);
  } catch (error) {
    console.error(`[SMART_NOTIFICATIONS] Failed to dispatch notification ${notification.id}:`, error);

    // Mark as failed
    await storage.updateSmartNotification(notification.id, {
      status: 'failed',
      failureReason: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMorningOfDate(date: Date, timezone: string): Date {
  // Create a date for 8 AM on the same day in user's timezone
  const dateStr = date.toISOString().split('T')[0];
  const morningStr = `${dateStr}T08:00:00`;
  return new Date(morningStr);
}

function isInQuietHours(now: Date, prefs: NotificationPreferences | null, timezone: string): boolean {
  if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;

  const currentHour = now.getHours();
  const startHour = parseInt(prefs.quietHoursStart.split(':')[0]);
  const endHour = parseInt(prefs.quietHoursEnd.split(':')[0]);

  if (startHour <= endHour) {
    return currentHour >= startHour && currentHour < endHour;
  } else {
    // Quiet hours span midnight (e.g., 22:00 - 08:00)
    return currentHour >= startHour || currentHour < endHour;
  }
}

function getNotificationTemplate(
  entityType: string,
  context: string,
  intervalMinutes: number
): { titleTemplate: string; bodyTemplate: string } {
  // Default templates based on context
  const templates: Record<string, { titleTemplate: string; bodyTemplate: string }> = {
    'task_due_30': {
      titleTemplate: '📋 {title}',
      bodyTemplate: 'Due in 30 minutes. You\'ve got this!',
    },
    'activity_starts_10080': {
      titleTemplate: '✈️ {title} in 1 week',
      bodyTemplate: 'Time to start preparing! Get your tickets ready.',
    },
    'activity_starts_4320': {
      titleTemplate: '📍 {title} in 3 days',
      bodyTemplate: 'Getting close! Time to finalize your plans.',
    },
    'activity_starts_1440': {
      titleTemplate: '🎯 {title} is tomorrow!',
      bodyTemplate: 'Everything ready? Check your checklist.',
    },
    'activity_starts_0': {
      titleTemplate: '🌟 Today: {title}',
      bodyTemplate: 'It\'s the day! Have an amazing time.',
    },
    'goal_deadline_10080': {
      titleTemplate: '🎯 Goal deadline in 1 week',
      bodyTemplate: '{title} - Time to make progress!',
    },
    'goal_deadline_1440': {
      titleTemplate: '⏰ Goal deadline tomorrow',
      bodyTemplate: '{title} - Final push!',
    },
    'departs_1440': {
      titleTemplate: '✈️ Departure tomorrow',
      bodyTemplate: 'Don\'t forget to pack!',
    },
    'departs_240': {
      titleTemplate: '🚀 Departure in 4 hours',
      bodyTemplate: 'Time to head out! Passport, tickets, essentials.',
    },
    'departs_60': {
      titleTemplate: '⏰ Departure in 1 hour',
      bodyTemplate: 'Almost time! Final check.',
    },
    'scheduled_30': {
      titleTemplate: '📌 {context} in 30 min',
      bodyTemplate: '{title} starts soon.',
    },
    'releases_0': {
      titleTemplate: '🎬 {title} is out!',
      bodyTemplate: 'Now available. Time to check it off your list!',
    },
  };

  const key = `${entityType}_${context}_${intervalMinutes}`;
  const genericKey = `${context}_${intervalMinutes}`;

  return templates[key] || templates[genericKey] || {
    titleTemplate: '🔔 {title}',
    bodyTemplate: 'Reminder for your upcoming event.',
  };
}

function generateNotificationContent(
  template: { titleTemplate: string; bodyTemplate: string },
  entity: any,
  field: TimeField,
  intervalMinutes: number
): { title: string; body: string } {
  const title = template.titleTemplate
    .replace('{title}', entity.title || entity.name || 'Event')
    .replace('{context}', field.context);

  const body = template.bodyTemplate
    .replace('{title}', entity.title || entity.name || 'Event')
    .replace('{context}', field.context)
    .replace('{location}', entity.location || '');

  return { title, body };
}

function generateDeepLink(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'task':
      return `/app?tab=tasks&task=${entityId}`;
    case 'activity':
      return `/app?tab=activities&activity=${entityId}`;
    case 'activityTask':
      return `/app?tab=activities&activity=${entityId}`;
    case 'goal':
      return `/app?tab=goals&goal=${entityId}`;
    case 'group':
      return `/app?tab=groups&group=${entityId}`;
    default:
      return '/app';
  }
}

function getHapticForContext(context: string, intervalMinutes: number): 'light' | 'medium' | 'heavy' | 'celebration' | 'urgent' {
  // Urgent contexts
  if (context === 'due' && intervalMinutes <= 30) return 'heavy';
  if (context === 'deadline' && intervalMinutes <= 60) return 'heavy';
  if (context === 'departs' && intervalMinutes <= 60) return 'urgent';

  // Important contexts
  if (intervalMinutes <= 60) return 'medium';

  // Standard reminders
  return 'light';
}

function getChannelForEntityType(entityType: string): string {
  switch (entityType) {
    case 'task':
      return 'journalmate_tasks';
    case 'activity':
    case 'activityTask':
      return 'journalmate_activities';
    case 'goal':
      return 'journalmate_tasks';
    case 'group':
      return 'journalmate_groups';
    case 'streak':
      return 'journalmate_streaks';
    case 'achievement':
      return 'journalmate_achievements';
    default:
      return 'journalmate_assistant';
  }
}

// ============================================
// IMMEDIATE NOTIFICATION (For real-time events)
// ============================================

/**
 * Send an immediate notification (for group events, etc.)
 */
export async function sendImmediateNotification(
  storage: IStorage,
  userId: string,
  options: {
    type: string;
    title: string;
    body: string;
    route?: string;
    haptic?: 'light' | 'medium' | 'heavy' | 'celebration' | 'urgent';
    channel?: string;
    actions?: Array<{ id: string; title: string; action: string }>;
    sourceType?: string;
    sourceId?: string;
  }
): Promise<void> {
  try {
    // Check user preferences
    const prefs = await storage.getNotificationPreferences(userId);
    const user = await storage.getUser(userId);
    const timezone = user?.timezone || 'UTC';

    // Check quiet hours
    if (isInQuietHours(new Date(), prefs, timezone)) {
      console.log(`[SMART_NOTIFICATIONS] Skipping immediate notification - user in quiet hours`);
      return;
    }

    // Send the notification
    await sendUserNotification(userId, {
      title: options.title,
      body: options.body,
      type: options.type,
      route: options.route,
      metadata: {
        haptic: options.haptic || 'medium',
        channel: options.channel || 'journalmate_assistant',
        actions: options.actions,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
      },
    });

    // Log to history
    await storage.createNotificationHistory({
      userId,
      notificationType: options.type,
      title: options.title,
      body: options.body,
      channel: options.channel,
      hapticType: options.haptic,
      sentAt: new Date(),
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      metadata: {
        actions: options.actions,
      },
    });

    console.log(`[SMART_NOTIFICATIONS] Sent immediate notification: ${options.title}`);
  } catch (error) {
    console.error('[SMART_NOTIFICATIONS] Failed to send immediate notification:', error);
  }
}
