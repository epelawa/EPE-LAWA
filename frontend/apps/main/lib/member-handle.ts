export type HandleAvailability = "available" | "taken" | "unavailable";

export const reservedHandles = new Set([
  "admin", "administrator", "epelawa", "epe", "support", "moderator", "mod",
  "news", "radio", "api", "staff", "system", "help", "info", "contact",
  "official", "root", "security", "editor", "publisher", "deleted",
]);

export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(handle) && !reservedHandles.has(handle);
}

/** Translate only the database's deliberately non-identifying contract. */
export function availabilityFromRpc(value: unknown): HandleAvailability {
  return value === "available" || value === "taken" ? value : "unavailable";
}
