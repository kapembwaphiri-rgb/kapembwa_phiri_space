'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const themeStorageKey = 'chi_theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(themeStorageKey) || localStorage.getItem('chi_seller_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
    } catch {
      setStorageError('Theme preference is unavailable in this browser.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
      setStorageError('');
    } catch {
      setStorageError('Theme preference could not be saved in this browser.');
    }
  }, [ready, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  }, []);
  const value = useMemo(() => ({ theme, toggleTheme, storageError }), [theme, toggleTheme, storageError]);

  return <ThemeContext.Provider value={value}>
    {children}
    {storageError && <p className="theme-storage-error" role="status">{storageError}</p>}
  </ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
