import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in | EPE LAWA",
  robots: { index: false, follow: false, noarchive: true },
};

export default function LoginPage() {
  return (
    <div className="ep-container">
      <div className="page-header">
        <h1 className="page-header__title">Admin sign in</h1>
        <p className="page-header__lede">Sign in with your authorised staff account.</p>
      </div>
      <LoginForm />
    </div>
  );
}
