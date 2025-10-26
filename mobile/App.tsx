
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, Alert, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Get your Replit URL - UPDATE THIS with your actual Replit URL
  const WEB_URL = 'https://2b38394c-a6cf-4e62-beaa-a0a84cbdfc59-00-2sqz7qoqe2kh7.sisko.replit.dev';

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log('Push token:', token);
        
        // Send token to your backend
        fetch(`${WEB_URL}/api/notifications/register-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform: Platform.OS })
        }).catch(err => console.log('Token registration failed:', err));
      }
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      if (data.url && webViewRef.current) {
        webViewRef.current.injectJavaScript(`window.location.href = '${data.url}'; true;`);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading JournalMate...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        // Enable native features
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Better performance
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        // Handle errors
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          Alert.alert('Error', 'Failed to load JournalMate. Please check your connection.');
        }}
        onLoadEnd={() => setIsLoading(false)}
        // Inject native capabilities
        injectedJavaScript={`
          window.isNativeApp = true;
          window.nativePlatform = '${Platform.OS}';
          window.expoPushToken = '${expoPushToken}';
          
          // Add native notification capability
          window.sendNativeNotification = (title, body, data) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SHOW_NOTIFICATION',
              title,
              body,
              data
            }));
          };
          
          // Add haptic feedback capability
          window.triggerHaptic = (type) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'HAPTIC_FEEDBACK',
              hapticType: type || 'light'
            }));
          };
          
          console.log('Native bridge initialized for ${Platform.OS}');
          true;
        `}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            
            if (message.type === 'SHOW_NOTIFICATION') {
              schedulePushNotification(message.title, message.body, message.data);
            } else if (message.type === 'HAPTIC_FEEDBACK') {
              // Could implement haptic feedback here
              console.log('Haptic feedback requested:', message.hapticType);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        }}
      />
    </View>
  );
}

async function schedulePushNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id'
      })).data;
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 16,
    color: '#6C5CE7',
    fontSize: 16,
    fontWeight: '600',
  },
});
