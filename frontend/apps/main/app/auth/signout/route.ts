import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase";
import { ACTIVITY_COOKIE } from "../../../lib/session-policy";

/**
 * Ends a member session that aged out while the browser was closed.
 *
 * The dashboard's server check redirects here when the recorded activity
 * timestamp is older than the member inactivity window. Provider logout is
 * best-effort: an unavailable account service must still return the visitor
 * to the branded sign-in screen rather than a broken page.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // A missing provider configuration still ends the local screen.
  }
  const destination = new URL("/login", request.url);
  destination.searchParams.set("reason", "inactivity");
  const response = NextResponse.redirect(destination);
  response.cookies.set(ACTIVITY_COOKIE.member, "", { path: "/", maxAge: 0, sameSite: "lax" });
  return response;
}
