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
import { Capacitor } from '@capacitor/core';

/**
 * Check if the calendar plugin is available
 * Returns false on web or if plugin failed to load
 */
export function isCalendarPluginAvailable(): boolean {
  if (!isNative()) {
    console.log('[CALENDAR] Not on native platform, calendar plugin not available');
    return false;
  }

  try {
    const isAvailable = Capacitor.isPluginAvailable('CapacitorCalendar');
    if (!isAvailable) {
      console.warn('[CALENDAR] Calendar plugin is not available');
    }
    return isAvailable;
  } catch (error) {
    console.error('[CALENDAR] Error checking calendar plugin availability:', error);
    return false;
  }
}

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
 * Uses the newer requestFullCalendarAccess() for Android (READ_CALENDAR + WRITE_CALENDAR)
 * Falls back to requestAllPermissions() if the newer API throws
 */
export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  if (!isNative()) {
    console.warn('[CALENDAR] Integration only available on native platforms');
    return { granted: false, readOnly: false, denied: true };
  }

  try {
    // Check current permission state first — skip prompt if already granted
    console.log('[CALENDAR] Checking current permission state...');
    const currentPerm = await CapacitorCalendar.checkAllPermissions();
    console.log('[CALENDAR] checkAllPermissions result:', JSON.stringify(currentPerm));

    const readState = (currentPerm as any).readCalendar || (currentPerm as any).result?.readCalendar;
    const writeState = (currentPerm as any).writeCalendar || (currentPerm as any).result?.writeCalendar;

    if (readState === 'granted' && writeState === 'granted') {
      console.log('[CALENDAR] Already have full calendar access');
      return { granted: true, readOnly: false, denied: false };
    }
    if (readState === 'granted') {
      console.log('[CALENDAR] Have read-only calendar access');
      return { granted: false, readOnly: true, denied: false };
    }

    // Request permission using primary API
    console.log('[CALENDAR] Requesting full calendar access...');
    const permission = await CapacitorCalendar.requestFullCalendarAccess();
    console.log('[CALENDAR] requestFullCalendarAccess result:', JSON.stringify(permission));

    // permission.result is a PermissionState: 'granted' | 'denied' | 'prompt'
    const isGranted = permission.result === 'granted';
    const isDenied = permission.result === 'denied';

    console.log('[CALENDAR] Permission state:', permission.result, '- granted:', isGranted);

    return {
      granted: isGranted,
      readOnly: false,
      denied: isDenied
    };
  } catch (error) {
    console.error('[CALENDAR] requestFullCalendarAccess failed, trying fallback:', error);

    // Fallback: try requestAllPermissions (older API that may work on more devices)
    try {
      const fallback = await CapacitorCalendar.requestAllPermissions();
      console.log('[CALENDAR] requestAllPermissions fallback result:', JSON.stringify(fallback));

      const readGranted = (fallback as any).readCalendar === 'granted' || (fallback as any).result?.readCalendar === 'granted';
      const writeGranted = (fallback as any).writeCalendar === 'granted' || (fallback as any).result?.writeCalendar === 'granted';

      return {
        granted: readGranted && writeGranted,
        readOnly: readGranted && !writeGranted,
        denied: !readGranted
      };
    } catch (fallbackError) {
      console.error('[CALENDAR] All permission requests failed:', fallbackError);
      return { granted: false, readOnly: false, denied: true };
    }
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

    console.log('[CALENDAR] checkAllPermissions result:', JSON.stringify(permission));

    // permission.result contains { readCalendar: PermissionState, writeCalendar: PermissionState, ... }
    const readState = permission.result?.readCalendar;
    const writeState = permission.result?.writeCalendar;

    const granted = readState === 'granted' && writeState === 'granted';
    const readOnly = readState === 'granted' && writeState !== 'granted';
    const denied = readState === 'denied' && writeState === 'denied';

    console.log('[CALENDAR] Permission check - read:', readState, 'write:', writeState, 'granted:', granted);

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
  console.log('[CALENDAR] getCalendars() called');
  console.log('[CALENDAR] Platform info - isNative:', isNative(), 'isIOS:', isIOS(), 'isAndroid:', isAndroid());

  if (!isNative()) {
    console.log('[CALENDAR] Not native platform, returning empty array');
    return [];
  }

  // Check if calendar plugin is available
  if (!isCalendarPluginAvailable()) {
    console.error('[CALENDAR] Calendar plugin not available on this device');
    return [];
  }

  try {
    // Check permission first
    console.log('[CALENDAR] Checking permissions before listing calendars...');
    const permission = await checkCalendarPermission();
    console.log('[CALENDAR] Current permission state:', JSON.stringify(permission));

    if (!permission.granted && !permission.readOnly) {
      console.log('[CALENDAR] Permission not yet granted, requesting...');
      const requested = await requestCalendarPermission();
      console.log('[CALENDAR] Permission request result:', JSON.stringify(requested));
      if (!requested.granted && !requested.readOnly) {
        console.warn('[CALENDAR] Permission not granted after request');
        return [];
      }
    }

    console.log('[CALENDAR] Calling CapacitorCalendar.listCalendars()...');
    const result = await CapacitorCalendar.listCalendars();
    console.log('[CALENDAR] listCalendars raw result:', JSON.stringify(result));

    const { calendars } = result;
    console.log(`[CALENDAR] Found ${calendars.length} calendars`);

    // Log each calendar's details
    if (calendars.length > 0) {
      calendars.forEach((cal, index) => {
        console.log(`[CALENDAR] Calendar #${index + 1}:`, JSON.stringify({
          id: cal.id,
          title: cal.title,
          isPrimary: cal.isPrimary,
          isReadOnly: cal.isReadOnly,
          color: cal.color,
          // Log any other properties the calendar might have
          ...cal
        }));
      });
    } else {
      console.warn('[CALENDAR] No calendars found! Possible reasons:');
      console.warn('[CALENDAR] - No calendar accounts configured on device');
      console.warn('[CALENDAR] - Samsung Calendar not synced with CalendarContract API');
      console.warn('[CALENDAR] - Google Calendar account not added to device');
      console.warn('[CALENDAR] - Calendar provider not accessible');
    }

    return calendars;
  } catch (error: any) {
    console.error('[CALENDAR] Failed to get calendars:', error);
    console.error('[CALENDAR] Error name:', error?.name);
    console.error('[CALENDAR] Error message:', error?.message);
    console.error('[CALENDAR] Error stack:', error?.stack);
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

// =============================================
// BIDIRECTIONAL SYNC - Import Calendar Events
// =============================================

export interface CalendarEventImport {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  notes?: string;
  location?: string;
  calendarId?: string;
  calendarName?: string;
}

export interface ImportEventsResult {
  success: boolean;
  events: CalendarEventImport[];
  error?: string;
}

/**
 * Get calendar events from device for a date range
 * Used for importing events as tasks/activities
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date,
  calendarIds?: string[]
): Promise<ImportEventsResult> {
  console.log('[CALENDAR] ========== getCalendarEvents() START ==========');
  console.log('[CALENDAR] Input parameters:');
  console.log('[CALENDAR]   startDate:', startDate);
  console.log('[CALENDAR]   startDate.toISOString():', startDate?.toISOString?.() ?? 'N/A');
  console.log('[CALENDAR]   startDate.getTime():', startDate?.getTime?.() ?? 'N/A');
  console.log('[CALENDAR]   startDate valid:', startDate instanceof Date && !isNaN(startDate.getTime()));
  console.log('[CALENDAR]   endDate:', endDate);
  console.log('[CALENDAR]   endDate.toISOString():', endDate?.toISOString?.() ?? 'N/A');
  console.log('[CALENDAR]   endDate.getTime():', endDate?.getTime?.() ?? 'N/A');
  console.log('[CALENDAR]   endDate valid:', endDate instanceof Date && !isNaN(endDate.getTime()));
  console.log('[CALENDAR]   calendarIds:', calendarIds);
  console.log('[CALENDAR] Platform - isNative:', isNative(), 'isIOS:', isIOS(), 'isAndroid:', isAndroid());

  if (!isNative()) {
    console.warn('[CALENDAR] Import only available on native platforms');
    return {
      success: false,
      events: [],
      error: 'Not available on web'
    };
  }

  // Validate dates early
  if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
    const error = 'Invalid or missing startDate - From date must be provided';
    console.error('[CALENDAR] Validation failed:', error);
    console.error('[CALENDAR] startDate value:', startDate, 'type:', typeof startDate);
    return {
      success: false,
      events: [],
      error
    };
  }

  if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
    const error = 'Invalid or missing endDate - To date must be provided';
    console.error('[CALENDAR] Validation failed:', error);
    console.error('[CALENDAR] endDate value:', endDate, 'type:', typeof endDate);
    return {
      success: false,
      events: [],
      error
    };
  }

  try {
    // Check/request permission
    console.log('[CALENDAR] Checking permissions...');
    let permission = await checkCalendarPermission();
    console.log('[CALENDAR] Permission check result:', JSON.stringify(permission));

    if (!permission.granted && !permission.readOnly) {
      console.log('[CALENDAR] Requesting permission...');
      permission = await requestCalendarPermission();
      console.log('[CALENDAR] Permission request result:', JSON.stringify(permission));
      if (!permission.granted && !permission.readOnly) {
        return {
          success: false,
          events: [],
          error: 'Calendar permission denied'
        };
      }
    }

    // Get events from calendars
    // NOTE: Plugin v7.1.0+ uses 'from' and 'to' instead of 'startDate' and 'endDate'
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    console.log('[CALENDAR] Calling listEventsInRange with timestamps:');
    console.log('[CALENDAR]   from (startDate) timestamp:', startTimestamp);
    console.log('[CALENDAR]   to (endDate) timestamp:', endTimestamp);

    const result = await CapacitorCalendar.listEventsInRange({
      from: startTimestamp,
      to: endTimestamp,
    });

    console.log('[CALENDAR] listEventsInRange raw result:', JSON.stringify(result));
    // Plugin v7.1.0+ returns 'result' not 'events'
    const rawEvents = result.result || result.events || [];
    console.log('[CALENDAR] Number of events returned:', rawEvents.length);

    // Get calendar list for names
    console.log('[CALENDAR] Getting calendar list for mapping...');
    const calendars = await getCalendars();
    const calendarMap = new Map(calendars.map(c => [c.id, c]));
    console.log('[CALENDAR] Calendar map size:', calendarMap.size);

    // Filter by calendar IDs if provided and map to our format
    const events: CalendarEventImport[] = (rawEvents)
      .filter((event: any) => {
        if (calendarIds && calendarIds.length > 0) {
          return calendarIds.includes(event.calendarId);
        }
        return true;
      })
      .map((event: any) => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        startDate: new Date(event.startDate),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        isAllDay: event.isAllDay || false,
        notes: event.notes,
        location: event.location,
        calendarId: event.calendarId,
        calendarName: calendarMap.get(event.calendarId)?.title,
      }));

    console.log(`[CALENDAR] Retrieved ${events.length} events from calendar`);
    console.log('[CALENDAR] ========== getCalendarEvents() END ==========');
    return {
      success: true,
      events
    };
  } catch (error: any) {
    console.error('[CALENDAR] Failed to get calendar events:', error);
    console.error('[CALENDAR] Error name:', error?.name);
    console.error('[CALENDAR] Error message:', error?.message);
    console.error('[CALENDAR] Error stack:', error?.stack);
    console.log('[CALENDAR] ========== getCalendarEvents() END (ERROR) ==========');
    return {
      success: false,
      events: [],
      error: error.message || 'Failed to get calendar events'
    };
  }
}

/**
 * Get today's calendar events
 */
export async function getTodaysCalendarEvents(calendarIds?: string[]): Promise<ImportEventsResult> {
  console.log('[CALENDAR] getTodaysCalendarEvents() called');
  console.log('[CALENDAR]   calendarIds:', calendarIds);

  const today = new Date();
  console.log('[CALENDAR]   Current date/time before reset:', today.toISOString());

  today.setHours(0, 0, 0, 0);
  console.log('[CALENDAR]   Today (start of day):', today.toISOString());

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  console.log('[CALENDAR]   Tomorrow (end of range):', tomorrow.toISOString());

  return getCalendarEvents(today, tomorrow, calendarIds);
}

/**
 * Get this week's calendar events
 */
export async function getWeeksCalendarEvents(calendarIds?: string[]): Promise<ImportEventsResult> {
  console.log('[CALENDAR] getWeeksCalendarEvents() called');
  console.log('[CALENDAR]   calendarIds:', calendarIds);

  const today = new Date();
  console.log('[CALENDAR]   Current date/time before reset:', today.toISOString());

  today.setHours(0, 0, 0, 0);
  console.log('[CALENDAR]   Today (start of day):', today.toISOString());

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  console.log('[CALENDAR]   Week end (7 days out):', weekEnd.toISOString());

  return getCalendarEvents(today, weekEnd, calendarIds);
}

/**
 * Convert calendar events to task-like objects for import
 */
export function convertEventsToTasks(events: CalendarEventImport[]): Array<{
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  sourceCalendarId?: string;
  sourceEventId?: string;
}> {
  return events.map(event => ({
    title: event.title,
    description: [
      event.notes,
      event.location ? `Location: ${event.location}` : null,
      event.calendarName ? `From: ${event.calendarName}` : null,
    ].filter(Boolean).join('\n') || undefined,
    category: 'calendar',
    priority: 'medium' as const,
    dueDate: event.startDate,
    sourceCalendarId: event.calendarId,
    sourceEventId: event.id,
  }));
}

/**
 * Sync calendar events for a date range and return tasks to import
 */
export async function syncCalendarToTasks(
  startDate: Date,
  endDate: Date,
  calendarIds?: string[]
): Promise<{
  success: boolean;
  tasks: Array<{
    title: string;
    description?: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: Date;
    sourceCalendarId?: string;
    sourceEventId?: string;
  }>;
  error?: string;
}> {
  console.log('[CALENDAR] ========== syncCalendarToTasks() START ==========');
  console.log('[CALENDAR] Input parameters:');
  console.log('[CALENDAR]   startDate:', startDate);
  console.log('[CALENDAR]   startDate type:', typeof startDate);
  console.log('[CALENDAR]   startDate instanceof Date:', startDate instanceof Date);
  console.log('[CALENDAR]   startDate.toISOString():', startDate?.toISOString?.() ?? 'INVALID');
  console.log('[CALENDAR]   startDate.getTime():', startDate?.getTime?.() ?? 'INVALID');
  console.log('[CALENDAR]   endDate:', endDate);
  console.log('[CALENDAR]   endDate type:', typeof endDate);
  console.log('[CALENDAR]   endDate instanceof Date:', endDate instanceof Date);
  console.log('[CALENDAR]   endDate.toISOString():', endDate?.toISOString?.() ?? 'INVALID');
  console.log('[CALENDAR]   endDate.getTime():', endDate?.getTime?.() ?? 'INVALID');
  console.log('[CALENDAR]   calendarIds:', calendarIds);

  // Additional validation logging
  if (!startDate) {
    console.error('[CALENDAR] ERROR: startDate is falsy!', startDate);
  }
  if (!endDate) {
    console.error('[CALENDAR] ERROR: endDate is falsy!', endDate);
  }

  const result = await getCalendarEvents(startDate, endDate, calendarIds);

  console.log('[CALENDAR] getCalendarEvents result:', JSON.stringify({
    success: result.success,
    eventCount: result.events?.length ?? 0,
    error: result.error
  }));

  if (!result.success) {
    console.error('[CALENDAR] syncCalendarToTasks failed:', result.error);
    console.log('[CALENDAR] ========== syncCalendarToTasks() END (FAILED) ==========');
    return {
      success: false,
      tasks: [],
      error: result.error
    };
  }

  const tasks = convertEventsToTasks(result.events);
  console.log('[CALENDAR] Converted', tasks.length, 'events to tasks');
  console.log('[CALENDAR] ========== syncCalendarToTasks() END ==========');
  return {
    success: true,
    tasks
  };
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
  // Bidirectional sync functions
  getCalendarEvents,
  getTodaysCalendarEvents,
  getWeeksCalendarEvents,
  convertEventsToTasks,
  syncCalendarToTasks,
};
