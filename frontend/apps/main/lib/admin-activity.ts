import { createHash } from "node:crypto";
import { isIP } from "node:net";

/**
 * Admin activity log (owner request: who did what, when, from where, on which
 * device). Location comes from the network, not the person: Vercel's edge adds
 * the client IP and an IP-based city/region/country with approximate
 * coordinates to every request (x-vercel-ip-*). No browser permission is
 * asked and nothing is shown to the admin; only primary administrators can
 * read the log. Members and guests are never logged here.
 *
 * Kept free of `server-only`/next/headers so the request proxy can use it.
 */

export type AdminEvent = "login" | "login_failed" | "logout" | "session_expired" | "page_view" | "action";

export type RequestMeta = {
  ip: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

function header(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  if (!value) return null;
  try {
    return decodeURIComponent(value).slice(0, 120);
  } catch {
    return value.slice(0, 120);
  }
}

function coordinate(value: string | null, limit: number): number | null {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

const REGION_NAMES = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

export function parseUserAgent(ua: string | null): { device: string | null; browser: string | null; os: string | null } {
  if (!ua) return { device: null, browser: null, os: null };
  const os = /windows nt 10/i.test(ua) ? "Windows 10/11" : /windows/i.test(ua) ? "Windows"
    : /iphone|ipad|ipod/i.test(ua) ? `iOS ${ua.match(/OS (\d+)[_.](\d+)/)?.slice(1, 3).join(".") ?? ""}`.trim()
      : /android/i.test(ua) ? `Android ${ua.match(/Android (\d+(?:\.\d+)?)/)?.[1] ?? ""}`.trim()
        : /mac os x/i.test(ua) ? "macOS" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : null;
  const browser = /edg\//i.test(ua) ? `Edge ${ua.match(/Edg\/(\d+)/)?.[1] ?? ""}`.trim()
    : /opr\/|opera/i.test(ua) ? "Opera"
      : /samsungbrowser/i.test(ua) ? "Samsung Internet"
        : /firefox\//i.test(ua) ? `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] ?? ""}`.trim()
          : /chrome\/|crios\//i.test(ua) ? `Chrome ${ua.match(/(?:Chrome|CriOS)\/(\d+)/)?.[1] ?? ""}`.trim()
            : /safari\//i.test(ua) ? `Safari ${ua.match(/Version\/(\d+)/)?.[1] ?? ""}`.trim() : null;
  const model = ua.match(/Android [^;]*; ([^;)]+?)(?: Build|\))/)?.[1]?.trim();
  const device = /ipad|tablet/i.test(ua) ? "Tablet" : /iphone/i.test(ua) ? "iPhone"
    : /mobile|android/i.test(ua) ? (model && model !== "K" ? `Phone (${model.slice(0, 60)})` : "Phone") : "Desktop";
  return { device, browser, os };
}

export function requestMeta(headers: Headers): RequestMeta {
  const forwarded = headers.get("x-vercel-forwarded-for")?.trim() ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = isIP(forwarded) ? forwarded : null;
  const ua = headers.get("user-agent")?.slice(0, 600) ?? null;
  const countryCode = header(headers, "x-vercel-ip-country");
  let country = countryCode;
  try { if (countryCode && REGION_NAMES) country = `${REGION_NAMES.of(countryCode) ?? countryCode} (${countryCode})`; } catch { /* keep code */ }
  return {
    ip,
    user_agent: ua,
    ...parseUserAgent(ua),
    country,
    region: header(headers, "x-vercel-ip-country-region"),
    city: header(headers, "x-vercel-ip-city"),
    latitude: coordinate(headers.get("x-vercel-ip-latitude"), 90),
    longitude: coordinate(headers.get("x-vercel-ip-longitude"), 180),
    timezone: header(headers, "x-vercel-ip-timezone"),
  };
}

/** Readable admin section from a path, e.g. /admin/newsroom/123/edit → "Newsroom". */
export function adminSection(path: string): string {
  const clean = path.replace(/^\/admin/, "").split("?")[0];
  const first = clean.split("/").filter(Boolean)[0] ?? "";
  if (!first) return "Dashboard";
  const known: Record<string, string> = {
    "ai-scheduler": "AI Scheduler", "ai-processes": "AI processes", logs: "Logs", newsroom: "Newsroom", "business-review": "Businesses",
    "itan-ilu-mi": "History", moderation: "Moderation", users: "Staff users", roles: "Roles", "site-pages": "Site pages", "legal-pages": "Legal pages",
  };
  return known[first] ?? first.replace(/-/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function serviceConfig(env: NodeJS.ProcessEnv = process.env): { url: string; key: string } | null {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL)?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^https:\/\//.test(url)) return null;
  return { url, key };
}

export type AdminLogEntry = {
  event: AdminEvent;
  actorId?: string | null;
  actorEmail?: string | null;
  method?: string | null;
  path?: string | null;
  actionId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAdminLog(entry: AdminLogEntry, meta: RequestMeta, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = serviceConfig(env);
  if (!config) return;
  const path = entry.path?.split("?")[0]?.slice(0, 600) ?? null;
  try {
    await fetch(`${config.url}/rest/v1/admin_activity_log`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
      headers: { apikey: config.key, authorization: `Bearer ${config.key}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({
        event: entry.event,
        actor_id: entry.actorId ?? null,
        actor_email: entry.actorEmail?.slice(0, 254) ?? null,
        method: entry.method && ["GET", "POST", "HEAD"].includes(entry.method) ? entry.method : null,
        path,
        section: path ? adminSection(path) : null,
        action_id: entry.actionId?.slice(0, 120) ?? null,
        reason: entry.reason?.slice(0, 500) ?? null,
        metadata: entry.metadata ?? {},
        ...meta,
      }),
    });
  } catch {
    // Logging must never break the admin; a failed write is simply absent.
  }
}

type Identity = { id: string; email: string | null; staff: boolean };
const identityCache = new Map<string, { at: number; identity: Identity | null }>();

/** Verifies the admin session token with Supabase Auth and confirms an active staff profile (cached 5 minutes). */
export async function staffIdentity(accessToken: string, env: NodeJS.ProcessEnv = process.env): Promise<Identity | null> {
  const config = serviceConfig(env);
  if (!config || !accessToken) return null;
  const key = createHash("sha256").update(accessToken).digest("hex");
  const cached = identityCache.get(key);
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.identity;
  let identity: Identity | null = null;
  try {
    const user = await fetch(`${config.url}/auth/v1/user`, { cache: "no-store", signal: AbortSignal.timeout(4000), headers: { apikey: config.key, authorization: `Bearer ${accessToken}` } });
    if (user.ok) {
      const body = (await user.json()) as { id?: string; email?: string };
      if (body.id) {
        const profile = await fetch(`${config.url}/rest/v1/staff_profiles?select=is_active&user_id=eq.${encodeURIComponent(body.id)}`, { cache: "no-store", signal: AbortSignal.timeout(4000), headers: { apikey: config.key, authorization: `Bearer ${config.key}` } });
        const rows = profile.ok ? ((await profile.json()) as { is_active?: boolean }[]) : [];
        identity = { id: body.id, email: body.email ?? null, staff: rows[0]?.is_active === true };
      }
    }
  } catch {
    identity = null;
  }
  if (identityCache.size > 500) identityCache.clear();
  identityCache.set(key, { at: Date.now(), identity });
  return identity;
}

/** Which admin requests are logged: real page opens (not prefetches or assets) and form/server-action submissions. */
export function adminRequestEvent(method: string, pathname: string, headers: Headers): "page_view" | "action" | null {
  if (!(pathname === "/admin" || pathname.startsWith("/admin/"))) return null;
  if (pathname.startsWith("/admin/login") || /\.[a-z0-9]{2,5}$/i.test(pathname) || pathname.startsWith("/admin/api/")) return null;
  if (method === "POST" && headers.get("next-action")) return "action";
  if (method !== "GET") return null;
  if (headers.get("next-router-prefetch") || headers.get("purpose") === "prefetch" || headers.get("sec-purpose")?.includes("prefetch")) return null;
  if (headers.get("rsc") === "1" || headers.get("sec-fetch-dest") === "document") return "page_view";
  return null;
}
