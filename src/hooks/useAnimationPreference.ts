import { useEffect, useState } from 'react';

const ANIMATION_PREFERENCE_KEY = 'theme-animations-enabled';

export function useAnimationPreference() {
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(ANIMATION_PREFERENCE_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (animationsEnabled) {
      root.classList.remove('no-theme-animations');
    } else {
      root.classList.add('no-theme-animations');
    }

    localStorage.setItem(ANIMATION_PREFERENCE_KEY, String(animationsEnabled));
  }, [animationsEnabled]);

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
  };

  const toggleAnimations = () => {
    setAnimationsEnabledState(prev => !prev);
  };

  return { animationsEnabled, setAnimationsEnabled, toggleAnimations };
}
