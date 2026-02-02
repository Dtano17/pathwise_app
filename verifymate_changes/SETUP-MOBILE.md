# JournalMate Mobile App - Setup Guide

Welcome! I've created a **full React Native mobile app** for JournalMate that runs in Expo Go and can be published to the App Stores.

## 🎉 What's New

I've rebuilt the mobile app as a **true React Native application** with:

✅ **Native Components** - Real native UI, not a WebView wrapper  
✅ **Swipeable Task Cards** - Smooth gesture-based task management with haptic feedback  
✅ **Bottom Tab Navigation** - Native iOS/Android navigation patterns  
✅ **AI Planning Chat** - Quick Plan and Smart Plan modes  
✅ **Journal with Camera** - Take photos directly from the app  
✅ **Native Animations** - React Native Reanimated for 60fps performance  
✅ **Dark Mode** - Automatic theme switching  
✅ **Expo Go Compatible** - Test instantly on your phone  
✅ **App Store Ready** - Build and submit with EAS  

## 🚀 Quick Start (3 Minutes)

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

This installs all React Navigation, gesture handlers, camera, and other native dependencies.

### Step 2: Start the App

```bash
chmod +x start-expo.sh
./start-expo.sh
```

Or manually:
```bash
cd mobile
npm start
```

### Step 3: Open in Expo Go

1. **Download Expo Go** on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Scan the QR code** shown in your terminal

3. **Wait for the app to load** (first launch takes ~30 seconds)

4. **Test it out!**
   - Login or continue as guest
   - Swipe tasks right to complete, left to skip
   - Try creating a new plan
   - Add a journal entry with photos

## 📱 App Structure

```
mobile/
├── App.tsx                    # Main app entry (Navigation setup)
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx     # Tasks & Activities with tabs
│   │   ├── PlanningScreen.tsx # Quick/Smart plan modes
│   │   ├── JournalScreen.tsx  # Journal with camera
│   │   ├── ProfileScreen.tsx  # User profile & stats
│   │   └── AuthScreen.tsx     # Login/Signup
│   ├── components/
│   │   └── TaskCard.tsx       # Swipeable task card
│   ├── navigation/
│   │   └── TabNavigator.tsx   # Bottom tab navigation
│   ├── services/
│   │   └── api.ts             # Backend API client
│   ├── types/                 # TypeScript definitions
│   └── constants/             # Colors, themes
├── app.json                   # Expo configuration
└── package.json               # Dependencies
```

## 🔧 Configuration

The app connects to your Express backend. To change the API URL:

Edit `mobile/src/services/api.ts` line 5:
```typescript
const API_URL = 'https://your-replit-url.replit.dev';
```

## 🎨 Features Breakdown

### Home Screen
- **Tasks Tab**: Swipeable task cards with completion gestures
- **Activities Tab**: View all your plans and activities
- **Pull to Refresh**: Latest data from the backend

### Planning Screen
- **Mode Selection**: Choose Quick Plan (5 questions) or Smart Plan (10 questions)
- **Chat Interface**: Real-time AI conversation
- **Backend Integration**: Uses your existing planning endpoints

### Journal Screen
- **Category Selection**: 9 categories matching the web app
- **Photo Upload**: Native camera/library access
- **@Keywords**: Type @travel, @wellness, etc.
- **Recent Entries**: View your journal history

### Profile Screen
- **Progress Stats**: Today, weekly streak, monthly total
- **Settings**: Dark mode toggle, notifications
- **Account Management**: Logout, priorities

## 📦 Building for App Stores

### 1. Set up EAS (one-time)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 2. Build iOS

```bash
cd mobile
eas build --platform ios
```

Wait ~15 minutes. You'll get a link to download the `.ipa` file.

### 3. Build Android

```bash
eas build --platform android
```

Wait ~15 minutes. You'll get an `.apk` or `.aab` file.

### 4. Submit to App Stores

```bash
# iOS (requires Apple Developer account - $99/year)
eas submit --platform ios

# Android (requires Google Play Developer - $25 one-time)
eas submit --platform android
```

### 5. Update App Configuration

Before building, update `mobile/app.json`:
- Set your `expo.extra.eas.projectId`
- Update bundle identifiers if needed
- Add app icons (in `assets/` folder)

## 🔄 Web App Integration

### Smart App Banners

Add this to your web app's `index.html` to promote the mobile app:

```html
<!-- iOS Smart App Banner -->
<meta name="apple-itunes-app" content="app-id=YOUR_APP_ID">

<!-- Android Intent -->
<link rel="alternate" href="android-app://com.journalmate.app/https/journalmate.app" />
```

When users visit your website on mobile, they'll see a banner to download the app!

## 🐛 Troubleshooting

### App Won't Load in Expo Go

1. **Check your Replit URL is correct** in `src/services/api.ts`
2. **Make sure the web server is running** (npm run dev in root folder)
3. **Try clearing Expo cache**: `npx expo start -c`

### TypeScript Errors

The LSP errors you see are normal before running `npm install`. After installation, most will disappear.

### Can't Build for App Stores

1. Make sure you have an Expo account: `eas login`
2. Configure the project: `eas build:configure`
3. Update bundle IDs in `app.json` if needed

### Camera/Photos Not Working

- **iOS**: Permissions are configured in `app.json`
- **Android**: Permissions are configured in `app.json`
- **Expo Go**: Camera works! Just allow permissions when prompted

## 🎯 Next Steps

1. ✅ **Test in Expo Go** - Scan QR code, test all features
2. 📝 **Customize** - Update colors, icons, branding
3. 🚀 **Build** - Use EAS to create iOS/Android builds
4. 🏪 **Submit** - Publish to App Store and Google Play
5. 🌐 **Promote** - Add smart app banners to your website

## 💡 Development Tips

- **Hot Reload**: Shake your phone → Enable Fast Refresh
- **Debug Menu**: Shake phone → Open React DevTools
- **View Logs**: Check your terminal for console.log output
- **Test on Real Device**: Expo Go works best on physical phones

## 🆚 Web vs Mobile

Both apps share the same backend:

| Feature | Web App | Mobile App |
|---------|---------|------------|
| Backend API | ✅ Same | ✅ Same |
| Database | ✅ Same | ✅ Same |
| User Accounts | ✅ Same | ✅ Same |
| UI Components | React DOM | React Native |
| Routing | Wouter | React Navigation |
| Gestures | Mouse/Touch | Native Gestures |
| Animations | Framer Motion | Reanimated |

Users can switch seamlessly between web and mobile!

## 📚 Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/guidelines/
- **Google Play Guidelines**: https://play.google.com/console/about/guides/

---

**Questions? Issues?**  
Check the troubleshooting section or the README.md in the mobile folder.

**Ready to test?**  
Run `./start-expo.sh` and scan the QR code! 🚀
