import { useState, useEffect } from 'react';

export type StudioTheme = 'dark' | 'light';

export function useStudioTheme() {
  const [theme, setTheme] = useState<StudioTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('libre_pdf_theme');
      // If user specifically toggled before, honor it, otherwise default to bright daylight
      if (saved === 'light' || saved === 'dark') return saved;
      return 'light'; // Default to clean, modern, luminous daylight workstation
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('libre_pdf_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, setTheme };
}
