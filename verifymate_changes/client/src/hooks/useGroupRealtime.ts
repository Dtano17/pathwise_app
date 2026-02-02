import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToEvent, getSocket, joinGroupRoom, leaveGroupRoom } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

export function useGroupRealtime(groupId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socket = getSocket();

  useEffect(() => {
    // Only subscribe if we have a groupId and socket is connected
    if (!groupId || !socket?.connected) {
      return;
    }

    console.log('[REALTIME] Setting up real-time listeners for group:', groupId);

    // Join group room
    joinGroupRoom(groupId);

    // Subscribe to task completion events
    const unsubTaskCompleted = subscribeToEvent('task:completed', (data) => {
      console.log('[REALTIME] Task completed:', data);

      // Show toast notification
      toast({
        title: "Task Completed",
        description: `${data.userName} completed "${data.taskTitle}"`,
        duration: 3000,
      });

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'activities'] });
    });

    // Subscribe to member joined events
    const unsubMemberJoined = subscribeToEvent('member:joined', (data) => {
      console.log('[REALTIME] Member joined:', data);

      toast({
        title: "New Member",
        description: `${data.userName} joined the group`,
        duration: 3000,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'feed'] });
    });

    // Subscribe to member left events
    const unsubMemberLeft = subscribeToEvent('member:left', (data) => {
      console.log('[REALTIME] Member left:', data);

      toast({
        title: "Member Left",
        description: `${data.userName} left the group`,
        duration: 3000,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'feed'] });
    });

    // Subscribe to activity shared events
    const unsubActivityShared = subscribeToEvent('activity:shared', (data) => {
      console.log('[REALTIME] Activity shared:', data);

      toast({
        title: "Activity Shared",
        description: `${data.sharedBy} shared "${data.activityTitle}"`,
        duration: 3000,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'feed'] });
    });

    // Subscribe to progress update events (silent - no toast)
    const unsubProgressUpdate = subscribeToEvent('progress:update', (data) => {
      console.log('[REALTIME] Progress updated:', data);

      // Update progress data immediately without refetching
      queryClient.setQueryData(['/api/groups', groupId, 'progress'], data);
    });

    // Subscribe to generic notifications
    const unsubNotification = subscribeToEvent('notification', (data) => {
      console.log('[REALTIME] Notification:', data);

      toast({
        title: data.title,
        description: data.body,
        duration: 4000,
      });

      // Invalidate relevant queries based on notification type
      if (data.type === 'group_progress_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'progress'] });
      }
    });

    // Cleanup function - unsubscribe from all events and leave group room
    return () => {
      console.log('[REALTIME] Cleaning up real-time listeners for group:', groupId);

      leaveGroupRoom(groupId);

      // Unsubscribe from all events
      unsubTaskCompleted();
      unsubMemberJoined();
      unsubMemberLeft();
      unsubActivityShared();
      unsubProgressUpdate();
      unsubNotification();
    };
  }, [groupId, socket, queryClient, toast]);
}
