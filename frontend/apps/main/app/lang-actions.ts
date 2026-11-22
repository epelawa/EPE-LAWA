"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SITE_LANG_COOKIE, isSiteLanguage } from "../lib/i18n";

export async function setSiteLanguage(formData: FormData): Promise<void> {
  const value = formData.get("lang");
  if (isSiteLanguage(value)) {
    try {
      (await cookies()).set(SITE_LANG_COOKIE, value, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } catch {
      return;
    }
  }
  revalidatePath("/", "layout");
}
