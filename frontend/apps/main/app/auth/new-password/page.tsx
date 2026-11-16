import Link from "next/link";
import AccountShell from "../../../components/account-shell";
import { NewPasswordForm } from "../auth-forms";

export const metadata = { title: "Choose a new password" };

export default function NewPasswordPage() {
  return (
    <AccountShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Set a new password for your account."
    >
      <NewPasswordForm />
      <nav className="auth-switch" aria-label="Password recovery options">
        <span>Link expired?</span>
        <Link href="/forgot-password">Request another</Link>
      </nav>
      <p className="auth-secondary-link"><Link href="/login">Return to sign in</Link></p>
    </AccountShell>
  );
}
