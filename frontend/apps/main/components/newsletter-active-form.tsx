"use client";
import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "../app/newsletter/actions";
import styles from "./newsletter-unavailable.module.css";
const initial: NewsletterState = { status: "idle", message: "" };
export default function NewsletterActiveForm({ id, variant }: { id: string; variant: "card" | "footer" }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);
  return <form action={action} className={`${styles.signup} ${variant === "footer" ? styles.footer : styles.card}`}>
    <label className={styles.label} htmlFor={`${id}-email`}>Email address</label>
    <div className={styles.row}><input className={styles.email} id={`${id}-email`} type="email" name="email" maxLength={254} autoComplete="email" placeholder="Your email address" required disabled={pending} aria-describedby={`${id}-consent`} /><button className={styles.button} disabled={pending} type="submit" name="consent" value="yes">{pending ? "Sending…" : "Subscribe"}</button></div>
    <p id={`${id}-consent`} className={styles.note}>By subscribing, you agree to receive the newsletter. Confirm by email; unsubscribe anytime.</p>
    {state.message && <p className={state.status === "error" ? styles.error : styles.success} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
