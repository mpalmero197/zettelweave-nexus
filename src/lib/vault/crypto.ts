// Hyper-secure vault: device-bound encryption via WebAuthn PRF + AES-GCM.
// The derived key NEVER leaves the device. Server stores only ciphertext.

import { supabase } from "@/integrations/supabase/client";

const RP_NAME = "PendragonX Vault";
const KEY_INFO = "pendragonx-vault-v1";

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = {
  enc: (buf: ArrayBuffer | Uint8Array) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  },
  dec: (s: string) => {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

function randomBytes(n: number) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

async function deriveKeyFromPRF(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("pendragonx-vault-salt"),
      info: enc.encode(KEY_INFO),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface VaultPasskey {
  id: string;
  credential_id: string;
  prf_salt: string;
  label: string | null;
}

export async function listPasskeys(userId: string): Promise<VaultPasskey[]> {
  const { data, error } = await supabase
    .from("vault_passkeys")
    .select("id,credential_id,prf_salt,label")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function enrollPasskey(
  userId: string,
  userEmail: string,
  label = "This device"
): Promise<VaultPasskey> {
  if (!("credentials" in navigator)) throw new Error("WebAuthn not supported on this device.");

  const prfSalt = randomBytes(32);
  const challenge = randomBytes(32);
  const userIdBytes = enc.encode(userId);

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: userIdBytes,
        name: userEmail || userId,
        displayName: userEmail || "Vault user",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
      },
      extensions: { prf: { eval: { first: prfSalt } } } as any,
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("Passkey creation cancelled.");

  const ext = (cred.getClientExtensionResults() as any) || {};
  if (!ext.prf?.enabled && !ext.prf?.results?.first) {
    throw new Error(
      "This authenticator does not support PRF (required for hyper-secure encryption). Try a different device, browser, or security key."
    );
  }

  const credentialId = b64.enc(cred.rawId);
  const { data, error } = await supabase
    .from("vault_passkeys")
    .insert({
      user_id: userId,
      credential_id: credentialId,
      prf_salt: b64.enc(prfSalt),
      label,
    })
    .select("id,credential_id,prf_salt,label")
    .single();
  if (error) throw error;
  return data as VaultPasskey;
}

export async function unlockVault(userId: string): Promise<CryptoKey> {
  const passkeys = await listPasskeys(userId);
  if (passkeys.length === 0) {
    throw new Error("NO_PASSKEY");
  }

  const challenge = randomBytes(32);
  const firstSalt = b64.dec(passkeys[0].prf_salt);

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: passkeys.map((p) => ({
        id: b64.dec(p.credential_id),
        type: "public-key" as const,
      })),
      userVerification: "required",
      extensions: { prf: { eval: { first: firstSalt } } } as any,
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Unlock cancelled.");

  const ext = (assertion.getClientExtensionResults() as any) || {};
  const prfOut: ArrayBuffer | undefined = ext.prf?.results?.first;
  if (!prfOut) throw new Error("Authenticator did not return a PRF secret.");

  // Touch last_used_at
  void supabase
    .from("vault_passkeys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("credential_id", b64.enc(assertion.rawId));

  return deriveKeyFromPRF(prfOut);
}

export interface VaultItemPayload {
  // Logins
  title?: string;
  url?: string;
  username?: string;
  email?: string;
  password?: string;
  totpSecret?: string; // base32
  notes?: string;
  // Card
  cardholder?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  cardBrand?: string;
}

export type VaultItemType = "login" | "note" | "card";

export interface VaultItem {
  id: string;
  item_type: VaultItemType;
  label: string | null;
  host: string | null;
  ciphertext: string;
  iv: string;
  updated_at: string;
}

export async function encryptPayload(key: CryptoKey, payload: VaultItemPayload) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(payload))
  );
  return { iv: b64.enc(iv), ciphertext: b64.enc(ct) };
}

export async function decryptPayload(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<VaultItemPayload> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64.dec(iv) },
    key,
    b64.dec(ciphertext)
  );
  return JSON.parse(dec.decode(pt));
}

export function extractHost(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ---------- TOTP (RFC 6238, HMAC-SHA1, 30s, 6 digits) ----------
function base32Decode(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const c of clean) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

export async function generateTOTP(
  secretBase32: string,
  timeStep = 30,
  digits = 6
): Promise<{ code: string; remainingMs: number }> {
  if (!secretBase32) return { code: "", remainingMs: 0 };
  const keyBytes = base32Decode(secretBase32);
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(4, counter);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const padded = (code % 10 ** digits).toString().padStart(digits, "0");
  const remainingMs = (timeStep - (Math.floor(Date.now() / 1000) % timeStep)) * 1000;
  return { code: padded, remainingMs };
}
