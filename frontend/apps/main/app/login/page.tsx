import "../auth/auth.css";
import Link from "next/link";
import AccountShell from "../../components/account-shell";
import { SignInForm } from "../auth/auth-forms";
export const metadata = { title: "Sign in" };
export default function LoginPage() {
  return <AccountShell eyebrow="Welcome back" title="Good to have you here." description="Sign in to EPE LAWA with your verified member account to pick up where you left off."><SignInForm/><p className="auth-footnote"><Link href="/forgot-password">Forgot your password?</Link></p><p className="auth-footnote">New to the community? <Link href="/auth">Create an account</Link></p></AccountShell>;
}
