/**
 * Server-side Supabase client.
 *
 * Uses the service-role key (server only) for administrative operations.
 * Every call that mutates data goes through security definer functions that
 * validate the caller's capabilities — the service role is never exposed to
 * the browser.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // `set` may be called outside a request in some contexts.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", options);
          } catch {
            // Ignore.
          }
        },
      },
    }
  );
}
