import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { standaloneAdminRedirectHref } from "./admin-path";

/** Next handles normal document redirects and enhanced form actions differently. */
export async function adminRedirect(href: string): Promise<never> {
  if (process.env.NEXT_PUBLIC_STANDALONE_ADMIN !== "true") redirect(href);
  redirect(standaloneAdminRedirectHref(href, await headers()));
}
