"use client";

import { useActionState } from "react";
import { buttonClassName } from "@epelawa/ui";
import { signInAdmin, type LoginState } from "../../lib/login-actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, initialState);
  return (
    <form action={action} className="form">
      <div className="field">
        <label className="field__label" htmlFor="email">Email</label>
        <input className="field__control" type="email" id="email" name="email" autoComplete="username" required maxLength={254} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="password">Password</label>
        <input className="field__control" type="password" id="password" name="password" autoComplete="current-password" required maxLength={1024} />
      </div>
      {state.error && <p role="alert" className="admin-empty__text">{state.error}</p>}
      <div className="form__actions">
        <button className={buttonClassName("primary")} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
