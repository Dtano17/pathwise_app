/**
 * Background Service Manager for iOS & Android
 *
 * Provides JavaScript API to control:
 * - Foreground service (Android: persistent notification; iOS: no-op, uses Live Activities)
 * - Background sync (Android: WorkManager; iOS: BGTaskScheduler)
 * - Task reminders (automatic notifications when tasks are due)
 * - Widget data updates
 * - Notifications and haptics
 *
 * Works on both Android and iOS native apps.
 */

import { registerPlugin } from '@capacitor/core';
import { isNative } from './platform';

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
  updateWidgetData(options: {
    tasksCompleted: number;
    tasksTotal: number;
    streak: number;
    totalCompleted: number;
    completionRate: number;
    plansComplete: number;
    totalPlans: number;
    unreadNotifications: number;
  }): Promise<{ success: boolean }>;
  refreshWidgets(): Promise<{ success: boolean }>;
  getStatus(): Promise<{
    backgroundSyncEnabled: boolean;
    syncIntervalMinutes: number;
    reminderMinutesBefore: number;
    hasCredentials: boolean;
  }>;
  // One-time notifications
  showNotification(options: { title: string; body: string; id?: number }): Promise<{ success: boolean; id?: number; error?: string }>;
  cancelNotification(options: { id: number }): Promise<{ success: boolean }>;
}

// Register the plugin
const BackgroundService = registerPlugin<BackgroundServicePlugin>('BackgroundService');

/**
 * Check if background services are available (native platforms only)
 */
export function isBackgroundServiceAvailable(): boolean {
  return isNative();
}

/**
 * Start the foreground service
 * Android: Shows a persistent notification at the top with task progress
 * iOS: No-op (iOS uses Live Activities instead), returns success for API compatibility
 */
export async function startForegroundService(): Promise<boolean> {
  if (!isNative()) {
    console.log('[BACKGROUND] Foreground service only available on native');
    return false;
  }

  try {
    console.log('[BACKGROUND] Starting foreground service...');
    const result = await BackgroundService.startForegroundService();
    console.log('[BACKGROUND] Foreground service started:', result.success);
    return result.success;
  } catch (error: any) {
    console.error('[BACKGROUND] Failed to start foreground service:', error);
    console.error('[BACKGROUND] Error message:', error?.message);
    console.error('[BACKGROUND] Error code:', error?.code);
    console.error('[BACKGROUND] Error details:', JSON.stringify(error, null, 2));
    return false;
  }
}

/**
 * Stop the foreground service
 */
export async function stopForegroundService(): Promise<boolean> {
  if (!isNative()) {
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
  if (!isNative()) {
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
  if (!isNative()) {
    console.log('[BACKGROUND] Background sync only available on native');
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
  if (!isNative()) {
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
  if (!isNative()) {
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
  if (!isNative()) {
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
  if (!isNative()) {
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
 * Update widget data cache directly (instant update without API call)
 * Call this with progress data, then call refreshWidgets() to update display
 */
export async function updateWidgetData(data: {
  tasksCompleted: number;
  tasksTotal: number;
  streak: number;
  totalCompleted: number;
  completionRate: number;
  plansComplete: number;
  totalPlans: number;
  unreadNotifications: number;
}): Promise<boolean> {
  console.log('[BACKGROUND] updateWidgetData called:', data);

  if (!isNative()) {
    console.log('[BACKGROUND] updateWidgetData: not native, skipping');
    return false;
  }

  try {
    const result = await BackgroundService.updateWidgetData(data);
    console.log('[BACKGROUND] Widget data updated successfully:', result);
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to update widget data:', error);
    return false;
  }
}

/**
 * Refresh all home screen widgets
 * Call this when task/goal progress changes to update widget immediately
 */
export async function refreshWidgets(): Promise<boolean> {
  console.log('[BACKGROUND] refreshWidgets called');

  if (!isNative()) {
    console.log('[BACKGROUND] refreshWidgets: not native, skipping');
    return false;
  }

  console.log('[BACKGROUND] refreshWidgets: calling BackgroundService.refreshWidgets()');
  try {
    const result = await BackgroundService.refreshWidgets();
    console.log('[BACKGROUND] Widgets refreshed successfully:', result);
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to refresh widgets:', error);
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
  if (!isNative()) {
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
  if (!isNative()) {
    console.log('[BACKGROUND] Background services only available on native');
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

  // Start foreground service (Android: persistent notification; iOS: no-op)
  if (enableForeground) {
    await startForegroundService();
  }

  console.log('[BACKGROUND] Background services initialized');
}

/**
 * Cleanup background services on logout
 */
export async function cleanupBackgroundServices(): Promise<void> {
  if (!isNative()) {
    return;
  }

  await stopForegroundService();
  await disableBackgroundSync();
  await clearBackgroundCredentials();

  console.log('[BACKGROUND] Background services cleaned up');
}

/**
 * Show a one-time notification (for test, reminders, alerts)
 * On native: uses BackgroundService plugin for reliable delivery
 * On web: falls back to Web Notification API
 */
export async function showAlertNotification(options: {
  title: string;
  body: string;
  id?: number;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  if (!isNative()) {
    console.log('[BACKGROUND] showAlertNotification: not native, using web notification');
    // Fallback to web notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(options.title, {
          body: options.body,
          icon: '/icons/pwa/icon-192x192.png',
        });
        return { success: true, id: options.id || Date.now() };
      } catch (error) {
        console.error('[BACKGROUND] Web notification failed:', error);
        return { success: false, error: 'Web notification failed' };
      }
    }
    return { success: false, error: 'Notifications not available' };
  }

  try {
    console.log('[BACKGROUND] showAlertNotification called:', options);
    const result = await BackgroundService.showNotification({
      title: options.title,
      body: options.body,
      id: options.id || Date.now(),
    });
    console.log('[BACKGROUND] showAlertNotification result:', result);
    return result;
  } catch (error: any) {
    console.error('[BACKGROUND] showAlertNotification failed:', error);
    return { success: false, error: error?.message || 'Failed to show notification' };
  }
}

/**
 * Cancel a notification by ID
 */
export async function cancelAlertNotification(id: number): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    const result = await BackgroundService.cancelNotification({ id });
    return result.success;
  } catch (error) {
    console.error('[BACKGROUND] Failed to cancel notification:', error);
    return false;
  }
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
  updateWidgetData,
  refreshWidgets,
  getBackgroundServiceStatus,
  initializeBackgroundServices,
  cleanupBackgroundServices,
  showAlertNotification,
  cancelAlertNotification,
};
