"use client";

import { useActionState, useEffect, useState } from "react";
import { signInAdmin, type LoginState } from "../../admin/lib/login-actions";

const initialState: LoginState = {};

function StaffPasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password-control">
      <input
        className="auth-input"
        type={visible ? "text" : "password"}
        id="admin-login-password"
        name="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
        maxLength={1024}
      />
      <button
        className="auth-password-toggle"
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls="admin-login-password"
        onClick={() => setVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.2 12s3.4-6.6 9.8-6.6 9.8 6.6 9.8 6.6-3.4 6.6-9.8 6.6S2.2 12 2.2 12Z" />
          {visible ? <path d="m4 4 16 16M10.6 10.6a2 2 0 0 0 2.8 2.8" /> : <circle cx="12" cy="12" r="2.7" />}
        </svg>
      </button>
    </div>
  );
}

export default function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(signInAdmin, initialState);

  useEffect(() => {
    if (!state.error) return;
    const frame = window.requestAnimationFrame(() => {
      const page = document.querySelector<HTMLElement>(".auth-page");
      if (page && page.scrollHeight > page.clientHeight) page.scrollTop = page.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  return (
    <form action={action} className="auth-form admin-login__form" aria-busy={pending}>
      <input type="hidden" name="next" value={nextPath} />
      <div className="auth-provider">
        <button className="auth-provider__button" type="button" disabled aria-disabled="true" aria-label="Google sign-in, Coming Soon">
          <span>Continue with Google</span>
          <span className="auth-coming-soon">Coming Soon</span>
        </button>
        <p className="auth-divider" aria-hidden="true"><span>or</span></p>
      </div>
      <div className="auth-field">
        <label htmlFor="admin-login-email">Email address</label>
        <input className="auth-input" type="email" id="admin-login-email" name="email" autoComplete="username" placeholder="name@example.com" required maxLength={254} />
      </div>
      <div className="auth-field">
        <label htmlFor="admin-login-password">Password</label>
        <StaffPasswordField />
      </div>
      {state.error ? <p className="auth-feedback auth-error" role="alert">{state.error}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
