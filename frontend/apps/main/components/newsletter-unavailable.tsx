import styles from "./newsletter-unavailable.module.css";

type Props = { id: string; variant?: "card" | "footer" };

/**
 * An intentionally non-submitting newsletter UI. Production email delivery is
 * not configured, so this must not accept, store, or imply subscription.
 */
export default function NewsletterUnavailable({ id, variant = "card" }: Props) {
  const noteId = `${id}-status`;
  return (
    <div className={`${styles.signup} ${variant === "footer" ? styles.footer : ""}`}>
      <label className={styles.label} htmlFor={`${id}-email`}>Email address</label>
      <div className={styles.row}>
        <input
          id={`${id}-email`}
          className={styles.email}
          type="email"
          placeholder="Sign-up unavailable"
          disabled
          aria-describedby={noteId}
        />
        <button className={styles.button} type="button" disabled>Subscribe</button>
      </div>
      <p id={noteId} className={styles.note}>Sign-up is paused; no email address is collected.</p>
    </div>
  );
}
