import { NextResponse, type NextRequest } from "next/server";
import { isGateExempt, maintenanceHtml, maintenanceState } from "./lib/maintenance";
import { contentSecurityPolicy, newCspNonce } from "./lib/csp";

export async function proxy(request: NextRequest) {
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
