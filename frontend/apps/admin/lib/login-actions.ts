"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeAdminNextPath } from "./admin-path";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_MAX_AGE_SECONDS } from "./session-policy";
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

  // Start a fresh staff inactivity window for this sign-in.
  cookieStore.set(ACTIVITY_COOKIE.staff, String(Date.now()), {
    path: "/",
    maxAge: ACTIVITY_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  redirect(safeAdminNextPath(formData.get("next")));
}
