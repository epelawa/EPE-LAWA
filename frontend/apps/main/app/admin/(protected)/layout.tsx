import { AdminAccessGuard } from "../../../../admin/components/admin-access-guard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SameOriginProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminAccessGuard loginPath="/admin/login">{children}</AdminAccessGuard>;
}
