// PendragonX Toolbox — content script.
// When the user highlights text on any page, show a small floating pill
// offering to save the selection as a Scratchpad entry (napkin-sized capture).
// The Toolbox side panel does NOT need to be open — we just need a logged-in
// user session, which the background service worker holds.

(() => {
  if (window.__pendragonxToolboxHighlight) return;
  window.__pendragonxToolboxHighlight = true;

  const MAX_LEN = 500; // matches the Scratchpad napkin limit
  const PILL_ID = "pendragonx-scratchpad-pill";

  let lastSelectionText = "";

  function removePill() {
    const el = document.getElementById(PILL_ID);
    if (el) el.remove();
  }

  function makePill(x, y, text) {
    removePill();
    const pill = document.createElement("div");
    pill.id = PILL_ID;
    pill.style.cssText = [
      "position:fixed",
      `left:${Math.max(8, x)}px`,
      `top:${Math.max(8, y)}px`,
      "z-index:2147483647",
      "background:#111",
      "color:#fff",
      "font:500 12px/1 'Inter',system-ui,sans-serif",
      "padding:8px 12px",
      "border-radius:9999px",
      "box-shadow:0 6px 24px rgba(0,0,0,.25)",
      "cursor:pointer",
      "user-select:none",
      "display:flex",
      "align-items:center",
      "gap:8px",
      "border:1px solid rgba(255,255,255,.08)",
    ].join(";");

    const len = text.length;
    const truncated = len > MAX_LEN;
    pill.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a78bfa"></span>
      <span>Save as scratchpad${truncated ? ` (first ${MAX_LEN} chars)` : ""}</span>
      <span style="opacity:.5;font-size:10px;margin-left:4px">${len}c</span>
    `;
    pill.addEventListener("mousedown", (e) => e.preventDefault());
    pill.addEventListener("click", async () => {
      const payload = text.slice(0, MAX_LEN);
      try {
        const res = await chrome.runtime.sendMessage({
          type: "PENDRAGONX_SAVE_SCRATCHPAD",
          content: payload,
          source_url: location.href,
          source_title: document.title,
        });
        pill.style.background = res?.ok ? "#16a34a" : "#dc2626";
        pill.innerText = res?.ok ? "Saved to Scratchpad ✓" : `Failed: ${res?.error || "sign in"}`;
        setTimeout(removePill, 1600);
      } catch (err) {
        pill.style.background = "#dc2626";
        pill.innerText = "Could not save";
        setTimeout(removePill, 1600);
      }
    });
    document.body.appendChild(pill);
  }

  document.addEventListener("selectionchange", () => {
    // Debounce — only act on mouseup/keyup to avoid flicker
  });

  function handleSelectionEnd() {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (!text || text.length < 8) {
      removePill();
      lastSelectionText = "";
      return;
    }
    if (text === lastSelectionText) return;
    lastSelectionText = text;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 80;
    const y = rect.top - 40;
    makePill(x, y < 8 ? rect.bottom + 8 : y, text);
  }

  document.addEventListener("mouseup", () => setTimeout(handleSelectionEnd, 10));
  document.addEventListener("keyup", (e) => {
    if (e.shiftKey || e.key === "Shift") setTimeout(handleSelectionEnd, 10);
  });
  document.addEventListener("mousedown", (e) => {
    if (e.target instanceof Element && e.target.closest(`#${PILL_ID}`)) return;
    removePill();
    lastSelectionText = "";
  });
  window.addEventListener("scroll", removePill, { passive: true });
})();
