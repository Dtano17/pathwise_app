/**
 * Achievement Service
 *
 * Handles badge unlocking and achievement tracking:
 * - Automatic badge unlocking based on user actions
 * - Achievement notification dispatch
 * - Progress tracking towards badges
 */

import type { IStorage } from '../storage';
import { sendImmediateNotification } from './smartNotificationScheduler';

// Badge definitions with unlock criteria
export const BADGES = {
  // Consistency badges
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 10 tasks before 9 AM',
    icon: '🌅',
    requirement: 10,
    category: 'consistency',
    tier: 'bronze',
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete tasks after 10 PM for 7 days',
    icon: '🦉',
    requirement: 7,
    category: 'consistency',
    tier: 'bronze',
  },
  streak_master_7: {
    id: 'streak_master_7',
    name: 'Week Warrior',
    description: '7-day activity streak',
    icon: '🔥',
    requirement: 7,
    category: 'consistency',
    tier: 'bronze',
  },
  streak_master_30: {
    id: 'streak_master_30',
    name: 'Streak Master',
    description: '30-day activity streak',
    icon: '🏆',
    requirement: 30,
    category: 'consistency',
    tier: 'silver',
  },
  streak_master_100: {
    id: 'streak_master_100',
    name: 'Century Club',
    description: '100-day activity streak',
    icon: '👑',
    requirement: 100,
    category: 'consistency',
    tier: 'gold',
  },

  // Productivity badges
  task_rookie: {
    id: 'task_rookie',
    name: 'Task Rookie',
    description: 'Complete your first 10 tasks',
    icon: '✅',
    requirement: 10,
    category: 'productivity',
    tier: 'bronze',
  },
  task_pro: {
    id: 'task_pro',
    name: 'Task Pro',
    description: 'Complete 50 tasks',
    icon: '💪',
    requirement: 50,
    category: 'productivity',
    tier: 'silver',
  },
  centurion: {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 tasks',
    icon: '🎖️',
    requirement: 100,
    category: 'productivity',
    tier: 'gold',
  },
  task_legend: {
    id: 'task_legend',
    name: 'Task Legend',
    description: 'Complete 500 tasks',
    icon: '🏅',
    requirement: 500,
    category: 'productivity',
    tier: 'platinum',
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete all tasks in a plan',
    icon: '💯',
    requirement: 1,
    category: 'productivity',
    tier: 'silver',
  },

  // Social badges
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share 10 activities with groups',
    icon: '🦋',
    requirement: 10,
    category: 'social',
    tier: 'silver',
  },
  group_leader: {
    id: 'group_leader',
    name: 'Group Leader',
    description: 'Create 3 groups',
    icon: '👥',
    requirement: 3,
    category: 'social',
    tier: 'bronze',
  },
  community_star: {
    id: 'community_star',
    name: 'Community Star',
    description: 'Have 10 people save your shared plan',
    icon: '⭐',
    requirement: 10,
    category: 'social',
    tier: 'gold',
  },

  // Growth badges
  planner: {
    id: 'planner',
    name: 'Planner',
    description: 'Create your first 5 activity plans',
    icon: '📋',
    requirement: 5,
    category: 'growth',
    tier: 'bronze',
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Create plans in 6 different categories',
    icon: '🧭',
    requirement: 6,
    category: 'growth',
    tier: 'silver',
  },
  goal_setter: {
    id: 'goal_setter',
    name: 'Goal Setter',
    description: 'Complete your first goal',
    icon: '🎯',
    requirement: 1,
    category: 'growth',
    tier: 'bronze',
  },
  goal_crusher: {
    id: 'goal_crusher',
    name: 'Goal Crusher',
    description: 'Complete 10 goals',
    icon: '🚀',
    requirement: 10,
    category: 'growth',
    tier: 'gold',
  },

  // Journal badges
  journal_starter: {
    id: 'journal_starter',
    name: 'Journal Starter',
    description: 'Write your first 5 journal entries',
    icon: '📝',
    requirement: 5,
    category: 'growth',
    tier: 'bronze',
  },
  journal_habit: {
    id: 'journal_habit',
    name: 'Journal Habit',
    description: 'Journal for 7 consecutive days',
    icon: '📖',
    requirement: 7,
    category: 'consistency',
    tier: 'silver',
  },
  reflector: {
    id: 'reflector',
    name: 'Deep Reflector',
    description: 'Write 30 journal entries',
    icon: '🪞',
    requirement: 30,
    category: 'growth',
    tier: 'gold',
  },
} as const;

export type BadgeId = keyof typeof BADGES;

/**
 * Check and unlock badges for a user based on their current stats
 */
export async function checkAndUnlockBadges(
  storage: IStorage,
  userId: string,
  triggerEvent?: string
): Promise<string[]> {
  const unlockedBadges: string[] = [];

  try {
    // Get user's current achievements
    const existingAchievements = await storage.getUserAchievements(userId);
    const existingBadgeIds = new Set(existingAchievements.map(a => a.achievementType));

    // Get user stats
    const stats = await getUserStats(storage, userId);

    // Check each badge
    for (const [badgeId, badge] of Object.entries(BADGES)) {
      if (existingBadgeIds.has(badgeId)) {
        continue; // Already unlocked
      }

      const shouldUnlock = checkBadgeUnlock(badgeId as BadgeId, stats);

      if (shouldUnlock) {
        // Unlock the badge
        await storage.createAchievement({
          userId,
          achievementType: badgeId,
          title: badge.name,
          description: badge.description,
          badgeIcon: badge.icon,
          level: getTierLevel(badge.tier),
          unlockedAt: new Date(),
        });

        unlockedBadges.push(badgeId);

        // Send notification
        await sendImmediateNotification(storage, userId, {
          type: 'badge_unlocked',
          title: `${badge.icon} Badge Unlocked!`,
          body: `You earned "${badge.name}" - ${badge.description}`,
          route: '/app?tab=profile&section=achievements',
          haptic: 'celebration',
          channel: 'journalmate_achievements',
          sourceType: 'achievement',
          sourceId: badgeId,
        });

        console.log(`[ACHIEVEMENT] User ${userId} unlocked badge: ${badge.name}`);
      }
    }

    return unlockedBadges;
  } catch (error) {
    console.error('[ACHIEVEMENT] Error checking badges:', error);
    return [];
  }
}

/**
 * Get user stats for badge checking
 */
async function getUserStats(storage: IStorage, userId: string) {
  const [
    completedTasksCount,
    activitiesCount,
    goalsCompleted,
    journalEntriesCount,
    groupsCreated,
    sharedActivities,
    streak,
    categoriesUsed,
    earlyMorningTasks,
    lateNightDays,
    plansWithAllTasksComplete,
  ] = await Promise.all([
    storage.getCompletedTasksCount(userId),
    storage.getActivitiesCount(userId),
    storage.getCompletedGoalsCount(userId),
    storage.getJournalEntriesCount(userId),
    storage.getGroupsCreatedCount(userId),
    storage.getSharedActivitiesCount(userId),
    storage.getUserStreak(userId),
    storage.getUniqueCategoriesUsed(userId),
    storage.getEarlyMorningTasksCount(userId), // Tasks completed before 9 AM
    storage.getLateNightDaysCount(userId), // Days with tasks after 10 PM
    storage.getPlansWithAllTasksComplete(userId),
  ]);

  return {
    completedTasks: completedTasksCount || 0,
    activities: activitiesCount || 0,
    goalsCompleted: goalsCompleted || 0,
    journalEntries: journalEntriesCount || 0,
    groupsCreated: groupsCreated || 0,
    sharedActivities: sharedActivities || 0,
    currentStreak: streak?.currentStreak || 0,
    longestStreak: streak?.longestStreak || 0,
    categoriesUsed: categoriesUsed || 0,
    earlyMorningTasks: earlyMorningTasks || 0,
    lateNightDays: lateNightDays || 0,
    plansWithAllTasksComplete: plansWithAllTasksComplete || 0,
    journalStreak: 0, // TODO: Implement journal-specific streak
  };
}

/**
 * Check if a specific badge should be unlocked
 */
function checkBadgeUnlock(badgeId: BadgeId, stats: Awaited<ReturnType<typeof getUserStats>>): boolean {
  const badge = BADGES[badgeId];

  switch (badgeId) {
    // Consistency
    case 'early_bird':
      return stats.earlyMorningTasks >= badge.requirement;
    case 'night_owl':
      return stats.lateNightDays >= badge.requirement;
    case 'streak_master_7':
      return stats.currentStreak >= 7 || stats.longestStreak >= 7;
    case 'streak_master_30':
      return stats.currentStreak >= 30 || stats.longestStreak >= 30;
    case 'streak_master_100':
      return stats.currentStreak >= 100 || stats.longestStreak >= 100;

    // Productivity
    case 'task_rookie':
      return stats.completedTasks >= 10;
    case 'task_pro':
      return stats.completedTasks >= 50;
    case 'centurion':
      return stats.completedTasks >= 100;
    case 'task_legend':
      return stats.completedTasks >= 500;
    case 'perfectionist':
      return stats.plansWithAllTasksComplete >= 1;

    // Social
    case 'social_butterfly':
      return stats.sharedActivities >= 10;
    case 'group_leader':
      return stats.groupsCreated >= 3;
    case 'community_star':
      return false; // TODO: Implement saves tracking

    // Growth
    case 'planner':
      return stats.activities >= 5;
    case 'explorer':
      return stats.categoriesUsed >= 6;
    case 'goal_setter':
      return stats.goalsCompleted >= 1;
    case 'goal_crusher':
      return stats.goalsCompleted >= 10;

    // Journal
    case 'journal_starter':
      return stats.journalEntries >= 5;
    case 'journal_habit':
      return stats.journalStreak >= 7;
    case 'reflector':
      return stats.journalEntries >= 30;

    default:
      return false;
  }
}

function getTierLevel(tier: string): number {
  const levels: Record<string, number> = {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
  };
  return levels[tier] || 1;
}

/**
 * Get all badges with user's progress
 */
export async function getBadgesWithProgress(
  storage: IStorage,
  userId: string
): Promise<Array<{
  badge: typeof BADGES[BadgeId];
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  progressMax: number;
}>> {
  const existingAchievements = await storage.getUserAchievements(userId);
  const unlockedMap = new Map(existingAchievements.map(a => [a.achievementType, a.unlockedAt]));
  const stats = await getUserStats(storage, userId);

  return Object.entries(BADGES).map(([badgeId, badge]) => {
    const progress = getBadgeProgress(badgeId as BadgeId, stats);
    return {
      badge,
      unlocked: unlockedMap.has(badgeId),
      unlockedAt: unlockedMap.get(badgeId) || undefined,
      progress: Math.min(progress, badge.requirement),
      progressMax: badge.requirement,
    };
  });
}

function getBadgeProgress(badgeId: BadgeId, stats: Awaited<ReturnType<typeof getUserStats>>): number {
  switch (badgeId) {
    case 'early_bird': return stats.earlyMorningTasks;
    case 'night_owl': return stats.lateNightDays;
    case 'streak_master_7':
    case 'streak_master_30':
    case 'streak_master_100':
      return Math.max(stats.currentStreak, stats.longestStreak);
    case 'task_rookie':
    case 'task_pro':
    case 'centurion':
    case 'task_legend':
      return stats.completedTasks;
    case 'perfectionist': return stats.plansWithAllTasksComplete;
    case 'social_butterfly': return stats.sharedActivities;
    case 'group_leader': return stats.groupsCreated;
    case 'community_star': return 0;
    case 'planner': return stats.activities;
    case 'explorer': return stats.categoriesUsed;
    case 'goal_setter':
    case 'goal_crusher':
      return stats.goalsCompleted;
    case 'journal_starter':
    case 'reflector':
      return stats.journalEntries;
    case 'journal_habit': return stats.journalStreak;
    default: return 0;
  }
}
