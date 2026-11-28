import type { Metadata } from "next";
import Link from "next/link";
import AccountShell from "../../../components/account-shell";
import AdminLoginForm from "../../../components/admin-login-form";
import { safeAdminNextPath } from "../../../../admin/lib/admin-path";
import "../../auth/auth.css";

export const metadata: Metadata = {
  title: "Admin sign in | EPE LAWA",
  robots: { index: false, follow: false, noarchive: true },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const nextValue = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = safeAdminNextPath(nextValue);
  const reason = Array.isArray(query.reason) ? query.reason[0] : query.reason;

  return (
    <AccountShell
      title="Welcome back"
      description="Authorised staff only. Sign in to continue."
      fixedViewport
    >
      {reason === "inactivity" ? <p className="auth-inactivity-notice" role="status">Your staff session ended after ten hours without activity. Sign in again to continue.</p> : null}
      <AdminLoginForm nextPath={nextPath} />
      <nav className="auth-switch auth-switch--staff" aria-label="Account options">
        <span>Not a staff member?</span>
        <Link href="/login">Member sign in</Link>
        <Link href="/contact">Contact us</Link>
      </nav>
    </AccountShell>
  );
}
