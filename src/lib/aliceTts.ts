/**
 * ALICE shared TTS singleton + remote reset.
 *
 * Uses the browser's built-in Web Speech API (SpeechSynthesis) — no API key,
 * no network call, no cost. Voice playback can be toggled on/off by the user
 * and the preference persists in localStorage.
 *
 * Mobile Safari / Chrome can double-fire SpeechSynthesisUtterance when
 * playback is interrupted by focus changes. ALICE can pull this kill switch
 * remotely via the `reset_mobile_tts_engine` tool — the edge function
 * returns a client_action that `useJarvis` fans out as `alice:reset_tts`.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
const VOICE_PREF_KEY = "alice:voice-enabled";

export function isAliceVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VOICE_PREF_KEY) === "1";
  } catch { return false; }
}

export function setAliceVoiceEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(VOICE_PREF_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  if (!on) {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }
  window.dispatchEvent(new CustomEvent("alice:voice-pref-changed", { detail: on }));
}

export function onAliceVoicePrefChanged(fn: (enabled: boolean) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => fn(Boolean((e as CustomEvent).detail));
  window.addEventListener("alice:voice-pref-changed", handler);
  return () => window.removeEventListener("alice:voice-pref-changed", handler);
}

export function onTtsReset(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Pick the most natural-sounding English female voice available.
 * Falls back to any English voice, then the default.
 */
function pickAliceVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Preferred natural voices by name fragments (Google, Apple, MS).
  const preferred = [
    /Google US English/i,
    /Google UK English Female/i,
    /Samantha/i,
    /Ava/i,
    /Allison/i,
    /Microsoft (Jenny|Aria|Zira)/i,
    /Karen/i,
    /Serena/i,
  ];
  for (const re of preferred) {
    const v = voices.find((v) => re.test(v.name));
    if (v) return v;
  }
  const en = voices.find((v) => /^en[-_]/i.test(v.lang));
  return en || voices[0];
}

/** Strip markdown / card tokens so TTS reads naturally. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\[\[ALICE_PLAN_EXECUTE\]\][\s\S]*?\[\[\/ALICE_PLAN_EXECUTE\]\]/g, "")
    .replace(/\[\[ALICE_CARD[^\]]*\]\][\s\S]*?\[\[\/ALICE_CARD\]\]/g, "")
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speakAlice(text: string, opts: Partial<SpeechSynthesisUtterance> = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!isAliceVoiceEnabled()) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  // Cancel any in-flight queue before queueing the new utterance — this is
  // what stops double-utterance bugs on iOS Safari when several callers
  // queue in quick succession.
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  _enqueue(clean, opts);
}

/**
 * Append a sentence/chunk to the speech queue WITHOUT cancelling prior
 * utterances. Used for streaming TTS — sentences are spoken as they arrive.
 */
export function enqueueAliceSpeech(text: string, opts: Partial<SpeechSynthesisUtterance> = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!isAliceVoiceEnabled()) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  _enqueue(clean, opts);
}

function _enqueue(clean: string, opts: Partial<SpeechSynthesisUtterance>) {
  const u = new SpeechSynthesisUtterance(clean);
  const voice = pickAliceVoice();
  if (voice) u.voice = voice;
  u.rate = 1.0;
  u.pitch = 1.05;
  u.volume = 1.0;
  Object.assign(u, opts);
  if (!voice && window.speechSynthesis.onvoiceschanged === null) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickAliceVoice();
      if (v) u.voice = v;
      try { window.speechSynthesis.speak(u); } catch { /* ignore */ }
      window.speechSynthesis.onvoiceschanged = null;
    };
    return;
  }
  window.speechSynthesis.speak(u);
}


export function resetAliceTts() {
  if (typeof window === "undefined") return;
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  // Some browsers leave a paused utterance after cancel — resume + cancel
  // again clears the residual state.
  try { window.speechSynthesis?.resume(); } catch { /* ignore */ }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}

/** Mount once at the app root. Wires the global event → reset. */
export function installAliceTtsResetListener() {
  if (typeof window === "undefined") return () => {};
  const handler = () => resetAliceTts();
  window.addEventListener("alice:reset_tts", handler);
  return () => window.removeEventListener("alice:reset_tts", handler);
}
