/**
 * Accountability Service
 *
 * Handles scheduled check-ins:
 * - Weekly check-ins (Sunday at user's preferred time)
 * - Monthly reviews (1st of each month)
 * - Quarterly reviews (Jan, Apr, Jul, Oct)
 *
 * Also provides stats for check-in notifications
 */

import type { IStorage } from '../storage';
import { scheduleSmartNotification, cancelNotificationsForSource } from './smartNotificationScheduler';
import { generateNotificationMessage } from './notificationTemplates';

/**
 * Schedule weekly check-in for a user
 */
export async function scheduleWeeklyCheckin(
  storage: IStorage,
  userId: string
): Promise<void> {
  try {
    const prefs = await storage.getNotificationPreferences(userId);

    // Check if accountability reminders are enabled
    if (prefs && prefs.enableAccountabilityReminders === false) {
      return;
    }

    const checkinDay = prefs?.weeklyCheckinDay || 'sunday';
    const checkinTime = prefs?.weeklyCheckinTime || '10:00';
    const timezone = prefs?.timezone || 'UTC';

    // Calculate next Sunday (or configured day) at the configured time
    const scheduledAt = getNextCheckinDate(checkinDay, checkinTime);

    // Get user stats for the notification
    const stats = await getUserWeeklyStats(storage, userId);

    const message = generateNotificationMessage('weekly_checkin', {
      tasksCompleted: stats.tasksCompleted,
      streakDays: stats.streakDays,
      goalsCount: stats.activeGoals,
    });

    if (message) {
      // Use date-specific sourceId to prevent stale duplicates across weeks
      const weekId = scheduledAt.toISOString().split('T')[0]; // e.g., "2026-03-08"
      await scheduleSmartNotification(storage, {
        userId,
        sourceType: 'accountability',
        sourceId: `weekly_${weekId}_${userId}`,
        notificationType: 'weekly_checkin',
        title: message.title,
        body: message.body,
        scheduledAt,
        timezone,
        route: '/app?tab=reports',
        metadata: {
          haptic: 'light',
          channel: message.channel,
          tasksCompleted: stats.tasksCompleted,
          streakDays: stats.streakDays,
        },
        status: 'pending',
      });
    }
  } catch (error) {
    console.error('[ACCOUNTABILITY] Error scheduling weekly check-in:', error);
  }
}

/**
 * Schedule monthly review for a user
 */
export async function scheduleMonthlyReview(
  storage: IStorage,
  userId: string
): Promise<void> {
  try {
    const prefs = await storage.getNotificationPreferences(userId);

    if (prefs && prefs.enableAccountabilityReminders === false) {
      return;
    }

    const timezone = prefs?.timezone || 'UTC';

    // Calculate 1st of next month at 10 AM in user's timezone
    const scheduledAt = getFirstOfNextMonth(timezone);

    // Use month-specific sourceId to prevent cross-month dedup issues
    const yearMonth = `${scheduledAt.getFullYear()}-${String(scheduledAt.getMonth() + 1).padStart(2, '0')}`;
    const monthName = scheduledAt.toLocaleString('en-US', { month: 'long' });
    const stats = await getUserMonthlyStats(storage, userId);

    const message = generateNotificationMessage('monthly_review', {
      monthName,
      tasksCompleted: stats.tasksCompleted,
      activitiesPlanned: stats.activitiesCompleted,
    });

    if (message) {
      // Cancel any stale pending monthly reviews for this user (prevents accumulation)
      const cancelled = await cancelNotificationsForSource(storage, 'accountability', `monthly_${userId}`);
      if (cancelled > 0) {
        console.log(`[ACCOUNTABILITY] Cancelled ${cancelled} stale pending monthly notifications for user ${userId}`);
      }

      await scheduleSmartNotification(storage, {
        userId,
        sourceType: 'accountability',
        sourceId: `monthly_${yearMonth}_${userId}`,
        notificationType: 'monthly_review',
        title: message.title,
        body: message.body,
        scheduledAt,
        timezone,
        route: '/app?tab=reports',
        metadata: {
          haptic: 'medium',
          channel: message.channel,
        },
        status: 'pending',
      });
    }
  } catch (error) {
    console.error('[ACCOUNTABILITY] Error scheduling monthly review:', error);
  }
}

/**
 * Schedule quarterly review for a user
 */
export async function scheduleQuarterlyReview(
  storage: IStorage,
  userId: string
): Promise<void> {
  try {
    const prefs = await storage.getNotificationPreferences(userId);

    if (prefs && prefs.enableAccountabilityReminders === false) {
      return;
    }

    const timezone = prefs?.timezone || 'UTC';

    // Calculate start of next quarter at 10 AM in user's timezone
    const scheduledAt = getStartOfNextQuarter(timezone);

    // Use quarter-specific sourceId
    const quarterLabel = `${scheduledAt.getFullYear()}-Q${Math.floor(scheduledAt.getMonth() / 3) + 1}`;

    // Gather quarterly stats for richer notification
    const quarterlyStats = await getUserQuarterlyStats(storage, userId);

    const message = generateNotificationMessage('quarterly_review', {
      goalsCompleted: quarterlyStats.goalsCompleted,
      tasksCompleted: quarterlyStats.tasksCompleted,
      activitiesCompleted: quarterlyStats.activitiesCompleted,
    });

    if (message) {
      // Cancel stale pending quarterly reviews
      const cancelled = await cancelNotificationsForSource(storage, 'accountability', `quarterly_${userId}`);
      if (cancelled > 0) {
        console.log(`[ACCOUNTABILITY] Cancelled ${cancelled} stale pending quarterly notifications for user ${userId}`);
      }

      await scheduleSmartNotification(storage, {
        userId,
        sourceType: 'accountability',
        sourceId: `quarterly_${quarterLabel}_${userId}`,
        notificationType: 'quarterly_review',
        title: message.title,
        body: message.body,
        scheduledAt,
        timezone,
        route: '/app?tab=reports&view=vision',
        metadata: {
          haptic: 'medium',
          channel: message.channel,
        },
        status: 'pending',
      });
    }
  } catch (error) {
    console.error('[ACCOUNTABILITY] Error scheduling quarterly review:', error);
  }
}

/**
 * Process all accountability check-ins for users who need them
 */
export async function processAccountabilityCheckins(storage: IStorage): Promise<void> {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Only run in the 09:00-09:04 window (one 5-min cycle per day)
    // This prevents duplicate scheduling when called every 5 minutes
    if (currentHour !== 9 || currentMinute >= 5) return;

    const dayOfWeek = now.getDay(); // 0 = Sunday
    const dayOfMonth = now.getDate();
    const month = now.getMonth();

    // Sunday - schedule weekly check-ins
    if (dayOfWeek === 0) {
      console.log('[ACCOUNTABILITY] Sunday - processing weekly check-ins');
      // Get all users with accountability reminders enabled
      const users = await storage.getUsersWithAccountabilityEnabled();

      for (const user of users) {
        await scheduleWeeklyCheckin(storage, user.userId);
      }
    }

    // 1st of month - schedule monthly reviews
    if (dayOfMonth === 1) {
      console.log('[ACCOUNTABILITY] 1st of month - processing monthly reviews');
      const users = await storage.getUsersWithAccountabilityEnabled();

      for (const user of users) {
        await scheduleMonthlyReview(storage, user.userId);
      }
    }

    // Start of quarter (Jan 1, Apr 1, Jul 1, Oct 1)
    if (dayOfMonth === 1 && [0, 3, 6, 9].includes(month)) {
      console.log('[ACCOUNTABILITY] Start of quarter - processing quarterly reviews');
      const users = await storage.getUsersWithAccountabilityEnabled();

      for (const user of users) {
        await scheduleQuarterlyReview(storage, user.userId);
      }
    }
  } catch (error) {
    console.error('[ACCOUNTABILITY] Error processing check-ins:', error);
  }
}

// ============================================
// Helper Functions
// ============================================

function getNextCheckinDate(day: string, time: string): Date {
  const daysOfWeek: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  const targetDay = daysOfWeek[day.toLowerCase()] || 0;
  const [hours, minutes] = time.split(':').map(Number);

  const now = new Date();
  const result = new Date(now);

  // Find next occurrence of the target day
  const currentDay = now.getDay();
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7; // Next week
  }

  result.setDate(result.getDate() + daysUntilTarget);
  result.setHours(hours, minutes, 0, 0);

  return result;
}

function getFirstOfNextMonth(timezone: string = 'UTC'): Date {
  const now = new Date();
  // Calculate 1st of next month at 10:00 AM in user's timezone
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  return getDateInTimezone(year, month, 1, 10, 0, timezone);
}

function getStartOfNextQuarter(timezone: string = 'UTC'): Date {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const nextQuarterMonth = (currentQuarter + 1) * 3;

  if (nextQuarterMonth >= 12) {
    return getDateInTimezone(now.getFullYear() + 1, 0, 1, 10, 0, timezone);
  }
  return getDateInTimezone(now.getFullYear(), nextQuarterMonth, 1, 10, 0, timezone);
}

/**
 * Create a Date object representing a specific local time in a given timezone.
 * Returns the equivalent UTC Date for scheduling purposes.
 */
function getDateInTimezone(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  try {
    // Build an ISO-like string for the target date/time
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

    // Use Intl to figure out the UTC offset for this timezone at this date
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    // Create a UTC date first, then adjust based on timezone offset
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));

    // Get what time it is in the target timezone when it's `hour:minute` UTC
    const parts = formatter.formatToParts(utcDate);
    const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');

    // Calculate the offset: how many hours ahead/behind the timezone is from UTC
    // If UTC 10:00 shows as 4:00 AM in CST, offset is -6 hours (CST is UTC-6)
    // To schedule 10:00 AM CST, we need to set UTC to 16:00 (10 + 6)
    let hourDiff = tzHour - hour;
    const dayDiff = tzDay - day;
    if (dayDiff !== 0) {
      hourDiff += dayDiff * 24;
    }

    // Adjust: subtract the offset to get the UTC time that corresponds to the desired local time
    const adjustedUtc = new Date(Date.UTC(year, month, day, hour - hourDiff, minute, 0, 0));
    return adjustedUtc;
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }
}

async function getUserWeeklyStats(
  storage: IStorage,
  userId: string
): Promise<{ tasksCompleted: number; streakDays: number; activeGoals: number }> {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get tasks completed this week
    const tasks = await storage.getUserTasks(userId);
    const completedThisWeek = tasks.filter(t =>
      t.completed && t.completedAt && new Date(t.completedAt) > oneWeekAgo
    ).length;

    // Get streak info
    const streak = await storage.getUserStreak(userId);
    const streakDays = streak?.currentStreak || 0;

    // Get active goals
    const goals = await storage.getUserGoals(userId);
    const activeGoals = goals.filter(g => !g.completed).length;

    return {
      tasksCompleted: completedThisWeek,
      streakDays,
      activeGoals,
    };
  } catch (error) {
    return { tasksCompleted: 0, streakDays: 0, activeGoals: 0 };
  }
}

async function getUserQuarterlyStats(
  storage: IStorage,
  userId: string
): Promise<{ goalsCompleted: number; tasksCompleted: number; activitiesCompleted: number }> {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const tasks = await storage.getUserTasks(userId);
    const tasksCompleted = tasks.filter(t =>
      t.completed && t.completedAt && new Date(t.completedAt) > threeMonthsAgo
    ).length;

    // Count goals where all tasks are complete
    const goals = await storage.getUserGoals(userId);
    const goalsCompleted = goals.filter(g => {
      const goalTasks = tasks.filter(t => t.goalId === g.id);
      return goalTasks.length > 0 && goalTasks.every(t => t.completed);
    }).length;

    const activities = await storage.getUserActivities(userId);
    const activitiesCompleted = activities.filter(a =>
      a.createdAt && new Date(a.createdAt) > threeMonthsAgo
    ).length;

    return { goalsCompleted, tasksCompleted, activitiesCompleted };
  } catch (error) {
    return { goalsCompleted: 0, tasksCompleted: 0, activitiesCompleted: 0 };
  }
}

async function getUserMonthlyStats(
  storage: IStorage,
  userId: string
): Promise<{ tasksCompleted: number; activitiesCompleted: number }> {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get tasks completed this month
    const tasks = await storage.getUserTasks(userId);
    const completedThisMonth = tasks.filter(t =>
      t.completed && t.completedAt && new Date(t.completedAt) > oneMonthAgo
    ).length;

    // Get activities from this month
    const activities = await storage.getUserActivities(userId);
    const activitiesThisMonth = activities.filter(a =>
      a.createdAt && new Date(a.createdAt) > oneMonthAgo
    ).length;

    return {
      tasksCompleted: completedThisMonth,
      activitiesCompleted: activitiesThisMonth,
    };
  } catch (error) {
    return { tasksCompleted: 0, activitiesCompleted: 0 };
  }
}
