import * as React from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type PresetTheme = 'default' | 'golden-hour' | 'neon-pulse' | 'terra';

interface ThemeContextType {
  theme: ThemeMode;
  preset: PresetTheme;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  setPreset: (preset: PresetTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

function getTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  return (hour >= 7 && hour < 19) ? 'light' : 'dark';
}

function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return getTimeBasedTheme();
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>('auto');
  const [preset, setPresetState] = React.useState<PresetTheme>('default');
  const [isDark, setIsDark] = React.useState(false);

  const applyTheme = React.useCallback((effectiveTheme: 'light' | 'dark', activePreset: PresetTheme) => {
    const shouldBeDark = effectiveTheme === 'dark';
    setIsDark(shouldBeDark);

    if (typeof document !== 'undefined' && document.documentElement) {
      // Handle light/dark mode
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Handle Preset Themes
      // First remove any existing theme classes
      const classes = document.documentElement.className.split(' ');
      const newClasses = classes.filter(c => !c.startsWith('theme-'));
      document.documentElement.className = newClasses.join(' ').trim();

      // Add the new theme class if it's not the default (Soft Focus)
      if (activePreset !== 'default') {
        document.documentElement.classList.add(`theme-${activePreset}`);
      }
    }
  }, []);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode') as ThemeMode | null;
    const savedPreset = localStorage.getItem('theme-preset') as PresetTheme | null;

    const validThemes: ThemeMode[] = ['light', 'dark', 'auto'];
    const validPresets: PresetTheme[] = ['default', 'golden-hour', 'neon-pulse', 'terra'];

    const initialTheme = (savedTheme && validThemes.includes(savedTheme)) ? savedTheme : 'auto';
    const initialPreset = (savedPreset && validPresets.includes(savedPreset)) ? savedPreset : 'default';

    setThemeState(initialTheme);
    setPresetState(initialPreset);

    applyTheme(getEffectiveTheme(initialTheme), initialPreset);
  }, [applyTheme]);

  React.useEffect(() => {
    if (theme !== 'auto') return;

    const checkTime = () => {
      applyTheme(getTimeBasedTheme(), preset);
    };

    checkTime();

    const interval = setInterval(checkTime, 60000);

    return () => clearInterval(interval);
  }, [theme, preset, applyTheme]);

  const setTheme = React.useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme-mode', newTheme);
    applyTheme(getEffectiveTheme(newTheme), preset);
  }, [applyTheme, preset]);

  const setPreset = React.useCallback((newPreset: PresetTheme) => {
    setPresetState(newPreset);
    localStorage.setItem('theme-preset', newPreset);
    applyTheme(getEffectiveTheme(theme), newPreset);
  }, [applyTheme, theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, preset, isDark, setTheme, setPreset, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    return {
      theme: 'auto' as ThemeMode,
      preset: 'default' as PresetTheme,
      isDark: false,
      setTheme: () => { },
      setPreset: () => { },
      toggleTheme: () => { }
    };
  }
  return context;
}
