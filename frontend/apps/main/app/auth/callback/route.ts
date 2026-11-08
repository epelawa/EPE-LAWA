import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/auth/complete";
}
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeNext(request.nextUrl.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?verified=failed", request.url));
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?verified=failed", request.url));
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?verified=failed", request.url));
  }
}
