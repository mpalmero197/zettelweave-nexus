// Global vault bridge — listens on BroadcastChannel for credential/otp
// requests from the extension's vault-bridge.js content script. Decrypts
// matching vault items in-page (vault must be unlocked) and posts results
// back. If the vault is locked or matches are ambiguous, returns metadata
// so the extension runner can prompt the user.

import { useEffect } from "react";
import { useVault } from "@/hooks/useVault";
import { generateTOTP } from "@/lib/vault/crypto";

export function VaultBridge() {
  const vault = useVault();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("bakuscribe-vault");

    const matchByHost = (host: string) =>
      vault.items.filter(
        (i) => i.item_type === "login" && i.host && (host === i.host || host.endsWith("." + i.host))
      );

    const handler = async (ev: MessageEvent) => {
      const d = ev.data || {};
      if (!d.requestId) return;

      if (d.type === "get-otp") {
        if (!vault.unlocked) {
          bc.postMessage({ type: "otp-result", requestId: d.requestId, code: null });
          return;
        }
        const match = matchByHost(String(d.host || ""))[0];
        if (!match) { bc.postMessage({ type: "otp-result", requestId: d.requestId, code: null }); return; }
        try {
          const p = await vault.decryptItem(match);
          if (!p.totpSecret) { bc.postMessage({ type: "otp-result", requestId: d.requestId, code: null }); return; }
          const { code } = await generateTOTP(p.totpSecret);
          bc.postMessage({ type: "otp-result", requestId: d.requestId, code });
        } catch {
          bc.postMessage({ type: "otp-result", requestId: d.requestId, code: null });
        }
        return;
      }

      if (d.type === "get-credential") {
        const host = String(d.host || "");
        if (!vault.unlocked) {
          bc.postMessage({
            type: "credential-result", requestId: d.requestId,
            result: { ok: false, locked: true, error: "Vault is locked. Unlock it in Baku Scribe → Vault." },
          });
          return;
        }
        let pool = vault.items.filter((i) => i.item_type === "login");
        if (d.itemId) pool = pool.filter((i) => i.id === d.itemId);
        else if (d.itemTitle) pool = pool.filter((i) => (i.label || "").toLowerCase() === String(d.itemTitle).toLowerCase());
        else if (host) {
          const hostMatch = matchByHost(host);
          if (hostMatch.length) pool = hostMatch;
        }

        if (!pool.length) {
          bc.postMessage({
            type: "credential-result", requestId: d.requestId,
            result: { ok: false, error: `No vault login matches ${host || "this site"}.` },
          });
          return;
        }
        if (pool.length > 1 && !d.itemId) {
          bc.postMessage({
            type: "credential-result", requestId: d.requestId,
            result: {
              needsPick: true,
              options: pool.map((p) => ({ id: p.id, label: p.label || "Untitled", host: p.host || "" })),
            },
          });
          return;
        }

        try {
          const item = pool[0];
          const p = await vault.decryptItem(item);
          let otp: string | undefined;
          if (p.totpSecret) { try { otp = (await generateTOTP(p.totpSecret)).code; } catch {} }
          bc.postMessage({
            type: "credential-result", requestId: d.requestId,
            result: {
              ok: true,
              fields: {
                username: p.username || p.email || "",
                email: p.email || "",
                password: p.password || "",
                otp: otp || "",
              },
            },
          });
        } catch (e: any) {
          bc.postMessage({
            type: "credential-result", requestId: d.requestId,
            result: { ok: false, error: String(e?.message || e) },
          });
        }
      }
    };

    bc.addEventListener("message", handler);
    return () => { bc.removeEventListener("message", handler); bc.close(); };
  }, [vault.unlocked, vault.items, vault.decryptItem]);

  return null;
}
