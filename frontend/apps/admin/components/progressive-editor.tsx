"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./progressive-editor.module.css";

type Step = { title: string; content: ReactNode };
export default function ProgressiveEditor({ action, articleId, revision, steps, submitLabel, intent }: { action: (formData: FormData) => void | Promise<void>; articleId: string; revision: string; steps: Step[]; submitLabel: string; intent?: string }) {
  const [step, setStep] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setEnhanced(true), []);
  function move(to: number) {
    setStep(to);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-editor-step="${to}"]`)?.focus());
  }
  function next() {
    const fields = form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-editor-step="${step}"] input, [data-editor-step="${step}"] select, [data-editor-step="${step}"] textarea`);
    for (const field of Array.from(fields ?? [])) if (!field.reportValidity()) return;
    move(Math.min(step + 1, steps.length - 1));
  }
  const percent = Math.round((step + 1) / steps.length * 100);
  return <form id="article-editor" ref={form} action={action} className="ui-stack" onKeyDown={event => { if (enhanced && step < steps.length - 1 && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); next(); } }} onInvalid={event => { const target = event.target as HTMLElement; const index = target.closest<HTMLElement>("[data-editor-step]")?.dataset.editorStep; if (enhanced && index !== undefined && Number(index) !== step) { move(Number(index)); requestAnimationFrame(() => target.focus()); } }}>
    <input type="hidden" name="articleId" value={articleId} /><input type="hidden" name="revision" value={revision} />
    {enhanced && <div className={styles.progress} aria-live="polite"><p>Step {step + 1} of {steps.length} · {percent}%</p><div role="progressbar" aria-label="Article edit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div></div>}
    {steps.map((item, index) => <section key={item.title} data-editor-step={index} tabIndex={-1} hidden={enhanced && index !== step} className={styles.step} aria-label={item.title}><h3>{item.title}</h3>{item.content}</section>)}
    <div className="ui-actions">{enhanced && step > 0 && <button className="btn-secondary" type="button" onClick={() => move(step - 1)}>Back</button>}{enhanced && step < steps.length - 1 && <button className="btn-primary" type="button" onClick={next}>Continue</button>}<button className="btn-primary" type="submit" name={intent ? "intent" : undefined} value={intent} hidden={enhanced && step !== steps.length - 1}>{submitLabel}</button></div>
  </form>;
}
