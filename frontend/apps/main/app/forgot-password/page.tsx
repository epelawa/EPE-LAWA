import "../auth/auth.css";
import Link from "next/link";
import { ResetForm } from "../auth/auth-forms";
export const metadata = { title: "Reset your password" };
export default function ForgotPasswordPage() { return <section className="auth-wrap"><div className="auth-card"><p className="auth-eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password</h1><p>Enter the email address associated with your account.</p><ResetForm/><p className="auth-footnote"><Link href="/login">Back to sign in</Link></p></div></section>; }
