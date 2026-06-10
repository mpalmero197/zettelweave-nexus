// PendragonX Toolbox — Macro Runner
// Injected by background.js when a saved macro is replayed. Walks the
// step list, waiting up to 8s for each selector to appear before acting.
// Reports progress + final status back to background.

(() => {
  if (window.__pendragonxRunnerActive) return;
  window.__pendragonxRunnerActive = true;

  const OVERLAY_ID = "pendragonx-runner-overlay";
  const PER_STEP_TIMEOUT_MS = 8000;
  const HUMAN_DELAY_MS = () => 80 + Math.floor(Math.random() * 120);

  function makeOverlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.style.cssText = [
      "all:initial",
      "position:fixed",
      "right:14px",
      "top:14px",
      "z-index:2147483647",
      "background:#0f0f12",
      "color:#fff",
      "font:600 12px/1.2 'Inter',-apple-system,system-ui,sans-serif",
      "padding:10px 12px",
      "border-radius:14px",
      "box-shadow:0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(167,139,250,.5)",
      "display:flex",
      "align-items:center",
      "gap:10px",
    ].join(";");
    el.innerHTML = `
      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#a78bfa;box-shadow:0 0 10px #a78bfa;animation:pendragonx-run-pulse 1.2s infinite"></span>
      <span data-pendragonx-run-label>ALICE running…</span>
      <button data-pendragonx-run-stop style="all:initial;cursor:pointer;background:#ef4444;color:#fff;padding:4px 8px;border-radius:8px;font:600 11px/1 'Inter',sans-serif">Stop</button>
    `;
    const style = document.createElement("style");
    style.textContent = `@keyframes pendragonx-run-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }`;
    document.documentElement.appendChild(style);
    el.querySelector("[data-pendragonx-run-stop]")?.addEventListener("click", () => {
      window.__pendragonxRunnerCancelled = true;
    });
    document.body.appendChild(el);
    return el;
  }

  function updateOverlay(text) {
    const el = makeOverlay();
    const label = el.querySelector("[data-pendragonx-run-label]");
    if (label) label.textContent = text;
  }

  function removeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function waitForSelector(selector, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch {}
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

  async function runStep(step) {
    const el = await resolveElement(step);
    if (!el) throw new Error(`Could not find element for step '${step.action}' (${step.selector || step.text || "?"})`);
    el.scrollIntoView({ block: "center", behavior: "instant" });
    await sleep(HUMAN_DELAY_MS());
    switch (step.action) {
      case "click":
        el.click();
        break;
      case "fill":
        if (step.sensitive) {
          // Skip filling sensitive fields; surface a clear notice.
          throw new Error("Step requires a sensitive value (e.g. password). Macros never store these.");
        }
        nativeSet(el, step.value ?? "");
        break;
      case "select":
        if (el instanceof HTMLSelectElement) {
          el.value = step.value ?? "";
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      case "press_enter": {
        const ev = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true });
        el.dispatchEvent(ev);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          // Also try form submit shortcut
          el.form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
        break;
      }
      case "submit":
        if (el instanceof HTMLFormElement) el.requestSubmit?.() ?? el.submit?.();
        break;
      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  async function runAll(steps, runId) {
    makeOverlay();
    let idx = 0;
    try {
      for (const step of steps) {
        if (window.__pendragonxRunnerCancelled) throw new Error("Cancelled by user");
        idx += 1;
        updateOverlay(`Step ${idx}/${steps.length} — ${step.action}`);
        chrome.runtime.sendMessage({ type: "PENDRAGONX_RUN_PROGRESS", runId, currentStep: idx, total: steps.length }, () => {});
        try {
          await runStep(step);
        } catch (err) {
          // If navigation kicked in between locate and act, retry once after settle.
          await sleep(800);
          await runStep(step);
        }
        await sleep(HUMAN_DELAY_MS());
      }
      updateOverlay("✓ Done");
      chrome.runtime.sendMessage({ type: "PENDRAGONX_RUN_DONE", runId, status: "succeeded" }, () => {});
      setTimeout(removeOverlay, 1800);
    } catch (err) {
      updateOverlay(`✗ Failed: ${err?.message || err}`);
      chrome.runtime.sendMessage({
        type: "PENDRAGONX_RUN_DONE",
        runId,
        status: "failed",
        error: String(err?.message || err),
        atStep: idx,
      }, () => {});
      setTimeout(removeOverlay, 4000);
    } finally {
      window.__pendragonxRunnerActive = false;
    }
  }

  // Receive run instructions from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "PENDRAGONX_RUN_START" && Array.isArray(msg.steps)) {
      runAll(msg.steps, msg.runId);
    } else if (msg?.type === "PENDRAGONX_RUN_CANCEL") {
      window.__pendragonxRunnerCancelled = true;
    }
  });

  // Auto-start if background pre-seeded steps via window injection
  if (window.__pendragonxPendingRun) {
    const { steps, runId } = window.__pendragonxPendingRun;
    delete window.__pendragonxPendingRun;
    runAll(steps, runId);
  } else {
    // Tell background we're ready and ask for the queued run for this tab.
    chrome.runtime.sendMessage({ type: "PENDRAGONX_RUN_READY" }, (resp) => {
      if (resp?.steps && resp?.runId) runAll(resp.steps, resp.runId);
    });
  }
})();
