"use client";

import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "./actions";
const initial: AuthState = { status: "idle", message: "" };
function Feedback({ state }: { state: AuthState }) {
  if (state.status === "idle") return null;
  return <p className={state.status === "error" ? "auth-feedback auth-error" : "auth-feedback auth-notice"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>;
}
function GoogleSignInUnavailable() {
  return <div className="auth-google-option"><button className="auth-google" type="button" disabled aria-describedby="google-signin-status">Continue with Google <span className="auth-coming-soon">Coming Soon</span></button><p id="google-signin-status" className="auth-google-note">Google sign-in is not configured for this site yet. Use your email and password for now.</p></div>;
}
export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  return <><form action={action} className="auth-form" aria-busy={pending}>
    <div className="auth-field"><label htmlFor="displayName">Your name</label><input id="displayName" name="displayName" autoComplete="name" maxLength={60} required aria-describedby="name-help"/><small id="name-help">Shown on your public profile.</small></div>
    <div className="auth-field"><label htmlFor="handle">Choose a handle</label><input id="handle" name="handle" autoComplete="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" required aria-describedby="handle-help"/><small id="handle-help">3–24 letters, numbers or underscores.</small></div>
    <div className="auth-field"><label htmlFor="signup-email">Email address</label><input id="signup-email" name="email" type="email" autoComplete="email" maxLength={254} required/></div>
    <div className="auth-field"><label htmlFor="signup-password">Password</label><input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required aria-describedby="password-help"/><small id="password-help">At least 10 characters.</small></div>
    <Feedback state={state}/><button className="auth-submit" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
  </form><GoogleSignInUnavailable/></>;
}
export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  return <><form action={action} className="auth-form" aria-busy={pending}>
    <div className="auth-field"><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" autoComplete="email" maxLength={254} required/></div>
    <div className="auth-field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" maxLength={128} required/></div>
    <Feedback state={state}/><button className="auth-submit" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
  </form><GoogleSignInUnavailable/></>;
}
export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return <form action={action} className="auth-form" aria-busy={pending}><div className="auth-field"><label htmlFor="reset-email">Email address</label><input id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required/></div><Feedback state={state}/><button className="auth-submit" type="submit" disabled={pending}>{pending ? "Sending request…" : "Send reset instructions"}</button></form>;
}
export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return <form action={action} className="auth-form" aria-busy={pending}><div className="auth-field"><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required aria-describedby="new-password-help"/><small id="new-password-help">Use at least 10 characters. Choose a password you do not use elsewhere.</small></div><Feedback state={state}/><button className="auth-submit" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button></form>;
}
