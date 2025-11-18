import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.journalmate.app',
  appName: 'JournalMate.ai',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // For local development on physical device, uncomment and update IP:
    // url: 'http://192.168.1.x:5173',
    // cleartext: true
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
      // For reminder notifications
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6C5CE7',
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
