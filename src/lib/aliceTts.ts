/**
 * ALICE shared TTS singleton + remote reset.
 *
 * Mobile Safari / Chrome can double-fire SpeechSynthesisUtterance when
 * playback is interrupted by focus changes. ALICE can pull this kill switch
 * remotely via the `reset_mobile_tts_engine` tool — the edge function
 * returns a client_action that `useJarvis` fans out as `alice:reset_tts`.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function onTtsReset(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function speakAlice(text: string, opts: Partial<SpeechSynthesisUtterance> = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  // Cancel any in-flight queue before queueing the new utterance — this is
  // what stops double-utterance bugs on iOS Safari when several callers
  // queue in quick succession.
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  const u = new SpeechSynthesisUtterance(text);
  Object.assign(u, opts);
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
