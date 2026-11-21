"use client";

import { useActionState } from "react";
import { submitBanAppeal, type MemberAppealState } from "./appeal-actions";
import styles from "./dashboard.module.css";

const initialState: MemberAppealState = { status: "idle", message: "" };

export default function BanAppealForm({ banId, reason }: { banId: string; reason: string | null }) {
  const [state, action, pending] = useActionState(submitBanAppeal, initialState);
  return (
    <form className={styles.profileForm} action={action} aria-busy={pending}>
      {reason ? (
        <div className={styles.field}>
          <label htmlFor="ban-appeal-reason">Reason recorded for the ban</label>
          <textarea id="ban-appeal-reason" defaultValue={reason} readOnly rows={2} />
        </div>
      ) : null}
      <div className={styles.field}>
        <label htmlFor="ban-appeal-statement">Your appeal</label>
        <textarea
          id="ban-appeal-statement"
          name="statement"
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          aria-describedby="ban-appeal-statement-help"
        />
        <small id="ban-appeal-statement-help">10–2000 characters. Say plainly why the ban should be reconsidered. You can open one appeal per moderation action.</small>
      </div>
      <input type="hidden" name="banId" value={banId} />
      {state.status !== "idle" ? <p className={state.status === "error" ? styles.error : styles.success} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit appeal"}</button>
    </form>
  );
}
