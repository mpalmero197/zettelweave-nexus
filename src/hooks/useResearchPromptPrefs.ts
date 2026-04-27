import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'research-prompt-include-citations';

/**
 * Preference for the sidebar research prompt triggered by the writing-context detector.
 * - true  => Knowledge Chat response should include citations / source links
 * - false => web search results only, no citations appended
 */
export function useResearchPromptPrefs() {
  const [includeCitations, setIncludeCitations] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === 'true';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(includeCitations));
      window.dispatchEvent(new CustomEvent('research-prompt-prefs-changed', {
        detail: { includeCitations },
      }));
    } catch { /* noop */ }
  }, [includeCitations]);

  // Cross-tab / cross-component sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setIncludeCitations(e.newValue === 'true');
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.includeCitations === 'boolean') {
        setIncludeCitations(detail.includeCitations);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('research-prompt-prefs-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('research-prompt-prefs-changed', onCustom);
    };
  }, []);

  const toggle = useCallback(() => setIncludeCitations(v => !v), []);

  return { includeCitations, setIncludeCitations, toggle };
}

/** Read the current preference synchronously (e.g. inside event handlers). */
export function readIncludeCitationsPref(): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === 'true';
}
