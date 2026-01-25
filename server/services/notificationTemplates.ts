/**
 * Notification Templates for Smart Event-Driven Notifications
 *
 * Professional message templates with contextual information,
 * haptic patterns, and channel assignments for all notification types.
 */

export interface NotificationTemplate {
  title: (context: Record<string, any>) => string;
  body: (context: Record<string, any>) => string;
  category: string;
  haptic: 'light' | 'medium' | 'heavy' | 'celebration' | 'urgent';
  channel: string;
  priority: 'low' | 'default' | 'high';
}

// ============================================
// TASK NOTIFICATIONS
// ============================================

export const TaskTemplates: Record<string, NotificationTemplate> = {
  task_due_soon: {
    title: (ctx) => `📋 ${truncate(ctx.title, 40)}`,
    body: (ctx) => {
      const mins = ctx.minutesUntil || 30;
      if (mins <= 5) return `Due in ${mins} minutes. Time to wrap up!`;
      if (mins <= 15) return `Due in ${mins} minutes. Almost there!`;
      return `Due in ${mins} minutes. You've got this!`;
    },
    category: 'TASK REMINDER',
    haptic: 'medium',
    channel: 'journalmate_tasks',
    priority: 'high',
  },

  task_overdue: {
    title: (ctx) => `⏰ Overdue: ${truncate(ctx.title, 35)}`,
    body: () => `This task is past due. Reschedule or mark complete?`,
    category: 'TASK ALERT',
    haptic: 'heavy',
    channel: 'journalmate_tasks',
    priority: 'high',
  },

  task_morning_reminder: {
    title: (ctx) => `🌅 ${ctx.taskCount} task${ctx.taskCount > 1 ? 's' : ''} due today`,
    body: (ctx) => ctx.firstTask
      ? `Starting with: ${truncate(ctx.firstTask, 50)}`
      : `Check your tasks for today`,
    category: 'DAILY TASKS',
    haptic: 'light',
    channel: 'journalmate_tasks',
    priority: 'default',
  },
};

// ============================================
// ACTIVITY/TRIP NOTIFICATIONS
// ============================================

export const ActivityTemplates: Record<string, NotificationTemplate> = {
  activity_one_week: {
    title: (ctx) => `✈️ ${truncate(ctx.title, 35)} in 1 week`,
    body: (ctx) => {
      if (ctx.location) return `Time to prepare for ${ctx.location}! Get your tickets sorted.`;
      return `One week to go! Time to finalize your plans.`;
    },
    category: 'TRIP PREP',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  activity_three_days: {
    title: (ctx) => `📅 ${truncate(ctx.title, 35)} in 3 days`,
    body: (ctx) => {
      if (ctx.location) return `${ctx.location} is coming up! Time to start packing.`;
      return `3 days away! Double-check your preparations.`;
    },
    category: 'TRIP PREP',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  activity_one_day: {
    title: (ctx) => `🎯 ${truncate(ctx.title, 35)} is tomorrow!`,
    body: (ctx) => {
      if (ctx.weather) return `Weather: ${ctx.weather}. Everything packed?`;
      if (ctx.location) return `${ctx.location} awaits! Final checks time.`;
      return `Tomorrow's the day! Make sure you're ready.`;
    },
    category: 'TRIP PREP',
    haptic: 'heavy',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  activity_morning_of: {
    title: (ctx) => `🌟 Today: ${truncate(ctx.title, 40)}`,
    body: (ctx) => {
      if (ctx.firstTask) return `First up: ${truncate(ctx.firstTask, 50)}`;
      if (ctx.location) return `Heading to ${ctx.location}! Have an amazing time.`;
      return `The day is here! Enjoy every moment.`;
    },
    category: 'TODAY',
    haptic: 'heavy',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  timeline_item_soon: {
    title: (ctx) => `⏱️ ${truncate(ctx.itemTitle, 40)}`,
    body: (ctx) => {
      if (ctx.location) return `Starts in ${ctx.minutesUntil || 30} min at ${ctx.location}`;
      return `Coming up in ${ctx.minutesUntil || 30} minutes`;
    },
    category: 'TIMELINE',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  activity_departure: {
    title: (ctx) => `🚀 Departure in ${ctx.hoursUntil || 4} hours`,
    body: () => `Passport, tickets, essentials - ready? Have a safe journey!`,
    category: 'TRAVEL',
    haptic: 'heavy',
    channel: 'journalmate_activities',
    priority: 'high',
  },
};

// ============================================
// GOAL NOTIFICATIONS
// ============================================

export const GoalTemplates: Record<string, NotificationTemplate> = {
  goal_deadline_week: {
    title: (ctx) => `🎯 Goal deadline in 1 week`,
    body: (ctx) => `"${truncate(ctx.title, 40)}" - How's your progress?`,
    category: 'GOAL REMINDER',
    haptic: 'medium',
    channel: 'journalmate_tasks',
    priority: 'default',
  },

  goal_deadline_three_days: {
    title: (ctx) => `🎯 Goal deadline in 3 days`,
    body: (ctx) => `"${truncate(ctx.title, 40)}" - Final push time!`,
    category: 'GOAL REMINDER',
    haptic: 'medium',
    channel: 'journalmate_tasks',
    priority: 'high',
  },

  goal_deadline_tomorrow: {
    title: (ctx) => `⚡ Goal deadline tomorrow`,
    body: (ctx) => `"${truncate(ctx.title, 40)}" - You can do this!`,
    category: 'GOAL ALERT',
    haptic: 'heavy',
    channel: 'journalmate_tasks',
    priority: 'high',
  },

  goal_deadline_today: {
    title: (ctx) => `🏁 Goal deadline today`,
    body: (ctx) => `"${truncate(ctx.title, 40)}" - Finish strong!`,
    category: 'GOAL ALERT',
    haptic: 'urgent',
    channel: 'journalmate_tasks',
    priority: 'high',
  },
};

// ============================================
// GROUP NOTIFICATIONS
// ============================================

export const GroupTemplates: Record<string, NotificationTemplate> = {
  group_invite_received: {
    title: (ctx) => `📬 ${ctx.inviterName} invited you`,
    body: (ctx) => `Join "${truncate(ctx.groupName, 30)}" to collaborate on plans together`,
    category: 'GROUP INVITE',
    haptic: 'heavy',
    channel: 'journalmate_groups',
    priority: 'high',
  },

  group_invite_accepted: {
    title: (ctx) => `🎉 ${ctx.userName} joined!`,
    body: (ctx) => `Your group "${truncate(ctx.groupName, 30)}" has a new member`,
    category: 'GROUP UPDATE',
    haptic: 'medium',
    channel: 'journalmate_groups',
    priority: 'default',
  },

  group_member_left: {
    title: (ctx) => `👋 ${ctx.userName} left`,
    body: (ctx) => `${ctx.userName} has left "${truncate(ctx.groupName, 30)}"`,
    category: 'GROUP UPDATE',
    haptic: 'light',
    channel: 'journalmate_groups',
    priority: 'low',
  },

  group_activity_shared: {
    title: (ctx) => `📍 ${ctx.sharerName} shared a plan`,
    body: (ctx) => `"${truncate(ctx.activityTitle, 30)}" shared with ${truncate(ctx.groupName, 20)}`,
    category: 'GROUP ACTIVITY',
    haptic: 'medium',
    channel: 'journalmate_groups',
    priority: 'default',
  },

  group_task_completed: {
    title: (ctx) => `✅ ${ctx.userName} completed a task`,
    body: (ctx) => `"${truncate(ctx.taskTitle, 35)}" in ${truncate(ctx.groupName, 20)}`,
    category: 'GROUP ACTIVITY',
    haptic: 'light',
    channel: 'journalmate_groups',
    priority: 'low',
  },

  group_goal_milestone: {
    title: (ctx) => `🏆 Group milestone reached!`,
    body: (ctx) => `"${truncate(ctx.groupName, 25)}" is ${ctx.progress}% to completing "${truncate(ctx.goalTitle, 25)}"`,
    category: 'GROUP ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_groups',
    priority: 'default',
  },
};

// ============================================
// STREAK NOTIFICATIONS
// ============================================

export const StreakTemplates: Record<string, NotificationTemplate> = {
  streak_at_risk: {
    title: (ctx) => `🔥 ${ctx.streakCount}-day streak at risk!`,
    body: () => `Complete any task before midnight to keep it going`,
    category: 'STREAK ALERT',
    haptic: 'heavy',
    channel: 'journalmate_streaks',
    priority: 'high',
  },

  streak_milestone_7: {
    title: () => `🔥 1 Week Streak!`,
    body: () => `7 days of consistency! You're building a great habit.`,
    category: 'ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_achievements',
    priority: 'default',
  },

  streak_milestone_14: {
    title: () => `🔥 2 Week Streak!`,
    body: () => `14 days strong! Your dedication is paying off.`,
    category: 'ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_achievements',
    priority: 'default',
  },

  streak_milestone_30: {
    title: () => `🏆 30 Day Streak!`,
    body: () => `A full month of consistency! You're unstoppable.`,
    category: 'ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_achievements',
    priority: 'default',
  },

  streak_milestone_60: {
    title: () => `🏆 60 Day Streak!`,
    body: () => `Two months of dedication! Incredible commitment.`,
    category: 'ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_achievements',
    priority: 'default',
  },

  streak_milestone_100: {
    title: () => `👑 100 Day Streak!`,
    body: () => `Triple digits! You've mastered the art of consistency.`,
    category: 'ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_achievements',
    priority: 'high',
  },

  streak_milestone_365: {
    title: () => `🎖️ 1 Year Streak!`,
    body: () => `365 days! An entire year of dedication. Legendary!`,
    category: 'ACHIEVEMENT',
    haptic: 'celebration',
    channel: 'journalmate_achievements',
    priority: 'high',
  },
};

// ============================================
// ACCOUNTABILITY NOTIFICATIONS
// ============================================

export const AccountabilityTemplates: Record<string, NotificationTemplate> = {
  weekly_checkin: {
    title: () => `📊 Weekly Check-in`,
    body: (ctx) => {
      if (ctx.tasksCompleted && ctx.streakDays) {
        return `${ctx.tasksCompleted} tasks completed, ${ctx.streakDays} day streak. Review your progress?`;
      }
      return `How are your goals progressing this week?`;
    },
    category: 'WEEKLY REVIEW',
    haptic: 'light',
    channel: 'journalmate_assistant',
    priority: 'default',
  },

  monthly_review: {
    title: (ctx) => `📈 ${ctx.monthName} Review`,
    body: (ctx) => {
      if (ctx.tasksCompleted && ctx.activitiesPlanned) {
        return `You crushed ${ctx.tasksCompleted} tasks and planned ${ctx.activitiesPlanned} adventures!`;
      }
      return `Let's look back at what you accomplished this month.`;
    },
    category: 'MONTHLY REVIEW',
    haptic: 'medium',
    channel: 'journalmate_assistant',
    priority: 'default',
  },

  quarterly_review: {
    title: () => `📅 Quarterly Goals Review`,
    body: () => `Time to reflect on the past 3 months and plan ahead`,
    category: 'QUARTERLY REVIEW',
    haptic: 'medium',
    channel: 'journalmate_assistant',
    priority: 'default',
  },
};

// ============================================
// MEDIA/ENTERTAINMENT NOTIFICATIONS
// ============================================

export const MediaTemplates: Record<string, NotificationTemplate> = {
  movie_theater_release: {
    title: (ctx) => `🎬 ${truncate(ctx.movieTitle, 40)} is out!`,
    body: () => `Now playing in theaters. Time to check it off your list!`,
    category: 'ENTERTAINMENT',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'default',
  },

  movie_streaming_release: {
    title: (ctx) => `🎬 ${truncate(ctx.movieTitle, 35)} is streaming`,
    body: (ctx) => ctx.platform
      ? `Now available on ${ctx.platform}!`
      : `Now available for streaming!`,
    category: 'ENTERTAINMENT',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'default',
  },

  show_new_season: {
    title: (ctx) => `📺 ${truncate(ctx.showTitle, 35)} Season ${ctx.season}`,
    body: () => `New season is out! Time to binge.`,
    category: 'ENTERTAINMENT',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'default',
  },
};

// ============================================
// RESERVATION/BOOKING NOTIFICATIONS
// ============================================

export const ReservationTemplates: Record<string, NotificationTemplate> = {
  reservation_day_before: {
    title: (ctx) => `🍽️ Reservation tomorrow`,
    body: (ctx) => {
      if (ctx.venueName && ctx.time) {
        return `${ctx.venueName} at ${ctx.time}. Don't forget!`;
      }
      return `You have a reservation tomorrow. Check the details!`;
    },
    category: 'RESERVATION',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  reservation_hours_before: {
    title: (ctx) => `🍽️ Reservation in ${ctx.hoursUntil || 2} hours`,
    body: (ctx) => ctx.venueName
      ? `${ctx.venueName} is expecting you!`
      : `Your reservation is coming up soon!`,
    category: 'RESERVATION',
    haptic: 'heavy',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  hotel_checkin_reminder: {
    title: (ctx) => `🏨 Hotel check-in today`,
    body: (ctx) => ctx.hotelName
      ? `Check-in at ${ctx.hotelName}. Have a great stay!`
      : `Your hotel check-in is today. Safe travels!`,
    category: 'TRAVEL',
    haptic: 'medium',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  flight_day_before: {
    title: (ctx) => `✈️ Flight tomorrow`,
    body: (ctx) => {
      if (ctx.destination && ctx.departureTime) {
        return `${ctx.destination} at ${ctx.departureTime}. Pack your bags!`;
      }
      return `Your flight is tomorrow. Double-check everything!`;
    },
    category: 'TRAVEL',
    haptic: 'heavy',
    channel: 'journalmate_activities',
    priority: 'high',
  },

  flight_hours_before: {
    title: (ctx) => `✈️ Flight in ${ctx.hoursUntil || 4} hours`,
    body: () => `Passport, tickets, essentials - all ready? Safe travels!`,
    category: 'TRAVEL',
    haptic: 'urgent',
    channel: 'journalmate_activities',
    priority: 'high',
  },
};

// ============================================
// SMART ASSISTANT NOTIFICATIONS
// ============================================

export const AssistantTemplates: Record<string, NotificationTemplate> = {
  idle_reminder: {
    title: () => `👋 We miss you!`,
    body: () => `Ready to plan your next adventure?`,
    category: 'ASSISTANT',
    haptic: 'light',
    channel: 'journalmate_assistant',
    priority: 'low',
  },

  unfinished_planning: {
    title: (ctx) => `📝 Continue planning?`,
    body: (ctx) => `You started "${truncate(ctx.activityTitle, 35)}" - want to finish it?`,
    category: 'ASSISTANT',
    haptic: 'light',
    channel: 'journalmate_assistant',
    priority: 'low',
  },

  suggested_activity: {
    title: () => `💡 Activity suggestion`,
    body: (ctx) => ctx.suggestion
      ? `Based on your interests: ${truncate(ctx.suggestion, 45)}`
      : `We have a suggestion based on your interests!`,
    category: 'ASSISTANT',
    haptic: 'light',
    channel: 'journalmate_assistant',
    priority: 'low',
  },

  calendar_conflict: {
    title: () => `⚠️ Schedule conflict detected`,
    body: (ctx) => `"${truncate(ctx.activity1, 20)}" overlaps with "${truncate(ctx.activity2, 20)}"`,
    category: 'ASSISTANT',
    haptic: 'heavy',
    channel: 'journalmate_assistant',
    priority: 'high',
  },

  weather_alert: {
    title: (ctx) => `🌤️ Weather update`,
    body: (ctx) => `${ctx.weather} expected for "${truncate(ctx.activityTitle, 30)}" - plan accordingly`,
    category: 'ASSISTANT',
    haptic: 'medium',
    channel: 'journalmate_assistant',
    priority: 'default',
  },
};

// ============================================
// JOURNAL NOTIFICATIONS
// ============================================

export const JournalTemplates: Record<string, NotificationTemplate> = {
  daily_journal_prompt: {
    title: () => `📔 Time to reflect`,
    body: () => `Take a moment to journal about your day`,
    category: 'JOURNAL',
    haptic: 'light',
    channel: 'journalmate_assistant',
    priority: 'low',
  },

  journal_streak: {
    title: (ctx) => `📔 ${ctx.streakCount}-day journal streak!`,
    body: () => `Keep the momentum going with today's entry`,
    category: 'JOURNAL',
    haptic: 'medium',
    channel: 'journalmate_achievements',
    priority: 'default',
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Get the appropriate template for a notification type
 */
export function getTemplate(notificationType: string): NotificationTemplate | null {
  // Check all template collections
  const allTemplates: Record<string, NotificationTemplate> = {
    ...TaskTemplates,
    ...ActivityTemplates,
    ...GoalTemplates,
    ...GroupTemplates,
    ...StreakTemplates,
    ...AccountabilityTemplates,
    ...MediaTemplates,
    ...ReservationTemplates,
    ...AssistantTemplates,
    ...JournalTemplates,
  };

  return allTemplates[notificationType] || null;
}

/**
 * Generate a notification message from a template
 */
export function generateNotificationMessage(
  notificationType: string,
  context: Record<string, any>
): { title: string; body: string; haptic: string; channel: string; category: string; priority: string } | null {
  const template = getTemplate(notificationType);
  if (!template) {
    console.warn(`No template found for notification type: ${notificationType}`);
    return null;
  }

  return {
    title: template.title(context),
    body: template.body(context),
    haptic: template.haptic,
    channel: template.channel,
    category: template.category,
    priority: template.priority,
  };
}

/**
 * Get streak milestone template if applicable
 */
export function getStreakMilestoneTemplate(streakCount: number): string | null {
  const milestones = [365, 100, 60, 30, 14, 7];
  for (const milestone of milestones) {
    if (streakCount === milestone) {
      return `streak_milestone_${milestone}`;
    }
  }
  return null;
}

/**
 * Get all notification channels for Android
 */
export function getNotificationChannels(): Array<{
  id: string;
  name: string;
  description: string;
  importance: 'low' | 'default' | 'high';
}> {
  return [
    {
      id: 'journalmate_tasks',
      name: 'Task Reminders',
      description: 'Reminders for upcoming and overdue tasks',
      importance: 'high',
    },
    {
      id: 'journalmate_activities',
      name: 'Activity Updates',
      description: 'Updates about your planned activities and trips',
      importance: 'high',
    },
    {
      id: 'journalmate_groups',
      name: 'Group Activity',
      description: 'Invites, joins, and updates from your groups',
      importance: 'high',
    },
    {
      id: 'journalmate_streaks',
      name: 'Streak Reminders',
      description: 'Reminders to maintain your activity streaks',
      importance: 'default',
    },
    {
      id: 'journalmate_achievements',
      name: 'Achievements',
      description: 'Milestone celebrations and badge unlocks',
      importance: 'default',
    },
    {
      id: 'journalmate_assistant',
      name: 'Smart Assistant',
      description: 'Suggestions, tips, and check-in reminders',
      importance: 'low',
    },
  ];
}

/**
 * Map haptic type to Android vibration pattern (in milliseconds)
 */
export function getHapticPattern(hapticType: string): number[] {
  const patterns: Record<string, number[]> = {
    light: [0, 50],
    medium: [0, 100, 50, 100],
    heavy: [0, 200, 100, 200],
    celebration: [0, 100, 50, 100, 50, 200, 100, 300],
    urgent: [0, 300, 100, 300, 100, 300],
  };
  return patterns[hapticType] || patterns.medium;
}
