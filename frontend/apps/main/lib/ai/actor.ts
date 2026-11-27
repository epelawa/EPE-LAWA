import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The AI acts as its own staff identity ("EPE LAWA AI Assistant") so every
 * article, decision and audit row names it, never a human. The account is
 * banned from signing in (no password is ever known) and the database grants it
 * only the capabilities listed in ai_actor_bootstrap.
 */

export const AI_ACTOR_EMAIL = "ai-assistant@epelawa.vercel.app";
export const AI_ACTOR_NAME = "EPE LAWA AI Assistant";

export async function ensureAiActor(db: SupabaseClient): Promise<string> {
  const { data: settings } = await db.from("ai_settings").select("actor_user_id").eq("id", 1).maybeSingle();
  let userId = settings?.actor_user_id ? String(settings.actor_user_id) : null;
  if (userId) {
    const { data } = await db.auth.admin.getUserById(userId);
    if (data?.user?.app_metadata?.epe_lawa_ai !== true) userId = null;
  }
  if (!userId) {
    const created = await db.auth.admin.createUser({
      email: AI_ACTOR_EMAIL,
      password: randomBytes(48).toString("base64url"),
      email_confirm: true,
      ban_duration: "876000h",
      app_metadata: { epe_lawa_ai: true },
      user_metadata: { full_name: AI_ACTOR_NAME, display_name: AI_ACTOR_NAME },
    });
    if (created.data?.user) userId = created.data.user.id;
    else {
      // Already created by an earlier run that could not save its id: find it.
      for (let page = 1; page <= 10 && !userId; page += 1) {
        const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
        const match = data?.users.find((user) => user.email?.toLowerCase() === AI_ACTOR_EMAIL && user.app_metadata?.epe_lawa_ai === true);
        if (match) userId = match.id;
        if (!data || data.users.length < 200) break;
      }
    }
  }
  if (!userId) throw new Error("ai_actor_unavailable");
  const { error } = await db.rpc("ai_actor_bootstrap", { p_user_id: userId });
  if (error) throw new Error(`ai_actor_bootstrap: ${error.message}`);
  return userId;
}
