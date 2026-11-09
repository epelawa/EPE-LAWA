"use client";

import { useActionState } from "react";
import { buttonClassName } from "@epelawa/ui";
import { signInAdmin, type LoginState } from "../../lib/login-actions";

const initialState: LoginState = {};

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(signInAdmin, initialState);

  return <form action={action} className="admin-login__form">
    <input type="hidden" name="next" value={nextPath} />
    <div className="ui-field">
      <label className="field__label" htmlFor="email">Email</label>
      <input className="field__control" type="email" id="email" name="email" autoComplete="username" required maxLength={254} />
    </div>
    <div className="ui-field">
      <label className="field__label" htmlFor="password">Password</label>
      <input className="field__control" type="password" id="password" name="password" autoComplete="current-password" required maxLength={1024} />
    </div>
    {state.error ? <div className="ui-notice ui-notice--danger" role="alert">{state.error}</div> : null}
    <div className="ui-actions" style={{ marginTop: 0 }}>
      <button className={buttonClassName("primary")} type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </div>
  </form>;
}
