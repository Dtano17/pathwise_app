import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { App } from '@capacitor/app';
import { isNative, isAndroid } from '@/lib/platform';
import { apiUrl } from '@/lib/api';

export function AuthHandler() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const hasProcessedToken = useRef(false);

  /**
   * Exchange auth token for session - handles OAuth deep link callback
   */
  const exchangeTokenForSession = async (token: string) => {
    // Prevent duplicate processing
    if (hasProcessedToken.current) {
      console.log('[AuthHandler] Token already processed, skipping');
      return;
    }
    hasProcessedToken.current = true;

    console.log('[AuthHandler] Exchanging auth token for session...');

    try {
      const response = await fetch(apiUrl('/api/auth/mobile-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        console.log('[AuthHandler] Token exchange successful');
        toast({
          title: "Welcome!",
          description: "Successfully signed in.",
        });
        // Clean up URL and reload to show authenticated state
        window.history.replaceState({}, '', '/');
        window.location.reload();
      } else {
        console.error('[AuthHandler] Token exchange failed:', data.error);
        hasProcessedToken.current = false; // Allow retry
        toast({
          title: "Sign In Failed",
          description: data.error || "Authentication failed. Please try again.",
          variant: "destructive"
        });
        window.history.replaceState({}, '', '/');
      }
    } catch (err) {
      console.error('[AuthHandler] Token exchange error:', err);
      hasProcessedToken.current = false; // Allow retry
      toast({
        title: "Sign In Failed",
        description: "Authentication failed. Please try again.",
        variant: "destructive"
      });
      window.history.replaceState({}, '', '/');
    }
  };

  // Handle URL-based auth params (web OAuth flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const provider = params.get('provider');

    // Handle mobile deep link token exchange (journalmate://auth?token=xxx)
    // This handles the case where the token is in the URL params (web redirect)
    const token = params.get('token');
    if (token) {
      exchangeTokenForSession(token);
      return;
    }

    if (authStatus === 'success') {
      toast({
        title: "Welcome!",
        description: `Successfully signed in${provider ? ` with ${formatProvider(provider)}` : ''}.`,
      });

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      window.location.reload();
    } else if (authStatus === 'error') {
      const errorMessage = getErrorMessage(provider);
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive"
      });

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [toast]);

  // Listen for deep link OAuth callbacks
  // This must run even when isNative() returns false because Android WebView
  // loading remote URLs still receives deep links via MainActivity.java
  useEffect(() => {
    // Check if we're on Android (even if isNative() returns false)
    const isAndroidUA = typeof navigator !== 'undefined' &&
                        navigator.userAgent.toLowerCase().includes('android');

    // Only set up listeners on Android or when isNative() is true
    if (!isNative() && !isAndroidUA) return;

    console.log('[AuthHandler] Setting up deep link listeners for OAuth (isNative:', isNative(), 'isAndroidUA:', isAndroidUA, ')...');

    /**
     * Parse auth token from deep link URL
     */
    const extractTokenFromUrl = (url: string): string | null => {
      if (!url.startsWith('journalmate://auth')) return null;

      const queryStart = url.indexOf('?');
      if (queryStart === -1) return null;

      const queryString = url.substring(queryStart + 1);
      const params = new URLSearchParams(queryString);
      return params.get('token');
    };

    // Check for COLD START - app was launched via deep link
    // This handles the case where app was killed and user clicked OAuth deep link
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[AuthHandler] Cold start - app launched with URL:', result.url);
        const token = extractTokenFromUrl(result.url);
        if (token) {
          console.log('[AuthHandler] OAuth token found in launch URL');
          exchangeTokenForSession(token);
        }
      }
    }).catch(err => {
      console.error('[AuthHandler] Failed to get launch URL:', err);
    });

    // Listen for custom event dispatched from Android MainActivity
    // This handles: journalmate://auth?token=xxx when app is already running (HOT START)
    const handleAuthDeepLink = (event: CustomEvent<{ token: string }>) => {
      console.log('[AuthHandler] Received authDeepLink event (hot start)');
      const token = event.detail?.token;
      if (token) {
        exchangeTokenForSession(token);
      }
    };

    window.addEventListener('authDeepLink', handleAuthDeepLink as EventListener);

    // Listen for Capacitor App URL open events (handles both iOS and Android)
    // This fires when app is resumed with a deep link
    let appUrlListener: { remove: () => void } | null = null;

    App.addListener('appUrlOpen', (data: { url: string }) => {
      console.log('[AuthHandler] App URL opened (hot start):', data.url);
      const token = extractTokenFromUrl(data.url);
      if (token) {
        console.log('[AuthHandler] OAuth token found in deep link URL');
        exchangeTokenForSession(token);
      }
    }).then(listener => {
      appUrlListener = listener;
    }).catch(err => {
      console.error('[AuthHandler] Failed to add appUrlOpen listener:', err);
    });

    return () => {
      window.removeEventListener('authDeepLink', handleAuthDeepLink as EventListener);
      if (appUrlListener) {
        appUrlListener.remove();
      }
    };
  }, []);

  return null;
}

function formatProvider(provider: string): string {
  const providers: Record<string, string> = {
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
    instagram: 'Instagram',
    replit: 'Replit'
  };
  return providers[provider.toLowerCase()] || provider;
}

function getErrorMessage(provider: string | null): string {
  if (!provider) {
    return 'Authentication failed. Please try again.';
  }

  const messages: Record<string, string> = {
    google: 'Failed to sign in with Google. Please check your Google account settings and try again.',
    facebook: 'Failed to sign in with Facebook. Please make sure you have granted the necessary permissions.',
    apple: 'Failed to sign in with Apple. Please try again.',
    instagram: 'Failed to sign in with Instagram. Please try again.',
    replit: 'Failed to sign in with Replit. Please try again.'
  };

  return messages[provider.toLowerCase()] || `Failed to sign in with ${formatProvider(provider)}. Please try again.`;
}
