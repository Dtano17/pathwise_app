import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, Heart, Sparkles, Briefcase, TrendingUp, BookOpen, Mountain, Dumbbell, Activity } from 'lucide-react';

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
  const selectedThemeData = selectedTheme ? themes.find(t => t.id === selectedTheme) : null;

  const handleThemeSelect = (themeId: string) => {
    onThemeSelect?.(themeId);
  };

  return (
    <Sidebar>
      <SidebarContent>
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
      </SidebarContent>
    </Sidebar>
  );
}