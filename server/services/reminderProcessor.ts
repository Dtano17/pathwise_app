/**
 * Reminder Processor Service
 * 
 * Background service that:
 * - Checks for activities with upcoming dates
 * - Schedules reminders at strategic times (1 week, 3 days, 1 day, morning of)
 * - Processes pending reminders and dispatches notifications
 * - Enriches reminders with contextual info (weather, news) via Tavily
 */

import type { IStorage } from '../storage';
import { sendUserNotification, type NotificationPayload } from './notificationService';
import { getWeatherSummary, checkWeatherAlerts } from './weatherService';
import { processScheduledNotifications } from './smartNotificationScheduler';
import { processStreakReminders } from './streakService';
import { processAccountabilityCheckins } from './accountabilityService';

// Reminder timing configuration (in milliseconds before event)
const REMINDER_INTERVALS = {
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  MORNING_OF: 8 * 60 * 60 * 1000, // 8 hours (morning of event day)
} as const;

// Reminder types
type ReminderType = 'one_week' | 'three_days' | 'one_day' | 'morning_of' | 'task_due' | 'custom';

interface ActivityReminder {
  id: string;
  activityId: string;
  userId: string;
  reminderType: ReminderType;
  scheduledAt: Date;
  title: string;
  message: string;
  metadata?: {
    activityTitle?: string;
    location?: string;
    weatherInfo?: string;
    contextualTips?: string[];
  };
  isSent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

interface UpcomingActivity {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  startDate: Date | null;
  endDate: Date | null;
  location?: string;
  timeline?: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    location?: string;
  }>;
}

let processorInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Start the reminder processor
 * Runs every 5 minutes to check for pending reminders
 */
export function startReminderProcessor(storage: IStorage): void {
  if (processorInterval) {
    console.log('[REMINDER] Processor already running');
    return;
  }

  console.log('[REMINDER] Starting reminder processor (5 minute intervals)');
  
  // Run immediately on start
  processReminders(storage).catch(err => {
    console.error('[REMINDER] Initial processing error:', err);
  });

  // Then run every 5 minutes
  processorInterval = setInterval(() => {
    processReminders(storage).catch(err => {
      console.error('[REMINDER] Processing error:', err);
    });
  }, 5 * 60 * 1000);
}

/**
 * Stop the reminder processor
 */
export function stopReminderProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[REMINDER] Processor stopped');
  }
}

/**
 * Schedule reminders for a single activity
 * Call this when an activity is created or updated with a new startDate
 * This is idempotent - it will delete existing reminders and create new ones
 */
export async function scheduleRemindersForActivity(
  storage: IStorage,
  activityId: string,
  userId: string
): Promise<{ created: number; skipped: number }> {
  const now = new Date();
  let created = 0;
  let skipped = 0;

  try {
    // Get the activity
    const activity = await storage.getActivity(activityId, userId);
    if (!activity || !activity.startDate) {
      console.log(`[REMINDER] Activity ${activityId} has no start date, skipping reminders`);
      return { created: 0, skipped: 0 };
    }

    // Delete existing reminders for this activity to ensure idempotency
    await storage.deleteActivityReminders(activityId);
    console.log(`[REMINDER] Cleared existing reminders for activity ${activityId}`);

    const startDate = new Date(activity.startDate);
    const timeUntilStart = startDate.getTime() - now.getTime();

    // Don't schedule reminders for past events
    if (timeUntilStart < 0) {
      console.log(`[REMINDER] Activity ${activityId} is in the past, skipping reminders`);
      return { created: 0, skipped: 0 };
    }

    // Determine which reminders to create based on time until start
    const remindersToCreate: Array<{ type: ReminderType; scheduledAt: Date; title: string; message: string }> = [];

    // One week reminder (if event is more than 1 week away)
    if (timeUntilStart > REMINDER_INTERVALS.ONE_WEEK) {
      remindersToCreate.push({
        type: 'one_week',
        scheduledAt: new Date(startDate.getTime() - REMINDER_INTERVALS.ONE_WEEK),
        title: `${activity.title} is coming up!`,
        message: `Your ${activity.category} plan starts in 1 week. Time to prepare!`,
      });
    }

    // Three days reminder (if event is more than 3 days away)
    if (timeUntilStart > REMINDER_INTERVALS.THREE_DAYS) {
      remindersToCreate.push({
        type: 'three_days',
        scheduledAt: new Date(startDate.getTime() - REMINDER_INTERVALS.THREE_DAYS),
        title: `${activity.title} in 3 days!`,
        message: `Your ${activity.category} plan is almost here. Make sure everything is ready!`,
      });
    }

    // One day reminder (if event is more than 1 day away)
    if (timeUntilStart > REMINDER_INTERVALS.ONE_DAY) {
      remindersToCreate.push({
        type: 'one_day',
        scheduledAt: new Date(startDate.getTime() - REMINDER_INTERVALS.ONE_DAY),
        title: `${activity.title} tomorrow!`,
        message: `Your ${activity.category} plan starts tomorrow. Get excited!`,
      });
    }

    // Morning of reminder (schedule for 8 AM on the day)
    const morningTime = new Date(startDate);
    morningTime.setHours(8, 0, 0, 0);
    if (morningTime.getTime() > now.getTime()) {
      remindersToCreate.push({
        type: 'morning_of',
        scheduledAt: morningTime,
        title: `Today: ${activity.title}`,
        message: `Your ${activity.category} plan starts today! Here's what's first on your list.`,
      });
    }

    // Get weather info for enrichment if location is available
    let weatherInfo: string | undefined;
    const location = (activity as any).location;
    if (location) {
      try {
        const weather = await getWeatherSummary(location, startDate);
        if (weather) {
          weatherInfo = weather;
        }
      } catch (error) {
        console.log(`[REMINDER] Could not get weather for ${location}`);
      }
    }

    // Create the reminders
    for (const reminder of remindersToCreate) {
      try {
        await storage.createActivityReminder({
          activityId: activity.id,
          userId: activity.userId,
          reminderType: reminder.type,
          scheduledAt: reminder.scheduledAt,
          title: reminder.title,
          message: reminder.message,
          metadata: {
            activityTitle: activity.title,
            location: location,
            weatherInfo: weatherInfo,
          },
        });
        created++;
        console.log(`[REMINDER] Scheduled ${reminder.type} reminder for activity ${activityId}`);
      } catch (error: any) {
        if (!error.message?.includes('duplicate')) {
          console.error(`[REMINDER] Failed to create reminder:`, error);
        }
        skipped++;
      }
    }

    return { created, skipped };
  } catch (error) {
    console.error(`[REMINDER] Error scheduling reminders for activity ${activityId}:`, error);
    return { created, skipped };
  }
}

/**
 * Main processing loop
 * 1. Find activities with upcoming dates that need reminders scheduled
 * 2. Create reminders for those activities
 * 3. Process pending activity reminders that are due
 * 4. Process pending task reminders that are due (from Smart Scheduler)
 */
async function processReminders(storage: IStorage): Promise<void> {
  if (isProcessing) {
    console.log('[REMINDER] Already processing, skipping this cycle');
    return;
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    console.log('[REMINDER] Starting reminder processing cycle');

    // Step 1: Find activities with upcoming dates and schedule reminders
    await scheduleActivityReminders(storage);

    // Step 2: Process pending activity reminders that are due
    await dispatchPendingReminders(storage);

    // Step 3: Process pending task reminders that are due (from Smart Scheduler)
    await dispatchPendingTaskReminders(storage);

    // Step 4: Process auto-scheduling for users with daily planning enabled
    await processAutoScheduling(storage);

    // Step 5: Process smart notifications (event-driven notifications)
    await processSmartNotifications(storage);

    // Step 6: Process streak reminders (at-risk alerts)
    await processUserStreakReminders(storage);

    // Step 7: Process accountability check-ins (weekly, monthly, quarterly)
    await processUserAccountabilityCheckins(storage);

    const duration = Date.now() - startTime;
    console.log(`[REMINDER] Processing cycle complete (${duration}ms)`);
  } catch (error) {
    console.error('[REMINDER] Error during processing:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Find activities with upcoming dates and create reminders
 */
async function scheduleActivityReminders(storage: IStorage): Promise<void> {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + REMINDER_INTERVALS.ONE_WEEK + 24 * 60 * 60 * 1000);

  try {
    // Get activities starting within the next week + 1 day buffer
    const upcomingActivities = await storage.getUpcomingActivitiesForReminders(oneWeekFromNow);

    console.log(`[REMINDER] Found ${upcomingActivities.length} upcoming activities to check`);

    for (const activity of upcomingActivities) {
      if (!activity.startDate) continue;

      const startDate = new Date(activity.startDate);
      const timeUntilStart = startDate.getTime() - now.getTime();

      // Schedule appropriate reminders based on time until start
      const remindersToCreate: Array<{ type: ReminderType; scheduledAt: Date; title: string; message: string }> = [];

      // One week reminder
      if (timeUntilStart > REMINDER_INTERVALS.ONE_WEEK && timeUntilStart <= REMINDER_INTERVALS.ONE_WEEK + 24 * 60 * 60 * 1000) {
        remindersToCreate.push({
          type: 'one_week',
          scheduledAt: new Date(startDate.getTime() - REMINDER_INTERVALS.ONE_WEEK),
          title: `${activity.title} is coming up!`,
          message: `Your ${activity.category} plan starts in 1 week. Time to prepare!`,
        });
      }

      // Three days reminder
      if (timeUntilStart > REMINDER_INTERVALS.THREE_DAYS && timeUntilStart <= REMINDER_INTERVALS.THREE_DAYS + 24 * 60 * 60 * 1000) {
        remindersToCreate.push({
          type: 'three_days',
          scheduledAt: new Date(startDate.getTime() - REMINDER_INTERVALS.THREE_DAYS),
          title: `${activity.title} in 3 days!`,
          message: `Your ${activity.category} plan is almost here. Make sure everything is ready!`,
        });
      }

      // One day reminder
      if (timeUntilStart > REMINDER_INTERVALS.ONE_DAY && timeUntilStart <= REMINDER_INTERVALS.ONE_DAY + 12 * 60 * 60 * 1000) {
        remindersToCreate.push({
          type: 'one_day',
          scheduledAt: new Date(startDate.getTime() - REMINDER_INTERVALS.ONE_DAY),
          title: `${activity.title} tomorrow!`,
          message: `Your ${activity.category} plan starts tomorrow. Get excited!`,
        });
      }

      // Morning of reminder
      if (timeUntilStart > 0 && timeUntilStart <= REMINDER_INTERVALS.MORNING_OF + 4 * 60 * 60 * 1000) {
        const morningTime = new Date(startDate);
        morningTime.setHours(8, 0, 0, 0); // 8 AM on the day of
        
        if (morningTime.getTime() > now.getTime()) {
          remindersToCreate.push({
            type: 'morning_of',
            scheduledAt: morningTime,
            title: `Today: ${activity.title}`,
            message: `Your ${activity.category} plan starts today! Here's what's first on your list.`,
          });
        }
      }

      // Create the reminders
      for (const reminder of remindersToCreate) {
        try {
          await storage.createActivityReminder({
            activityId: activity.id,
            userId: activity.userId,
            reminderType: reminder.type,
            scheduledAt: reminder.scheduledAt,
            title: reminder.title,
            message: reminder.message,
            metadata: {
              activityTitle: activity.title,
              location: activity.location,
            },
          });
          console.log(`[REMINDER] Scheduled ${reminder.type} reminder for activity ${activity.id}`);
        } catch (error: any) {
          // Ignore duplicate reminder errors
          if (!error.message?.includes('duplicate')) {
            console.error(`[REMINDER] Failed to create reminder:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('[REMINDER] Error scheduling activity reminders:', error);
  }
}

/**
 * Process pending reminders that are due
 */
async function dispatchPendingReminders(storage: IStorage): Promise<void> {
  const now = new Date();

  try {
    // Get all pending reminders that are due
    const pendingReminders = await storage.getPendingActivityReminders(now);

    console.log(`[REMINDER] Found ${pendingReminders.length} pending reminders to dispatch`);

    for (const reminder of pendingReminders) {
      try {
        // Check user's notification preferences and quiet hours
        const preferences = await storage.getNotificationPreferences(reminder.userId);
        
        if (preferences) {
          // Check quiet hours
          if (preferences.quietHoursStart && preferences.quietHoursEnd) {
            const currentHour = now.getHours();
            const quietStart = parseInt(preferences.quietHoursStart.split(':')[0]);
            const quietEnd = parseInt(preferences.quietHoursEnd.split(':')[0]);
            
            if (isInQuietHours(currentHour, quietStart, quietEnd)) {
              console.log(`[REMINDER] Skipping reminder ${reminder.id} - user in quiet hours`);
              continue;
            }
          }

          // Check if reminders are enabled
          if (!preferences.enableTaskReminders) {
            console.log(`[REMINDER] Skipping reminder ${reminder.id} - reminders disabled`);
            await storage.markActivityReminderSent(reminder.id);
            continue;
          }
        }

        // Enrich reminder with contextual info if it's a significant reminder
        let enrichedMessage = reminder.message || '';
        if (reminder.reminderType === 'one_day' || reminder.reminderType === 'morning_of') {
          const contextualInfo = await getContextualEnrichment(
            storage,
            reminder.metadata?.activityTitle || '',
            reminder.metadata?.location || ''
          );
          if (contextualInfo) {
            enrichedMessage = `${enrichedMessage}\n\n${contextualInfo}`;
          }
        }

        // Send the notification
        const payload: NotificationPayload = {
          title: reminder.title,
          body: enrichedMessage,
          data: {
            activityId: reminder.activityId,
            reminderType: reminder.reminderType,
          },
          route: `/activity/${reminder.activityId}`,
        };

        await sendUserNotification(storage, reminder.userId, payload);

        // Mark as sent
        await storage.markActivityReminderSent(reminder.id);
        console.log(`[REMINDER] Dispatched reminder ${reminder.id} to user ${reminder.userId}`);

      } catch (error) {
        console.error(`[REMINDER] Error dispatching reminder ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[REMINDER] Error processing pending reminders:', error);
  }
}

/**
 * Process pending task reminders (from Smart Scheduler)
 * These are reminders for individual tasks with scheduled times
 */
async function dispatchPendingTaskReminders(storage: IStorage): Promise<void> {
  const now = new Date();

  try {
    // Get all pending task reminders that are due
    const pendingTaskReminders = await storage.getPendingTaskReminders(now);

    console.log(`[REMINDER] Found ${pendingTaskReminders.length} pending task reminders to dispatch`);

    for (const reminder of pendingTaskReminders) {
      try {
        // Check user's notification preferences and quiet hours
        const preferences = await storage.getNotificationPreferences(reminder.userId);

        if (preferences) {
          // Check quiet hours
          if (preferences.quietHoursStart && preferences.quietHoursEnd) {
            const currentHour = now.getHours();
            const quietStart = parseInt(preferences.quietHoursStart.split(':')[0]);
            const quietEnd = parseInt(preferences.quietHoursEnd.split(':')[0]);

            if (isInQuietHours(currentHour, quietStart, quietEnd)) {
              console.log(`[REMINDER] Skipping task reminder ${reminder.id} - user in quiet hours`);
              continue;
            }
          }

          // Check if task reminders are enabled
          if (!preferences.enableTaskReminders) {
            console.log(`[REMINDER] Skipping task reminder ${reminder.id} - task reminders disabled`);
            await storage.markTaskReminderSent(reminder.id);
            continue;
          }
        }

        // Send the notification
        const payload: NotificationPayload = {
          title: reminder.title,
          body: reminder.message || `Your scheduled task is coming up.`,
          data: {
            taskId: reminder.taskId,
            reminderType: reminder.reminderType,
          },
          route: `/tasks`, // Navigate to tasks page
        };

        await sendUserNotification(storage, reminder.userId, payload);

        // Mark as sent
        await storage.markTaskReminderSent(reminder.id);
        console.log(`[REMINDER] Dispatched task reminder ${reminder.id} to user ${reminder.userId}`);

      } catch (error) {
        console.error(`[REMINDER] Error dispatching task reminder ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[REMINDER] Error processing pending task reminders:', error);
  }
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(currentHour: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart <= quietEnd) {
    // Simple case: quiet hours don't span midnight (e.g., 22:00 - 07:00 would NOT be this)
    return currentHour >= quietStart && currentHour < quietEnd;
  } else {
    // Quiet hours span midnight (e.g., 22:00 - 07:00)
    return currentHour >= quietStart || currentHour < quietEnd;
  }
}

/**
 * Get contextual enrichment for a reminder using Tavily
 */
async function getContextualEnrichment(
  storage: IStorage,
  activityTitle: string,
  location: string
): Promise<string | null> {
  if (!location) return null;

  try {
    // Use Tavily to search for relevant local info
    const { tavilySearch, isTavilyConfigured } = await import('./tavilyProvider');

    if (!isTavilyConfigured()) {
      return null;
    }

    // Search for weather and local news
    const query = `${location} weather forecast this week AND local events news`;
    const result = await tavilySearch(query, {
      searchDepth: 'basic',
      maxResults: 3,
    });

    if (result.results && result.results.length > 0) {
      const tips: string[] = [];
      
      // Extract useful info from search results
      for (const item of result.results.slice(0, 2)) {
        if (item.content && item.content.length > 50) {
          // Extract a useful snippet
          const snippet = item.content.substring(0, 150).trim();
          if (snippet) {
            tips.push(snippet);
          }
        }
      }

      if (tips.length > 0) {
        return `📍 What to know about ${location}:\n${tips.join('\n')}`;
      }
    }

    return null;
  } catch (error) {
    console.error('[REMINDER] Contextual enrichment error:', error);
    return null;
  }
}


/**
 * Process auto-scheduling for users who have daily planning enabled
 * Generates scheduling suggestions at the user's configured dailyPlanningTime
 */
async function processAutoScheduling(storage: IStorage): Promise<void> {
  try {
    // Get all users with daily planning enabled
    const usersWithDailyPlanning = await storage.getUsersWithDailyPlanningEnabled();

    if (usersWithDailyPlanning.length === 0) {
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[SCHEDULER] Checking ${usersWithDailyPlanning.length} users for auto-scheduling`);

    for (const { userId, dailyPlanningTime } of usersWithDailyPlanning) {
      try {
        // Parse the daily planning time (default to 09:00 if not set)
        const planningTime = dailyPlanningTime || '09:00';
        const [planHour, planMinute] = planningTime.split(':').map(Number);
        const planTimeInMinutes = planHour * 60 + planMinute;

        // Check if we're within the planning window (within 10 minutes of planning time)
        // This ensures we don't miss the window due to the 5-minute processing interval
        const timeDiff = Math.abs(currentTimeInMinutes - planTimeInMinutes);
        if (timeDiff > 10) {
          continue; // Not time for this user's daily planning yet
        }

        // Check if we already generated suggestions for today
        const existingSuggestions = await storage.getUserSchedulingSuggestions(userId);
        const todaySuggestion = existingSuggestions.find(s => s.targetDate === today);
        if (todaySuggestion) {
          console.log(`[SCHEDULER] User ${userId} already has suggestions for today, skipping`);
          continue;
        }

        // Get user's pending tasks
        const tasks = await storage.getUserTasks(userId);
        const pendingTasks = tasks.filter(task => !task.completed);

        if (pendingTasks.length === 0) {
          console.log(`[SCHEDULER] User ${userId} has no pending tasks, skipping`);
          continue;
        }

        // Get user's notification preferences
        const preferences = await storage.getUserNotificationPreferences(userId);

        // Generate priority-based schedule
        const prioritySchedule = createAutoSchedule(pendingTasks, preferences);
        if (prioritySchedule.suggestedTasks.length > 0) {
          await storage.createSchedulingSuggestion({
            userId,
            suggestionType: 'daily',
            targetDate: today,
            suggestedTasks: prioritySchedule.suggestedTasks,
            score: prioritySchedule.score,
          });

          // Send notification about new scheduling suggestion
          const payload: NotificationPayload = {
            title: '📅 Daily Schedule Ready',
            body: `Your personalized schedule for today is ready! ${prioritySchedule.suggestedTasks.length} tasks have been organized.`,
            data: {
              type: 'daily_schedule',
              targetDate: today,
            },
            route: '/settings', // Navigate to settings where scheduler is
          };

          await sendUserNotification(storage, userId, payload);
          console.log(`[SCHEDULER] Generated daily schedule for user ${userId} with ${prioritySchedule.suggestedTasks.length} tasks`);
        }
      } catch (error) {
        console.error(`[SCHEDULER] Error processing auto-schedule for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in auto-scheduling:', error);
  }
}

/**
 * Create an auto-generated schedule based on task priorities
 */
function createAutoSchedule(tasks: any[], preferences?: any) {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    return bPriority - aPriority;
  });

  let currentTime = '09:00'; // Start at 9 AM
  const suggestedTasks = [];

  for (const task of sortedTasks.slice(0, 6)) { // Limit to 6 tasks per day
    const timeInMinutes = getTaskTimeEstimate(task.timeEstimate || '30 min');

    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || '30 min',
      suggestedStartTime: currentTime,
      reason: `${task.priority} priority task - tackle important work early`,
    });

    // Add task duration + 15 min buffer
    currentTime = addMinutes(currentTime, timeInMinutes + 15);

    // Don't schedule past 6 PM
    if (timeToMins(currentTime) > timeToMins('18:00')) {
      break;
    }
  }

  return {
    suggestedTasks,
    score: Math.min(95, 70 + suggestedTasks.length * 5),
  };
}

// Helper functions for auto-scheduling
function getTaskTimeEstimate(timeEstimate: string): number {
  if (timeEstimate.includes('hour')) {
    const hours = parseFloat(timeEstimate);
    return hours * 60;
  }
  return parseInt(timeEstimate) || 30;
}

function timeToMins(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function addMinutes(timeString: string, minutesToAdd: number): string {
  const totalMinutes = timeToMins(timeString) + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Cancel all reminders for an activity
 */
export async function cancelRemindersForActivity(
  storage: IStorage,
  activityId: string
): Promise<void> {
  try {
    await storage.deleteActivityReminders(activityId);
    console.log(`[REMINDER] Cancelled all reminders for activity ${activityId}`);
  } catch (error) {
    console.error(`[REMINDER] Error cancelling reminders:`, error);
  }
}

/**
 * Process smart notifications (event-driven)
 * This handles all the new smart notification system notifications
 */
async function processSmartNotifications(storage: IStorage): Promise<void> {
  try {
    console.log('[REMINDER] Processing smart notifications...');
    await processScheduledNotifications(storage);
  } catch (error) {
    console.error('[REMINDER] Error processing smart notifications:', error);
  }
}

/**
 * Process streak reminders for all users
 * Checks for users with at-risk streaks and schedules reminders
 */
async function processUserStreakReminders(storage: IStorage): Promise<void> {
  try {
    console.log('[REMINDER] Processing streak reminders...');
    await processStreakReminders(storage);
  } catch (error) {
    console.error('[REMINDER] Error processing streak reminders:', error);
  }
}

/**
 * Process accountability check-ins (weekly, monthly, quarterly)
 * Schedules check-in reminders for users based on current date
 */
async function processUserAccountabilityCheckins(storage: IStorage): Promise<void> {
  try {
    console.log('[REMINDER] Processing accountability check-ins...');
    await processAccountabilityCheckins(storage);
  } catch (error) {
    console.error('[REMINDER] Error processing accountability check-ins:', error);
  }
}
