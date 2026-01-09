import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.journalmate.app',
  appName: 'JournalMate.ai - AI Lifestyle Planner',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Point to production web app - app acts as a native WebView wrapper
    url: 'https://journalmate.ai',
    // Clear text not needed since we're using HTTPS
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0B0F1A', // Deep navy-black background for premium aesthetic
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'light', // Light text for dark backgrounds
      backgroundColor: '#0B0F1A', // Deep navy-black background for premium aesthetic
    },
    Camera: {
      // Allow users to choose from camera or photo library
      promptForGallery: true,
    },
    LocalNotifications: {
      // For reminder notifications - uses launcher icon as fallback
      smallIcon: 'ic_launcher',
      iconColor: '#6C5CE7',
      sound: 'default',
    },
    GoogleAuth: {
      // Web client ID from Google Cloud Console (pathwise-gcp project)
      scopes: ['profile', 'email'],
      serverClientId: '481740120979-76fs0ru0uikj5o33mr87vhua8c54657f.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  // iOS specific configuration
  ios: {
    contentInset: 'automatic',
    // Allow mixed content for development
    allowsLinkPreview: true,
  },
  // Android specific configuration
  android: {
    // Enable clear text traffic for development
    allowMixedContent: false,
    // Background color while app loads
    backgroundColor: '#0B0F1A', // Deep navy-black for premium aesthetic
  },
};

export default config;
