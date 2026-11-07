"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ContactField, ContactState } from "./actions";
import { submitContactMessage } from "./actions";
import { CONTACT_EMAIL } from "../../lib/contact";
const initialState: ContactState = { status: "idle", errors: {} };
function SubmitButton() { const { pending } = useFormStatus(); return <button type="submit" className="btn-secondary" disabled={pending}>{pending ? "Checking your message…" : "Check draft — not sent"}</button>; }
export default function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, initialState);
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.status !== "idle") resultRef.current?.focus(); }, [state]);
  const fields: { name: ContactField; label: string; max: number; type?: string; autoComplete?: string; hint?: string }[] = [{name:"name",label:"Name",max:100,autoComplete:"name"},{name:"email",label:"Email",max:254,type:"email",autoComplete:"email",hint:"Use an address where the team could reply."},{name:"subject",label:"Subject",max:150},{name:"message",label:"Message",max:5000}];
  return <form className="ui-stack" action={formAction} noValidate style={{marginTop:24}}>
    {state.status !== "idle" ? <div ref={resultRef} className={`ui-notice ui-notice--${state.status === "invalid" ? "danger" : "warning"}`} tabIndex={-1} role="alert">{state.status === "invalid" ? <><h3>Check the highlighted fields</h3><ul>{fields.map(field=>state.errors[field.name] ? <li key={field.name}><a href={`#contact-${field.name}`}>{state.errors[field.name]}</a></li> : null)}</ul></> : <><h3>Your message was not sent</h3><p>Delivery is not connected. Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to contact the team.</p></>}</div> : null}
    {fields.map(field=>{const id=`contact-${field.name}`;const error=state.errors[field.name];const describedBy=[field.hint ? `${id}-hint` : null,error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;const shared={id,name:field.name,value:values[field.name],required:true,maxLength:field.max,"aria-invalid":error ? "true" as const : undefined,"aria-describedby":describedBy,onChange:(event:{target:{value:string}})=>setValues(current=>({...current,[field.name]:event.target.value}))};return <div className="ui-field" key={field.name}><label htmlFor={id}>{field.label}</label>{field.hint ? <small id={`${id}-hint`}>{field.hint}</small> : null}{field.name === "message" ? <textarea {...shared} rows={6}/> : <input {...shared} type={field.type ?? "text"} autoComplete={field.autoComplete}/>} {error ? <p className="ui-danger-text" id={`${id}-error`}>{error}</p> : null}</div>;})}
    <div className="ui-row"><SubmitButton/><span className="ui-meta">Draft checking only. Nothing is delivered.</span></div>
  </form>;
}
