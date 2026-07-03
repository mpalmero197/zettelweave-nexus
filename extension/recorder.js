// Baku Scribe Toolbox — Macro Recorder
// Injected on demand by the background service worker into the active tab
// (and re-injected after every navigation) while a recording session is
// active. Captures clicks, typing, and submits and forwards each step to
// the background script, which buffers them and persists on Stop.

(() => {
  if (window.__bakuscribeRecorderInstalled) {
    // Re-broadcast presence so the badge re-shows after a navigation.
    try { window.__bakuscribeRecorderShowBadge?.(); } catch {}
    return;
  }
  window.__bakuscribeRecorderInstalled = true;

  const BADGE_ID = "bakuscribe-recorder-badge";
  const LOG = (...a) => console.debug("[Baku Scribe Recorder]", ...a);
  let stepCount = 0;
  let paused = false;

  function isSensitive(el) {
    if (!(el instanceof HTMLElement)) return false;
    const t = (el.getAttribute("type") || "").toLowerCase();
    if (t === "password") return true;
    const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
    if (ac.includes("password") || ac.includes("cc-") || ac.includes("one-time-code")) return true;
    return false;
  }

  // Build a resilient selector with priority:
  //   data-testid → unique id → aria-label+role → CSS path with :nth-of-type
  function buildSelector(el) {
    if (!(el instanceof Element)) return null;
    if (el.getAttribute("data-testid")) {
      return `[data-testid="${cssEscape(el.getAttribute("data-testid"))}"]`;
    }
    if (el.id && document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) {
      return `#${cssEscape(el.id)}`;
    }
    const aria = el.getAttribute("aria-label");
    const role = el.getAttribute("role") || el.tagName.toLowerCase();
    if (aria) {
      const candidate = `${role}[aria-label="${cssEscape(aria)}"]`;
      try {
        if (document.querySelectorAll(candidate).length === 1) return candidate;
      } catch {}
    }
    // CSS path
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 6) {
      let part = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
        if (same.length > 1) {
          const idx = same.indexOf(cur) + 1;
          part += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(part);
      if (parent && parent === document.body) break;
      cur = parent;
    }
    return parts.join(" > ");
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/(["\\\]\[#.:>+~*^$|()=])/g, "\\$1");
  }

  function elementText(el) {
    if (!(el instanceof HTMLElement)) return "";
    const t = (el.innerText || el.textContent || "").trim();
    return t.slice(0, 80);
  }

  function postStep(step) {
    if (paused) return;
    step.url = location.href;
    step.ts = Date.now();
    stepCount += 1;
    updateBadge();
    try {
      chrome.runtime.sendMessage({ type: "BAKUSCRIBE_REC_STEP", step }, () => {});
    } catch {}
  }

  // === Event capture ===
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      // Skip clicks on the badge itself
      if (t.closest(`#${BADGE_ID}`)) return;
      const selector = buildSelector(t);
      if (!selector) return;
      postStep({
        action: "click",
        selector,
        text: elementText(t),
        tag: t.tagName.toLowerCase(),
      });
    },
    true,
  );

  // Debounce input capture per-element: only push the final value when focus
  // moves away (change) or Enter is pressed.
  document.addEventListener(
    "change",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (isSensitive(t)) {
        const sel = buildSelector(t);
        if (sel) postStep({ action: "fill", selector: sel, sensitive: true, value: "" });
        return;
      }
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
        const sel = buildSelector(t);
        if (!sel) return;
        postStep({
          action: "fill",
          selector: sel,
          value: t.value,
          inputType: t instanceof HTMLInputElement ? (t.type || "text") : "textarea",
        });
      } else if (t instanceof HTMLSelectElement) {
        const sel = buildSelector(t);
        if (!sel) return;
        postStep({
          action: "select",
          selector: sel,
          value: t.value,
          label: t.options[t.selectedIndex]?.text || "",
        });
      }
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const sel = buildSelector(t);
      if (!sel) return;
      postStep({ action: "press_enter", selector: sel });
    },
    true,
  );

  document.addEventListener(
    "submit",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLFormElement)) return;
      const sel = buildSelector(t);
      if (!sel) return;
      postStep({ action: "submit", selector: sel });
    },
    true,
  );

  // === Floating badge UI ===
  function makeBadge() {
    let el = document.getElementById(BADGE_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = BADGE_ID;
    el.style.cssText = [
      "all:initial",
      "position:fixed",
      "right:14px",
      "bottom:14px",
      "z-index:2147483647",
      "background:#0f0f12",
      "color:#fff",
      "font:600 12px/1.2 'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
      "padding:10px 12px",
      "border-radius:14px",
      "box-shadow:0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(239,68,68,.5)",
      "display:flex",
      "align-items:center",
      "gap:10px",
    ].join(";");
    el.innerHTML = `
      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 10px #ef4444;animation:bakuscribe-pulse 1.2s infinite"></span>
      <span data-bakuscribe-rec-label>Teaching ALICE — <b data-bakuscribe-rec-count>0</b> steps</span>
      <button data-bakuscribe-rec-pause style="all:initial;cursor:pointer;background:#1f2937;color:#fff;padding:4px 8px;border-radius:8px;font:600 11px/1 'Inter',sans-serif">Pause</button>
      <button data-bakuscribe-rec-stop style="all:initial;cursor:pointer;background:#ef4444;color:#fff;padding:4px 8px;border-radius:8px;font:600 11px/1 'Inter',sans-serif">Stop</button>
    `;
    const style = document.createElement("style");
    style.textContent = `@keyframes bakuscribe-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }`;
    document.documentElement.appendChild(style);
    el.querySelector("[data-bakuscribe-rec-pause]")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      paused = !paused;
      const btn = ev.currentTarget;
      btn.textContent = paused ? "Resume" : "Pause";
      btn.style.background = paused ? "#22c55e" : "#1f2937";
    });
    el.querySelector("[data-bakuscribe-rec-stop]")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      chrome.runtime.sendMessage({ type: "BAKUSCRIBE_REC_STOP_REQUEST" }, () => {});
    });
    document.body.appendChild(el);
    return el;
  }

  function updateBadge() {
    const el = makeBadge();
    const count = el.querySelector("[data-bakuscribe-rec-count]");
    if (count) count.textContent = String(stepCount);
  }

  function removeBadge() {
    const el = document.getElementById(BADGE_ID);
    if (el) el.remove();
  }

  window.__bakuscribeRecorderShowBadge = () => {
    makeBadge();
    chrome.runtime.sendMessage({ type: "BAKUSCRIBE_REC_STATE" }, (resp) => {
      stepCount = resp?.count || 0;
      updateBadge();
    });
  };

  window.__bakuscribeRecorderHide = () => removeBadge();

  // Listen for background-driven badge updates (count, stop)
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "BAKUSCRIBE_REC_COUNT") {
      stepCount = msg.count || 0;
      updateBadge();
    } else if (msg.type === "BAKUSCRIBE_REC_HIDE") {
      removeBadge();
    } else if (msg.type === "BAKUSCRIBE_REC_SHOW") {
      window.__bakuscribeRecorderShowBadge();
    }
  });

  // Initial badge as soon as injected (we're only injected when recording)
  window.__bakuscribeRecorderShowBadge();
})();
