/** Contract for a future foreground push adapter. Never pass message contents here. */
export const NOTIFICATION_SOUND_EVENT = "epelawa:notification-arrived";
export const NOTIFICATION_SOUND_STORAGE = "epelawa:notification-sound:v1";
export function notificationSoundId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const data = value as { type?: unknown; id?: unknown };
  return data.type === NOTIFICATION_SOUND_EVENT && typeof data.id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(data.id) ? data.id : null;
}
