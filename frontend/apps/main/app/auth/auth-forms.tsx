"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "./actions";

const initial: AuthState = { status: "idle", message: "" };

type StepFlow = {
  formRef: React.RefObject<HTMLFormElement | null>;
  step: number;
  enhanced: boolean;
  next: () => void;
  back: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function useAuthSteps(totalSteps: number): StepFlow {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => setEnhanced(true), []);

  const focusStep = (target: number) => {
    window.requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLInputElement>(`fieldset[data-step="${target}"] input:not(:disabled)`)
        ?.focus({ preventScroll: true });
    });
  };

  const next = () => {
    if (!enhanced) return;
    const currentFieldset = formRef.current?.querySelector<HTMLFieldSetElement>(`fieldset[data-step="${step}"]`);
    const fields = Array.from(currentFieldset?.querySelectorAll<HTMLInputElement>("input") ?? []);
    if (!fields.every((field) => field.reportValidity())) return;
    const target = Math.min(step + 1, totalSteps);
    setStep(target);
    focusStep(target);
  };

  const back = () => {
    const target = Math.max(step - 1, 1);
    setStep(target);
    focusStep(target);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (enhanced && step < totalSteps) {
      event.preventDefault();
      next();
    }
  };

  return { formRef, step, enhanced, next, back, onSubmit };
}

function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="auth-progress" aria-live="polite" aria-atomic="true">
      <p className="auth-progress__label">Step {step} of {total} <span aria-hidden="true">·</span> {label}</p>
      <div
        className="auth-progress__track"
        role="progressbar"
        aria-label="Form progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of ${total}`}
      >
        <span style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.status === "idle") return null;
  return (
    <p className={`auth-feedback ${state.status === "error" ? "auth-error" : "auth-notice"}`} role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  );
}

function ConfirmationPanel({ title, message, progress }: { title: string; message: string; progress?: string }) {
  return (
    <section className="auth-confirmation" aria-labelledby="auth-confirmation-title">
      {progress ? <p className="auth-confirmation__progress">{progress}</p> : null}
      <h2 id="auth-confirmation-title">{title}</h2>
      <p role="status" aria-live="polite">{message}</p>
    </section>
  );
}

function StepActions({
  enhanced,
  step,
  total,
  pending,
  submitLabel,
  pendingLabel,
  onNext,
  onBack,
}: {
  enhanced: boolean;
  step: number;
  total: number;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="auth-step-actions" data-step={step} data-total={total} data-enhanced={enhanced}>
      <button className="auth-step-back" type="button" onClick={onBack} disabled={!enhanced || pending}>Back</button>
      <button className="auth-step-continue" type="button" onClick={onNext} disabled={!enhanced || pending}>Continue</button>
      <button className="auth-submit" type="submit" disabled={pending || (enhanced && step < total)}>{pending ? pendingLabel : submitLabel}</button>
    </div>
  );
}

function GoogleSignInUnavailable() {
  return <p className="auth-provider-note"><span>Google sign-in</span><span className="auth-provider-status" role="status">Unavailable until configured</span></p>;
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const flow = useAuthSteps(4);
  if (state.status === "notice") {
    return <ConfirmationPanel title="Account request received" message={state.message} progress="Next step · Email verification" />;
  }

  return (
    <form ref={flow.formRef} action={action} onSubmit={flow.onSubmit} className="auth-form auth-form--stepped" data-enhanced={flow.enhanced} data-step={flow.step} aria-busy={pending}>
      {flow.enhanced ? <StepProgress step={flow.step} total={4} label={["Your name", "Choose a handle", "Email address", "Password"][flow.step - 1] ?? "Your name"} /> : null}
      <fieldset className="auth-step" data-step="1" hidden={flow.enhanced && flow.step !== 1}>
        <legend className="auth-visually-hidden">Step 1 of 4: your name</legend>
        <div className="auth-field">
          <label htmlFor="displayName">Your name</label>
          <input id="displayName" name="displayName" autoComplete="name" placeholder="Your name" maxLength={60} required={!flow.enhanced || flow.step === 1} aria-describedby="name-help" />
          <small id="name-help">Shown on your member profile.</small>
        </div>
      </fieldset>
      <fieldset className="auth-step" data-step="2" hidden={flow.enhanced && flow.step !== 2}>
        <legend className="auth-visually-hidden">Step 2 of 4: choose a handle</legend>
        <div className="auth-field">
          <label htmlFor="handle">Choose a handle</label>
          <input id="handle" name="handle" autoComplete="username" placeholder="your_handle" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" required={!flow.enhanced || flow.step === 2} aria-describedby="handle-help" />
          <small id="handle-help">3–24 letters, numbers or underscores.</small>
        </div>
      </fieldset>
      <fieldset className="auth-step" data-step="3" hidden={flow.enhanced && flow.step !== 3}>
        <legend className="auth-visually-hidden">Step 3 of 4: email address</legend>
        <div className="auth-field">
          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required={!flow.enhanced || flow.step === 3} />
        </div>
      </fieldset>
      <fieldset className="auth-step" data-step="4" hidden={flow.enhanced && flow.step !== 4}>
        <legend className="auth-visually-hidden">Step 4 of 4: password</legend>
        <div className="auth-field">
          <label htmlFor="signup-password">Password</label>
          <input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="At least 10 characters" minLength={10} maxLength={128} required={!flow.enhanced || flow.step === 4} aria-describedby="password-help" />
          <small id="password-help">Use at least 10 characters.</small>
        </div>
      </fieldset>
      <Feedback state={state} />
      <StepActions enhanced={flow.enhanced} step={flow.step} total={4} pending={pending} submitLabel="Create account" pendingLabel="Creating account…" onNext={flow.next} onBack={flow.back} />
      {!flow.enhanced || flow.step === 4 ? <GoogleSignInUnavailable /> : null}
    </form>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  const flow = useAuthSteps(2);

  return (
    <form ref={flow.formRef} action={action} onSubmit={flow.onSubmit} className="auth-form auth-form--stepped" data-enhanced={flow.enhanced} data-step={flow.step} aria-busy={pending}>
      {flow.enhanced ? <StepProgress step={flow.step} total={2} label={flow.step === 1 ? "Email address" : "Password"} /> : null}
      <fieldset className="auth-step" data-step="1" hidden={flow.enhanced && flow.step !== 1}>
        <legend className="auth-visually-hidden">Step 1 of 2: email address</legend>
        <div className="auth-field">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required={!flow.enhanced || flow.step === 1} aria-describedby="login-email-help" />
          <small id="login-email-help">Use the email on your member account.</small>
        </div>
      </fieldset>
      <fieldset className="auth-step" data-step="2" hidden={flow.enhanced && flow.step !== 2}>
        <legend className="auth-visually-hidden">Step 2 of 2: password</legend>
        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" maxLength={128} required={!flow.enhanced || flow.step === 2} />
        </div>
      </fieldset>
      <Feedback state={state} />
      <StepActions enhanced={flow.enhanced} step={flow.step} total={2} pending={pending} submitLabel="Sign in" pendingLabel="Signing in…" onNext={flow.next} onBack={flow.back} />
      {!flow.enhanced || flow.step === 2 ? <GoogleSignInUnavailable /> : null}
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  if (state.status === "notice") {
    return <ConfirmationPanel title="Check your inbox" message={state.message} progress="Step 2 of 2 · Recovery request" />;
  }

  return (
    <form action={action} className="auth-form" aria-busy={pending}>
      <p className="auth-progress__label">Step 1 of 2 <span aria-hidden="true">·</span> Recovery email</p>
      <div className="auth-field">
        <label htmlFor="reset-email">Email address</label>
        <input id="reset-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required aria-describedby="reset-email-help" />
        <small id="reset-email-help">We won’t reveal whether an address has an account.</small>
      </div>
      <Feedback state={state} />
      <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Sending request…" : "Send reset instructions"}</button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="auth-form" aria-busy={pending}>
      <div className="auth-field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" placeholder="At least 10 characters" minLength={10} maxLength={128} required aria-describedby="new-password-help" />
        <small id="new-password-help">Use at least 10 characters and avoid reusing another password.</small>
      </div>
      <Feedback state={state} />
      <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}
