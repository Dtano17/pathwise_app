import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeGoogleAuth } from "./lib/nativeGoogleAuth";
import { initializeSafeArea, setupSafeAreaListeners } from "./lib/safeArea";
import { isNative, getPlatform, isAndroid } from "./lib/platform";

// Detect Android WebView via User Agent - works even when loading remote URLs
// The 'wv' marker in user agent indicates Android WebView
const isAndroidWebView = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('android') && (ua.includes('wv') || ua.includes('webview'));
};

// Apply safe area padding for Android WebView IMMEDIATELY
// This runs before React renders to prevent layout shift
if (isAndroidWebView()) {
  console.log('[INIT] Android WebView detected via User Agent, applying safe areas');
  document.documentElement.style.setProperty('--mobile-safe-top', '28px');
  document.documentElement.style.setProperty('--mobile-safe-bottom', '52px');
  document.body.classList.add('platform-android');
}

// Add platform class IMMEDIATELY (before any async code) for CSS targeting
// This ensures safe area CSS applies from the first render
// Uses robust detection with fallback for Android WebView timing issues
if (isNative()) {
  const platform = getPlatform();
  document.body.classList.add(`platform-${platform}`);
  console.log(`[INIT] Platform class added: platform-${platform}`);
}

// Initialize safe area handling for native platforms
initializeSafeArea().catch(error => {
  console.log('[INIT] Safe area initialization skipped or failed:', error);
});
setupSafeAreaListeners();

// Initialize native Google Auth for Capacitor mobile apps
initializeGoogleAuth().catch(error => {
  console.log('[INIT] Google Auth initialization skipped or failed:', error);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available, reloading...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          }
        });
        
        registration.update();
      })
      .catch((error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
  });
  
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
