import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignInForm } from "../auth/auth-forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AccountShell
      eyebrow="Member sign in"
      title="Welcome back."
      description="Sign in to your EPE LAWA account."
      showThemeToggle={false}
    >
      <SignInForm />
      <nav className="auth-footnote-links" aria-label="Account links">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/auth">Create an account</Link>
      </nav>
    </AccountShell>
  );
}
