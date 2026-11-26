"use client";

import HumanCheck from "../../../components/human-check";
import { useActionState, useEffect, useRef } from "react";
import { submitHistoryCorrection, type CorrectionState } from "./actions";

const initial: CorrectionState = { status: "idle", message: "" };

export default function CorrectionForm({ accountEmail, defaultRecord = "" }: { accountEmail: string | null; defaultRecord?: string }) {
  const [state, action, pending] = useActionState(submitHistoryCorrection, initial);
  const form = useRef<HTMLFormElement>(null);
  const outcome = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error" && state.field) form.current?.querySelector<HTMLElement>(`[name="${state.field}"]`)?.focus();
    else if (state.status !== "idle") outcome.current?.focus();
    if (state.status === "success") form.current?.reset();
  }, [state]);
  const invalid = (name: string) => (state.status === "error" && state.field === name ? true : undefined);

  return <form ref={form} action={action} noValidate className="ui-stack-sm">
    <div className="ui-field"><label className="label" htmlFor="correction-record">Which record?</label><input className="input" id="correction-record" name="record_ref" defaultValue={defaultRecord} maxLength={300} placeholder="Record title, family or community" aria-invalid={invalid("record_ref")} /></div>
    <fieldset className="ui-stack-sm guest-contact">
      <legend>What would you like?</legend>
      <label className="ui-row"><input type="radio" name="request_kind" value="correction" defaultChecked /> <span>Correct something in the record</span></label>
      <label className="ui-row"><input type="radio" name="request_kind" value="removal" /> <span>Remove a record about me or my family</span></label>
    </fieldset>
    <div className="ui-field"><label className="label" htmlFor="correction-message">What should change?</label><textarea className="input" id="correction-message" name="message" rows={6} maxLength={5000} aria-invalid={invalid("message")} placeholder="Explain what is wrong and include any source we can check." /></div>
    <div className="ui-form-grid">
      <div className="ui-field"><label className="label" htmlFor="correction-name">Your name</label><input className="input" id="correction-name" name="sender_name" autoComplete="name" maxLength={100} aria-invalid={invalid("sender_name")} /></div>
      <div className="ui-field"><label className="label" htmlFor="correction-email">Your email</label><input className="input" id="correction-email" name="sender_email" type="email" autoComplete="email" maxLength={254} defaultValue={accountEmail ?? ""} aria-invalid={invalid("sender_email")} /></div>
    </div>
    <p className="ui-meta">Signing in is optional. We use your email only to reply about this request. See our <a className="ui-text-link" href="/privacy">privacy notice</a>.</p>
    <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
    <HumanCheck />
    <div className="ui-actions"><button type="submit" className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send request"}</button></div>
    {state.message ? <p ref={outcome} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "ui-form-error" : "ui-form-success"}>{state.message}</p> : null}
  </form>;
}
