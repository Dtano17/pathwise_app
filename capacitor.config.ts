import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.journalmate.app',
  appName: 'JournalMate.ai - AI Lifestyle Planner',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Load from production web app - enables session-based auth
    url: 'https://journalmate.ai',
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
      // Web Client ID from Google Cloud Console (pathwise-gcp project)
      // SECURITY NOTE: This is intentionally a PUBLIC credential (not a secret).
      // OAuth Client IDs are designed to be embedded in client apps per Google's docs.
      // The Client SECRET (which IS sensitive) is stored server-side only.
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
