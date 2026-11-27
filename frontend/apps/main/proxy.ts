import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isGateExempt, maintenanceHtml, maintenanceState } from "./lib/maintenance";
import { contentSecurityPolicy, newCspNonce } from "./lib/csp";
import { adminRequestEvent, requestMeta, staffIdentity, writeAdminLog } from "./lib/admin-activity";
import { readAdminSessionFromCookies } from "../admin/lib/supabase-access";

const LOGGED_FIELD = /(^|_)(reason|note|notes|decision|status|action|comment|resolution)$/i;

/** Admin page opens and form submissions, logged after the response (admins only; never blocks the request). */
async function logAdminRequest(request: NextRequest, event: "page_view" | "action", body: Request | null) {
  const session = readAdminSessionFromCookies(request.cookies.getAll());
  if (!session?.access_token) return;
  const identity = await staffIdentity(session.access_token);
  if (!identity?.staff) return;
  const fields: Record<string, string> = {};
  let reason: string | null = null;
  if (body) {
    try {
      const form = await body.formData();
      for (const [name, value] of form.entries()) {
        if (typeof value !== "string" || !LOGGED_FIELD.test(name) || /password|token|secret/i.test(name)) continue;
        const key = name.replace(/^\d+_/, "");
        fields[key] = value.slice(0, 300);
        if (!reason && /reason|note|resolution|comment/i.test(key) && value.trim()) reason = value.trim().slice(0, 500);
      }
    } catch { /* unreadable body: log without fields */ }
  }
  await writeAdminLog({
    event,
    actorId: identity.id,
    actorEmail: identity.email,
    method: request.method,
    path: request.nextUrl.pathname,
    actionId: event === "action" ? request.headers.get("next-action") : null,
    reason,
    metadata: Object.keys(fields).length ? { fields } : {},
  }, requestMeta(request.headers));
}

export async function proxy(request: NextRequest, fetchEvent?: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  const nonce = newCspNonce();
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const pass = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", policy);
    return response;
  };

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    requestHeaders.set("x-epe-lawa-admin-route", pathname);
    const logged = adminRequestEvent(request.method, pathname, request.headers);
    if (logged && fetchEvent) {
      // Small text forms only (cloned before the request is forwarded); uploads are never buffered for the log.
      const small = logged === "action" && (request.headers.get("content-type") ?? "").includes("multipart/form-data")
        && Number(request.headers.get("content-length") ?? "1000000") <= 64_000;
      const body = small ? request.clone() : null;
      fetchEvent.waitUntil(logAdminRequest(request, logged, body).catch(() => undefined));
    }
    return pass();
  }
  if (isGateExempt(pathname) || await maintenanceState(process.env) === "off") return pass();
  const headers = {"Cache-Control":"no-store, private, max-age=0", "Retry-After":"300", "X-Robots-Tag":"noindex, nofollow", "Vary":"Accept", "Content-Security-Policy": contentSecurityPolicy(null)};
  if (pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) {
    return NextResponse.json({error:"temporarily_unavailable"}, {status:503,headers});
  }
  const random = crypto.getRandomValues(new Uint8Array(1))[0] & 3;
  return new NextResponse(request.method === "HEAD" ? null : maintenanceHtml(random), {status:503,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
