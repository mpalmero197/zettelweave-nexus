// Shared Web Push utilities (RFC 8291 + RFC 8188 + VAPID)

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function uint8ToUrlBase64(buf: Uint8Array): string {
  let b = "";
  for (const byte of buf) b += String.fromCharCode(byte);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

async function createVapidJwt(
  endpoint: string,
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp, sub: "mailto:noreply@bakuscribe.lovable.app" };

  const encodeJson = (obj: unknown) =>
    uint8ToUrlBase64(new TextEncoder().encode(JSON.stringify(obj)));

  const unsignedToken = `${encodeJson(header)}.${encodeJson(payload)}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC", crv: "P-256",
      x: uint8ToUrlBase64(publicKeyBytes.slice(1, 33)),
      y: uint8ToUrlBase64(publicKeyBytes.slice(33, 65)),
      d: uint8ToUrlBase64(privateKeyBytes),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsignedToken),
    ),
  );

  const jwt = `${unsignedToken}.${uint8ToUrlBase64(sig)}`;
  return {
    authorization: `vapid t=${jwt}, k=${uint8ToUrlBase64(publicKeyBytes)}`,
    cryptoKey: `p256ecdsa=${uint8ToUrlBase64(publicKeyBytes)}`,
  };
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function encryptPayload(
  payload: Uint8Array,
  clientPublicKeyBytes: Uint8Array,
  authSecret: Uint8Array,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey),
  );

  const clientKey = await crypto.subtle.importKey(
    "raw", clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false, [],
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      serverKeys.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  const authInfo = concat(
    encoder.encode("WebPush: info\0"),
    clientPublicKeyBytes,
    serverPublicKey,
  );
  const prk = await hkdf(authSecret, sharedSecret, authInfo, 32);

  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");

  const contentEncryptionKey = await hkdf(salt, prk, cekInfo, 16);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  const paddedPayload = concat(payload, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey(
    "raw", contentEncryptionKey,
    { name: "AES-GCM" }, false, ["encrypt"],
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload,
    ),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const idLen = new Uint8Array([65]);
  const body = concat(salt, rs, idLen, serverPublicKey, encrypted);

  return { ciphertext: body, salt, serverPublicKey };
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payloadObj: Record<string, unknown>,
  vapidPrivateKey: Uint8Array,
  vapidPublicKey: Uint8Array,
): Promise<{ success: boolean; status: number; gone: boolean }> {
  const payload = new TextEncoder().encode(JSON.stringify(payloadObj));

  const clientPublicKey = urlBase64ToUint8Array(subscription.p256dh);
  const authSecret = urlBase64ToUint8Array(subscription.auth);

  const { ciphertext } = await encryptPayload(payload, clientPublicKey, authSecret);
  const { authorization, cryptoKey } = await createVapidJwt(
    subscription.endpoint,
    vapidPrivateKey,
    vapidPublicKey,
  );

  const resp = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Crypto-Key": cryptoKey,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "normal",
    },
    body: ciphertext,
  });

  const gone = resp.status === 404 || resp.status === 410;
  await resp.text(); // consume body
  if (!resp.ok && !gone) {
    console.error(`Push failed (${resp.status})`);
  }

  return { success: resp.ok, status: resp.status, gone };
}

export const VAPID_PUBLIC_KEY_B64 = "BBKkcuLT9-2qSiL9bLimabuP8fUWZ2plftqkErTy8D3BgXAztxuhYnoVeRW8V38U25NpQNzo3mastd79n5ztMgQ";
