import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignInForm } from "../auth/auth-forms";
import { safeAuthNext } from "../../lib/safe-auth-next";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string | string[] }> }) {
  const { reason, next } = await searchParams;
  const nextPath = safeAuthNext(typeof next === "string" ? next : null);
  return (
    <AccountShell
      title="Welcome back"
      description="Access your EPE LAWA member account."
      fixedViewport
    >
      {reason === "inactivity" ? (
        <p className="auth-inactivity-notice" role="status">
          You were signed out after a period of inactivity. Sign in to pick up where you left off.
        </p>
      ) : null}
      <SignInForm nextPath={nextPath} />
      <nav className="auth-switch auth-switch--member" aria-label="Account options">
        <span>New to EPE LAWA?</span>
        <Link href="/auth">Create an account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </nav>
    </AccountShell>
  );
}
