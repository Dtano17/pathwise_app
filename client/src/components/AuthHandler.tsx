import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export function AuthHandler() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check for auth success/error in URL params
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const provider = params.get('provider');

    // Handle mobile deep link token exchange (journalmate://auth?token=xxx)
    const token = params.get('token');
    if (token) {
      console.log('[AuthHandler] Found auth token, exchanging for session...');

      // Exchange token for session
      fetch('/api/auth/mobile-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include'
      })
      .then(res => res.json())
      .then(data => {
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
          toast({
            title: "Sign In Failed",
            description: data.error || "Authentication failed. Please try again.",
            variant: "destructive"
          });
          window.history.replaceState({}, '', '/');
        }
      })
      .catch(err => {
        console.error('[AuthHandler] Token exchange error:', err);
        toast({
          title: "Sign In Failed",
          description: "Authentication failed. Please try again.",
          variant: "destructive"
        });
        window.history.replaceState({}, '', '/');
      });

      return; // Don't process other auth params
    }

    if (authStatus === 'success') {
      toast({
        title: "Welcome!",
        description: `Successfully signed in${provider ? ` with ${formatProvider(provider)}` : ''}.`,
      });
      
      // Clean up URL params
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      // Refresh the page to load authenticated state
      window.location.reload();
    } else if (authStatus === 'error') {
      const errorMessage = getErrorMessage(provider);
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Clean up URL params
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [toast]);

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
