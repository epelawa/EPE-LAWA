/**
 * Presence-only readiness claims for the settings desk.
 *
 * SECURITY + HONESTY: reads server env, returns only variable NAMES (never
 * values) and a three-state label. Presence is not verification: a variable
 * being set does not prove the provider works.
 */

export type ReadinessState = "ready" | "incomplete" | "optional" | "off";

export type ReadinessTile = {
  label: string;
  description: string;
  state: ReadinessState;
  missing: string[];
  set: string[];
  href?: string;
};

function allSet(env: NodeJS.ProcessEnv, names: string[]): { set: string[]; missing: string[] } {
  const set = names.filter(name => Boolean(env[name]?.trim()));
  return { set, missing: names.filter(name => !set.includes(name)) };
}

export function systemReadiness(env: NodeJS.ProcessEnv): ReadinessTile[] {
  const tiles: ReadinessTile[] = [];

  const listing = allSet(env, ["R2_ACCOUNT_ID", "R2_BUCKET_PRIVATE", "CLOUDFLARE_API_TOKEN"]);
  tiles.push({
    label: "Database backups",
    description: listing.missing.length === 0 ? "Snapshot listing is ready on the backups desk." : "Snapshot listing needs the remaining private-storage variables.",
    state: listing.missing.length === 0 ? "ready" : "incomplete",
    missing: listing.missing,
    set: listing.set,
    href: "/backups",
  });

  const dispatch = allSet(env, ["BACKUP_DISPATCH_TOKEN", "BACKUP_WORKFLOW_REPO"]);
  tiles.push({
    label: "Backup automation",
    description: dispatch.missing.length === 0 ? "On-demand and pre-restore snapshots can be dispatched." : "Dispatching snapshots needs the remaining workflow variables.",
    state: dispatch.missing.length === 0 ? "ready" : "incomplete",
    missing: dispatch.missing,
    set: dispatch.set,
    href: "/backups",
  });

  const email = allSet(env, ["NEWSLETTER_SMTP_HOST", "NEWSLETTER_SMTP_USER", "NEWSLETTER_SMTP_PASSWORD", "NEWSLETTER_FROM"]);
  tiles.push({
    label: "Newsletter sending",
    description: email.missing.length === 0 ? "Newsletter delivery can send through SMTP." : "Newsletter delivery stays disabled until SMTP is complete.",
    state: email.missing.length === 0 ? "ready" : "off",
    missing: email.missing,
    set: email.set,
  });

  const pushFlag = env.NEXT_PUBLIC_WEB_PUSH_ENABLED === "true";
  // The names the sender actually reads (lib/web-push-send.ts, lib/push-crypto.ts).
  const push = allSet(env, ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT", "PUSH_DISPATCH_SECRET"]);
  tiles.push({
    label: "Web push",
    description: !pushFlag ? "Feature flag is off; members are not asked to subscribe." : push.missing.length === 0 ? "Flag and key pair are present." : "Flag is on but the key pair is incomplete.",
    state: !pushFlag ? "off" : push.missing.length === 0 ? "ready" : "incomplete",
    missing: pushFlag ? push.missing : ["NEXT_PUBLIC_WEB_PUSH_ENABLED"],
    set: pushFlag ? push.set : [],
    href: "/",
  });

  // Firebase Cloud Messaging is optional: Web Push above already reaches every browser.
  const fcmServer = allSet(env, ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]);
  const fcmBrowser = allSet(env, ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"]);
  const fcmSet = [...fcmServer.set, ...fcmBrowser.set];
  const fcmMissing = [...fcmServer.missing, ...fcmBrowser.missing];
  tiles.push({
    label: "Firebase Cloud Messaging",
    description: fcmMissing.length === 0
      ? "Firebase is configured: subscribed devices link an FCM token and are notified through FCM, falling back to Web Push."
      : fcmSet.length === 0
        ? "Optional. Paste the Firebase service account and web config into the hosting environment, then redeploy. Until then notifications go through Web Push."
        : "Some Firebase variables are set; add the rest and redeploy. Notifications keep going through Web Push meanwhile.",
    state: fcmMissing.length === 0 ? "ready" : fcmSet.length === 0 ? "optional" : "incomplete",
    missing: fcmMissing,
    set: fcmSet,
  });

  const storage = allSet(env, ["R2_BUCKET_PUBLIC", "NEXT_PUBLIC_R2_PUBLIC_BASE_URL"]);
  tiles.push({
    label: "Public media",
    description: storage.missing.length === 0 ? "Uploads resolve through the configured base URL." : "Member uploads need the public bucket variables.",
    state: storage.missing.length === 0 ? "ready" : storage.set.length === 0 ? "optional" : "incomplete",
    missing: storage.missing,
    set: storage.set,
  });

  return tiles;
}
