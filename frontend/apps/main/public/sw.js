/*
 * EPE LAWA web-push service worker.
 *
 * Registered by the notification opt-in only after the member explicitly allows
 * notifications and while the public web-push flag is live. It handles exactly
 * two things: showing a server-pushed notification and opening the notification's
 * same-site path. Links are literal relative paths; absolute URLs are dropped.
 */

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
