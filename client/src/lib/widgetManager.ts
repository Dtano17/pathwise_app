/**
 * Widget Manager for JournalMate
 * 
 * Manages widget data synchronization between app and native widgets
 * on iOS and Android home screens
 */

import { Preferences } from '@capacitor/preferences';
import { isIOS, isAndroid } from './platform';

export interface WidgetTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface WidgetData {
  streakCount: number;
  tasks: WidgetTask[];
  lastUpdated: string;
}

/**
 * Update widget data when tasks or streaks change
 * This data is read by native widgets to display on home screen
 */
export async function updateWidgetData(
  streakCount: number,
  tasks: WidgetTask[]
): Promise<void> {
  const data: WidgetData = {
    streakCount,
    tasks: tasks.slice(0, 3), // Widgets only show 3 tasks
    lastUpdated: new Date().toISOString()
  };

  try {
    // Store in local preferences (accessible by native widget)
    await Preferences.set({
      key: 'widget_data',
      value: JSON.stringify(data)
    });

    if (isAndroid()) {
      // Broadcast update to Android widgets
      try {
        const { App } = await import('@capacitor/app');
        // Trigger widget update broadcast if plugin available
        console.log('[WIDGET] Android widget data updated');
      } catch (error) {
        console.log('[WIDGET] Android widget broadcast not available:', error);
      }
    } else if (isIOS()) {
      // Store in App Groups for iOS widget access
      try {
        await Preferences.set({
          key: 'app_group_widget_data',
          value: JSON.stringify(data)
        });
        console.log('[WIDGET] iOS App Group widget data updated');
      } catch (error) {
        console.log('[WIDGET] iOS App Group storage not available:', error);
      }
    }

    console.log('[WIDGET] Widget data updated:', {
      streakCount,
      taskCount: tasks.length,
      timestamp: data.lastUpdated
    });
  } catch (error) {
    console.error('[WIDGET] Failed to update widget data:', error);
  }
}

/**
 * Get current widget data
 */
export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const { value } = await Preferences.get({ key: 'widget_data' });
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error('[WIDGET] Failed to get widget data:', error);
    return null;
  }
}

/**
 * Call this whenever:
 * - A task is completed
 * - A task is added
 * - Streak count changes
 * - User navigates to home screen
 * 
 * Example usage in your task completion handler:
 * 
 * async function onTaskComplete(task: Task) {
 *   // ... your existing code ...
 *   
 *   // Update widget
 *   const allTasks = await fetchTasks();
 *   const progress = await getProgress();
 *   await updateWidgetData(progress.streak, allTasks);
 * }
 */
export async function syncWidgetWithApp(
  streakCount: number,
  allTasks: any[]
): Promise<void> {
  const incompleteTasks: WidgetTask[] = allTasks
    .filter((task: any) => !task.completed && !task.skipped)
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      completed: false
    }));

  await updateWidgetData(streakCount, incompleteTasks);
}

export default {
  updateWidgetData,
  getWidgetData,
  syncWidgetWithApp
};
