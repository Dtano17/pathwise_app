/**
 * Native Google Authentication for Capacitor
 *
 * Provides native Google Sign-In on iOS/Android to bypass WebView restrictions.
 * Falls back to web OAuth on non-native platforms.
 *
 * This solves the "Error 403: disallowed_useragent" issue that occurs when
 * trying to use Google OAuth inside a WebView.
 */

import { Preferences } from '@capacitor/preferences';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { apiUrl, isCapacitorEnvironment, isNativeGoogleAuthAvailable } from './api';
import { isNative } from './platform';

// Storage key for auth token
const AUTH_TOKEN_KEY = 'journalmate_auth_token';

// Define the GoogleAuth plugin interface
interface GoogleAuthPlugin {
  initialize(options?: {
    clientId?: string;
    scopes?: string[];
    grantOfflineAccess?: boolean;
  }): Promise<void>;
  signIn(): Promise<{
    id: string;
    email: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    imageUrl?: string;
    authentication?: {
      idToken?: string;
      accessToken?: string;
    };
  }>;
  signOut(): Promise<void>;
  refresh(): Promise<{ accessToken?: string }>;
}

// Register the GoogleAuth plugin - this creates the JS-to-native bridge
// The plugin is auto-registered by Capacitor on native platforms
// On web, this provides a fallback implementation
const GoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth', {
  web: () => Promise.resolve({
    initialize: async () => {
      console.log('[GOOGLE_AUTH_WEB] initialize - no-op on web');
    },
    signIn: async () => {
      throw new Error('Native Google Auth not available on web - use web OAuth');
    },
    signOut: async () => {
      console.log('[GOOGLE_AUTH_WEB] signOut - no-op on web');
    },
    refresh: async () => {
      throw new Error('Native Google Auth not available on web');
    },
  }),
});

export interface NativeAuthResult {
  success: boolean;
  pending?: boolean; // True when browser OAuth is in progress (waiting for deep link callback)
  user?: {
    id: string;
    email: string;
    name: string;
    imageUrl?: string;
  };
  error?: string;
}

/**
 * Initialize Google Auth plugin
 * Call this early in app lifecycle (e.g., in App.tsx or main.tsx)
 *
 * Works for both Capacitor local apps AND Android WebView loading remote URLs,
 * as long as the GoogleAuth plugin is available.
 */
export async function initializeGoogleAuth(): Promise<void> {
  const inCapacitor = isCapacitorEnvironment();
  const hasGoogleAuth = isNativeGoogleAuthAvailable();

  console.log('[GOOGLE_AUTH] initializeGoogleAuth called, inCapacitor:', inCapacitor, 'hasGoogleAuth:', hasGoogleAuth);

  // Initialize if we're in a Capacitor environment with GoogleAuth plugin available
  if (!inCapacitor || !hasGoogleAuth) {
    console.log('[GOOGLE_AUTH] Skipping initialization - not in Capacitor or plugin unavailable');
    return;
  }

  // Capacitor environment with GoogleAuth plugin - initialize native Google Sign-In
  try {
    console.log('[GOOGLE_AUTH] Initializing native Google Sign-In');
    await GoogleAuth.initialize({
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('[GOOGLE_AUTH] Native Google Sign-In initialized successfully');
  } catch (error) {
    console.error('[GOOGLE_AUTH] Native initialization failed:', error);
    // Don't throw - fallback to browser OAuth will happen in signInWithGoogleNative
  }
}

/**
 * Open Google OAuth in system browser (fallback when native auth isn't available)
 * This works around WebView restrictions by opening in external browser
 */
async function openBrowserAuth(): Promise<NativeAuthResult> {
  console.log('[GOOGLE_AUTH] Opening system browser for OAuth...');

  try {
    // Open the web OAuth flow in the system browser
    // The production URL handles the OAuth flow
    // Add mobile=true flag so server knows to redirect via deep link after auth
    const authUrl = apiUrl('/api/auth/google?mobile=true');

    await Browser.open({
      url: authUrl,
      windowName: '_system', // Force system browser
      presentationStyle: 'popover',
    });

    // Return pending status - the actual auth completion happens via deep link
    // Don't return error since browser opened successfully
    return {
      success: false,
      pending: true, // Indicates auth is in progress, not failed
    };
  } catch (browserError) {
    console.error('[GOOGLE_AUTH] Browser open failed:', browserError);
    // Last resort: try window.open
    window.open(apiUrl('/api/auth/google?mobile=true'), '_system');
    return {
      success: false,
      pending: true, // Browser should still open via window.open
    };
  }
}

/**
 * Sign in with Google using native dialog
 * On native platforms, uses native Google Sign-In
 * Falls back to system browser if native auth fails
 * On web, redirects to the web OAuth flow
 */
export async function signInWithGoogleNative(): Promise<NativeAuthResult> {
  const inCapacitor = isCapacitorEnvironment();
  const hasGoogleAuth = isNativeGoogleAuthAvailable();
  const native = isNative();

  console.log('[GOOGLE_AUTH] signInWithGoogleNative called:', {
    isNative: native,
    inCapacitor,
    hasGoogleAuth,
    url: document.URL?.substring(0, 50)
  });

  // On web (not in Capacitor), just redirect to OAuth flow
  if (!native && !inCapacitor) {
    console.log('[GOOGLE_AUTH] Redirecting to web OAuth flow (not native/Capacitor)');
    window.location.href = '/api/auth/google';
    return { success: false, error: 'Redirecting to web OAuth' };
  }

  try {
    console.log('[GOOGLE_AUTH] Starting native sign-in via GoogleAuth.signIn()...');

    // Trigger native Google Sign-In dialog
    const result = await GoogleAuth.signIn();

    console.log('[GOOGLE_AUTH] Native sign-in successful:', {
      email: result.email,
      name: result.name || result.givenName,
    });

    // Send the ID token to backend for verification and session creation
    const response = await fetch(apiUrl('/api/auth/google/native'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idToken: result.authentication?.idToken,
        accessToken: result.authentication?.accessToken,
        email: result.email,
        name: result.name || `${result.givenName || ''} ${result.familyName || ''}`.trim(),
        givenName: result.givenName,
        familyName: result.familyName,
        imageUrl: result.imageUrl,
        id: result.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();

    console.log('[GOOGLE_AUTH] Backend verification successful');

    // Store the auth token for future API requests
    if (data.authToken) {
      await Preferences.set({
        key: AUTH_TOKEN_KEY,
        value: data.authToken,
      });
      console.log('[GOOGLE_AUTH] Auth token stored');
    }

    return {
      success: true,
      user: {
        id: data.user?.id || result.id,
        email: result.email,
        name: result.name || `${result.givenName || ''} ${result.familyName || ''}`.trim(),
        imageUrl: result.imageUrl,
      },
    };
  } catch (error: any) {
    console.error('[GOOGLE_AUTH] Native sign-in failed:', error);
    console.error('[GOOGLE_AUTH] Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    });

    // Check for user cancellation - don't fallback for intentional cancellation
    if (error.message?.includes('cancel') || error.code === 'SIGN_IN_CANCELLED') {
      console.log('[GOOGLE_AUTH] User cancelled sign-in');
      return { success: false, error: 'Sign-in cancelled by user' };
    }

    // Native auth failed - fallback to system browser OAuth
    // This handles cases where:
    // 1. Native plugin isn't configured properly
    // 2. Google Play Services isn't available
    // 3. SHA-1 fingerprint mismatch
    console.log('[GOOGLE_AUTH] Falling back to browser OAuth due to native failure...');
    return openBrowserAuth();
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogleNative(): Promise<void> {
  if (!isNative()) {
    return;
  }

  // Clear stored auth token
  try {
    const { value: token } = await Preferences.get({ key: AUTH_TOKEN_KEY });
    if (token) {
      // Invalidate token on server
      await fetch(apiUrl('/api/auth/native-logout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => {}); // Don't fail if server is unavailable
    }
    await Preferences.remove({ key: AUTH_TOKEN_KEY });
    console.log('[GOOGLE_AUTH] Auth token cleared');
  } catch (error) {
    console.error('[GOOGLE_AUTH] Failed to clear token:', error);
  }

  try {
    await GoogleAuth.signOut();
    console.log('[GOOGLE_AUTH] Signed out successfully');
  } catch (error) {
    console.error('[GOOGLE_AUTH] Sign-out failed:', error);
  }
}

/**
 * Refresh the Google access token
 */
export async function refreshGoogleAuth(): Promise<string | null> {
  if (!isNative()) {
    return null;
  }

  try {
    const result = await GoogleAuth.refresh();
    console.log('[GOOGLE_AUTH] Token refreshed');
    return result.accessToken || null;
  } catch (error) {
    console.error('[GOOGLE_AUTH] Token refresh failed:', error);
    return null;
  }
}

/**
 * Check if user is signed in with Google
 */
export async function isGoogleSignedIn(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    // Try to get current user silently
    await GoogleAuth.refresh();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the stored auth token for native app authentication
 */
export async function getStoredAuthToken(): Promise<string | null> {
  if (!isNative()) {
    return null;
  }

  try {
    const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
    return value;
  } catch (error) {
    console.error('[GOOGLE_AUTH] Failed to get stored token:', error);
    return null;
  }
}

/**
 * Clear the stored auth token (for logout)
 */
export async function clearStoredAuthToken(): Promise<void> {
  if (!isNative()) {
    return;
  }

  try {
    await Preferences.remove({ key: AUTH_TOKEN_KEY });
    console.log('[GOOGLE_AUTH] Stored token cleared');
  } catch (error) {
    console.error('[GOOGLE_AUTH] Failed to clear stored token:', error);
  }
}

export default {
  initializeGoogleAuth,
  signInWithGoogleNative,
  signOutGoogleNative,
  refreshGoogleAuth,
  isGoogleSignedIn,
  getStoredAuthToken,
  clearStoredAuthToken,
};
