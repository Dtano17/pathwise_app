import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ThemeToggle() {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle"
          className="hover-elevate min-h-[44px] min-w-[44px]"
        >
          {isDark ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={`min-h-[44px] ${theme === 'light' ? 'bg-accent' : ''}`}
          data-testid="theme-light"
        >
          <Sun className="w-4 h-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={`min-h-[44px] ${theme === 'dark' ? 'bg-accent' : ''}`}
          data-testid="theme-dark"
        >
          <Moon className="w-4 h-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('auto')}
          className={`min-h-[44px] ${theme === 'auto' ? 'bg-accent' : ''}`}
          data-testid="theme-auto"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Auto (Day/Night)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
