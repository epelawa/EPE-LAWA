/** Fetch only from the browser: never proxy untrusted image URLs through the server. */
export async function buildShareCover(imageUrl: string): Promise<File | null> {
  try {
    const url = new URL(imageUrl, window.location.origin);
    if (url.origin !== window.location.origin && url.protocol !== "https:") return null;
    const response = await fetch(url.href, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const advertised = Number(response.headers.get("content-length"));
    if (advertised > 8 * 1024 * 1024) return null;
    const blob = await response.blob();
    const allowed: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    const extension = allowed[blob.type.toLowerCase()];
    if (!extension || blob.size === 0 || blob.size > 8 * 1024 * 1024) return null;
    return new File([blob], `epe-lawa-cover.${extension}`, { type: blob.type });
  } catch { return null; }
}
