import { AdminAccessGuard } from "../../../../admin/components/admin-access-guard";
import SessionGuard from "../../../../admin/components/session-guard";
import { signOutStaffSameOrigin } from "../../../../admin/lib/session-actions";
import { STAFF_INACTIVITY_MS } from "../../../../admin/lib/session-policy";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SameOriginProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminAccessGuard loginPath="/admin/login">
      <SessionGuard scope="staff" timeoutMs={STAFF_INACTIVITY_MS} signOutAction={signOutStaffSameOrigin} />
      {children}
    </AdminAccessGuard>
  );
}
