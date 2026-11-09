"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeAdminNextPath } from "./admin-path";
import { signInAdminWithPassword } from "./supabase-access";

export type LoginState = { error?: string };

export async function signInAdmin(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;
  const cookieStore = await cookies();
  const result = await signInAdminWithPassword(email, password, {
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (entries) => {
      for (const entry of entries) {
        cookieStore.set(entry.name, entry.value, {
          ...(entry.options as Record<string, string | number | boolean | undefined>),
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          domain: undefined,
        });
      }
    },
  });
  if (!result.allowed) return { error: "Sign-in failed. Check your details or contact an administrator." };

  redirect(safeAdminNextPath(formData.get("next")));
}
