import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { ResetForm } from "../auth/auth-forms";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AccountShell
      title="Reset your password"
      description="Enter your email to request a reset link."
    >
      <ResetForm />
      <nav className="auth-switch" aria-label="Account options">
        <span>Remembered your password?</span>
        <Link href="/login">Sign in</Link>
      </nav>
    </AccountShell>
  );
}
