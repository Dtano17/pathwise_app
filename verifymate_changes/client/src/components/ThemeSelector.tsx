import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Sparkles, Target, TrendingUp, Heart, Mountain, Briefcase, BookOpen, Users } from 'lucide-react';

const themes = [
  { 
    id: 'work', 
    name: 'Work Focus', 
    icon: Briefcase, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Productivity, meetings, and professional goals',
    examples: ['Complete quarterly review', 'Prepare presentation', 'Network with colleagues']
  },
  { 
    id: 'investment', 
    name: 'Investment', 
    icon: TrendingUp, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Trading, portfolio analysis, and financial planning',
    examples: ['Analyze stock charts', 'Review portfolio performance', 'Research new investments']
  },
  { 
    id: 'spiritual', 
    name: 'Spiritual', 
    icon: BookOpen, 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Devotion, meditation, and personal growth',
    examples: ['Morning devotion', 'Scripture study', 'Reflection time']
  },
  { 
    id: 'romance', 
    name: 'Romance', 
    icon: Heart, 
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    description: 'Date planning, relationship building, and connection',
    examples: ['Plan date night', 'Find romantic restaurants', 'Plan surprise activities']
  },
  { 
    id: 'adventure', 
    name: 'Adventure', 
    icon: Mountain, 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Exploration, outdoor activities, and new experiences',
    examples: ['Find hiking trails', 'Plan weekend getaway', 'Try new activities']
  },
  { 
    id: 'wellness', 
    name: 'Health & Wellness', 
    icon: Sparkles, 
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    description: 'Fitness, nutrition, and self-care',
    examples: ['Workout routine', 'Meal planning', 'Mindfulness practice']
  }
];

interface ThemeSelectorProps {
  selectedTheme?: string;
  onThemeSelect: (themeId: string) => void;
  onGenerateGoal: (goal: string) => void;
  compact?: boolean;
}

export default function ThemeSelector({ 
  selectedTheme, 
  onThemeSelect, 
  onGenerateGoal, 
  compact = false 
}: ThemeSelectorProps) {
  const [selectedThemeData, setSelectedThemeData] = useState<typeof themes[0] | null>(
    selectedTheme ? themes.find(t => t.id === selectedTheme) || null : null
  );

  const handleThemeSelect = (theme: typeof themes[0]) => {
    setSelectedThemeData(theme);
    onThemeSelect(theme.id);
  };

  const generateThemeGoal = (example: string) => {
    if (selectedThemeData) {
      onGenerateGoal(`Set my theme for the day: ${selectedThemeData.name} - ${example}`);
    }
  };

  if (compact) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Today's Theme
        </h3>
        
        {selectedThemeData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <selectedThemeData.icon className="w-5 h-5" />
              <Badge className={selectedThemeData.color}>
                {selectedThemeData.name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedThemeData.description}
            </p>
            <div className="space-y-1">
              {selectedThemeData.examples.slice(0, 2).map((example, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  onClick={() => generateThemeGoal(example)}
                  className="w-full justify-start h-auto p-2 text-xs"
                  data-testid={`button-quick-goal-${idx}`}
                >
                  {example}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedThemeData(null);
                onThemeSelect(''); // Signal 'no theme' to parent
              }}
              className="w-full"
              data-testid="button-change-theme"
            >
              Change Theme
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => (
              <Button
                key={theme.id}
                variant="ghost"
                size="sm"
                onClick={() => handleThemeSelect(theme)}
                className="h-auto p-2 flex-col gap-1"
                data-testid={`button-theme-${theme.id}`}
              >
                <theme.icon className="w-4 h-4" />
                <span className="text-xs">{theme.name}</span>
              </Button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Set Your Theme for the Day</h2>
        <p className="text-muted-foreground">
          Choose a focus area to get personalized goal suggestions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme, index) => (
          <motion.div
            key={theme.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`p-4 cursor-pointer transition-all duration-200 hover-elevate ${
                selectedThemeData?.id === theme.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : ''
              }`}
              onClick={() => handleThemeSelect(theme)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <theme.icon className="w-8 h-8 text-primary" />
                  <Badge className={theme.color}>
                    {theme.name}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg">{theme.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {theme.description}
                  </p>
                </div>

                {selectedThemeData?.id === theme.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2 pt-3 border-t"
                  >
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Quick Start Ideas:
                    </p>
                    {theme.examples.map((example, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateThemeGoal(example);
                        }}
                        className="w-full justify-start h-auto p-2 text-xs"
                        data-testid={`button-example-${theme.id}-${idx}`}
                      >
                        <Sparkles className="w-3 h-3 mr-2" />
                        {example}
                      </Button>
                    ))}
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}