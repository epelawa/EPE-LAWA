"use client";
import { useActionState } from "react";
import { completeVerifiedMemberHandle, type AuthState } from "../actions";
const initial: AuthState = { status: "idle", message: "" };
export default function HandleCompletionForm({ initialHandle = "", note }: { initialHandle?: string; note?: string }) {
  const [state, action, pending] = useActionState(completeVerifiedMemberHandle, initial);
  const handle = state.values?.handle ?? initialHandle;
  return <form action={action} className="auth-form" aria-busy={pending}>
    <div className="auth-field"><label htmlFor="complete-handle">Choose a public handle</label>
      <input id="complete-handle" name="handle" autoComplete="username" placeholder="your_handle" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" defaultValue={handle} required aria-describedby="complete-handle-help" />
      <small id="complete-handle-help">3–24 letters, numbers or underscores. Your verified account name stays unchanged.</small>
    </div>
    {note ? <p className="auth-feedback">{note}</p> : null}
    {state.status === "error" ? <p className="auth-feedback auth-error" role="alert">{state.message}</p> : null}
    <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Saving handle…" : "Complete member profile"}</button>
  </form>;
}
