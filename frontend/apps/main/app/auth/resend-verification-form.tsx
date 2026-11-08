"use client";

import { useActionState } from "react";
import { resendSignupVerification, type AuthState } from "./actions";

const initial: AuthState = { status: "idle", message: "" };

export default function ResendVerificationForm() {
  const [state, action, pending] = useActionState(resendSignupVerification, initial);
  return <form action={action} className="auth-form auth-link-issue__form" aria-busy={pending}>
    <div className="auth-field">
      <label htmlFor="verification-email">Email address</label>
      <input id="verification-email" name="email" type="email" autoComplete="email" maxLength={254} required />
    </div>
    {state.status !== "idle" ? <p className={`auth-feedback ${state.status === "error" ? "auth-error" : "auth-notice"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Requesting link…" : "Request a fresh verification email"}</button>
  </form>;
}
