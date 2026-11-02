/** A verified identity, not an untrusted session or user-provided role. */
export type VerifiedIdentity = { id: string };

/** Implementations must verify tokens with the identity provider and query using RLS. */
export interface StaffAccessProvider {
  verifyUser(token: string): Promise<VerifiedIdentity | null>;
  hasActiveAdminGrant(userId: string): Promise<boolean>;
}

export type AdminAccess = { allowed: true; userId: string } | { allowed: false };

/**
 * Fail closed on invalid identity, missing or revoked grants, and provider failure.
 * This authorises entry only: resource-level editorial permissions remain separate.
 */
export async function authorizeAdminAccess(
  token: string | null | undefined,
  provider: StaffAccessProvider,
): Promise<AdminAccess> {
  if (!token || token.length > 8192 || /\s/.test(token)) return { allowed: false };

  try {
    const identity = await provider.verifyUser(token);
    if (!identity || typeof identity.id !== "string" || !identity.id) {
      return { allowed: false };
    }
    const granted = await provider.hasActiveAdminGrant(identity.id);
    return granted === true ? { allowed: true, userId: identity.id } : { allowed: false };
  } catch {
    // Fail closed without leaking credentials, identity or upstream error details.
    return { allowed: false };
  }
}

/**
 * Unwired helper for future admin flows. Only an explicitly allowed literal
 * same-host path is returned; everything else falls back to '/'. No query,
 * fragment, encoding, dot segment, backslash, empty segment or external URL is
 * accepted. This does not authorise a user or configure Supabase redirects.
 */
export function safeAdminRedirect(candidate: string | null | undefined, allowedPaths: readonly string[]): string {
  const literalPath = /^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)?$/;
  if (!candidate || candidate.length > 512 || !literalPath.test(candidate)) return "/";
  return allowedPaths.some((path) => path === candidate && literalPath.test(path)) ? candidate : "/";
}
