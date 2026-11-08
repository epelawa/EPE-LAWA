import { NextResponse, type NextRequest } from "next/server";
import { authLinkIssueFromParams, authLinkIssuePath, type AuthLinkIssue } from "../../../lib/auth-link-errors";
import { createClient } from "../../../lib/supabase";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/auth/complete";
}

function issueRedirect(request: NextRequest, issue: AuthLinkIssue) {
  return NextResponse.redirect(new URL(authLinkIssuePath(issue), request.url));
}

function issueFromExchangeError(error: { code?: string; message?: string }): AuthLinkIssue {
  const params = new URLSearchParams();
  if (error.code) params.set("error_code", error.code);
  if (error.message) params.set("error_description", error.message);
  return authLinkIssueFromParams(params) ?? "problem";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const callbackIssue = authLinkIssueFromParams(params);
  if (callbackIssue) return issueRedirect(request, callbackIssue);

  const code = params.get("code");
  const destination = safeNext(params.get("next"));
  if (!code) return issueRedirect(request, "problem");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return issueRedirect(request, issueFromExchangeError(error));
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return issueRedirect(request, "problem");
  }
}
