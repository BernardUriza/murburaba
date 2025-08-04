import { createContext, ReactNode, useState, useEffect, useContext } from 'react';

import { Theme } from '../types/enums';

interface IThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Theme.LIGHT | Theme.DARK;
}

export const ThemeContext = createContext<IThemeContext | null>(null);

interface IThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = Theme.SYSTEM }: IThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<Theme.LIGHT | Theme.DARK>(Theme.LIGHT);
  
  useEffect(() => {
    if (theme === Theme.SYSTEM) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mediaQuery.matches ? Theme.DARK : Theme.LIGHT);
      
      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? Theme.DARK : Theme.LIGHT);
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setResolvedTheme(theme as Theme.LIGHT | Theme.DARK);
      return undefined;
    }
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Traditional hook for comparison
export function useTheme(): IThemeContext {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}