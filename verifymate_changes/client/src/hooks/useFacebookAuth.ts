import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FacebookLoginStatus {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
  };
}

export function useFacebookAuth() {
  const [fbStatus, setFbStatus] = useState<FacebookLoginStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleFbStatusChange = async (event: CustomEvent) => {
      const response = event.detail as FacebookLoginStatus;
      setFbStatus(response);

      // If user is connected to Facebook and has authorized your app
      if (response.status === 'connected' && response.authResponse && !isProcessing) {
        setIsProcessing(true);
        
        try {
          // Check if this Facebook user already exists in your app
          const userResponse = await fetch('/api/auth/user', {
            credentials: 'include'
          });
          
          if (!userResponse.ok) {
            // User not logged into your app yet, redirect to Facebook OAuth
            console.log('Facebook user connected but not authenticated in app, redirecting...');
            window.location.href = '/api/auth/facebook';
          } else {
            // User is already authenticated
            console.log('User already authenticated in app');
            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          }
        } catch (error) {
          console.error('Error checking user authentication:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    // Listen for Facebook status changes
    window.addEventListener('fbStatusChange', handleFbStatusChange as EventListener);

    return () => {
      window.removeEventListener('fbStatusChange', handleFbStatusChange as EventListener);
    };
  }, [isProcessing, queryClient]);

  const loginWithFacebook = () => {
    if (window.FB) {
      window.FB.login((response: FacebookLoginStatus) => {
        if (response.status === 'connected') {
          // Redirect to your app's Facebook OAuth endpoint
          window.location.href = '/api/auth/facebook';
        }
      }, { scope: 'email,public_profile' });
    } else {
      // Fallback to direct OAuth redirect
      window.location.href = '/api/auth/facebook';
    }
  };

  const logoutFromFacebook = () => {
    if (window.FB) {
      window.FB.logout(() => {
        setFbStatus(null);
        // Also logout from your app
        window.location.href = '/api/logout';
      });
    }
  };

  return {
    fbStatus,
    isProcessing,
    loginWithFacebook,
    logoutFromFacebook,
  };
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    FB: any;
    fbLoginStatus: FacebookLoginStatus;
    checkLoginState: () => void;
    facebookLogin: () => void;
  }
}