import Link from "next/link";
import AccountShell from "../../../components/account-shell";
import { NewPasswordForm } from "../auth-forms";

export const metadata = { title: "Choose a new password" };

type PageProps = { searchParams: Promise<{ returnTo?: string | string[] }> };

export default async function NewPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isStaffInvite = params.returnTo === "staff";
  return (
    <AccountShell
      eyebrow={isStaffInvite ? "Staff invitation" : "Account recovery"}
      title="Choose a new password"
      description={isStaffInvite ? "Set a password to activate your invited staff account." : "Set a new password for your account."}
      showThemeToggle={false}
    >
      <NewPasswordForm returnTo={isStaffInvite ? "staff" : "member"} />
      {isStaffInvite ? (
        <p className="auth-switch">Invitation link expired? Ask your administrator to resend it.</p>
      ) : (
        <nav className="auth-switch" aria-label="Password recovery options">
          <span>Link expired?</span>
          <Link href="/forgot-password">Request another</Link>
        </nav>
      )}
      <p className="auth-secondary-link"><Link href={isStaffInvite ? "/admin/login" : "/login"}>Return to sign in</Link></p>
    </AccountShell>
  );
}
