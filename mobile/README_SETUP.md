# JournalMate Mobile App Setup

## Quick Start for Development (Expo Go)

### 1. Update the Backend URL

Edit `mobile/.env` and update the `EXPO_PUBLIC_API_URL` with your current Replit backend URL:

```bash
EXPO_PUBLIC_API_URL=https://your-current-replit-url.replit.dev
```

**How to get your Replit URL:**
- Look at your browser address bar when viewing the web app
- Or click the "Webview" button at the top of Replit
- Copy the full URL (example: `https://abc123-xyz.replit.dev`)

### 2. Clear Caches

```bash
cd mobile
rm -rf .expo .expo-shared node_modules/.cache
```

### 3. Start the Expo Dev Server

```bash
npx expo start --tunnel --clear
```

### 4. Connect Your Phone

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code that appears in the terminal
3. Your app will load on your phone

### Troubleshooting

**If you see "Network Error" or "Unable to connect":**
1. Make sure your backend Express server is running (the web app works)
2. Update the `.env` file with the current Replit URL
3. Restart Expo: `npx expo start --clear`
4. Check the Expo console - it should log `[API] Using backend URL: ...`

**If you see babel errors:**
1. Clear caches: `rm -rf .expo node_modules/.cache`
2. Restart with clear flag: `npx expo start --clear`

**When your Replit URL changes:**
1. Update `mobile/.env` with new URL
2. Restart Expo dev server
3. That's it!

## Architecture

- **Backend**: Shared Express.js API (same as web app)
- **Mobile App**: React Native with Expo Router
- **Navigation**: File-based routing (`app/(tabs)/` structure)
- **Data**: All data comes from the Express backend (PostgreSQL + AI)
- **Authentication**: Shared auth system with web app

## Next Steps (Future)

For production builds (actual iOS/Android apps):
- Set up EAS (Expo Application Services)
- Configure environment variables for production
- Run `eas build --platform ios` or `eas build --platform android`
