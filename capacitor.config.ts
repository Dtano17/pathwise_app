import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.journalmate.app',
  appName: 'JournalMate.ai',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // No URL set - loads bundled assets locally
    // API calls are prefixed with production URL via client/src/lib/api.ts
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#6C5CE7', // Matches theme_color from manifest.json
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
      style: 'dark', // Dark text for light backgrounds
      backgroundColor: '#6C5CE7', // JournalMate purple theme
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
      // Web client ID from Google Cloud Console
      // Set via GOOGLE_CLIENT_ID environment variable in production
      scopes: ['profile', 'email'],
      serverClientId: process.env.GOOGLE_CLIENT_ID || '',
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
    backgroundColor: '#0f0f23', // Matches background_color from manifest.json
  },
};

export default config;
