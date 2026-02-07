/**
 * Type-safe cache key constants for React Query
 *
 * This centralizes all cache keys to prevent typos and enable type-safe refactoring.
 * Use these constants instead of hardcoded strings when invalidating queries.
 */

export const CACHE_KEYS = {
  // Activities
  ACTIVITIES: ['/api/activities'] as const,
  ACTIVITIES_RECENT: ['/api/activities/recent'] as const,
  TASKS: ['/api/tasks'] as const,
  PROGRESS: ['/api/progress'] as const,
  PROGRESS_STATS: ['/api/progress/stats'] as const,
  REPORTS: ['/api/reports'] as const,

  // Journal
  JOURNAL_ENTRIES: ['/api/journal/entries'] as const,
  JOURNAL_STATS: ['/api/journal/stats'] as const,
  JOURNAL_TEMPLATES: ['/api/journal/templates'] as const,

  // User Data
  USER_PREFERENCES: ['/api/user-preferences'] as const,
  SAVED_CONTENT: ['/api/user/saved-content'] as const,
} as const;

export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];
