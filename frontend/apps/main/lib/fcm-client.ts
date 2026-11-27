"use client";

import { VAPID_PUBLIC_KEY } from "./vapid";

/**
 * Browser half of Firebase Cloud Messaging. Optional and dormant: it does
 * nothing until every NEXT_PUBLIC_FIREBASE_* value below is set in Vercel (and
 * the site is redeployed, because Next inlines public variables at build time).
 *
 * It runs only after the reader has already allowed notifications and the
 * device is subscribed through standard Web Push, then links an FCM token to
 * that same device (/api/notifications/fcm). The Firebase SDK is loaded on
 * demand, so readers who never enable notifications never download it.
 *
 * Important: in the Firebase console (Project settings → Cloud Messaging → Web
 * Push certificates) choose "Import an existing key pair" and paste the site's
 * VAPID keys. FCM then reuses the browser's existing subscription instead of
 * replacing it, so both transports keep working.
 */

/** "REPLACE_ME_…" test values in Vercel count as not configured. */
const placeholder = (value: string | undefined) => /replace[_-]?me|placeholder|changeme|your[_-]?(firebase|project)/i.test(value ?? "");
const real = (value: string | undefined) => (value && !placeholder(value) ? value : undefined);

// Literal property access so Next can inline each value at build time.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
  authDomain: real(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim()),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
  storageBucket: real(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
};
// Optional: an unset or placeholder value falls back to the site's own VAPID key.
const FIREBASE_VAPID_KEY = real(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) || VAPID_PUBLIC_KEY;

export const FCM_CLIENT_READY = Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId && FIREBASE_VAPID_KEY)
  && ![config.apiKey, config.projectId, config.messagingSenderId, config.appId].some(placeholder);

const LINKED_KEY = "epelawa-fcm-linked";
const RELINK_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

/** Best effort: never throws and never blocks the Web Push result the reader sees. */
export async function linkFcmToken(registration: ServiceWorkerRegistration, endpoint: string, force = false): Promise<boolean> {
  if (!FCM_CLIENT_READY) return false;
  try {
    const last = Number(localStorage.getItem(LINKED_KEY) ?? 0);
    if (!force && last && Date.now() - last < RELINK_EVERY_MS) return true;
  } catch { /* storage blocked: link anyway */ }
  try {
    const [{ initializeApp, getApps }, messaging] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
    if (!(await messaging.isSupported())) return false;
    const app = getApps()[0] ?? initializeApp(config);
    const token = await messaging.getToken(messaging.getMessaging(app), { vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return false;
    const response = await fetch("/api/notifications/fcm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint, token }),
      cache: "no-store",
    });
    if (!response.ok) return false;
    try { localStorage.setItem(LINKED_KEY, String(Date.now())); } catch { /* storage blocked */ }
    return true;
  } catch {
    return false;
  }
}

export function forgetFcmLink() {
  try { localStorage.removeItem(LINKED_KEY); } catch { /* storage blocked */ }
}
