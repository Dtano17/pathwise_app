/**
 * Notification Event Hooks
 *
 * Hooks into all CRUD operations to automatically schedule/cancel notifications
 * for any entity with time-based fields.
 *
 * Core Principle: If it has a date/time, it gets a notification
 */

import type { IStorage } from '../storage';
import type {
  Task,
  Activity,
  Goal,
  ActivityTask,
  GroupInvite,
  GroupMembership,
  JournalEntry,
} from '@shared/schema';
import {
  autoScheduleNotifications,
  cancelNotificationsForSource,
  sendImmediateNotification,
} from './smartNotificationScheduler';
import { updateUserStreak } from './streakService';
import { generateNotificationMessage } from './notificationTemplates';

// ============================================
// TASK EVENTS
// ============================================

/**
 * Called when a task is created
 * Auto-schedules notifications if the task has a due date
 */
export async function onTaskCreated(
  storage: IStorage,
  task: Task,
  userId: string
): Promise<void> {
  try {
    // Auto-schedule for any time field (dueDate, etc.)
    await autoScheduleNotifications(storage, task, 'task', task.id, userId);
  } catch (error) {
    console.error('Error in onTaskCreated hook:', error);
  }
}

/**
 * Called when a task is updated
 * Reschedules notifications if time fields changed
 */
export async function onTaskUpdated(
  storage: IStorage,
  task: Task,
  updates: Partial<Task>,
  userId: string
): Promise<void> {
  try {
    // If any time field changed, reschedule notifications
    const timeFieldsChanged = ['dueDate', 'scheduledAt'].some((f) => f in updates);
    if (timeFieldsChanged) {
      await cancelNotificationsForSource(storage, 'task', task.id);
      await autoScheduleNotifications(storage, task, 'task', task.id, userId);
    }
  } catch (error) {
    console.error('Error in onTaskUpdated hook:', error);
  }
}

/**
 * Called when a task is completed
 * Cancels pending notifications and updates user streak
 */
export async function onTaskCompleted(
  storage: IStorage,
  task: Task,
  userId: string
): Promise<void> {
  try {
    // Cancel any pending notifications for this task
    await cancelNotificationsForSource(storage, 'task', task.id);

    // Update user's activity streak
    await updateUserStreak(storage, userId, 'task');

    // Check if this completes an entire activity
    await checkActivityCompletion(storage, task, userId);

    // Check if this hits a goal milestone (50%, 75%, 100%)
    await checkGoalMilestone(storage, task, userId);
  } catch (error) {
    console.error('Error in onTaskCompleted hook:', error);
  }
}

/**
 * Check if completing a task finishes all tasks in a parent activity
 * If so, send a celebration notification
 */
async function checkActivityCompletion(
  storage: IStorage,
  task: Task,
  userId: string
): Promise<void> {
  try {
    const activityTaskLinks = await storage.getActivityTasksForTask(task.id);

    for (const link of activityTaskLinks) {
      const activityTasks = await storage.getActivityTasks(link.activityId, userId);
      const totalTasks = activityTasks.length;
      const completedTasks = activityTasks.filter(t => t.completed).length;

      if (totalTasks > 0 && completedTasks === totalTasks) {
        const activity = await storage.getActivity(link.activityId, userId);
        if (!activity) continue;

        const message = generateNotificationMessage('activity_completion', {
          title: activity.title,
          taskCount: totalTasks,
        });

        if (message) {
          await sendImmediateNotification(storage, userId, {
            type: 'activity_completion',
            title: message.title,
            body: message.body,
            route: `/app?tab=activities&activity=${activity.id}`,
            haptic: 'celebration',
            channel: message.channel,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in checkActivityCompletion:', error);
  }
}

/**
 * Check if completing a task hits a goal milestone (50%, 75%, 100%)
 * Only fires once per threshold using deduplication
 */
async function checkGoalMilestone(
  storage: IStorage,
  task: Task,
  userId: string
): Promise<void> {
  try {
    if (!task.goalId) return;

    const allTasks = await storage.getUserTasks(userId);
    const goalTasks = allTasks.filter(t => t.goalId === task.goalId);

    if (goalTasks.length < 2) return; // Skip single-task goals

    const completedCount = goalTasks.filter(t => t.completed).length;
    const percentage = Math.round((completedCount / goalTasks.length) * 100);
    const previousCompleted = completedCount - 1;
    const previousPercentage = Math.round((previousCompleted / goalTasks.length) * 100);

    const milestones = [50, 75, 100];

    for (const milestone of milestones) {
      if (percentage >= milestone && previousPercentage < milestone) {
        // Dedup: check if already sent for this milestone
        const existing = await storage.findPendingSmartNotification(
          userId, 'goal', task.goalId, `goal_milestone_${milestone}`
        );
        if (existing) break;

        const goals = await storage.getUserGoals(userId);
        const goal = goals.find(g => g.id === task.goalId);
        if (!goal) break;

        const templateKey = milestone === 100 ? 'goal_completed' : 'goal_milestone';
        const message = generateNotificationMessage(templateKey, {
          title: goal.title,
          percentage: milestone,
          completedCount,
          totalCount: goalTasks.length,
        });

        if (message) {
          await sendImmediateNotification(storage, userId, {
            type: `goal_milestone_${milestone}`,
            title: message.title,
            body: message.body,
            route: '/app?tab=goals',
            haptic: milestone === 100 ? 'celebration' : 'medium',
            channel: message.channel,
          });
        }
        break; // Only fire the highest milestone crossed
      }
    }
  } catch (error) {
    console.error('Error in checkGoalMilestone:', error);
  }
}

/**
 * Called when a task is deleted
 * Cancels all pending notifications
 */
export async function onTaskDeleted(
  storage: IStorage,
  taskId: string
): Promise<void> {
  try {
    await cancelNotificationsForSource(storage, 'task', taskId);
  } catch (error) {
    console.error('Error in onTaskDeleted hook:', error);
  }
}

// ============================================
// ACTIVITY EVENTS
// ============================================

/**
 * Called when an activity is created
 * Auto-schedules for startDate, endDate, and all timeline items
 */
export async function onActivityCreated(
  storage: IStorage,
  activity: Activity,
  userId: string
): Promise<void> {
  try {
    await autoScheduleNotifications(storage, activity, 'activity', activity.id, userId);
  } catch (error) {
    console.error('Error in onActivityCreated hook:', error);
  }
}

/**
 * Called when an activity is updated
 * Reschedules if time fields changed
 */
export async function onActivityUpdated(
  storage: IStorage,
  activity: Activity,
  updates: Partial<Activity>,
  userId: string
): Promise<void> {
  try {
    // If startDate, endDate, timeline, or any time field changed
    const timeFieldsChanged = ['startDate', 'endDate', 'timeline'].some((f) => f in updates);
    if (timeFieldsChanged) {
      await cancelNotificationsForSource(storage, 'activity', activity.id);
      await autoScheduleNotifications(storage, activity, 'activity', activity.id, userId);
    }
  } catch (error) {
    console.error('Error in onActivityUpdated hook:', error);
  }
}

/**
 * Called when an activity is deleted
 */
export async function onActivityDeleted(
  storage: IStorage,
  activityId: string
): Promise<void> {
  try {
    await cancelNotificationsForSource(storage, 'activity', activityId);
  } catch (error) {
    console.error('Error in onActivityDeleted hook:', error);
  }
}

// ============================================
// GOAL EVENTS
// ============================================

/**
 * Called when a goal is created
 * Auto-schedules if goal has a deadline
 */
export async function onGoalCreated(
  storage: IStorage,
  goal: Goal,
  userId: string
): Promise<void> {
  try {
    if (goal.deadline) {
      await autoScheduleNotifications(storage, goal, 'goal', goal.id, userId);
    }
  } catch (error) {
    console.error('Error in onGoalCreated hook:', error);
  }
}

/**
 * Called when a goal is updated
 * Reschedules if deadline changed
 */
export async function onGoalUpdated(
  storage: IStorage,
  goal: Goal,
  updates: Partial<Goal>,
  userId: string
): Promise<void> {
  try {
    if ('deadline' in updates) {
      await cancelNotificationsForSource(storage, 'goal', goal.id);
      if (goal.deadline) {
        await autoScheduleNotifications(storage, goal, 'goal', goal.id, userId);
      }
    }
  } catch (error) {
    console.error('Error in onGoalUpdated hook:', error);
  }
}

/**
 * Called when a goal is completed
 */
export async function onGoalCompleted(
  storage: IStorage,
  goal: Goal,
  userId: string
): Promise<void> {
  try {
    await cancelNotificationsForSource(storage, 'goal', goal.id);
    // Could send a celebration notification here
  } catch (error) {
    console.error('Error in onGoalCompleted hook:', error);
  }
}

/**
 * Called when a goal is deleted
 */
export async function onGoalDeleted(
  storage: IStorage,
  goalId: string
): Promise<void> {
  try {
    await cancelNotificationsForSource(storage, 'goal', goalId);
  } catch (error) {
    console.error('Error in onGoalDeleted hook:', error);
  }
}

// ============================================
// GROUP EVENTS (Real-time, no scheduling)
// ============================================

/**
 * Called when a group invite is sent
 * Sends immediate notification to the invitee
 */
export async function onGroupInviteSent(
  storage: IStorage,
  invite: GroupInvite,
  inviterId: string
): Promise<void> {
  try {
    const inviter = await storage.getUser(inviterId);
    const group = await storage.getGroup(invite.groupId);

    if (!inviter || !group || !invite.inviteeId) return;

    const message = generateNotificationMessage('group_invite_received', {
      inviterName: inviter.displayName || inviter.email || 'Someone',
      groupName: group.name,
    });

    if (message) {
      await sendImmediateNotification(storage, invite.inviteeId, {
        type: 'group_invite_received',
        title: message.title,
        body: message.body,
        route: `/app?tab=groups&invite=${invite.id}`,
        haptic: 'heavy',
        channel: message.channel,
        actions: [
          { id: 'accept', title: 'Accept', action: 'accept_invite' },
          { id: 'decline', title: 'Decline', action: 'decline_invite' },
        ],
      });
    }
  } catch (error) {
    console.error('Error in onGroupInviteSent hook:', error);
  }
}

/**
 * Called when a member joins a group
 * Notifies all existing members
 */
export async function onGroupMemberJoined(
  storage: IStorage,
  membership: GroupMembership,
  newMemberUserId: string
): Promise<void> {
  try {
    const user = await storage.getUser(newMemberUserId);
    const group = await storage.getGroup(membership.groupId);
    const members = await storage.getGroupMembers(membership.groupId);

    if (!user || !group || !members) return;

    const message = generateNotificationMessage('group_invite_accepted', {
      userName: user.displayName || user.email || 'Someone',
      groupName: group.name,
    });

    if (message) {
      // Notify all existing members except the new member
      for (const member of members) {
        if (member.userId !== newMemberUserId) {
          await sendImmediateNotification(storage, member.userId, {
            type: 'group_invite_accepted',
            title: message.title,
            body: message.body,
            route: `/app?tab=groups&group=${group.id}`,
            haptic: 'medium',
            channel: message.channel,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in onGroupMemberJoined hook:', error);
  }
}

/**
 * Called when a member leaves a group
 * Notifies remaining members
 */
export async function onGroupMemberLeft(
  storage: IStorage,
  groupId: string,
  leavingUserId: string
): Promise<void> {
  try {
    const user = await storage.getUser(leavingUserId);
    const group = await storage.getGroup(groupId);
    const members = await storage.getGroupMembers(groupId);

    if (!user || !group || !members) return;

    const message = generateNotificationMessage('group_member_left', {
      userName: user.displayName || user.email || 'Someone',
      groupName: group.name,
    });

    if (message) {
      for (const member of members) {
        if (member.userId !== leavingUserId) {
          await sendImmediateNotification(storage, member.userId, {
            type: 'group_member_left',
            title: message.title,
            body: message.body,
            route: `/app?tab=groups&group=${group.id}`,
            haptic: 'light',
            channel: message.channel,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in onGroupMemberLeft hook:', error);
  }
}

/**
 * Called when an activity is shared to a group
 * Notifies all group members except the sharer
 */
export async function onActivitySharedToGroup(
  storage: IStorage,
  activity: Activity,
  groupId: string,
  sharerId: string
): Promise<void> {
  try {
    const sharer = await storage.getUser(sharerId);
    const group = await storage.getGroup(groupId);
    const members = await storage.getGroupMembers(groupId);

    if (!sharer || !group || !members) return;

    const message = generateNotificationMessage('group_activity_shared', {
      sharerName: sharer.displayName || sharer.email || 'Someone',
      activityTitle: activity.title,
      groupName: group.name,
    });

    if (message) {
      for (const member of members) {
        if (member.userId !== sharerId) {
          await sendImmediateNotification(storage, member.userId, {
            type: 'group_activity_shared',
            title: message.title,
            body: message.body,
            route: `/app?tab=groups&group=${groupId}&activity=${activity.id}`,
            haptic: 'medium',
            channel: message.channel,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in onActivitySharedToGroup hook:', error);
  }
}

// ============================================
// ACTIVITY PROCESSING COMPLETE (Event-driven)
// ============================================

/**
 * Called when an activity finishes AI generation/processing
 * Sends immediate push notification to user (works even when app is locked)
 */
export async function onActivityProcessingComplete(
  storage: IStorage,
  activity: { id: number; title: string },
  userId: number,
  taskCount: number = 0,
  source?: string // e.g., 'url', 'paste', 'quick_plan', 'smart_plan'
): Promise<void> {
  try {
    const truncatedTitle = activity.title.length > 30
      ? activity.title.slice(0, 30) + '...'
      : activity.title;

    // Build intuitive message based on source and content
    let title: string;
    let body: string;

    if (source === 'url') {
      title = `✨ ${truncatedTitle}`;
      body = taskCount > 0
        ? `We turned your link into ${taskCount} actionable steps. Ready when you are!`
        : `Your link has been transformed into an action plan. Take a look!`;
    } else if (source === 'paste') {
      title = `📋 ${truncatedTitle}`;
      body = taskCount > 0
        ? `${taskCount} steps created from your content. Let's make it happen!`
        : `Your content is now an organized plan. Check it out!`;
    } else {
      title = `🎯 ${truncatedTitle}`;
      body = taskCount > 0
        ? `Your plan with ${taskCount} steps is ready. Time to take action!`
        : `Your activity plan is ready. Let's get started!`;
    }

    await sendImmediateNotification(storage, userId.toString(), {
      type: 'activity_ready',
      title,
      body,
      route: `/app?tab=activities&activity=${activity.id}`,
      haptic: 'celebration',
      channel: 'journalmate_activities',
      sourceType: 'activity',
      sourceId: activity.id.toString(),
    });

    console.log(`[NOTIFICATION] Sent activity ready notification for activity ${activity.id}`);
  } catch (error) {
    console.error('[NOTIFICATION] Error in onActivityProcessingComplete:', error);
  }
}

// ============================================
// ACTIVITY TASK EVENTS (Timeline items)
// ============================================

/**
 * Called when an activity task (timeline item) is created
 * Schedules notification if it has a scheduledAt time
 */
export async function onActivityTaskCreated(
  storage: IStorage,
  task: ActivityTask,
  activityId: string,
  userId: string
): Promise<void> {
  try {
    if (task.scheduledAt) {
      await autoScheduleNotifications(storage, task, 'activityTask', task.id, userId);
    }
  } catch (error) {
    console.error('Error in onActivityTaskCreated hook:', error);
  }
}

/**
 * Called when an activity task is updated
 * Reschedules if scheduledAt changed
 */
export async function onActivityTaskUpdated(
  storage: IStorage,
  task: ActivityTask,
  updates: Partial<ActivityTask>,
  userId: string
): Promise<void> {
  try {
    if ('scheduledAt' in updates) {
      await cancelNotificationsForSource(storage, 'activityTask', task.id);
      if (task.scheduledAt) {
        await autoScheduleNotifications(storage, task, 'activityTask', task.id, userId);
      }
    }
  } catch (error) {
    console.error('Error in onActivityTaskUpdated hook:', error);
  }
}

/**
 * Called when an activity task is completed
 */
export async function onActivityTaskCompleted(
  storage: IStorage,
  task: ActivityTask,
  userId: string
): Promise<void> {
  try {
    await cancelNotificationsForSource(storage, 'activityTask', task.id);
  } catch (error) {
    console.error('Error in onActivityTaskCompleted hook:', error);
  }
}

/**
 * Called when an activity task is deleted
 */
export async function onActivityTaskDeleted(
  storage: IStorage,
  taskId: string
): Promise<void> {
  try {
    await cancelNotificationsForSource(storage, 'activityTask', taskId);
  } catch (error) {
    console.error('Error in onActivityTaskDeleted hook:', error);
  }
}

// ============================================
// JOURNAL EVENTS
// ============================================

/**
 * Called when a journal entry is created
 * Updates the user's journaling streak
 */
export async function onJournalEntryCreated(
  storage: IStorage,
  entry: JournalEntry,
  userId: string
): Promise<void> {
  try {
    // Update streak for journaling activity
    await updateUserStreak(storage, userId, 'journal');
  } catch (error) {
    console.error('Error in onJournalEntryCreated hook:', error);
  }
}

// ============================================
// REMINDER EVENTS
// ============================================

/**
 * Called when a reminder is created (task or activity reminder)
 * These use the existing reminder system but we log them here
 */
export async function onReminderCreated(
  storage: IStorage,
  reminderId: string,
  reminderType: 'task' | 'activity',
  sourceId: string,
  userId: string
): Promise<void> {
  try {
    // Reminders are already handled by the existing reminderProcessor
    // This hook is for future enhancements
    console.log(`Reminder created: ${reminderType} reminder for ${sourceId}`);
  } catch (error) {
    console.error('Error in onReminderCreated hook:', error);
  }
}

// ============================================
// CALENDAR SYNC EVENTS
// ============================================

/**
 * Called when a calendar event is synced/imported
 * Schedules notifications based on the event's start time
 */
export async function onCalendarEventSynced(
  storage: IStorage,
  event: { id: string; startDate?: Date | string; title?: string; [key: string]: any },
  userId: string
): Promise<void> {
  try {
    if (event.startDate) {
      await autoScheduleNotifications(storage, event, 'calendarEvent', event.id, userId);
    }
  } catch (error) {
    console.error('Error in onCalendarEventSynced hook:', error);
  }
}

// ============================================
// MEDIA/ENTERTAINMENT EVENTS
// ============================================

/**
 * Called when a movie or show is added to watch list with release date
 * Schedules notification for release day
 */
export async function onMediaAdded(
  storage: IStorage,
  media: { id: string; title: string; releaseDate?: Date | string; type: 'movie' | 'show' },
  userId: string
): Promise<void> {
  try {
    if (media.releaseDate) {
      await autoScheduleNotifications(storage, media, 'media', media.id, userId);
    }
  } catch (error) {
    console.error('Error in onMediaAdded hook:', error);
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Re-process all notifications for a user (e.g., after timezone change)
 */
export async function reprocessUserNotifications(
  storage: IStorage,
  userId: string
): Promise<void> {
  try {
    // Cancel all pending notifications for this user
    await storage.cancelAllPendingNotificationsForUser(userId);

    // Get all user's tasks with due dates
    const tasks = await storage.getTasksWithDueDates(userId);
    for (const task of tasks) {
      if (!task.completed) {
        await autoScheduleNotifications(storage, task, 'task', task.id, userId);
      }
    }

    // Get all user's activities with start dates
    const activities = await storage.getActivitiesWithDates(userId);
    for (const activity of activities) {
      await autoScheduleNotifications(storage, activity, 'activity', activity.id, userId);
    }

    // Get all user's goals with deadlines
    const goals = await storage.getGoalsWithDeadlines(userId);
    for (const goal of goals) {
      if (!goal.completed) {
        await autoScheduleNotifications(storage, goal, 'goal', goal.id, userId);
      }
    }

    console.log(`Reprocessed notifications for user ${userId}`);
  } catch (error) {
    console.error('Error reprocessing user notifications:', error);
  }
}
