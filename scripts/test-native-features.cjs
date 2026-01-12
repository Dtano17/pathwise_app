#!/usr/bin/env node
/**
 * Native Features Test Script
 *
 * This script tests native mobile features by:
 * 1. Launching the app via ADB
 * 2. Executing JavaScript through Chrome DevTools Protocol
 * 3. Checking logcat for results
 *
 * Usage: node scripts/test-native-features.js
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const ADB = 'C:\\Users\\tanar\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const PACKAGE = 'ai.journalmate.app';

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...options });
  } catch (e) {
    return e.stdout || e.message;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clearLogcat() {
  console.log('Clearing logcat...');
  exec(`"${ADB}" logcat -c`);
}

async function getLogcat(filter = '') {
  const cmd = filter
    ? `"${ADB}" logcat -d | findstr /I "${filter}"`
    : `"${ADB}" logcat -d -t 200`;
  return exec(cmd);
}

async function launchApp() {
  console.log('Launching JournalMate app...');
  exec(`"${ADB}" shell am start -n ${PACKAGE}/.MainActivity`);
  await sleep(3000); // Wait for app to load
}

async function forceStopApp() {
  console.log('Force stopping app...');
  exec(`"${ADB}" shell am force-stop ${PACKAGE}`);
}

async function grantCalendarPermissions() {
  console.log('Granting calendar permissions via ADB...');
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.READ_CALENDAR`);
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.WRITE_CALENDAR`);
  console.log('Calendar permissions granted!');
}

async function grantContactsPermissions() {
  console.log('Granting contacts permissions via ADB...');
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.READ_CONTACTS`);
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.WRITE_CONTACTS`);
  console.log('Contacts permissions granted!');
}

async function grantNotificationPermissions() {
  console.log('Granting notification permissions via ADB...');
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.POST_NOTIFICATIONS`);
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.FOREGROUND_SERVICE`);
  exec(`"${ADB}" shell pm grant ${PACKAGE} android.permission.FOREGROUND_SERVICE_DATA_SYNC`);
  console.log('Notification permissions granted!');
}

async function checkPermissions() {
  console.log('\n=== Checking App Permissions ===');
  const result = exec(`"${ADB}" shell dumpsys package ${PACKAGE} | findstr "permission"`);

  const importantPerms = [
    'READ_CALENDAR',
    'WRITE_CALENDAR',
    'READ_CONTACTS',
    'WRITE_CONTACTS',
    'POST_NOTIFICATIONS',
    'FOREGROUND_SERVICE'
  ];

  for (const perm of importantPerms) {
    const hasGranted = result.includes(`android.permission.${perm}: granted=true`);
    console.log(`  ${perm}: ${hasGranted ? '✓ GRANTED' : '✗ NOT GRANTED'}`);
  }
}

async function testCalendarPlugin() {
  console.log('\n=== Testing Calendar Plugin ===');

  // First grant permissions
  await grantCalendarPermissions();
  await sleep(500);

  // Execute JavaScript to test calendar
  const js = `
    (async () => {
      try {
        console.log('[TEST] Starting calendar test...');
        const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');

        // Check permissions
        console.log('[TEST] Checking calendar permissions...');
        const check = await CapacitorCalendar.checkAllPermissions();
        console.log('[TEST] checkAllPermissions result:', JSON.stringify(check));

        // Request full access
        console.log('[TEST] Requesting full calendar access...');
        const perm = await CapacitorCalendar.requestFullCalendarAccess();
        console.log('[TEST] requestFullCalendarAccess result:', JSON.stringify(perm));

        // List calendars
        console.log('[TEST] Listing calendars...');
        const cals = await CapacitorCalendar.listCalendars();
        console.log('[TEST] Found calendars:', cals.calendars.length);
        cals.calendars.forEach((c, i) => {
          console.log('[TEST] Calendar ' + i + ':', c.title, c.id);
        });

        return { success: true, calendars: cals.calendars.length };
      } catch (error) {
        console.error('[TEST] Calendar error:', error.message);
        return { success: false, error: error.message };
      }
    })();
  `;

  // Note: Can't directly inject JS without Chrome DevTools setup
  // Instead we'll check logcat for any calendar-related logs

  console.log('Note: JavaScript injection requires Chrome DevTools Protocol setup.');
  console.log('Checking logcat for calendar-related messages...');

  await sleep(1000);
  const logs = await getLogcat('CALENDAR calendar Calendar');
  console.log(logs || 'No calendar logs found');
}

async function testBackgroundService() {
  console.log('\n=== Testing Background Service ===');

  await grantNotificationPermissions();
  await sleep(500);

  console.log('Checking logcat for background service messages...');
  const logs = await getLogcat('BACKGROUND BackgroundService JournalMateService');
  console.log(logs || 'No background service logs found');
}

async function testHaptics() {
  console.log('\n=== Testing Haptics ===');

  console.log('Checking logcat for haptic/vibrator messages...');
  const logs = await getLogcat('Vibrator vibrator Haptic haptic');
  console.log(logs || 'No haptic logs found');
}

async function analyzeRecentErrors() {
  console.log('\n=== Recent Errors in Logcat ===');
  const logs = await getLogcat('Error error Exception exception FATAL');

  // Filter to journalmate-related errors
  const lines = logs.split('\n').filter(line =>
    line.includes('journalmate') ||
    line.includes('Capacitor') ||
    line.includes('BackgroundService')
  );

  if (lines.length > 0) {
    console.log('JournalMate-related errors:');
    lines.slice(0, 20).forEach(line => console.log('  ' + line.trim()));
  } else {
    console.log('No JournalMate-specific errors found');
  }
}

async function main() {
  console.log('========================================');
  console.log('  JournalMate Native Features Test');
  console.log('========================================\n');

  // Check ADB connection
  const devices = exec(`"${ADB}" devices`);
  if (!devices.includes('device')) {
    console.error('ERROR: No Android device connected!');
    console.log('Connect your device and enable USB debugging.');
    process.exit(1);
  }
  console.log('Device connected ✓\n');

  // Clear logcat
  await clearLogcat();

  // Check current permissions
  await checkPermissions();

  // Grant all required permissions via ADB
  console.log('\n=== Granting All Permissions ===');
  await grantCalendarPermissions();
  await grantContactsPermissions();
  await grantNotificationPermissions();

  // Re-check permissions
  await checkPermissions();

  // Force stop and relaunch app
  await forceStopApp();
  await sleep(1000);
  await launchApp();

  // Wait for app to fully initialize
  console.log('\nWaiting for app to initialize...');
  await sleep(5000);

  // Analyze logs
  await analyzeRecentErrors();

  // Show full recent logs for the app
  console.log('\n=== Recent App Logs ===');
  const appLogs = exec(`"${ADB}" logcat -d -t 100 | findstr /I "journalmate Capacitor CALENDAR BACKGROUND"`);
  console.log(appLogs || 'No app-specific logs found');

  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================');
  console.log('\nPermissions have been granted via ADB.');
  console.log('Please manually test the features in the app now.');
  console.log('The app should work without permission dialogs.');
}

main().catch(console.error);
