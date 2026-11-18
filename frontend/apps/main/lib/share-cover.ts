const MAX_SHARE_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** Fetch only from the browser: never proxy untrusted image URLs through the server. */
export async function buildShareCover(imageUrl: string): Promise<File | null> {
  try {
    const url = new URL(imageUrl, window.location.origin);
    if (url.origin !== window.location.origin && url.protocol !== "https:") return null;
    const response = await fetch(url.href, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000) });
    if (!response.ok || !response.body) return null;
    const mime = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
    const extension = IMAGE_EXTENSIONS[mime];
    const advertised = Number(response.headers.get("content-length"));
    if (!extension || advertised > MAX_SHARE_BYTES) {
      await response.body.cancel().catch(() => {});
      return null;
    }

    // Content-Length is optional and untrusted: cap the bytes while reading,
    // not after response.blob() has already allocated the entire response.
    const reader = response.body.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_SHARE_BYTES) {
          await reader.cancel().catch(() => {});
          return null;
        }
        parts.push(new Uint8Array(value));
      }
    } finally {
      reader.releaseLock();
    }
    if (!size) return null;
    return new File(parts, `epe-lawa-cover.${extension}`, { type: mime });
  } catch { return null; }
}
