"use client";
import { useActionState } from "react";
import Link from "next/link";
import { submitEnquiry, type EnquiryState } from "../app/enquiry/actions";
const initial: EnquiryState = {status:"idle",message:""};
export default function EnquiryForm({ kind }: { kind: "contact" | "advertising" | "correction" }) {
  const [state,action,pending] = useActionState(submitEnquiry,initial);
  return <form action={action} className="ui-stack">
    <input type="hidden" name="kind" value={kind} />
    <div className="ui-field"><label htmlFor={`${kind}-name`}>Name</label><input id={`${kind}-name`} name="name" autoComplete="name" minLength={2} maxLength={100} required /></div>
    <div className="ui-field"><label htmlFor={`${kind}-email`}>Email address</label><input id={`${kind}-email`} name="email" type="email" autoComplete="email" maxLength={254} required /></div>
    <div className="ui-field"><label htmlFor={`${kind}-message`}>{kind === "correction" ? "What needs correcting? Include the article link." : "Message"}</label><textarea id={`${kind}-message`} name="message" minLength={10} maxLength={5000} rows={7} required /></div>
    <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
    <p>We store your enquiry for staff review. Please avoid sensitive information. See our <Link href="/privacy">privacy notice</Link>.</p>
    <button className="btn-primary" disabled={pending} type="submit">{pending ? "Sending…" : "Send enquiry"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
