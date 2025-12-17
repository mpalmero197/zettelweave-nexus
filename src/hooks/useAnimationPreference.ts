import { useEffect, useState, useCallback } from 'react';

const ANIMATION_PREFERENCE_KEY = 'theme-animations-enabled';
const RESPECT_OS_PREFERENCE_KEY = 'theme-animations-respect-os';

function getOSPrefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getEffectiveAnimationsEnabled(userPref: boolean, respectOS: boolean): boolean {
  if (respectOS && getOSPrefersReducedMotion()) {
    return false;
  }
  return userPref;
}

export function useAnimationPreference() {
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(ANIMATION_PREFERENCE_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  const [respectOSPreference, setRespectOSPreferenceState] = useState<boolean>(() => {
    const stored = localStorage.getItem(RESPECT_OS_PREFERENCE_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  const [osReducedMotion, setOsReducedMotion] = useState<boolean>(getOSPrefersReducedMotion);

  // Listen for OS preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setOsReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply the effective animation state
  useEffect(() => {
    const root = document.documentElement;
    const effectiveEnabled = getEffectiveAnimationsEnabled(animationsEnabled, respectOSPreference);
    
    if (effectiveEnabled) {
      root.classList.remove('no-theme-animations');
    } else {
      root.classList.add('no-theme-animations');
    }

    localStorage.setItem(ANIMATION_PREFERENCE_KEY, String(animationsEnabled));
    localStorage.setItem(RESPECT_OS_PREFERENCE_KEY, String(respectOSPreference));
  }, [animationsEnabled, respectOSPreference, osReducedMotion]);

  const setAnimationsEnabled = useCallback((enabled: boolean) => {
    setAnimationsEnabledState(enabled);
  }, []);

  const setRespectOSPreference = useCallback((respect: boolean) => {
    setRespectOSPreferenceState(respect);
  }, []);

  const toggleAnimations = useCallback(() => {
    setAnimationsEnabledState(prev => !prev);
  }, []);

  // Effective state considering OS preference
  const effectiveAnimationsEnabled = getEffectiveAnimationsEnabled(animationsEnabled, respectOSPreference);

  return { 
    animationsEnabled, 
    setAnimationsEnabled, 
    toggleAnimations,
    respectOSPreference,
    setRespectOSPreference,
    osReducedMotion,
    effectiveAnimationsEnabled
  };
}
