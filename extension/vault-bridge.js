// vault-bridge.js — injected into Baku Scribe pages so the extension can
// request OTP codes AND saved credentials from the user's unlocked vault.
// All decryption happens in-page; only the resolved values cross back.
(() => {
  if (window.__pendragonxVaultBridge) return;
  window.__pendragonxVaultBridge = true;

  function broadcastAsk(payload, timeoutMs = 8000) {
    return new Promise((resolve) => {
      const bc = new BroadcastChannel("pendragonx-vault");
      const requestId = String(Math.random()).slice(2);
      let done = false;
      const finish = (resp) => { if (done) return; done = true; bc.removeEventListener("message", onMsg); bc.close(); resolve(resp); };
      const onMsg = (ev) => {
        if (ev.data?.requestId !== requestId) return;
        if (ev.data?.type === "otp-result") finish({ code: ev.data.code || null });
        if (ev.data?.type === "credential-result") finish(ev.data.result || { ok: false });
      };
      bc.addEventListener("message", onMsg);
      bc.postMessage({ ...payload, requestId });
      setTimeout(() => finish(null), timeoutMs);
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "PENDRAGONX_VAULT_GET_OTP") {
      broadcastAsk({ type: "get-otp", host: msg.host }, 4000).then((r) => sendResponse({ code: r?.code || null }));
      return true;
    }
    if (msg?.type === "PENDRAGONX_VAULT_GET_CREDENTIAL") {
      broadcastAsk({ type: "get-credential", host: msg.host, itemTitle: msg.itemTitle, itemId: msg.itemId }, 9000)
        .then((r) => sendResponse(r || { ok: false, error: "Vault did not respond" }));
      return true;
    }
  });
})();
