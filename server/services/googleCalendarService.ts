/**
 * Google Calendar Service
 *
 * Bidirectional sync between app activities and Google Calendar.
 * - Push: Add activities to user's Google Calendar
 * - Pull: Import events from Google Calendar as activities
 *
 * Uses OAuth tokens stored in externalOAuthTokens table.
 */

import { google, calendar_v3 } from 'googleapis';
import { storage } from '../storage';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Calendar ID for the user's primary calendar
const PRIMARY_CALENDAR = 'primary';

// Custom property to identify events created by our app
const APP_EVENT_SOURCE = 'pathwise-app';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

interface ActivityForCalendar {
  id: number;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  category?: string;
  googleCalendarEventId?: string;
}

/**
 * Check if Google Calendar is configured
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

/**
 * Create an OAuth2 client with user's tokens
 */
async function getOAuth2Client(userId: number): Promise<ReturnType<typeof google.auth.OAuth2> | null> {
  if (!isGoogleCalendarConfigured()) {
    console.log('[GOOGLE_CALENDAR] Not configured - missing client ID/secret');
    return null;
  }

  // Get user's OAuth token
  const token = await storage.getOAuthToken(userId, 'google');
  if (!token) {
    console.log(`[GOOGLE_CALENDAR] No Google OAuth token for user ${userId}`);
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken || undefined,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      console.log(`[GOOGLE_CALENDAR] Token refreshed for user ${userId}`);
      await storage.upsertOAuthToken({
        userId,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || token.refreshToken || undefined,
        scope: token.scope,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });
    }
  });

  return oauth2Client;
}

/**
 * Get Calendar API client for a user
 */
async function getCalendarClient(userId: number): Promise<calendar_v3.Calendar | null> {
  const auth = await getOAuth2Client(userId);
  if (!auth) return null;

  return google.calendar({ version: 'v3', auth });
}

/**
 * Check if user has Calendar access (valid tokens with calendar scope)
 */
export async function hasCalendarAccess(userId: number): Promise<boolean> {
  const token = await storage.getOAuthToken(userId, 'google');
  if (!token) return false;

  // Check if scope includes calendar
  return token.scope?.includes('calendar') || false;
}

/**
 * Push an activity to Google Calendar
 */
export async function pushActivityToCalendar(
  userId: number,
  activity: ActivityForCalendar
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Calendar not available. Please reconnect your Google account.' };
  }

  try {
    // Build event from activity
    const event: CalendarEvent = {
      summary: activity.title,
      description: buildEventDescription(activity),
      location: activity.location,
      start: buildEventDateTime(activity.startDate),
      end: buildEventDateTime(activity.endDate || activity.startDate, true),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 }, // 1 hour before
          { method: 'popup', minutes: 1440 }, // 1 day before
        ],
      },
    };

    // Check if event already exists (update vs create)
    if (activity.googleCalendarEventId) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId: PRIMARY_CALENDAR,
        eventId: activity.googleCalendarEventId,
        requestBody: event,
      });

      console.log(`[GOOGLE_CALENDAR] Updated event ${response.data.id} for activity ${activity.id}`);
      return { success: true, eventId: response.data.id || undefined };
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: PRIMARY_CALENDAR,
        requestBody: {
          ...event,
          extendedProperties: {
            private: {
              source: APP_EVENT_SOURCE,
              activityId: activity.id.toString(),
            },
          },
        },
      });

      console.log(`[GOOGLE_CALENDAR] Created event ${response.data.id} for activity ${activity.id}`);
      return { success: true, eventId: response.data.id || undefined };
    }
  } catch (error: any) {
    console.error(`[GOOGLE_CALENDAR] Error pushing activity ${activity.id}:`, error.message);

    // Check for auth errors
    if (error.code === 401 || error.code === 403) {
      return { success: false, error: 'Calendar access expired. Please reconnect your Google account.' };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Create a generic event on Google Calendar (not tied to an activity)
 */
export async function createCalendarEvent(
  userId: number,
  eventData: {
    calendarId?: string;
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    location?: string;
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Calendar not available. Please reconnect your Google account.' };
  }

  try {
    const response = await calendar.events.insert({
      calendarId: eventData.calendarId || PRIMARY_CALENDAR,
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: eventData.start,
        end: eventData.end,
        extendedProperties: {
          private: {
            source: APP_EVENT_SOURCE,
          },
        },
      },
    });

    console.log(`[GOOGLE_CALENDAR] Created generic event ${response.data.id}`);
    return { success: true, eventId: response.data.id || undefined };
  } catch (error: any) {
    console.error(`[GOOGLE_CALENDAR] Error creating event:`, error.message);

    if (error.code === 401 || error.code === 403) {
      return { success: false, error: 'Calendar access expired. Please reconnect your Google account.' };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteCalendarEvent(
  userId: number,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Calendar not available' };
  }

  try {
    await calendar.events.delete({
      calendarId: PRIMARY_CALENDAR,
      eventId,
    });

    console.log(`[GOOGLE_CALENDAR] Deleted event ${eventId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[GOOGLE_CALENDAR] Error deleting event ${eventId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Pull events from Google Calendar (for import as activities)
 */
export async function pullCalendarEvents(
  userId: number,
  options: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  } = {}
): Promise<{ success: boolean; events?: any[]; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Calendar not available. Please reconnect your Google account.' };
  }

  try {
    const timeMin = options.timeMin || new Date();
    const timeMax = options.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const response = await calendar.events.list({
      calendarId: PRIMARY_CALENDAR,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: options.maxResults || 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary,
      description: event.description,
      location: event.location,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      isAllDay: !event.start?.dateTime,
      htmlLink: event.htmlLink,
      // Check if this event was created by our app
      isFromApp: event.extendedProperties?.private?.source === APP_EVENT_SOURCE,
      activityId: event.extendedProperties?.private?.activityId,
    })) || [];

    console.log(`[GOOGLE_CALENDAR] Pulled ${events.length} events for user ${userId}`);
    return { success: true, events };
  } catch (error: any) {
    console.error(`[GOOGLE_CALENDAR] Error pulling events:`, error.message);

    if (error.code === 401 || error.code === 403) {
      return { success: false, error: 'Calendar access expired. Please reconnect your Google account.' };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Get list of user's calendars
 */
export async function getUserCalendars(userId: number): Promise<{ success: boolean; calendars?: any[]; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Calendar not available' };
  }

  try {
    const response = await calendar.calendarList.list();
    const calendars = response.data.items?.map(cal => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description,
      isPrimary: cal.primary,
      backgroundColor: cal.backgroundColor,
    })) || [];

    return { success: true, calendars };
  } catch (error: any) {
    console.error(`[GOOGLE_CALENDAR] Error getting calendars:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Build event description from activity
 */
function buildEventDescription(activity: ActivityForCalendar): string {
  let description = activity.description || '';

  if (activity.category) {
    description += `\n\nCategory: ${activity.category}`;
  }

  description += '\n\n---\nCreated with PathWise';

  return description.trim();
}

/**
 * Build event date/time object
 */
function buildEventDateTime(
  dateString?: string,
  isEnd: boolean = false
): CalendarEvent['start'] {
  if (!dateString) {
    // Default to today/tomorrow
    const date = new Date();
    if (isEnd) {
      date.setDate(date.getDate() + 1);
    }
    return { date: date.toISOString().split('T')[0] };
  }

  // Check if it's a full datetime or just a date
  if (dateString.includes('T')) {
    // Full datetime
    return {
      dateTime: dateString,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  } else {
    // Date only (all-day event)
    return { date: dateString };
  }
}

/**
 * Sync all user activities to Google Calendar
 */
export async function syncAllActivitiesToCalendar(
  userId: number,
  activities: ActivityForCalendar[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const activity of activities) {
    const result = await pushActivityToCalendar(userId, activity);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`${activity.title}: ${result.error}`);
    }
  }

  console.log(`[GOOGLE_CALENDAR] Synced ${results.success} activities, ${results.failed} failed`);
  return results;
}
