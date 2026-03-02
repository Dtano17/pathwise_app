import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor, Sparkles, Sunset, Leaf, Compass } from 'lucide-react';
import { useTheme, PresetTheme } from './ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ThemeToggle() {
  const { theme, preset, isDark, setTheme, setPreset } = useTheme();

  const presets: { id: PresetTheme, label: string, icon: any }[] = [
    { id: 'default', label: 'Soft Focus', icon: Compass },
    { id: 'golden-hour', label: 'Golden Hour', icon: Sunset },
    { id: 'neon-pulse', label: 'Neon Pulse', icon: Sparkles },
    { id: 'terra', label: 'Terra', icon: Leaf }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle"
          className="hover-squish relative"
        >
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          {preset !== 'default' && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Appearance</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-accent' : ''}
          data-testid="theme-light"
        >
          <Sun className="w-4 h-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-accent' : ''}
          data-testid="theme-dark"
        >
          <Moon className="w-4 h-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('auto')}
          className={theme === 'auto' ? 'bg-accent' : ''}
          data-testid="theme-auto"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Auto
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Aesthetic Energy</DropdownMenuLabel>
        {presets.map((p) => {
          const Icon = p.icon;
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={preset === p.id ? 'bg-primary/10 text-primary font-medium' : ''}
            >
              <Icon className="w-4 h-4 mr-2" />
              {p.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
