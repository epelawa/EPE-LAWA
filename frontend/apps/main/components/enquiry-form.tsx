"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { submitEnquiry, type EnquiryState } from "../app/enquiry/actions";
import { pushToast } from "./toast";
import TurnstileField from "./turnstile-field";
const initial: EnquiryState = {status:"idle",message:""};
type Kind = "contact" | "advertising" | "correction" | "support";
export default function EnquiryForm({ kind, onPendingChange, privacyHref = "/privacy" }: { kind: Kind; onPendingChange?: (pending:boolean)=>void; privacyHref?: string }) {
  const [generation,setGeneration]=useState(0);
  return <EnquiryFormInner key={generation} kind={kind} privacyHref={privacyHref} onPendingChange={onPendingChange} onReset={()=>setGeneration(n=>n+1)}/>;
}
function EnquiryFormInner({kind,privacyHref,onPendingChange,onReset}:{kind:Kind;privacyHref:string;onPendingChange?:(pending:boolean)=>void;onReset:()=>void}) {
  const [state,action,pending] = useActionState(submitEnquiry,initial);
  const [step,setStep] = useState(0), [copyMessage,setCopyMessage]=useState("");
  const [name,setName] = useState(""); const [email,setEmail] = useState("");
  const [phone,setPhone] = useState(""); const [whatsapp,setWhatsapp] = useState(""); const [message,setMessage] = useState("");
  const firstStep = useRef<HTMLDivElement>(null);const secondStep=useRef<HTMLTextAreaElement>(null);const id=useId();
  useEffect(()=>{onPendingChange?.(pending);},[pending,onPendingChange]);
  useEffect(()=>{
    if (state.status === "success" && state.ticket) pushToast("success", "Request received — keep your ticket number.");
    else if (state.status === "error" && state.message) pushToast("error", state.message);
  },[state]);
  function next() {
    const fields = firstStep.current?.querySelectorAll<HTMLInputElement>("input") ?? [];
    for (const field of fields) if (!field.reportValidity()) return;
    setStep(1);requestAnimationFrame(()=>secondStep.current?.focus());
  }
  async function copyTicket() {
    if (!state.ticket) return;
    try { if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable"); await navigator.clipboard.writeText(state.ticket);setCopyMessage("Ticket number copied."); }
    catch {setCopyMessage("Could not copy automatically. Select and copy the ticket number below.");}
  }
  if(state.status === "success" && state.ticket) return <section className="ui-stack" aria-labelledby={`${id}-success`}>
    <h3 id={`${id}-success`}>Request received</h3><p>Your request is in our support queue. Keep your ticket number for reference.</p>
    <div className="ui-field"><label htmlFor={`${id}-ticket`}>Ticket number</label><input id={`${id}-ticket`} readOnly value={state.ticket} onFocus={e=>e.currentTarget.select()} /></div>
    <button className="btn-secondary" type="button" onClick={()=>void copyTicket()}>Copy ticket number</button>
    {copyMessage && <p role="status">{copyMessage}</p>}
    <p role="status">{state.acknowledgement === "accepted" ? "We sent an acknowledgement to your email provider. Check your inbox and spam folder; delivery is not guaranteed." : "We couldn’t confirm the acknowledgement email was sent. Please copy your ticket number now."}</p>
    <button type="button" className="btn-secondary" onClick={onReset}>Start another request</button>
  </section>;
  return <form action={action} className="ui-stack" onSubmit={event=>{ if (step === 0) { event.preventDefault(); next(); } }}>
    <input type="hidden" name="kind" value={kind} />
    <ol className="form-progress" aria-label="Enquiry progress"><li aria-current={step === 0 ? "step" : undefined}><span>1</span> Contact details</li><li aria-current={step === 1 ? "step" : undefined}><span>2</span> Your message</li></ol>
    <div ref={firstStep} hidden={step !== 0} className="ui-stack" style={step !== 0 ? {display:"none"} : undefined}>
      <div className="ui-field"><label htmlFor={`${id}-name`}>Name</label><input id={`${id}-name`} name="name" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="ui-field"><label htmlFor={`${id}-email`}>Email address</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      {kind === "advertising" && <><div className="ui-field"><label htmlFor={`${id}-whatsapp`}>WhatsApp number</label><input id={`${id}-whatsapp`} name="whatsapp" type="tel" autoComplete="tel" minLength={7} maxLength={24} required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} /></div><div className="ui-field"><label htmlFor={`${id}-phone`}>Alternative phone number (optional)</label><input id={`${id}-phone`} name="phone" type="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} /></div></>}
      <TurnstileField compact />
      <button className="btn-primary" type="button" onClick={next}>Continue</button>
    </div>
    <div hidden={step !== 1} className="ui-stack" style={step !== 1 ? {display:"none"} : undefined}>
      <div className="ui-field"><label htmlFor={`${id}-message`}>{kind === "correction" ? "What needs correcting? Include the article link." : kind === "advertising" ? "Tell us about your business and advertising needs" : kind === "support" ? "How can we help? Include the page and steps to reproduce any error." : "Message"}</label><textarea ref={secondStep} id={`${id}-message`} name="message" minLength={10} maxLength={kind === "advertising" ? 4900 : kind === "support" ? 4980 : 5000} rows={5} required={step === 1} value={message} onChange={e=>setMessage(e.target.value)} /></div>
      <p>We store your enquiry for staff review. Please avoid sensitive information. See our <Link href={privacyHref}>privacy notice</Link>.</p>
      <div className="ui-row"><button type="button" disabled={pending} onClick={()=>setStep(0)}>Back</button><button className="btn-primary" disabled={pending || state.status === "success"} type="submit">{pending ? "Sending…" : kind === "support" ? "Send support request" : "Send enquiry"}</button></div>
    </div>
    <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
