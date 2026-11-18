"use client";
import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "../app/newsletter/actions";
import styles from "./newsletter-unavailable.module.css";
const initial: NewsletterState = { status: "idle", message: "" };
export default function NewsletterActiveForm({ id, variant }: { id: string; variant: "card" | "footer" }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);
  return <form action={action} className={`${styles.signup} ${variant === "footer" ? styles.footer : ""}`}>
    <label className={styles.label} htmlFor={`${id}-email`}>Email address</label>
    <div className={styles.row}><input className={styles.email} id={`${id}-email`} type="email" name="email" maxLength={254} autoComplete="email" placeholder="Your email address" required disabled={pending} aria-describedby={variant === "footer" ? `${id}-consent` : undefined} /><button className={styles.button} disabled={pending} type="submit" name={variant === "footer" ? "consent" : undefined} value={variant === "footer" ? "yes" : undefined}>{pending ? "Sending…" : "Subscribe"}</button></div>
    {variant === "footer" ? <p id={`${id}-consent`} className={styles.note}>By subscribing, you agree to receive the newsletter. Confirm by email; unsubscribe anytime.</p> : <>
      <label className={styles.note}><input type="checkbox" name="consent" value="yes" required disabled={pending} /> I agree to receive the EPE LAWA newsletter.</label>
      <p className={styles.note}>We’ll email you a confirmation link. You can unsubscribe using the link in that email.</p>
    </>}
    {state.message && <p className={state.status === "error" ? styles.error : styles.success} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
