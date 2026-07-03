// Baku Scribe Toolbox — content script.
// Floating "Save as scratchpad" pill when a user highlights ≥ 8 chars on any
// page. Works whether or not the side panel is open — only needs an active
// Baku Scribe session held by the background service worker.

(() => {
  if (window.__pendragonxToolboxHighlight) return;
  window.__pendragonxToolboxHighlight = true;

  const MAX_LEN = 500;
  const MIN_LEN = 8;
  const PILL_ID = "pendragonx-scratchpad-pill";
  const LOG = (...a) => console.debug("[Baku Scribe Toolbox]", ...a);
  LOG("highlight-capture loaded on", location.href);

  let lastSelectionText = "";
  let pendingTimer = null;

  function removePill() {
    const el = document.getElementById(PILL_ID);
    if (el) el.remove();
  }

  function makePill(rect, text) {
    removePill();
    const pill = document.createElement("div");
    pill.id = PILL_ID;
    // Position above the selection; fall back to below if near top.
    const top = rect.top - 44 < 8 ? rect.bottom + 8 : rect.top - 44;
    const left = Math.max(8, Math.min(window.innerWidth - 220, rect.left + rect.width / 2 - 100));
    pill.style.cssText = [
      "all:initial",
      "position:fixed",
      `left:${left}px`,
      `top:${top}px`,
      "z-index:2147483647",
      "background:#0f0f12",
      "color:#fff",
      "font:600 12px/1.2 'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
      "padding:9px 14px",
      "border-radius:9999px",
      "box-shadow:0 8px 28px rgba(0,0,0,.35), 0 0 0 1px rgba(167,139,250,.4)",
      "cursor:pointer",
      "user-select:none",
      "display:inline-flex",
      "align-items:center",
      "gap:8px",
    ].join(";");

    const len = text.length;
    const truncated = len > MAX_LEN;
    pill.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a78bfa;box-shadow:0 0 8px #a78bfa"></span>
      <span>Save as Scratchpad${truncated ? ` (first ${MAX_LEN})` : ""}</span>
      <span style="opacity:.55;font-weight:500">${len}c</span>
    `;
    // Prevent the click from clearing the selection before we read it.
    pill.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
    pill.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const payload = text.slice(0, MAX_LEN);
      pill.innerHTML = `<span>Saving…</span>`;
      try {
        const res = await chrome.runtime.sendMessage({
          type: "PENDRAGONX_SAVE_SCRATCHPAD",
          content: payload,
          source_url: location.href,
          source_title: document.title,
        });
        LOG("save result", res);
        pill.style.background = res?.ok ? "#16a34a" : "#dc2626";
        pill.innerHTML = res?.ok
          ? `<span>✓ Saved to Baku Scribe Scratchpad</span>`
          : `<span>${res?.error === "sign in" ? "Sign in to Baku Scribe first" : "Failed: " + (res?.error || "unknown")}</span>`;
        setTimeout(removePill, 1900);
      } catch (err) {
        LOG("save error", err);
        pill.style.background = "#dc2626";
        pill.innerText = "Could not save (open the Toolbox)";
        setTimeout(removePill, 2000);
      }
    });
    document.body.appendChild(pill);
  }

  function handleSelectionEnd() {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (!text || text.length < MIN_LEN) {
      removePill();
      lastSelectionText = "";
      return;
    }
    if (text === lastSelectionText && document.getElementById(PILL_ID)) return;
    lastSelectionText = text;
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return;
      makePill(rect, text);
    } catch (e) {
      LOG("range error", e);
    }
  }

  function schedule() {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(handleSelectionEnd, 120);
  }

  // Mouse + keyboard + selectionchange — covers all common selection paths.
  document.addEventListener("mouseup", schedule, true);
  document.addEventListener("keyup", (e) => {
    if (e.shiftKey || e.key === "Shift" || e.key.startsWith("Arrow") || (e.ctrlKey && e.key.toLowerCase() === "a")) {
      schedule();
    }
  }, true);
  document.addEventListener("selectionchange", schedule);
  document.addEventListener("mousedown", (e) => {
    if (e.target instanceof Element && e.target.closest(`#${PILL_ID}`)) return;
    removePill();
    lastSelectionText = "";
  }, true);
  window.addEventListener("scroll", removePill, { passive: true });
  window.addEventListener("blur", removePill);
})();
