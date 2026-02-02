import { useEffect, useState } from 'react';

/**
 * Mobile OAuth Callback Page
 *
 * This page handles the OAuth callback for mobile apps.
 * When the server redirects here after successful OAuth, this page:
 * 1. Attempts to open the app via deep link (journalmate://auth?token=xxx)
 * 2. Falls back to URL-based token passing for WebView apps
 *
 * This intermediate page is necessary because Chrome doesn't reliably
 * handle direct redirects to custom URL schemes (journalmate://).
 */
export default function MobileAuthCallback() {
  const [status, setStatus] = useState<'redirecting' | 'fallback' | 'error'>('redirecting');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      console.error('[MobileAuthCallback] No token found in URL');
      setStatus('error');
      return;
    }

    console.log('[MobileAuthCallback] Token received, attempting deep link...');

    // Strategy 1: Try to open the app via deep link
    // This works for native apps that have registered the journalmate:// scheme
    const deepLinkUrl = `journalmate://auth?token=${token}`;

    // On Android, use Intent URL format which is more reliable for launching apps
    // This tells Chrome to launch the app directly without security restrictions
    const isAndroid = /android/i.test(navigator.userAgent);
    const intentUrl = isAndroid
      ? `intent://auth?token=${token}#Intent;scheme=journalmate;package=ai.journalmate.app;end`
      : deepLinkUrl;

    console.log('[MobileAuthCallback] Using URL:', isAndroid ? 'Intent URL' : 'Deep Link URL');

    // Try the Intent URL first on Android (most reliable)
    if (isAndroid) {
      window.location.href = intentUrl;
    }

    // Create a hidden iframe to trigger the deep link as backup
    // This is more reliable than window.location for custom schemes on iOS
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deepLinkUrl;
    document.body.appendChild(iframe);

    // Also try window.location as a backup (with slight delay)
    const locationTimer = setTimeout(() => {
      try {
        window.location.href = deepLinkUrl;
      } catch (e) {
        console.log('[MobileAuthCallback] window.location deep link failed:', e);
      }
    }, 100);

    // Strategy 2: If deep link doesn't work (we're still on this page after timeout),
    // the WebView is likely showing this page directly. In that case, redirect to
    // the main app with the token in the URL - AuthHandler.tsx will process it.
    const fallbackTimer = setTimeout(() => {
      console.log('[MobileAuthCallback] Deep link may not have worked, using URL fallback');
      setStatus('fallback');

      // Clean up iframe
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

      // Redirect to home with token - AuthHandler will pick it up
      window.location.href = `/?token=${token}`;
    }, 1500);

    return () => {
      clearTimeout(locationTimer);
      clearTimeout(fallbackTimer);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-6 max-w-md">
        {status === 'redirecting' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold mb-2">Completing Sign In...</h1>
            <p className="text-muted-foreground">
              Redirecting you back to the app...
            </p>
          </>
        )}

        {status === 'fallback' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold mb-2">Almost there...</h1>
            <p className="text-muted-foreground">
              Finalizing authentication...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-4xl mb-4">!</div>
            <h1 className="text-xl font-semibold mb-2">Authentication Error</h1>
            <p className="text-muted-foreground mb-4">
              No authentication token found. Please try signing in again.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
