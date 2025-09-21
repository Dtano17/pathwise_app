import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Clock, Settings, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type NotificationPreferences } from '@shared/schema';

interface NotificationManagerProps {
  userId: string;
}

export default function NotificationManager({ userId }: NotificationManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notifications/preferences', userId],
    staleTime: 60000, // 1 minute
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const response = await apiRequest('PATCH', '/api/notifications/preferences', updates);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences', userId] });
      toast({
        title: "Preferences Updated",
        description: "Your notification settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.response?.error || "Failed to update notification preferences.",
        variant: "destructive",
      });
    }
  });

  // Request browser notification permission
  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive browser notifications for your tasks!",
          });
          
          // Update preferences to enable notifications
          updatePreferencesMutation.mutate({ enableBrowserNotifications: true });
          
          // Send test notification
          new Notification('PathWise.ai', {
            body: 'Notifications are now enabled! You\'ll get reminders for your tasks.',
            icon: '/favicon.ico'
          });
        } else {
          toast({
            title: "Notifications Disabled",
            description: "You can enable notifications later in your browser settings.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast({
          title: "Permission Error",
          description: "Failed to request notification permission.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Browser Notification Permission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Get instant notifications for task reminders and deadlines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Notification Permission</p>
              <div className="flex items-center gap-2">
                {notificationPermission === 'granted' ? (
                  <Badge variant="default" className="gap-1">
                    <Bell className="w-3 h-3" />
                    Enabled
                  </Badge>
                ) : notificationPermission === 'denied' ? (
                  <Badge variant="destructive" className="gap-1">
                    <BellOff className="w-3 h-3" />
                    Blocked
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Not Set
                  </Badge>
                )}
              </div>
            </div>
            
            {notificationPermission !== 'granted' && (
              <Button 
                onClick={requestPermission} 
                variant="outline"
                disabled={notificationPermission === 'denied'}
                data-testid="button-enable-notifications"
              >
                {notificationPermission === 'denied' ? 'Blocked' : 'Enable'}
              </Button>
            )}
          </div>

          {notificationPermission === 'denied' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Notifications are blocked. To enable them, click the lock icon in your browser's address bar and allow notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Customize when and how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Task Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Get notified before tasks are due
                </p>
              </div>
              <Switch
                checked={preferences.enableTaskReminders}
                onCheckedChange={(checked) => handlePreferenceChange('enableTaskReminders', checked)}
                data-testid="switch-task-reminders"
              />
            </div>

            {/* Deadline Warnings */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Deadline Warnings</p>
                <p className="text-xs text-muted-foreground">
                  Get warned about approaching deadlines
                </p>
              </div>
              <Switch
                checked={preferences.enableDeadlineWarnings}
                onCheckedChange={(checked) => handlePreferenceChange('enableDeadlineWarnings', checked)}
                data-testid="switch-deadline-warnings"
              />
            </div>

            {/* Daily Planning */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Daily Planning Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Get daily reminders to plan your day
                </p>
              </div>
              <Switch
                checked={preferences.enableDailyPlanning}
                onCheckedChange={(checked) => handlePreferenceChange('enableDailyPlanning', checked)}
                data-testid="switch-daily-planning"
              />
            </div>

            {/* Reminder Lead Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-medium">Reminder Lead Time</p>
              </div>
              <p className="text-xs text-muted-foreground">
                How far in advance to send task reminders
              </p>
              <select
                value={preferences.reminderLeadTime}
                onChange={(e) => handlePreferenceChange('reminderLeadTime', parseInt(e.target.value))}
                className="w-full p-2 border border-input rounded-md bg-background text-sm"
                data-testid="select-reminder-lead-time"
              >
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={120}>2 hours before</option>
                <option value={240}>4 hours before</option>
              </select>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quiet Hours</p>
              <p className="text-xs text-muted-foreground">
                Don't send notifications during these hours
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Start</label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => handlePreferenceChange('quietHoursStart', e.target.value)}
                    className="w-full p-2 border border-input rounded-md bg-background text-sm"
                    data-testid="input-quiet-hours-start"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End</label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => handlePreferenceChange('quietHoursEnd', e.target.value)}
                    className="w-full p-2 border border-input rounded-md bg-background text-sm"
                    data-testid="input-quiet-hours-end"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}