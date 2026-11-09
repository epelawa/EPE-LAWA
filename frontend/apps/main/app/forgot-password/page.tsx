import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { ResetForm } from "../auth/auth-forms";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AccountShell
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter your account email to request a reset link."
      showThemeToggle={false}
    >
      <ResetForm />
      <p className="auth-footnote">Remembered your password? <Link href="/login">Sign in</Link></p>
    </AccountShell>
  );
}
