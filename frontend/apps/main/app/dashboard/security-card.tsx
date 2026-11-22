"use client";

import { useActionState } from "react";
import { changeMemberPassword, type MemberPasswordState } from "./security-actions";
import styles from "./dashboard.module.css";

const initialState: MemberPasswordState = { status: "idle", message: "" };

export default function SecurityCard({ email, memberSince }: { email: string; memberSince: string | null }) {
  const [state, action, pending] = useActionState(changeMemberPassword, initialState);
  return (
    <section className={styles.panel} aria-labelledby="security-title">
      <h2 id="security-title">Security</h2>
      <p className={styles.helper}>
        {memberSince
          ? `Signed in as ${email}. Member since ${memberSince}.`
          : `Signed in as ${email}.`}
      </p>
      <p className={styles.helper}>
        Sessions are managed by the account service, so a list of your other devices is not shown
        here. Changing your password keeps this device signed in; everything else stays signed in
        until you use “Sign out everywhere” below.
      </p>
      <form className={styles.profileForm} action={action} aria-busy={pending}>
        <div className={styles.field}>
          <label htmlFor="security-current-password">Current password</label>
          <input id="security-current-password" name="currentPassword" type="password" autoComplete="current-password" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="security-new-password">New password</label>
          <input
            id="security-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            aria-describedby="security-new-password-help"
          />
          <small id="security-new-password-help">At least 10 characters.</small>
        </div>
        <div className={styles.field}>
          <label htmlFor="security-confirm-password">Confirm new password</label>
          <input id="security-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required />
        </div>
        {state.status !== "idle" ? <p className={state.status === "error" ? styles.error : styles.success} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
        <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Updating…" : "Change password"}</button>
      </form>
    </section>
  );
}
