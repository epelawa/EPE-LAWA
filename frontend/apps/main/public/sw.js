/*
 * EPE LAWA service worker for notifications and explicitly saved public stories.
 *
 * Notification permission is requested separately by the browser UI. Offline reading
 * never caches a network response or a signed-in page.
 */

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let title = "EPE LAWA";
  let options = { body: "", tag: null, data: { url: "/" } };
  try {
    const raw = event.data ? event.data.json() : {};
    if (typeof raw.title === "string" && raw.title.trim().length > 0 && raw.title.length <= 140) {
      title = raw.title.trim();
    }
    if (typeof raw.body === "string" && raw.body.trim().length > 0 && raw.body.length <= 1000) {
      options.body = raw.body.trim();
    }
    if (typeof raw.url === "string" && /^\/[A-Za-z0-9/_?=&%.-]*$/.test(raw.url) && !raw.url.startsWith("//")) {
      options.data = { url: raw.url };
    }
    if (typeof raw.kind === "string" && raw.kind.length > 0 && raw.kind.length <= 40) {
      options.tag = `epelawa:${raw.kind}`;
    }
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
  if (typeof raw === "string" && /^\/[A-Za-z0-9/_?=&%.-]*$/.test(raw) && !raw.startsWith("//")) {
    target = raw;
  }
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
