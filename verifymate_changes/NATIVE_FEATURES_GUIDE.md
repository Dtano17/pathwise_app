# Native Mobile Features Guide

Complete guide for all native mobile features in JournalMate, including setup, usage, and best practices.

## Table of Contents

1. [Share Sheet Integration](#share-sheet-integration)
2. [Biometric Authentication](#biometric-authentication)
3. [Calendar Integration](#calendar-integration)
4. [Widget Manager](#widget-manager)
5. [Voice Input](#voice-input)
6. [Error Boundary](#error-boundary)
7. [Required Dependencies](#required-dependencies)
8. [Platform Setup](#platform-setup)

---

## Share Sheet Integration

### Overview

Share content from other apps into JournalMate and share journal entries to other platforms.

**File**: `client/src/lib/shareSheet.ts`

### Features

- ✅ Share TO other apps (text, URLs, files, journal entries)
- ✅ Receive shares FROM other apps (iOS Share Extension, Android Share Target)
- ✅ Smart URL detection
- ✅ Retry logic with exponential backoff
- ✅ TypeScript strict mode
- ✅ Web fallback support

### Usage

```typescript
import { shareJournalEntry, onIncomingShare, initIncomingShareListener } from '@/lib/shareSheet';

// Share a journal entry
const result = await shareJournalEntry({
  title: 'My Weekend Plans',
  content: 'Planning to go hiking and visit the museum',
  category: 'Leisure',
  tags: ['weekend', 'outdoors'],
  sourceUrl: 'https://journalmate.ai/entry/123'
});

if (result.success) {
  console.log('Shared successfully!');
}

// Listen for incoming shares
useEffect(() => {
  initIncomingShareListener();

  const cleanup = onIncomingShare((shareData) => {
    console.log('Received share:', shareData);
    // Navigate to new entry with pre-filled content
    navigate('/new-entry', { state: { sharedContent: shareData } });
  });

  return cleanup;
}, []);
```

### Platform Setup

#### iOS Share Extension

1. Add to `ios/App/App/Info.plist`:

```xml
<key>CFBundleDocumentTypes</key>
<array>
  <dict>
    <key>CFBundleTypeName</key>
    <string>Text</string>
    <key>LSHandlerRank</key>
    <string>Alternate</string>
    <key>LSItemContentTypes</key>
    <array>
      <string>public.text</string>
      <string>public.url</string>
    </array>
  </dict>
</array>
```

2. Install plugin:

```bash
npm install capacitor-share-extension
```

#### Android Share Target

1. Add to `android/app/src/main/AndroidManifest.xml` inside `<activity>`:

```xml
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/plain" />
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="image/*" />
</intent-filter>
```

---

## Biometric Authentication

### Overview

Secure app access using Face ID, Touch ID, or Fingerprint authentication.

**File**: `client/src/lib/biometric.ts`

### Features

- ✅ Face ID (iOS)
- ✅ Touch ID (iOS)
- ✅ Fingerprint (Android)
- ✅ Face Unlock (Android)
- ✅ Secure credential storage
- ✅ Error categorization
- ✅ Automatic fallback to passcode

### Usage

```typescript
import { loginWithBiometric, enableBiometricLogin, getBiometryTypeName } from '@/lib/biometric';

// Enable biometric login
const result = await enableBiometricLogin('user@example.com', 'password123');

if (result.success) {
  console.log('Biometric login enabled');
}

// Login with biometrics
const loginResult = await loginWithBiometric();

if (loginResult.success) {
  console.log('Logged in:', loginResult.username);
  // Proceed with authentication
}

// Check what biometric type is available
const capabilities = await checkBiometricAvailability();
if (capabilities.isAvailable) {
  console.log('Available:', getBiometryTypeName(capabilities.biometryType));
}
```

### React Hook Example

```typescript
function LoginScreen() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability().then(caps => {
      setBiometricAvailable(caps.isAvailable);
    });
  }, []);

  const handleBiometricLogin = async () => {
    const result = await loginWithBiometric();
    if (result.success) {
      // Handle successful login
      signIn(result.username, result.password);
    } else {
      // Show error
      toast.error(result.error);
    }
  };

  return (
    <Button onClick={handleBiometricLogin} disabled={!biometricAvailable}>
      Sign in with Biometrics
    </Button>
  );
}
```

### Platform Setup

Install the required plugin:

```bash
npm install @capgo/capacitor-native-biometric
```

---

## Calendar Integration

### Overview

Add activities and tasks to the device calendar with reminders.

**File**: `client/src/lib/calendar.ts`

### Features

- ✅ Add events to iOS Calendar
- ✅ Add events to Android Calendar/Google Calendar
- ✅ Smart calendar selection (primary/writable)
- ✅ Batch operations with progress tracking
- ✅ Recurring events
- ✅ Multiple reminders per event
- ✅ Permission handling

### Usage

```typescript
import { addActivityToCalendar, addTaskToCalendar, batchAddToCalendar } from '@/lib/calendar';

// Add single activity
const result = await addActivityToCalendar({
  title: 'Weekend Hike',
  startDate: new Date('2025-01-20T09:00:00'),
  endDate: new Date('2025-01-20T15:00:00'),
  location: 'Yosemite National Park',
  notes: 'Bring water and snacks',
  alarms: [
    { minutesBefore: 30 },
    { minutesBefore: 1440 } // 1 day before
  ]
});

// Add task with reminder
const taskResult = await addTaskToCalendar(
  'Buy hiking boots',
  new Date('2025-01-19T18:00:00'),
  'Need waterproof boots',
  60 // 1 hour reminder
);

// Batch add multiple items
const batchResult = await batchAddToCalendar([
  {
    title: 'Morning Yoga',
    date: new Date('2025-01-20T07:00:00'),
    type: 'activity',
    duration: 60,
    reminderMinutes: 15
  },
  {
    title: 'Pack backpack',
    date: new Date('2025-01-19T20:00:00'),
    type: 'task',
    reminderMinutes: 30
  }
], (current, total) => {
  console.log(`Progress: ${current}/${total}`);
});

console.log(`Added ${batchResult.addedCount} events, ${batchResult.failedCount} failed`);
```

### Platform Setup

Install the required plugin:

```bash
npm install @ebarooni/capacitor-calendar
```

---

## Widget Manager

### Overview

Sync app data to iOS and Android home screen widgets.

**File**: `client/src/lib/widgetManager.ts`

### Features

- ✅ iOS home screen widgets
- ✅ Android home screen widgets
- ✅ Multi-widget support (tasks, streaks, quotes, stats)
- ✅ Automatic sync on app state changes
- ✅ Version management for schema changes
- ✅ Error recovery

### Usage

```typescript
import { syncWidgetWithApp, setupWidgetAutoSync, getWidgetInfo } from '@/lib/widgetManager';

// Manual sync
const tasks = await fetchTasks();
const progress = await getProgress();

await syncWidgetWithApp(
  progress.streakCount,
  tasks,
  { text: 'Believe you can and you\'re halfway there', author: 'Theodore Roosevelt' },
  { totalActivities: 45, completedToday: 3, completionRate: 0.85 }
);

// Setup automatic sync (call in App.tsx)
useEffect(() => {
  const cleanup = setupWidgetAutoSync();
  return cleanup;
}, []);

// Check widget info
const info = await getWidgetInfo();
console.log('Widget supported:', info.isSupported);
console.log('Last sync:', info.lastSync);
```

### Platform Setup

#### iOS Widget

1. Create a custom Capacitor plugin for App Group access
2. File: `ios/App/App/WidgetDataPlugin.swift`

```swift
import Capacitor

@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin {
    @objc func setWidgetData(_ call: CAPPluginCall) {
        let data = call.getString("data") ?? ""
        let userDefaults = UserDefaults(suiteName: "group.ai.journalmate.app")
        userDefaults?.set(data, forKey: "widget_data")
        call.resolve()
    }

    @objc func refreshWidget(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
```

#### Android Widget

The widget automatically reads from `CapacitorStorage` SharedPreferences.

---

## Voice Input

### Overview

Speech-to-text for journal entries and activity planning.

**File**: `client/src/lib/voiceInput.ts`

### Features

- ✅ Native speech recognition (iOS/Android)
- ✅ Web Speech API fallback
- ✅ Multi-language support (25+ languages)
- ✅ Continuous listening mode
- ✅ Confidence scoring
- ✅ Real-time partial results
- ✅ Auto language detection

### Usage

```typescript
import { listenForVoiceInput, getPreferredLanguage } from '@/lib/voiceInput';

// Basic voice input
const listener = await listenForVoiceInput(
  {
    language: getPreferredLanguage(),
    partialResults: true,
    continuous: true
  },
  (text, isFinal, confidence) => {
    if (isFinal) {
      // Final transcription
      console.log('Final:', text, 'Confidence:', confidence);
      setJournalEntry(prev => prev + ' ' + text);
    } else {
      // Partial results (real-time preview)
      setPreview(text);
    }
  },
  (error, errorCode) => {
    console.error('Voice input error:', error);
  }
);

// Stop listening
await listener.stop();
```

### React Hook Example

```typescript
function VoiceJournalEntry() {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [listener, setListener] = useState<VoiceInputListener | null>(null);

  const startVoice = async () => {
    const newListener = await listenForVoiceInput(
      { language: 'en-US', continuous: true },
      (transcript, isFinal) => {
        if (isFinal) {
          setText(prev => prev + ' ' + transcript);
        }
      }
    );
    setListener(newListener);
    setIsListening(true);
  };

  const stopVoice = async () => {
    if (listener) {
      await listener.stop();
      setIsListening(false);
    }
  };

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <Button onClick={isListening ? stopVoice : startVoice}>
        {isListening ? '🔴 Stop' : '🎤 Start'} Voice Input
      </Button>
    </div>
  );
}
```

### Platform Setup

Install the required plugin:

```bash
npm install @capacitor-community/speech-recognition
```

---

## Error Boundary

### Overview

React Error Boundary for catching and handling JavaScript errors gracefully.

**File**: `client/src/components/ErrorBoundary.tsx`

### Features

- ✅ Catches component tree errors
- ✅ User-friendly error UI
- ✅ Development vs Production display
- ✅ Error reporting integration (Sentry ready)
- ✅ Automatic retry mechanisms
- ✅ Copy error details to clipboard
- ✅ Infinite error loop prevention

### Usage

```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

// Basic usage
<ErrorBoundary>
  <App />
</ErrorBoundary>

// With custom error handler
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.log('Custom error handler', error, errorInfo);
    // Send to analytics
  }}
>
  <App />
</ErrorBoundary>

// With automatic reset on route change
const [location] = useLocation();

<ErrorBoundary resetOnPropsChange={location}>
  <Routes />
</ErrorBoundary>

// With custom fallback UI
<ErrorBoundary fallback={<CustomErrorPage />}>
  <App />
</ErrorBoundary>
```

### Integration with Error Reporting (Sentry)

```typescript
// In ErrorBoundary.tsx reportError method
private reportError(error: Error, errorInfo: ErrorInfo) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }
}
```

---

## Required Dependencies

Add these to `package.json`:

```json
{
  "dependencies": {
    "@capacitor/core": "^6.0.0",
    "@capacitor/share": "^6.0.0",
    "@capacitor/preferences": "^6.0.0",
    "@capgo/capacitor-native-biometric": "^6.0.0",
    "@ebarooni/capacitor-calendar": "^6.0.0",
    "@capacitor-community/speech-recognition": "^6.0.0",
    "capacitor-share-extension": "^2.0.0"
  }
}
```

Install all dependencies:

```bash
npm install @capacitor/core @capacitor/share @capacitor/preferences @capgo/capacitor-native-biometric @ebarooni/capacitor-calendar @capacitor-community/speech-recognition capacitor-share-extension
```

---

## Platform Setup

### iOS Setup

1. **Permissions** (add to `ios/App/App/Info.plist`):

```xml
<!-- Camera and Microphone -->
<key>NSCameraUsageDescription</key>
<string>To scan documents and take photos for your journal</string>

<key>NSMicrophoneUsageDescription</key>
<string>To record voice notes for your journal entries</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>To convert your voice to text for journal entries</string>

<!-- Face ID -->
<key>NSFaceIDUsageDescription</key>
<string>To securely authenticate and access your journal</string>

<!-- Calendar -->
<key>NSCalendarsUsageDescription</key>
<string>To add your activities and tasks to your calendar</string>

<!-- Location (if needed for widget) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>To provide location-based activity suggestions</string>
```

2. **App Groups** (for widgets):

In Xcode:
- Select App target → Signing & Capabilities → + Capability → App Groups
- Add group: `group.ai.journalmate.app`
- Do the same for Widget target

### Android Setup

1. **Permissions** (add to `android/app/src/main/AndroidManifest.xml`):

```xml
<manifest>
  <!-- Internet -->
  <uses-permission android:name="android.permission.INTERNET" />

  <!-- Microphone for voice input -->
  <uses-permission android:name="android.permission.RECORD_AUDIO" />

  <!-- Calendar -->
  <uses-permission android:name="android.permission.READ_CALENDAR" />
  <uses-permission android:name="android.permission.WRITE_CALENDAR" />

  <!-- Biometric -->
  <uses-permission android:name="android.permission.USE_BIOMETRIC" />
</manifest>
```

2. **Build Configuration** (`android/app/build.gradle`):

```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
    }
}
```

---

## Best Practices

### 1. Permission Handling

Always check permissions before using native features:

```typescript
const hasPermission = await checkCalendarPermission();
if (!hasPermission.granted) {
  const requested = await requestCalendarPermission();
  if (!requested.granted) {
    // Show user-friendly message
    return;
  }
}
```

### 2. Error Handling

Wrap native calls in try-catch:

```typescript
try {
  const result = await shareJournalEntry(entry);
  if (result.success) {
    toast.success('Shared successfully!');
  }
} catch (error) {
  console.error('Share failed:', error);
  toast.error('Failed to share');
}
```

### 3. Platform Detection

Use platform utilities:

```typescript
import { isNative, isIOS, isAndroid } from '@/lib/platform';

if (isNative()) {
  // Use native feature
  await authenticateWithBiometric();
} else {
  // Fallback for web
  showPasswordInput();
}
```

### 4. Testing

Test on real devices, not just simulators:

- iOS: Face ID doesn't work in simulator
- Android: Biometrics require real hardware
- Voice input: Needs real microphone

---

## Troubleshooting

### Share Sheet Not Working (iOS)

**Problem**: Incoming shares not detected

**Solution**:
1. Ensure App Group is configured in Xcode
2. Check that Share Extension target is properly configured
3. Verify `capacitor-share-extension` plugin is installed
4. Check console logs for `[SHARE iOS]` messages

### Biometric Auth Failing

**Problem**: Authentication always fails

**Solution**:
1. Check device supports biometrics (Settings → Face ID/Touch ID)
2. Ensure permissions are granted
3. Test on real device (simulator may not support Face ID)
4. Check console for error codes

### Calendar Events Not Adding

**Problem**: Calendar permission granted but events don't appear

**Solution**:
1. Verify calendar is writable (not read-only)
2. Check date format is valid
3. Test with default calendar first
4. Check device calendar app for events

### Voice Input Not Starting

**Problem**: Microphone permission but no speech recognition

**Solution**:
1. Ensure device is online (speech recognition needs network on some devices)
2. Check microphone and speech recognition permissions separately
3. Test with Web Speech API in browser first
4. Verify language code is supported

---

## Migration from v1.0

If upgrading from backup versions:

### Breaking Changes

1. **Error Handling**: All functions now return typed result objects with `success`, `error`, and `errorCode`
2. **TypeScript**: Strict mode enabled - null checks required
3. **Widget Data**: Version field added to data structure

### Migration Steps

```typescript
// OLD
const result = await shareContent({ text: 'Hello' });
// Result was boolean

// NEW
const result = await shareContent({ text: 'Hello' });
if (result.success) {
  console.log('Success!');
} else {
  console.error(result.error, result.errorCode);
}
```

---

## Performance Optimization

### 1. Widget Sync Throttling

Don't sync on every single change:

```typescript
const debouncedSync = useMemo(
  () => debounce(syncWidgetWithApp, 2000),
  []
);

useEffect(() => {
  debouncedSync(streakCount, tasks);
}, [streakCount, tasks]);
```

### 2. Voice Input Buffering

Buffer partial results to avoid too many re-renders:

```typescript
const [buffer, setBuffer] = useState('');

const listener = await listenForVoiceInput(
  { partialResults: true },
  (text, isFinal) => {
    if (isFinal) {
      setText(prev => prev + ' ' + text);
      setBuffer('');
    } else {
      setBuffer(text); // Only update preview buffer
    }
  }
);
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/journalmate/app/issues
- Email: support@journalmate.ai

---

**Last Updated**: 2025-12-19
**Version**: 2.0
**Compatibility**: iOS 14+, Android 8+, Web (modern browsers)
