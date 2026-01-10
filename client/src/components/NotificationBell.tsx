import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { subscribeToEvent } from '@/lib/socket';
import { hapticsLight, hapticsMedium, hapticsSuccess, hapticsSwipe } from '@/lib/haptics';
import { isNative } from '@/lib/platform';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface Notification {
  id: string;
  userId: string;
  sourceGroupId: string | null;
  actorUserId: string | null;
  type: string;
  title: string;
  body: string | null;
  metadata: {
    activityTitle?: string;
    viaShareLink?: boolean;
    groupName?: string;
    [key: string]: any;
  };
  createdAt: string;
  readAt: string | null;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const prevUnreadCountRef = useRef<number>(0);
  // Track notifications being dismissed (for animation)
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  // Fetch notifications
  const { data: notificationsData } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['/api/user/notifications'],
    refetchInterval: false, // No polling - use WebSocket instead
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.readAt).length;

  // Haptic feedback when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current >= 0) {
      // New notification arrived - trigger haptic
      if (isNative()) {
        hapticsMedium();
      }
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Subscribe to real-time notification events
  useEffect(() => {
    const unsubscribe = subscribeToEvent('notification', async (data: any) => {
      // Haptic feedback for real-time notifications
      if (isNative()) {
        // Different haptic based on notification type
        if (data?.type === 'member_joined' || data?.type === 'invite_accepted') {
          await hapticsSuccess();
        } else {
          await hapticsMedium();
        }
      }
      // Invalidate query to refetch notifications
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
    });

    return () => unsubscribe();
  }, []);

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('PATCH', `/api/user/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
    },
  });

  // Handle marking as read with animation
  const handleMarkRead = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isNative()) {
      await hapticsLight();
    }

    // Start dismiss animation
    setDismissingIds(prev => new Set([...Array.from(prev), notificationId]));

    // Mark as read
    markReadMutation.mutate(notificationId);

    // Remove from dismissing after animation completes
    setTimeout(() => {
      setDismissingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 300);
  };

  // Handle swipe to dismiss
  const handleDragEnd = async (notificationId: string, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      // Swiped far enough - dismiss
      if (isNative()) {
        await hapticsSwipe();
      }
      handleMarkRead(notificationId);
    }
  };

  // Filter out notifications that are being dismissed for smoother animation
  const visibleNotifications = notifications.filter(n => {
    // Show if not read, or if read but not being dismissed
    if (!n.readAt) return true;
    return !dismissingIds.has(n.id);
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} unread · Swipe to dismiss
            </p>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {visibleNotifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden">
              <AnimatePresence>
                {visibleNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    drag={!notification.readAt ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => handleDragEnd(notification.id, info)}
                    className={`relative ${
                      dismissingIds.has(notification.id) ? 'pointer-events-none' : ''
                    }`}
                  >
                    <motion.div
                      animate={dismissingIds.has(notification.id) ? { x: 300, opacity: 0 } : { x: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 hover:bg-accent/50 transition-colors ${
                        !notification.readAt ? 'bg-accent/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">
                              {notification.title}
                            </p>
                            {!notification.readAt && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          {notification.body && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {!notification.readAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 h-6 w-6"
                            onClick={(e) => handleMarkRead(notification.id, e)}
                            aria-label="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
