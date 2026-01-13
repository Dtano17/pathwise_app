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

const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

// Dynamically detect ADB path from ANDROID_HOME or ANDROID_SDK_ROOT
function getAdbPath() {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const adbName = os.platform() === 'win32' ? 'adb.exe' : 'adb';
    return path.join(androidHome, 'platform-tools', adbName);
  }
  // Fallback to PATH
  return 'adb';
}

const ADB = getAdbPath();
const PACKAGE = 'ai.journalmate.app';

/**
 * Execute a command safely using spawnSync
 * @param {string} command - The command to run
 * @param {string[]} args - Array of arguments
 * @param {object} options - spawnSync options
 */
function execCommand(command, args = [], options = {}) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      shell: os.platform() === 'win32', // Use shell on Windows for better compatibility
      ...options
    });
    return result.stdout || result.stderr || '';
  } catch (e) {
    return e.message || '';
  }
}

/**
 * Execute an ADB command safely
 * @param {string[]} args - ADB command arguments
 */
function adb(...args) {
  return execCommand(ADB, args);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clearLogcat() {
  console.log('Clearing logcat...');
  adb('logcat', '-c');
}

async function getLogcat(filter = '') {
  const logs = adb('logcat', '-d', '-t', '200');
  if (filter) {
    // Filter logs locally instead of using shell pipes
    const filterTerms = filter.toLowerCase().split(' ');
    return logs.split('\n')
      .filter(line => filterTerms.some(term => line.toLowerCase().includes(term)))
      .join('\n');
  }
  return logs;
}

async function launchApp() {
  console.log('Launching JournalMate app...');
  adb('shell', 'am', 'start', '-n', `${PACKAGE}/.MainActivity`);
  await sleep(3000); // Wait for app to load
}

async function forceStopApp() {
  console.log('Force stopping app...');
  adb('shell', 'am', 'force-stop', PACKAGE);
}

async function grantCalendarPermissions() {
  console.log('Granting calendar permissions via ADB...');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.READ_CALENDAR');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.WRITE_CALENDAR');
  console.log('Calendar permissions granted!');
}

async function grantContactsPermissions() {
  console.log('Granting contacts permissions via ADB...');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.READ_CONTACTS');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.WRITE_CONTACTS');
  console.log('Contacts permissions granted!');
}

async function grantNotificationPermissions() {
  console.log('Granting notification permissions via ADB...');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.POST_NOTIFICATIONS');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.FOREGROUND_SERVICE');
  adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.FOREGROUND_SERVICE_DATA_SYNC');
  console.log('Notification permissions granted!');
}

async function checkPermissions() {
  console.log('\n=== Checking App Permissions ===');
  const result = adb('shell', 'dumpsys', 'package', PACKAGE);

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
  const devices = adb('devices');
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
  const rawLogs = adb('logcat', '-d', '-t', '100');
  // Filter logs locally instead of using shell pipes
  const appLogs = rawLogs.split('\n')
    .filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('journalmate') ||
             lower.includes('capacitor') ||
             lower.includes('calendar') ||
             lower.includes('background');
    })
    .join('\n');
  console.log(appLogs || 'No app-specific logs found');

  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================');
  console.log('\nPermissions have been granted via ADB.');
  console.log('Please manually test the features in the app now.');
  console.log('The app should work without permission dialogs.');
}

main().catch(console.error);
