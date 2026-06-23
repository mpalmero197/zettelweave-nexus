import { useEffect, useRef, useState, useCallback } from "react";

/**
 * "Hey ALICE" wake-word listener using the browser Web Speech API.
 *
 * - Off by default. User opts in via Settings → ALICE Preferences.
 * - Stores preferences in localStorage so it works without an auth round-trip
 *   and persists across reloads on this device/browser.
 * - When a wake phrase is detected, dispatches `alice-wake` (UI opens ALICE
 *   and focuses the input so the user can dictate or type follow-up).
 * - Automatically restarts the recognizer if the browser stops it (Chrome
 *   stops continuous recognition every ~60s on its own).
 */

export const WAKE_ENABLED_KEY = "alice.wakeWord.enabled";
export const WAKE_PHRASES_KEY = "alice.wakeWord.phrases";

const DEFAULT_PHRASES = ["hey alice", "okay alice", "ok alice", "hi alice"];

type SR = any;

function getRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function isWakeWordSupported(): boolean {
  return !!getRecognitionCtor();
}

export function getWakeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WAKE_ENABLED_KEY) === "1";
}

export function setWakeEnabled(v: boolean) {
  localStorage.setItem(WAKE_ENABLED_KEY, v ? "1" : "0");
  window.dispatchEvent(new CustomEvent("alice-wake-pref-change"));
}

export function getWakePhrases(): string[] {
  if (typeof window === "undefined") return DEFAULT_PHRASES;
  try {
    const raw = localStorage.getItem(WAKE_PHRASES_KEY);
    if (!raw) return DEFAULT_PHRASES;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((s) => typeof s === "string")) {
      return arr.map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
  } catch { /* ignore */ }
  return DEFAULT_PHRASES;
}

export function setWakePhrases(phrases: string[]) {
  localStorage.setItem(WAKE_PHRASES_KEY, JSON.stringify(phrases));
  window.dispatchEvent(new CustomEvent("alice-wake-pref-change"));
}

export interface WakeWordState {
  supported: boolean;
  enabled: boolean;
  listening: boolean;
  error: string | null;
  lastHeard: string | null;
}

export function useAliceWakeWord(): WakeWordState {
  const [enabled, setEnabledState] = useState<boolean>(() => getWakeEnabled());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const supported = isWakeWordSupported();
  const recRef = useRef<SR | null>(null);
  const stoppedByUserRef = useRef(false);

  // React to settings changes from elsewhere in the app.
  useEffect(() => {
    const sync = () => setEnabledState(getWakeEnabled());
    window.addEventListener("alice-wake-pref-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("alice-wake-pref-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const stop = useCallback(() => {
    stoppedByUserRef.current = true;
    try { recRef.current?.stop(); } catch { /* noop */ }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setError("Voice recognition isn't supported in this browser."); return; }
    if (recRef.current) return;
    stoppedByUserRef.current = false;

    const rec: SR = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); setError(null); };
    rec.onerror = (e: any) => {
      const err = String(e?.error || "unknown");
      // "no-speech" / "aborted" are routine — don't surface those.
      if (err !== "no-speech" && err !== "aborted") {
        setError(err === "not-allowed" ? "Microphone permission denied." : `Voice error: ${err}`);
      }
      if (err === "not-allowed" || err === "service-not-allowed") {
        stoppedByUserRef.current = true;
        setWakeEnabled(false);
      }
    };
    rec.onend = () => {
      setListening(false);
      // Auto-restart unless the user disabled it.
      if (!stoppedByUserRef.current && getWakeEnabled()) {
        setTimeout(() => {
          try { rec.start(); } catch { /* recognizer racing — try again next end */ }
        }, 400);
      } else {
        recRef.current = null;
      }
    };
    rec.onresult = (event: any) => {
      const phrases = getWakePhrases();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = (event.results[i][0]?.transcript || "").toLowerCase().trim();
        if (!transcript) continue;
        setLastHeard(transcript);
        const match = phrases.find((p) => transcript.includes(p));
        if (match) {
          // Strip wake phrase + everything before it; keep any trailing command.
          const idx = transcript.indexOf(match);
          const tail = transcript.slice(idx + match.length).replace(/^[,.\s]+/, "").trim();
          window.dispatchEvent(new CustomEvent("alice-wake", {
            detail: { phrase: match, command: tail || null, transcript },
          }));
        }
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch (e: any) {
      setError(e?.message || "Could not start voice recognition.");
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    if (enabled) start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, supported]);

  // Pause the recognizer while the tab is hidden to save the mic.
  useEffect(() => {
    if (!supported) return;
    const onVis = () => {
      if (document.hidden) {
        try { recRef.current?.stop(); } catch { /* noop */ }
      } else if (getWakeEnabled() && !recRef.current) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [supported, start]);

  return { supported, enabled, listening, error, lastHeard };
}
