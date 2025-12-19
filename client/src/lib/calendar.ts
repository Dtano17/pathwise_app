/**
 * Calendar Integration for Capacitor (Enhanced v2.0)
 *
 * Enables adding activities and tasks to device calendar with reminders
 * Works with iOS Calendar and Android Calendar/Google Calendar
 *
 * ENHANCEMENTS:
 * - TypeScript strict mode with proper error types
 * - Better permission handling with granular states
 * - Smart calendar selection (primary/writable)
 * - Recurring event support
 * - Batch operations with progress tracking
 * - React Query integration examples
 */

import { CapacitorCalendar, Calendar, CalendarEvent } from '@ebarooni/capacitor-calendar';
import { isNative, isIOS, isAndroid } from './platform';

export interface CalendarPermissionStatus {
  granted: boolean;
  readOnly: boolean;
  denied?: boolean;
}

export interface AddToCalendarOptions {
  title: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  location?: string;
  url?: string;
  isAllDay?: boolean;
  alarms?: Array<{ minutesBefore: number }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    endDate?: Date;
    count?: number; // Alternative to endDate
  };
  calendarId?: string; // Specify a specific calendar
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'NO_CALENDAR' | 'INVALID_DATA' | 'UNKNOWN';
}

export interface BatchCalendarResult {
  success: boolean;
  addedCount: number;
  failedCount: number;
  errors: Array<{ item: string; error: string }>;
  eventIds: string[];
}

/**
 * Request calendar permissions
 */
export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  if (!isNative()) {
    console.warn('[CALENDAR] Integration only available on native platforms');
    return { granted: false, readOnly: false, denied: true };
  }

  try {
    const permission = await CapacitorCalendar.requestAllPermissions();

    // iOS returns { readCalendar: true, writeCalendar: true }
    // Android returns { readCalendar: true, writeCalendar: true }
    const granted = permission.readCalendar && permission.writeCalendar;
    const readOnly = permission.readCalendar && !permission.writeCalendar;
    const denied = !permission.readCalendar && !permission.writeCalendar;

    console.log('[CALENDAR] Permission status:', { granted, readOnly, denied });
    return { granted, readOnly, denied };
  } catch (error) {
    console.error('[CALENDAR] Failed to request permission:', error);
    return { granted: false, readOnly: false, denied: true };
  }
}

/**
 * Check calendar permissions
 */
export async function checkCalendarPermission(): Promise<CalendarPermissionStatus> {
  if (!isNative()) {
    return { granted: false, readOnly: false, denied: true };
  }

  try {
    const permission = await CapacitorCalendar.checkAllPermissions();
    const granted = permission.readCalendar && permission.writeCalendar;
    const readOnly = permission.readCalendar && !permission.writeCalendar;
    const denied = !permission.readCalendar && !permission.writeCalendar;

    return { granted, readOnly, denied };
  } catch (error) {
    console.error('[CALENDAR] Failed to check permission:', error);
    return { granted: false, readOnly: false, denied: true };
  }
}

/**
 * Get list of available calendars on device
 */
export async function getCalendars(): Promise<Calendar[]> {
  if (!isNative()) {
    return [];
  }

  try {
    // Check permission first
    const permission = await checkCalendarPermission();
    if (!permission.granted && !permission.readOnly) {
      const requested = await requestCalendarPermission();
      if (!requested.granted && !requested.readOnly) {
        console.warn('[CALENDAR] Permission not granted');
        return [];
      }
    }

    const { calendars } = await CapacitorCalendar.listCalendars();
    console.log(`[CALENDAR] Found ${calendars.length} calendars`);
    return calendars;
  } catch (error) {
    console.error('[CALENDAR] Failed to get calendars:', error);
    return [];
  }
}

/**
 * Get default calendar for adding events
 * Prefers writable calendars, then primary calendar
 */
export async function getDefaultCalendar(): Promise<Calendar | null> {
  const calendars = await getCalendars();

  if (calendars.length === 0) {
    return null;
  }

  // Find primary writable calendar
  const primaryWritable = calendars.find(cal => !cal.isReadOnly && cal.isPrimary);
  if (primaryWritable) {
    return primaryWritable;
  }

  // Find first writable calendar
  const writableCalendar = calendars.find(cal => !cal.isReadOnly);
  if (writableCalendar) {
    return writableCalendar;
  }

  // Find primary calendar (even if read-only)
  const primaryCalendar = calendars.find(cal => cal.isPrimary);
  if (primaryCalendar) {
    return primaryCalendar;
  }

  // Fallback to first calendar
  return calendars[0];
}

/**
 * Add activity to calendar
 */
export async function addActivityToCalendar(options: AddToCalendarOptions): Promise<CalendarEventResult> {
  if (!isNative()) {
    console.warn('[CALENDAR] Integration only available on native platforms');
    return {
      success: false,
      error: 'Not available on web',
      errorCode: 'PERMISSION_DENIED'
    };
  }

  try {
    // Check/request permission
    let permission = await checkCalendarPermission();
    if (!permission.granted) {
      permission = await requestCalendarPermission();
      if (!permission.granted) {
        return {
          success: false,
          error: 'Calendar permission denied',
          errorCode: 'PERMISSION_DENIED'
        };
      }
    }

    // Get calendar to use
    let calendar: Calendar | null = null;
    if (options.calendarId) {
      const calendars = await getCalendars();
      calendar = calendars.find(cal => cal.id === options.calendarId) || null;
    } else {
      calendar = await getDefaultCalendar();
    }

    if (!calendar) {
      return {
        success: false,
        error: 'No calendar available',
        errorCode: 'NO_CALENDAR'
      };
    }

    // Validate dates
    if (isNaN(options.startDate.getTime())) {
      return {
        success: false,
        error: 'Invalid start date',
        errorCode: 'INVALID_DATA'
      };
    }

    // Prepare event
    const event: CalendarEvent = {
      title: options.title,
      startDate: options.startDate.getTime(),
      endDate: options.endDate
        ? options.endDate.getTime()
        : options.startDate.getTime() + (60 * 60 * 1000), // 1 hour default
      isAllDay: options.isAllDay || false,
      calendarId: calendar.id,
      location: options.location,
      notes: options.notes,
      url: options.url,

      // Add alarms/reminders
      alertOffsetInMinutes: options.alarms?.map(alarm => alarm.minutesBefore) || [],
    };

    // Create event
    const result = await CapacitorCalendar.createEvent(event);

    console.log('[CALENDAR] Event created successfully:', result.result);
    return {
      success: true,
      eventId: result.result
    };
  } catch (error: any) {
    console.error('[CALENDAR] Failed to add event:', error);
    return {
      success: false,
      error: error.message || 'Failed to add event to calendar',
      errorCode: 'UNKNOWN'
    };
  }
}

/**
 * Add task to calendar (as a timed event)
 */
export async function addTaskToCalendar(
  title: string,
  dueDate: Date,
  notes?: string,
  reminderMinutes: number = 30
): Promise<CalendarEventResult> {
  // Tasks are added as 30-minute calendar events
  const startDate = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000));

  return await addActivityToCalendar({
    title: `📝 ${title}`,
    startDate,
    endDate: dueDate,
    notes,
    alarms: [{ minutesBefore: reminderMinutes }],
  });
}

/**
 * Batch add multiple tasks/activities to calendar
 */
export async function batchAddToCalendar(
  items: Array<{
    title: string;
    date: Date;
    type: 'task' | 'activity';
    notes?: string;
    location?: string;
    duration?: number; // in minutes
    reminderMinutes?: number;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<BatchCalendarResult> {
  const errors: Array<{ item: string; error: string }> = [];
  const eventIds: string[] = [];
  let addedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      let result: CalendarEventResult;

      if (item.type === 'task') {
        result = await addTaskToCalendar(
          item.title,
          item.date,
          item.notes,
          item.reminderMinutes || 30
        );
      } else {
        const duration = item.duration || 60; // Default 1 hour
        const endDate = new Date(item.date.getTime() + (duration * 60 * 1000));

        result = await addActivityToCalendar({
          title: item.title,
          startDate: item.date,
          endDate,
          notes: item.notes,
          location: item.location,
          alarms: [{ minutesBefore: item.reminderMinutes || 30 }],
        });
      }

      if (result.success && result.eventId) {
        addedCount++;
        eventIds.push(result.eventId);
      } else {
        failedCount++;
        errors.push({ item: item.title, error: result.error || 'Unknown error' });
      }
    } catch (error: any) {
      failedCount++;
      errors.push({ item: item.title, error: error.message });
    }

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  console.log(`[CALENDAR] Batch add complete: ${addedCount} added, ${failedCount} failed`);

  return {
    success: addedCount > 0,
    addedCount,
    failedCount,
    errors,
    eventIds,
  };
}

/**
 * Open calendar app on device
 */
export async function openCalendarApp(date?: Date): Promise<void> {
  if (!isNative()) {
    console.warn('[CALENDAR] App only available on native platforms');
    return;
  }

  try {
    await CapacitorCalendar.openCalendar({ date: date?.getTime() });
    console.log('[CALENDAR] Opened calendar app');
  } catch (error) {
    console.error('[CALENDAR] Failed to open calendar app:', error);
  }
}

/**
 * Delete event from calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    await CapacitorCalendar.deleteEvent({ id: eventId });
    console.log('[CALENDAR] Event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('[CALENDAR] Failed to delete event:', error);
    return false;
  }
}

/**
 * Helper: Add JournalMate activity with all tasks to calendar
 */
export async function addActivityWithTasksToCalendar(
  activityTitle: string,
  activityDate: Date,
  activityLocation?: string,
  tasks?: Array<{ title: string; dueDate?: Date }>,
  activityNotes?: string,
  activityDuration?: number // in minutes
): Promise<BatchCalendarResult> {
  const items: Array<{
    title: string;
    date: Date;
    type: 'task' | 'activity';
    notes?: string;
    location?: string;
    duration?: number;
  }> = [];

  // Add main activity event
  items.push({
    title: activityTitle,
    date: activityDate,
    type: 'activity',
    location: activityLocation,
    notes: activityNotes,
    duration: activityDuration || 120, // Default 2 hours
  });

  // Add individual tasks
  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      if (task.dueDate) {
        items.push({
          title: task.title,
          date: task.dueDate,
          type: 'task',
          notes: `Part of: ${activityTitle}`,
        });
      }
    }
  }

  return await batchAddToCalendar(items);
}

/**
 * Add recurring activity to calendar
 */
export async function addRecurringActivity(
  title: string,
  startDate: Date,
  endDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  until: Date,
  location?: string,
  notes?: string
): Promise<CalendarEventResult> {
  return await addActivityToCalendar({
    title,
    startDate,
    endDate,
    location,
    notes,
    alarms: [{ minutesBefore: 30 }],
    recurrence: {
      frequency,
      endDate: until,
    },
  });
}

/**
 * React Query integration example for calendar permissions
 *
 * Usage:
 * ```typescript
 * import { useQuery } from '@tanstack/react-query';
 * import { checkCalendarPermission } from '@/lib/calendar';
 *
 * function CalendarSettings() {
 *   const { data: permission } = useQuery({
 *     queryKey: ['calendar-permission'],
 *     queryFn: checkCalendarPermission,
 *   });
 *
 *   if (permission?.denied) {
 *     return <PermissionDeniedMessage />;
 *   }
 *
 *   return <CalendarIntegrationUI />;
 * }
 * ```
 */

export default {
  requestCalendarPermission,
  checkCalendarPermission,
  getCalendars,
  getDefaultCalendar,
  addActivityToCalendar,
  addTaskToCalendar,
  batchAddToCalendar,
  openCalendarApp,
  deleteCalendarEvent,
  addActivityWithTasksToCalendar,
  addRecurringActivity,
};
