/**
 * EPE LAWA staff session inactivity policy. Kept in sync with
 * `frontend/apps/main/lib/session-policy.ts`: member sessions end after one
 * week of inactivity, staff sessions after ten hours.
 */
export const MEMBER_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
export const STAFF_INACTIVITY_MS = 10 * 60 * 60 * 1000; // 10 hours

export const ACTIVITY_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const ACTIVITY_COOKIE = {
  member: "epe-activity-member",
  staff: "epe-activity-admin",
} as const;

export type SessionScope = keyof typeof ACTIVITY_COOKIE;

export function isInactiveSince(
  raw: string | undefined | null,
  timeoutMs: number,
  now: number = Date.now(),
): boolean {
  if (!raw) return false;
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  return now - timestamp > timeoutMs;
}
