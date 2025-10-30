import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void; isDark: boolean };

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_KEY = 'theme';

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return false;
  
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  
  // Force remove and add to ensure it works
  root.classList.remove('dark');
  if (isDark) {
    root.classList.add('dark');
  }
  
  return isDark;
}

// Apply theme immediately on module load (before React renders)
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(THEME_KEY);
  const initialTheme = (stored as Theme) || 'system';
  applyTheme(initialTheme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_KEY);
    return (stored as Theme) || 'system';
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem(THEME_KEY);
    const currentTheme = (stored as Theme) || 'system';
    const currentIsDark = currentTheme === 'dark' || (currentTheme === 'system' && prefersDark);
    return currentIsDark;
  });

  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Apply theme immediately on mount and when theme changes
  useEffect(() => {
    const newIsDark = applyTheme(theme);
    setIsDark(newIsDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  // Listen for system preference changes when using 'system' theme
  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const updatedIsDark = applyTheme('system');
        setIsDark(updatedIsDark);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    // Apply theme synchronously IMMEDIATELY - don't wait for React
    const newIsDark = applyTheme(t);
    
    // Update localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, t);
    }
    
    // Update state (React will batch but DOM is already updated)
    setIsDark(newIsDark);
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, isDark }), [theme, setTheme, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}


