/**
 * Streak Service for tracking user activity streaks
 *
 * Handles:
 * - Updating streaks when tasks/activities are completed
 * - Milestone detection and celebration notifications
 * - Streak-at-risk reminders
 * - Journal streaks
 */

import type { IStorage } from '../storage';
import { sendImmediateNotification, scheduleSmartNotification } from './smartNotificationScheduler';
import { getStreakMilestoneTemplate, generateNotificationMessage } from './notificationTemplates';

// Milestone thresholds for celebration notifications
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];

/**
 * Update user's streak when they complete a task or activity
 */
export async function updateUserStreak(
  storage: IStorage,
  userId: string,
  activityType: 'task' | 'journal' | 'activity' = 'task'
): Promise<{
  currentStreak: number;
  longestStreak: number;
  isMilestone: boolean;
  milestoneReached?: number;
}> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get or create user streak record
  let streak = await storage.getUserStreak(userId);

  if (!streak) {
    // Create new streak record
    streak = await storage.createUserStreak({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
      streakStartDate: today,
      totalActiveDays: 1,
    });

    return {
      currentStreak: 1,
      longestStreak: 1,
      isMilestone: false,
    };
  }

  const lastActivityDate = streak.lastActivityDate;

  // If already recorded activity today, no update needed
  if (lastActivityDate === today) {
    return {
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      isMilestone: false,
    };
  }

  // Calculate days since last activity
  const lastDate = lastActivityDate ? new Date(lastActivityDate) : null;
  const todayDate = new Date(today);
  let daysDiff = 999;

  if (lastDate) {
    daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  let newCurrentStreak: number;
  let newStreakStartDate = streak.streakStartDate;

  if (daysDiff === 1) {
    // Consecutive day - continue streak
    newCurrentStreak = (streak.currentStreak || 0) + 1;
  } else if (daysDiff === 0) {
    // Same day - shouldn't happen but handle it
    newCurrentStreak = streak.currentStreak || 1;
  } else {
    // Streak broken - start new streak
    newCurrentStreak = 1;
    newStreakStartDate = today;
  }

  // Update longest streak if needed
  const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak || 0);

  // Update streak record
  await storage.updateUserStreak(userId, {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActivityDate: today,
    streakStartDate: newStreakStartDate,
    totalActiveDays: (streak.totalActiveDays || 0) + 1,
  });

  // Check for milestone
  const isMilestone = STREAK_MILESTONES.includes(newCurrentStreak);
  let milestoneReached: number | undefined;

  if (isMilestone) {
    milestoneReached = newCurrentStreak;

    // Send celebration notification
    const templateType = getStreakMilestoneTemplate(newCurrentStreak);
    if (templateType) {
      const message = generateNotificationMessage(templateType, { streakCount: newCurrentStreak });
      if (message) {
        await sendImmediateNotification(storage, userId, {
          type: templateType,
          title: message.title,
          body: message.body,
          route: '/app?tab=tasks',
          haptic: 'celebration',
          channel: message.channel,
        });
      }
    }
  }

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    isMilestone,
    milestoneReached,
  };
}

/**
 * Check if user's streak is at risk (no activity today) and schedule reminder
 */
export async function checkStreakAtRisk(
  storage: IStorage,
  userId: string,
  userTimezone: string = 'UTC'
): Promise<boolean> {
  const streak = await storage.getUserStreak(userId);

  if (!streak || !streak.currentStreak || streak.currentStreak < 2) {
    // No significant streak to protect
    return false;
  }

  const today = new Date().toISOString().split('T')[0];

  // If user already has activity today, streak is safe
  if (streak.lastActivityDate === today) {
    return false;
  }

  // Streak is at risk - schedule reminder if not already scheduled
  const existingReminder = await storage.getSmartNotificationByTypeAndSource(
    userId,
    'streak_at_risk',
    'streak',
    userId
  );

  if (existingReminder && existingReminder.status === 'pending') {
    // Already scheduled
    return true;
  }

  // Get user's notification preferences for streak reminder time
  const prefs = await storage.getNotificationPreferences(userId);
  const reminderTime = prefs?.streakReminderTime || '18:00';

  // Calculate the scheduled time for today at the user's preferred time
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const scheduledAt = new Date();
  scheduledAt.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (scheduledAt < new Date()) {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
  }

  const message = generateNotificationMessage('streak_at_risk', {
    streakCount: streak.currentStreak,
  });

  if (message) {
    await scheduleSmartNotification(storage, {
      userId,
      sourceType: 'streak',
      sourceId: userId,
      notificationType: 'streak_at_risk',
      title: message.title,
      body: message.body,
      scheduledAt,
      timezone: userTimezone,
      route: '/app?tab=tasks',
      metadata: {
        streakCount: streak.currentStreak,
        haptic: 'heavy',
        channel: message.channel,
      },
      status: 'pending',
    });
  }

  return true;
}

/**
 * Process all users to check for at-risk streaks
 * Called periodically by the reminder processor
 */
export async function processStreakReminders(storage: IStorage): Promise<void> {
  try {
    // Get all users with active streaks (streak >= 2)
    const usersWithStreaks = await storage.getUsersWithActiveStreaks(2);

    const today = new Date().toISOString().split('T')[0];

    for (const streak of usersWithStreaks) {
      // Skip if user already has activity today
      if (streak.lastActivityDate === today) {
        continue;
      }

      // Get user preferences to check if streak reminders are enabled
      const prefs = await storage.getNotificationPreferences(streak.userId);
      if (prefs && prefs.enableStreakReminders === false) {
        continue;
      }

      // Check and schedule at-risk reminder
      await checkStreakAtRisk(storage, streak.userId, prefs?.timezone || 'UTC');
    }
  } catch (error) {
    console.error('Error processing streak reminders:', error);
  }
}

/**
 * Get user's current streak information
 */
export async function getUserStreakInfo(
  storage: IStorage,
  userId: string
): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakStartDate: string | null;
  totalActiveDays: number;
  isAtRisk: boolean;
  nextMilestone: number | null;
}> {
  const streak = await storage.getUserStreak(userId);

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      streakStartDate: null,
      totalActiveDays: 0,
      isAtRisk: false,
      nextMilestone: 7,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const isAtRisk = streak.lastActivityDate !== today && (streak.currentStreak || 0) >= 2;

  // Find next milestone
  let nextMilestone: number | null = null;
  const currentStreak = streak.currentStreak || 0;
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) {
      nextMilestone = milestone;
      break;
    }
  }

  return {
    currentStreak,
    longestStreak: streak.longestStreak || 0,
    lastActivityDate: streak.lastActivityDate || null,
    streakStartDate: streak.streakStartDate || null,
    totalActiveDays: streak.totalActiveDays || 0,
    isAtRisk,
    nextMilestone,
  };
}

/**
 * Reset user's streak (e.g., when explicitly requested)
 */
export async function resetUserStreak(storage: IStorage, userId: string): Promise<void> {
  await storage.updateUserStreak(userId, {
    currentStreak: 0,
    streakStartDate: null,
    lastActivityDate: null,
  });
}

/**
 * Check if a streak milestone was just reached
 */
export function isMilestone(streakCount: number): boolean {
  return STREAK_MILESTONES.includes(streakCount);
}

/**
 * Get days until next milestone
 */
export function getDaysUntilNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) {
      return milestone - currentStreak;
    }
  }
  return null;
}
