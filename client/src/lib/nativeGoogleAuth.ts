/**
 * Native Google Authentication for Capacitor
 *
 * Provides native Google Sign-In on iOS/Android to bypass WebView restrictions.
 * Falls back to web OAuth on non-native platforms.
 *
 * This solves the "Error 403: disallowed_useragent" issue that occurs when
 * trying to use Google OAuth inside a WebView.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { apiUrl } from './api';
import { GoogleAuth as GoogleAuthStub } from './capacitor-google-auth-stub';

// Storage key for auth token
const AUTH_TOKEN_KEY = 'journalmate_auth_token';

// Use stub by default, will be replaced with real module on native
let GoogleAuth: any = GoogleAuthStub;
let isNativeModuleLoaded = false;

async function getGoogleAuth() {
  if (isNativeModuleLoaded) return GoogleAuth;

  if (Capacitor.isNativePlatform()) {
    try {
      // On native platforms, dynamically import the real plugin
      // This works because Capacitor bundles the native plugin with the app
      console.log('[GOOGLE_AUTH] Loading native module...');
      // Use variable to prevent Vite from pre-analyzing this import
      const moduleName = '@southdevs/capacitor-google-auth';
      const module = await import(/* @vite-ignore */ moduleName);
      GoogleAuth = module.GoogleAuth;
      isNativeModuleLoaded = true;
      console.log('[GOOGLE_AUTH] Native module loaded successfully');
      return GoogleAuth;
    } catch (error) {
      console.error('[GOOGLE_AUTH] Failed to load native module:', error);
      // Fall back to stub
      isNativeModuleLoaded = true;
      return GoogleAuthStub;
    }
  }
  return GoogleAuthStub;
}

export interface NativeAuthResult {
  success: boolean;
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
 */
export async function initializeGoogleAuth(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[GOOGLE_AUTH] Skipping initialization on web platform');
    return;
  }

  const auth = await getGoogleAuth();
  if (!auth) return;

  try {
    await auth.initialize({
      clientId: '', // Will use the one from capacitor.config.ts
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('[GOOGLE_AUTH] Initialized successfully');
  } catch (error) {
    console.error('[GOOGLE_AUTH] Initialization failed:', error);
  }
}

/**
 * Sign in with Google using native dialog
 * On native platforms, uses native Google Sign-In
 * On web, redirects to the web OAuth flow
 */
export async function signInWithGoogleNative(): Promise<NativeAuthResult> {
  // Fallback to web OAuth on non-native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('[GOOGLE_AUTH] Redirecting to web OAuth flow');
    window.location.href = '/api/auth/google';
    return { success: false, error: 'Redirecting to web OAuth' };
  }

  const auth = await getGoogleAuth();
  if (!auth) {
    return { success: false, error: 'Native Google Auth not available' };
  }

  try {
    console.log('[GOOGLE_AUTH] Starting native sign-in...');

    // Trigger native Google Sign-In dialog
    const result = await auth.signIn();

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
    console.error('[GOOGLE_AUTH] Sign-in failed:', error);

    // Check for user cancellation
    if (error.message?.includes('cancel') || error.code === 'SIGN_IN_CANCELLED') {
      return { success: false, error: 'Sign-in cancelled by user' };
    }

    return { success: false, error: error.message || 'Failed to sign in with Google' };
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogleNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
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

  const auth = await getGoogleAuth();
  if (!auth) return;

  try {
    await auth.signOut();
    console.log('[GOOGLE_AUTH] Signed out successfully');
  } catch (error) {
    console.error('[GOOGLE_AUTH] Sign-out failed:', error);
  }
}

/**
 * Refresh the Google access token
 */
export async function refreshGoogleAuth(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const auth = await getGoogleAuth();
  if (!auth) return null;

  try {
    const result = await auth.refresh();
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
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const auth = await getGoogleAuth();
  if (!auth) return false;

  try {
    // Try to get current user silently
    await auth.refresh();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the stored auth token for native app authentication
 */
export async function getStoredAuthToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
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
  if (!Capacitor.isNativePlatform()) {
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
