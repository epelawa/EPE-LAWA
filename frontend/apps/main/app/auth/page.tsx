import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignUpForm } from "./auth-forms";
export const metadata = { title: "Create your member account" };
export default function RegisterPage() {
  return <AccountShell eyebrow="EPE LAWA members" title="Make yourself at home." description="Create your member profile to join conversations and contribute to the Epe community."><SignUpForm/><p className="auth-footnote">Already have an account? <Link href="/login">Sign in</Link></p><p className="auth-footnote">Read our <Link href="/guidelines">community guidelines</Link> and <Link href="/privacy">privacy notice</Link> before taking part.</p></AccountShell>;
}
