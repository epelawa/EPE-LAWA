/*
 * EPE LAWA service worker for notifications and explicitly saved public stories.
 *
 * Notification permission is requested separately by the browser UI. Offline reading
 * never caches a network response or a signed-in page.
 */

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Same-origin paths only (the worker never follows absolute URLs).
const SAFE_PATH = /^\/[A-Za-z0-9/_?=&%.-]*$/;
const safePath = (value) => typeof value === "string" && value.length <= 600 && SAFE_PATH.test(value) && !value.startsWith("//") ? value : null;

self.addEventListener("push", (event) => {
  let title = "EPE LAWA";
  let options = { body: "", tag: null, data: { url: "/" } };
  try {
    const parsed = event.data ? event.data.json() : {};
    // Two shapes arrive here: our own VAPID payload {title, body, url, kind, image, tag}
    // and Firebase Cloud Messaging's {notification: {...}, data: {...}}.
    const fcm = parsed && typeof parsed.notification === "object" && parsed.notification ? parsed.notification : null;
    const extra = parsed && typeof parsed.data === "object" && parsed.data ? parsed.data : {};
    const raw = fcm ? { ...extra, ...fcm, url: extra.url, kind: extra.kind, tag: extra.tag, image: extra.image || fcm.image } : parsed;
    if (typeof raw.title === "string" && raw.title.trim().length > 0 && raw.title.length <= 140) {
      title = raw.title.trim();
    }
    if (typeof raw.body === "string" && raw.body.trim().length > 0 && raw.body.length <= 1000) {
      options.body = raw.body.trim();
    }
    const url = safePath(raw.url);
    if (url) options.data = { url };
    if (typeof raw.kind === "string" && raw.kind.length > 0 && raw.kind.length <= 40) {
      options.tag = `epelawa:${raw.kind}`;
    }
    // A per-story tag means the same story never shows twice on one device.
    if (typeof raw.tag === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(raw.tag)) options.tag = raw.tag;
    // The story's cover photo, served by this site (/news/{slug}/cover).
    const image = safePath(raw.image);
    if (image) options.image = image;
  } catch {
    // Keep the safe fallback payload above on anything unparseable.
  }
  options.body = options.body || "There is an update on EPE LAWA.";
  options.icon = "/brand-logo.webp";
  options.badge = "/brand-logo.webp";
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let target = "/";
  const raw = event.notification.data && event.notification.data.url;
  if (safePath(raw)) target = raw;
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      try {
        const path = new URL(client.url).pathname;
        if (path === target || path === target.split("?")[0]) {
          await client.focus();
          if (path !== target) await client.navigate(target);
          return;
        }
      } catch {
        // Uninspectable client; fall through to opening a new window.
      }
    }
    await self.clients.openWindow(target);
  })());
});

// Use the original URL for a saved article. Always give the network the first
// chance so corrections and removals are visible when the reader is online.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !/^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)) return;
  event.respondWith(fetch(request).catch(async (error) => {
    const saved = await caches.match(url.pathname, { cacheName: "epelawa-offline-stories-v1" });
    if (saved) return saved;
    throw error;
  }));
});
