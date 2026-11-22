"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { controlError } from "@epelawa/ui";
import styles from "./progressive-editor.module.css";
import Link from "next/link";
import SessionRecovery, { clearSessionRecovery } from "./session-recovery";
import { useRouter } from "next/navigation";
import { adminHref } from "../lib/admin-path";
import { useFormStatus } from "react-dom";

function SubmitButton({ label, intent, hidden, busy }: { label: string; intent?: string; hidden: boolean; busy?: boolean }) {
  const { pending } = useFormStatus();
  return <button data-pending-self-managed="true" className="btn-primary" type="submit" name={intent ? "intent" : undefined} value={intent} hidden={hidden} disabled={pending || busy}>{pending || busy ? "Saving…" : label}</button>;
}

type Step = { title: string; content: ReactNode };
type EditResult = { status: "error" | "uncertain"; message: string } | { status: "success"; articleId: string; outcome: "saved" | "revised" | "published" };
export default function ProgressiveEditor({ action, feedbackAction, recoveryActor, articleId, revision, steps, submitLabel, intent }: { action: (formData: FormData) => void | Promise<void>; feedbackAction?: (formData: FormData) => Promise<EditResult>; recoveryActor?: string; articleId: string; revision: string; steps: Step[]; submitLabel: string; intent?: string }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<{status: "error" | "uncertain"; message: string} | null>(null);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [enhanced, setEnhanced] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setEnhanced(true), []);
  function move(to: number) {
    setStep(to);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-editor-step="${to}"]`)?.focus());
  }
  function next() {
    const fields = form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-editor-step="${step}"] input:not([type=hidden]), [data-editor-step="${step}"] select, [data-editor-step="${step}"] textarea`);
    for (const control of Array.from(fields ?? [])) {
      const error = controlError(control);
      if (error) {
        setStepError(error);
        control.setAttribute("aria-invalid", "true");
        return;
      }
    }
    setStepError("");
    move(Math.min(step + 1, steps.length - 1));
  }
  const percent = Math.round((step + 1) / steps.length * 100);
  return <form id="article-editor" ref={form} action={action} noValidate className="ui-stack" onSubmit={event => {
    if (!enhanced || !feedbackAction) return;
    event.preventDefault();
    if (saving || saved || saveError?.status === "uncertain") return;
    const allFields = form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:not([type=hidden]), select, textarea") ?? [];
    for (const control of Array.from(allFields)) {
      const error = controlError(control);
      if (!error) continue;
      const owner = Number(control.closest<HTMLElement>("[data-editor-step]")?.dataset.editorStep ?? -1);
      if (owner >= 0 && owner !== step) move(owner);
      setStepError(error);
      control.setAttribute("aria-invalid", "true");
      return;
    }
    setStepError("");
    const data = new FormData(event.currentTarget);
    if (intent) data.set("intent", intent);
    setSaveError(null);
    startSaving(async () => {
      try { const result = await feedbackAction(data); if (result.status === "success") { setSaved(true); clearSessionRecovery(recoveryActor, articleId); router.push(adminHref(`/newsroom/${result.articleId}?${result.outcome}=1`)); } else setSaveError(result); }
      catch { setSaveError({ status: "uncertain", message: "We could not confirm whether your changes were saved. Open this article in a new tab and check its revision before retrying." }); }
    });
  }} onKeyDown={event => { if (enhanced && step < steps.length - 1 && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); next(); } }} onInvalid={event => { const target = event.target as HTMLElement; const index = target.closest<HTMLElement>("[data-editor-step]")?.dataset.editorStep; if (enhanced && index !== undefined && Number(index) !== step) { move(Number(index)); requestAnimationFrame(() => target.focus()); } }}>
    {saveError && <div role="alert" className="ui-notice"><p>{saveError.message}</p>{saveError.status === "uncertain" && <><Link href={adminHref(`/newsroom/${articleId}`)} target="_blank" rel="noopener noreferrer">Check this article in a new tab</Link><button type="button" className="btn-secondary" onClick={() => setSaveError(null)}>I checked; allow another attempt</button></>}</div>}
    <SessionRecovery form={form} actor={recoveryActor} article={articleId} revision={revision} saved={saved} />
    <input type="hidden" name="articleId" value={articleId} /><input type="hidden" name="revision" value={revision} />
    {enhanced && <div className={styles.progress} aria-live="polite"><p>Step {step + 1} of {steps.length} · {percent}%</p><div role="progressbar" aria-label="Article edit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div></div>}
    {steps.map((item, index) => <section key={item.title} data-editor-step={index} tabIndex={-1} hidden={enhanced && index !== step} className={styles.step} aria-label={item.title}><h3>{item.title}</h3>{item.content}</section>)}
    <div className="ui-actions">{enhanced && step > 0 && <button className="btn-secondary" type="button" onClick={() => move(step - 1)}>Back</button>}{enhanced && step < steps.length - 1 && <button className="btn-primary" type="button" onClick={next}>Continue</button>}{stepError ? <p role="alert" aria-live="polite" className="ep-live-field__message">{stepError}</p> : null}<SubmitButton label={submitLabel} intent={intent} busy={saving || saved || saveError?.status === "uncertain"} hidden={enhanced && step !== steps.length - 1} /></div>
  </form>;
}
