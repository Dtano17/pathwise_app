import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.verifymate.app',
  appName: 'VerifyMate - AI Fact Checker',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Load from production web app - enables session-based auth
    url: 'https://verifymate.ai',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0F172A', // Dark slate background for VerifyMate
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#0EA5E9',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'light', // Light text for dark backgrounds
      backgroundColor: '#0F172A', // Dark slate background
    },
    Camera: {
      // Allow users to choose from camera or photo library
      promptForGallery: true,
    },
    LocalNotifications: {
      // For reminder notifications - uses launcher icon as fallback
      smallIcon: 'ic_launcher',
      iconColor: '#0EA5E9',
      sound: 'default',
    },
    GoogleAuth: {
      // Web Client ID from Google Cloud Console
      // SECURITY NOTE: This is intentionally a PUBLIC credential (not a secret).
      // OAuth Client IDs are designed to be embedded in client apps per Google's docs.
      // The Client SECRET (which IS sensitive) is stored server-side only.
      scopes: ['profile', 'email'],
      serverClientId: '', // TODO: Configure VerifyMate Google OAuth Client ID
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
    backgroundColor: '#0F172A', // Dark slate for VerifyMate
  },
};

export default config;
