/**
 * ICS Calendar File Generator
 *
 * Generates .ics files that can be imported into any calendar app
 * (Google Calendar, Apple Calendar, Samsung Calendar, Outlook, etc.)
 */

import { Capacitor } from '@capacitor/core';

export interface ICSEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  category?: string;
}

/**
 * Format a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Fold long lines per ICS spec (max 75 chars per line)
 */
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) return line;

  const result: string[] = [];
  let remaining = line;
  let isFirst = true;

  while (remaining.length > 0) {
    const chunkLength = isFirst ? maxLength : maxLength - 1;
    const chunk = remaining.substring(0, chunkLength);
    remaining = remaining.substring(chunkLength);

    if (isFirst) {
      result.push(chunk);
      isFirst = false;
    } else {
      result.push(' ' + chunk);
    }
  }

  return result.join('\r\n');
}

/**
 * Generate an ICS file content from an array of events
 */
export function generateICS(events: ICSEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JournalMate//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:JournalMate Tasks',
  ];

  for (const event of events) {
    const uid = `${event.id}@journalmate.ai`;
    const dtstamp = formatICSDate(new Date());
    const dtstart = formatICSDate(event.startDate);
    const dtend = formatICSDate(event.endDate);
    const summary = escapeICS(event.title);

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(foldLine(`DTSTAMP:${dtstamp}`));
    lines.push(foldLine(`DTSTART:${dtstart}`));
    lines.push(foldLine(`DTEND:${dtend}`));
    lines.push(foldLine(`SUMMARY:${summary}`));

    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICS(event.description)}`));
    }

    if (event.location) {
      lines.push(foldLine(`LOCATION:${escapeICS(event.location)}`));
    }

    if (event.category) {
      lines.push(foldLine(`CATEGORIES:${escapeICS(event.category)}`));
    }

    // Add a reminder 30 minutes before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(foldLine(`DESCRIPTION:Reminder: ${summary}`));
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Download or share an ICS file
 *
 * On mobile: Uses the native Share API to open the calendar import flow
 * On web: Downloads the file
 */
export async function downloadOrShareICS(events: ICSEvent[], filename: string): Promise<boolean> {
  const icsContent = generateICS(events);
  const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');

  // On mobile, use Share API - opens native calendar import
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Write the ICS file to cache directory
      const filePath = `${safeFilename}.ics`;
      await Filesystem.writeFile({
        path: filePath,
        data: icsContent,
        directory: Directory.Cache,
        encoding: 'utf8' as any,
      });

      // Get the file URI
      const fileUri = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Cache,
      });

      // Share the file - this will open the system share sheet
      // On iOS/Android, sharing an .ics file will prompt to add to calendar
      await Share.share({
        title: 'Add to Calendar',
        files: [fileUri.uri],
      });

      // Clean up the temporary file after a delay
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: filePath,
            directory: Directory.Cache,
          });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 60000); // Delete after 1 minute

      return true;
    } catch (error) {
      console.error('[ICS] Share failed:', error);
      // Fall back to web download method
      return downloadICSWeb(icsContent, safeFilename);
    }
  } else {
    // Web: download file
    return downloadICSWeb(icsContent, safeFilename);
  }
}

/**
 * Web-only download method
 */
function downloadICSWeb(icsContent: string, filename: string): boolean {
  try {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('[ICS] Download failed:', error);
    return false;
  }
}

/**
 * Generate ICS content for a single task
 */
export function generateTaskICS(task: {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  timeEstimate?: string;
  category?: string;
  activityTitle?: string;
}): string {
  // Calculate end time based on time estimate
  const startDate = new Date(task.dueDate);
  const endDate = calculateEndTime(startDate, task.timeEstimate);

  // Build description with JournalMate link
  const descParts: string[] = [];
  if (task.description) descParts.push(task.description);
  if (task.activityTitle) descParts.push(`Activity: ${task.activityTitle}`);
  descParts.push(`📱 Open in JournalMate: https://journalmate.ai/app?task=${task.id}`);

  const event: ICSEvent = {
    id: task.id,
    title: task.title,
    description: descParts.join('\n'),
    startDate,
    endDate,
    category: task.category,
  };

  return generateICS([event]);
}

/**
 * Generate ICS content for an activity with all its tasks
 */
export function generateActivityICS(
  activity: {
    id: string;
    title: string;
    description?: string;
    category?: string;
  },
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate: Date;
    timeEstimate?: string;
    category?: string;
  }>
): string {
  const events: ICSEvent[] = tasks.map((task) => {
    const startDate = new Date(task.dueDate);
    const endDate = calculateEndTime(startDate, task.timeEstimate);

    // Build description with activity context and JournalMate link
    const descParts: string[] = [];
    if (task.description) descParts.push(task.description);
    descParts.push(`📋 Activity: ${activity.title}`);
    if (task.category) descParts.push(`Category: ${task.category}`);
    descParts.push(`📱 Open in JournalMate: https://journalmate.ai/app?task=${task.id}`);

    return {
      id: task.id,
      title: task.title,
      description: descParts.join('\n'),
      startDate,
      endDate,
      category: task.category || activity.category,
    };
  });

  return generateICS(events);
}

/**
 * Calculate end time based on time estimate string
 */
function calculateEndTime(startDate: Date, timeEstimate?: string): Date {
  const endDate = new Date(startDate);

  if (!timeEstimate) {
    // Default to 1 hour
    endDate.setHours(endDate.getHours() + 1);
    return endDate;
  }

  // Parse time estimate like "30 min", "1 hour", "2 hours", "1.5 hours", "90 minutes"
  const hourMatch = timeEstimate.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minMatch = timeEstimate.match(/(\d+)\s*m/i);

  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    endDate.setMinutes(endDate.getMinutes() + Math.round(hours * 60));
  } else if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    endDate.setMinutes(endDate.getMinutes() + minutes);
  } else {
    // Default to 1 hour if can't parse
    endDate.setHours(endDate.getHours() + 1);
  }

  return endDate;
}
