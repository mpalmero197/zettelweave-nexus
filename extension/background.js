// PendragonX extension service worker.
// - Opens the side panel on toolbar click.
// - Periodically sends an open-tabs snapshot to the ALICE backend so the
//   `get_open_browser_tabs` tool can ground answers in the user's real
//   browsing session.

const SUPABASE_URL = "https://sckglgjydlbztxjupbsk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw";
const TAB_INGEST_URL = `${SUPABASE_URL}/functions/v1/ingest-browser-tabs`;
const SUMMARIZE_URL = `${SUPABASE_URL}/functions/v1/summarize-page-to-card`;
const TAB_ALARM = "pendragonx_tab_sync";
const APP_URL = "https://pendragonx.com";

function registerContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "pendragonx_root", title: "PendragonX", contexts: ["page", "selection", "link", "image"] });
    chrome.contextMenus.create({ id: "pendragonx_summarize_page", parentId: "pendragonx_root", title: "Summarize page to card", contexts: ["page", "selection", "link"] });
    chrome.contextMenus.create({ id: "pendragonx_save_selection_card", parentId: "pendragonx_root", title: "Save selection as card", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_scratchpad", parentId: "pendragonx_root", title: "Save selection to scratchpad", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "pendragonx_save_image_card", parentId: "pendragonx_root", title: "Save image as card", contexts: ["image"] });
    chrome.contextMenus.create({ id: "pendragonx_sep", parentId: "pendragonx_root", type: "separator", contexts: ["page", "selection", "link", "image"] });
    chrome.contextMenus.create({ id: "pendragonx_open_panel", parentId: "pendragonx_root", title: "Open Toolbox side panel", contexts: ["page", "selection", "link", "image"] });
    chrome.contextMenus.create({ id: "pendragonx_open_app", parentId: "pendragonx_root", title: "Open PendragonX app", contexts: ["page", "selection", "link", "image"] });
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

// Also sync when tabs change so ALICE has near-real-time context.
chrome.tabs?.onActivated.addListener(() => debouncedSync());
chrome.tabs?.onUpdated.addListener((_id, info) => { if (info.status === "complete") debouncedSync(); });
chrome.tabs?.onRemoved.addListener(() => debouncedSync());

// ───── Highlight → Scratchpad capture (from content.js) ─────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "PENDRAGONX_SAVE_SCRATCHPAD") return;
  (async () => {
    try {
      const stored = await chrome.storage.local.get([
        "pendragonx_auth_token",
        "pendragonx_refresh_token",
        "pendragonx_session_expires_at",
      ]);
      const token = await ensureFreshSession(
        stored.pendragonx_auth_token,
        stored.pendragonx_refresh_token,
        stored.pendragonx_session_expires_at
      );
      if (!token) {
        sendResponse({ ok: false, error: "sign in" });
        return;
      }
      const content = String(msg.content || "").slice(0, 500);
      const sourceUrl = String(msg.source_url || "");
      const sourceTitle = String(msg.source_title || "");
      const body = sourceUrl
        ? `${content}\n\n— from ${sourceTitle || sourceUrl}\n${sourceUrl}`
        : content;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scratchpad_notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ content: body }),
      });
      sendResponse({ ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // async sendResponse
});


let _syncTimer = null;
function debouncedSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    syncOpenTabs().catch(() => {});
  }, 1500);
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

async function syncOpenTabs() {
  const stored = await chrome.storage.local.get(["pendragonx_auth_token", "pendragonx_refresh_token", "pendragonx_session_expires_at", "pendragonx_tab_share_enabled"]);
  const token = await ensureFreshSession(stored.pendragonx_auth_token, stored.pendragonx_refresh_token, stored.pendragonx_session_expires_at);
  const enabled = stored.pendragonx_tab_share_enabled;
  if (!token) return; // not signed in
  if (enabled === false) return; // user explicitly disabled

  const tabs = await chrome.tabs.query({});
  const payload = tabs
    .filter((t) => t.url && /^https?:/i.test(t.url))
    .map((t) => ({
      url: t.url,
      title: t.title || "",
      active: !!t.active,
      windowId: t.windowId ?? null,
    }));

  await fetch(TAB_INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tabs: payload }),
  });
}
