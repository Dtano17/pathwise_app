/**
 * Centralized cache invalidation utilities for React Query
 *
 * These functions provide consistent, comprehensive cache invalidation
 * for related data across the application. Always use these instead of
 * manually calling queryClient.invalidateQueries() to ensure all related
 * caches are properly cleared.
 */

import { queryClient } from './queryClient';
import { CACHE_KEYS } from './cacheKeys';

/**
 * Invalidate all activity-related caches
 * Call this after creating, updating, or deleting activities
 */
export async function invalidateActivitiesCache() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.ACTIVITIES }),
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.ACTIVITIES_RECENT }),
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.TASKS }),
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.PROGRESS }),
  ]);
}

/**
 * Invalidate all journal-related caches
 * Call this after creating, updating, or deleting journal entries
 */
export async function invalidateJournalCache() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.JOURNAL_ENTRIES }),
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.JOURNAL_STATS }),
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.USER_PREFERENCES }),
  ]);
}

/**
 * Invalidate all user-specific data caches
 * Call this on sign in/out or when user context changes
 */
export async function invalidateAllUserData() {
  await Promise.all([
    invalidateActivitiesCache(),
    invalidateJournalCache(),
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.SAVED_CONTENT }),
  ]);
}
