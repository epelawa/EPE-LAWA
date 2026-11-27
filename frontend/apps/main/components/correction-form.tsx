"use client";

import HumanCheck from "./human-check";
import { useActionState, useState } from "react";
import BrandedDialog from "./branded-dialog";
import GuestContactFields from "./guest-contact-fields";
import { reportCorrection, type CorrectionState } from "../app/news/[slug]/correction-actions";
import styles from "../app/news/news.module.css";

const initialState: CorrectionState = { status: "idle", message: "" };

/**
 * "Suggest a correction" as a branded popup modal. Open to everyone: signed-out
 * readers add a private name and email. Reports reach the staff Corrections page.
 */
export default function CorrectionForm({ articleId, signedIn = false, accountEmail = null }: { articleId: string; articleTitle: string; signedIn?: boolean; accountEmail?: string | null }) {
  const [state, action, pending] = useActionState(reportCorrection, initialState);
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.correctionNote}>
      {state.status === "success" ? (
        <p role="status">{state.message}</p>
      ) : (
        <>
          <p>Spotted an error in this story? <button className="btn-secondary btn-inline" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Suggest a correction</button></p>
          {state.status === "error" ? <p role="alert">{state.message}</p> : null}
        </>
      )}
      <BrandedDialog open={open} onClose={() => setOpen(false)} title="Suggest a correction" description="Tell us what is wrong and, if you can, where the correct account can be checked.">
        <form action={action} className="ui-stack-sm">
          <input type="hidden" name="article_id" value={articleId} />
          <div className="ui-field">
            <label className="label" htmlFor="correction-reason">What needs correcting?</label>
            <textarea className="input" id="correction-reason" name="reason" required minLength={10} maxLength={2000} rows={5} data-autofocus />
          </div>
          <GuestContactFields signedIn={signedIn} accountEmail={accountEmail} idPrefix="article-correction" />
          <HumanCheck />
          {state.status === "error" ? <p role="alert" className="ui-form-error">{state.message}</p> : null}
          <div className="ui-actions">
            <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send correction report"}</button>
          </div>
        </form>
      </BrandedDialog>
    </div>
  );
}
