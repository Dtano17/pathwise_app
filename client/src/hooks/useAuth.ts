// Replit Auth integration - from blueprint:javascript_log_in_with_replit
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useRef } from "react";

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
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await fetch('/api/user');
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
  }, [user?.id, queryClient]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () =>
      fetch('/api/logout', { method: 'POST' }).then(res => {
        if (!res.ok) throw new Error('Logout failed');
        return res.json();
      }),
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

  // Login redirect
  const login = () => {
    window.location.href = '/api/login';
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
    getUserDisplayName: () => getUserDisplayName(user),
    getUserInitials: () => getUserInitials(user),

    // Legacy compatibility (for existing code)
    isUserLoading: isLoading,
    isLoggingOut: logoutMutation.isPending,
  }
}
