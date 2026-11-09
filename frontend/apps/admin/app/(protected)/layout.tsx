import { AdminAccessGuard } from "../../components/admin-access-guard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminAccessGuard loginPath="/login">{children}</AdminAccessGuard>;
}
