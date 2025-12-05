import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

export function AuthHandler() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check for auth success/error in URL params
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const provider = params.get('provider');

    if (authStatus === 'success') {
      // Clean up URL params first
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      // Invalidate all user-related queries to force fresh fetch
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.clear(); // Clear all cached data
      
      toast({
        title: "Welcome!",
        description: `Successfully signed in${provider ? ` with ${formatProvider(provider)}` : ''}.`,
      });
      
      // Use a short delay then reload to ensure session is ready
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
