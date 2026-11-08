import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccessForSession } from "../../lib/supabase-access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const access = await getAdminAccessForSession({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (entries, headers) => {
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
  if (!access.allowed || !access.userId) redirect("/login");
  return children;
}
