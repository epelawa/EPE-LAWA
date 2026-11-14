import Link from "next/link";
import FocusedPageControls from "../../components/focused-page-controls";
import ResendVerificationForm from "./resend-verification-form";

export default function LinkIssueView({ expired }: { expired: boolean }) {
  return (
    <section className="auth-link-issue" aria-labelledby="auth-link-issue-title">
      <div className="auth-link-issue__card">
        <FocusedPageControls />
        <p className="ui-eyebrow">EPE LAWA account security</p>
        <h1 id="auth-link-issue-title">
          {expired ? "That email link has expired." : "We couldn’t verify that email link."}
        </h1>
        <p className="auth-link-issue__intro">
          {expired
            ? "Email links can expire or be used only once. You can request a fresh verification email below, reset your password, or return to sign in."
            : "The link may be invalid, expired, or already used. For your security, we don’t display the link details here. You can request a fresh verification email, reset your password, or return to sign in."}
        </p>
        <div className="auth-link-issue__resend">
          <h2>Verifying a new account?</h2>
          <ResendVerificationForm />
        </div>
        <nav className="auth-link-issue__actions" aria-label="Account recovery">
          <Link className="btn-secondary" href="/forgot-password">Request a password reset</Link>
          <Link className="btn-ghost" href="/login">Return to sign in</Link>
        </nav>
      </div>
    </section>
  );
}
