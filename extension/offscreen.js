// Baku Scribe wake-word offscreen document.
// Service workers can't access the Web Speech API or the microphone, so we
// run a continuous SpeechRecognition session here and post wake events back
// to the background script via chrome.runtime.sendMessage.

const DEFAULT_PHRASES = ["hey alice", "okay alice", "ok alice", "hi alice"];

let rec = null;
let stopped = false;
let phrases = DEFAULT_PHRASES;

function loadPhrases() {
  try {
    chrome.storage.local.get(["bakuscribe_wake_phrases"], (res) => {
      const p = res && res.bakuscribe_wake_phrases;
      if (Array.isArray(p) && p.length) phrases = p.map((s) => String(s).toLowerCase().trim()).filter(Boolean);
    });
  } catch (_) { /* ignore */ }
}
loadPhrases();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.bakuscribe_wake_phrases) loadPhrases();
});

function notify(type, payload) {
  try { chrome.runtime.sendMessage({ type, ...payload }); } catch (_) { /* worker may be asleep */ }
}

function start() {
  const Ctor = self.SpeechRecognition || self.webkitSpeechRecognition;
  if (!Ctor) { notify("BAKUSCRIBE_WAKE_ERROR", { error: "no-speech-api" }); return; }
  if (rec) return;
  stopped = false;
  rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.lang = navigator.language || "en-US";

  rec.onstart = () => notify("BAKUSCRIBE_WAKE_STATE", { listening: true });
  rec.onerror = (e) => {
    const err = (e && e.error) || "unknown";
    if (err === "not-allowed" || err === "service-not-allowed") {
      stopped = true;
      notify("BAKUSCRIBE_WAKE_ERROR", { error: "not-allowed" });
    } else if (err !== "no-speech" && err !== "aborted") {
      notify("BAKUSCRIBE_WAKE_ERROR", { error: err });
    }
  };
  rec.onend = () => {
    notify("BAKUSCRIBE_WAKE_STATE", { listening: false });
    const prev = rec;
    rec = null;
    if (!stopped) setTimeout(() => { if (!stopped) start(); }, 500);
  };
  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = (event.results[i][0] && event.results[i][0].transcript || "").toLowerCase().trim();
      if (!transcript) continue;
      const match = phrases.find((p) => transcript.includes(p));
      if (match) {
        const idx = transcript.indexOf(match);
        const tail = transcript.slice(idx + match.length).replace(/^[,.\s]+/, "").trim();
        notify("BAKUSCRIBE_WAKE", { command: tail || null, transcript });
      }
    }
  };

  try { rec.start(); }
  catch (e) { notify("BAKUSCRIBE_WAKE_ERROR", { error: String(e && e.message || e) }); }
}

function stop() {
  stopped = true;
  try { rec && rec.stop(); } catch (_) {}
  rec = null;
}

// Ask for mic permission once (required before recognition will produce audio).
async function primeMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (_) { return false; }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== "offscreen") return;
  if (msg.type === "WAKE_START") { primeMic().then((ok) => { if (ok) start(); else notify("BAKUSCRIBE_WAKE_ERROR", { error: "not-allowed" }); }); sendResponse({ ok: true }); return true; }
  if (msg.type === "WAKE_STOP") { stop(); sendResponse({ ok: true }); return; }
});

// Auto-start when document loads — background only creates it when enabled.
start();
