export type AuthLinkIssue = "expired" | "problem";

const EXPIRED_PATTERN = /\b(expired|invalid|already\s+used|used)\b/i;

export function authLinkIssueFromParams(params: URLSearchParams): AuthLinkIssue | null {
  const errorCode = params.get("error_code") ?? "";
  const error = params.get("error") ?? "";
  const description = params.get("error_description") ?? "";
  if (!errorCode && !error && !description) return null;
  return EXPIRED_PATTERN.test(`${errorCode} ${error} ${description}`) ? "expired" : "problem";
}

function callbackParams(value: string): URLSearchParams {
  const raw = value.replace(/^[?#]/, "");
  return new URLSearchParams(raw);
}

export function authLinkIssueFromLocation(search: string, hash: string): AuthLinkIssue | null {
  const searchParams = callbackParams(search);
  const hashParams = callbackParams(hash);
  const merged = new URLSearchParams();
  for (const key of ["error_code", "error", "error_description"]) {
    merged.set(key, searchParams.get(key) ?? hashParams.get(key) ?? "");
  }
  return authLinkIssueFromParams(merged);
}

export function authLinkIssuePath(issue: AuthLinkIssue): string {
  return issue === "expired" ? "/auth/link-expired" : "/auth/link-problem";
}
