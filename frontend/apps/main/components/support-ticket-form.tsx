"use client";
import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { openSupportTicket, findSupportTicket, type TicketFormState, type ReplyState } from "../app/support/actions";
import { SUPPORT_CATEGORIES } from "../lib/support/rules";
import { pushToast } from "./toast";
import TurnstileField from "./turnstile-field";

const initial: TicketFormState = { status: "idle", message: "" };

/** Opens a support ticket and hands back the reference plus the private ticket link. */
export default function SupportTicketForm() {
  const [generation, setGeneration] = useState(0);
  return <SupportTicketFormInner key={generation} onReset={() => setGeneration((n) => n + 1)} />;
}

function SupportTicketFormInner({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState(openSupportTicket, initial);
  const [copied, setCopied] = useState("");
  const id = useId();
  useEffect(() => {
    if (state.status === "success" && state.reference) pushToast("success", `Ticket ${state.reference} is open.`);
    else if (state.status === "error" && state.message) pushToast("error", state.message);
  }, [state]);

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setCopied(`${label} copied.`); }
    catch { setCopied(`Could not copy automatically — select the ${label.toLowerCase()} and copy it.`); }
  }

  if (state.status === "success" && state.reference) {
    return <section className="support-ticket-done ui-stack" aria-labelledby={`${id}-done`}>
      <p className="support-ticket-done__eyebrow">Ticket opened</p>
      <h3 id={`${id}-done`} className="support-ticket-done__ref">{state.reference}</h3>
      <p>{state.emailed ? "We emailed you a confirmation with a private link to this ticket. Replies from our assistant and team arrive by email too." : "We couldn't confirm the confirmation email — keep this reference and the link below."}</p>
      <div className="ui-row">
        {state.link ? <Link className="btn-primary" href={state.link}>Open my ticket</Link> : null}
        <button className="btn-secondary" type="button" onClick={() => void copy(state.reference!, "Reference")}>Copy reference</button>
      </div>
      {copied ? <p role="status">{copied}</p> : null}
      <button type="button" className="btn-secondary" onClick={onReset}>Open another ticket</button>
    </section>;
  }

  return <form action={action} className="ui-stack support-ticket-form">
    <div className="support-ticket-form__grid">
      <div className="ui-field"><label htmlFor={`${id}-name`}>Your name</label><input id={`${id}-name`} name="name" autoComplete="name" minLength={2} maxLength={100} required /></div>
      <div className="ui-field"><label htmlFor={`${id}-email`}>Email for replies</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required /></div>
    </div>
    <div className="ui-field"><label htmlFor={`${id}-category`}>What is it about?</label>
      <select id={`${id}-category`} name="category" required defaultValue="general">
        {SUPPORT_CATEGORIES.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
      </select>
    </div>
    <div className="ui-field"><label htmlFor={`${id}-subject`}>Short title</label><input id={`${id}-subject`} name="subject" minLength={3} maxLength={120} required placeholder="e.g. I can't sign in on my phone" /></div>
    <div className="ui-field"><label htmlFor={`${id}-message`}>Tell us what happened</label><textarea id={`${id}-message`} name="message" minLength={10} maxLength={5000} rows={6} required placeholder="Which page, what you tried, and what you saw." /></div>
    <p className="support-ticket-form__note">Don't include passwords, PINs or card details. Our AI assistant may answer first; anything it can't safely answer goes to a person. See our <Link href="/privacy">privacy notice</Link>.</p>
    <TurnstileField compact />
    <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
    <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Opening ticket…" : "Open support ticket"}</button>
    {state.status === "error" && state.message ? <p role="alert">{state.message}</p> : null}
  </form>;
}

const findInitial: ReplyState = { status: "idle", message: "" };

export function FindTicketForm() {
  const [state, action, pending] = useActionState(findSupportTicket, findInitial);
  const id = useId();
  return <form action={action} className="ui-stack">
    <div className="support-ticket-form__grid">
      <div className="ui-field"><label htmlFor={`${id}-ref`}>Ticket reference</label><input id={`${id}-ref`} name="reference" placeholder="EPE-7K3QX9" maxLength={10} required autoCapitalize="characters" /></div>
      <div className="ui-field"><label htmlFor={`${id}-email`}>Email you used</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required /></div>
    </div>
    <button className="btn-secondary" type="submit" disabled={pending}>{pending ? "Checking…" : "Email me the ticket link"}</button>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
  </form>;
}
