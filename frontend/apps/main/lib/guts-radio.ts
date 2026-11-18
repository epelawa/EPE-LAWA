import "server-only";
import { unstable_cache } from "next/cache";

export type GutsStation = { name: string; frequency: string; streamUrl: string };
/** Only the named station is accepted; the provider never receives user-supplied URLs. */
export function parseGutsStation(payload: unknown): GutsStation | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as {data?:unknown}).data;
  if (!Array.isArray(data)) return null;
  const matches = data.filter((entry): entry is Record<string, unknown> => {
    if (!entry || typeof entry !== "object") return false;
    const r=entry as Record<string, unknown>;
    return typeof r.name === "string" && /^guts\s*fm(?:\s*104[.,]9)?$/i.test(r.name.trim());
  });
  if (matches.length !== 1) return null;
  const item=matches[0];
  if (typeof item.streamUrl !== "string" || item.streamUrl.length > 2048) return null;
  try {
    const url = new URL(item.streamUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || !url.hostname.includes(".") || /^(localhost|.*\.localhost|.*\.local|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(url.hostname)) return null;
    return { name: "Guts FM", frequency: typeof item.frequency === "string" ? item.frequency.slice(0,32) : "104.9 FM", streamUrl: url.href };
  } catch { return null; }
}

export const getGutsStation = unstable_cache(async (): Promise<GutsStation | null> => {
  const key = process.env.NAIJA_RADIO_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch("https://fm.puzzofme.com/api/v1/stations?countryCode=NG&search=Guts&limit=100", {
      headers: { Authorization: `Bearer ${key}` }, redirect: "error", next: { revalidate: 600 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return parseGutsStation(await response.json());
  } catch { return null; }
}, ["guts-fm-catalogue"], { revalidate: 60 });
