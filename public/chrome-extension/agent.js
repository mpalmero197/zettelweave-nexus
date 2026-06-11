// PendragonX — Autonomous browser agent runner (in-page)
// Injected by background.js when a run is approved. Loops:
//   1. snapshot DOM → send to background
//   2. background → alice-agent-step edge fn → returns one action
//   3. execute action (click/fill/scroll/navigate/wait)
//   4. repeat until done / paused / stopped
//
// Safety: NEVER fills password or [autocomplete*=cc-] fields.
(() => {
  if (window.__pendragonxAgentActive) return;
  window.__pendragonxAgentActive = true;

  const OVERLAY_ID = "pendragonx-agent-overlay";
  const HUMAN_DELAY = () => 200 + Math.floor(Math.random() * 200);

  function overlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.style.cssText = "all:initial;position:fixed;right:14px;top:14px;z-index:2147483647;background:#0f0f12;color:#fff;font:600 12px/1.3 'Inter',-apple-system,sans-serif;padding:10px 14px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 0 1px rgba(167,139,250,.5);display:flex;align-items:center;gap:10px;max-width:340px";
    el.innerHTML = `
      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#a78bfa;box-shadow:0 0 10px #a78bfa"></span>
      <span data-agent-label style="flex:1">ALICE is thinking…</span>
      <button data-agent-stop style="all:initial;cursor:pointer;background:#ef4444;color:#fff;padding:4px 10px;border-radius:8px;font:600 11px/1 'Inter',sans-serif">Stop</button>`;
    el.querySelector("[data-agent-stop]")?.addEventListener("click", () => {
      window.__pendragonxAgentCancelled = true;
      label("Stopping…");
    });
    document.body.appendChild(el);
    return el;
  }
  function label(t) { const o = overlay(); const l = o.querySelector("[data-agent-label]"); if (l) l.textContent = t; }
  function removeOverlay() { document.getElementById(OVERLAY_ID)?.remove(); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Build a unique-ish stable selector for an element.
  function selectorFor(el) {
    if (el.dataset?.testid) return `[data-testid="${CSS.escape(el.dataset.testid)}"]`;
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) return `#${CSS.escape(el.id)}`;
    if (el.name && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
      return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
    }
    // Fallback: tag + role + truncated text
    const txt = (el.innerText || el.value || "").trim().slice(0, 40);
    if (txt && el.tagName) {
      const tag = el.tagName.toLowerCase();
      return `${tag}::pendragonx-text="${txt}"`; // resolved by findBySelector
    }
    return null;
  }

  function findBySelector(sel) {
    if (!sel) return null;
    const m = sel.match(/^([a-z0-9]+)::pendragonx-text="(.+)"$/);
    if (m) {
      const [, tag, txt] = m;
      const els = document.querySelectorAll(tag);
      for (const e of els) {
        const t = (e.innerText || e.value || "").trim();
        if (t === txt || t.startsWith(txt)) return e;
      }
      return null;
    }
    try { return document.querySelector(sel); } catch { return null; }
  }

  function isSensitive(el) {
    if (el.type === "password") return true;
    const ac = (el.autocomplete || "").toLowerCase();
    if (ac.startsWith("cc-") || ac === "new-password" || ac === "current-password") return true;
    return false;
  }

  function visibleAndInteractive(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    if (r.bottom < 0 || r.top > window.innerHeight + 800) return false; // a bit beyond viewport
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return false;
    return true;
  }

  function snapshot() {
    const interactive = [];
    const selector = 'a[href], button, [role="button"], [role="link"], input:not([type="hidden"]), select, textarea, [contenteditable="true"]';
    const nodes = Array.from(document.querySelectorAll(selector));
    let idx = 0;
    for (const el of nodes) {
      if (!visibleAndInteractive(el)) continue;
      if (idx >= 120) break;
      const sel = selectorFor(el);
      if (!sel) continue;
      const tag = el.tagName.toLowerCase();
      const name = (el.getAttribute("aria-label") || el.innerText || el.value || el.placeholder || el.title || "").trim().replace(/\s+/g, " ").slice(0, 120);
      interactive.push({
        idx, tag,
        role: el.getAttribute("role") || undefined,
        type: el.type || undefined,
        name,
        selector: sel,
        sensitive: isSensitive(el) || undefined,
      });
      idx++;
    }
    // visible text
    const main = document.querySelector("main, article, [role=main]") || document.body;
    const text = (main.innerText || "").replace(/\s+/g, " ").trim().slice(0, 6000);
    return { url: location.href, title: document.title, visible_text: text, interactive };
  }

  function nativeSet(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function execAction(action) {
    if (action.action === "scroll") {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
      await sleep(600);
      return { ok: true };
    }
    if (action.action === "wait") { await sleep(1500); return { ok: true }; }
    if (action.action === "navigate" && action.url) {
      location.href = action.url;
      await sleep(1500);
      return { ok: true, navigated: true };
    }
    if (!action.selector) return { ok: false, error: "No selector" };
    const el = findBySelector(action.selector);
    if (!el) return { ok: false, error: "Element not found" };
    el.scrollIntoView({ block: "center", behavior: "instant" });
    await sleep(HUMAN_DELAY());
    if (action.action === "click") {
      if (isSensitive(el)) return { ok: false, error: "Refused: sensitive element" };
      el.click();
      return { ok: true };
    }
    if (action.action === "fill") {
      if (isSensitive(el)) return { ok: false, error: "Refused: sensitive field" };
      nativeSet(el, action.value ?? "");
      return { ok: true };
    }
    return { ok: false, error: `Unknown action ${action.action}` };
  }

  async function loop(runId) {
    overlay();
    let consecutiveSameUrl = 0;
    let lastUrl = "";
    for (let i = 0; i < 50; i++) {
      if (window.__pendragonxAgentCancelled) {
        chrome.runtime.sendMessage({ type: "PENDRAGONX_AGENT_CANCEL", runId });
        label("✗ Stopped");
        setTimeout(removeOverlay, 1500);
        return;
      }
      await sleep(800); // settle
      const snap = snapshot();
      if (snap.url === lastUrl) consecutiveSameUrl++; else consecutiveSameUrl = 0;
      lastUrl = snap.url;
      label(`Thinking… (step ${i + 1})`);

      const resp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "PENDRAGONX_AGENT_DECIDE", runId, snapshot: snap }, resolve);
      });
      if (!resp?.ok || !resp.action) {
        label(`✗ ${resp?.error || "Error"}`);
        setTimeout(removeOverlay, 3000);
        return;
      }
      const action = resp.action;
      label(`${action.action}${action.target_idx != null ? ` #${action.target_idx}` : ""} — ${(action.reasoning || "").slice(0, 60)}`);

      if (action.action === "done") { label("✓ Done"); setTimeout(removeOverlay, 2500); return; }
      if (action.action === "stop") { label(`✗ ${action.reasoning || "Stopped"}`); setTimeout(removeOverlay, 4000); return; }
      if (action.action === "pause_for_user") {
        label(`⏸ ${action.reasoning || "Needs you"} — I'll resume when ready`);
        chrome.runtime.sendMessage({ type: "PENDRAGONX_AGENT_PAUSED", runId, reason: action.reasoning });
        return; // background will re-inject when user resumes
      }
      const result = await execAction(action);
      if (!result.ok) {
        label(`✗ ${result.error}`);
        chrome.runtime.sendMessage({ type: "PENDRAGONX_AGENT_ERROR", runId, error: result.error });
        setTimeout(removeOverlay, 3000);
        return;
      }
      if (result.navigated) return; // page will reload, background re-injects
    }
    label("✗ Step cap reached");
    setTimeout(removeOverlay, 3000);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "PENDRAGONX_AGENT_START" && msg.runId) loop(msg.runId);
    if (msg?.type === "PENDRAGONX_AGENT_STOP") window.__pendragonxAgentCancelled = true;
  });

  // Auto-start if background pre-seeded
  chrome.runtime.sendMessage({ type: "PENDRAGONX_AGENT_READY" }, (resp) => {
    if (resp?.runId) loop(resp.runId);
  });
})();
