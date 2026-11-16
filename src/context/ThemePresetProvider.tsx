import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Theme presets remap the app's brand accent palette (Tailwind `rose-*`)
 * to a different palette via CSS variables defined in `index.css`.
 */
export type ThemePreset = 'rose' | 'emerald' | 'indigo' | 'amber' | 'violet' | 'sky';

export interface ThemePresetOption {
  id: ThemePreset;
  name: string;
  colorHex: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  { id: 'rose', name: 'Rose Originale', colorHex: '#f43f5e' },
  { id: 'emerald', name: 'Emerald Studio', colorHex: '#10b981' },
  { id: 'indigo', name: 'Indigo Deep', colorHex: '#6366f1' },
  { id: 'violet', name: 'Violet Neon', colorHex: '#8b5cf6' },
  { id: 'sky', name: 'Sky Blueprint', colorHex: '#0ea5e9' },
  { id: 'amber', name: 'Amber Technical', colorHex: '#f59e0b' },
];

const STORAGE_KEY = 'librepdf_theme_preset';
const VALID = new Set<string>(THEME_PRESETS.map((p) => p.id));

interface ThemePresetContextType {
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  availablePresets: ThemePresetOption[];
}

const ThemePresetContext = createContext<ThemePresetContextType | undefined>(undefined);

export const ThemePresetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preset, setPresetState] = useState<ThemePreset>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved && VALID.has(saved) ? (saved as ThemePreset) : 'rose';
  });

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    localStorage.setItem(STORAGE_KEY, newPreset);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-preset', preset);
    const meta = document.querySelector('meta[name="theme-color"]');
    const hex = THEME_PRESETS.find((p) => p.id === preset)?.colorHex;
    if (meta && hex) meta.setAttribute('content', hex);
  }, [preset]);

  return (
    <ThemePresetContext.Provider value={{ preset, setPreset, availablePresets: THEME_PRESETS }}>
      {children}
    </ThemePresetContext.Provider>
  );
};

export const useThemePreset = (): ThemePresetContextType => {
  const context = useContext(ThemePresetContext);
  if (!context) {
    throw new Error('useThemePreset must be used within a ThemePresetProvider');
  }
  return context;
};
