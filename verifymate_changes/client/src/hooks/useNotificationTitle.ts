import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscribeToEvent } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

interface Notification {
  id: string;
  readAt: string | null;
}

/**
 * Hook to update the browser tab title with unread notification count
 * Example: "(3) JournalMate" when there are 3 unread notifications
 */
export function useNotificationTitle() {
  const { data: notificationsData } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['/api/user/notifications'],
    refetchInterval: false, // No polling - use WebSocket instead
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.readAt).length;

  // Subscribe to real-time notification events to trigger title update
  useEffect(() => {
    const unsubscribe = subscribeToEvent('notification', () => {
      // Invalidate query to refetch notifications and update title
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
    });

    return () => unsubscribe();
  }, []);

  // Update document title when unread count changes
  useEffect(() => {
    const baseTitle = 'JournalMate';

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    // Cleanup: Reset title when component unmounts
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);
}
