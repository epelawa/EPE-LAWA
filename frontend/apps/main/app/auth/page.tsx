import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignUpForm } from "./auth-forms";

export const metadata = { title: "Create your member account" };

export default function RegisterPage() {
  return (
    <AccountShell
      eyebrow="EPE LAWA members"
      title="Join EPE LAWA."
      description="Create your EPE LAWA member account."
      showThemeToggle={false}
    >
      <SignUpForm />
      <nav className="auth-footnote-links" aria-label="Account and community links">
        <Link href="/login">Sign in</Link>
        <Link href="/guidelines">Guidelines</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
    </AccountShell>
  );
}
