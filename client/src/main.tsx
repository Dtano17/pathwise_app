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

/**
 * Parse URL that may be a custom scheme or standard URL
 * Handles both: ai.journalmate.app://auth/callback?code=123 and https://journalmate.ai/auth/callback?code=123
 */
function parseDeepLinkUrl(urlString: string): { pathname: string; search: string; hash: string } | null {
  try {
    // Try standard URL constructor first (works for https://, http://, etc.)
    const url = new URL(urlString);
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash
    };
  } catch (error) {
    // Fallback for custom schemes (e.g., ai.journalmate.app://)
    // Custom scheme format: scheme://path?query#hash
    const customSchemeMatch = urlString.match(/^[^:]+:\/\/([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (customSchemeMatch) {
      return {
        pathname: customSchemeMatch[1] || '',
        search: customSchemeMatch[2] || '',
        hash: customSchemeMatch[3] || ''
      };
    }
    
    // If neither works, return null
    console.warn('[Deep Link] Could not parse URL:', urlString);
    return null;
  }
}

// Handle deep links for OAuth callbacks on mobile
CapacitorApp.addListener('appUrlOpen', (event) => {
  console.log('[Deep Link] App opened with URL:', event.url);

  try {
    const parsed = parseDeepLinkUrl(event.url);
    
    if (!parsed) {
      console.error('[Deep Link] Failed to parse URL:', event.url);
      return;
    }

    // Check if this is an OAuth callback
    // Handles both: ai.journalmate.app://auth/callback and https://journalmate.ai/auth/callback
    if (parsed.pathname.includes('/auth/callback') || parsed.pathname === '/callback' || parsed.pathname === '/auth-callback') {
      console.log('[Deep Link] OAuth callback detected, navigating to /auth/callback');

      // Navigate to the auth callback page with all parameters preserved
      const callbackUrl = `/auth/callback${parsed.search}${parsed.hash}`;
      console.log('[Deep Link] Navigating to:', callbackUrl);

      // Use window.location to ensure the AuthCallback component handles the OAuth flow
      window.location.href = callbackUrl;
    } else {
      // Handle other deep links (e.g., shared content, specific pages)
      console.log('[Deep Link] Non-auth deep link, navigating to:', parsed.pathname);
      window.location.href = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (error) {
    console.error('[Deep Link] Error processing deep link:', error);
    // Fallback: try to extract path from URL string manually
    try {
      const pathMatch = event.url.match(/:\/\/([^?#]+)/);
      if (pathMatch) {
        const path = pathMatch[1];
        console.log('[Deep Link] Fallback navigation to:', path);
        window.location.href = `/${path}`;
      }
    } catch (fallbackError) {
      console.error('[Deep Link] Fallback parsing also failed:', fallbackError);
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
