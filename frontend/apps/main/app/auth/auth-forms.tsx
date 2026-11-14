"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset, signIn, signUp, updatePassword, verifyEmailOtp, verifyHandleBeforeContinue, type AuthState } from "./actions";

const initial: AuthState = { status: "idle", message: "" };

type StepFlow = {
  formRef: React.RefObject<HTMLFormElement | null>;
  step: number;
  enhanced: boolean;
  next: () => void;
  back: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function useAuthSteps(totalSteps: number, validateHandle?: () => Promise<boolean>): StepFlow {
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

  const next = async () => {
    if (!enhanced) return;
    const currentFieldset = formRef.current?.querySelector<HTMLFieldSetElement>(`fieldset[data-step="${step}"]`);
    const fields = Array.from(currentFieldset?.querySelectorAll<HTMLInputElement>("input") ?? []);
    if (!fields.every((field) => field.reportValidity())) return;
    if (step === 2 && validateHandle && !(await validateHandle())) return;
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

type PasswordFieldProps = {
  id: string;
  name: string;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
  maxLength: number;
  required: boolean;
  describedBy?: string;
};

function PasswordField({ id, name, autoComplete, placeholder, minLength, maxLength, required, describedBy }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password-control">
      <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} maxLength={maxLength} required={required} aria-describedby={describedBy} />
      <button className="auth-password-toggle" type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} aria-controls={id} onClick={() => setVisible((current) => !current)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.2 12s3.4-6.6 9.8-6.6 9.8 6.6 9.8 6.6-3.4 6.6-9.8 6.6S2.2 12 2.2 12Z" />
          {visible ? <path d="m4 4 16 16M10.6 10.6a2 2 0 0 0 2.8 2.8" /> : <circle cx="12" cy="12" r="2.7" />}
        </svg>
      </button>
    </div>
  );
}

function GoogleSignInUnavailable() {
  return (
    <div className="auth-provider">
      <button className="auth-provider__button" type="button" disabled aria-disabled="true" aria-label="Google sign-in, Coming Soon">
        <span>Continue with Google</span>
        <span className="auth-coming-soon">Coming Soon</span>
      </button>
      <p className="auth-divider" aria-hidden="true"><span>or</span></p>
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [handleMessage, setHandleMessage] = useState("");
  const [checkingHandle, setCheckingHandle] = useState(false);
  const flow = useAuthSteps(4, async () => {
    const input = flow.formRef.current?.querySelector<HTMLInputElement>("#handle");
    if (!input) return false;
    setCheckingHandle(true);
    setHandleMessage("");
    try {
      const result = await verifyHandleBeforeContinue(input.value);
      if (result === "available") { setHandleMessage("This handle is available."); return true; }
      setHandleMessage(result === "taken" ? "That handle is already in use. Choose another." : "We couldn’t check handle availability. Please try again later.");
      return false;
    } catch {
      setHandleMessage("We couldn’t check handle availability. Please try again later.");
      return false;
    } finally { setCheckingHandle(false); }
  });
  if (state.status === "notice") {
    return (
      <>
        <ConfirmationPanel title="Account request received" message={state.message} progress="Next step · Email verification" />
        <p className="auth-footnote">Your verification email includes a one-time code and a secure link. <Link href="/auth/verify">Enter the code here</Link>, or open the link to continue.</p>
      </>
    );
  }

  return (
    <form ref={flow.formRef} action={action} onSubmit={flow.onSubmit} className="auth-form auth-form--stepped" data-enhanced={flow.enhanced} data-step={flow.step} aria-busy={pending}>
      {!flow.enhanced || flow.step === 1 ? <GoogleSignInUnavailable /> : null}
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
          {handleMessage ? <small role={handleMessage.includes("available") ? "status" : "alert"}>{handleMessage}</small> : null}
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
          <PasswordField id="signup-password" name="password" autoComplete="new-password" placeholder="At least 10 characters" minLength={10} maxLength={128} required={!flow.enhanced || flow.step === 4} describedBy="password-help" />
          <small id="password-help">Use at least 10 characters.</small>
        </div>
      </fieldset>
      <Feedback state={state} />
      <StepActions enhanced={flow.enhanced} step={flow.step} total={4} pending={pending || checkingHandle} submitLabel="Create account" pendingLabel="Creating account…" onNext={flow.next} onBack={flow.back} />
    </form>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="auth-form" aria-busy={pending} draggable={false} onDragStart={(event) => event.preventDefault()}>
      <GoogleSignInUnavailable />
      <div className="auth-field">
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required aria-describedby="login-email-help" />
        <small id="login-email-help">Use the email on your member account.</small>
      </div>
      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <PasswordField id="login-password" name="password" autoComplete="current-password" placeholder="Enter your password" maxLength={128} required />
      </div>
      <Feedback state={state} />
      <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
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
        <PasswordField id="new-password" name="password" autoComplete="new-password" placeholder="At least 10 characters" minLength={10} maxLength={128} required describedBy="new-password-help" />
        <small id="new-password-help">Use at least 10 characters and avoid reusing another password.</small>
      </div>
      <Feedback state={state} />
      <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}

export function VerificationForm() {
  const [state, action, pending] = useActionState(verifyEmailOtp, initial);
  return (
    <form action={action} className="auth-form" aria-busy={pending}>
      <div className="auth-field">
        <label htmlFor="verify-email">Email address</label>
        <input id="verify-email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </div>
      <div className="auth-field">
        <label htmlFor="verify-token">Verification code</label>
        <input id="verify-token" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required aria-describedby="verify-token-help" />
        <small id="verify-token-help">Enter the code from your EPE LAWA verification email.</small>
      </div>
      <Feedback state={state} />
      <div className="auth-step-actions">
        <button className="auth-submit" type="submit" name="intent" value="verify" disabled={pending}>{pending ? "Working…" : "Verify email"}</button>
        <button className="btn-secondary" type="submit" name="intent" value="resend" formNoValidate disabled={pending}>Resend verification email</button>
      </div>
    </form>
  );
}
