# Android App Build Guide - JournalMate

## Prerequisites

1. **Install Android Studio**: Download from https://developer.android.com/studio
2. **Install Node.js dependencies**: Already done (Capacitor is installed)
3. **JournalMate Logo**: Located at `client/public/journalmate-logo-transparent.png`

## Step 1: Generate Android Assets

Generate app icons and splash screens with JournalMate branding:

```bash
node scripts/generate-android-assets.js
```

This creates:
- App icons for all Android densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Splash screens (portrait and landscape) with purple background and logo
- Adaptive icons for modern Android versions

## Step 2: Build the Web App

Build the production-ready web app:

```bash
npm run build
```

This creates optimized files in `dist/public/` that Capacitor will package into the Android app.

## Step 3: Sync Capacitor

Copy web assets to Android project and update native dependencies:

```bash
npx cap sync android
```

This command:
- Copies `dist/public/` → `android/app/src/main/assets/public/`
- Updates native plugins
- Syncs `capacitor.config.ts` settings

## Step 4: Open in Android Studio

```bash
npx cap open android
```

Android Studio will open the project automatically.

## Step 5: Build APK in Android Studio

### Debug APK (for testing on your phone):

1. In Android Studio, go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete (check bottom status bar)
3. Click **locate** in the notification to find your APK
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Your Phone:

**Option A: USB Connection**
1. Enable Developer Options on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
2. Connect phone via USB
3. In Android Studio, click the green "Run" button (▶️)
4. Select your device from the list

**Option B: Manual Install**
1. Transfer `app-debug.apk` to your phone (email, cloud drive, etc.)
2. Open the APK file on your phone
3. Allow installation from unknown sources when prompted
4. Install the app

## Step 6: Build Release APK (for Google Play Store)

### Generate Signing Key (one-time):

```bash
cd android/app
keytool -genkey -v -keystore journalmate-release-key.keystore \
  -alias journalmate-key -keyalg RSA -keysize 2048 -validity 10000
```

Save the keystore file and passwords securely!

### Configure Signing:

Create `android/keystore.properties`:

```properties
storeFile=./app/journalmate-release-key.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=journalmate-key
keyPassword=YOUR_KEY_PASSWORD
```

### Build Release APK:

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore file
4. Enter passwords
5. Select **release** build variant
6. Click **Finish**

Release APK location: `android/app/build/outputs/apk/release/app-release.apk`

## PWA vs Native App

JournalMate supports **two installation methods**:

### 1. PWA (Progressive Web App)
- Users visit https://journalmate.ai on Chrome (Android)
- Chrome shows "Add to Home Screen" prompt after interaction
- Installs as web app (no app store needed)
- Updates automatically when you deploy
- **Best for rapid iteration and testing**

### 2. Native Android App (Capacitor)
- Built with Capacitor using this guide
- Can be distributed via Google Play Store
- Full native features (camera, notifications, etc.)
- Must be manually updated via app store
- **Best for official app store presence**

## Google Play Store Submission

### Requirements:

1. **Google Play Developer Account**: $25 one-time fee
2. **Signed Release APK**: Built above
3. **App Assets**:
   - High-res icon: 512x512px (use `client/public/icons/pwa/icon-512x512.png`)
   - Feature graphic: 1024x500px (create with JournalMate branding)
   - Screenshots: At least 2 phone screenshots, up to 8 total
4. **App Details**:
   - Title: JournalMate
   - Short description: AI-powered lifestyle planning and journaling
   - Full description: See website copy
   - Category: Productivity
   - Content rating: Everyone
   - Privacy policy URL: https://journalmate.ai/privacy

### Submission Process:

1. Go to https://play.google.com/console
2. Create new app
3. Upload signed release APK
4. Fill in store listing details
5. Set up content rating questionnaire
6. Set pricing (Free with in-app purchases)
7. Submit for review (typically 1-3 days)

## Troubleshooting

### Build Errors:

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx cap sync android
```

### App Crashes on Launch:

- Check Android Studio Logcat for errors
- Verify `capacitor.config.ts` has correct `webDir: 'dist/public'`
- Ensure you ran `npm run build` before `npx cap sync`

### Icons/Splash Not Updating:

```bash
# Re-generate assets
node scripts/generate-android-assets.js

# Force sync
npx cap sync android --force
```

## Testing Checklist

Before submitting to Google Play:

- [ ] App launches without crashes
- [ ] All main features work (AI planning, tasks, journal)
- [ ] Login/signup flows work
- [ ] Camera/photo upload works
- [ ] Push notifications work (if enabled)
- [ ] App works offline (PWA features)
- [ ] Splash screen displays correctly
- [ ] App icon looks good on home screen
- [ ] No placeholder text or "TODO" items visible

## Capacitor vs Expo/React Native

This project uses **Capacitor**, not Expo or React Native because:

- **Capacitor** wraps your existing web app (no code rewrite needed)
- Uses the same React codebase for web and mobile
- Easier to maintain (one codebase, not three)
- Perfect for content-heavy apps like JournalMate

**Note**: The `replit.md` mentions "React Native/Expo app" but this is outdated. The project uses Capacitor (confirmed by `capacitor.config.ts` and `/android` folder).

## Update Strategy

### For PWA Users:
- Deploy updated code → Users get updates immediately on next visit

### For App Store Users:
1. Update version in `android/app/build.gradle`:
   ```gradle
   versionCode 2  // Increment
   versionName "1.1"  // Update
   ```
2. Build new release APK
3. Upload to Google Play Console
4. Submit for review
5. Users update via Play Store

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Developer Guide**: https://developer.android.com/studio/build
- **Google Play Console**: https://play.google.com/console
- **App Icon Generator**: https://icon.kitchen/
