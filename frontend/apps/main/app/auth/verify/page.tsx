import Link from "next/link";
import AccountShell from "../../../components/account-shell";
import { VerificationForm } from "../auth-forms";
export const metadata = { title: "Verify your email", robots: { index: false, follow: false } };
export default function VerifyPage() {
  return <AccountShell title="A code to confirm it’s you." description="Enter the verification code sent to your email to activate your member sign-in."><VerificationForm/><p className="auth-footnote">Already confirmed? <Link href="/login">Sign in</Link></p></AccountShell>;
}
