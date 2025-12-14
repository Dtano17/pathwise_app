import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Target, Heart, Sparkles, Briefcase, TrendingUp, BookOpen, Mountain, Dumbbell, Activity, LogIn, LogOut, User, Settings, Bell, Calendar, ChevronDown, ChevronRight, History, Clock, BarChart3, Users, MessageSquare, Brain, Zap, Moon, LineChart, Mail, CheckSquare, Globe2, Plug, SettingsIcon, Newspaper, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SocialLogin } from '@/components/SocialLogin';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import NotificationManager from '@/components/NotificationManager';
import SmartScheduler from '@/components/SmartScheduler';
import { ProBadge } from '@/components/ProBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const themes = [
  { id: 'work', name: 'Work Focus', icon: Briefcase, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { id: 'investment', name: 'Investment', icon: TrendingUp, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { id: 'spiritual', name: 'Spiritual', icon: BookOpen, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { id: 'romance', name: 'Romance', icon: Heart, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { id: 'adventure', name: 'Adventure', icon: Mountain, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { id: 'wellness', name: 'Health & Wellness', icon: Activity, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' }
];

// Available Quick Actions that users can customize
interface QuickAction {
  id: string;
  name: string;
  icon: any;
  action?: () => void;
  href?: string;
  testId: string;
}

const AVAILABLE_QUICK_ACTIONS: Record<string, Omit<QuickAction, 'action'>> = {
  goalInput: { id: 'goalInput', name: 'Goal Input', icon: Target, href: '/?tab=input', testId: 'button-goal-input-quick' },
  discover: { id: 'discover', name: 'Discover', icon: Globe2, href: '/?tab=discover', testId: 'button-discover-quick' },
  activities: { id: 'activities', name: 'Activities', icon: Activity, href: '/?tab=activities', testId: 'button-activities-quick' },
  allTasks: { id: 'allTasks', name: 'All Tasks', icon: CheckSquare, href: '/?tab=tasks', testId: 'button-all-tasks-quick' },
  progress: { id: 'progress', name: 'Progress', icon: BarChart3, href: '/?tab=progress', testId: 'button-progress-quick' },
  groups: { id: 'groups', name: 'Groups', icon: Users, href: '/?tab=groups', testId: 'button-groups-quick' },
  integrations: { id: 'integrations', name: 'Integrations', icon: Plug, href: '/?tab=sync', testId: 'button-integrations-quick' },
};

interface AppSidebarProps {
  selectedTheme?: string;
  onThemeSelect?: (themeId: string) => void;
  onShowThemeSelector?: () => void;
  onShowDatePlanner?: () => void;
  onShowContacts?: () => void;
  onShowChatHistory?: () => void;
  onShowLifestylePlanner?: () => void;
  onShowRecentGoals?: () => void;
  onShowProgressReport?: () => void;
  onShowEndOfDayReview?: () => void;
  onShowInsightsDashboard?: () => void;
  onOpenUpgradeModal?: (trigger: 'planLimit' | 'favorites' | 'export' | 'insights') => void;
  onShowActivities?: () => void;
  onShowAllTasks?: () => void;
  onShowIntegrations?: () => void;
  onShowGoalInput?: () => void;
  onShowDiscover?: () => void;
  onShowProgress?: () => void;
  onShowGroups?: () => void;
}

export function AppSidebar({
  selectedTheme,
  onThemeSelect,
  onShowThemeSelector,
  onShowDatePlanner,
  onShowContacts,
  onShowChatHistory,
  onShowLifestylePlanner,
  onShowRecentGoals,
  onShowProgressReport,
  onShowGoalInput,
  onShowDiscover,
  onShowProgress,
  onShowGroups,
  onShowEndOfDayReview,
  onOpenUpgradeModal,
  onShowActivities,
  onShowAllTasks,
  onShowIntegrations
}: AppSidebarProps) {
  const { user, isAuthenticated, isLoading, login, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const selectedThemeData = selectedTheme ? themes.find(t => t.id === selectedTheme) : null;
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'settings' | 'priorities'>('profile');
  
  // Collapsible section states
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [isJournalExpanded, setIsJournalExpanded] = useState(false);
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(true); // Default open
  const [isFriendsExpanded, setIsFriendsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false);
  const [isSchedulerExpanded, setIsSchedulerExpanded] = useState(false);

  // Compute which quick actions are actually available
  // All actions now use href-based navigation, so all are always available
  const getAvailableActions = (): Set<string> => {
    const available = new Set<string>();
    
    // All actions use href navigation now, so all are available
    Object.keys(AVAILABLE_QUICK_ACTIONS).forEach(id => {
      available.add(id);
    });
    
    return available;
  };

  // Quick Actions customization
  const [isQuickActionsDialogOpen, setIsQuickActionsDialogOpen] = useState(false);
  const DEFAULT_QUICK_ACTIONS = ['goalInput', 'discover', 'progress'];
  const [enabledQuickActions, setEnabledQuickActions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('quickActionsEnabled');
      if (!saved) return DEFAULT_QUICK_ACTIONS;
      
      const parsed = JSON.parse(saved);
      // Sanitize: only keep valid action IDs that exist in AVAILABLE_QUICK_ACTIONS
      const validActions = parsed.filter((id: string) => 
        Object.keys(AVAILABLE_QUICK_ACTIONS).includes(id)
      );
      
      // If no valid actions remain, reset to defaults
      return validActions.length > 0 ? validActions : DEFAULT_QUICK_ACTIONS;
    } catch (error) {
      console.error('Failed to load quick actions from localStorage:', error);
      toast({
        title: "Quick Actions Load Failed",
        description: "Using default quick actions. Your customizations could not be restored.",
        variant: "destructive",
      });
      return DEFAULT_QUICK_ACTIONS;
    }
  });

  // Save to localStorage when changed, and purge unavailable IDs
  useEffect(() => {
    try {
      // Clean up: remove any unavailable actions from persisted state
      const availableActions = getAvailableActions();
      const cleanedActions = enabledQuickActions.filter(id => availableActions.has(id));
      
      // Only update if we actually removed unavailable actions
      if (cleanedActions.length !== enabledQuickActions.length && cleanedActions.length > 0) {
        setEnabledQuickActions(cleanedActions);
        return; // Will trigger this effect again with cleaned data
      }
      
      localStorage.setItem('quickActionsEnabled', JSON.stringify(enabledQuickActions));
    } catch (error) {
      console.error('Failed to save quick actions to localStorage:', error);
      toast({
        title: "Save Failed",
        description: "Could not save Quick Actions settings. Changes may not persist.",
        variant: "destructive",
      });
    }
  }, [enabledQuickActions, toast]);

  const toggleQuickAction = (actionId: string) => {
    const availableActions = getAvailableActions();
    
    // Check if action is actually available (has handler or href)
    if (!availableActions.has(actionId) && !enabledQuickActions.includes(actionId)) {
      toast({
        title: "Action Unavailable",
        description: "This quick action is not currently available in your setup.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setEnabledQuickActions(prev => {
        const newActions = prev.includes(actionId) 
          ? prev.filter(id => id !== actionId)
          : [...prev, actionId];
        
        // Ensure at least one action remains enabled
        return newActions.length > 0 ? newActions : prev;
      });
    } catch (error) {
      console.error('Failed to toggle quick action:', error);
      toast({
        title: "Toggle Failed",
        description: "Could not update Quick Actions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleThemeSelect = (themeId: string) => {
    onThemeSelect?.(themeId);
  };

  // Map quick action IDs to their handlers
  const getQuickActionHandler = (actionId: string): (() => void) | undefined => {
    const handlers: Record<string, () => void> = {
      goalInput: onShowGoalInput || (() => {}),
      discover: onShowDiscover || (() => {}),
      activities: onShowActivities || (() => {}),
      allTasks: onShowAllTasks || (() => {}),
      progress: onShowProgress || (() => {}),
      groups: onShowGroups || (() => {}),
      integrations: onShowIntegrations || (() => {}),
    };
    return handlers[actionId];
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/web/android-chrome-192x192.png"
              alt="JournalMate"
              className="w-7 h-7 rounded-lg flex-shrink-0"
            />
            <span className="text-base font-semibold text-foreground">JournalMate</span>
          </div>
          <SidebarTrigger data-testid="button-sidebar-toggle-inside" className="flex-shrink-0" />
        </div>

        {/* Today's Theme Section */}
        <Collapsible open={isThemeExpanded} onOpenChange={setIsThemeExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-3 -mx-2 min-h-[44px]">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  Today's Theme
                </div>
                {isThemeExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
            {selectedThemeData ? (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <selectedThemeData.icon className="w-5 h-5" />
                  <Badge className={selectedThemeData.color}>
                    {selectedThemeData.name}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowThemeSelector}
                  className="w-full"
                  data-testid="button-change-theme-sidebar"
                >
                  Change Theme
                </Button>
              </div>
            ) : (
              <SidebarMenu>
                {themes.map((theme) => (
                  <SidebarMenuItem key={theme.id}>
                    <SidebarMenuButton
                      onClick={() => handleThemeSelect(theme.id)}
                      data-testid={`button-theme-${theme.id}-sidebar`}
                      className="min-h-[44px] py-3"
                    >
                      <theme.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{theme.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Personal Journal Section */}
        <Collapsible open={isJournalExpanded} onOpenChange={setIsJournalExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-3 -mx-2 min-h-[44px]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  Personal Journal
                </div>
                {isJournalExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={onShowLifestylePlanner}
                      data-testid="button-personal-journal-sidebar"
                      className="min-h-[44px] py-3"
                    >
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Open Journal</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Quick Actions Section - Customizable Docking Station */}
        <Collapsible open={isQuickActionsExpanded} onOpenChange={setIsQuickActionsExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-3 -mx-2 min-h-[44px]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  Quick Actions
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQuickActionsDialogOpen(true);
                    }}
                    data-testid="button-customize-quick-actions"
                  >
                    <SettingsIcon className="w-3 h-3" />
                  </Button>
                  {isQuickActionsExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {enabledQuickActions
                    .filter(actionId => {
                      // Only show actions that are enabled
                      return AVAILABLE_QUICK_ACTIONS[actionId] !== undefined;
                    })
                    .map(actionId => {
                      const action = AVAILABLE_QUICK_ACTIONS[actionId];
                      if (!action) return null;
                      const Icon = action.icon;
                      const handler = getQuickActionHandler(actionId);

                      // Use callback-based navigation
                      return (
                        <SidebarMenuItem key={actionId}>
                          <SidebarMenuButton
                            onClick={handler}
                            data-testid={action.testId}
                            className="min-h-[44px] py-3"
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{action.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  {enabledQuickActions.filter(id => getAvailableActions().has(id)).length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No quick actions enabled. Click the settings icon to customize.
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Friends & Family Section */}
        <Collapsible open={isFriendsExpanded} onOpenChange={setIsFriendsExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-3 -mx-2 min-h-[44px]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  Friends & Family
                </div>
                {isFriendsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={onShowContacts}
                      data-testid="button-contacts-sidebar"
                      className="min-h-[44px] py-3"
                    >
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Manage Contacts</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* History Section */}
        <Collapsible open={isHistoryExpanded} onOpenChange={setIsHistoryExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-3 -mx-2 min-h-[44px]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 flex-shrink-0" />
                  History
                </div>
                {isHistoryExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  data-testid="button-recent-goals"
                  onClick={onShowRecentGoals}
                  className="min-h-[44px] py-3"
                >
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Recent Goals</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  data-testid="button-chat-history"
                  onClick={onShowChatHistory}
                  className="min-h-[44px] py-3"
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Chat History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  data-testid="button-completed-tasks"
                  onClick={onShowProgressReport}
                  className="min-h-[44px] py-3"
                >
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Progress Report</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  data-testid="button-end-of-day-review"
                  onClick={onShowEndOfDayReview}
                  className="min-h-[44px] py-3"
                >
                  <Moon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">End of Day Review</span>
                  <Badge variant="secondary" className="ml-auto text-xs">New</Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Notifications Section */}
        <Collapsible open={isNotificationsExpanded} onOpenChange={setIsNotificationsExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-1 -mx-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </div>
                {isNotificationsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
            <div className="px-3 py-2">
              <NotificationManager userId={user?.id || 'demo-user'} compact />
            </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Smart Scheduler Section */}
        <Collapsible open={isSchedulerExpanded} onOpenChange={setIsSchedulerExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md px-2 py-3 -mx-2 min-h-[44px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  Smart Scheduler
                </div>
                {isSchedulerExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
            <div className="px-3 py-2">
              <SmartScheduler userId={user?.id || 'demo-user'} tasks={[]} compact />
            </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Integration & Updates Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/import-plan">
                  <SidebarMenuButton
                    data-testid="button-integration-sidebar"
                    className="min-h-[44px] py-3"
                  >
                    <Plug className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Integration</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/updates">
                  <SidebarMenuButton
                    data-testid="button-updates-sidebar"
                    className="min-h-[44px] py-3"
                  >
                    <Newspaper className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Updates & News</span>
                    <Badge variant="secondary" className="ml-auto text-xs bg-gradient-to-r from-purple-500 to-violet-500 text-white">New</Badge>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section - Bottom */}
        <div className="mt-auto">
          <Collapsible open={isProfileExpanded} onOpenChange={setIsProfileExpanded}>
            <div className="p-3 border-t">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover-elevate rounded-md p-2 -m-2">
                  {isAuthenticated && user ? (
                    <>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.profileImageUrl} alt={user.firstName || user.email || 'User'} />
                        <AvatarFallback>
                          {user.firstName ? user.firstName.charAt(0).toUpperCase() : 
                           user.email ? user.email.charAt(0).toUpperCase() : 
                           <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                          </p>
                          {(user.subscriptionTier === 'pro' || user.subscriptionTier === 'family') && (
                            <ProBadge size="sm" />
                          )}
                        </div>
                        {user.firstName && user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Account & Settings</p>
                        <p className="text-xs text-muted-foreground">Sign in to access features</p>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-1">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    {isProfileExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-3 mt-3">
                {isAuthenticated && user ? (
                  <>
                    {/* Profile and Settings Buttons */}
                    <div className="border-t pt-3 space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setModalTab('profile');
                          setIsModalOpen(true);
                        }}
                        className="w-full justify-start gap-2"
                        data-testid="button-profile"
                      >
                        <User className="w-4 h-4" />
                        View Profile
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setModalTab('settings');
                          setIsModalOpen(true);
                        }}
                        className="w-full justify-start gap-2"
                        data-testid="button-settings"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Button>
                    </div>
                    
                    {/* Sign Out Button */}
                    <div className="border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={logout}
                        disabled={isLoggingOut}
                        className="w-full gap-2"
                        data-testid="button-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        {isLoggingOut ? 'Signing out...' : 'Sign out'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {isLoading ? (
                      <div className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-3">
                        <div className="p-2 -mx-2">
                          <SocialLogin 
                            title="Sign in to continue"
                            description="Access your goals, tasks, and personalized features"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </SidebarContent>
      
      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTab={modalTab}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />

      {/* Quick Actions Customization Dialog */}
      <Dialog open={isQuickActionsDialogOpen} onOpenChange={setIsQuickActionsDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-customize-quick-actions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Customize Quick Actions
            </DialogTitle>
            <DialogDescription>
              Select which features appear in your Quick Actions docking station for fast access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {Object.values(AVAILABLE_QUICK_ACTIONS).map(action => {
              const Icon = action.icon;
              const isEnabled = enabledQuickActions.includes(action.id);
              const availableActions = getAvailableActions();
              const isAvailable = availableActions.has(action.id);
              
              return (
                <div key={action.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover-elevate">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${isAvailable ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />
                    <div className="flex flex-col">
                      <Label 
                        htmlFor={`qa-${action.id}`} 
                        className={`cursor-pointer font-normal ${!isAvailable ? 'opacity-50' : ''}`}
                      >
                        {action.name}
                      </Label>
                      {!isAvailable && (
                        <span className="text-xs text-muted-foreground">
                          Unavailable in current context
                        </span>
                      )}
                    </div>
                  </div>
                  <Switch
                    id={`qa-${action.id}`}
                    checked={isEnabled}
                    onCheckedChange={() => toggleQuickAction(action.id)}
                    disabled={!isAvailable}
                    data-testid={`switch-${action.id}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: You can reorder enabled items by toggling them off and on in your preferred sequence
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}