"use client";

import { useActionState, useEffect, useRef } from "react";
import GuestContactFields from "../../components/guest-contact-fields";
import SubmissionImageInput from "../../components/submission-image-input";
import { submitHistoryContribution, type HistoryFormState } from "./actions";
import { HISTORY_CATEGORIES, HISTORY_CATEGORY_LABELS, HISTORY_CONSENT_TEXT } from "./history-categories";

const initial: HistoryFormState = { status: "idle", message: "" };

export default function ContributeForm({ signedIn, accountEmail }: { signedIn: boolean; accountEmail: string | null }) {
  const [state, action, pending] = useActionState(submitHistoryContribution, initial);
  const form = useRef<HTMLFormElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "error" && state.field) form.current?.querySelector<HTMLElement>(`[name="${state.field}"]`)?.focus();
    else if (state.status !== "idle") message.current?.focus();
    if (state.status === "success") form.current?.reset();
  }, [state]);

  const invalid = (name: string) => (state.status === "error" && state.field === name ? true : undefined);

  return <form ref={form} action={action} className="ui-stack" noValidate>
    <div className="ui-field"><label className="label" htmlFor="history-title">Account title</label><input className="input" id="history-title" name="title" required minLength={3} maxLength={180} aria-invalid={invalid("title")} /></div>
    <div className="ui-field"><label className="label" htmlFor="history-account">Your account</label><textarea className="input" id="history-account" name="account" required minLength={20} maxLength={20000} rows={8} aria-invalid={invalid("account")} /></div>
    <div className="ui-field"><label className="label" htmlFor="history-category">Category</label><select className="input" id="history-category" name="category" required defaultValue="community-history" aria-invalid={invalid("category")}>{HISTORY_CATEGORIES.map((item) => <option key={item} value={item}>{HISTORY_CATEGORY_LABELS[item]}</option>)}</select></div>
    <div className="ui-grid ui-grid--2">
      <div className="ui-field"><label className="label" htmlFor="history-community">Community (optional)</label><input className="input" id="history-community" name="community" maxLength={120} /></div>
      <div className="ui-field"><label className="label" htmlFor="history-family">Family / house name (optional)</label><input className="input" id="history-family" name="family_name" maxLength={180} /></div>
    </div>
    <div className="ui-field"><label className="label" htmlFor="history-lineage">Lineage context (optional)</label><textarea className="input" id="history-lineage" name="lineage_description" maxLength={5000} rows={4} /><p className="ui-muted">Share only information you have permission to submit and that is appropriate for public release after staff review.</p></div>
    <div className="ui-field"><label className="label" htmlFor="history-source">Source or basis for the account</label><textarea className="input" id="history-source" name="source_description" required minLength={5} maxLength={2000} rows={4} aria-invalid={invalid("source_description")} /><p className="ui-muted">Identify a document, publication, archive or first-hand account and how it can be checked. Do not include confidential details.</p></div>
    <div className="ui-field"><label className="label" htmlFor="history-url">Public source link (optional)</label><input className="input" id="history-url" name="source_url" type="url" maxLength={1000} placeholder="https://" aria-invalid={invalid("source_url")} /></div>
    <div className="ui-field"><label className="label" htmlFor="history-rights">Publication rights / permission basis</label><textarea className="input" id="history-rights" name="rights_description" required minLength={5} maxLength={2000} rows={4} aria-invalid={invalid("rights_description")} /><p className="ui-muted">Describe your rights or permission to submit for possible publication. Staff must verify this before publishing.</p></div>
    <SubmissionImageInput
      label="Photograph (optional)"
      hint="One photo of a document, place, object or family picture. JPEG, PNG, WebP or a phone photo up to 25 MB — resized in your browser before sending."
      rightsNote="Photos stay private. Staff decide separately whether a photo is published with the approved record."
    />
    <GuestContactFields signedIn={signedIn} accountEmail={accountEmail} idPrefix="history" />
    <div className="ui-subtle ui-card"><label className="ui-row"><input className="size-5 shrink-0" type="checkbox" name="consent" value="yes" required aria-invalid={invalid("consent")} /><span>{HISTORY_CONSENT_TEXT}</span></label></div>
    <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
    <div className="ui-actions"><button type="submit" className="btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit privately for review"}</button></div>
    {state.message ? <p ref={message} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "ui-form-error" : "ui-form-success"}>{state.message}</p> : null}
  </form>;
}
