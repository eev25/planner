import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'theme';

function readTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light'; // storage can be blocked (private mode)
  }
}

function writeTheme(theme) {
  try {
    if (theme === 'dark') localStorage.setItem(STORAGE_KEY, theme);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* the choice just won't persist */ }
}

// Always starts in light mode regardless of the OS setting; dark is opt-in via
// the toggle and remembered across visits.
export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    writeTheme(next);
    setTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}
