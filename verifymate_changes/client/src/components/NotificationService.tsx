import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { type NotificationPreferences } from '@shared/schema';

interface NotificationServiceProps {
  userId: string;
}

export default function NotificationService({ userId }: NotificationServiceProps) {
  const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<Set<string>>(new Set());

  // Fetch notification preferences
  const { data: preferences } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notifications/preferences', userId],
    staleTime: 60000, // 1 minute
  });

  // Reminder checking service - runs globally regardless of tab
  useEffect(() => {
    const checkReminders = async () => {
      // Check if browser notifications are supported and granted
      if (!('Notification' in window) || Notification.permission !== 'granted' || !preferences) {
        return;
      }
      
      try {
        const response = await apiRequest('GET', '/api/notifications/reminders/pending');
        const pendingReminders = await response.json();
        
        const now = new Date();
        
        for (const reminder of pendingReminders) {
          const reminderTime = new Date(reminder.scheduledAt);
          const isTime = reminderTime <= now;
          const notAlreadySent = !lastCheckedRef.current.has(reminder.id);
          
          if (isTime && notAlreadySent) {
            // Check quiet hours
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeMinutes = currentHour * 60 + currentMinute;
            
            let skipQuietHours = false;
            if (preferences.quietHoursStart && preferences.quietHoursEnd) {
              const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
              const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              
              if (startMinutes > endMinutes) {
                // Quiet hours span midnight
                skipQuietHours = currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
              } else {
                skipQuietHours = currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
              }
            }
            
            // Check both browser notifications and task reminders are enabled
            if (!skipQuietHours && preferences.enableBrowserNotifications && preferences.enableTaskReminders) {
              new Notification(reminder.title || 'Task Reminder', {
                body: reminder.message || 'You have a task reminder',
                icon: '/favicon.ico',
                tag: reminder.id
              });
              
              // Mark as sent on the server
              await apiRequest('PATCH', `/api/notifications/reminders/${reminder.id}/sent`);
              
              // Track locally to avoid duplicates
              lastCheckedRef.current.add(reminder.id);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to check reminders:', error);
      }
    };

    // Only run reminder checking when notification permission is granted and preferences are loaded
    if (preferences && 'Notification' in window && Notification.permission === 'granted') {
      // Initial check after a short delay
      const initialTimeout = setTimeout(checkReminders, 5000); // 5 second delay
      
      // Set up interval to check every minute
      reminderIntervalRef.current = setInterval(checkReminders, 60000);
      
      return () => {
        clearTimeout(initialTimeout);
        if (reminderIntervalRef.current) {
          clearInterval(reminderIntervalRef.current);
          reminderIntervalRef.current = null;
        }
      };
    }

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [userId, preferences]);

  // This component only provides background service, no UI
  return null;
}