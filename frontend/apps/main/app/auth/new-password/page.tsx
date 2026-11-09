import Link from "next/link";
import AccountShell from "../../../components/account-shell";
import { NewPasswordForm } from "../auth-forms";

export const metadata = { title: "Choose a new password" };

export default function NewPasswordPage() {
  return (
    <AccountShell
      eyebrow="Account recovery"
      title="A fresh start."
      description="Use a valid recovery link to choose a new password."
      showThemeToggle={false}
    >
      <NewPasswordForm />
      <p className="auth-footnote">Link expired? <Link href="/forgot-password">Request another</Link></p>
    </AccountShell>
  );
}
