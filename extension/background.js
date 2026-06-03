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

// ───── Extension messages ─────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PENDRAGONX_REGISTER_CONTEXT_MENUS") {
    registerContextMenus();
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type !== "PENDRAGONX_SAVE_SCRATCHPAD") return false;
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
      const userId = await getUserId(token);
      if (!userId) {
        sendResponse({ ok: false, error: "sign in" });
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scratchpad_notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ content: body, user_id: userId }),
      });
      const errorText = res.ok ? undefined : await responseError(res);
      sendResponse({ ok: res.ok, error: errorText });
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

async function getUserId(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const user = await r.json().catch(() => ({}));
    return user?.id || null;
  } catch {
    return null;
  }
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

// ───── Context menu click handler ─────
chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "pendragonx_open_panel") {
      if (chrome.sidePanel?.open && tab?.windowId != null) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
      return;
    }
    if (info.menuItemId === "pendragonx_open_app") {
      await chrome.tabs.create({ url: APP_URL });
      return;
    }

    const stored = await chrome.storage.local.get([
      "pendragonx_auth_token", "pendragonx_refresh_token", "pendragonx_session_expires_at",
    ]);
    const token = await ensureFreshSession(
      stored.pendragonx_auth_token, stored.pendragonx_refresh_token, stored.pendragonx_session_expires_at
    );
    if (!token) {
      await toast(tab?.id, "Sign in to PendragonX first", false);
      return;
    }

    if (info.menuItemId === "pendragonx_summarize_page") {
      await toast(tab?.id, "Summarizing page…", true);
      const page = await extractPage(tab?.id);
      if (!page) { await toast(tab?.id, "Couldn't read this page", false); return; }
      const res = await fetch(SUMMARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: page.text, url: page.url, title: page.title }),
      });
      const d = await res.json().catch(() => ({}));
      await toast(tab?.id, res.ok ? `✓ Saved card: ${d.card?.title || "Summary"}` : `Failed: ${d.error || res.status}`, res.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_save_selection_card") {
      const text = String(info.selectionText || "").trim();
      if (text.length < 8) { await toast(tab?.id, "Select more text first", false); return; }
      const res = await fetch(SUMMARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, url: tab?.url || "", title: tab?.title || "Selection" }),
      });
      const d = await res.json().catch(() => ({}));
      await toast(tab?.id, res.ok ? `✓ Saved card: ${d.card?.title || "Selection"}` : `Failed: ${d.error || res.status}`, res.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_save_scratchpad") {
      const text = String(info.selectionText || "").slice(0, 500);
      if (text.length < 1) { await toast(tab?.id, "Nothing selected", false); return; }
      const body = `${text}\n\n— from ${tab?.title || tab?.url || ""}\n${tab?.url || ""}`.trim();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scratchpad_notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`, Prefer: "return=minimal",
        },
        body: JSON.stringify({ content: body }),
      });
      await toast(tab?.id, res.ok ? "✓ Saved to Scratchpad" : `Failed: HTTP ${res.status}`, res.ok);
      return;
    }

    if (info.menuItemId === "pendragonx_save_image_card") {
      const imgUrl = info.srcUrl || "";
      if (!imgUrl) { await toast(tab?.id, "No image URL", false); return; }
      const body = `![image](${imgUrl})\n\nFrom: [${tab?.title || tab?.url}](${tab?.url})`;
      // Use direct insert with a tiny placeholder card via summarize-page-to-card path skipped; insert via PostgREST scratchpad fallback won't make a card. Instead post to summarize with the image markdown so it stays a card.
      const res = await fetch(SUMMARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: body, url: tab?.url || "", title: `Image from ${tab?.title || "page"}` }),
      });
      const d = await res.json().catch(() => ({}));
      await toast(tab?.id, res.ok ? `✓ Saved image card` : `Failed: ${d.error || res.status}`, res.ok);
      return;
    }
  } catch (e) {
    console.warn("[pendragonx] menu click failed", e);
    await toast(tab?.id, `Error: ${String(e?.message || e)}`, false);
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
        // Prefer <article>/<main>, else body text
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

async function toast(tabId, message, ok) {
  if (!tabId || !chrome.scripting?.executeScript) return;
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
        setTimeout(() => el.remove(), 3500);
      },
      args: [String(message), !!ok],
    });
  } catch { /* ignore */ }
}
