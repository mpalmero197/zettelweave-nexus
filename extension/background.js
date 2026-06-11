// PendragonX extension service worker.
// - Opens the side panel on toolbar click.
// - Periodically sends an open-tabs snapshot to the ALICE backend.
// - Rich right-click context menu: smart-route selection by length,
//   save page as PDF, summarize, save as note/card/task, send to ALICE,
//   define/translate selection, save image/link.

const SUPABASE_URL = "https://sckglgjydlbztxjupbsk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw";
const TAB_INGEST_URL = `${SUPABASE_URL}/functions/v1/ingest-browser-tabs`;
const SUMMARIZE_URL = `${SUPABASE_URL}/functions/v1/summarize-page-to-card`;
const DICTIONARY_URL = `${SUPABASE_URL}/functions/v1/dictionary-lookup`;
const MODIFY_URL = `${SUPABASE_URL}/functions/v1/ai-modify-content`;
const FETCH_URL_URL = `${SUPABASE_URL}/functions/v1/fetch-url-content`;
const AGENT_STEP_URL = `${SUPABASE_URL}/functions/v1/alice-agent-step`;
const TAB_ALARM = "pendragonx_tab_sync";
const AGENT_POLL = "pendragonx_agent_poll";
const APP_URL = "https://pendragonx.com";
const AGENT_QUEUE_KEY = "pendragonx_agent_queue";

// Smart-routing thresholds for the unified "Save selection" item.
const SCRATCHPAD_MAX = 500;   // < 500 chars → scratchpad
const CARD_MAX       = 1500;  // 500–1500 → card; > 1500 → note

function registerContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "pendragonx_root", title: "PendragonX", contexts: ["page", "selection", "link", "image"] });

    // Selection: smart save + explicit overrides + lookups
    chrome.contextMenus.create({ id: "pendragonx_save_smart", parentId: "pendragonx_root", title: "Save selection (auto-route)", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_as", parentId: "pendragonx_root", title: "Save selection as…", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_as_scratch", parentId: "pendragonx_save_as", title: "Scratchpad note", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_as_card",    parentId: "pendragonx_save_as", title: "ZettelCard (AI-summarized)", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_as_note",    parentId: "pendragonx_save_as", title: "Note", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_as_task",    parentId: "pendragonx_save_as", title: "Task", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_define",          parentId: "pendragonx_root", title: "Define selection", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_translate",       parentId: "pendragonx_root", title: "Translate selection to English", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_sep_sel", parentId: "pendragonx_root", type: "separator", contexts: ["selection"] });

    // Page-level
    chrome.contextMenus.create({ id: "pendragonx_summarize_page",  parentId: "pendragonx_root", title: "Summarize page to card", contexts: ["page", "selection", "link"] });
    chrome.contextMenus.create({ id: "pendragonx_page_to_note",    parentId: "pendragonx_root", title: "Save page as Note (full text)", contexts: ["page", "selection", "link"] });
    chrome.contextMenus.create({ id: "pendragonx_page_to_pdf",     parentId: "pendragonx_root", title: "Save page as PDF", contexts: ["page", "selection", "link", "image"] });
    chrome.contextMenus.create({ id: "pendragonx_page_to_task",    parentId: "pendragonx_root", title: "Save page as read-later task", contexts: ["page", "selection"] });
    chrome.contextMenus.create({ id: "pendragonx_send_to_alice",   parentId: "pendragonx_root", title: "Ask ALICE about this page", contexts: ["page", "selection", "link"] });

    // Link items
    chrome.contextMenus.create({ id: "pendragonx_sep_link", parentId: "pendragonx_root", type: "separator", contexts: ["link"] });
    chrome.contextMenus.create({ id: "pendragonx_link_to_task",      parentId: "pendragonx_root", title: "Save link as read-later task", contexts: ["link"] });
    chrome.contextMenus.create({ id: "pendragonx_summarize_link",    parentId: "pendragonx_root", title: "Summarize linked page", contexts: ["link"] });

    // Image items
    chrome.contextMenus.create({ id: "pendragonx_save_image_card",   parentId: "pendragonx_root", title: "Save image as card", contexts: ["image"] });

    // Macro recorder — visibility toggled by syncRecorderMenuVisibility()
    chrome.contextMenus.create({ id: "pendragonx_sep_rec", parentId: "pendragonx_root", type: "separator", contexts: ["page", "selection", "link"] });
    chrome.contextMenus.create({ id: "pendragonx_rec_start", parentId: "pendragonx_root", title: "Teach ALICE this task", contexts: ["page", "selection", "link"] });
    chrome.contextMenus.create({ id: "pendragonx_rec_stop",  parentId: "pendragonx_root", title: "Stop recording & save macro", contexts: ["page", "selection", "link"], visible: false });

    // Footer
    chrome.contextMenus.create({ id: "pendragonx_sep_foot", parentId: "pendragonx_root", type: "separator", contexts: ["page", "selection", "link", "image"] });
    chrome.contextMenus.create({ id: "pendragonx_open_panel", parentId: "pendragonx_root", title: "Open Toolbox side panel", contexts: ["page", "selection", "link", "image"] });
    chrome.contextMenus.create({ id: "pendragonx_open_app",   parentId: "pendragonx_root", title: "Open PendragonX app", contexts: ["page", "selection", "link", "image"] });

    syncRecorderMenuVisibility();
  });
}

async function syncRecorderMenuVisibility() {
  if (!chrome.contextMenus?.update) return;
  try {
    const state = await getRecState();
    const recording = !!state?.active;
    chrome.contextMenus.update("pendragonx_rec_start", { visible: !recording });
    chrome.contextMenus.update("pendragonx_rec_stop",  { visible: recording });
  } catch {}
}

async function notify(tabId, message, ok = true) {
  const shownOnPage = await toast(tabId, message, ok);
  if (shownOnPage) return;
  if (!chrome.notifications?.create) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon-128.png",
    title: ok ? "PendragonX" : "PendragonX needs attention",
    message: String(message).slice(0, 240),
  });
}

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
  if (chrome.alarms) chrome.alarms.create(TAB_ALARM, { periodInMinutes: 1 });
  registerContextMenus();
});
chrome.runtime.onStartup?.addListener(() => registerContextMenus());
registerContextMenus();

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (e) {
    console.warn("sidePanel.open failed", e);
  }
});

chrome.alarms?.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== TAB_ALARM) return;
  await syncOpenTabs().catch((e) => console.warn("[pendragonx] tab sync failed", e));
});

chrome.tabs?.onActivated.addListener(() => debouncedSync());
chrome.tabs?.onUpdated.addListener((_id, info) => { if (info.status === "complete") debouncedSync(); });
chrome.tabs?.onRemoved.addListener(() => debouncedSync());

// ───── Extension messages (from popup) ─────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PENDRAGONX_REGISTER_CONTEXT_MENUS") {
    registerContextMenus();
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type !== "PENDRAGONX_SAVE_SCRATCHPAD") return false;
  (async () => {
    try {
      const token = await getValidToken();
      if (!token) { sendResponse({ ok: false, error: "sign in" }); return; }
      const userId = await getUserId(token);
      if (!userId) { sendResponse({ ok: false, error: "sign in" }); return; }
      const content = String(msg.content || "").slice(0, 500);
      const sourceUrl = String(msg.source_url || "");
      const sourceTitle = String(msg.source_title || "");
      const body = sourceUrl ? `${content}\n\n— from ${sourceTitle || sourceUrl}\n${sourceUrl}` : content;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scratchpad_notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`, Prefer: "return=minimal",
        },
        body: JSON.stringify({ content: body, user_id: userId }),
      });
      const errorText = res.ok ? undefined : await responseError(res);
      sendResponse({ ok: res.ok, error: errorText });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true;
});

// ════════════════════════════════════════════════════════════════════
// ALICE Macro Recorder + Replayer
// ════════════════════════════════════════════════════════════════════

const REC_STATE_KEY = "pendragonx_rec_state";  // { active, macroId?, steps, startUrl, startTabId }
const RUN_QUEUE_KEY = "pendragonx_run_queue";  // { [tabId]: { runId, steps, macroId } }

async function getRecState() {
  const { [REC_STATE_KEY]: s } = await chrome.storage.session.get(REC_STATE_KEY);
  return s || null;
}
async function setRecState(state) {
  if (state) await chrome.storage.session.set({ [REC_STATE_KEY]: state });
  else await chrome.storage.session.remove(REC_STATE_KEY);
}

async function startRecording(tab) {
  if (!tab?.id || !tab?.url || !/^https?:/i.test(tab.url)) {
    return { ok: false, error: "Open a regular web page first." };
  }
  await setRecState({
    active: true,
    steps: [],
    startUrl: tab.url,
    startTitle: tab.title || "",
    startTabId: tab.id,
    pausedAt: null,
  });
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ["recorder.js"],
    });
  } catch (e) {
    console.warn("recorder inject failed", e);
  }
  return { ok: true };
}

async function stopRecording() {
  const state = await getRecState();
  await setRecState(null);
  // Hide badge on the start tab
  if (state?.startTabId) {
    try {
      await chrome.tabs.sendMessage(state.startTabId, { type: "PENDRAGONX_REC_HIDE" });
    } catch {}
  }
  return state;
}

// Re-inject recorder after navigation while recording (so the badge + capture survive)
chrome.webNavigation?.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const state = await getRecState();
  if (!state?.active) return;
  if (state.startTabId && details.tabId !== state.startTabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId, allFrames: false },
      files: ["recorder.js"],
    });
  } catch {}
});

// Recorder + runner messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;

  // ── Recorder ────────────────────────────────────────────────────
  if (msg.type === "PENDRAGONX_REC_STEP") {
    (async () => {
      const state = await getRecState();
      if (!state?.active) return;
      state.steps.push(msg.step);
      await setRecState(state);
      // broadcast count to active tab
      if (state.startTabId) {
        try { chrome.tabs.sendMessage(state.startTabId, { type: "PENDRAGONX_REC_COUNT", count: state.steps.length }); } catch {}
      }
      // also notify the side panel
      try { chrome.runtime.sendMessage({ type: "PENDRAGONX_REC_COUNT_PANEL", count: state.steps.length }); } catch {}
    })();
    return false;
  }
  if (msg.type === "PENDRAGONX_REC_STATE") {
    (async () => {
      const state = await getRecState();
      sendResponse({ active: !!state?.active, count: state?.steps?.length || 0, startUrl: state?.startUrl });
    })();
    return true;
  }
  if (msg.type === "PENDRAGONX_REC_STOP_REQUEST") {
    (async () => {
      // The side panel listens for this and will prompt the user for a name.
      try { chrome.runtime.sendMessage({ type: "PENDRAGONX_REC_STOP_PROMPT" }); } catch {}
    })();
    return false;
  }
  if (msg.type === "PENDRAGONX_REC_START") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const res = await startRecording(tab);
      syncRecorderMenuVisibility();
      sendResponse(res);
    })();
    return true;
  }
  if (msg.type === "PENDRAGONX_REC_STOP_AND_SAVE") {
    (async () => {
      const state = await stopRecording();
      syncRecorderMenuVisibility();
      if (!state || !state.steps?.length) {
        sendResponse({ ok: false, error: "No steps recorded" });
        return;
      }
      const token = await getValidToken();
      const userId = await getUserId(token);
      if (!token || !userId) { sendResponse({ ok: false, error: "Sign in to PendragonX first" }); return; }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/alice_macros`, {
        method: "POST",
        headers: { ...authJson(token), Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: userId,
          name: String(msg.name || "Untitled macro").slice(0, 120),
          description: msg.description ? String(msg.description).slice(0, 500) : null,
          start_url: state.startUrl,
          steps: state.steps,
        }),
      });
      if (!res.ok) { sendResponse({ ok: false, error: await responseError(res) }); return; }
      const rows = await res.json().catch(() => []);
      sendResponse({ ok: true, macro: rows[0] || null });
    })();
    return true;
  }
  if (msg.type === "PENDRAGONX_REC_CANCEL") {
    stopRecording().then(() => {
      syncRecorderMenuVisibility();
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── Runner ──────────────────────────────────────────────────────
  if (msg.type === "PENDRAGONX_RUN_MACRO") {
    (async () => {
      const token = await getValidToken();
      const userId = await getUserId(token);
      if (!token || !userId) { sendResponse({ ok: false, error: "Sign in first" }); return; }
      const macroId = String(msg.macroId || "");
      if (!macroId) { sendResponse({ ok: false, error: "Missing macro id" }); return; }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/alice_macros?id=eq.${macroId}&select=*`, {
        headers: authJson(token),
      });
      const rows = await r.json().catch(() => []);
      const macro = rows?.[0];
      if (!macro) { sendResponse({ ok: false, error: "Macro not found" }); return; }
      // Create run row
      const runRes = await fetch(`${SUPABASE_URL}/rest/v1/alice_macro_runs`, {
        method: "POST",
        headers: { ...authJson(token), Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: userId,
          macro_id: macroId,
          status: "running",
          total_steps: (macro.steps || []).length,
          initiated_by: msg.initiatedBy || "user",
        }),
      });
      const runRows = await runRes.json().catch(() => []);
      const run = runRows?.[0];
      if (!run) { sendResponse({ ok: false, error: "Could not create run" }); return; }
      // Open start url in a new tab and queue the steps for the runner
      const tab = await chrome.tabs.create({ url: macro.start_url, active: true });
      const queue = (await chrome.storage.session.get(RUN_QUEUE_KEY))[RUN_QUEUE_KEY] || {};
      queue[tab.id] = { runId: run.id, steps: macro.steps, macroId };
      await chrome.storage.session.set({ [RUN_QUEUE_KEY]: queue });
      // Wait until tab finishes loading, then inject runner
      const onUpdated = (tabId, info) => {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          chrome.scripting.executeScript({
            target: { tabId, allFrames: false },
            files: ["runner.js"],
          }).catch((e) => console.warn("runner inject failed", e));
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      sendResponse({ ok: true, runId: run.id });
    })();
    return true;
  }
  if (msg.type === "PENDRAGONX_RUN_READY") {
    (async () => {
      const tabId = sender.tab?.id;
      if (!tabId) { sendResponse({}); return; }
      const all = (await chrome.storage.session.get(RUN_QUEUE_KEY))[RUN_QUEUE_KEY] || {};
      const queued = all[tabId];
      if (!queued) { sendResponse({}); return; }
      delete all[tabId];
      await chrome.storage.session.set({ [RUN_QUEUE_KEY]: all });
      sendResponse({ steps: queued.steps, runId: queued.runId });
    })();
    return true;
  }
  if (msg.type === "PENDRAGONX_RUN_PROGRESS") {
    (async () => {
      const token = await getValidToken();
      if (!token) return;
      await fetch(`${SUPABASE_URL}/rest/v1/alice_macro_runs?id=eq.${msg.runId}`, {
        method: "PATCH",
        headers: { ...authJson(token), Prefer: "return=minimal" },
        body: JSON.stringify({ current_step: msg.currentStep, total_steps: msg.total }),
      });
    })();
    return false;
  }
  if (msg.type === "PENDRAGONX_RUN_DONE") {
    (async () => {
      const token = await getValidToken();
      if (!token) return;
      await fetch(`${SUPABASE_URL}/rest/v1/alice_macro_runs?id=eq.${msg.runId}`, {
        method: "PATCH",
        headers: { ...authJson(token), Prefer: "return=minimal" },
        body: JSON.stringify({
          status: msg.status,
          error: msg.error || null,
          ended_at: new Date().toISOString(),
        }),
      });
      // Bump macro stats
      if (msg.status === "succeeded" || msg.status === "failed") {
        try {
          const macroId = (await chrome.storage.session.get(RUN_QUEUE_KEY));
          // No-op: stats handled on app side
        } catch {}
      }
    })();
    return false;
  }

  // ── Web app → extension bridge (via Realtime fallback / direct call) ─
  if (msg.type === "PENDRAGONX_PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }

  return false;
});

// Subscribe to Realtime channel for run requests from the web app.
// We poll alice_macro_runs every 4s with `status=pending&initiated_by=alice`
// since SDK-less realtime in MV3 is heavy. Polling keeps the worker simple.
async function pollAlicePendingRuns() {
  try {
    const token = await getValidToken();
    if (!token) return;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/alice_macro_runs?status=eq.pending&initiated_by=eq.alice&select=id,macro_id&order=started_at.desc&limit=5`, {
      headers: authJson(token),
    });
    if (!r.ok) return;
    const rows = await r.json().catch(() => []);
    for (const row of rows) {
      // Claim by flipping to running first
      const claim = await fetch(`${SUPABASE_URL}/rest/v1/alice_macro_runs?id=eq.${row.id}&status=eq.pending`, {
        method: "PATCH",
        headers: { ...authJson(token), Prefer: "return=representation" },
        body: JSON.stringify({ status: "running" }),
      });
      const claimed = await claim.json().catch(() => []);
      if (!claimed?.length) continue;
      // Look up macro, then open + run
      const macroRes = await fetch(`${SUPABASE_URL}/rest/v1/alice_macros?id=eq.${row.macro_id}&select=*`, { headers: authJson(token) });
      const m = (await macroRes.json().catch(() => []))?.[0];
      if (!m) continue;
      const tab = await chrome.tabs.create({ url: m.start_url, active: true });
      const queue = (await chrome.storage.session.get(RUN_QUEUE_KEY))[RUN_QUEUE_KEY] || {};
      queue[tab.id] = { runId: row.id, steps: m.steps, macroId: row.macro_id };
      await chrome.storage.session.set({ [RUN_QUEUE_KEY]: queue });
      const onUpdated = (tabId, info) => {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          chrome.scripting.executeScript({ target: { tabId }, files: ["runner.js"] }).catch(() => {});
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    }
  } catch (e) {
    console.debug("[Macros] poll error", e);
  }
}
chrome.alarms?.create("pendragonx_macro_poll", { periodInMinutes: 0.1 });
chrome.alarms?.onAlarm.addListener((a) => {
  if (a.name === "pendragonx_macro_poll") pollAlicePendingRuns();
});

let _syncTimer = null;
function debouncedSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    syncOpenTabs().catch(() => {});
  }, 1500);
}

async function getValidToken() {
  const stored = await chrome.storage.local.get([
    "pendragonx_auth_token", "pendragonx_refresh_token", "pendragonx_session_expires_at",
  ]);
  return ensureFreshSession(stored.pendragonx_auth_token, stored.pendragonx_refresh_token, stored.pendragonx_session_expires_at);
}

async function ensureFreshSession(token, refreshToken, expiresAt) {
  if (!token) return null;
  if (expiresAt && Number(expiresAt) - Date.now() > 2 * 60 * 1000) return token;
  if (!refreshToken) return token;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) return token;
    await chrome.storage.local.set({
      pendragonx_auth_token: d.access_token,
      pendragonx_refresh_token: d.refresh_token || refreshToken,
      pendragonx_session_expires_at: d.expires_at ? Number(d.expires_at) * 1000 : Date.now() + Number(d.expires_in || 3600) * 1000,
      pendragonx_user_email: d.user?.email,
    });
    return d.access_token;
  } catch {
    return token;
  }
}

async function getUserId(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const user = await r.json().catch(() => ({}));
    return user?.id || null;
  } catch { return null; }
}

async function responseError(res) {
  const text = await res.text().catch(() => "");
  if (!text) return `HTTP ${res.status}`;
  try {
    const json = JSON.parse(text);
    return json.message || json.error || json.msg || `HTTP ${res.status}`;
  } catch {
    return text.slice(0, 180) || `HTTP ${res.status}`;
  }
}

async function syncOpenTabs() {
  const stored = await chrome.storage.local.get(["pendragonx_auth_token", "pendragonx_refresh_token", "pendragonx_session_expires_at", "pendragonx_tab_share_enabled"]);
  const token = await ensureFreshSession(stored.pendragonx_auth_token, stored.pendragonx_refresh_token, stored.pendragonx_session_expires_at);
  const enabled = stored.pendragonx_tab_share_enabled;
  if (!token) return;
  if (enabled === false) return;
  const tabs = await chrome.tabs.query({});
  const payload = tabs
    .filter((t) => t.url && /^https?:/i.test(t.url))
    .map((t) => ({ url: t.url, title: t.title || "", active: !!t.active, windowId: t.windowId ?? null }));
  await fetch(TAB_INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tabs: payload }),
  });
}

// ───── Save helpers ─────

function authJson(token) {
  return { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
}

async function saveScratchpad(token, userId, text, tab) {
  const body = `${text}\n\n— from ${tab?.title || tab?.url || ""}\n${tab?.url || ""}`.trim();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scratchpad_notes`, {
    method: "POST",
    headers: { ...authJson(token), Prefer: "return=minimal" },
    body: JSON.stringify({ content: body, user_id: userId }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await responseError(res) };
}

async function saveAsCard(token, text, tab) {
  const res = await fetch(SUMMARIZE_URL, {
    method: "POST",
    headers: authJson(token),
    body: JSON.stringify({ text, url: tab?.url || "", title: tab?.title || "Selection" }),
  });
  const d = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, label: d.card?.title || "Card" } : { ok: false, error: d.error || `HTTP ${res.status}` };
}

async function saveAsNote(token, userId, text, tab, kind = "selection") {
  const title = (tab?.title || "Saved page").slice(0, 180);
  const source = tab?.url ? `\n\n---\nSource: [${tab?.title || tab.url}](${tab.url})` : "";
  const content = `${text}${source}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/notes`, {
    method: "POST",
    headers: { ...authJson(token), Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, title, content, tags: ["clipped", kind] }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await responseError(res) };
}

async function saveAsTask(token, userId, title, tab) {
  const taskNotes = tab?.url ? `Source: ${tab.url}` : "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: "POST",
    headers: { ...authJson(token), Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, title: title.slice(0, 200), notes: taskNotes, list: "read-later", priority: "low" }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await responseError(res) };
}

async function routeSelectionSmart(token, userId, text, tab) {
  const len = text.length;
  if (len < SCRATCHPAD_MAX) {
    const r = await saveScratchpad(token, userId, text, tab);
    return { ...r, dest: `Scratchpad (${len} chars)` };
  }
  if (len <= CARD_MAX) {
    const r = await saveAsCard(token, text, tab);
    return { ...r, dest: `Card (${len} chars)` };
  }
  const r = await saveAsNote(token, userId, text, tab, "selection");
  return { ...r, dest: `Note (${len} chars)` };
}

// ───── Context menu click handler ─────
chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  try {
    // No-auth-required items first
    if (info.menuItemId === "pendragonx_open_panel") {
      if (chrome.sidePanel?.open && tab?.windowId != null) await chrome.sidePanel.open({ windowId: tab.windowId });
      return;
    }
    if (info.menuItemId === "pendragonx_open_app") {
      await chrome.tabs.create({ url: APP_URL });
      return;
    }
    if (info.menuItemId === "pendragonx_rec_start") {
      const res = await startRecording(tab);
      if (res.ok) {
        await notify(tab?.id, "Recording — interact with the page, then right-click → Stop recording", true);
        syncRecorderMenuVisibility();
      } else {
        await notify(tab?.id, res.error || "Couldn't start recording", false);
      }
      return;
    }
    if (info.menuItemId === "pendragonx_rec_stop") {
      // Open side panel so the save-name prompt is visible, then ask it to prompt.
      if (chrome.sidePanel?.open && tab?.windowId != null) {
        await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
      try { chrome.runtime.sendMessage({ type: "PENDRAGONX_REC_STOP_PROMPT" }); } catch {}
      await notify(tab?.id, "Name your macro in the side panel to finish saving", true);
      return;
    }
    if (info.menuItemId === "pendragonx_page_to_pdf") {
      if (!tab?.id) { await notify(tab?.id, "No active tab", false); return; }
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.print() });
        await notify(tab.id, "Print dialog opened — choose 'Save as PDF'", true);
      } catch (e) {
        await notify(tab.id, `Couldn't open print dialog: ${e?.message || e}`, false);
      }
      return;
    }
    if (info.menuItemId === "pendragonx_send_to_alice") {
      await chrome.storage.local.set({
        pendragonx_alice_seed: {
          url: tab?.url || "",
          title: tab?.title || "",
          selection: String(info.selectionText || "").slice(0, 2000),
          at: Date.now(),
        },
      });
      if (chrome.sidePanel?.open && tab?.windowId != null) {
        await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
      await notify(tab?.id, "Opened ALICE with this page attached", true);
      return;
    }

    // Auth required for the rest
    const token = await getValidToken();
    if (!token) { await notify(tab?.id, "Sign in to PendragonX first", false); return; }
    const userId = await getUserId(token);
    if (!userId) { await notify(tab?.id, "Sign in to PendragonX first", false); return; }

    if (info.menuItemId === "pendragonx_summarize_page") {
      await notify(tab?.id, "Summarizing page…", true);
      const page = await extractPage(tab?.id);
      if (!page) { await notify(tab?.id, "Couldn't read this page", false); return; }
      const r = await saveAsCard(token, page.text, { url: page.url, title: page.title });
      await notify(tab?.id, r.ok ? `✓ Saved card: ${r.label}` : `Failed: ${r.error}`, r.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_page_to_note") {
      await notify(tab?.id, "Saving full page as note…", true);
      const page = await extractPage(tab?.id);
      if (!page) { await notify(tab?.id, "Couldn't read this page", false); return; }
      const r = await saveAsNote(token, userId, page.text, { url: page.url, title: page.title }, "page");
      await notify(tab?.id, r.ok ? `✓ Saved to Notes` : `Failed: ${r.error}`, r.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_page_to_task") {
      const r = await saveAsTask(token, userId, tab?.title || tab?.url || "Read later", tab);
      await notify(tab?.id, r.ok ? `✓ Added to read-later tasks` : `Failed: ${r.error}`, r.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_link_to_task") {
      const linkUrl = info.linkUrl || "";
      const title = (info.selectionText || info.linkUrl || "Read later").slice(0, 200);
      const r = await saveAsTask(token, userId, title, { url: linkUrl, title });
      await notify(tab?.id, r.ok ? `✓ Link saved to read-later` : `Failed: ${r.error}`, r.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_summarize_link") {
      const linkUrl = info.linkUrl || "";
      if (!linkUrl) { await notify(tab?.id, "No link URL", false); return; }
      await notify(tab?.id, "Fetching linked page…", true);
      try {
        const f = await fetch(FETCH_URL_URL, {
          method: "POST", headers: authJson(token),
          body: JSON.stringify({ url: linkUrl }),
        });
        const fd = await f.json().catch(() => ({}));
        const text = fd?.content || fd?.text || "";
        if (!text) { await notify(tab?.id, `Couldn't fetch link: ${fd?.error || f.status}`, false); return; }
        const r = await saveAsCard(token, text, { url: linkUrl, title: fd?.title || linkUrl });
        await notify(tab?.id, r.ok ? `✓ Saved card: ${r.label}` : `Failed: ${r.error}`, r.ok);
      } catch (e) {
        await notify(tab?.id, `Failed: ${e?.message || e}`, false);
      }
      return;
    }

    // Selection-based actions
    const selection = String(info.selectionText || "").trim();

    if (info.menuItemId === "pendragonx_save_smart") {
      if (selection.length < 1) { await notify(tab?.id, "Nothing selected", false); return; }
      const r = await routeSelectionSmart(token, userId, selection, tab);
      await notify(tab?.id, r.ok ? `✓ Saved to ${r.dest}${r.label ? `: ${r.label}` : ""}` : `Failed: ${r.error}`, r.ok);
      return;
    }
    if (info.menuItemId === "pendragonx_save_as_scratch") {
      const text = selection.slice(0, 500);
      if (!text) { await notify(tab?.id, "Nothing selected", false); return; }
      const r = await saveScratchpad(token, userId, text, tab);
      await notify(tab?.id, r.ok ? "✓ Saved to Scratchpad" : `Failed: ${r.error}`, r.ok);
      return;
    }
    if (info.menuItemId === "pendragonx_save_as_card") {
      if (selection.length < 8) { await notify(tab?.id, "Select more text first", false); return; }
      const r = await saveAsCard(token, selection, tab);
      await notify(tab?.id, r.ok ? `✓ Saved card: ${r.label}` : `Failed: ${r.error}`, r.ok);
      return;
    }
    if (info.menuItemId === "pendragonx_save_as_note") {
      if (!selection) { await notify(tab?.id, "Nothing selected", false); return; }
      const r = await saveAsNote(token, userId, selection, tab, "selection");
      await notify(tab?.id, r.ok ? "✓ Saved to Notes" : `Failed: ${r.error}`, r.ok);
      return;
    }
    if (info.menuItemId === "pendragonx_save_as_task") {
      if (!selection) { await notify(tab?.id, "Nothing selected", false); return; }
      const r = await saveAsTask(token, userId, selection.slice(0, 200), tab);
      await notify(tab?.id, r.ok ? "✓ Saved as task" : `Failed: ${r.error}`, r.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_define") {
      const term = selection.split(/\s+/).slice(0, 6).join(" ");
      if (!term) { await notify(tab?.id, "Nothing selected", false); return; }
      try {
        const r = await fetch(DICTIONARY_URL, {
          method: "POST", headers: authJson(token),
          body: JSON.stringify({ word: term }),
        });
        const d = await r.json().catch(() => ({}));
        const def = d?.definition || d?.meaning || d?.result || (Array.isArray(d?.meanings) ? d.meanings[0]?.definitions?.[0]?.definition : "");
        await notify(tab?.id, r.ok && def ? `${term}: ${String(def).slice(0, 220)}` : `No definition for "${term}"`, r.ok && !!def);
      } catch (e) {
        await notify(tab?.id, `Define failed: ${e?.message || e}`, false);
      }
      return;
    }

    if (info.menuItemId === "pendragonx_translate") {
      if (!selection) { await notify(tab?.id, "Nothing selected", false); return; }
      try {
        const r = await fetch(MODIFY_URL, {
          method: "POST", headers: authJson(token),
          body: JSON.stringify({ content: selection, instruction: "Translate the following text to English. Return only the translation, no commentary." }),
        });
        const d = await r.json().catch(() => ({}));
        const out = d?.modified || d?.content || d?.result || "";
        if (r.ok && out) {
          await copyToClipboard(tab?.id, out);
          await notify(tab?.id, `✓ Translated & copied: ${String(out).slice(0, 180)}`, true);
        } else {
          await notify(tab?.id, `Translate failed: ${d?.error || r.status}`, false);
        }
      } catch (e) {
        await notify(tab?.id, `Translate failed: ${e?.message || e}`, false);
      }
      return;
    }

    if (info.menuItemId === "pendragonx_save_image_card") {
      const imgUrl = info.srcUrl || "";
      if (!imgUrl) { await notify(tab?.id, "No image URL", false); return; }
      const body = `![image](${imgUrl})\n\nFrom: [${tab?.title || tab?.url}](${tab?.url})`;
      const r = await saveAsCard(token, body, { url: tab?.url || "", title: `Image from ${tab?.title || "page"}` });
      await notify(tab?.id, r.ok ? `✓ Saved image card` : `Failed: ${r.error}`, r.ok);
      return;
    }
  } catch (e) {
    console.warn("[pendragonx] menu click failed", e);
    await notify(tab?.id, `Error: ${String(e?.message || e)}`, false);
  }
});

async function extractPage(tabId) {
  if (!tabId || !chrome.scripting?.executeScript) return null;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const title = document.title || "";
        const url = location.href;
        const root = document.querySelector("article") || document.querySelector("main") || document.body;
        const clone = root.cloneNode(true);
        clone.querySelectorAll("script,style,noscript,nav,footer,aside,header").forEach((n) => n.remove());
        const text = (clone.innerText || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 18000);
        return { title, url, text };
      },
    });
    return res?.result || null;
  } catch (e) {
    console.warn("extractPage failed", e);
    return null;
  }
}

async function copyToClipboard(tabId, text) {
  if (!tabId || !chrome.scripting?.executeScript) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (t) => { navigator.clipboard?.writeText(t).catch(() => {}); },
      args: [String(text)],
    });
  } catch { /* ignore */ }
}

async function toast(tabId, message, ok) {
  if (!tabId || !chrome.scripting?.executeScript) return false;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (msg, isOk) => {
        const id = "__pendragonx_toast";
        document.getElementById(id)?.remove();
        const el = document.createElement("div");
        el.id = id;
        el.textContent = msg;
        el.style.cssText = [
          "all:initial", "position:fixed", "right:16px", "bottom:16px", "z-index:2147483647",
          "background:" + (isOk ? "#0f0f12" : "#3b0a0a"),
          "color:#fff", "font:600 13px/1.3 'Inter',-apple-system,system-ui,sans-serif",
          "padding:10px 14px", "border-radius:9999px",
          "box-shadow:0 8px 28px rgba(0,0,0,.4), 0 0 0 1px " + (isOk ? "rgba(167,139,250,.45)" : "rgba(220,38,38,.55)"),
          "max-width:340px",
        ].join(";");
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4500);
      },
      args: [String(message), !!ok],
    });
    return true;
  } catch {
    return false;
  }
}
