import Link from "next/link";
import { NewPasswordForm } from "../auth-forms";
export const metadata = { title: "Choose a new password" };
export default function NewPasswordPage() { return <section className="auth-wrap"><div className="auth-card"><p className="auth-eyebrow">ACCOUNT RECOVERY</p><h1>Choose a new password</h1><p>This form works only after opening a valid password-recovery link.</p><NewPasswordForm/><p className="auth-footnote"><Link href="/forgot-password">Request another recovery link</Link></p></div></section>; }
