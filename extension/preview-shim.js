/* Preview shim: when popup.html is loaded outside a Chrome extension
   (e.g. inside an admin preview <iframe>), provide a chrome.storage.local
   API backed by sessionStorage so it cannot pollute or sign out the parent
   PendragonX web-app session. Seeded by postMessage from the parent.
   Moved to an external file to comply with MV3 CSP (no inline scripts). */
(function () {
  var isExt = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  if (isExt) return;
  var mem = {};
  try {
    var raw = sessionStorage.getItem('__pxpreview_store__');
    if (raw) mem = JSON.parse(raw) || {};
  } catch (e) {}
  function persist() {
    try { sessionStorage.setItem('__pxpreview_store__', JSON.stringify(mem)); } catch (e) {}
  }
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    local: {
      get: function (keys, cb) {
        var out = {};
        var list = Array.isArray(keys) ? keys : (keys ? [keys] : Object.keys(mem));
        list.forEach(function (k) { if (k in mem) out[k] = mem[k]; });
        if (typeof cb === 'function') cb(out);
      },
      set: function (obj, cb) {
        Object.keys(obj).forEach(function (k) { mem[k] = obj[k]; });
        persist();
        if (typeof cb === 'function') cb();
      },
      remove: function (keys, cb) {
        (Array.isArray(keys) ? keys : [keys]).forEach(function (k) { delete mem[k]; });
        persist();
        if (typeof cb === 'function') cb();
      },
      clear: function (cb) { mem = {}; persist(); if (typeof cb === 'function') cb(); },
    },
  };
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.__pxpreview !== 'session') return;
    var s = e.data.session || {};
    mem.pendragonx_auth_token = s.access_token || null;
    mem.pendragonx_refresh_token = s.refresh_token || null;
    mem.pendragonx_session_expires_at = s.expires_at ? s.expires_at * 1000 : 0;
    mem.pendragonx_user_email = s.email || null;
    persist();
    if (typeof loadData === 'function') loadData();
  });
  try { window.parent && window.parent.postMessage({ __pxpreview: 'ready' }, '*'); } catch (e) {}
})();
