/**
 * Today's Theme Widget
 *
 * Displays above the Goal Input area to show the user's current focus theme.
 * Allows quick theme selection and explains how theme influences planning.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Target,
  Briefcase,
  TrendingUp,
  BookOpen,
  Heart,
  Mountain,
  Activity,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { useDailyTheme, themes, type ThemeId } from '@/hooks/useDailyTheme';

// Map theme IDs to icons
const themeIcons: Record<ThemeId, React.ElementType> = {
  work: Briefcase,
  investment: TrendingUp,
  spiritual: BookOpen,
  romance: Heart,
  adventure: Mountain,
  wellness: Activity,
};

export function TodaysThemeWidget() {
  const {
    currentThemeId,
    currentTheme,
    isLoading,
    setTheme,
    clearTheme,
    isSettingTheme,
  } = useDailyTheme();

  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-3 bg-muted/30 border-dashed animate-pulse">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading theme...</span>
        </div>
      </Card>
    );
  }

  // Theme is active
  if (currentTheme && currentThemeId) {
    const ThemeIcon = themeIcons[currentThemeId];

    return (
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Today's Focus
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <ThemeIcon className="w-5 h-5 text-primary flex-shrink-0" />
              <Badge className={currentTheme.color}>
                {currentTheme.name}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 inline mr-1" />
              Plans for today will be biased toward {currentTheme.name.toLowerCase()} activities
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              Change
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearTheme}
              className="h-8 w-8"
              title="Clear theme"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Theme selector (expanded) */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="mt-4 pt-4 border-t border-primary/10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {themes.map((theme) => {
                const Icon = themeIcons[theme.id];
                const isSelected = theme.id === currentThemeId;

                return (
                  <Button
                    key={theme.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTheme(theme.id);
                      setIsExpanded(false);
                    }}
                    disabled={isSettingTheme}
                    className="h-auto py-2 px-3 justify-start gap-2"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs truncate">{theme.name}</span>
                  </Button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  // No theme set
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="p-3 bg-muted/30 border-dashed hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Set today's focus theme
              </span>
              <span className="text-xs text-muted-foreground/60">
                (optional)
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 pt-3 border-t border-dashed">
          <p className="text-xs text-muted-foreground mb-3">
            Choose a focus to bias today's AI planning suggestions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {themes.map((theme) => {
              const Icon = themeIcons[theme.id];

              return (
                <Button
                  key={theme.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTheme(theme.id);
                    setIsExpanded(false);
                  }}
                  disabled={isSettingTheme}
                  className="h-auto py-2 px-3 justify-start gap-2"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs truncate">{theme.name}</span>
                </Button>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default TodaysThemeWidget;
