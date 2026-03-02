# Testing JournalMate Notifications

Port forwarding is already set up. Follow these steps to test notifications:

## Step 1: Open Chrome DevTools

1. Open Google Chrome browser on your PC
2. Navigate to: `chrome://inspect`
3. Look for "JournalMate" or "journalmate.ai" under "Remote Target"
4. Click **"inspect"** to open DevTools

## Step 2: Test Immediate Notification

In the DevTools **Console** tab, paste this code:

```javascript
// Test immediate notification
(async () => {
  console.log('Testing NativeNotifications plugin...');
  console.log('Capacitor object:', window.Capacitor);
  console.log('Plugins:', window.Capacitor?.Plugins);
  console.log('NativeNotifications:', window.Capacitor?.Plugins?.NativeNotifications);

  const plugin = window.Capacitor?.Plugins?.NativeNotifications;
  if (!plugin) {
    console.error('NativeNotifications plugin not available!');
    return;
  }

  try {
    const result = await plugin.show({
      title: 'Test from DevTools',
      body: 'This should appear in the notification shade!',
      id: 11111
    });
    console.log('Notification result:', result);
  } catch (error) {
    console.error('Notification error:', error);
  }
})();
```

## Step 3: Test Scheduled Notification (10 seconds)

```javascript
// Test scheduled notification (fires in 10 seconds)
(async () => {
  const plugin = window.Capacitor?.Plugins?.NativeNotifications;
  if (!plugin) {
    console.error('NativeNotifications plugin not available!');
    return;
  }

  try {
    const result = await plugin.schedule({
      title: 'Scheduled Test',
      body: 'This was scheduled 10 seconds ago!',
      id: 22222,
      triggerAt: Date.now() + 10000
    });
    console.log('Schedule result:', result);
  } catch (error) {
    console.error('Schedule error:', error);
  }
})();
```

## Expected Results

### If Plugin Works:
- Console shows: `{ success: true, id: 11111 }`
- Notification appears in Android notification shade

### If Plugin Not Available:
- Console shows: `NativeNotifications plugin not available!`
- This means the plugin isn't being exposed to JavaScript

### If Permission Denied:
- Console shows: `{ success: false, error: "Permission not granted" }`
- Need to grant notification permission in app settings

## Troubleshooting

If plugin is not available, check:
1. Is the plugin registered in MainActivity.java? (Line 41: `registerPlugin(NotificationPlugin.class)`)
2. Is the plugin name correct? (Should be "NativeNotifications" in the @CapacitorPlugin annotation)
3. Try restarting the app and checking again
