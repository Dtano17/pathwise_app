import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<TData, TVariables> {
  /**
   * The mutation function that updates the server.
   * Should include the expectedVersion in the request.
   */
  mutationFn: (variables: TVariables & { expectedVersion?: number }) => Promise<TData>;

  /**
   * Query keys to invalidate on successful update
   */
  invalidateKeys: (string | number)[][];

  /**
   * Optional callback when conflict is detected
   */
  onConflict?: (currentServerData: TData) => void;

  /**
   * Optional callback on success
   */
  onSuccess?: (data: TData) => void;

  /**
   * Optional callback on error
   */
  onError?: (error: Error) => void;
}

interface ConflictState<TData> {
  isConflict: boolean;
  serverData?: TData;
  localChanges?: any;
}

/**
 * Hook for performing optimistic updates with automatic conflict detection.
 *
 * Features:
 * - Automatically tracks version for optimistic locking
 * - Detects conflicts when server data has changed
 * - Provides conflict resolution UI state
 * - Handles query invalidation
 *
 * Usage:
 * ```typescript
 * const { mutate, conflict, resolveConflict, clearConflict } = useOptimisticUpdate({
 *   mutationFn: async (vars) => {
 *     const res = await fetch(`/api/tasks/${vars.taskId}`, {
 *       method: 'PUT',
 *       body: JSON.stringify({ ...vars.updates, expectedVersion: vars.expectedVersion }),
 *     });
 *     if (res.status === 409) {
 *       const conflict = await res.json();
 *       throw new ConflictError(conflict);
 *     }
 *     return res.json();
 *   },
 *   invalidateKeys: [['/api/tasks']],
 * });
 * ```
 */
export function useOptimisticUpdate<TData extends { version?: number }, TVariables>({
  mutationFn,
  invalidateKeys,
  onConflict,
  onSuccess,
  onError,
}: OptimisticUpdateOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [conflict, setConflict] = useState<ConflictState<TData>>({
    isConflict: false,
  });

  const mutation = useMutation({
    mutationFn: async (variables: TVariables & { expectedVersion?: number; localChanges?: any }) => {
      try {
        const data = await mutationFn(variables);
        return { data, conflict: false };
      } catch (error: any) {
        // Check if it's a conflict error (409 status)
        if (error.status === 409 || error.message?.includes('conflict')) {
          // Extract server data from error response
          const serverData = error.serverData || error.data?.currentActivity || error.data?.currentTask;
          setConflict({
            isConflict: true,
            serverData,
            localChanges: variables.localChanges,
          });

          // Call onConflict callback
          if (onConflict && serverData) {
            onConflict(serverData);
          }

          return { data: null, conflict: true, serverData };
        }

        // Not a conflict error - rethrow
        throw error;
      }
    },
    onSuccess: (result) => {
      if (!result.conflict && result.data) {
        // Invalidate relevant queries
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(result.data);
        }

        // Show success toast
        toast({
          title: 'Updated successfully',
          description: 'Your changes have been saved.',
        });
      }
    },
    onError: (error: Error) => {
      // Call onError callback
      if (onError) {
        onError(error);
      }

      // Show error toast
      toast({
        title: 'Update failed',
        description: error.message || 'An error occurred while updating.',
        variant: 'destructive',
      });
    },
  });

  /**
   * Resolve conflict by keeping local changes (force update)
   */
  const resolveConflictKeepLocal = (variables: TVariables) => {
    // Retry mutation without version check (force update)
    mutation.mutate({ ...variables, expectedVersion: undefined } as any);
    setConflict({ isConflict: false });
  };

  /**
   * Resolve conflict by using server version (discard local changes)
   */
  const resolveConflictUseServer = () => {
    // Just clear the conflict state and invalidate queries to refresh
    setConflict({ isConflict: false });
    invalidateKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    toast({
      title: 'Using server version',
      description: 'Your local changes have been discarded.',
    });
  };

  /**
   * Clear conflict state without resolving
   */
  const clearConflict = () => {
    setConflict({ isConflict: false });
  };

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    conflict,
    resolveConflictKeepLocal,
    resolveConflictUseServer,
    clearConflict,
  };
}

/**
 * Custom error class for conflict errors
 */
export class ConflictError extends Error {
  status = 409;
  serverData: any;

  constructor(data: any) {
    super('Conflict detected');
    this.name = 'ConflictError';
    this.serverData = data;
  }
}
