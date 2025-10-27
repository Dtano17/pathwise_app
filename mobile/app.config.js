// Read from .env file manually since dotenv isn't available
const fs = require('fs');
const path = require('path');

// Default to current Replit URL - update .env file when URL changes
let apiUrl = 'https://4f9903c2-0076-4cd7-a19b-2fb36f4173fe-00-3cq0d74q496xs.kirk.replit.dev';

try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_API_URL=(.+)/);
    if (match && match[1]) {
      apiUrl = match[1].trim();
    }
  }
} catch (error) {
  console.log('Note: Could not read .env file, using default URL');
}

module.exports = {
  expo: {
    name: "JournalMate",
    slug: "journalmate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "journalmate",
    experiments: {
      typedRoutes: false
    },
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#8b5cf6"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.journalmate.app",
      infoPlist: {
        NSCameraUsageDescription: "JournalMate needs access to your camera to capture journal photos",
        NSPhotoLibraryUsageDescription: "JournalMate needs access to your photo library to add images to journal entries"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#8b5cf6"
      },
      package: "com.journalmate.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.VIBRATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#8b5cf6"
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow JournalMate to access your camera for journal photos"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow JournalMate to access your photos for journal entries"
        }
      ],
      "expo-router"
    ],
    extra: {
      eas: {
        projectId: "your-project-id-here"
      },
      apiUrl: apiUrl
    }
  }
};
