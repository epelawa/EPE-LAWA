"use client";

import { useActionState } from "react";
import { completeVerifiedMemberHandle, type AuthState } from "../auth/actions";

const initial: AuthState = { status: "idle", message: "" };

/**
 * The last step of profile setup now lives inside `/dashboard` itself. There
 * is no separate "you're signed in" route to park a member on.
 */
export default function HandleCompletionForm({ initialHandle = "", note }: { initialHandle?: string; note?: string }) {
  const [state, action, pending] = useActionState(completeVerifiedMemberHandle, initial);
  const handle = state.values?.handle ?? initialHandle;
  return (
    <form action={action} className="auth-form" aria-busy={pending}>
      <div className="auth-field">
        <label htmlFor="dashboard-handle">Choose a public handle</label>
        <input
          id="dashboard-handle"
          name="handle"
          autoComplete="username"
          placeholder="your_handle"
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9_]{3,24}"
          defaultValue={handle}
          required
          aria-describedby="dashboard-handle-help"
        />
        <small id="dashboard-handle-help">3–24 letters, numbers or underscores. Your verified account name stays unchanged.</small>
      </div>
      {note ? <p className="auth-feedback">{note}</p> : null}
      {state.status === "error" ? <p className="auth-feedback auth-error" role="alert">{state.message}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "Saving handle…" : "Finish member profile"}
      </button>
    </form>
  );
}
