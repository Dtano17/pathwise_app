/**
 * Background Service Manager for Android
 *
 * Provides JavaScript API to control:
 * - Foreground service (persistent notification at top)
 * - Background sync (periodic task fetching)
 * - Task reminders (automatic notifications when tasks are due)
 *
 * These features only work on Android native app.
 */

import { registerPlugin } from '@capacitor/core';
import { isAndroid } from './platform';

// Define interface for BackgroundService plugin
interface BackgroundServicePlugin {
  startForegroundService(): Promise<{ success: boolean }>;
  stopForegroundService(): Promise<{ success: boolean }>;
  updateProgress(options: {
    completedTasks: number;
    totalTasks: number;
    streak: number;
    nextTaskTitle?: string;
    nextTaskTime?: string;
  }): Promise<{ success: boolean }>;
  enableBackgroundSync(options: { intervalMinutes: number }): Promise<{ success: boolean; intervalMinutes: number }>;
  disableBackgroundSync(): Promise<{ success: boolean }>;
  setUserCredentials(options: { userId: string; authToken: string }): Promise<{ success: boolean }>;
  clearUserCredentials(): Promise<{ success: boolean }>;
  setReminderPreferences(options: { minutesBefore: number }): Promise<{ success: boolean }>;
  getStatus(): Promise<{
    backgroundSyncEnabled: boolean;
    syncIntervalMinutes: number;
    reminderMinutesBefore: number;
    hasCredentials: boolean;
  }>;
}

// Register the plugin
const BackgroundService = registerPlugin<BackgroundServicePlugin>('BackgroundService');

/**
 * Check if background services are available (Android only)
 */
export function isBackgroundServiceAvailable(): boolean {
  return isAndroid();
}

/**
 * Start the foreground service
 * Shows a persistent notification at the top with task progress
 */
export async function startForegroundService(): Promise<boolean> {
  if (!isAndroid()) {
    console.log('[BACKGROUND] Foreground service only available on Android');
    return false;
  }

  try {
    const result = await BackgroundService.startForegroundService();
    console.log('[BACKGROUND] Foreground service started:', result.success);
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to start foreground service:', error);
    return false;
  }
}

/**
 * Stop the foreground service
 */
export async function stopForegroundService(): Promise<boolean> {
  if (!isAndroid()) {
    return false;
  }

  try {
    const result = await BackgroundService.stopForegroundService();
    console.log('[BACKGROUND] Foreground service stopped:', result.success);
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to stop foreground service:', error);
    return false;
  }
}

/**
 * Update the foreground notification with current progress
 * Call this when task data changes
 */
export async function updateTaskProgress(options: {
  completedTasks: number;
  totalTasks: number;
  streak?: number;
  nextTaskTitle?: string;
  nextTaskTime?: string;
}): Promise<boolean> {
  if (!isAndroid()) {
    return false;
  }

  try {
    const result = await BackgroundService.updateProgress({
      completedTasks: options.completedTasks,
      totalTasks: options.totalTasks,
      streak: options.streak || 0,
      nextTaskTitle: options.nextTaskTitle,
      nextTaskTime: options.nextTaskTime,
    });
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to update progress:', error);
    return false;
  }
}

/**
 * Enable background sync
 * Periodically fetches tasks and schedules reminders even when app is closed
 *
 * @param intervalMinutes - Sync interval (minimum 15 minutes)
 */
export async function enableBackgroundSync(intervalMinutes: number = 60): Promise<boolean> {
  if (!isAndroid()) {
    console.log('[BACKGROUND] Background sync only available on Android');
    return false;
  }

  try {
    const result = await BackgroundService.enableBackgroundSync({ intervalMinutes });
    console.log('[BACKGROUND] Background sync enabled, interval:', result.intervalMinutes, 'min');
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to enable background sync:', error);
    return false;
  }
}

/**
 * Disable background sync
 */
export async function disableBackgroundSync(): Promise<boolean> {
  if (!isAndroid()) {
    return false;
  }

  try {
    const result = await BackgroundService.disableBackgroundSync();
    console.log('[BACKGROUND] Background sync disabled');
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to disable background sync:', error);
    return false;
  }
}

/**
 * Store user credentials for background workers
 * Background workers need these to authenticate with the API
 *
 * Call this after user login
 */
export async function setBackgroundCredentials(userId: string, authToken: string): Promise<boolean> {
  if (!isAndroid()) {
    return false;
  }

  try {
    const result = await BackgroundService.setUserCredentials({ userId, authToken });
    console.log('[BACKGROUND] Credentials stored for background sync');
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to store credentials:', error);
    return false;
  }
}

/**
 * Clear stored credentials
 * Call this on logout
 */
export async function clearBackgroundCredentials(): Promise<boolean> {
  if (!isAndroid()) {
    return false;
  }

  try {
    const result = await BackgroundService.clearUserCredentials();
    console.log('[BACKGROUND] Credentials cleared');
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to clear credentials:', error);
    return false;
  }
}

/**
 * Set task reminder preferences
 *
 * @param minutesBefore - How many minutes before due date to show reminder
 */
export async function setReminderTime(minutesBefore: number): Promise<boolean> {
  if (!isAndroid()) {
    return false;
  }

  try {
    const result = await BackgroundService.setReminderPreferences({ minutesBefore });
    console.log('[BACKGROUND] Reminder time set to', minutesBefore, 'minutes before');
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to set reminder preferences:', error);
    return false;
  }
}

/**
 * Get current background service status
 */
export async function getBackgroundServiceStatus(): Promise<{
  backgroundSyncEnabled: boolean;
  syncIntervalMinutes: number;
  reminderMinutesBefore: number;
  hasCredentials: boolean;
} | null> {
  if (!isAndroid()) {
    return null;
  }

  try {
    return await BackgroundService.getStatus();
  } catch (error) {
    console.error('[BACKGROUND] Failed to get status:', error);
    return null;
  }
}

/**
 * Initialize background services after login
 * Sets up credentials and enables features
 */
export async function initializeBackgroundServices(
  userId: string,
  authToken: string,
  options?: {
    enableForeground?: boolean;
    enableSync?: boolean;
    syncIntervalMinutes?: number;
    reminderMinutesBefore?: number;
  }
): Promise<void> {
  if (!isAndroid()) {
    console.log('[BACKGROUND] Background services only available on Android');
    return;
  }

  const {
    enableForeground = true,
    enableSync = true,
    syncIntervalMinutes = 60,
    reminderMinutesBefore = 30,
  } = options || {};

  // Store credentials
  await setBackgroundCredentials(userId, authToken);

  // Set reminder preferences
  await setReminderTime(reminderMinutesBefore);

  // Enable background sync
  if (enableSync) {
    await enableBackgroundSync(syncIntervalMinutes);
  }

  // Start foreground service
  if (enableForeground) {
    await startForegroundService();
  }

  console.log('[BACKGROUND] Background services initialized');
}

/**
 * Cleanup background services on logout
 */
export async function cleanupBackgroundServices(): Promise<void> {
  if (!isAndroid()) {
    return;
  }

  await stopForegroundService();
  await disableBackgroundSync();
  await clearBackgroundCredentials();

  console.log('[BACKGROUND] Background services cleaned up');
}

export default {
  isBackgroundServiceAvailable,
  startForegroundService,
  stopForegroundService,
  updateTaskProgress,
  enableBackgroundSync,
  disableBackgroundSync,
  setBackgroundCredentials,
  clearBackgroundCredentials,
  setReminderTime,
  getBackgroundServiceStatus,
  initializeBackgroundServices,
  cleanupBackgroundServices,
};
