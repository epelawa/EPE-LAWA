import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign as cryptoSign, timingSafeEqual } from "node:crypto";

/**
 * Web Push application-server half, node builtins only.
 *
 * implements RFC 8291 message encryption (aes128gcm, RFC 8188) and RFC 8292
 * VAPID (ES256). Payloads are small (notification JSON well under the 4096-byte
 * record size), so every message is exactly one record: payload || 0x02 padding
 * mark, no padding bytes. The receiver's public key arrives as 65 raw bytes
 * (0x04-prefixed point) in the stored p256dh value.
 */

const RECORD_SIZE = 4096;
const SHA_256_LENGTH = 32;

function b64url(buffer: Buffer): string { return buffer.toString("base64url"); }

function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return createHmac("sha256", salt).update(ikm).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const output: Buffer[] = [];
  const rounds = Math.ceil(length / SHA_256_LENGTH);
  let previous = Buffer.alloc(0);
  for (let round = 1; round <= rounds; round += 1) {
    previous = createHmac("sha256", prk).update(Buffer.concat([previous, info, Buffer.from([round])])).digest();
    output.push(previous);
  }
  return Buffer.concat(output).subarray(0, length);
}

/** DER (ASN.1) ES256 signature -> the raw r||s form the push services expect. */
function derSignatureToRaw(der: Buffer): Buffer {
  if (der[0] !== 0x30) throw new Error("invalid ECDSA signature");
  let offset = 2;
  const readInteger = (): Buffer => {
    if (der[offset] !== 0x02) throw new Error("invalid ECDSA integer");
    const length = der[offset + 1];
    let value = der.subarray(offset + 2, offset + 2 + length);
    offset += 2 + length;
    while (value.length > 32 && value[0] === 0) value = value.subarray(1);
    const result = Buffer.alloc(32);
    value.copy(result, Math.max(0, 32 - value.length), Math.max(0, value.length - 32));
    return result;
  };
  const r = readInteger();
  const s = readInteger();
  return Buffer.concat([r, s]);
}

export function webPushVapidJwt(audience: string, subject: string, publicKey: string, privateKey: string, now = Date.now()): string {
  if (!/^https:\/\//.test(audience)) throw new Error("invalid VAPID audience");
  if (!subject) throw new Error("missing VAPID subject");
  const publicBytes = Buffer.from(publicKey, "base64url");
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) throw new Error("invalid VAPID public key");
  const privateBytes = Buffer.from(privateKey, "base64url");
  if (privateBytes.length < 16 || privateBytes.length > 32) throw new Error("invalid VAPID private key");
  const paddedPrivate = Buffer.concat([Buffer.alloc(32 - privateBytes.length), privateBytes]);

  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: subject })).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey({ key: {
    kty: "EC", crv: "P-256",
    x: b64url(publicBytes.subarray(1, 33)),
    y: b64url(publicBytes.subarray(33, 65)),
    d: b64url(paddedPrivate),
  }, format: "jwk" });
  const signature = derSignatureToRaw(cryptoSign("sha256", Buffer.from(signingInput), key));
  return `${signingInput}.${b64url(signature)}`;
}

export type WebPushPayload = { title: string; body: string; kind: string; url?: string };

/** RFC 8291 aes128gcm message body for one subscription. */
export function webPushEncrypt(userPublicKey: string, userAuth: string, payload: WebPushPayload): Buffer {
  const clientPublicKey = Buffer.from(userPublicKey, "base64url");
  if (clientPublicKey.length !== 65 || clientPublicKey[0] !== 0x04) throw new Error("invalid subscription p256dh");
  const authSecret = Buffer.from(userAuth, "base64url");
  if (authSecret.length < 16) throw new Error("invalid subscription auth");

  const server = createECDH("prime256v1");
  const serverPublicKey = server.generateKeys();
  const sharedSecret = server.computeSecret(clientPublicKey);

  const secret = hkdfExtract(authSecret, sharedSecret);
  const info = Buffer.concat([Buffer.from("WebPush: info\0", "binary"), clientPublicKey, serverPublicKey]);
  const ikm = hkdfExpand(secret, info, SHA_256_LENGTH);

  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0", "binary"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0", "binary"), 12);

  const json = Buffer.from(JSON.stringify(payload), "utf8");
  if (json.length + 17 > RECORD_SIZE) throw new Error("push payload too large");
  const record = Buffer.concat([json, Buffer.from([0x02])]);

  const gcm = createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([gcm.update(record), gcm.final(), gcm.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header[20] = serverPublicKey.length;
  return Buffer.concat([header, serverPublicKey, ciphertext]);
}

export function pushSenderReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    (env.NEXT_PUBLIC_WEB_PUSH_ENABLED === "true")
    && env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim()
    && env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim()
    && env.WEB_PUSH_VAPID_SUBJECT?.trim()
    && env.PUSH_DISPATCH_SECRET?.trim(),
  );
}

export function pushServiceUrl(endpoint: string): URL | null {
  try {
    const url = new URL(endpoint);
    // Browser subscriptions must target a known push service, never an arbitrary
    // URL supplied by a member. Do not follow redirects to untrusted hosts.
    const host = url.hostname.toLowerCase();
    const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" || host === "web.push.apple.com" || host.endsWith(".push.apple.com");
    if (url.protocol !== "https:" || !allowed || url.username || url.password || url.port || url.hash) return null;
    return url;
  } catch { return null; }
}

/**
 * Send one encrypted message. Returns the push service status so the caller can
 * retire subscriptions the service reports as gone (404/410); zero is returned
 * when the endpoint is refused locally.
 */
export async function webPushDeliver(endpoint: string, p256dh: string, auth: string, payload: WebPushPayload, env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const service = pushServiceUrl(endpoint);
  if (!service) return 0;
  const audience = service.origin;
  const publicEnv = env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
  const jwt = webPushVapidJwt(audience, env.WEB_PUSH_VAPID_SUBJECT!.trim(), publicEnv, env.WEB_PUSH_VAPID_PRIVATE_KEY!.trim());
  const body = webPushEncrypt(p256dh, auth, payload);
  const response = await fetch(service.href, {
    method: "POST",
    redirect: "error",
    headers: {
      TTL: "86400",
      Urgency: "normal",
      Authorization: `vapid t=${jwt}, k=${publicEnv}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(8000),
  });
  return response.status;
}

export function pushDispatchAuthorized(headerValue: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.PUSH_DISPATCH_SECRET?.trim() ?? "";
  if (!secret || !headerValue) return false;
  const presented = headerValue.startsWith("Bearer ") ? headerValue.slice(7) : "";
  if (!presented || presented.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(secret));
}
