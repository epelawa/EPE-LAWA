import { AdminAccessGuard } from "../../components/admin-access-guard";
import SessionGuard from "../../components/session-guard";
import { signOutStaffStandalone } from "../../lib/session-actions";
import { STAFF_INACTIVITY_MS } from "../../lib/session-policy";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminAccessGuard loginPath="/login">
      <SessionGuard scope="staff" timeoutMs={STAFF_INACTIVITY_MS} signOutAction={signOutStaffStandalone} />
      {children}
    </AdminAccessGuard>
  );
}
