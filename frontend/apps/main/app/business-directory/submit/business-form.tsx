"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { LiveField, SubmitButton, validateField, type FieldRules } from "@epelawa/ui";
import { submitBusiness } from "./actions";
import styles from "./business-form.module.css";
import BusinessLogoInput from "../../../components/business-logo-input";
import BusinessHoursEditor from "../../../components/business-hours-editor";

type Category = { id: string; label: string };

const NAME_RULES: FieldRules = { required: true, minLength: 2, maxLength: 160 };
const CATEGORY_RULES: FieldRules = { required: true, message: "Choose a category." };
const DESCRIPTION_RULES: FieldRules = { maxLength: 4000 };
const CONTACT_FIELDS = [
  ["area", "Area", 160, undefined],
  ["address", "Address", 300, undefined],
  ["landmark", "Nearby landmark", 200, undefined],
  ["phone", "Phone", 24, { pattern: /^[0-9+\-() ]{7,24}$/, message: "Use digits, spaces and + ( ) - only." }],
  ["whatsapp", "WhatsApp", 24, { pattern: /^[0-9+ ]{7,24}$/, message: "Use digits and + only." }],
  ["email", "Public contact email", 254, { email: true }],
  ["website", "Website (HTTPS)", 2048, { url: true }],
] as const;

export default function BusinessForm({ categories }: { categories: Category[] }) {
  const [step, setStep] = useState(1);
  const [state, action, pending] = useActionState(submitBusiness,{status:"idle" as const,message:""});
  const [values,setValues] = useState<Record<string,string>>({});
  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues(current=>({...current,[event.target.name]:event.target.value}));
  const [enhanced, setEnhanced] = useState(false);
  const [stepError, setStepError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setEnhanced(true), []);
  function move(target: number) {
    setStep(target);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-step="${target}"]`)?.focus());
  }
  function next() {
    const nameError = validateField(values.name ?? "", NAME_RULES);
    const categoryError = validateField(values.category_id ?? "", CATEGORY_RULES);
    if (nameError || categoryError) {
      setStepError(nameError || categoryError);
      return;
    }
    setStepError("");
    move(2);
  }
  return <form ref={form} action={action} noValidate className="ui-stack" onKeyDown={event => { if (enhanced && step === 1 && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); next(); } }}>
    {enhanced && <div className={styles.progress} aria-live="polite"><p>Step {step} of 2 · {step * 50}%</p><div role="progressbar" aria-label="Listing form progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={step * 50}><span style={{ width: `${step * 50}%` }} /></div></div>}
    <section data-step="1" tabIndex={-1} hidden={enhanced && step !== 1} className={styles.step} aria-labelledby="business-details"><h2 id="business-details">Business details</h2>
      <LiveField label="Business name" rules={NAME_RULES} value={values.name ?? ""} onChange={change}><input name="name" value={values.name ?? ""} onChange={change} className="input" /></LiveField>
      <LiveField label="Category" rules={CATEGORY_RULES} value={values.category_id ?? ""} onChange={change}><select name="category_id" value={values.category_id ?? ""} onChange={change} className="input"><option value="" disabled>Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></LiveField>
      <LiveField label="Description" optional rules={DESCRIPTION_RULES} value={values.description ?? ""} onChange={change}><textarea name="description" value={values.description ?? ""} onChange={change} rows={5} className="input" /></LiveField>
      {enhanced && stepError ? <p role="alert" aria-live="polite">{stepError}</p> : null}
    </section>
    <section data-step="2" tabIndex={-1} hidden={enhanced && step !== 2} className={styles.step} aria-labelledby="business-contact"><h2 id="business-contact">Location and contact</h2>
      <div className="ui-form-grid">{CONTACT_FIELDS.map(([n, l, m, r]) => <LiveField key={n} label={l} optional={!r} rules={r} value={values[n] ?? ""} onChange={change}>{n === "email" ? <input name={n} value={values[n] ?? ""} onChange={change} maxLength={m} type="email" className="input" /> : <input name={n} value={values[n] ?? ""} onChange={change} maxLength={m} className="input" />}</LiveField>)}</div>
      <div className="ui-stack-sm"><BusinessLogoInput /><LiveField label="Logo link" optional hint="Paste an HTTPS image link." rules={{ url: true }} value={values.logo_url ?? ""} onChange={change}><input name="logo_url" type="url" maxLength={2048} className="input" placeholder="https://" /></LiveField></div>
      <BusinessHoursEditor />
      <p className="ui-muted">Contact information is listing content and may appear publicly after approval.</p>
    </section>
    <div className={styles.actions}>{enhanced && step === 2 && <button className="btn-secondary" type="button" onClick={() => move(1)}>Back</button>}{enhanced && step === 1 && <button className="btn-primary" type="button" onClick={next}>Continue</button>}<SubmitButton pendingLabel="Sending…" disabled={state.status === "success"} hidden={enhanced && step !== 2}>Send for review</SubmitButton></div>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
