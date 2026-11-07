export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

export const WEB_PUSH_READY =
  process.env.NEXT_PUBLIC_WEB_PUSH_ENABLED === "true" && VAPID_PUBLIC_KEY.length > 0;
