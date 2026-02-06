import { useEffect, useState } from 'react';

const THEME_KEY = 'theme-mode';

export type ThemeVariant = 'default';

export function useThemeVariant() {
  const [variant] = useState<ThemeVariant>('default');

  const setVariant = () => {
    // No-op - simplified to just light/dark mode via next-themes
  };

  // Clean up any old theme classes on mount
  useEffect(() => {
    const root = document.documentElement;
    const oldThemes = ['theme-ocean', 'theme-forest', 'theme-sunset', 'theme-lavender', 'theme-midnight', 'theme-aurora', 'theme-default'];
    oldThemes.forEach(t => root.classList.remove(t));
  }, []);

  return { variant, setVariant };
}
