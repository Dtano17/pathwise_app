
# JournalMate Mobile App

This is a React Native wrapper for the JournalMate web app using Expo.

## Quick Start with Expo Go

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Test on your phone:**
   - Install **Expo Go** from the App Store (iOS) or Google Play (Android)
   - Scan the QR code that appears in your terminal
   - The app will load in Expo Go!

## Features

✅ **WebView Wrapper** - Loads your existing web app
✅ **Native Notifications** - Push notifications with haptic feedback
✅ **Native Alerts** - System-level alerts and dialogs
✅ **Works with Web App** - Your web app continues working independently
✅ **Hot Reload** - Changes to web app reflect immediately

## How It Works

- **Development**: Points to `http://0.0.0.0:5000` (your local Replit server)
- **Production**: Points to your deployed Replit URL
- **Web app stays active**: This is just an additional native wrapper

## Adding Native Features

The wrapper injects these capabilities into your web app:

```javascript
// In your web app, you can now call:
window.sendNativeNotification('Title', 'Body', { url: '/tasks' });
```

## Deploying to App Stores (Later)

When ready for production:
```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## Testing Changes

Your web app updates automatically in the mobile wrapper - no rebuild needed!
Just refresh the app in Expo Go to see changes.
