import Link from "next/link";
import AccountShell from "../../../components/account-shell";
import { NewPasswordForm } from "../auth-forms";
export const metadata = { title: "Choose a new password" };
export default function NewPasswordPage() {
  return <AccountShell eyebrow="Account recovery" title="A fresh start." description="Choose a new password after opening a valid password-recovery link."><NewPasswordForm/><p className="auth-footnote">Link expired? <Link href="/forgot-password">Request another recovery link</Link></p></AccountShell>;
}
