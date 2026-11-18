"use client";
import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { submitEnquiry, type EnquiryState } from "../app/enquiry/actions";
const initial: EnquiryState = {status:"idle",message:""};
export default function EnquiryForm({ kind }: { kind: "contact" | "advertising" | "correction" | "support" }) {
  const [state,action,pending] = useActionState(submitEnquiry,initial);
  const [step,setStep] = useState(0);
  const [name,setName] = useState(""); const [email,setEmail] = useState("");
  const [phone,setPhone] = useState(""); const [whatsapp,setWhatsapp] = useState(""); const [message,setMessage] = useState("");
  const firstStep = useRef<HTMLDivElement>(null);
  function next() {
    const fields = firstStep.current?.querySelectorAll<HTMLInputElement>("input") ?? [];
    for (const field of fields) if (!field.reportValidity()) return;
    setStep(1);
  }
  return <form action={action} className="ui-stack" onSubmit={event=>{ if (step === 0) { event.preventDefault(); next(); } }}>
    <input type="hidden" name="kind" value={kind} />
    <p>Step {step + 1} of 2</p>
    <div ref={firstStep} hidden={step !== 0} className="ui-stack" style={step !== 0 ? {display:"none"} : undefined}>
      <div className="ui-field"><label htmlFor={`${kind}-name`}>Name</label><input id={`${kind}-name`} name="name" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="ui-field"><label htmlFor={`${kind}-email`}>Email address</label><input id={`${kind}-email`} name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      {kind === "advertising" && <><div className="ui-field"><label htmlFor="advertising-whatsapp">WhatsApp number</label><input id="advertising-whatsapp" name="whatsapp" type="tel" autoComplete="tel" minLength={7} maxLength={24} required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} /></div><div className="ui-field"><label htmlFor="advertising-phone">Alternative phone number (optional)</label><input id="advertising-phone" name="phone" type="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} /></div></>}
      <button className="btn-primary" type="button" onClick={next}>Continue</button>
    </div>
    <div hidden={step !== 1} className="ui-stack" style={step !== 1 ? {display:"none"} : undefined}>
      <div className="ui-field"><label htmlFor={`${kind}-message`}>{kind === "correction" ? "What needs correcting? Include the article link." : kind === "advertising" ? "Tell us about your business and advertising needs" : kind === "support" ? "How can we help? Include the page and steps to reproduce any error." : "Message"}</label><textarea id={`${kind}-message`} name="message" minLength={10} maxLength={kind === "advertising" ? 4900 : kind === "support" ? 4980 : 5000} rows={5} required={step === 1} value={message} onChange={e=>setMessage(e.target.value)} /></div>
      <p>We store your enquiry for staff review. Please avoid sensitive information. See our <Link href="/privacy">privacy notice</Link>.</p>
      <div className="ui-row"><button type="button" onClick={()=>setStep(0)}>Back</button><button className="btn-primary" disabled={pending || state.status === "success"} type="submit">{pending ? "Sending…" : kind === "support" ? "Send support request" : "Send enquiry"}</button></div>
    </div>
    <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
