import { useTheme } from '../../components/common/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { isDark, setTheme, theme } = useTheme();

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine next theme based on current state
    let next: 'light' | 'dark';
    if (theme === 'system') {
      // If currently system, toggle to opposite of current appearance
      next = isDark ? 'light' : 'dark';
    } else {
      // If explicit theme, toggle it
      next = theme === 'dark' ? 'light' : 'dark';
    }
    
    setTheme(next);
  };

  return (
    <button
      aria-label="Toggle theme"
      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      onClick={handleToggle}
      type="button"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
