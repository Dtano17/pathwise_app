import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getSocket, subscribeToEvent } from '@/lib/socket';

/**
 * Hook for real-time updates across ALL groups the user is in.
 * Subscribes to group events and invalidates relevant queries.
 *
 * Use this for the main groups page that shows all groups and activity.
 * For individual group pages, use useGroupRealtime(groupId) instead.
 */
export function useAllGroupsRealtime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socket = getSocket();

  useEffect(() => {
    // Don't subscribe if socket isn't connected
    if (!socket?.connected) {
      console.log('[ALL GROUPS REALTIME] Socket not connected, skipping subscription');
      return;
    }

    console.log('[ALL GROUPS REALTIME] Subscribing to all group events');

    // Subscribe to task completion events (from any group)
    const unsubTaskCompleted = subscribeToEvent('task:completed', (data) => {
      console.log('[ALL GROUPS REALTIME] Task completed:', data);

      // Show toast notification
      toast({
        title: "Task Completed",
        description: `${data.userName} completed "${data.taskTitle}"`,
        duration: 5000,
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/activity'] });
    });

    // Subscribe to member joined events (from any group)
    const unsubMemberJoined = subscribeToEvent('member:joined', (data) => {
      console.log('[ALL GROUPS REALTIME] Member joined:', data);

      // Show toast notification
      toast({
        title: "New Member",
        description: `${data.userName} joined a group`,
        duration: 5000,
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/activity'] });
    });

    // Subscribe to member left events (from any group)
    const unsubMemberLeft = subscribeToEvent('member:left', (data) => {
      console.log('[ALL GROUPS REALTIME] Member left:', data);

      // Show toast notification
      toast({
        title: "Member Left",
        description: `${data.userName} left a group`,
        duration: 5000,
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/activity'] });
    });

    // Subscribe to activity shared events (from any group)
    const unsubActivityShared = subscribeToEvent('activity:shared', (data) => {
      console.log('[ALL GROUPS REALTIME] Activity shared:', data);

      // Show toast notification
      toast({
        title: "New Activity",
        description: `${data.sharedBy} shared "${data.activityTitle}"`,
        duration: 5000,
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/activity'] });
    });

    // Subscribe to progress update events (from any group)
    const unsubProgressUpdate = subscribeToEvent('progress:update', (data) => {
      console.log('[ALL GROUPS REALTIME] Progress updated:', data);

      // Invalidate queries to refresh UI (no toast for progress updates)
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    });

    // Subscribe to generic notifications (from any group)
    const unsubNotification = subscribeToEvent('notification', (data) => {
      console.log('[ALL GROUPS REALTIME] Notification received:', data);

      // Show toast notification
      toast({
        title: data.title,
        description: data.body,
        duration: 5000,
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/activity'] });
    });

    // Cleanup function - unsubscribe from all events
    return () => {
      console.log('[ALL GROUPS REALTIME] Unsubscribing from all group events');
      unsubTaskCompleted();
      unsubMemberJoined();
      unsubMemberLeft();
      unsubActivityShared();
      unsubProgressUpdate();
      unsubNotification();
    };
  }, [socket, queryClient, toast]);
}
