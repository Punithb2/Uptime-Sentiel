import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';

function getInitialTheme() {
  const savedTheme = localStorage.getItem('sentinel-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('sentinel-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
