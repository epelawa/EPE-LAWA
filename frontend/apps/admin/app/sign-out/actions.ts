"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { staffHref } from "../../lib/admin-path";
import { signOutAdminSession } from "../../lib/supabase-access";

export async function signOutAdminAction(basePath: string): Promise<never> {
  const cookieStore = await cookies();
  const result = await signOutAdminSession({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (entries) => {
      for (const entry of entries) {
        const raw = entry.options ?? {};
        const sameSite: "lax" | "strict" | "none" =
          raw.sameSite === "strict" ? "strict" : raw.sameSite === "none" ? "none" : "lax";
        cookieStore.set(entry.name, entry.value, {
          path: typeof raw.path === "string" ? raw.path : "/",
          httpOnly: raw.httpOnly === true,
          secure: raw.secure === true,
          sameSite,
          maxAge: typeof raw.maxAge === "number" ? raw.maxAge : 0,
        });
      }
    },
  });

  if (!result.cookiesCleared) {
    throw new Error("Unable to clear the admin session cookies.");
  }
  redirect(staffHref("/login", basePath));
}
