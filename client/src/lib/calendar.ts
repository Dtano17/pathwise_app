/**
 * Calendar Integration for Capacitor
 *
 * Enables adding activities and tasks to device calendar with reminders
 * Works with iOS Calendar and Android Calendar/Google Calendar
 */

import { CapacitorCalendar, Calendar, CalendarEvent } from '@ebarooni/capacitor-calendar';
import { isNative, isIOS, isAndroid } from './platform';

export interface CalendarPermissionStatus {
  granted: boolean;
  readOnly: boolean;
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
  };
}

/**
 * Request calendar permissions
 */
export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  if (!isNative()) {
    console.warn('Calendar integration only available on native platforms');
    return { granted: false, readOnly: false };
  }

  try {
    const permission = await CapacitorCalendar.requestAllPermissions();
    
    // iOS returns { readCalendar: true, writeCalendar: true }
    // Android returns { readCalendar: true, writeCalendar: true }
    const granted = permission.readCalendar && permission.writeCalendar;
    const readOnly = permission.readCalendar && !permission.writeCalendar;
    
    console.log('[CALENDAR] Permission status:', { granted, readOnly });
    return { granted, readOnly };
  } catch (error) {
    console.error('[CALENDAR] Failed to request permission:', error);
    return { granted: false, readOnly: false };
  }
}

/**
 * Check calendar permissions
 */
export async function checkCalendarPermission(): Promise<CalendarPermissionStatus> {
  if (!isNative()) {
    return { granted: false, readOnly: false };
  }

  try {
    const permission = await CapacitorCalendar.checkAllPermissions();
    const granted = permission.readCalendar && permission.writeCalendar;
    const readOnly = permission.readCalendar && !permission.writeCalendar;
    
    return { granted, readOnly };
  } catch (error) {
    console.error('[CALENDAR] Failed to check permission:', error);
    return { granted: false, readOnly: false };
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
 * Prefers writable calendars
 */
export async function getDefaultCalendar(): Promise<Calendar | null> {
  const calendars = await getCalendars();
  
  if (calendars.length === 0) {
    return null;
  }
  
  // Find first writable calendar
  const writableCalendar = calendars.find(cal => !cal.isReadOnly);
  if (writableCalendar) {
    return writableCalendar;
  }
  
  // Fallback to first calendar
  return calendars[0];
}

/**
 * Add activity to calendar
 */
export async function addActivityToCalendar(options: AddToCalendarOptions): Promise<{ success: boolean; eventId?: string; error?: string }> {
  if (!isNative()) {
    console.warn('[CALENDAR] Calendar integration only available on native platforms');
    return { success: false, error: 'Not available on web' };
  }

  try {
    // Check/request permission
    let permission = await checkCalendarPermission();
    if (!permission.granted) {
      permission = await requestCalendarPermission();
      if (!permission.granted) {
        return { success: false, error: 'Calendar permission denied' };
      }
    }

    // Get default calendar
    const calendar = await getDefaultCalendar();
    if (!calendar) {
      return { success: false, error: 'No calendar available' };
    }

    // Prepare event
    const event: CalendarEvent = {
      title: options.title,
      startDate: options.startDate.getTime(),
      endDate: options.endDate ? options.endDate.getTime() : options.startDate.getTime() + (60 * 60 * 1000), // 1 hour default
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
      error: error.message || 'Failed to add event to calendar' 
    };
  }
}

/**
 * Add task to calendar
 */
export async function addTaskToCalendar(
  title: string,
  dueDate: Date,
  notes?: string,
  reminderMinutes: number = 30
): Promise<{ success: boolean; eventId?: string; error?: string }> {
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
  }>
): Promise<{ 
  success: boolean; 
  addedCount: number; 
  failedCount: number; 
  errors: string[];
}> {
  const errors: string[] = [];
  let addedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      let result;
      
      if (item.type === 'task') {
        result = await addTaskToCalendar(item.title, item.date, item.notes);
      } else {
        const duration = item.duration || 60; // Default 1 hour
        const endDate = new Date(item.date.getTime() + (duration * 60 * 1000));
        
        result = await addActivityToCalendar({
          title: item.title,
          startDate: item.date,
          endDate,
          notes: item.notes,
          location: item.location,
          alarms: [{ minutesBefore: 30 }],
        });
      }
      
      if (result.success) {
        addedCount++;
      } else {
        failedCount++;
        errors.push(`${item.title}: ${result.error}`);
      }
    } catch (error: any) {
      failedCount++;
      errors.push(`${item.title}: ${error.message}`);
    }
  }

  console.log(`[CALENDAR] Batch add complete: ${addedCount} added, ${failedCount} failed`);
  
  return {
    success: addedCount > 0,
    addedCount,
    failedCount,
    errors,
  };
}

/**
 * Open calendar app on device
 */
export async function openCalendarApp(date?: Date): Promise<void> {
  if (!isNative()) {
    console.warn('[CALENDAR] Calendar app only available on native platforms');
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
  activityNotes?: string
): Promise<{ success: boolean; addedCount: number; error?: string }> {
  // Add main activity event
  const activityResult = await addActivityToCalendar({
    title: activityTitle,
    startDate: activityDate,
    endDate: new Date(activityDate.getTime() + (2 * 60 * 60 * 1000)), // 2 hours default
    location: activityLocation,
    notes: activityNotes,
    alarms: [
      { minutesBefore: 30 }, // 30 min before
      { minutesBefore: 24 * 60 }, // 1 day before
    ],
  });

  let addedCount = activityResult.success ? 1 : 0;

  // Add individual tasks as calendar events
  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      if (task.dueDate) {
        const taskResult = await addTaskToCalendar(
          task.title,
          task.dueDate,
          `Part of: ${activityTitle}`,
          60 // 1 hour reminder
        );
        
        if (taskResult.success) {
          addedCount++;
        }
      }
    }
  }

  return {
    success: addedCount > 0,
    addedCount,
    error: !activityResult.success ? activityResult.error : undefined,
  };
}

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
};
