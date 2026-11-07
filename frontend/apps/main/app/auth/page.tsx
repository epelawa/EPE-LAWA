import Link from "next/link";
import { SignUpForm } from "./auth-forms";
export const metadata = { title: "Create your member account" };
export default function RegisterPage() { return <section className="auth-wrap"><div className="auth-card"><p className="auth-eyebrow">EPE LAWA MEMBERS</p><h1>Join the conversation</h1><p>Create your member profile to take part across the EPE LAWA community.</p><SignUpForm/><p className="auth-footnote">Already have an account? <Link href="/login">Sign in</Link></p></div></section>; }
