/**
 * EPE LAWA session inactivity policy.
 *
 * The policy is shared by the client guard, the server-rendered checks and the
 * sign-in actions. A member session ends after one week without activity; a
 * staff session ends after ten hours. These are inactivity windows, not cookie
 * lifetimes: any real interaction refreshes the window.
 */
export const MEMBER_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
export const STAFF_INACTIVITY_MS = 10 * 60 * 60 * 1000; // 10 hours

/** Activity cookies are kept well past the window so a stale value can be detected. */
export const ACTIVITY_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const ACTIVITY_COOKIE = {
  member: "epe-activity-member",
  staff: "epe-activity-admin",
} as const;

export type SessionScope = keyof typeof ACTIVITY_COOKIE;

/** True when a recorded activity timestamp is older than the scope's window. */
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
