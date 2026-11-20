import { NextResponse, type NextRequest } from "next/server";
import { isGateExempt, maintenanceHtml, maintenanceState } from "./lib/maintenance";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-epe-lawa-admin-route", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (isGateExempt(pathname) || await maintenanceState(process.env) === "off") return NextResponse.next();
  const headers = {"Cache-Control":"no-store, private, max-age=0", "Retry-After":"300", "X-Robots-Tag":"noindex, nofollow", "Vary":"Accept"};
  if (pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) {
    return NextResponse.json({error:"temporarily_unavailable"}, {status:503,headers});
  }
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return new NextResponse(request.method === "HEAD" ? null : maintenanceHtml(random), {status:503,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
}
