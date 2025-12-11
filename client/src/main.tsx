import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import { App as CapacitorApp } from '@capacitor/app';
import App from "./App";
import "./index.css";

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
  });
}

// Handle deep links for OAuth callbacks on mobile
CapacitorApp.addListener('appUrlOpen', (event) => {
  console.log('[Deep Link] App opened with URL:', event.url);

  try {
    const url = new URL(event.url);

    // Check if this is an OAuth callback
    // Handles both: ai.journalmate.app://auth/callback and https://journalmate.ai/auth/callback
    if (url.pathname.includes('/auth/callback') || url.pathname === '/callback' || url.pathname === '/auth-callback') {
      console.log('[Deep Link] OAuth callback detected, navigating to /auth/callback');

      // Extract query parameters and hash from the deep link
      const queryParams = url.search;
      const hashParams = url.hash;

      // Navigate to the auth callback page with all parameters preserved
      const callbackUrl = `/auth/callback${queryParams}${hashParams}`;
      console.log('[Deep Link] Navigating to:', callbackUrl);

      // Use window.location to ensure the AuthCallback component handles the OAuth flow
      window.location.href = callbackUrl;
    } else {
      // Handle other deep links (e.g., shared content, specific pages)
      console.log('[Deep Link] Non-auth deep link, navigating to:', url.pathname);
      window.location.href = url.pathname + url.search + url.hash;
    }
  } catch (error) {
    console.error('[Deep Link] Error processing deep link:', error);
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
