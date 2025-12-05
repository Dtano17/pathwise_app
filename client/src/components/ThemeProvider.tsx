import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isDark, setIsDark] = useState(true);

  const applyTheme = useCallback((effectiveTheme: 'light' | 'dark') => {
    const shouldBeDark = effectiveTheme === 'dark';
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode') as ThemeMode | null;
    // Default to dark mode unless user explicitly selected auto or light
    const initialTheme = savedTheme || 'dark';
    setThemeState(initialTheme);
    applyTheme(getEffectiveTheme(initialTheme));
  }, [applyTheme]);

  useEffect(() => {
    if (theme !== 'auto') return;

    const checkTime = () => {
      applyTheme(getTimeBasedTheme());
    };

    checkTime();

    const interval = setInterval(checkTime, 60000);

    return () => clearInterval(interval);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme-mode', newTheme);
    applyTheme(getEffectiveTheme(newTheme));
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    if (theme === 'auto') {
      setTheme(isDark ? 'light' : 'dark');
    } else {
      setTheme(isDark ? 'light' : 'dark');
    }
  }, [theme, isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    return {
      theme: 'auto' as ThemeMode,
      isDark: false,
      setTheme: () => {},
      toggleTheme: () => {}
    };
  }
  return context;
}
