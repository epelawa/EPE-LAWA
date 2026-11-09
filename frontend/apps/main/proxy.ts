import { NextResponse, type NextRequest } from "next/server";

/** Pass the matched staff path upstream as a return hint, never as authorization. */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-epe-lawa-admin-route", request.nextUrl.pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin/:path*"],
};
