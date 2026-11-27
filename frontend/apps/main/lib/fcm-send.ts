import { createSign } from "node:crypto";
import type { WebPushPayload } from "./web-push-send";

/**
 * Firebase Cloud Messaging (HTTP v1) sender, node builtins only.
 *
 * Dormant until the three server variables below are set in Vercel. Until then
 * every device keeps receiving notifications through standard Web Push (VAPID),
 * which already works on Chrome, Edge, Firefox and Safari. Once Firebase is
 * configured, devices that registered an FCM token are sent through FCM instead
 * (one transport per device, so nobody is notified twice).
 *
 *   FIREBASE_PROJECT_ID     e.g. epe-lawa-12345
 *   FIREBASE_CLIENT_EMAIL   firebase-adminsdk-xxxxx@epe-lawa-12345.iam.gserviceaccount.com
 *   FIREBASE_PRIVATE_KEY    the service account's private_key (keep the \n line breaks)
 *
 * The browser half lives in lib/fcm-client.ts and needs the NEXT_PUBLIC_FIREBASE_*
 * web config. See .env.example for where each value comes from.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const PROJECT_ID = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const CLIENT_EMAIL = /^[^\s@]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;

export type FcmConfig = { projectId: string; clientEmail: string; privateKey: string };

/** Vercel stores multi-line secrets either with real newlines or with literal "\n". */
export function normalisePrivateKey(raw: string): string {
  const unquoted = raw.trim().replace(/^"([\s\S]*)"$/, "$1");
  return unquoted.includes("\\n") ? unquoted.replace(/\\n/g, "\n") : unquoted;
}

export function fcmConfig(env: NodeJS.ProcessEnv = process.env): FcmConfig | null {
  const projectId = env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = normalisePrivateKey(env.FIREBASE_PRIVATE_KEY ?? "");
  if (!PROJECT_ID.test(projectId) || !CLIENT_EMAIL.test(clientEmail)) return null;
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) return null;
  return { projectId, clientEmail, privateKey };
}

export function fcmSenderReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return fcmConfig(env) !== null;
}

/** Which Firebase variables are present (never their values), for the admin status card. */
export function fcmSetupStatus(env: NodeJS.ProcessEnv = process.env) {
  const has = (name: string) => Boolean(env[name]?.trim());
  return {
    server: { FIREBASE_PROJECT_ID: has("FIREBASE_PROJECT_ID"), FIREBASE_CLIENT_EMAIL: has("FIREBASE_CLIENT_EMAIL"), FIREBASE_PRIVATE_KEY: has("FIREBASE_PRIVATE_KEY") },
    browser: {
      NEXT_PUBLIC_FIREBASE_API_KEY: has("NEXT_PUBLIC_FIREBASE_API_KEY"),
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: has("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: has("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      NEXT_PUBLIC_FIREBASE_APP_ID: has("NEXT_PUBLIC_FIREBASE_APP_ID"),
    },
    serverValid: fcmSenderReady(env),
  };
}

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/** RS256 service-account assertion (RFC 7523) for Google's OAuth token endpoint. */
export function serviceAccountAssertion(config: FcmConfig, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: config.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(config.privateKey).toString("base64url")}`;
}

let cached: { token: string; expires: number; email: string } | null = null;

async function accessToken(config: FcmConfig): Promise<string> {
  if (cached && cached.email === config.clientEmail && cached.expires > Date.now() + 60_000) return cached.token;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: serviceAccountAssertion(config) }),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!response.ok || typeof data.access_token !== "string") throw new Error(`fcm_oauth_${response.status}`);
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000, email: config.clientEmail };
  return cached.token;
}

/** The FCM v1 message for one device. Paths stay same-origin; FCM needs the absolute click link. */
export function fcmMessage(token: string, payload: WebPushPayload, origin: string) {
  const link = payload.url ? new URL(payload.url, origin).href : origin;
  const data: Record<string, string> = { kind: payload.kind, url: payload.url ?? "/" };
  if (payload.image) data.image = payload.image;
  if (payload.tag) data.tag = payload.tag;
  return {
    message: {
      token,
      notification: { title: payload.title, body: payload.body, ...(payload.image ? { image: new URL(payload.image, origin).href } : {}) },
      data,
      webpush: {
        headers: { TTL: "86400", Urgency: "high" },
        fcm_options: { link },
      },
    },
  };
}

export type FcmOutcome = "sent" | "gone" | "failed";

/** Send one notification. "gone" means the token is dead and should be forgotten. */
export async function fcmDeliver(token: string, payload: WebPushPayload, origin: string, env: NodeJS.ProcessEnv = process.env): Promise<FcmOutcome> {
  const config = fcmConfig(env);
  if (!config) return "failed";
  const bearer = await accessToken(config);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
    method: "POST",
    redirect: "error",
    headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
    body: JSON.stringify(fcmMessage(token, payload, origin)),
    signal: AbortSignal.timeout(8000),
  });
  if (response.ok) return "sent";
  const body = (await response.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } };
  const code = body.error?.details?.find((detail) => detail?.errorCode)?.errorCode ?? body.error?.status;
  if (response.status === 404 || code === "UNREGISTERED" || code === "NOT_FOUND") return "gone";
  if (response.status === 400 && code === "INVALID_ARGUMENT") return "gone";
  return "failed";
}
