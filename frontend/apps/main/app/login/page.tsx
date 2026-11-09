import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignInForm } from "../auth/auth-forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AccountShell
      eyebrow="Member sign in"
      title="Welcome back"
      description="Sign in to access your EPE LAWA member account."
      showThemeToggle={false}
    >
      <SignInForm />
      <nav className="auth-switch" aria-label="Account options">
        <span>New to EPE LAWA?</span>
        <Link href="/auth">Create an account</Link>
      </nav>
      <p className="auth-secondary-link"><Link href="/forgot-password">Forgot your password?</Link></p>
    </AccountShell>
  );
}
