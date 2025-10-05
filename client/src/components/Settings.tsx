import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Bell, 
  Calendar, 
  Settings as SettingsIcon, 
  Smartphone,
  Clock,
  Zap,
  Sun,
  Moon,
  Globe
} from 'lucide-react';

interface UserPreferences {
  theme?: string;
  notifications?: boolean;
  privacy?: 'public' | 'friends' | 'private';
  smartScheduler?: boolean;
  reminderFrequency?: 'high' | 'medium' | 'low';
  workingHours?: { start: string; end: string };
  timezone?: string;
  browserNotifications?: boolean;
}

interface SchedulingSuggestion {
  id: string;
  taskTitle: string;
  suggestedTime: string;
  priority: string;
  estimatedDuration: string;
  reasoning: string;
}

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

  // Get user preferences
  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    enabled: isAuthenticated,
  });

  // Get scheduling suggestions for selected date
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery<SchedulingSuggestion[]>({
    queryKey: ['/api/scheduling/suggestions', user?.id, selectedDate],
    enabled: isAuthenticated && !!user?.id,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (updates: Partial<UserPreferences>) => 
      apiRequest('PUT', '/api/user/preferences', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: () => 
      apiRequest('POST', `/api/scheduling/generate/${user?.id}/${selectedDate}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/suggestions', user?.id, selectedDate] });
      toast({
        title: "Schedule generated",
        description: "New scheduling suggestions have been created for the selected date.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check browser notification permission on load
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Request browser notification permission
  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "Browser notifications are not supported on this device.",
        variant: "destructive",
      });
      return;
    }

    if (enabled) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        updatePreferencesMutation.mutate({ browserNotifications: true });
        toast({
          title: "Notifications enabled",
          description: "You'll now receive browser notifications for important updates.",
        });
      } else {
        toast({
          title: "Permission denied",
          description: "Browser notifications were not enabled. You can enable them later in your browser settings.",
          variant: "destructive",
        });
      }
    } else {
      setBrowserNotificationsEnabled(false);
      updatePreferencesMutation.mutate({ browserNotifications: false });
      toast({
        title: "Notifications disabled",
        description: "Browser notifications have been turned off.",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-3 sm:p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <SettingsIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Please sign in to access your settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-2xl space-y-4 sm:space-y-6" data-testid="page-settings">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
      </div>

      {/* Notifications Settings */}
      <Card data-testid="card-notifications-settings">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1">
              <Smartphone className="w-4 h-4 text-muted-foreground mt-0.5 sm:mt-0 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Label htmlFor="browser-notifications" className="text-sm sm:text-base">
                  Browser
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Receive desktop notifications for important updates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-6 sm:ml-0">
              <Switch
                id="browser-notifications"
                checked={browserNotificationsEnabled}
                onCheckedChange={handleBrowserNotificationToggle}
                data-testid="switch-browser-notifications"
              />
              <span className="text-xs sm:text-sm font-medium">
                {browserNotificationsEnabled ? (
                  <span className="text-green-600 dark:text-green-400">Enable</span>
                ) : (
                  <span className="text-muted-foreground">Enable</span>
                )}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5 sm:mt-0 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Label htmlFor="general-notifications" className="text-sm sm:text-base">
                  General Notifications
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Task reminders, goal updates, and system notifications
                </p>
              </div>
            </div>
            <div className="ml-6 sm:ml-0">
              <Switch
                id="general-notifications"
                checked={preferences?.notifications ?? true}
                onCheckedChange={(checked) => 
                  updatePreferencesMutation.mutate({ notifications: checked })
                }
                data-testid="switch-general-notifications"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Scheduler Settings */}
      <Card data-testid="card-smart-scheduler">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Smart Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Label htmlFor="scheduler-date" className="text-sm sm:text-base">
                Generate suggestions for:
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Select a date to view or generate scheduling suggestions
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Input
              id="scheduler-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto"
              data-testid="input-scheduler-date"
            />
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span data-testid="text-suggestions-count">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <Button
            onClick={() => generateScheduleMutation.mutate()}
            disabled={generateScheduleMutation.isPending || suggestionsLoading}
            className="w-full"
            data-testid="button-generate-schedule"
          >
            <Zap className="w-4 h-4 mr-2" />
            {generateScheduleMutation.isPending ? 'Generating...' : 'Generate Schedule'}
          </Button>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="smart-scheduler-enabled" className="text-base">
                  Enable Smart Scheduler
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate task scheduling suggestions
                </p>
              </div>
            </div>
            <Switch
              id="smart-scheduler-enabled"
              checked={preferences?.smartScheduler ?? true}
              onCheckedChange={(checked) => 
                updatePreferencesMutation.mutate({ smartScheduler: checked })
              }
              data-testid="switch-smart-scheduler"
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card data-testid="card-additional-settings">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="privacy-setting" className="text-base">
                  Profile Privacy
                </Label>
                <p className="text-sm text-muted-foreground">
                  Control who can see your profile information
                </p>
              </div>
            </div>
            <select
              id="privacy-setting"
              value={preferences?.privacy || 'friends'}
              onChange={(e) => 
                updatePreferencesMutation.mutate({ 
                  privacy: e.target.value as 'public' | 'friends' | 'private' 
                })
              }
              className="px-3 py-2 border rounded-md bg-background text-sm"
              data-testid="select-privacy"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="reminder-frequency" className="text-base">
                  Reminder Frequency
                </Label>
                <p className="text-sm text-muted-foreground">
                  How often you'd like to receive task reminders
                </p>
              </div>
            </div>
            <select
              id="reminder-frequency"
              value={preferences?.reminderFrequency || 'medium'}
              onChange={(e) => 
                updatePreferencesMutation.mutate({ 
                  reminderFrequency: e.target.value as 'high' | 'medium' | 'low' 
                })
              }
              className="px-3 py-2 border rounded-md bg-background text-sm"
              data-testid="select-reminder-frequency"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}