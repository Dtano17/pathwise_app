import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { isNative, isAndroid } from '@/lib/platform';
import {
  requestNotificationPermission,
  checkNotificationPermission,
  showLocalNotification
} from '@/lib/notifications';
import {
  requestContactsPermission,
  getContacts,
  syncContactsWithServer
} from '@/lib/contacts';
import {
  requestCalendarPermission,
  addActivityToCalendar,
  openCalendarApp
} from '@/lib/calendar';
import {
  Bell,
  Calendar,
  Settings as SettingsIcon,
  Smartphone,
  Clock,
  Zap,
  Sun,
  Moon,
  Globe,
  CreditCard,
  Crown,
  BookmarkCheck,
  Loader2,
  Users,
  CalendarPlus,
  LayoutGrid
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

interface SubscriptionStatus {
  tier: string;
  status: string;
  planCount?: number;
  planLimit?: number;
}

interface SettingsProps {
  onOpenUpgradeModal?: (trigger: 'planLimit' | 'favorites' | 'export' | 'insights') => void;
}

export default function Settings({ onOpenUpgradeModal }: SettingsProps = {}) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

  // Mobile integrations state
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default'>('default');

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

  // Get subscription status
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: isAuthenticated,
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

  // Check notification permission on load (both browser and native)
  useEffect(() => {
    if (isNative()) {
      // Check native push notification permission
      checkNotificationPermission().then(result => {
        setNotificationStatus(result.granted ? 'granted' : 'default');
      }).catch(() => {
        setNotificationStatus('default');
      });
    } else if ('Notification' in window) {
      // Check browser notification permission
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Tier display label mapping
  const getTierLabel = (tier: string | undefined) => {
    if (!tier || tier === 'free') return 'Free';
    if (tier === 'pro') return 'Pro';
    if (tier === 'family') return 'Family & Friends';
    return tier;
  };

  // Open Stripe Customer Portal (for paid users) or Upgrade Modal (for free users)
  const handleManageSubscription = async () => {
    // Guard against undefined during loading - treat as free user by default
    if (!subscriptionStatus || subscriptionStatus.tier === 'free') {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('planLimit');
      } else {
        toast({
          title: "Upgrade Available",
          description: "Unlock unlimited AI plans and premium features",
        });
      }
      return;
    }

    // Paid users: open Stripe Customer Portal
    try {
      const response = await apiRequest('POST', '/api/subscription/portal');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    }
  };

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

  // Mobile integration handlers
  const handleEnableNotifications = async () => {
    setNotificationLoading(true);
    try {
      const result = await requestNotificationPermission();
      setNotificationStatus(result.granted ? 'granted' : 'denied');
      toast({
        title: result.granted ? 'Notifications Enabled' : 'Permission Denied',
        description: result.granted
          ? 'You will receive push notifications'
          : 'Please enable notifications in device settings',
        variant: result.granted ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive'
      });
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showLocalNotification({
        title: 'Test Notification',
        body: 'Push notifications are working!',
        id: Date.now()
      });
      toast({ title: 'Notification Sent', description: 'Check your notification shade' });
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Could not send test notification',
        variant: 'destructive'
      });
    }
  };

  const handleSyncContacts = async () => {
    setContactsLoading(true);
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        toast({
          title: 'Permission Required',
          description: 'Please grant contacts access',
          variant: 'destructive'
        });
        setContactsLoading(false);
        return;
      }

      const contacts = await getContacts();
      const result = await syncContactsWithServer(contacts);

      toast({
        title: 'Contacts Synced',
        description: `Synced ${result.syncedCount} contacts`
      });
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync contacts',
        variant: 'destructive'
      });
    } finally {
      setContactsLoading(false);
    }
  };

  const handleTestCalendar = async () => {
    setCalendarLoading(true);
    try {
      const permission = await requestCalendarPermission();
      if (!permission.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please grant calendar access',
          variant: 'destructive'
        });
        setCalendarLoading(false);
        return;
      }

      const result = await addActivityToCalendar({
        title: 'JournalMate Test Event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        notes: 'This is a test event from JournalMate'
      });

      toast({
        title: result.success ? 'Event Added' : 'Failed',
        description: result.success
          ? 'Test event added to your calendar'
          : result.error || 'Failed to add event',
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error: any) {
      toast({
        title: 'Calendar Error',
        description: error.message || 'Failed to test calendar',
        variant: 'destructive'
      });
    } finally {
      setCalendarLoading(false);
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

      {/* Subscription Management */}
      <Card data-testid="card-subscription">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1">
              <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5 sm:mt-0 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Label className="text-sm sm:text-base font-medium">
                  Current Plan: <span className="text-purple-600 dark:text-purple-400">
                    {getTierLabel(subscriptionStatus?.tier)}
                  </span>
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {subscriptionStatus?.tier === 'free' 
                    ? `${subscriptionStatus?.planCount || 0} of ${subscriptionStatus?.planLimit || 5} AI plans used this month`
                    : subscriptionStatus?.tier === 'pro'
                    ? 'Unlimited AI plans, smart favorites, insights & export'
                    : 'All Pro features + up to 5 users, collaborative planning'
                  }
                </p>
              </div>
            </div>
          </div>

          {subscriptionStatus?.tier !== 'free' && subscriptionStatus?.status && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Status</Label>
                  <p className="text-xs text-muted-foreground capitalize">
                    {subscriptionStatus.status}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <Button
            onClick={handleManageSubscription}
            variant="outline"
            className="w-full"
            data-testid="button-manage-subscription"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {subscriptionStatus?.tier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
          </Button>
          
          {subscriptionStatus?.tier === 'free' && (
            <p className="text-xs text-center text-muted-foreground">
              Unlock unlimited AI plans, smart favorites, and more
            </p>
          )}
        </CardContent>
      </Card>

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
                  {isNative() ? 'Push' : 'Browser'}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isNative()
                    ? 'Receive push notifications on your device'
                    : 'Receive desktop notifications for important updates'}
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

      {/* Mobile Integrations - Only show on native mobile */}
      {isNative() && (
        <Card data-testid="card-mobile-integrations">
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              Mobile Integrations
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Test and manage native mobile features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-3 sm:p-6">

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  {notificationStatus === 'granted' ? 'Enabled' : 'Not enabled'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnableNotifications}
                  disabled={notificationLoading || notificationStatus === 'granted'}
                >
                  {notificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable'}
                </Button>
                {notificationStatus === 'granted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestNotification}
                  >
                    Test
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Contacts Sync */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contacts Sync
                </Label>
                <p className="text-xs text-muted-foreground">
                  Import contacts to share goals
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncContacts}
                disabled={contactsLoading}
              >
                {contactsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync'}
              </Button>
            </div>

            <Separator />

            {/* Calendar Integration */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4" />
                  Calendar Integration
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add activities to your calendar
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestCalendar}
                  disabled={calendarLoading}
                >
                  {calendarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCalendarApp()}
                >
                  Open
                </Button>
              </div>
            </div>

            {/* Widget Info (Android only) */}
            {isAndroid() && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      Home Screen Widget
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Long-press home screen → Widgets → JournalMate
                    </p>
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
              </>
            )}

          </CardContent>
        </Card>
      )}

    </div>
  );
}