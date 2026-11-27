"use client";

import { VAPID_PUBLIC_KEY, WEB_PUSH_READY } from "./vapid";

/**
 * Browser-side Web Push helpers shared by the Notification Centre and the
 * first-visit onboarding. Permission is only ever requested from a click
 * handler, and "subscribed" is only reported after the server confirms it
 * stored the subscription and the chosen topics.
 */

export type PushTopics = { news: boolean; radio: boolean };
export type PushSupport = "supported" | "unsupported" | "disabled";
export type PushPermission = "default" | "granted" | "denied" | "unsupported";
export type PushResult =
  | { ok: true; topics: PushTopics }
  | { ok: false; reason: "denied" | "unsupported" | "unavailable" | "failed"; message: string };

export const ONBOARDING_KEY = "epelawa-push-onboarding";
const STATE_KEY = "epelawa-push-state";
const TOPICS_KEY = "epelawa-push-topics";
const SYNC_KEY = "epelawa-push-synced";
const SYNC_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

function storeTopics(topics: PushTopics) {
  try { localStorage.setItem(TOPICS_KEY, JSON.stringify(topics)); localStorage.setItem(SYNC_KEY, String(Date.now())); } catch { /* storage blocked */ }
}
function storedTopics(): PushTopics | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TOPICS_KEY) ?? "null");
    if (parsed && typeof parsed === "object" && typeof (parsed as PushTopics).news === "boolean" && typeof (parsed as PushTopics).radio === "boolean") return parsed as PushTopics;
  } catch { /* storage blocked */ }
  return null;
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!WEB_PUSH_READY) return "disabled";
  if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return "supported";
}

export function pushPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermission;
}

/** The device was subscribed before but the browser permission or subscription is gone. */
export function rememberedSubscribed(): boolean {
  try { return localStorage.getItem(STATE_KEY) === "subscribed"; } catch { return false; }
}
function remember(value: "subscribed" | null) {
  try { if (value) localStorage.setItem(STATE_KEY, value); else localStorage.removeItem(STATE_KEY); } catch { /* storage blocked */ }
}

export function markOnboarding(value: "dismissed" | "enabled" | "denied") {
  try { localStorage.setItem(ONBOARDING_KEY, value); } catch { /* storage blocked */ }
}
export function onboardingSeen(): boolean {
  try { return localStorage.getItem(ONBOARDING_KEY) !== null; } catch { return true; }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch { return null; }
}

function keyBytes(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function serverMessage(response: Response, fallback: string): Promise<string> {
  // Validation details are for API clients; tell visitors how to recover.
  if (response.status === 400) return fallback;
  try {
    const data: { error?: { message?: string } } = await response.json();
    return typeof data?.error?.message === "string" ? data.error.message : fallback;
  } catch { return fallback; }
}

/** Ask for permission (click-only), subscribe this device and store the topics server-side. */
export async function enablePush(topics: PushTopics): Promise<PushResult> {
  if (pushSupport() !== "supported") return { ok: false, reason: "unsupported", message: "This browser cannot receive push notifications." };
  let permission: NotificationPermission;
  try { permission = await Notification.requestPermission(); } catch { return { ok: false, reason: "failed", message: "The browser did not complete the permission request." }; }
  if (permission === "denied") return { ok: false, reason: "denied", message: "Notifications are blocked in your browser settings." };
  if (permission !== "granted") return { ok: false, reason: "failed", message: "Permission was not granted. You can try again." };
  let subscription: PushSubscription;
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    subscription = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) as unknown as PushSubscriptionOptionsInit["applicationServerKey"],
    });
  } catch {
    return { ok: false, reason: "failed", message: "This device could not be subscribed. Please try again." };
  }
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON(), topics }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, reason: "unavailable", message: await serverMessage(response, "Your settings could not be saved. Please try again.") };
    const data: { saved?: boolean; topics?: PushTopics } = await response.json();
    if (data.saved !== true) return { ok: false, reason: "unavailable", message: "Your settings could not be saved. Please try again." };
    remember("subscribed");
    storeTopics(data.topics ?? topics);
    return { ok: true, topics: data.topics ?? topics };
  } catch {
    return { ok: false, reason: "failed", message: "Your settings could not be saved. Check your connection and try again." };
  }
}

/** Update which topics this device receives (no account needed). Only reports success after the server confirms. */
export async function saveTopics(topics: PushTopics): Promise<PushResult> {
  const subscription = await currentSubscription();
  if (!subscription) return enablePush(topics);
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint, topics }), cache: "no-store",
    });
    // The server lost this device (e.g. it was retired): register it again with the new choice.
    if (response.status === 404) return enablePush(topics);
    if (!response.ok) return { ok: false, reason: "unavailable", message: await serverMessage(response, "Your choice could not be saved. Please try again.") };
    const data: { saved?: boolean; topics?: PushTopics } = await response.json();
    if (data.saved !== true) return { ok: false, reason: "unavailable", message: "Your choice could not be saved. Please try again." };
    storeTopics(data.topics ?? topics);
    return { ok: true, topics: data.topics ?? topics };
  } catch {
    return { ok: false, reason: "failed", message: "Your choice could not be saved. Check your connection and try again." };
  }
}

/** Remove this device's subscription on the server first, then in the browser. */
export async function disablePush(): Promise<PushResult> {
  const subscription = await currentSubscription();
  if (!subscription) { remember(null); return { ok: true, topics: { news: false, radio: false } }; }
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }), cache: "no-store",
    });
    if (!response.ok && response.status !== 404) return { ok: false, reason: "unavailable", message: await serverMessage(response, "Notifications could not be turned off. Please try again.") };
  } catch {
    return { ok: false, reason: "failed", message: "Notifications could not be turned off. Check your connection and try again." };
  }
  try { await subscription.unsubscribe(); } catch { /* the server copy is already gone */ }
  remember(null);
  try { localStorage.removeItem(TOPICS_KEY); localStorage.removeItem(SYNC_KEY); } catch { /* storage blocked */ }
  return { ok: true, topics: { news: false, radio: false } };
}

/** Topics stored on the server for this browser's own subscription, or null if unknown. */
export async function readTopics(): Promise<{ subscribed: boolean; topics: PushTopics } | null> {
  const subscription = await currentSubscription();
  if (!subscription) return { subscribed: false, topics: { news: false, radio: false } };
  try {
    const response = await fetch("/api/notifications/subscribe/status", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }), cache: "no-store",
    });
    if (!response.ok) return null;
    const data: { subscribed?: boolean; topics?: PushTopics } = await response.json();
    if (!data.subscribed) return { subscribed: false, topics: { news: false, radio: false } };
    const topics = { news: Boolean(data.topics?.news), radio: Boolean(data.topics?.radio) };
    storeTopics(topics);
    return { subscribed: true, topics };
  } catch { return null; }
}

/**
 * Keeps an already-granted subscription registered (weekly, silently). Never
 * asks for permission: it only runs when the browser already granted it and
 * holds a subscription, and it re-sends the topics this visitor chose.
 */
export async function syncPush(): Promise<void> {
  if (pushSupport() !== "supported" || pushPermission() !== "granted" || !rememberedSubscribed()) return;
  try {
    const last = Number(localStorage.getItem(SYNC_KEY) ?? "0");
    if (Number.isFinite(last) && Date.now() - last < SYNC_EVERY_MS) return;
  } catch { return; }
  const subscription = await currentSubscription();
  const topics = storedTopics();
  if (!subscription || !topics) return;
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON(), topics }), cache: "no-store",
    });
    if (response.ok) storeTopics(topics);
  } catch { /* try again on a later visit */ }
}
