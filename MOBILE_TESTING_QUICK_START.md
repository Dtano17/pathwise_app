# 🚀 Quick Start: Launch Mobile App for Testing

The fastest way to test your JournalMate mobile app locally.

---

## ⚡ Fastest Option: Android Emulator

Since you're on Windows, Android is the easiest option to test locally.

### Step 1: Install Android Studio (One-time setup - ~30 mins)

1. **Download Android Studio:**
   - Visit: https://developer.android.com/studio
   - Click **Download Android Studio**
   - Size: ~1GB download

2. **Run the installer:**
   - Double-click the downloaded `.exe` file
   - Follow the setup wizard
   - **Important:** Keep all checkboxes selected:
     - ✅ Android SDK
     - ✅ Android SDK Platform
     - ✅ Android Virtual Device

3. **Complete first-time setup:**
   - Launch Android Studio
   - Click through the welcome wizard
   - It will download additional components (~2GB)
   - This takes 10-20 minutes

### Step 2: Create an Android Emulator (5 mins)

1. **Open Device Manager:**
   - In Android Studio, click **Tools** → **Device Manager**
   - Or click the phone icon 📱 in the toolbar

2. **Create Virtual Device:**
   - Click **Create Device** button
   - Select **Pixel 6** or **Pixel 7** from the list
   - Click **Next**

3. **Download System Image:**
   - Select **UpsideDownCake (API 34)** or **Tiramisu (API 33)**
   - Click the **Download** link next to it
   - Wait for download (~800MB)
   - Click **Next**

4. **Finish Setup:**
   - Name: `Pixel_7_API_34` (or keep default)
   - Click **Finish**

### Step 3: Open Your Project in Android Studio

```bash
# From your project directory
npx cap open android
```

This will:
- Launch Android Studio
- Open your JournalMate Android project
- Load all dependencies

### Step 4: Run Your App

1. **In Android Studio toolbar:**
   - Look for device selector (shows "No Device" or device name)
   - Click the dropdown and select your emulator (e.g., "Pixel_7_API_34")

2. **Click the green Run button ▶️** (or press Shift+F10)

3. **Wait for:**
   - Emulator to start (~30 seconds first time)
   - App to build and install (~60 seconds first time)
   - JournalMate to launch!

---

## 🎯 Alternative: Test in Browser First

While setting up the emulator, you can test most features in your browser:

```bash
npm run dev
```

Then visit: http://localhost:5173

**What works in browser:**
- ✅ All UI and layouts
- ✅ HD images display
- ✅ Navigation and routing
- ✅ Most features with web fallbacks

**What requires mobile:**
- ❌ Native camera (uses file picker in browser)
- ❌ Native share sheet
- ❌ Haptic feedback
- ❌ Push notifications
- ❌ Contact access
- ❌ Calendar integration

---

## 📱 Even Faster: Use Your Physical Android Phone

If you have an Android phone, you can test immediately:

### Enable Developer Mode (One-time)

1. **On your Android phone:**
   - Go to **Settings** → **About Phone**
   - Find **Build Number**
   - Tap it **7 times** (you'll see "You are now a developer!")
   - Go back to Settings
   - Open **Developer Options**
   - Enable **USB Debugging**

2. **Connect phone to computer via USB**

3. **Check connection:**
```bash
# Install ADB if not already (through Android Studio SDK Manager)
# Or download: https://developer.android.com/studio/releases/platform-tools

# Check device is recognized
adb devices
# Should show your device
```

4. **Run app on your phone:**
```bash
npm run build
npx cap sync android
npx cap run android
```

Your app will install and launch on your physical phone!

---

## 🍎 iOS Testing (Mac Required)

If you have access to a Mac, iOS testing is straightforward:

```bash
npx cap open ios
# Xcode opens
# Select a simulator from the device dropdown
# Click Run ▶️
```

**Note:** iOS development is only possible on macOS. Windows users cannot test iOS locally.

---

## 🎬 Complete Workflow Summary

### First Time Setup (Android)

```bash
# 1. Install Android Studio (manual download)
# Visit: https://developer.android.com/studio

# 2. Create emulator in Android Studio
# Tools → Device Manager → Create Device

# 3. Open project
npx cap open android

# 4. Click Run ▶️ in Android Studio
```

### Every Time After Setup

```bash
# If you made code changes:
npm run build
npx cap sync android

# Then in Android Studio:
# Click Run ▶️
```

---

## 💡 Pro Tips

### Live Reload (Faster Development)

```bash
# Start dev server
npm run dev

# In another terminal
npx cap run android --livereload --external
```

Now when you make code changes, the app updates automatically on the emulator!

### Debug with Chrome DevTools

1. Run app on Android emulator
2. Open Chrome on your computer
3. Go to: `chrome://inspect`
4. Click **Inspect** under your app
5. Use DevTools like a web app!

### Speed Up Emulator

In Android Studio:
- **Tools** → **AVD Manager**
- Click ✏️ (Edit) on your emulator
- **Advanced Settings** → Increase RAM to 4GB
- **Emulated Performance** → Graphics: Hardware

---

## 🐛 Common Issues

### "Emulator is slow"
- Make sure hardware acceleration is enabled
- Use a recent Android version (API 33+)
- Close other apps to free up RAM

### "App won't install"
```bash
# Uninstall old version
adb uninstall ai.journalmate.app

# Clean and rebuild
cd android
gradlew clean
cd ..
npm run build
npx cap sync android
```

### "Android Studio not opening project"
```bash
# Make sure you built first
npm run build
npx cap sync android

# Then open
npx cap open android
```

---

## ✅ What to Test

Once your app is running:

1. **Navigate to Community Plans page**
   - Should see all 28 HD images
   - Images should be sharp and clear
   - No broken image placeholders

2. **Test mobile features:**
   - Camera (if using photo capture components)
   - Location picker
   - Share functionality
   - Haptic feedback
   - Offline sync indicator

3. **Test responsiveness:**
   - Rotate device (portrait/landscape)
   - Different screen sizes
   - Scroll performance

---

## 📚 Need More Help?

See the detailed guide: [MOBILE_TESTING_SETUP.md](MOBILE_TESTING_SETUP.md)

---

**Estimated Time:**
- First time: 45-60 minutes (includes Android Studio download/setup)
- After setup: 2-3 minutes to launch

**Recommended:** Start with browser testing (`npm run dev`) while Android Studio downloads in the background!

---

*Created: 2025-11-12*
*JournalMate Mobile App Development*
