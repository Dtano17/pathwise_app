# 🚀 Quick Start - Mobile App

## Start the Expo Dev Server

```bash
cd mobile
npx expo start --tunnel --clear
```

## What You'll See

1. Expo dev server starts
2. A QR code appears
3. Metro bundler starts building your app
4. Terminal shows: `[API] Using backend URL: https://...`

## Scan QR Code

- **iOS**: Open Camera app → Point at QR code → Tap notification
- **Android**: Open Expo Go app → Tap "Scan QR code"

## First Launch

- First time takes ~1 minute to build
- You'll see a purple splash screen
- Then the app loads with tabs at bottom

## Verify It Works

Look for in the terminal:
```
[API] Using backend URL: https://4f9903c2-0076-4cd7-a19b-2fb36f4173fe-00-3cq0d74q496xs.kirk.replit.dev
```

This confirms the app is connecting to your Replit backend.

## Update Backend URL (When Replit URL Changes)

1. Edit `mobile/.env`
2. Change `EXPO_PUBLIC_API_URL=https://new-url.replit.dev`
3. Stop Expo (Ctrl+C)
4. Restart: `npx expo start --tunnel --clear`

That's it! 🎉
