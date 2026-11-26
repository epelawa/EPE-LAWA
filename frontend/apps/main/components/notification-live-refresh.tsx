"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase.client";
import { NOTIFICATION_SOUND_EVENT } from "../lib/notification-sound";

/** Refresh the member dashboard when new in-app notifications arrive while it is open. */
export default function NotificationLiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const db = createClient();
    let stopped = false;
    let checking = false;
    let seen: Set<string> | null = null;
    async function check() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const { data, error } = await db.from("notifications").select("id").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(40);
        if (stopped || error || !data) return;
        const current = new Set(data.map((row) => row.id as string));
        if (seen) {
          const added = [...current].filter((id) => !seen!.has(id));
          if (added.length) {
            window.dispatchEvent(new CustomEvent(NOTIFICATION_SOUND_EVENT, { detail: { type: NOTIFICATION_SOUND_EVENT, id: added[0] } }));
            router.refresh();
          }
        }
        seen = current;
      } catch {
        // Keep the previous snapshot on network errors and retry later.
      } finally { checking = false; }
    }
    void check();
    const timer = window.setInterval(() => void check(), 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [router, userId]);
  return null;
}
