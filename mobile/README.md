# JournalMate Mobile - React Native App

A native mobile app for JournalMate built with React Native and Expo.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Start Expo Development Server

```bash
npm start
```

Or use the convenience script:
```bash
./start-expo.sh
```

### 3. Open in Expo Go

1. Download **Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code shown in your terminal

3. The app will load on your phone!

## 📱 Features

### ✅ Implemented
- **Home Screen** - View and manage tasks and activities
- **Swipeable Task Cards** - Swipe right to complete, left to skip (with haptic feedback)
- **Planning Chat** - Quick Plan and Smart Plan modes with AI assistance
- **Journal** - Create entries with photos, categories, and @keywords
- **Profile** - View progress stats, manage settings
- **Authentication** - Login/signup with guest mode
- **Dark Mode** - Automatic light/dark theme switching
- **Native Animations** - Smooth gesture handling with React Native Reanimated

### 🎨 UI Components
- Bottom tab navigation (Home, Plan, Journal, Profile)
- Swipeable task cards with haptic feedback
- Category badges and progress indicators
- Responsive layouts for all screen sizes

### 🔌 Backend Integration
- Connects to your Express backend via REST API
- Shared authentication with web app
- Real-time data sync

## 🛠️ Development

### Project Structure

```
mobile/
├── src/
│   ├── components/       # Reusable React Native components
│   │   └── TaskCard.tsx  # Swipeable task card with gestures
│   ├── screens/          # Main app screens
│   │   ├── HomeScreen.tsx      # Tasks & Activities
│   │   ├── PlanningScreen.tsx  # AI planning chat
│   │   ├── JournalScreen.tsx   # Journal entries
│   │   ├── ProfileScreen.tsx   # User profile
│   │   └── AuthScreen.tsx      # Login/Signup
│   ├── navigation/       # Navigation setup
│   │   └── TabNavigator.tsx
│   ├── services/         # API client and services
│   │   └── api.ts        # Backend API calls
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # App constants (colors, etc.)
│   └── utils/            # Utility functions
├── assets/               # Images, icons, fonts
├── App.tsx               # Main app entry point
├── app.json              # Expo configuration
└── package.json          # Dependencies
```

### Key Dependencies

- **expo** - React Native framework
- **@react-navigation** - Native navigation
- **react-native-gesture-handler** - Touch gestures
- **react-native-reanimated** - Smooth animations
- **expo-haptics** - Vibration feedback
- **expo-camera** - Camera access for journal
- **expo-image-picker** - Photo library access
- **axios** - API requests
- **@react-native-async-storage/async-storage** - Local storage

### Configuration

Update the API URL in `src/services/api.ts`:

```typescript
const API_URL = 'https://your-replit-url.replit.dev';
```

## 📦 Building for App Stores

### Setup EAS (Expo Application Services)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build iOS App

```bash
eas build --platform ios
```

### Build Android App

```bash
eas build --platform android
```

### Submit to App Stores

```bash
# iOS (requires Apple Developer account)
eas submit --platform ios

# Android (requires Google Play Developer account)
eas submit --platform android
```

## 🔄 Sync with Web App

The mobile app shares the same backend as the web app:

- Same database
- Same user accounts
- Same API endpoints
- Users can switch seamlessly between web and mobile

## 🐛 Debugging

### View Logs

```bash
npx expo start --dev-client
```

### Clear Cache

```bash
npx expo start -c
```

### Common Issues

**Metro bundler fails to start:**
```bash
rm -rf node_modules
npm install
npx expo start -c
```

**Can't connect to backend:**
- Make sure your Replit web server is running
- Update API_URL in `src/services/api.ts`
- Check your phone is on the same network (or use ngrok for tunneling)

## 📚 Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Start Expo development server
3. ✅ Test on your phone with Expo Go
4. 🔲 Customize branding and colors
5. 🔲 Add more features from web app
6. 🔲 Build and submit to app stores

## 💡 Tips

- Use Expo Go for rapid development and testing
- Shake your phone to open the developer menu
- Enable Fast Refresh for instant updates
- Use React DevTools for debugging

---

**Built with ❤️ using React Native and Expo**
