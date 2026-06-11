// vault-bridge.js — injected into PendragonX pages so the extension can
// request a one-time TOTP code from the user's unlocked, in-tab vault.
// All decryption happens in-page; only the resulting 6-digit code is
// returned to the extension.
(() => {
  if (window.__pendragonxVaultBridge) return;
  window.__pendragonxVaultBridge = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "PENDRAGONX_VAULT_GET_OTP") return;
    const requestId = String(Math.random()).slice(2);
    const bc = new BroadcastChannel("pendragonx-vault");
    let done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      bc.removeEventListener("message", onMsg);
      bc.close();
      sendResponse({ code });
    };
    const onMsg = (ev) => {
      if (ev.data?.type === "otp-result" && ev.data.requestId === requestId) {
        finish(ev.data.code || null);
      }
    };
    bc.addEventListener("message", onMsg);
    bc.postMessage({ type: "get-otp", host: msg.host, requestId });
    setTimeout(() => finish(null), 4000);
    return true; // async
  });
})();
