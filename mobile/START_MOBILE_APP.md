# How to Start the Mobile App

## The Problem We Solved

The app was crashing because `app.config.js` tried to import `dotenv` which wasn't installed in the mobile directory. This corrupted React Native's initialization.

## Fixed Solution

The config now reads the `.env` file directly using Node's `fs` module (no external dependencies needed).

## Steps to Run

### 1. Open Terminal in Replit

Make sure you're in the **Shell** tab (not Console).

### 2. Navigate to Mobile Directory

```bash
cd mobile
```

### 3. Start Expo Dev Server

```bash
npx expo start --tunnel --clear
```

**Important flags:**
- `--tunnel`: Creates a public URL so your phone can reach the Replit backend
- `--clear`: Clears Metro bundler cache (prevents stale errors)

### 4. Scan QR Code

- Install **Expo Go** on your phone (App Store or Play Store)
- Scan the QR code that appears in the terminal
- Wait for the app to load (first time takes ~1 minute)

### 5. Verify Connection

You should see in the terminal output:
```
[API] Using backend URL: https://your-replit-url.replit.dev
```

This confirms the app is connecting to the right backend.

## When Your Replit URL Changes

1. Edit `mobile/.env`
2. Update the `EXPO_PUBLIC_API_URL` line
3. Stop Expo (Ctrl+C in terminal)
4. Restart: `npx expo start --tunnel --clear`

## If You Still Get Errors

### "Cannot find module" or "undefined is not an object"

```bash
cd mobile
rm -rf node_modules .expo .expo-shared
npx expo start --clear
```

This will reinstall dependencies and clear all caches.

### "Network Error" when app loads

1. Check that the main backend is running (web app works)
2. Verify the URL in `mobile/.env` matches your Replit URL
3. Make sure you're using `--tunnel` flag

### App shows blank screen

Press `r` in the terminal to reload the app on your phone.

## Current Status

✅ Config fixed to work without external dependencies  
✅ Backend URL configured in `.env`  
✅ Multiple fallback paths for reading config  
✅ Development logging enabled  

Ready to run!
