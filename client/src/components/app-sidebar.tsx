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
import { Target, Heart, Sparkles, Briefcase, TrendingUp, BookOpen, Mountain, Dumbbell, Activity, LogIn, LogOut, User, Settings, Bell, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NotificationManager from '@/components/NotificationManager';
import SmartScheduler from '@/components/SmartScheduler';

const themes = [
  { id: 'work', name: 'Work Focus', icon: Briefcase, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { id: 'investment', name: 'Investment', icon: TrendingUp, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { id: 'spiritual', name: 'Spiritual', icon: BookOpen, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { id: 'romance', name: 'Romance', icon: Heart, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { id: 'adventure', name: 'Adventure', icon: Mountain, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { id: 'wellness', name: 'Health & Wellness', icon: Activity, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' }
];

interface AppSidebarProps {
  selectedTheme?: string;
  onThemeSelect?: (themeId: string) => void;
  onShowThemeSelector?: () => void;
  onShowDatePlanner?: () => void;
}

export function AppSidebar({ 
  selectedTheme, 
  onThemeSelect, 
  onShowThemeSelector,
  onShowDatePlanner 
}: AppSidebarProps) {
  const { user, isAuthenticated, isLoading, login, logout, isLoggingOut } = useAuth();
  const selectedThemeData = selectedTheme ? themes.find(t => t.id === selectedTheme) : null;
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const handleThemeSelect = (themeId: string) => {
    onThemeSelect?.(themeId);
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b">
          <span className="text-lg font-semibold text-foreground">PathWise</span>
          <SidebarTrigger data-testid="button-sidebar-toggle-inside" />
        </div>

        {/* Today's Theme Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Today's Theme
          </SidebarGroupLabel>
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
                    >
                      <theme.icon className="w-4 h-4" />
                      <span>{theme.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onShowDatePlanner}
                  data-testid="button-date-planner-sidebar"
                >
                  <Heart className="w-4 h-4" />
                  <span>Plan a Date</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onShowThemeSelector}
                  data-testid="button-full-theme-selector-sidebar"
                >
                  <Target className="w-4 h-4" />
                  <span>Browse All Themes</span>
                </SidebarMenuButton>
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
                        <p className="text-sm font-medium truncate">
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                        </p>
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
                    {/* Notifications Section */}
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Notifications</span>
                      </div>
                      <div className="ml-6">
                        <NotificationManager userId={user.id} />
                      </div>
                    </div>

                    {/* Scheduler Section */}
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Smart Scheduler</span>
                      </div>
                      <div className="ml-6">
                        <SmartScheduler userId={user.id} tasks={[]} />
                      </div>
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
                        <Button
                          onClick={login}
                          className="w-full gap-2 mb-2"
                          data-testid="button-login"
                        >
                          <LogIn className="w-4 h-4" />
                          Sign in / Sign up
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Sign in with Gmail or Facebook
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}