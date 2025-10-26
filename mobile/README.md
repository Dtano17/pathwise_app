
# JournalMate Mobile App

This is a React Native wrapper for the JournalMate web app using Expo.

## Quick Start with Expo Go

### Step 1: Install Dependencies
```bash
cd mobile
npm install
```

### Step 2: Update Your Replit URL
Open `App.tsx` and update line 28 with your actual Replit development URL:
```typescript
const WEB_URL = 'https://your-repl-url.replit.dev';
```

You can find this URL in your Replit webview window.

### Step 3: Start the Expo Server
```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in your terminal
- Open Expo DevTools in your browser

### Step 4: Test on Your Phone

#### iOS:
1. Install **Expo Go** from the App Store
2. Open Expo Go app
3. Tap "Scan QR Code"
4. Point your camera at the QR code in the terminal
5. Wait for the app to load

#### Android:
1. Install **Expo Go** from Google Play
2. Open Expo Go app
3. Tap "Scan QR Code" 
4. Point your camera at the QR code in the terminal
5. Wait for the app to load

### Step 5: Enable Notifications (Optional)
When the app loads, it will request notification permissions. Allow them to test push notifications.

## Features

✅ **WebView Wrapper** - Loads your existing JournalMate web app
✅ **Native Notifications** - Push notifications from your app
✅ **Native Alerts** - System-level notifications
✅ **Works with Web App** - Your web app continues working independently
✅ **Hot Reload** - Changes to your web app reflect when you refresh

## How It Works

The mobile app is a WebView wrapper that:
- Loads your Replit-hosted web application
- Adds native mobile capabilities (notifications, etc.)
- Enables you to test on real devices via Expo Go
- Shares the same backend and database as your web app

## Troubleshooting

### QR Code Not Scanning
- Make sure your phone and computer are on the same WiFi network
- Try typing the URL manually in Expo Go (shown in terminal)

### App Not Loading
- Check that your Replit web app is running (green "Run" button)
- Verify the WEB_URL in App.tsx matches your Replit URL
- Try opening the URL in your phone's browser first to test

### White Screen
- Wait 10-15 seconds - initial load can be slow
- Pull down to refresh in Expo Go
- Check the Expo console for errors

### Can't Test Notifications
- Notifications only work on physical devices (not simulator)
- Make sure you allowed notification permissions
- Check that Expo Go has notification permissions in phone settings

## Adding Native Features

The wrapper injects these capabilities into your web app:

```javascript
// In your web app JavaScript, you can call:
window.sendNativeNotification('Task Due!', 'Your workout is in 30 minutes', { url: '/tasks' });

// Trigger haptic feedback
window.triggerHaptic('medium'); // 'light', 'medium', 'heavy'

// Check if running in native app
if (window.isNativeApp) {
  console.log('Running on:', window.nativePlatform); // 'ios' or 'android'
}
```

## Next Steps

### For Production Deployment:
1. Install EAS CLI: `npm install -g eas-cli`
2. Build for iOS: `eas build --platform ios`
3. Build for Android: `eas build --platform android`
4. Submit to stores: `eas submit`

### To Update Your App:
Your web app updates automatically in the mobile wrapper - just refresh in Expo Go!

## Tips

- Keep your Replit app running while testing
- Use the Expo Go shake gesture to access debug menu
- Check Replit logs for backend errors
- Test notifications on a real device, not simulator
