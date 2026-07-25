/**
 * APNs HTTP/2 sender. Cloudflare Worker safe — uses only fetch + WebCrypto.
 * Requires the following runtime secrets:
 *   APNS_KEY_ID       10-char alphanumeric from Apple Developer
 *   APNS_TEAM_ID      10-char team ID
 *   APNS_BUNDLE_ID    e.g. app.etherealbodylabs
 *   APNS_AUTH_KEY_P8  contents of the .p8 file (PEM)
 * The .p8 key is an ES256 (P-256) EC private key; we import it via
 * SubtleCrypto and sign the JWT bearer token Apple requires.
 */

interface PushTarget {
  token: string;
  platform: string;
  environment: string;
}

interface PushPayload {
  title: string;
  body: string;
  path?: string;
}

interface CachedJwt {
  token: string;
  expiresAt: number;
}

let cachedJwt: CachedJwt | null = null;

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i += 1) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function mintApnsJwt(): Promise<string> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const pem = process.env.APNS_AUTH_KEY_P8;
  if (!keyId || !teamId || !pem) throw new Error("APNs credentials not configured");

  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now + 60) return cachedJwt.token;

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const enc = new TextEncoder();
  const headerB64 = b64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  const token = `${signingInput}.${b64urlEncode(signature)}`;
  // APNs tokens are valid ~60 min; cache for 50.
  cachedJwt = { token, expiresAt: now + 50 * 60 };
  return token;
}

export async function sendApnsBatch(
  targets: PushTarget[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const ios = targets.filter((t) => t.platform === "ios");
  if (ios.length === 0) return { sent: 0, failed: 0 };

  const bundleId = process.env.APNS_BUNDLE_ID ?? "app.etherealbodylabs";
  const jwt = await mintApnsJwt();
  const apsBody = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      "mutable-content": 1,
    },
    path: payload.path ?? "/app",
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    ios.map(async (t) => {
      const host = t.environment === "sandbox"
        ? "https://api.sandbox.push.apple.com"
        : "https://api.push.apple.com";
      try {
        const res = await fetch(`${host}/3/device/${t.token}`, {
          method: "POST",
          headers: {
            authorization: `bearer ${jwt}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "content-type": "application/json",
          },
          body: apsBody,
        });
        if (res.ok) sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }),
  );
  return { sent, failed };
}
