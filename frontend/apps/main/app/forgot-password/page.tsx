import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { ResetForm } from "../auth/auth-forms";
export const metadata = { title: "Reset your password" };
export default function ForgotPasswordPage() {
  return <AccountShell eyebrow="Account recovery" title="Let’s get you back in." description="Enter the email address associated with your account to request password-reset instructions."><ResetForm/><p className="auth-footnote">Remembered it? <Link href="/login">Back to sign in</Link></p></AccountShell>;
}
