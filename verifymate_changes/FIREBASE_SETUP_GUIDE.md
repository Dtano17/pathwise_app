# Firebase Setup Guide for JournalMate Push Notifications

## Overview
This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the JournalMate app. Push notifications are already integrated in the codebase - you just need to add Firebase configuration files.

## Prerequisites
- Google account
- Access to Firebase Console (https://console.firebase.google.com)
- Admin access to this codebase

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or **"Create a project"**
3. Enter project details:
   - **Project name**: `JournalMate` (or `journalmate-app`)
   - **Project ID**: Will be auto-generated (e.g., `journalmate-app-abc123`)
   - **Enable Google Analytics**: Optional (recommended for tracking)
4. Click **"Create project"**
5. Wait for project creation to complete (~30 seconds)

---

## Step 2: Add Android App to Firebase

### 2a. Register Android App

1. In Firebase Console, click the **Android icon** (or "Add app" → Android)
2. Fill in app details:
   - **Android package name**: `ai.journalmate.app` (MUST match exactly)
   - **App nickname**: `JournalMate Android` (optional)
   - **Debug signing certificate SHA-1**: Optional for now (needed for Google Sign-In)
3. Click **"Register app"**

### 2b. Download google-services.json

1. Firebase will generate `google-services.json`
2. Click **"Download google-services.json"**
3. **IMPORTANT**: Place this file in:
   ```
   android/app/google-services.json
   ```
4. Verify the file contains your package name:
   ```json
   {
     "project_info": {
       "project_id": "journalmate-app-abc123"
     },
     "client": [
       {
         "client_info": {
           "android_client_info": {
             "package_name": "ai.journalmate.app"
           }
         }
       }
     ]
   }
   ```

### 2c. Verify Android Configuration

The following are already configured in your project - no changes needed:

✅ **build.gradle (Project level)** - already has:
```gradle
classpath 'com.google.gms:google-services:4.4.2'
```

✅ **build.gradle (App level)** - already has:
```gradle
apply plugin: 'com.google.gms.google-services'
dependencies {
    implementation 'com.google.firebase:firebase-messaging:24.1.0'
}
```

✅ **AndroidManifest.xml** - already has push notification permissions

---

## Step 3: Add iOS App to Firebase

### 3a. Register iOS App

1. In Firebase Console, click the **iOS icon** (or "Add app" → iOS)
2. Fill in app details:
   - **iOS bundle ID**: `ai.journalmate.app` (MUST match exactly)
   - **App nickname**: `JournalMate iOS` (optional)
   - **App Store ID**: Leave blank for now (add after App Store submission)
3. Click **"Register app"**

### 3b. Download GoogleService-Info.plist

1. Firebase will generate `GoogleService-Info.plist`
2. Click **"Download GoogleService-Info.plist"**
3. **IMPORTANT**: Place this file in:
   ```
   ios/App/App/GoogleService-Info.plist
   ```
4. **Add to Xcode project**:
   - Open `ios/App/App.xcworkspace` in Xcode
   - Right-click on the "App" folder in Project Navigator
   - Select "Add Files to 'App'..."
   - Select `GoogleService-Info.plist`
   - **Check**: "Copy items if needed"
   - **Check**: "App" target is selected
   - Click "Add"

### 3c. Verify iOS Configuration

✅ **Podfile** - already configured with:
```ruby
pod 'Firebase/Messaging'
```

✅ **Info.plist** - already has notification permissions

✅ **App.entitlements** - already configured

---

## Step 4: Get Firebase Admin SDK Credentials

### 4a. Generate Service Account Key

1. In Firebase Console, click the **gear icon** → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the confirmation dialog
5. A JSON file will download (e.g., `journalmate-app-abc123-firebase-adminsdk-xyz.json`)

### 4b. Extract Required Environment Variables

Open the downloaded JSON file and extract these values:

```json
{
  "project_id": "journalmate-app-abc123",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...",
  "client_email": "firebase-adminsdk-xyz@journalmate-app-abc123.iam.gserviceaccount.com"
}
```

### 4c. Add to Environment Variables

Add these to your `.env` file or Replit Secrets:

```bash
FIREBASE_PROJECT_ID=journalmate-app-abc123
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@journalmate-app-abc123.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT**: The private key must:
- Be wrapped in double quotes
- Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- Have `\n` for newlines (already in the JSON file)

---

## Step 5: Verify Backend Integration

Your backend is already configured to use Firebase! Check `server/services/pushNotificationService.ts`:

```typescript
export async function initializePushNotifications() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[PUSH] Firebase credentials not configured');
    return null;
  }

  // Initializes Firebase Admin SDK
  fcmApp = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  }, 'push-notifications');
}
```

**What happens**:
- ✅ Graceful degradation if credentials missing (warnings only)
- ✅ Automatic initialization on server startup
- ✅ Multi-device support (sends to all user devices)
- ✅ Invalid token cleanup
- ✅ Platform-specific configuration (Android high priority, iOS APNs)

---

## Step 6: Enable Firebase Cloud Messaging API

1. In Firebase Console, go to **"Cloud Messaging"** tab
2. You should see the **Server key** and **Sender ID**
3. **IMPORTANT**: Go to [Google Cloud Console](https://console.cloud.google.com)
4. Select your Firebase project
5. Go to **"APIs & Services"** → **"Library"**
6. Search for **"Firebase Cloud Messaging API"**
7. Click **"Enable"** if not already enabled

---

## Step 7: Test Push Notifications

### 7a. Register a Device Token (Frontend)

The app needs to register device tokens when users log in. This is already implemented in `client/src/lib/fcm.ts` (if present) or should be added:

```typescript
// Example: Register FCM token
import { getToken } from 'firebase/messaging';

async function registerDeviceToken(userId: string) {
  const token = await getToken(messaging, {
    vapidKey: 'YOUR_VAPID_KEY' // Get from Firebase Console → Cloud Messaging → Web Push certificates
  });

  // Send token to backend
  await fetch('/api/users/device-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: 'web' })
  });
}
```

### 7b. Test Sending Notification

Use the backend service to send a test notification:

```typescript
// In server console or test route
import { PushNotificationService } from './services/pushNotificationService';

const pushService = new PushNotificationService(storage);
await pushService.sendToUser('user-id-here', {
  title: 'Test Notification',
  body: 'This is a test push notification!',
  data: { route: '/groups' }
});
```

### 7c. Verify on Device

1. Install app on physical device or emulator
2. Log in as test user
3. Close the app (push notifications only show when app is in background)
4. Send test notification from backend
5. Should see notification appear in system notification tray

---

## Step 8: Production Checklist

Before deploying to production:

- [ ] `google-services.json` added to `android/app/`
- [ ] `GoogleService-Info.plist` added to `ios/App/App/` and Xcode project
- [ ] Firebase environment variables set in production environment
- [ ] Firebase Cloud Messaging API enabled in Google Cloud Console
- [ ] APNs authentication key uploaded to Firebase (for iOS production)
- [ ] Test push notifications on both Android and iOS
- [ ] Verify notification permissions requested correctly
- [ ] Verify device token registration works
- [ ] Verify notifications appear when app is in background/closed
- [ ] Verify deep links work (notification taps open correct screen)

---

## Troubleshooting

### Android: "google-services.json missing"
**Solution**: Verify file is at `android/app/google-services.json` (not in `android/` root)

### iOS: "GoogleService-Info.plist not found"
**Solution**:
1. Open Xcode project
2. Verify file appears in Project Navigator under "App" folder
3. Check file is included in "App" target (File Inspector → Target Membership)

### Backend: "Firebase credentials not configured"
**Solution**:
1. Check `.env` file has all three variables
2. Verify `FIREBASE_PRIVATE_KEY` has proper newlines (`\n`)
3. Restart server after adding credentials

### "No device tokens found for user"
**Solution**:
1. User must be logged in on a device
2. App must request notification permissions
3. Device token must be sent to backend via `/api/users/device-token`

### iOS: Notifications not appearing
**Solution**:
1. Upload APNs authentication key to Firebase Console
2. Go to Firebase Console → Cloud Messaging → Apple app configuration
3. Upload your APNs Auth Key (.p8 file from Apple Developer)
4. Enter Key ID and Team ID

---

## APNs Setup (iOS Production Only)

For iOS production push notifications, you need an APNs Authentication Key:

1. Go to [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/)
2. Create a new key with **Apple Push Notifications service (APNs)** enabled
3. Download the `.p8` file
4. In Firebase Console → Cloud Messaging → Apple app configuration:
   - Upload the `.p8` file
   - Enter **Key ID** (from Apple Developer Console)
   - Enter **Team ID** (from Apple Developer Console)

---

## Security Notes

- ✅ Firebase Admin SDK credentials are server-side only (never exposed to client)
- ✅ Invalid device tokens are automatically cleaned up
- ✅ Graceful degradation if Firebase not configured
- ⚠️ Keep `.p8` APNs key secure (do not commit to git)
- ⚠️ Keep service account JSON secure (do not commit to git)
- ⚠️ Add `google-services.json` and `GoogleService-Info.plist` to `.gitignore` if they contain sensitive info

---

## Cost Considerations

Firebase Cloud Messaging (FCM):
- ✅ **Free for unlimited messages** (no charge for FCM)
- ✅ No Firebase Spark/Blaze plan required for push notifications
- ⚠️ If using Firebase Analytics with push notifications, check usage limits

---

## Support Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [APNs Provider API](https://developer.apple.com/documentation/usernotifications)

---

## Summary

Your JournalMate app already has complete push notification integration! You just need to:

1. **Create Firebase project** (5 minutes)
2. **Download 2 config files** (2 minutes)
3. **Add 3 environment variables** (2 minutes)
4. **Test on devices** (10 minutes)

**Total setup time: ~20 minutes** ⚡

Once configured, push notifications will work automatically for:
- ✅ Group activity updates
- ✅ Task completions
- ✅ Member joins/leaves
- ✅ Activity shares
- ✅ Custom notifications

The backend already handles:
- ✅ Multi-device support
- ✅ Platform-specific formatting (Android/iOS)
- ✅ Invalid token cleanup
- ✅ Batch sending to group members
- ✅ Graceful error handling
