import { use } from 'react';
import { ThemeContext } from '../../contexts/theme-context';
import { Theme } from '../../types/enums';

export function ThemeToggle() {
  // Using the new React 19 use() hook instead of useContext
  const themeContext = use(ThemeContext);
  
  if (!themeContext) {
    throw new Error('ThemeToggle must be used within a ThemeProvider');
  }
  
  const { theme, setTheme, resolvedTheme } = themeContext;
  
  return (
    <div className="theme-toggle">
      <button
        className={`theme-btn ${resolvedTheme === Theme.LIGHT ? 'active' : ''}`}
        onClick={() => setTheme(Theme.LIGHT)}
        aria-label="Light theme"
        title="Light theme"
      >
        ☀️
      </button>
      <button
        className={`theme-btn ${resolvedTheme === Theme.DARK ? 'active' : ''}`}
        onClick={() => setTheme(Theme.DARK)}
        aria-label="Dark theme"
        title="Dark theme"
      >
        🌙
      </button>
      <button
        className={`theme-btn ${theme === Theme.SYSTEM ? 'active' : ''}`}
        onClick={() => setTheme(Theme.SYSTEM)}
        aria-label="System theme"
        title="System theme"
      >
        💻
      </button>
    </div>
  );
}