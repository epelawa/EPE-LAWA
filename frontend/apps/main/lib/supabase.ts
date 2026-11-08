import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Public Supabase configuration is missing or invalid.");
    this.name = "SupabaseConfigurationError";
  }
}

function publicConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new SupabaseConfigurationError();

  try {
    const parsed = new URL(url);
    const isLocalHttp = process.env.NODE_ENV !== "production" && parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !isLocalHttp) throw new Error("invalid protocol");
    if (parsed.username || parsed.password) throw new Error("invalid credentials");
  } catch {
    throw new SupabaseConfigurationError();
  }

  return { url, key };
}

/** Server client for user-scoped requests. Public pages still rely on database RLS. */
export async function createClient() {
  const { url, key } = publicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          for (const { name, value, options } of values) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always write refreshed cookies; request reads remain safe.
        }
      },
    },
  });
}
