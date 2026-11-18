"use client";

import { useActionState } from "react";
import { unsubscribeNewsletter, type NewsletterState } from "../actions";
import styles from "./unsubscribe.module.css";

const initialState: NewsletterState = { status: "idle", message: "" };
export default function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(unsubscribeNewsletter, initialState);
  return <form action={action} className={styles.form}>
    <input type="hidden" name="token" value={token} />
    <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Updating…" : "Unsubscribe me"}</button>
    {state.message ? <p className={state.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">{state.message}</p> : null}
  </form>;
}
