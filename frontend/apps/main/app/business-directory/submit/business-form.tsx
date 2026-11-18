"use client";

import { useEffect, useRef, useState } from "react";
import { submitBusiness } from "./actions";
import styles from "./business-form.module.css";

type Category = { id: string; label: string };
export default function BusinessForm({ categories }: { categories: Category[] }) {
  const [step, setStep] = useState(1);
  const [enhanced, setEnhanced] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setEnhanced(true), []);
  function move(target: number) {
    setStep(target);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-step="${target}"]`)?.focus());
  }
  function next() {
    const fields = form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-step="1"] input, [data-step="1"] select, [data-step="1"] textarea');
    for (const field of Array.from(fields ?? [])) if (!field.reportValidity()) return;
    move(2);
  }
  return <form ref={form} action={submitBusiness} className="ui-stack" onKeyDown={event => { if (enhanced && step === 1 && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); next(); } }} onInvalid={event => { const target = event.target as HTMLElement; const invalidStep = Number(target.closest<HTMLElement>('[data-step]')?.dataset.step); if (enhanced && invalidStep && invalidStep !== step) { move(invalidStep); requestAnimationFrame(() => target.focus()); } }}>
    {enhanced && <div className={styles.progress} aria-live="polite"><p>Step {step} of 2 · {step * 50}%</p><div role="progressbar" aria-label="Listing form progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={step * 50}><span style={{ width: `${step * 50}%` }} /></div></div>}
    <section data-step="1" tabIndex={-1} hidden={enhanced && step !== 1} className={styles.step} aria-labelledby="business-details"><h2 id="business-details">Business details</h2>
      <div className="ui-field"><label className="label">Business name<input name="name" required minLength={2} maxLength={160} className="input" /></label></div>
      <div className="ui-field"><label className="label">Category<select name="category_id" required defaultValue="" className="input"><option value="" disabled>Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div>
      <div className="ui-field"><label className="label">Description<textarea name="description" maxLength={4000} rows={5} className="input" /></label></div>
    </section>
    <section data-step="2" tabIndex={-1} hidden={enhanced && step !== 2} className={styles.step} aria-labelledby="business-contact"><h2 id="business-contact">Location and contact</h2>
      <div className="ui-form-grid">{([ ["area", "Area", 160], ["address", "Address", 300], ["landmark", "Nearby landmark", 200], ["phone", "Phone", 24], ["whatsapp", "WhatsApp", 24], ["email", "Public contact email", 254], ["website", "Website (HTTPS)", 2048] ] as const).map(([n, l, m]) => <div className="ui-field" key={n}><label className="label">{l}<input name={n} maxLength={m} type={n === "email" ? "email" : "text"} className="input" /></label></div>)}</div>
      <p className="ui-muted">Contact information is listing content and may appear publicly after approval.</p>
    </section>
    <div className={styles.actions}>{enhanced && step === 2 && <button className="btn-secondary" type="button" onClick={() => move(1)}>Back</button>}{enhanced && step === 1 && <button className="btn-primary" type="button" onClick={next}>Continue</button>}<button className="btn-primary" type="submit" hidden={enhanced && step !== 2}>Send for review</button></div>
  </form>;
}
