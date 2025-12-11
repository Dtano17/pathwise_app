# Android App Release Setup Guide

This guide will walk you through configuring your Android app for release to the Google Play Store.

## Prerequisites

- Android Studio installed
- Java Development Kit (JDK) 11 or higher
- Access to the project's `android/` directory

## Step 1: Generate a Release Keystore

A keystore is required to sign your APK/AAB for release. **Keep this file secure** - if you lose it, you cannot update your app on the Play Store.

### Generate Keystore

```bash
cd android/app

# Generate a new keystore (run this ONCE)
keytool -genkeypair -v -storetype PKCS12 -keystore journalmate-release.keystore -alias journalmate-key -keyalg RSA -keysize 2048 -validity 10000

# You will be prompted for:
# 1. Keystore password (save this securely!)
# 2. Key password (save this securely!)
# 3. Your name, organization, city, state, country
```

### Secure the Keystore

```bash
# Move keystore to a secure location (NOT in git)
mv journalmate-release.keystore ~/.android/journalmate-release.keystore

# Or keep it in android/app/ but add to .gitignore
echo "*.keystore" >> android/app/.gitignore
echo "keystore.properties" >> android/.gitignore
```

## Step 2: Create Keystore Properties File

Create `android/keystore.properties` with your keystore details:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=journalmate-key
storeFile=/Users/YOUR_USERNAME/.android/journalmate-release.keystore
# Or use relative path if keeping in project:
# storeFile=../app/journalmate-release.keystore
```

**IMPORTANT:** Add this file to `.gitignore` to keep credentials secure!

```bash
echo "keystore.properties" >> android/.gitignore
```

## Step 3: Update build.gradle

The project's `android/app/build.gradle` should already be configured to use the keystore for release builds. Verify it contains:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 4: Update Version Code and Version Name

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        ...
        versionCode 1        // Increment for each release (1, 2, 3, ...)
        versionName "1.0.0"  // Semantic versioning (1.0.0, 1.0.1, 1.1.0, ...)
    }
}
```

**Rules:**
- `versionCode`: Must be an integer that increments with each release
- `versionName`: Human-readable version string (shown to users)

## Step 5: Build Release APK/AAB

### Option A: Build APK (for testing)

```bash
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Option B: Build AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Note:** Google Play Store requires AAB (Android App Bundle) format for new apps.

## Step 6: Test the Release Build

### Install on Device

```bash
# Install APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Or use bundletool for AAB
# Download bundletool from https://github.com/google/bundletool/releases
java -jar bundletool-all.jar build-apks --bundle=app-release.aab --output=app.apks --mode=universal
java -jar bundletool-all.jar install-apks --apks=app.apks
```

### Verify App Signing

```bash
# Check APK signature
jarsigner -verify -verbose -certs app-release.apk

# Check AAB signature
jarsigner -verify -verbose -certs app-release.aab
```

## Step 7: Prepare for Play Store Submission

### Required Assets

1. **App Icons** (already generated):
   - `android/app/src/main/res/mipmap-*/ic_launcher.png` (all densities)
   - Play Store icon: `android-play-store-512.png` (512x512px)

2. **Screenshots** (create these):
   - Phone: At least 2 screenshots (1080x1920px recommended)
   - Tablet (optional): At least 2 screenshots (1536x2048px)

3. **Feature Graphic** (create this):
   - Size: 1024x500px
   - Required for Play Store listing

4. **Privacy Policy**:
   - Required if app collects user data
   - Must be hosted on a publicly accessible URL

### App Details

Prepare the following for Play Store Console:

- **App Name**: JournalMate.ai
- **Short Description** (max 80 chars): Plan tracker & AI journal for your goals
- **Full Description** (max 4000 chars): See `docs/PLAY_STORE_DESCRIPTION.md`
- **Category**: Productivity
- **Content Rating**: Rate your app via Google Play Console questionnaire
- **Target Audience**: Adults 18+
- **Privacy Policy URL**: https://journalmate.ai/privacy
- **Contact Email**: support@journalmate.ai

## Step 8: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing app
3. Fill in app details (name, description, category, etc.)
4. Upload screenshots and graphics
5. Upload the AAB file
6. Complete content rating questionnaire
7. Set pricing & distribution (free/paid, countries)
8. Submit for review

## Automated Build Script

Use the npm scripts for automated builds:

```bash
# Full build pipeline (generates assets, builds web, syncs to Android, builds APK)
npm run build:android

# Just build the release APK
cd android && ./gradlew assembleRelease

# Just build the release AAB
cd android && ./gradlew bundleRelease
```

## Security Checklist

- [ ] Keystore file is NOT committed to git
- [ ] `keystore.properties` is NOT committed to git
- [ ] Keystore password is stored securely (password manager)
- [ ] Backup keystore file in a secure location (encrypted cloud storage)
- [ ] ProGuard/R8 is enabled for release builds (code obfuscation)
- [ ] All API keys are stored in environment variables or backend
- [ ] App uses HTTPS for all network requests
- [ ] No debug logs or console.log statements in production code

## Troubleshooting

### "keystore not found" Error

```bash
# Verify keystore.properties path is correct
cat android/keystore.properties

# Verify keystore file exists
ls -la ~/.android/journalmate-release.keystore
```

### Build Fails with ProGuard Errors

Add ProGuard rules in `android/app/proguard-rules.pro`:

```proguard
# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}
```

### "App Not Installed" on Device

```bash
# Uninstall existing debug version first
adb uninstall ai.journalmate.app

# Then install release version
adb install app-release.apk
```

## Version Management

Track version history in `CHANGELOG.md`:

```markdown
## [1.0.0] - 2025-01-15
### Added
- Initial release
- OAuth social sign-in (Google, Facebook)
- Biometric authentication
- Splash screen with branding
- Adaptive icons
```

## Next Steps

After successful Play Store submission:

1. Monitor reviews and crash reports in Play Console
2. Set up staged rollouts (e.g., 10% → 50% → 100%)
3. Configure in-app updates for automatic updates
4. Set up Firebase Crashlytics for error tracking
5. Configure Play Store A/B testing for screenshots/descriptions
