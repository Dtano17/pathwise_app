/**
 * Seasonal and time-change notifications
 *
 * - Season starts (adapted to hemisphere via device latitude when available)
 * - Daylight saving time change alerts (based on user timezone)
 */

import type { IStorage } from '../storage';
import { generateNotificationMessage } from './notificationTemplates';
import { sendImmediateNotification } from './smartNotificationScheduler';

type Hemisphere = 'north' | 'south';

function getLocalDateString(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
  } catch {
    return date.toISOString().split('T')[0];
  }
}

function getUserLocalTime(userTimezone: string): Date {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
  } catch {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'UTC' }));
  }
}

function getDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  try {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
    const parts = formatter.formatToParts(utcDate);
    const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    let hourDiff = tzHour - hour;
    const dayDiff = tzDay - day;
    if (dayDiff !== 0) {
      hourDiff += dayDiff * 24;
    }
    return new Date(Date.UTC(year, month, day, hour - hourDiff, minute, 0, 0));
  } catch {
    return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }
}

function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  try {
    const utcInterp = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const userInterp = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (utcInterp.getTime() - userInterp.getTime()) / 60000;
  } catch {
    return 0;
  }
}

async function getUserTimezone(storage: IStorage, userId: string): Promise<string> {
  try {
    const user = await storage.getUser(userId);
    return user?.timezone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function getUserHemisphere(storage: IStorage, userId: string): Promise<Hemisphere> {
  try {
    const prefs = await storage.getUserPreferences(userId);
    const latitude = prefs?.deviceLatitude;
    if (typeof latitude === 'number') {
      return latitude < 0 ? 'south' : 'north';
    }
  } catch {
    // Fall through to default
  }
  return 'north';
}

async function getUserLocationLabel(storage: IStorage, userId: string): Promise<string | null> {
  try {
    const prefs = await storage.getUserPreferences(userId);
    if (prefs?.deviceCity) return prefs.deviceCity;
    const user = await storage.getUser(userId);
    return user?.location || null;
  } catch {
    return null;
  }
}

function getSeasonStarts(year: number, hemisphere: Hemisphere): Array<{ date: { month: number; day: number }; name: string; id: string }> {
  if (hemisphere === 'south') {
    return [
      { date: { month: 2, day: 20 }, name: 'Autumn', id: 'autumn' }, // Mar 20
      { date: { month: 5, day: 21 }, name: 'Winter', id: 'winter' }, // Jun 21
      { date: { month: 8, day: 22 }, name: 'Spring', id: 'spring' }, // Sep 22
      { date: { month: 11, day: 21 }, name: 'Summer', id: 'summer' }, // Dec 21
    ];
  }

  return [
    { date: { month: 2, day: 20 }, name: 'Spring', id: 'spring' }, // Mar 20
    { date: { month: 5, day: 21 }, name: 'Summer', id: 'summer' }, // Jun 21
    { date: { month: 8, day: 22 }, name: 'Autumn', id: 'autumn' }, // Sep 22
    { date: { month: 11, day: 21 }, name: 'Winter', id: 'winter' }, // Dec 21
  ];
}

export async function processSeasonalNotifications(storage: IStorage): Promise<void> {
  try {
    const users = await storage.getUsersWithAccountabilityEnabled();
    let prompted = 0;

    for (const { userId } of users) {
      try {
        const prefs = await storage.getNotificationPreferences(userId);
        if (prefs?.enableSeasonalAlerts === false) continue;

        const timezone = await getUserTimezone(storage, userId);
        const userNow = getUserLocalTime(timezone);
        const userHour = userNow.getHours();
        const userMinute = userNow.getMinutes();

        // Only send during 9:00–9:09 AM local time
        if (userHour !== 9 || userMinute >= 10) continue;

        const hemisphere = await getUserHemisphere(storage, userId);
        const seasonStarts = getSeasonStarts(userNow.getFullYear(), hemisphere);
        const userToday = getLocalDateString(userNow, timezone);

        for (const season of seasonStarts) {
          const seasonDate = getDateInTimezone(
            userNow.getFullYear(),
            season.date.month,
            season.date.day,
            9,
            0,
            timezone,
          );
          if (getLocalDateString(seasonDate, timezone) !== userToday) continue;

          const locationLabel = await getUserLocationLabel(storage, userId);
          const message = generateNotificationMessage('season_change', {
            seasonName: season.name,
            location: locationLabel || undefined,
          });
          if (!message) continue;

          await sendImmediateNotification(storage, userId, {
            type: 'season_change',
            title: message.title,
            body: message.body,
            route: '/app?tab=reports',
            haptic: 'light',
            channel: message.channel,
            sourceType: 'seasonal',
            sourceId: `season_${season.id}_${userToday}_${userId}`,
          });
          prompted++;
        }
      } catch {
        // Skip individual user errors
      }
    }

    if (prompted > 0) {
      console.log(`[SEASONAL] Sent ${prompted} seasonal notifications`);
    }
  } catch (error) {
    console.error('[SEASONAL] Error processing seasonal notifications:', error);
  }
}

export async function processTimeChangeNotifications(storage: IStorage): Promise<void> {
  try {
    const users = await storage.getUsersWithAccountabilityEnabled();
    let prompted = 0;

    for (const { userId } of users) {
      try {
        const prefs = await storage.getNotificationPreferences(userId);
        if (prefs?.enableTimeChangeAlerts === false) continue;

        const timezone = await getUserTimezone(storage, userId);
        const userNow = getUserLocalTime(timezone);
        const userHour = userNow.getHours();
        const userMinute = userNow.getMinutes();

        // Only send during 9:00–9:09 AM local time
        if (userHour !== 9 || userMinute >= 10) continue;

        const userToday = getLocalDateString(userNow, timezone);
        const todayNoon = getDateInTimezone(
          userNow.getFullYear(),
          userNow.getMonth(),
          userNow.getDate(),
          12,
          0,
          timezone,
        );
        const tomorrow = new Date(userNow);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowNoon = getDateInTimezone(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          12,
          0,
          timezone,
        );

        const offsetToday = getTimezoneOffsetMinutes(todayNoon, timezone);
        const offsetTomorrow = getTimezoneOffsetMinutes(tomorrowNoon, timezone);
        if (offsetToday === offsetTomorrow) continue;

        const changeType = offsetTomorrow < offsetToday ? 'forward' : 'back';
        const message = generateNotificationMessage('time_change', {
          changeType,
        });
        if (!message) continue;

        await sendImmediateNotification(storage, userId, {
          type: 'time_change',
          title: message.title,
          body: message.body,
          route: '/app?tab=reports',
          haptic: 'light',
          channel: message.channel,
          sourceType: 'time_change',
          sourceId: `time_change_${userToday}_${userId}`,
        });
        prompted++;
      } catch {
        // Skip individual user errors
      }
    }

    if (prompted > 0) {
      console.log(`[TIME_CHANGE] Sent ${prompted} time-change notifications`);
    }
  } catch (error) {
    console.error('[TIME_CHANGE] Error processing time-change notifications:', error);
  }
}
