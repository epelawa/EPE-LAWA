import { CAPABILITIES, type Capability } from "./capabilities";

export const PRIMARY_ADMIN_EMAIL = "info.epelawa@gmail.com";
export const NEWS_ONLY_EMAIL = "legateakanjimusab@gmail.com";
export { CAPABILITIES };
export type { Capability };
export type ManagedUser = { id: string; email: string; active: boolean; capabilities: Capability[] };

export function mayManageUsers(
  email: string | null | undefined,
  verified: boolean,
  active: boolean,
  capabilities: readonly string[],
): boolean {
  return verified && active && email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL && capabilities.includes("staff.manage");
}

export function safeGrant(targetEmail: string, requested: readonly string[]): Capability[] {
  const email = targetEmail.trim().toLowerCase();
  if (email === PRIMARY_ADMIN_EMAIL) return ["admin.access", "staff.manage", "audit.read"];
  if (email === NEWS_ONLY_EMAIL) return ["article.create"];
  return [...new Set(requested.filter((capability): capability is Capability =>
    CAPABILITIES.includes(capability as Capability) &&
    capability !== "admin.access" && capability !== "staff.manage" && capability !== "audit.read",
  ))];
}
