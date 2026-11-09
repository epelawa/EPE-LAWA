import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignUpForm } from "./auth-forms";

export const metadata = { title: "Create your member account" };

export default function RegisterPage() {
  return (
    <AccountShell
      eyebrow="EPE LAWA members"
      title="Create an account"
      description="Join the EPE LAWA community."
      showThemeToggle={false}
    >
      <SignUpForm />
      <p className="auth-legal">
        By creating an account, you agree to our <Link href="/privacy">Privacy notice</Link> and <Link href="/terms">Terms of use</Link>.
      </p>
      <nav className="auth-switch" aria-label="Account options">
        <span>Already have an account?</span>
        <Link href="/login">Sign in</Link>
      </nav>
    </AccountShell>
  );
}
