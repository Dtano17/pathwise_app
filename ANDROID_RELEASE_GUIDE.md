# Android Release & Signing Guide

## 1. Evaluation for Production

Based on the project analysis, your app `JournalMate.ai` (ai.journalmate.app) is in excellent shape for production with a few specific configuration steps remaining.

### ✅ Ready
- **Features**: Geolocation, Camera, Notifications, and offline support are implemented.
- **Permissions**: `AndroidManifest.xml` correctly lists all required permissions.
- **Configuration**: `capacitor.config.ts` is set up correctly.

### ⚠️ Needs Action
- **Signing Configuration**: Your `build.gradle` is not yet configured to sign the release APK/AAB.
- **Google Services**: Ensure `android/app/google-services.json` is present if you are using Firebase/Push Notifications.
- **Assets**: Verify your app icons in `android/app/src/main/res/mipmap-*` are the final production versions.

---

## 2. Generating the Upload Key (Keystore)

Android requires all apps to be digitally signed with a certificate before they can be installed. You need to generate a Java Keystore (JKS) file.

### Step 1: Run Keytool Command
Open your terminal (Command Prompt or PowerShell) and navigate to the `android/app` folder:

```bash
cd android/app
```

Run the following command to generate the keystore. **Important: Keep your password safe and do not lose this file.**

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

**You will be prompted to:**
1. Create a password for the keystore.
2. Enter details like Name, Organizational Unit, Organization, City, etc. (You can type the app name or your name).
3. Confirm the details (type `yes`).

This creates a file named `my-release-key.jks` in your `android/app` folder.

**⚠️ SECURITY WARNING:**
- **Never commit `my-release-key.jks` to Git.** Add it to `.gitignore`.
- **Never commit your passwords to Git.**

---

## 3. Configuring Gradle for Signing

To automate the signing process during the build, create a `keystore.properties` file in `android/` (not `android/app/`) to hold your secrets securely.

### Step 1: Create `android/keystore.properties`
Create this file and add the following (replace with your actual passwords):

```properties
storePassword=your_store_password_here
keyPassword=your_key_password_here
keyAlias=my-key-alias
storeFile=../app/my-release-key.jks
```

### Step 2: Verify `.gitignore`
Ensure `*.jks` and `keystore.properties` are in your `.gitignore` file to prevent accidental leaks.

---

## 4. Building the Release Bundle

Once the signing config is set up in `build.gradle` (see the updated file), you can build the release version.

### Generate App Bundle (AAB) - Recommended for Play Store
The Android App Bundle format allows Google Play to optimize the download size for each device.

```bash
cd android
./gradlew bundleRelease
```
*Note: On Windows Command Prompt use `gradlew bundleRelease`*

**Output Location:**
`android/app/build/outputs/bundle/release/app-release.aab`

### Generate APK (Optional)
If you need a standalone APK for direct distribution:

```bash
cd android
./gradlew assembleRelease
```

**Output Location:**
`android/app/build/outputs/apk/release/app-release.apk`

---

## 5. Uploading to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console).
2. Create a new app.
3. Navigate to **Production** in the sidebar.
4. Create a new release.
5. Upload the `app-release.aab` file you generated.
6. Complete the store listing, content rating, and pricing sections.
