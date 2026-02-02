// Replit Auth integration - from blueprint:javascript_log_in_with_replit
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useRef } from "react";
import { initializeSocket, disconnectSocket, isSocketConnected } from "@/lib/socket";
import { initializePushNotifications, unregisterPushNotifications } from "@/lib/pushNotifications";
import { apiUrl, isNativePlatform, shouldUseNativeTokenAuth } from "@/lib/api";
import { isNative, isAndroid } from "@/lib/platform";
import { signInWithGoogleNative, signOutGoogleNative, getStoredAuthToken } from "@/lib/nativeGoogleAuth";
import { setBackgroundCredentials, clearBackgroundCredentials } from "@/lib/backgroundService";
import { Preferences } from "@capacitor/preferences";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  authenticated?: boolean;
  isGuest?: boolean;
  username?: string;
  subscriptionTier?: 'free' | 'pro' | 'family';
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Fetch user data using react-query
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      // For true Capacitor local apps, try token-based auth first
      // If no token, fall through to session-based auth (for web OAuth flows)
      if (shouldUseNativeTokenAuth()) {
        const authToken = await getStoredAuthToken();
        if (authToken) {
          console.log('[AUTH] Using token-based auth for Capacitor local app');
          // Verify token and get user info
          const res = await fetch(apiUrl('/api/auth/verify-token'), {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              return { ...data.user, authenticated: true };
            }
          }
          // Token invalid or expired - clear it and fall through to session auth
          console.log('[AUTH] Token invalid or expired, falling through to session auth');
        } else {
          console.log('[AUTH] No native token stored, falling through to session auth');
        }
        // Fall through to session-based auth below
      }

      // Web platform or Android WebView loading remote URL - use session cookie
      const res = await fetch(apiUrl('/api/user'), { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    retry: false,
    staleTime: 30 * 1000, // 30 seconds - much shorter for auth freshness
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always check auth on mount
  });

  // Clear cache when user authentication state changes (sign in/out)
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id || null;

    // If user ID changed (sign in or sign out occurred)
    if (prevUserIdRef.current !== currentUserId) {
      console.log('[AUTH] User authentication state changed, clearing cache');
      console.log(`  - Previous user ID: ${prevUserIdRef.current}`);
      console.log(`  - Current user ID: ${currentUserId}`);

      // Clear all caches to ensure fresh data for new user
      if (queryClient && prevUserIdRef.current !== null) {
        // Don't clear on initial mount (prevUserIdRef is null)
        // Only clear when switching between users or signing out
        queryClient.clear();
      }

      prevUserIdRef.current = currentUserId;
    }

    // Initialize or disconnect WebSocket based on authentication state
    if (currentUserId && user?.authenticated && !user?.isGuest) {
      // User is authenticated - initialize socket if not already connected
      if (!isSocketConnected()) {
        console.log('[AUTH] Initializing WebSocket for authenticated user:', currentUserId);
        initializeSocket(currentUserId);
      }

      // Initialize push notifications for authenticated user
      initializePushNotifications(currentUserId).catch(error => {
        console.error('[AUTH] Failed to initialize push notifications:', error);
      });

      // Store credentials for Android widget and background services
      // This enables the widget to fetch data using the userId
      if (isAndroid()) {
        // Store userId directly in Capacitor Preferences for widget access
        // The widget reads from CapacitorStorage SharedPreferences
        Preferences.set({ key: 'userId', value: currentUserId }).then(() => {
          console.log('[AUTH] userId stored in Capacitor Preferences for widget');
        }).catch(err => {
          console.warn('[AUTH] Failed to store userId in Preferences:', err);
        });

        // Also store in native SharedPreferences via BackgroundService plugin
        getStoredAuthToken().then(authToken => {
          if (authToken) {
            setBackgroundCredentials(currentUserId, authToken).then(success => {
              if (success) {
                console.log('[AUTH] Background credentials stored for widget');
              }
            }).catch(err => {
              console.warn('[AUTH] Failed to store background credentials:', err);
            });
          }
        }).catch(err => {
          console.warn('[AUTH] Failed to get auth token for widget:', err);
        });
      }
    } else {
      // User is not authenticated - disconnect socket
      console.log('[AUTH] User not authenticated, disconnecting WebSocket');
      disconnectSocket();

      // Unregister push notifications on logout
      unregisterPushNotifications().catch(error => {
        console.error('[AUTH] Failed to unregister push notifications:', error);
      });

      // Clear background credentials on logout
      if (isAndroid()) {
        Preferences.remove({ key: 'userId' }).catch(err => {
          console.warn('[AUTH] Failed to remove userId from Preferences:', err);
        });
        clearBackgroundCredentials().catch(err => {
          console.warn('[AUTH] Failed to clear background credentials:', err);
        });
      }
    }
  }, [user?.id, user?.authenticated, user?.isGuest, queryClient]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Sign out from native Google Auth if in Capacitor local app
      if (shouldUseNativeTokenAuth()) {
        await signOutGoogleNative();
      }
      // Call backend logout
      const res = await fetch(apiUrl('/api/logout'), { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Logout failed');
      return res.json();
    },
    onSuccess: () => {
      // Clear all queries and redirect
      if (queryClient) queryClient.clear();
      window.location.href = '/';
    }
  });

  // Helper functions
  const getUserDisplayName = (user: User | null | undefined): string => {
    if (!user) return 'Guest';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.username) return user.username;
    if (user.email) return user.email;
    return 'User';
  };

  const getUserInitials = (user: User | null | undefined): string => {
    if (!user) return 'G';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.username) return user.username[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const isAuthenticated = !!user && user.authenticated === true && !error;
  const isUnauthenticated = !user || user.authenticated === false || user.isGuest === true || (error && isUnauthorizedError(error as Error));

  // Login redirect - uses native Google Auth on Capacitor local apps, web OAuth otherwise
  const login = async () => {
    if (shouldUseNativeTokenAuth()) {
      // Use native Google sign-in for Capacitor local apps
      try {
        const result = await signInWithGoogleNative();
        if (result.success) {
          // Refetch user data after successful native sign-in
          await refetch();
          return;
        }
        // If native auth failed but didn't redirect, fall through to web auth
        console.log('[AUTH] Native auth returned:', result);
      } catch (error) {
        console.error('[AUTH] Native Google auth error:', error);
      }
    }
    // Web OAuth for both web and Android WebView loading remote URL
    window.location.href = apiUrl('/api/login');
  };

  // Google login - specifically for Google OAuth button
  const loginWithGoogle = async () => {
    console.log('[useAuth] loginWithGoogle called');
    console.log('[useAuth] shouldUseNativeTokenAuth():', shouldUseNativeTokenAuth());

    if (shouldUseNativeTokenAuth()) {
      // Use native Google sign-in for Capacitor local apps
      console.log('[useAuth] Using native token auth path');
      const result = await signInWithGoogleNative();
      if (result.success) {
        // Refetch user data after successful native sign-in
        await refetch();
        return result;
      }
      return result;
    }
    // Web OAuth for both web and Android WebView loading remote URL
    // Add mobile=true flag for Android WebView so server redirects via deep link
    // isNative() detects Android WebView via user agent even when loading remote URLs
    const isMobileWebView = isNative() && !shouldUseNativeTokenAuth();
    const mobileParam = isMobileWebView ? '?mobile=true' : '';
    const authUrl = apiUrl(`/api/auth/google${mobileParam}`);
    console.log('[useAuth] Redirecting to web OAuth:', authUrl, 'isMobileWebView:', isMobileWebView);
    window.location.href = authUrl;
    return { success: false, error: 'Redirecting to web OAuth' };
  };

  const logout = () => logoutMutation.mutate();

  return {
    // Core auth state
    user: user || null,
    isAuthenticated,
    isUnauthenticated,
    isLoading,
    error: error as Error | null,

    // Helper functions
    logout,
    login,
    loginWithGoogle, // Native Google auth on mobile, web OAuth on web
    refetch, // Expose refetch for manual auth refresh
    getUserDisplayName: () => getUserDisplayName(user),
    getUserInitials: () => getUserInitials(user),

    // Platform info
    isNativePlatform: isNativePlatform(),

    // Legacy compatibility (for existing code)
    isUserLoading: isLoading,
    isLoggingOut: logoutMutation.isPending,
  }
}
