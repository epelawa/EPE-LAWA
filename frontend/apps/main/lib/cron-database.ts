import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Call only after the route has checked the cron secret. */
export function cronDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const endpoint = url ? new URL(url) : null;
  if (!key || !endpoint || endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash) {
    throw new Error("Cron history service is not configured.");
  }
  return createClient(endpoint.origin, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
