# 📍 Where is the Capacitor Code in Your App?

Complete map of all Capacitor-related files and code in your JournalMate app.

---

## 🗂️ Directory Structure

```
pathwise_app/
├── 📱 capacitor.config.ts          # Main Capacitor configuration
├── 🤖 android/                      # Android native project
├── 🍎 ios/                          # iOS native project
├── 📦 client/src/lib/               # Mobile feature libraries
├── 🎨 client/src/components/        # Mobile UI components
└── 📄 client/src/App.tsx            # Capacitor initialization
```

---

## 1️⃣ Configuration Files

### Main Configuration
**File:** [`capacitor.config.ts`](capacitor.config.ts)
```typescript
import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'ai.journalmate.app',
  appName: 'JournalMate',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: { /* ... */ },
    PushNotifications: { /* ... */ },
    // ... 13 plugins configured
  },
};
```

**Purpose:** Main configuration for Capacitor app
- App ID and name
- Web build directory
- Plugin settings
- Platform-specific configs

### Build Configuration
**File:** [`vite.config.ts`](vite.config.ts) (modified for Capacitor)
```typescript
build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  base: './',  // Important for Capacitor
  target: 'es2015',
  minify: 'terser',
},
```

**Purpose:** Vite configured to output correctly for Capacitor

---

## 2️⃣ Native Projects

### Android Native Code
**Directory:** [`android/`](android/)
```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml          # Permissions and config
│   │   ├── java/ai/journalmate/app/
│   │   │   └── MainActivity.java        # Main Android activity
│   │   ├── res/                         # Icons, splash screens
│   │   └── assets/public/               # Your web app (synced)
│   ├── build.gradle                     # Android build config
│   └── capacitor.build.gradle           # Capacitor-specific build
├── build.gradle                         # Root build config
└── variables.gradle                     # Android SDK versions
```

**Key Files:**
- **MainActivity.java** - Entry point for Android app
- **AndroidManifest.xml** - Permissions (camera, location, etc.)
- **assets/public/** - Your built web app lives here

### iOS Native Code
**Directory:** [`ios/`](ios/)
```
ios/
├── App/
│   ├── App.xcodeproj/                   # Xcode project file
│   ├── App/
│   │   ├── AppDelegate.swift            # Main iOS app delegate
│   │   ├── Info.plist                   # Permissions and config
│   │   ├── Assets.xcassets/             # Icons, splash screens
│   │   └── public/                      # Your web app (synced)
│   └── Podfile                          # iOS dependencies (CocoaPods)
└── App.xcworkspace/                     # Xcode workspace
```

**Key Files:**
- **AppDelegate.swift** - Entry point for iOS app
- **Info.plist** - Permissions (camera, location, etc.)
- **public/** - Your built web app lives here

---

## 3️⃣ Mobile Feature Libraries

**Directory:** [`client/src/lib/`](client/src/lib/)

### Platform Detection
**File:** [`client/src/lib/platform.ts`](client/src/lib/platform.ts)
```typescript
import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};
```

**Used by:** All other mobile features for platform-specific code

### Camera Integration
**File:** [`client/src/lib/camera.ts`](client/src/lib/camera.ts)
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function capturePhoto() {
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
  });
  return photo;
}
```

**Provides:** Camera access, photo capture, gallery selection

### Notifications
**File:** [`client/src/lib/notifications.ts`](client/src/lib/notifications.ts)
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function initializePushNotifications() {
  // Register for push notifications
  // Handle incoming notifications
}
```

**Provides:** Push notifications, local notifications, reminders

### Location Services
**File:** [`client/src/lib/geolocation.ts`](client/src/lib/geolocation.ts)
```typescript
import { Geolocation } from '@capacitor/geolocation';

export async function getCurrentLocation() {
  const coordinates = await Geolocation.getCurrentPosition();
  return coordinates;
}
```

**Provides:** GPS location, reverse geocoding, distance calculation

### Haptic Feedback
**File:** [`client/src/lib/haptics.ts`](client/src/lib/haptics.ts)
```typescript
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticsSuccess() {
  await Haptics.notification({ type: NotificationType.Success });
}
```

**Provides:** Tactile feedback for user interactions

### Social Sharing
**File:** [`client/src/lib/sharing.ts`](client/src/lib/sharing.ts)
```typescript
import { Share } from '@capacitor/share';

export async function shareActivity(data) {
  await Share.share({
    title: data.title,
    text: data.text,
    url: data.url,
  });
}
```

**Provides:** Native share sheet, social media sharing

### Contact Access
**File:** [`client/src/lib/contacts.ts`](client/src/lib/contacts.ts)
```typescript
import { Contacts } from '@capacitor-community/contacts';

export async function getContacts() {
  const result = await Contacts.getContacts();
  return result.contacts;
}
```

**Provides:** Contact access, search, invitations

### Offline Storage
**File:** [`client/src/lib/storage.ts`](client/src/lib/storage.ts)
```typescript
import { Preferences } from '@capacitor/preferences';
import { Filesystem } from '@capacitor/filesystem';

export async function saveData(key, value) {
  await Preferences.set({ key, value: JSON.stringify(value) });
}
```

**Provides:** Offline storage, data persistence, sync queue

### Unified Export
**File:** [`client/src/lib/mobile.ts`](client/src/lib/mobile.ts)
```typescript
// Exports all mobile features
export * from './platform';
export * from './camera';
export * from './notifications';
export * from './geolocation';
export * from './haptics';
export * from './sharing';
export * from './contacts';
export * from './storage';

export async function initializeMobileFeatures() {
  if (isNative()) {
    await initializePushNotifications();
  }
}
```

**Purpose:** Single import point for all mobile features

---

## 4️⃣ Mobile UI Components

**Directory:** [`client/src/components/`](client/src/components/)

### Photo Capture
**File:** [`client/src/components/MobilePhotoCapture.tsx`](client/src/components/MobilePhotoCapture.tsx)
```typescript
import { takePhoto, selectFromGallery } from '@/lib/camera';

export function MobilePhotoCapture({ onPhotoCapture }) {
  const handleTakePhoto = async () => {
    const photo = await takePhoto();
    if (photo) onPhotoCapture(photo);
  };
  // ...
}
```

**Uses:** camera.ts library

### Share Button
**File:** [`client/src/components/ShareActivityButton.tsx`](client/src/components/ShareActivityButton.tsx)
```typescript
import { shareActivity } from '@/lib/sharing';
import { hapticsSuccess } from '@/lib/haptics';

export function ShareActivityButton({ activity }) {
  const handleShare = async () => {
    await shareActivity(activity);
    hapticsSuccess();
  };
  // ...
}
```

**Uses:** sharing.ts, haptics.ts libraries

### Location Picker
**File:** [`client/src/components/LocationPicker.tsx`](client/src/components/LocationPicker.tsx)
```typescript
import { getCurrentLocationWithAddress } from '@/lib/geolocation';

export function LocationPicker({ onLocationSelected }) {
  const handlePickLocation = async () => {
    const location = await getCurrentLocationWithAddress();
    onLocationSelected(location);
  };
  // ...
}
```

**Uses:** geolocation.ts library

### Contact Invitations
**File:** [`client/src/components/InviteFriendsButton.tsx`](client/src/components/InviteFriendsButton.tsx)
```typescript
import { getContacts, inviteContacts } from '@/lib/contacts';

export function InviteFriendsButton() {
  const [contacts, setContacts] = useState([]);

  const loadContacts = async () => {
    const deviceContacts = await getContacts();
    setContacts(deviceContacts);
  };
  // ...
}
```

**Uses:** contacts.ts library

### Offline Sync Indicator
**File:** [`client/src/components/OfflineSyncIndicator.tsx`](client/src/components/OfflineSyncIndicator.tsx)
```typescript
import { syncOfflineJournals } from '@/lib/storage';

export function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, []);
  // ...
}
```

**Uses:** storage.ts library

### Calendar Integration
**File:** [`client/src/components/AddToCalendarButton.tsx`](client/src/components/AddToCalendarButton.tsx)
```typescript
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';

export function AddToCalendarButton({ event }) {
  const addToCalendar = async () => {
    await CapacitorCalendar.createEvent({
      title: event.title,
      startDate: event.startDate.getTime(),
      endDate: event.endDate.getTime(),
    });
  };
  // ...
}
```

**Uses:** @ebarooni/capacitor-calendar plugin

### Haptic Button
**File:** [`client/src/components/HapticButton.tsx`](client/src/components/HapticButton.tsx)
```typescript
import { hapticsLight, hapticsSuccess } from '@/lib/haptics';

export const HapticButton = ({ onClick, hapticType, ...props }) => {
  const handleClick = (e) => {
    triggerHaptic(hapticType);
    onClick?.(e);
  };
  // ...
}
```

**Uses:** haptics.ts library

### Unified Exports
**File:** [`client/src/components/mobile/index.ts`](client/src/components/mobile/index.ts)
```typescript
export { MobilePhotoCapture } from '../MobilePhotoCapture';
export { ShareActivityButton } from '../ShareActivityButton';
export { LocationPicker } from '../LocationPicker';
export { InviteFriendsButton } from '../InviteFriendsButton';
export { OfflineSyncIndicator } from '../OfflineSyncIndicator';
export { AddToCalendarButton } from '../AddToCalendarButton';
export { HapticButton } from '../HapticButton';
```

**Purpose:** Single import point for mobile components

---

## 5️⃣ App Initialization

**File:** [`client/src/App.tsx`](client/src/App.tsx)
```typescript
import { initializeMobileFeatures } from '@/lib/mobile';

function App() {
  useEffect(() => {
    // Initialize mobile features on app startup
    initializeMobileFeatures().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

**Purpose:** Initializes Capacitor plugins when app starts

---

## 6️⃣ Dependencies

**File:** [`package.json`](package.json)

### Capacitor Core & CLI
```json
{
  "@capacitor/core": "^7.4.4",
  "@capacitor/cli": "^7.4.4",
  "@capacitor/android": "^7.4.4",
  "@capacitor/ios": "^7.4.4"
}
```

### Capacitor Plugins
```json
{
  "@capacitor/app": "^7.1.0",
  "@capacitor/camera": "^7.0.2",
  "@capacitor/filesystem": "^7.1.4",
  "@capacitor/geolocation": "^7.1.5",
  "@capacitor/haptics": "^7.0.2",
  "@capacitor/local-notifications": "^7.0.3",
  "@capacitor/preferences": "^7.0.2",
  "@capacitor/push-notifications": "^7.0.3",
  "@capacitor/share": "^7.0.2",
  "@capacitor/splash-screen": "^7.0.3",
  "@capacitor/status-bar": "^7.0.3",
  "@capacitor-community/contacts": "^7.0.0",
  "@ebarooni/capacitor-calendar": "^7.2.0"
}
```

**Total:** 13 Capacitor plugins installed

---

## 📊 Code Organization Summary

```
Capacitor Code Structure:

capacitor.config.ts (Config)
    ↓
├── android/ (Native Android)
├── ios/ (Native iOS)
│
├── client/src/lib/ (Feature Libraries)
│   ├── platform.ts (Detection)
│   ├── camera.ts (Camera)
│   ├── notifications.ts (Notifications)
│   ├── geolocation.ts (Location)
│   ├── haptics.ts (Haptics)
│   ├── sharing.ts (Share)
│   ├── contacts.ts (Contacts)
│   ├── storage.ts (Storage)
│   └── mobile.ts (Unified)
│
├── client/src/components/ (UI Components)
│   ├── MobilePhotoCapture.tsx
│   ├── ShareActivityButton.tsx
│   ├── LocationPicker.tsx
│   ├── InviteFriendsButton.tsx
│   ├── OfflineSyncIndicator.tsx
│   ├── AddToCalendarButton.tsx
│   ├── HapticButton.tsx
│   └── mobile/index.ts
│
└── client/src/App.tsx (Initialization)
```

---

## 🔍 How to Find Capacitor Code

### Search for Capacitor Imports:
```bash
# Find all files using Capacitor
grep -r "from '@capacitor" client/src/

# Find platform detection usage
grep -r "isNative()" client/src/

# Find mobile feature usage
grep -r "from '@/lib/mobile'" client/src/
```

### Key Markers:
Look for these imports in files:
```typescript
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { isNative, isIOS, isAndroid } from '@/lib/platform';
```

---

## 🎯 Quick Reference

| What | Where |
|------|-------|
| **Main config** | `capacitor.config.ts` |
| **Android native** | `android/` folder |
| **iOS native** | `ios/` folder |
| **Feature libraries** | `client/src/lib/*.ts` |
| **UI components** | `client/src/components/*` |
| **Initialization** | `client/src/App.tsx` |
| **Dependencies** | `package.json` |
| **Build config** | `vite.config.ts` |

---

## 📚 Learn More

- [CAPACITOR_SETUP.md](CAPACITOR_SETUP.md) - Initial setup guide
- [MOBILE_FEATURES_GUIDE.md](MOBILE_FEATURES_GUIDE.md) - Feature documentation
- [WEEK_3_4_MOBILE_UI.md](WEEK_3_4_MOBILE_UI.md) - UI components guide

---

*Created: 2025-11-12*
*JournalMate Mobile Development - Code Locations*
