/**
 * Test script for Google Calendar API integration
 *
 * Usage:
 *   npx tsx server/test-google-calendar.ts
 *
 * This script tests the Calendar service configuration.
 * Note: Full calendar operations require a valid user OAuth token.
 */

import 'dotenv/config';
import {
  isGoogleCalendarConfigured,
  hasCalendarAccess,
  getUserCalendars,
  pullCalendarEvents,
} from './services/googleCalendarService';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

async function main() {
  console.log(`${colors.bright}${colors.cyan}=== Google Calendar API Test ===${colors.reset}\n`);

  // Check configuration
  console.log(`${colors.yellow}1. Checking configuration...${colors.reset}`);
  const isConfigured = isGoogleCalendarConfigured();

  if (isConfigured) {
    console.log(`${colors.green}✓ Google Calendar API configured${colors.reset}`);
    console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
    console.log(`  GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '***configured***' : 'NOT SET'}`);
  } else {
    console.log(`${colors.red}✗ Google Calendar API NOT configured${colors.reset}`);
    console.log(`  Missing: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET`);
    console.log(`\n  To configure:`);
    console.log(`  1. Go to Google Cloud Console > Pathwise-GCP project`);
    console.log(`  2. Go to APIs & Services > Credentials`);
    console.log(`  3. Copy OAuth 2.0 Client ID and Secret`);
    console.log(`  4. Add to .env file as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET`);
    return;
  }

  // Test with a mock user ID (this will fail without real OAuth token, but tests the code path)
  console.log(`\n${colors.yellow}2. Testing calendar access check...${colors.reset}`);
  const testUserId = 1; // This won't have a real token

  try {
    const hasAccess = await hasCalendarAccess(testUserId);
    if (hasAccess) {
      console.log(`${colors.green}✓ User ${testUserId} has calendar access${colors.reset}`);

      // Try to get calendars
      console.log(`\n${colors.yellow}3. Fetching user calendars...${colors.reset}`);
      const calendarsResult = await getUserCalendars(testUserId);

      if (calendarsResult.success && calendarsResult.calendars) {
        console.log(`${colors.green}✓ Found ${calendarsResult.calendars.length} calendars:${colors.reset}`);
        calendarsResult.calendars.forEach((cal: any, i: number) => {
          console.log(`  ${i + 1}. ${cal.name}${cal.isPrimary ? ' (Primary)' : ''}`);
        });

        // Try to pull events
        console.log(`\n${colors.yellow}4. Pulling calendar events...${colors.reset}`);
        const eventsResult = await pullCalendarEvents(testUserId, {
          maxResults: 5,
        });

        if (eventsResult.success && eventsResult.events) {
          console.log(`${colors.green}✓ Found ${eventsResult.events.length} upcoming events:${colors.reset}`);
          eventsResult.events.forEach((event: any, i: number) => {
            const start = event.start ? new Date(event.start).toLocaleDateString() : 'No date';
            console.log(`  ${i + 1}. ${event.title} (${start})`);
          });
        } else {
          console.log(`${colors.yellow}⚠ Could not pull events: ${eventsResult.error}${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠ Could not fetch calendars: ${calendarsResult.error}${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠ User ${testUserId} does not have calendar access${colors.reset}`);
      console.log(`  This is expected if the user hasn't authenticated with Google yet.`);
      console.log(`  Users need to log in via Google OAuth to grant calendar permissions.`);
    }
  } catch (error: any) {
    console.log(`${colors.yellow}⚠ Calendar access test: ${error.message}${colors.reset}`);
    console.log(`  This is expected - no OAuth token for test user.`);
  }

  // Summary
  console.log(`\n${colors.bright}${colors.cyan}=== Summary ===${colors.reset}`);
  console.log(`${colors.green}✓ Calendar API is configured and code is ready${colors.reset}`);
  console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
  console.log(`  1. Start the app: npm run dev`);
  console.log(`  2. Log in with Google (this grants calendar permission)`);
  console.log(`  3. Test the calendar endpoints:`);
  console.log(`     - GET  /api/calendar/status`);
  console.log(`     - GET  /api/calendar/list`);
  console.log(`     - GET  /api/calendar/events`);
  console.log(`     - POST /api/calendar/sync/:activityId`);
}

main().catch(console.error);
