import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminLoginHref } from "../lib/admin-path";
import { getAdminAccessForSession } from "../lib/supabase-access";
import { createClient } from "../lib/supabase";

export async function AdminAccessGuard({
  children,
  loginPath,
}: Readonly<{ children: React.ReactNode; loginPath: string }>) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const access = await getAdminAccessForSession({
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

  if (!access.allowed || !access.userId) {
    redirect(adminLoginHref(loginPath, requestHeaders.get("x-epe-lawa-admin-route")));
  }
  const db = await createClient({ allowPasswordChange: true });
  const { data: profile } = await db.from("staff_profiles").select("must_change_password").maybeSingle();
  if (profile?.must_change_password) redirect("/admin/change-password");
  return children;
}
