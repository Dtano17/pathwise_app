# 📱 Mobile App Testing Setup Guide

Complete guide to set up Android and iOS emulators for testing your JournalMate mobile app locally.

---

## 🤖 Android Emulator Setup

### Prerequisites

1. **Install Android Studio** (if not already installed)
   - Download: https://developer.android.com/studio
   - Size: ~1GB download, ~3GB installed
   - Required for Android development

### Step-by-Step Setup

#### 1. Install Android Studio

```bash
# Download from: https://developer.android.com/studio
# Run the installer and follow the setup wizard
```

During installation, make sure to install:
- ✅ Android SDK
- ✅ Android SDK Platform
- ✅ Android Virtual Device (AVD)
- ✅ Performance (Intel HAXM or AMD Hypervisor)

#### 2. Open Your JournalMate Android Project

```bash
# From your project directory
npx cap open android
```

This will:
- Launch Android Studio
- Open the `android/` folder as a project
- Load your JournalMate app

#### 3. Create an Android Virtual Device (AVD)

**In Android Studio:**

1. Click **Tools** → **Device Manager** (or the phone icon in toolbar)
2. Click **Create Device**
3. Select a device:
   - **Recommended:** Pixel 6 or Pixel 7
   - Category: Phone
   - Click **Next**

4. Select a system image:
   - **Recommended:** Android 13 (API 33) or Android 14 (API 34)
   - Click **Download** next to the system image (if needed)
   - Wait for download to complete
   - Click **Next**

5. Configure AVD:
   - AVD Name: `Pixel_6_API_33` (or similar)
   - Startup orientation: Portrait
   - Click **Finish**

#### 4. Start the Emulator

**Option A: From Android Studio Device Manager**
- Click the ▶️ (Play) button next to your AVD
- Wait for emulator to boot (~30-60 seconds first time)

**Option B: From Command Line**
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_6_API_33
```

#### 5. Run Your App on Emulator

Once emulator is running:

**Option A: From Android Studio**
- Click the green ▶️ **Run** button in toolbar
- Select your emulator from device dropdown
- App will build and install automatically

**Option B: From Command Line**
```bash
# Make sure build is up to date
npm run build
npx cap sync android

# Run on emulator (requires Android Studio running)
npx cap run android
```

---

## 🍎 iOS Simulator Setup (macOS Only)

**⚠️ Note:** iOS development requires a Mac with Xcode. If you're on Windows, you can only test Android locally.

### Prerequisites (Mac Only)

1. **macOS** (Big Sur or later recommended)
2. **Xcode** (latest version)
3. **Xcode Command Line Tools**

### Step-by-Step Setup

#### 1. Install Xcode

```bash
# Option A: From App Store (Recommended)
# - Open App Store
# - Search "Xcode"
# - Click "Get" or "Install"
# - Size: ~12GB

# Option B: From Terminal (using Homebrew)
brew install --cask xcode
```

#### 2. Install Xcode Command Line Tools

```bash
xcode-select --install
```

#### 3. Accept Xcode License

```bash
sudo xcodebuild -license accept
```

#### 4. Install CocoaPods (iOS Dependency Manager)

```bash
sudo gem install cocoapods
```

#### 5. Open Your JournalMate iOS Project

```bash
# From your project directory
cd ios/App
pod install
cd ../..
npx cap open ios
```

This will:
- Install iOS dependencies via CocoaPods
- Launch Xcode
- Open your JournalMate app workspace

#### 6. Select an iOS Simulator

**In Xcode:**

1. Look at the top toolbar for device selector (next to Run/Stop buttons)
2. Click the device dropdown (shows "iPhone" or current device)
3. Select a simulator:
   - **Recommended:** iPhone 14 Pro or iPhone 15
   - Or any iPhone model you want to test

**To add more simulators:**
1. Click **Xcode** → **Settings** (or Preferences)
2. Go to **Platforms** tab
3. Find iOS and click **Get** to download simulators
4. Click **+** to add new simulators with specific iOS versions

#### 7. Run Your App on Simulator

**Option A: From Xcode**
- Click the ▶️ **Run** button (top left, or Cmd+R)
- Xcode will:
  - Build your app
  - Launch the simulator
  - Install and run JournalMate

**Option B: From Command Line**
```bash
# Make sure build is up to date
npm run build
npx cap sync ios

# Run on simulator
npx cap run ios
```

---

## 🚀 Quick Launch Commands

### Android

```bash
# Full workflow
npm run build                 # Build web assets
npx cap sync android         # Sync to Android project
npx cap open android         # Open in Android Studio
# Then click Run ▶️ in Android Studio
```

### iOS (Mac only)

```bash
# Full workflow
npm run build                # Build web assets
npx cap sync ios            # Sync to iOS project
npx cap open ios            # Open in Xcode
# Then click Run ▶️ in Xcode
```

---

## 🔧 Troubleshooting

### Android Issues

**Problem: "Android SDK not found"**
```bash
# In Android Studio:
# Tools → SDK Manager → Install Android SDK
# Set ANDROID_HOME environment variable:
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```

**Problem: "Emulator is slow"**
- Enable Hardware Acceleration (Intel HAXM or AMD Hypervisor)
- Increase emulator RAM in AVD settings (4GB recommended)
- Use a newer Android version (Android 13+)

**Problem: "App not installing"**
```bash
# Clean and rebuild
cd android
.\gradlew clean
cd ..
npm run build
npx cap sync android
```

**Problem: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"**
```bash
# Uninstall previous version
adb uninstall ai.journalmate.app
# Then try running again
```

### iOS Issues (Mac Only)

**Problem: "CocoaPods not found"**
```bash
sudo gem install cocoapods
cd ios/App
pod install
cd ../..
```

**Problem: "Code signing error"**
- In Xcode: Select your project in left sidebar
- Go to **Signing & Capabilities** tab
- Select your team or choose "Automatically manage signing"
- For local testing, you can use a free Apple Developer account

**Problem: "Simulator not booting"**
```bash
# Reset simulator
xcrun simctl erase all
# Or from Xcode: Device → Erase All Content and Settings
```

**Problem: "Build failed"**
```bash
# Clean build folder
cd ios/App
xcodebuild clean
cd ../..
npm run build
npx cap sync ios
```

---

## 🧪 Testing Your HD Images

Once your app is running on emulator/simulator:

1. Navigate to **Community Plans** page
2. Scroll through the plan cards
3. Verify all 28 HD images display correctly
4. Check image quality is sharp and clear
5. Test on different screen sizes (rotate device)

### What to Look For:
- ✅ Images load quickly (instant - they're bundled)
- ✅ No broken image placeholders
- ✅ Images are sharp, not pixelated
- ✅ Proper aspect ratios maintained
- ✅ Backgrounds display correctly on cards

---

## 📱 Testing on Physical Devices

### Android Physical Device

1. **Enable Developer Mode on your Android phone:**
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings** → **Developer Options**
   - Enable **USB Debugging**

2. **Connect via USB:**
   ```bash
   # Check device is connected
   adb devices
   # Should show your device
   ```

3. **Run app:**
   ```bash
   npm run build
   npx cap sync android
   npx cap run android --target <device-id>
   ```

### iOS Physical Device (Mac only)

1. **Connect iPhone via USB**
2. **In Xcode:**
   - Select your physical device from device dropdown
   - Click Run ▶️
   - First time: Trust the computer on iPhone
   - May need to add Apple ID in Xcode preferences

---

## 💡 Tips for Faster Development

### Live Reload (Web-like development on mobile)

```bash
# Start dev server
npm run dev

# In another terminal, run on device with live reload
npx cap run android --livereload --external
# or
npx cap run ios --livereload --external
```

This allows you to:
- Make code changes
- See updates instantly on emulator/device
- No need to rebuild and reinstall

### Using Chrome DevTools (Android)

1. Run app on Android emulator/device
2. Open Chrome browser on your computer
3. Navigate to: `chrome://inspect`
4. Find your app in the list
5. Click **Inspect** to open DevTools
6. Debug like a web app!

### Using Safari DevTools (iOS - Mac only)

1. Run app on iOS simulator
2. Open Safari on your Mac
3. Go to **Develop** menu
4. Select **Simulator** → **JournalMate** → **index.html**
5. Safari Web Inspector opens
6. Debug like a web app!

---

## 📊 System Requirements

### For Android Development

**Minimum:**
- Windows 10 or later
- 8GB RAM
- 4GB free disk space
- Intel/AMD processor with virtualization support

**Recommended:**
- Windows 11
- 16GB RAM
- 10GB free disk space
- SSD storage
- Dedicated graphics card (optional, helps with emulator)

### For iOS Development

**Minimum:**
- macOS Big Sur (11.0) or later
- Mac with Apple Silicon (M1/M2) or Intel processor
- 8GB RAM
- 20GB free disk space (Xcode is large!)

**Recommended:**
- macOS Ventura (13.0) or later
- Mac with Apple Silicon (M1/M2/M3) - much faster
- 16GB RAM
- 30GB free disk space
- SSD storage

---

## 🎯 Next Steps After Setup

1. ✅ Set up emulator/simulator (this guide)
2. ✅ Run your app locally
3. ✅ Test HD images on Community Plans page
4. ✅ Test mobile features (camera, location, etc.)
5. ✅ Fix any issues found
6. 🔄 Iterate and improve
7. 📦 Prepare for app store submission

---

## 📚 Additional Resources

- **Android Studio Docs:** https://developer.android.com/studio/intro
- **Xcode Docs:** https://developer.apple.com/xcode/
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Emulator Guide:** https://developer.android.com/studio/run/emulator
- **iOS Simulator Guide:** https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device

---

**Status:** Ready to set up emulators
**Estimated Setup Time:**
- Android: 30-60 minutes (includes downloads)
- iOS: 60-120 minutes (Xcode is large)

---

*Created: 2025-11-12*
*JournalMate Mobile App Development - Week 5*
