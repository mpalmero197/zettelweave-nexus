import { useEffect, useState } from 'react';

export type ThemeVariant = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'midnight' | 'aurora';

const THEME_VARIANT_KEY = 'theme-variant';

export function useThemeVariant() {
  const [variant, setVariantState] = useState<ThemeVariant>(() => {
    const stored = localStorage.getItem(THEME_VARIANT_KEY);
    return (stored as ThemeVariant) || 'default';
  });

  useEffect(() => {
    const variants: ThemeVariant[] = ['default', 'ocean', 'forest', 'sunset', 'lavender', 'midnight', 'aurora'];
    const root = document.documentElement;
    
    // Remove all theme variant classes
    variants.forEach(v => {
      root.classList.remove(`theme-${v}`);
    });

    // Add current variant class (skip for default)
    if (variant !== 'default') {
      root.classList.add(`theme-${variant}`);
    }

    // Store preference
    localStorage.setItem(THEME_VARIANT_KEY, variant);
    
    // Force repaint
    void root.offsetHeight;
  }, [variant]);

  const setVariant = (newVariant: ThemeVariant) => {
    setVariantState(newVariant);
  };

  return { variant, setVariant };
}