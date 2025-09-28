// Replit Auth integration - from blueprint:javascript_log_in_with_replit
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  authenticated?: boolean;
  isGuest?: boolean;
  username?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user from auth endpoint
  const {
    data: user,
    isLoading: isUserLoading,
    error
  } = useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error && isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const isAuthenticated = !!user && user.authenticated === true && !error;
  const isUnauthenticated = !user || user.authenticated === false || user.isGuest === true || (error && isUnauthorizedError(error as Error));

  // Login redirect
  const login = () => {
    window.location.href = '/api/login';
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () =>
      fetch('/api/logout', { method: 'POST' }).then(res => {
        if (!res.ok) throw new Error('Logout failed');
        return res.json();
      }),
    onSuccess: () => {
      // Clear all queries and redirect
      queryClient.clear();
      window.location.href = '/';
    }
  });

  const logout = () => logoutMutation.mutate();

  return {
    user,
    isAuthenticated,
    isUnauthenticated,
    isLoading: isUserLoading,
    login,
    logout,
    isLoggingOut: logoutMutation.isPending
  };
}