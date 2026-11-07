/** Convert an R2 object key to the configured public CDN URL, or return null when unavailable. */
export function publicMediaUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  if (!key || key.startsWith("/") || key.includes("\\")) return null;

  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  if (segments.some((segment) => /[\u0000-\u001f\u007f]/.test(segment))) return null;

  const configuredBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (!configuredBase) return null;

  try {
    const base = new URL(configuredBase);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
      return null;
    }
    const prefix = base.pathname.replace(/\/+$/, "");
    const encodedPath = segments.map(encodeURIComponent).join("/");
    return `${base.origin}${prefix}/${encodedPath}`;
  } catch {
    return null;
  }
}
