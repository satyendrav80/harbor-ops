import { useTheme } from '../../components/common/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      aria-label="Toggle theme"
      className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full text-[#212529] dark:text-[#E9ECEF] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      onClick={() => setTheme(next)}
    >
      <span className="material-symbols-outlined block dark:hidden">dark_mode</span>
      <span className="material-symbols-outlined hidden dark:block">light_mode</span>
    </button>
  );
}


