import { useEffect, useState } from 'react';

export type ThemeVariant = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender';

const THEME_VARIANT_KEY = 'theme-variant';

export function useThemeVariant() {
  const [variant, setVariantState] = useState<ThemeVariant>(() => {
    const stored = localStorage.getItem(THEME_VARIANT_KEY);
    return (stored as ThemeVariant) || 'default';
  });

  useEffect(() => {
    console.log('Theme variant changing to:', variant);
    
    // Remove all theme variant classes
    const variants: ThemeVariant[] = ['default', 'ocean', 'forest', 'sunset', 'lavender'];
    const root = document.documentElement;
    
    variants.forEach(v => {
      root.classList.remove(`theme-${v}`);
    });

    // Add current variant class (skip for default)
    if (variant !== 'default') {
      root.classList.add(`theme-${variant}`);
      console.log('Added theme class:', `theme-${variant}`);
    }

    console.log('Root classList:', root.classList.toString());

    // Store preference
    localStorage.setItem(THEME_VARIANT_KEY, variant);
    
    // Force a repaint to ensure CSS variables update
    void root.offsetHeight;
  }, [variant]);

  const setVariant = (newVariant: ThemeVariant) => {
    console.log('setVariant called with:', newVariant);
    setVariantState(newVariant);
  };

  return { variant, setVariant };
}