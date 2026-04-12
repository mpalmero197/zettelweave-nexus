import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Web Push helpers (RFC 8291 + RFC 8188 + VAPID) ──

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function uint8ToUrlBase64(buf: Uint8Array): string {
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
  const payload = { aud, exp, sub: "mailto:noreply@pendragonx.lovable.app" };

  const encodeJson = (obj: unknown) =>
    uint8ToUrlBase64(new TextEncoder().encode(JSON.stringify(obj)));

  const unsignedToken = `${encodeJson(header)}.${encodeJson(payload)}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
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
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey),
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      serverKeys.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  // RFC 8291 key derivation
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

  // Encrypt with AES-128-GCM (add padding delimiter \x02)
  const paddedPayload = concat(payload, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload,
    ),
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const idLen = new Uint8Array([65]);
  const body = concat(salt, rs, idLen, serverPublicKey, encrypted);

  return { ciphertext: body, salt, serverPublicKey };
}

async function sendPushNotification(
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
      Urgency: "high",
    },
    body: ciphertext,
  });

  const gone = resp.status === 404 || resp.status === 410;
  if (!resp.ok && !gone) {
    const text = await resp.text();
    console.error(`Push failed (${resp.status}): ${text}`);
  } else if (!resp.ok) {
    await resp.text(); // consume body
  } else {
    await resp.text(); // consume body
  }

  return { success: resp.ok, status: resp.status, gone };
}

// ── Main handler ──

// VAPID public key (must match the one in useNotifications.ts)
const VAPID_PUBLIC_KEY_B64 = "BBKkcuLT9-2qSiL9bLimabuP8fUWZ2plftqkErTy8D3BgXAztxuhYnoVeRW8V38U25NpQNzo3mastd79n5ztMgQ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPrivateKeyB64) {
      console.error("VAPID_PRIVATE_KEY secret is not configured");
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPrivateKey = urlBase64ToUint8Array(vapidPrivateKeyB64);
    const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY_B64);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find reminders that are due and not yet sent
    const now = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_sent", false)
      .lte("remind_at", now)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching reminders:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let pushCount = 0;

    for (const reminder of dueReminders) {
      // Create in-app notification
      await supabase.from("in_app_notifications").insert({
        user_id: reminder.user_id,
        title: `⏰ Reminder: ${reminder.item_title || reminder.item_type}`,
        body: `Your ${reminder.item_type} is coming up in ${formatOffset(reminder.offset_minutes)}.`,
        item_type: reminder.item_type,
        item_id: reminder.item_id,
      });

      // Send push notifications to all devices
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", reminder.user_id);

      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = {
          title: `⏰ ${reminder.item_title || reminder.item_type}`,
          body: `Coming up in ${formatOffset(reminder.offset_minutes)}`,
          tag: `reminder-${reminder.id}`,
          url: "/",
        };

        for (const sub of subscriptions) {
          try {
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              pushPayload,
              vapidPrivateKey,
              vapidPublicKey,
            );

            if (result.gone) {
              // Subscription expired — clean it up
              console.log(`Removing expired subscription: ${sub.endpoint}`);
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            } else if (result.success) {
              pushCount++;
            }
          } catch (pushErr) {
            console.error(`Push error for ${sub.endpoint}:`, pushErr);
          }
        }
      }

      // Mark as sent
      await supabase
        .from("reminders")
        .update({ is_sent: true })
        .eq("id", reminder.id);

      sentCount++;
    }

    console.log(`Processed ${sentCount} reminders, sent ${pushCount} push notification(s)`);

    return new Response(JSON.stringify({ sent: sentCount, pushed: pushCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatOffset(minutes: number): string {
  if (minutes >= 10080 && minutes % 10080 === 0) return `${minutes / 10080} week(s)`;
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} day(s)`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hour(s)`;
  return `${minutes} minute(s)`;
}
