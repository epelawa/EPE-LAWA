"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "../app/newsletter/actions";
import styles from "./newsletter-unavailable.module.css";

type Props = { id: string; variant?: "card" | "footer" };
const initialState: NewsletterState = { status: "idle", message: "" };

export default function NewsletterForm({ id, variant = "card" }: Props) {
  const [state, action, pending] = useActionState(subscribeNewsletter, initialState);
  const noteId = `${id}-status`;
  return (
    <form className={`${styles.signup} ${variant === "footer" ? styles.footer : ""}`} action={action}>
      <label className={styles.label} htmlFor={`${id}-email`}>Email address</label>
      <div className={styles.row}>
        <input id={`${id}-email`} className={styles.email} name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} aria-describedby={noteId} />
        <button className={styles.button} type="submit" disabled={pending}>{pending ? "Sending…" : "Subscribe"}</button>
      </div>
      <p id={noteId} className={`${styles.note} ${state.status === "error" ? styles.error : state.status === "success" ? styles.success : ""}`} role={state.status === "idle" ? undefined : "status"} aria-live="polite">{state.message || "No verification link is required. You can unsubscribe from the link in any newsletter email."}</p>
    </form>
  );
}
