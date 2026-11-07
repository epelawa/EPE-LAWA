import "../auth/auth.css";
import Link from "next/link";
import { SignInForm } from "../auth/auth-forms";
export const metadata = { title: "Sign in" };
export default function LoginPage() { return <section className="auth-wrap"><div className="auth-card"><p className="auth-eyebrow">WELCOME BACK</p><h1>Sign in to EPE LAWA</h1><p>Use your verified member account to continue.</p><SignInForm/><p className="auth-footnote"><Link href="/forgot-password">Forgot your password?</Link></p><p className="auth-footnote">New here? <Link href="/auth">Create an account</Link></p></div></section>; }
