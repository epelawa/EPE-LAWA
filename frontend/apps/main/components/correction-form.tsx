"use client";

import { useActionState, useState } from "react";
import BrandedDialog from "./branded-dialog";
import { reportCorrection, type CorrectionState } from "../app/news/[slug]/correction-actions";
import styles from "../app/news/news.module.css";

const initialState: CorrectionState = { status: "idle", message: "" };

/**
 * "Suggest a correction" as a branded popup modal. Members only; visitors are
 * pointed at the contact desk instead. The report is stored server-side and
 * answered in the private staff workspace.
 */
export default function CorrectionForm({ articleId, articleTitle }: { articleId: string; articleTitle: string }) {
  const [state, action, pending] = useActionState(reportCorrection, initialState);
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.correctionNote}>
      {state.status === "success" ? (
        <p role="status">{state.message} <a className="ui-text-link" href="mailto:info.epelawa@gmail.com">info.epelawa@gmail.com</a> is always open too.</p>
      ) : (
        <>
          <p>Spotted an error in this story? <button className="ui-text-link" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Suggest a correction</button>, or email <a className="ui-text-link" href={`mailto:info.epelawa@gmail.com?subject=${encodeURIComponent(`Correction: ${articleTitle}`)}`}>info.epelawa@gmail.com</a>.</p>
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
          <div className="ui-actions">
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send correction report"}</button>
          </div>
        </form>
      </BrandedDialog>
    </div>
  );
}
