import { useEffect, useState, useCallback } from 'react';

const ANIMATION_PREFERENCE_KEY = 'theme-animations-enabled';
const RESPECT_OS_PREFERENCE_KEY = 'theme-animations-respect-os';
const REDUCED_BLUR_KEY = 'theme-reduced-blur';
const SIMPLIFIED_TRANSITIONS_KEY = 'theme-simplified-transitions';
const LOW_POWER_MODE_KEY = 'theme-low-power-mode';

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

  const [reducedBlur, setReducedBlurState] = useState<boolean>(() => {
    const stored = localStorage.getItem(REDUCED_BLUR_KEY);
    return stored !== null ? stored === 'true' : false;
  });

  const [simplifiedTransitions, setSimplifiedTransitionsState] = useState<boolean>(() => {
    const stored = localStorage.getItem(SIMPLIFIED_TRANSITIONS_KEY);
    return stored !== null ? stored === 'true' : false;
  });

  const [lowPowerMode, setLowPowerModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOW_POWER_MODE_KEY);
    return stored !== null ? stored === 'true' : false;
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

  // Apply reduced blur
  useEffect(() => {
    const root = document.documentElement;
    if (reducedBlur) {
      root.classList.add('reduced-blur');
    } else {
      root.classList.remove('reduced-blur');
    }
    localStorage.setItem(REDUCED_BLUR_KEY, String(reducedBlur));
  }, [reducedBlur]);

  // Apply simplified transitions
  useEffect(() => {
    const root = document.documentElement;
    if (simplifiedTransitions) {
      root.classList.add('simplified-transitions');
    } else {
      root.classList.remove('simplified-transitions');
    }
    localStorage.setItem(SIMPLIFIED_TRANSITIONS_KEY, String(simplifiedTransitions));
  }, [simplifiedTransitions]);

  // Save low power mode preference
  useEffect(() => {
    localStorage.setItem(LOW_POWER_MODE_KEY, String(lowPowerMode));
  }, [lowPowerMode]);

  const setAnimationsEnabled = useCallback((enabled: boolean) => {
    setAnimationsEnabledState(enabled);
  }, []);

  const setRespectOSPreference = useCallback((respect: boolean) => {
    setRespectOSPreferenceState(respect);
  }, []);

  const setReducedBlur = useCallback((reduced: boolean) => {
    setReducedBlurState(reduced);
  }, []);

  const setSimplifiedTransitions = useCallback((simplified: boolean) => {
    setSimplifiedTransitionsState(simplified);
  }, []);

  const setLowPowerMode = useCallback((enabled: boolean) => {
    setLowPowerModeState(enabled);
    if (enabled) {
      // Enable all performance optimizations
      setAnimationsEnabledState(false);
      setReducedBlurState(true);
      setSimplifiedTransitionsState(true);
    }
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
    effectiveAnimationsEnabled,
    reducedBlur,
    setReducedBlur,
    simplifiedTransitions,
    setSimplifiedTransitions,
    lowPowerMode,
    setLowPowerMode
  };
}
