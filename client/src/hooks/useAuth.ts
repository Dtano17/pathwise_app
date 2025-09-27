// Replit Auth integration - from blueprint:javascript_log_in_with_replit
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
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

  const isAuthenticated = !!user && !error;
  const isUnauthenticated = !user && error && isUnauthorizedError(error as Error);

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
    onSuccess: (data) => {
      console.log('Logout successful, server response:', data);
      // Clear all queries
      queryClient.clear();
      
      // Always perform hard reload when logging out to ensure clean state
      console.log('Performing hard reload after logout');
      window.location.reload();
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