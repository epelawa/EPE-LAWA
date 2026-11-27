import { newsArticlePath } from "./news-urls";

const CACHE = "epelawa-offline-stories-v1";
const MAX_STORIES = 20;
const MAX_BYTES = 512 * 1024;

export async function saveOfflineStory(slug: string, html: string): Promise<void> {
  const path = newsArticlePath(slug);
  if (!/^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) throw new Error("Invalid article path");
  if (!("serviceWorker" in navigator) || !("caches" in window)) throw new Error("Offline storage unavailable");

  const body = new Blob([html], { type: "text/html; charset=utf-8" });
  if (body.size > MAX_BYTES) throw new Error("Article too large for offline storage");

  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const ready = await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Offline worker unavailable")), 8000);
    void navigator.serviceWorker.ready.then((registration) => {
      window.clearTimeout(timer);
      resolve(registration);
    });
  });
  if (ready.active?.scriptURL !== new URL("/sw.js", window.location.origin).href) throw new Error("Offline worker unavailable");

  const cache = await caches.open(CACHE);
  const url = new URL(path, window.location.origin);
  await cache.put(url, new Response(body, {
    headers: {
      "content-type": body.type,
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  }));
  const keys = (await cache.keys()).filter((key) => key.url !== url.href);
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STORIES + 1)).map((key) => cache.delete(key)));
}
