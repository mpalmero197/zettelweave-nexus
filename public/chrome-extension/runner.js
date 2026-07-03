// Baku Scribe Toolbox — Macro Runner v2
// Walks the macro step list, resolves {{vault.*}} and {{var.*}} tokens at
// runtime, handles ask/pause overlays, and on a hard failure calls the
// alice-repair-macro-step edge function to fix the step using the live DOM.

(() => {
  if (window.__bakuscribeRunnerActive) return;
  window.__bakuscribeRunnerActive = true;

  const OVERLAY_ID = "bakuscribe-runner-overlay";
  const PER_STEP_TIMEOUT_MS = 8000;
  const HUMAN_DELAY_MS = () => 80 + Math.floor(Math.random() * 120);

  // Per-run variable bag (populated by ask steps and vault-pick fallback).
  window.__bakuscribeRunVars = window.__bakuscribeRunVars || {};
  const runVars = window.__bakuscribeRunVars;
  let currentMacroId = null;

  // ── Overlay ────────────────────────────────────────────────────────────
  function makeOverlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.style.cssText = [
      "all:initial","position:fixed","right:14px","top:14px","z-index:2147483647",
      "background:#0f0f12","color:#fff",
      "font:600 12px/1.2 'Inter',-apple-system,system-ui,sans-serif",
      "padding:10px 12px","border-radius:14px",
      "box-shadow:0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(167,139,250,.5)",
      "display:flex","align-items:center","gap:10px",
    ].join(";");
    el.innerHTML = `
      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#a78bfa;box-shadow:0 0 10px #a78bfa;animation:bakuscribe-run-pulse 1.2s infinite"></span>
      <span data-bakuscribe-run-label>ALICE running…</span>
      <button data-bakuscribe-run-stop style="all:initial;cursor:pointer;background:#ef4444;color:#fff;padding:4px 8px;border-radius:8px;font:600 11px/1 'Inter',sans-serif">Stop</button>
    `;
    const style = document.createElement("style");
    style.textContent = `@keyframes bakuscribe-run-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }`;
    document.documentElement.appendChild(style);
    el.querySelector("[data-bakuscribe-run-stop]")?.addEventListener("click", () => {
      window.__bakuscribeRunnerCancelled = true;
    });
    document.body.appendChild(el);
    return el;
  }
  function updateOverlay(text) {
    const el = makeOverlay();
    const label = el.querySelector("[data-bakuscribe-run-label]");
    if (label) label.textContent = text;
  }
  function removeOverlay() { document.getElementById(OVERLAY_ID)?.remove(); }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function waitForSelector(selector, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try { const el = document.querySelector(selector); if (el) return el; } catch {}
      await sleep(120);
    }
    return null;
  }

  function findByText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    const candidates = document.querySelectorAll("button, a, [role='button'], [role='link'], input[type='submit']");
    for (const el of candidates) {
      const t = (el.innerText || el.textContent || el.value || "").trim().toLowerCase();
      if (t && (t === lower || t.startsWith(lower))) return el;
    }
    return null;
  }

  async function resolveElement(step) {
    let el = step.selector ? await waitForSelector(step.selector, PER_STEP_TIMEOUT_MS) : null;
    if (!el && step.text) el = findByText(step.text);
    return el;
  }

  function nativeSet(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function highlightEl(el) {
    const prev = el.style.cssText;
    el.style.cssText = prev + ";outline:3px solid #a78bfa !important;outline-offset:2px;box-shadow:0 0 0 6px rgba(167,139,250,.25) !important;transition:outline .2s";
    return () => { try { el.style.cssText = prev; } catch {} };
  }

  // ── Vault & var token substitution ─────────────────────────────────────
  const VAULT_RE = /\{\{vault(?::"([^"]+)")?\.(username|password|otp|email)\}\}/g;
  const VAR_RE = /\{\{var\.([a-zA-Z0-9_]+)\}\}/g;

  function hasVaultToken(s) { return typeof s === "string" && /\{\{vault[^}]*\}\}/.test(s); }
  function hasVarToken(s) { return typeof s === "string" && VAR_RE.test(s); }

  function substituteVars(s) {
    if (typeof s !== "string") return s;
    return s.replace(VAR_RE, (_m, name) => (runVars[name] != null ? String(runVars[name]) : _m));
  }

  // Ask background → Baku Scribe tab → in-page vault for a credential.
  // Returns { ok, fields?: {username,password,otp,email}, locked?, options?: [{id,label,host}] }
  async function requestVaultCredential(host, opts = {}) {
    return new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, error: "Vault timed out — open the Baku Scribe app and unlock the vault." }); } }, 12000);
      try {
        chrome.runtime.sendMessage(
          { type: "BAKUSCRIBE_VAULT_REQUEST_CREDENTIAL", host, itemTitle: opts.itemTitle || null, itemId: opts.itemId || null },
          (resp) => {
            if (done) return;
            done = true; clearTimeout(t);
            resolve(resp || { ok: false, error: "No vault response" });
          }
        );
      } catch (e) { done = true; clearTimeout(t); resolve({ ok: false, error: String(e?.message || e) }); }
    });
  }

  function vaultPickOverlay(options) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("div");
      el.style.cssText = "all:initial;position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;background:#0f0f12;color:#fff;font:600 13px/1.4 'Inter',-apple-system,sans-serif;padding:14px 16px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 0 1px rgba(167,139,250,.6);max-width:420px;display:flex;flex-direction:column;gap:10px";
      const optsHtml = options.map((o, i) => `<label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:rgba(255,255,255,.04);cursor:pointer"><input type="radio" name="pxv" value="${i}" ${i===0?"checked":""}><span style="font-weight:600">${(o.label||"Untitled").replace(/[<>&]/g,"")}</span>${o.host?`<span style="margin-left:auto;color:#9aa0aa;font-size:11px">${o.host}</span>`:""}</label>`).join("");
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px"><span style="width:9px;height:9px;border-radius:50%;background:#a78bfa;box-shadow:0 0 10px #a78bfa"></span><strong>Which saved login?</strong></div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto">${optsHtml}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button data-cancel style="all:initial;cursor:pointer;background:transparent;color:#9aa0aa;padding:6px 10px;border-radius:8px;font:600 12px/1 'Inter',sans-serif">Cancel</button>
          <button data-ok style="all:initial;cursor:pointer;background:#a78bfa;color:#0f0f12;padding:8px 14px;border-radius:10px;font:700 12px/1 'Inter',sans-serif">Use this login</button>
        </div>`;
      el.querySelector("[data-ok]").addEventListener("click", () => {
        const i = Number(el.querySelector("input[name=pxv]:checked")?.value || 0);
        el.remove(); resolve(options[i]);
      });
      el.querySelector("[data-cancel]").addEventListener("click", () => { el.remove(); reject(new Error("Vault picker cancelled")); });
      document.body.appendChild(el);
    });
  }

  async function resolveVaultTokens(rawValue) {
    if (!hasVaultToken(rawValue)) return rawValue;
    const host = location.hostname.replace(/^www\./, "");
    let cache = null; // { fields }
    const out = await replaceAsync(rawValue, VAULT_RE, async (_m, itemTitle, field) => {
      if (!cache) {
        let resp = await requestVaultCredential(host, { itemTitle });
        if (resp?.locked) throw new Error("Vault is locked. Open Baku Scribe → Vault, unlock it, then click Continue.");
        if (resp?.needsPick && Array.isArray(resp.options)) {
          const pick = await vaultPickOverlay(resp.options);
          resp = await requestVaultCredential(host, { itemId: pick.id });
        }
        if (!resp?.ok || !resp.fields) throw new Error(resp?.error || "No vault item matches this site. Save a login in Baku Scribe → Vault first.");
        cache = resp.fields;
      }
      const v = cache[field];
      if (v == null || v === "") throw new Error(`Vault item has no ${field}`);
      return String(v);
    });
    return out;
  }

  async function replaceAsync(str, regex, asyncFn) {
    const parts = [];
    let last = 0;
    const matches = [...str.matchAll(regex)];
    for (const m of matches) {
      parts.push(str.slice(last, m.index));
      parts.push(await asyncFn(...m));
      last = m.index + m[0].length;
    }
    parts.push(str.slice(last));
    return parts.join("");
  }

  // ── Pause / Ask overlays ───────────────────────────────────────────────
  function pauseOverlay(prompt) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("div");
      el.style.cssText = "all:initial;position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;background:#0f0f12;color:#fff;font:600 13px/1.4 'Inter',-apple-system,sans-serif;padding:14px 16px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 0 1px rgba(167,139,250,.6);max-width:380px;display:flex;flex-direction:column;gap:10px";
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px"><span style="width:9px;height:9px;border-radius:50%;background:#a78bfa;box-shadow:0 0 10px #a78bfa"></span><strong>ALICE paused</strong></div>
        <div data-msg style="font-weight:500;color:#e9e9ef"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button data-cancel style="all:initial;cursor:pointer;background:transparent;color:#9aa0aa;padding:6px 10px;border-radius:8px;font:600 12px/1 'Inter',sans-serif">Cancel</button>
          <button data-continue style="all:initial;cursor:pointer;background:#a78bfa;color:#0f0f12;padding:8px 14px;border-radius:10px;font:700 12px/1 'Inter',sans-serif">Continue ▶</button>
        </div>`;
      el.querySelector("[data-msg]").textContent = prompt || "Fill in the highlighted field, then continue.";
      el.querySelector("[data-continue]").addEventListener("click", () => { el.remove(); resolve(); });
      el.querySelector("[data-cancel]").addEventListener("click", () => { el.remove(); reject(new Error("Paused step cancelled by user")); });
      document.body.appendChild(el);
    });
  }

  function askOverlay(prompt, options) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("div");
      el.style.cssText = "all:initial;position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;background:#0f0f12;color:#fff;font:600 13px/1.4 'Inter',-apple-system,sans-serif;padding:14px 16px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 0 1px rgba(167,139,250,.6);max-width:420px;display:flex;flex-direction:column;gap:10px";
      const optsHtml = options.map((o, i) => `<label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:rgba(255,255,255,.04);cursor:pointer"><input type="radio" name="pxa" value="${i}" ${i===0?"checked":""}><span>${String(o).replace(/[<>&]/g,"")}</span></label>`).join("");
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px"><span style="width:9px;height:9px;border-radius:50%;background:#a78bfa;box-shadow:0 0 10px #a78bfa"></span><strong>ALICE needs your input</strong></div>
        <div data-msg style="font-weight:500;color:#e9e9ef"></div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto">${optsHtml}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button data-cancel style="all:initial;cursor:pointer;background:transparent;color:#9aa0aa;padding:6px 10px;border-radius:8px;font:600 12px/1 'Inter',sans-serif">Cancel</button>
          <button data-ok style="all:initial;cursor:pointer;background:#a78bfa;color:#0f0f12;padding:8px 14px;border-radius:10px;font:700 12px/1 'Inter',sans-serif">Continue ▶</button>
        </div>`;
      el.querySelector("[data-msg]").textContent = prompt || "Pick one:";
      el.querySelector("[data-ok]").addEventListener("click", () => {
        const i = Number(el.querySelector("input[name=pxa]:checked")?.value || 0);
        el.remove(); resolve(options[i]);
      });
      el.querySelector("[data-cancel]").addEventListener("click", () => { el.remove(); reject(new Error("Ask cancelled")); });
      document.body.appendChild(el);
    });
  }

  // ── DOM snapshot for repair ────────────────────────────────────────────
  function describeEl(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    if (rect.bottom < 0 || rect.top > (window.innerHeight + 200)) return null;
    const id = el.id || "";
    const name = el.getAttribute("name") || "";
    const aria = el.getAttribute("aria-label") || "";
    const role = el.getAttribute("role") || "";
    const type = el.getAttribute("type") || "";
    const placeholder = el.getAttribute("placeholder") || "";
    const text = (el.innerText || el.textContent || el.value || "").trim().slice(0, 80);
    let selector = el.tagName.toLowerCase();
    if (id) selector = `#${CSS.escape(id)}`;
    else if (name) selector = `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    else if (aria) selector = `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(aria)}"]`;
    return {
      tag: el.tagName.toLowerCase(),
      id: id || undefined, name: name || undefined, type: type || undefined,
      role: role || undefined, ariaLabel: aria || undefined,
      placeholder: placeholder || undefined, text: text || undefined,
      selector,
    };
  }
  function snapshotInteractive() {
    const sel = "input,select,textarea,button,a,[role='button'],[role='link'],[role='textbox'],[contenteditable='true']";
    const list = Array.from(document.querySelectorAll(sel));
    const out = [];
    for (const el of list) { const d = describeEl(el); if (d) out.push(d); if (out.length >= 80) break; }
    return out;
  }

  async function repairStep(step, stepIndex, lastError) {
    if (!currentMacroId) return null;
    const payload = {
      macro_id: currentMacroId,
      step_index: stepIndex,
      step,
      last_error: lastError ? String(lastError.message || lastError) : undefined,
      page: { url: location.href, title: document.title, elements: snapshotInteractive() },
    };
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "BAKUSCRIBE_REPAIR_STEP", payload }, (resp) => {
          if (resp?.ok && resp.step) resolve(resp.step);
          else resolve(null);
        });
      } catch { resolve(null); }
    });
  }

  // ── Step execution ─────────────────────────────────────────────────────
  async function runStep(step) {
    if (step.action === "wait") { await sleep(Math.max(50, Number(step.ms) || 500)); return; }
    if (step.action === "navigate" && step.url) { window.location.href = substituteVars(step.url); return; }
    if (step.action === "navigate_back") { history.back(); return; }
    if (step.action === "reload") { location.reload(); return; }
    if (step.action === "set_var") { if (step.var) runVars[step.var] = substituteVars(String(step.value ?? "")); return; }
    if (step.action === "notify") {
      const msg = substituteVars(step.message || step.text || "");
      try {
        if (typeof Notification !== "undefined") {
          if (Notification.permission !== "granted") { try { await Notification.requestPermission(); } catch {} }
          if (Notification.permission === "granted") new Notification(step.title || "ALICE Macro", { body: msg });
        }
      } catch {}
      try { updateOverlay(msg); } catch {}
      return;
    }
    if (step.action === "copy_to_clipboard") {
      const txt = step.selector
        ? (document.querySelector(step.selector)?.innerText || "")
        : substituteVars(String(step.value ?? ""));
      try { await navigator.clipboard.writeText(txt); } catch {}
      if (step.var) runVars[step.var] = txt;
      return;
    }
    if (step.action === "scroll_window") {
      const target = (step.target || "bottom").toLowerCase();
      window.scrollTo({ top: target === "top" ? 0 : document.body.scrollHeight, behavior: "smooth" });
      return;
    }
    if (step.action === "note" || step.action === "noop") return;
    if (step.action === "pause") {
      let cleanup = null;
      if (step.selector) {
        const el = await waitForSelector(step.selector, 3000);
        if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); cleanup = highlightEl(el); el.focus?.(); }
      }
      try { await pauseOverlay(substituteVars(step.prompt || step.note)); } finally { cleanup?.(); }
      return;
    }
    if (step.action === "ask") {
      const opts = Array.isArray(step.options) && step.options.length ? step.options : ["Yes", "No"];
      const picked = await askOverlay(substituteVars(step.prompt || "Pick one:"), opts);
      if (step.var) runVars[step.var] = picked;
      return;
    }

    const el = await resolveElement(step);
    if (!el) throw new Error(`Could not find element for step '${step.action}' (${step.selector || step.text || "?"})`);
    el.scrollIntoView({ block: "center", behavior: "instant" });
    await sleep(HUMAN_DELAY_MS());

    switch (step.action) {
      case "click":
        el.click();
        break;
      case "fill":
      case "type": {
        let raw = step.value ?? "";
        raw = substituteVars(raw);
        let value = raw;
        if (hasVaultToken(raw)) {
          const cleanup = highlightEl(el);
          try { value = await resolveVaultTokens(raw); } finally { cleanup(); }
        }
        nativeSet(el, value);
        break;
      }
      case "select":
        if (el instanceof HTMLSelectElement) {
          el.value = substituteVars(step.value ?? "");
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      case "press_enter":
      case "press_key": {
        const key = step.value || "Enter";
        const ev = new KeyboardEvent("keydown", { key, code: key, bubbles: true });
        el.dispatchEvent(ev);
        if (key === "Enter" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          el.form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
        break;
      }
      case "submit":
        if (el instanceof HTMLFormElement) el.requestSubmit?.() ?? el.submit?.();
        break;
      case "scroll":
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        break;
      case "hover":
        el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        break;
      case "select_option":
        if (el instanceof HTMLSelectElement) {
          el.value = substituteVars(String(step.value ?? ""));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      case "extract_text": {
        const txt = el.innerText || "";
        if (step.var) runVars[step.var] = txt;
        break;
      }
      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  async function runStepWithRepair(step, idx) {
    try {
      await runStep(step);
      return;
    } catch (err1) {
      // Quick retry after settle (handles navigation race).
      await sleep(800);
      try { await runStep(step); return; } catch (err2) {
        // Ask backend for a fix using live DOM.
        updateOverlay(`Step ${idx} — repairing…`);
        const fixed = await repairStep(step, idx - 1, err2);
        if (fixed) {
          await runStep(fixed);
          return;
        }
        // Fallback: convert to a pause so the user can do it manually.
        await pauseOverlay(`I couldn't ${step.action} "${step.selector || step.text || step.value || ""}". Do this step manually, then continue.`);
      }
    }
  }

  async function runAll(steps, runId, macroId) {
    currentMacroId = macroId || null;
    makeOverlay();
    let idx = 0;
    try {
      for (const step of steps) {
        if (window.__bakuscribeRunnerCancelled) throw new Error("Cancelled by user");
        idx += 1;
        updateOverlay(`Step ${idx}/${steps.length} — ${step.action}`);
        chrome.runtime.sendMessage({ type: "BAKUSCRIBE_RUN_PROGRESS", runId, currentStep: idx, total: steps.length }, () => {});
        await runStepWithRepair(step, idx);
        await sleep(HUMAN_DELAY_MS());
      }
      updateOverlay("✓ Done");
      chrome.runtime.sendMessage({ type: "BAKUSCRIBE_RUN_DONE", runId, macroId, status: "succeeded", runVars }, () => {});
      setTimeout(removeOverlay, 1800);
    } catch (err) {
      updateOverlay(`✗ Failed: ${err?.message || err}`);
      chrome.runtime.sendMessage({
        type: "BAKUSCRIBE_RUN_DONE",
        runId, macroId,
        status: "failed",
        error: String(err?.message || err),
        atStep: idx,
        runVars,
      }, () => {});
      setTimeout(removeOverlay, 4500);
    } finally {
      window.__bakuscribeRunnerActive = false;
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "BAKUSCRIBE_RUN_START" && Array.isArray(msg.steps)) {
      runAll(msg.steps, msg.runId, msg.macroId);
    } else if (msg?.type === "BAKUSCRIBE_RUN_CANCEL") {
      window.__bakuscribeRunnerCancelled = true;
    }
  });

  if (window.__bakuscribePendingRun) {
    const { steps, runId, macroId } = window.__bakuscribePendingRun;
    delete window.__bakuscribePendingRun;
    runAll(steps, runId, macroId);
  } else {
    chrome.runtime.sendMessage({ type: "BAKUSCRIBE_RUN_READY" }, (resp) => {
      if (resp?.steps && resp?.runId) runAll(resp.steps, resp.runId, resp.macroId);
    });
  }
})();
