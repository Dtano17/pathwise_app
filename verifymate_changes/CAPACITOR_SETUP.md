# JournalMate Capacitor Mobile App Setup

## Overview

JournalMate is now configured with Ionic Capacitor to deliver native iOS and Android apps using the existing React web application. This document covers the initial setup, native features, and next steps.

---

## ✅ Phase 1 Complete: Foundation Setup

### What's Been Done

1. **Capacitor Installation & Configuration**
   - ✅ Installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
   - ✅ Initialized with bundle ID: `ai.journalmate.app`
   - ✅ Created `capacitor.config.ts` with full configuration
   - ✅ Added iOS and Android platforms

2. **Native Plugins Installed (12 Total)**
   - ✅ `@capacitor/camera` - Camera and photo library access
   - ✅ `@capacitor/push-notifications` - Native push notifications
   - ✅ `@capacitor/splash-screen` - Branded splash screens
   - ✅ `@capacitor/status-bar` - Status bar styling
   - ✅ `@capacitor/haptics` - Tactile feedback
   - ✅ `@capacitor/filesystem` - Local file storage
   - ✅ `@capacitor/preferences` - Key-value storage
   - ✅ `@capacitor/app` - App lifecycle and deep linking
   - ✅ `@capacitor/geolocation` - GPS location services
   - ✅ `@capacitor/local-notifications` - Local reminders
   - ✅ `@capacitor/share` - Native share sheet
   - ✅ `@ebarooni/capacitor-calendar` - Calendar sync

3. **Build Configuration**
   - ✅ Updated `vite.config.ts` for Capacitor compatibility
   - ✅ Added relative path resolution (`base: './'`)
   - ✅ Configured mobile optimization (ES2015 target, Terser minification)
   - ✅ Enabled development server access from mobile devices

4. **Platform Detection Utility**
   - ✅ Created `/client/src/lib/platform.ts`
   - ✅ Provides `isNative()`, `isIOS()`, `isAndroid()`, `isWeb()` helpers
   - ✅ Includes `platformSwitch()` for conditional logic

5. **Initial Build & Sync**
   - ✅ Successfully built React app for production
   - ✅ Synced to iOS project at `ios/App/`
   - ✅ Synced to Android project at `android/`
   - ✅ All 12 plugins recognized by both platforms

---

## 📱 App Configuration

### Bundle Identifier
- **iOS:** `ai.journalmate.app`
- **Android:** `ai.journalmate.app`

### App Name
- **Display Name:** JournalMate

### Theme Colors
- **Primary:** `#6C5CE7` (Purple - matches web app)
- **Background:** `#0f0f23` (Dark mode background)
- **Splash Background:** `#6C5CE7`

### Icons & Assets
- **Source:** Existing icons from `client/public/icons/`
- **iOS Icons:** Available in `client/public/icons/ios/`
- **Android Icons:** Available in `client/public/icons/android/`

---

## 🚀 Next Steps

### Week 2: Core Native Features Implementation

#### 1. Push Notifications Setup
**Tasks:**
- Set up Firebase Cloud Messaging (FCM) for both platforms
- Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
- Update `client/src/components/NotificationService.tsx` to use Capacitor push
- Configure iOS push certificates in Apple Developer Console
- Test foreground and background notifications

**Code Example:**
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from '@/lib/platform';

if (isNative()) {
  await PushNotifications.requestPermissions();
  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    // Send token to backend
  });
}
```

#### 2. Camera Integration
**Tasks:**
- Replace file input elements with Capacitor Camera API
- Add photo capture for journal entries
- Implement gallery access for selecting existing photos
- Handle permissions gracefully

**Code Example:**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePhoto = async () => {
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.DataUrl
  });

  // Use photo.dataUrl for upload
};
```

#### 3. File System & Offline Storage
**Tasks:**
- Implement local caching for offline mode
- Store journal entries locally when offline
- Sync with server when connection restored

---

### Week 3: Additional Native Features

#### 1. Calendar Integration
**Tasks:**
- Implement "Add to Calendar" for activities and goals
- Request calendar permissions
- Create calendar events with reminders
- Handle permission denials gracefully

**Code Example:**
```typescript
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';

const addToCalendar = async (activity: Activity) => {
  const result = await CapacitorCalendar.createEvent({
    title: activity.name,
    startDate: activity.startTime,
    endDate: activity.endTime,
    location: activity.location,
    notes: activity.description,
  });
};
```

#### 2. Splash Screen & Branding
**Tasks:**
- Design custom splash screens (2732x2732 for iOS, 1920x1920 for Android)
- Copy existing app icons to native projects
- Configure launch behavior in `capacitor.config.ts`

**Current Configuration:**
```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#6C5CE7',
  showSpinner: false,
  splashFullScreen: true,
}
```

#### 3. Deep Linking
**Tasks:**
- Configure `journalmate://` URL scheme
- Handle shared activity links from emails
- Test deep links from other apps

---

### Week 4: Testing & Refinement

#### Platform-Specific Testing
1. **iOS Testing:**
   - Test on iPhone (various sizes: SE, 13, 15 Pro Max)
   - Test on iPad (if supported)
   - Test all native features
   - Verify permissions flow

2. **Android Testing:**
   - Test on multiple manufacturers (Samsung, Google Pixel, OnePlus)
   - Test various Android versions (11, 12, 13, 14)
   - Verify all native features
   - Test permissions and edge cases

#### Edge Case Testing
- Network offline/online transitions
- App backgrounding and foregrounding
- Permission denials
- Low memory scenarios
- Battery saver modes

---

### Week 5: App Store Preparation

#### iOS App Store
**Prerequisites:**
- Apple Developer Account ($99/year) - [developer.apple.com](https://developer.apple.com)
- Mac with Xcode installed
- Valid signing certificates and provisioning profiles

**Steps:**
1. Open project: `npx cap open ios`
2. Configure signing in Xcode
3. Create App Store Connect listing
4. Prepare screenshots (required sizes):
   - iPhone 6.7" (1290x2796)
   - iPhone 6.5" (1242x2688)
   - iPad Pro 12.9" (2048x2732)
5. Upload build via Xcode Organizer
6. Submit for review

#### Google Play Store
**Prerequisites:**
- Google Play Developer Account ($25 one-time) - [play.google.com/console](https://play.google.com/console)
- Android Studio installed

**Steps:**
1. Open project: `npx cap open android`
2. Configure signing in Android Studio
3. Create Google Play Console listing
4. Prepare screenshots (required):
   - Phone: 1080x1920 minimum
   - Tablet: 1200x1920 minimum
   - Feature graphic: 1024x500
5. Generate signed AAB (Android App Bundle)
6. Upload to Play Console
7. Submit for review

---

## 🛠️ Development Workflow

### Daily Development
```bash
# 1. Start development server
npm run dev

# 2. Open in browser for rapid iteration
# http://localhost:5173

# 3. Test on physical device (optional)
# a. Find your local IP address
ipconfig  # Windows
ifconfig  # Mac/Linux

# b. Update capacitor.config.ts temporarily:
server: {
  url: 'http://192.168.1.x:5173',
  cleartext: true
}

# c. Rebuild and sync
npm run build
npx cap sync

# d. Open in IDE and run on device
npx cap run android
npx cap run ios  # Mac only
```

### Making Code Changes
```bash
# 1. Edit your React code in client/src/
# 2. Build the app
npm run build

# 3. Sync to native projects
npx cap sync

# 4. Test in native projects
npx cap open ios      # Opens Xcode (Mac only)
npx cap open android  # Opens Android Studio
```

### Adding New Capacitor Plugins
```bash
# 1. Install the plugin
npm install @capacitor/[plugin-name]

# 2. Sync to native projects
npx cap sync

# 3. Import and use in your code
import { PluginName } from '@capacitor/[plugin-name]';
```

---

## 📂 Project Structure

```
pathwise_app/
├── capacitor.config.ts          # Capacitor configuration
├── ios/                          # iOS native project
│   └── App/
│       ├── App.xcodeproj        # Xcode project
│       └── App/
│           └── public/          # Web assets (auto-synced)
├── android/                     # Android native project
│   ├── app/
│   │   └── src/main/
│   │       └── assets/public/  # Web assets (auto-synced)
│   └── build.gradle
├── client/                      # React web app source
│   ├── src/
│   │   └── lib/
│   │       └── platform.ts     # Platform detection utility
│   └── public/
│       └── icons/              # App icons for all platforms
└── dist/public/                # Built web app (used by Capacitor)
```

---

## 🔌 Installed Plugins Reference

### Core Functionality
| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| `@capacitor/app` | App lifecycle, deep linking | [Docs](https://capacitorjs.com/docs/apis/app) |
| `@capacitor/camera` | Photo capture, gallery access | [Docs](https://capacitorjs.com/docs/apis/camera) |
| `@capacitor/filesystem` | File storage, offline data | [Docs](https://capacitorjs.com/docs/apis/filesystem) |
| `@capacitor/preferences` | Key-value storage | [Docs](https://capacitorjs.com/docs/apis/preferences) |

### Notifications & Engagement
| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| `@capacitor/push-notifications` | Remote push notifications | [Docs](https://capacitorjs.com/docs/apis/push-notifications) |
| `@capacitor/local-notifications` | Local reminders | [Docs](https://capacitorjs.com/docs/apis/local-notifications) |
| `@capacitor/haptics` | Vibration feedback | [Docs](https://capacitorjs.com/docs/apis/haptics) |

### UI & Branding
| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| `@capacitor/splash-screen` | Launch splash screen | [Docs](https://capacitorjs.com/docs/apis/splash-screen) |
| `@capacitor/status-bar` | Status bar styling | [Docs](https://capacitorjs.com/docs/apis/status-bar) |

### Location & Sharing
| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| `@capacitor/geolocation` | GPS location | [Docs](https://capacitorjs.com/docs/apis/geolocation) |
| `@capacitor/share` | Native share sheet | [Docs](https://capacitorjs.com/docs/apis/share) |

### Calendar Integration
| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| `@ebarooni/capacitor-calendar` | Calendar sync | [Docs](https://github.com/ebarooni/capacitor-calendar) |

---

## 🎯 Key Features to Implement

### Must-Have (Week 2-3)
- ✅ Push notifications (activity reminders, goal updates)
- ✅ Camera integration (journal photo capture)
- ✅ Offline storage (local journal entries)
- ✅ Calendar sync (add activities to calendar)
- ✅ Splash screen and app icons

### Nice-to-Have (Week 4-5)
- ⏳ Biometric authentication (Touch ID/Face ID)
- ⏳ Background sync (sync journals in background)
- ⏳ Geolocation (location-based activities)
- ⏳ Share to social media (native share sheet)
- ⏳ Voice input optimization for mobile

---

## 🐛 Troubleshooting

### Build Issues
**Problem:** Build fails with asset errors
```bash
# Solution: Create missing asset directories
mkdir -p attached_assets/stock_images
```

### Sync Issues
**Problem:** `npx cap sync` fails
```bash
# Solution: Clean and rebuild
rm -rf dist/public
npm run build
npx cap sync
```

### iOS Issues
**Problem:** CocoaPods not installed
```bash
# Mac only - Install CocoaPods
sudo gem install cocoapods
cd ios/App
pod install
```

### Android Issues
**Problem:** Gradle build fails
```bash
# Solution: Clean Android project
cd android
./gradlew clean
cd ..
npx cap sync android
```

---

## 📊 Current Status Summary

### ✅ Completed
- [x] Capacitor installation and initialization
- [x] iOS and Android projects created
- [x] 12 native plugins installed and synced
- [x] Build configuration optimized for mobile
- [x] Platform detection utility created
- [x] Initial build successful
- [x] Projects synced to native platforms

### ⏳ In Progress
- [ ] Push notification implementation
- [ ] Camera integration
- [ ] Calendar sync implementation
- [ ] Splash screen and icon configuration

### 📅 Upcoming
- [ ] iOS and Android device testing
- [ ] App Store listing preparation
- [ ] Beta testing with TestFlight/Play Console
- [ ] Production app store submission

---

## 📞 Support Resources

### Official Documentation
- **Capacitor Docs:** https://capacitorjs.com/docs
- **iOS Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Android Guidelines:** https://support.google.com/googleplay/android-developer/answer/9859455

### Community
- **Capacitor Discord:** https://discord.gg/UPYYRhtyzp
- **Ionic Forum:** https://forum.ionicframework.com/
- **Stack Overflow:** Tag `capacitor` or `ionic-framework`

---

## 🎉 What's Next?

You're ready to start implementing native features! The foundation is set up and working. Here's the recommended order:

1. **Week 2:** Implement push notifications and camera integration
2. **Week 3:** Add calendar sync and polish splash screens
3. **Week 4:** Test on physical devices and fix platform-specific bugs
4. **Week 5:** Prepare app store listings and submit for review

**Estimated Timeline:** 5 weeks to app stores
**Estimated Cost:** $124 Year 1 (App Store fees), then $99/year ongoing

---

*Generated: 2025-11-12*
*Capacitor Version: 7.x*
*Bundle ID: ai.journalmate.app*
