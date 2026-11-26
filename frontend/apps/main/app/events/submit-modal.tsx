"use client";

import HumanCheck from "../../components/human-check";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import BrandedDialog from "../../components/branded-dialog";
import GuestContactFields from "../../components/guest-contact-fields";
import SubmissionImageInput from "../../components/submission-image-input";
import { submitEvent, type EventSubmitState } from "./actions";
import { EVENT_CATEGORIES, eventCategoryLabel } from "./event-categories";
import styles from "./events.module.css";

const initialState: EventSubmitState = { status: "idle", message: "" };

const STEPS = ["The event", "When and where", "Photo", "Send"] as const;
type Values = Record<"title" | "category" | "description" | "date" | "time" | "end_date" | "end_time" | "venue", string>;
const EMPTY: Values = { title: "", category: "", description: "", date: "", time: "", end_date: "", end_time: "", venue: "" };

function todayInLagos(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function checkStep(step: number, v: Values): { field: keyof Values; message: string } | null {
  if (step === 0) {
    if (v.title.trim().length < 3) return { field: "title", message: "Give the event a name of at least 3 characters." };
    if (!v.category) return { field: "category", message: "Choose a category." };
    if (v.description.trim().length < 10) return { field: "description", message: "Describe the event in at least 10 characters." };
  }
  if (step === 1) {
    if (!v.date) return { field: "date", message: "Choose the date of the event." };
    if (v.date < todayInLagos()) return { field: "date", message: "The event date must be today or later." };
    if (!v.time) return { field: "time", message: "Choose a start time." };
    if (v.end_date && v.end_date < v.date) return { field: "end_date", message: "The end date cannot be before the start date." };
    if (v.end_time && (!v.end_date || v.end_date === v.date) && v.end_time <= v.time) return { field: "end_time", message: "The end time must be after the start time." };
    if (v.venue.trim().length < 2) return { field: "venue", message: "Name the venue or meeting point." };
  }
  return null;
}

/**
 * Stepped event submission. Four short steps fit a phone screen without long
 * scrolling; every field stays in one <form> so nothing is lost between steps.
 * Signing in is optional — guests leave a name and email on the last step.
 */
export default function SubmitEventModal({ signedIn, accountEmail = null, variant = "primary" }: { signedIn: boolean; accountEmail?: string | null; variant?: "primary" | "secondary" }) {
  const [state, action, pending] = useActionState(submitEvent, initialState);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);

  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (error?.field === event.target.name) setError(null);
  };

  useEffect(() => {
    if (state.status === "error") {
      setError({ field: state.field, message: state.message });
      if (state.field === "title" || state.field === "category" || state.field === "description") setStep(0);
      else if (state.field && ["date", "time", "end_date", "end_time", "venue"].includes(state.field)) setStep(1);
    }
  }, [state]);

  function focusStep(target: number) {
    requestAnimationFrame(() => {
      const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${target}"]`);
      section?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true });
      section?.scrollIntoView({ block: "start" });
    });
  }

  function next() {
    const problem = checkStep(step, values);
    if (problem) {
      setError(problem);
      formRef.current?.querySelector<HTMLElement>(`[name="${problem.field}"]`)?.focus();
      return;
    }
    setError(null);
    setStep(step + 1);
    focusStep(step + 1);
  }

  function back() {
    setError(null);
    setStep(Math.max(0, step - 1));
    focusStep(Math.max(0, step - 1));
  }

  function reset() {
    setValues(EMPTY);
    setStep(0);
    setError(null);
    setFormKey((key) => key + 1);
  }

  const invalid = (field: keyof Values) => (error?.field === field ? true : undefined);
  const done = state.status === "success" && !pending;

  return <div className="ui-stack-sm">
    <button className={variant === "primary" ? "btn-primary" : "btn-secondary"} type="button" aria-haspopup="dialog" onClick={() => { if (done) reset(); setOpen(true); }}>Submit an event</button>
    {done && !open ? <p role="status" className="ui-meta">{state.message}</p> : null}
    <BrandedDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Submit a community event"
      description="Signing in is optional. The desk reviews every event before it appears on the calendar."
      className={styles.submitDialog}
    >
      {done ? <div className="ui-stack-sm" role="status">
        <p className={styles.successTitle}>Thank you — your event was sent.</p>
        <p className="ui-meta">{state.message}</p>
        <div className="ui-dialog__actions">
          <button type="button" className="btn-secondary" onClick={reset}>Submit another event</button>
          <button type="button" className="btn-primary" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div> : <form key={formKey} ref={formRef} action={action} noValidate className={styles.stepForm}>
        <ol className={styles.stepper} aria-label="Event form progress">
          {STEPS.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} data-state={index < step ? "done" : index === step ? "current" : "todo"}>
            <span className={styles.stepNumber}>{index + 1}</span><span className={styles.stepLabel}>{label}</span>
          </li>)}
        </ol>
        <p className="sr-only" aria-live="polite">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

        <section data-step="0" hidden={step !== 0} className="ui-stack-sm">
          <div className="ui-field">
            <label className="label" htmlFor="event-title">Event name</label>
            <input className="input" id="event-title" name="title" value={values.title} onChange={change} aria-invalid={invalid("title")} maxLength={200} data-autofocus placeholder="e.g. Epe Fishermen's Festival" />
          </div>
          <div className="ui-field">
            <label className="label" htmlFor="event-category">Category</label>
            <select className="input" id="event-category" name="category" value={values.category} onChange={change} aria-invalid={invalid("category")}>
              <option value="" disabled>Choose a category</option>
              {EVENT_CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label className="label" htmlFor="event-description">What happens there?</label>
            <textarea className="input" id="event-description" name="description" value={values.description} onChange={change} aria-invalid={invalid("description")} maxLength={4000} rows={4} placeholder="Who is it for, what should people expect, is it free?" />
          </div>
        </section>

        <section data-step="1" hidden={step !== 1} className="ui-stack-sm">
          <div className={styles.dateGrid}>
            <div className="ui-field">
              <label className="label" htmlFor="event-date">Date</label>
              <input className="input" id="event-date" name="date" type="date" min={todayInLagos()} value={values.date} onChange={change} aria-invalid={invalid("date")} />
            </div>
            <div className="ui-field">
              <label className="label" htmlFor="event-time">Start time (WAT)</label>
              <input className="input" id="event-time" name="time" type="time" value={values.time} onChange={change} aria-invalid={invalid("time")} />
            </div>
            <div className="ui-field">
              <label className="label" htmlFor="event-end-date">End date <span className="ui-meta">(optional)</span></label>
              <input className="input" id="event-end-date" name="end_date" type="date" min={values.date || todayInLagos()} value={values.end_date} onChange={change} aria-invalid={invalid("end_date")} />
            </div>
            <div className="ui-field">
              <label className="label" htmlFor="event-end-time">End time (WAT) <span className="ui-meta">(optional)</span></label>
              <input className="input" id="event-end-time" name="end_time" type="time" value={values.end_time} onChange={change} aria-invalid={invalid("end_time")} />
            </div>
          </div>
          <div className="ui-field">
            <label className="label" htmlFor="event-venue">Venue or meeting point</label>
            <input className="input" id="event-venue" name="venue" value={values.venue} onChange={change} aria-invalid={invalid("venue")} maxLength={200} placeholder="e.g. Epe Town Hall" />
          </div>
        </section>

        <section data-step="2" hidden={step !== 2} className="ui-stack-sm">
          <SubmissionImageInput
            label="Event poster or photo (optional)"
            rightsNote="Only send a photo or poster you made or have permission to share. It appears with the event if the desk approves it."
          />
        </section>

        <section data-step="3" hidden={step !== 3} className="ui-stack-sm">
          <dl className={styles.review}>
            <div><dt>Event</dt><dd>{values.title || "—"}</dd></div>
            <div><dt>Category</dt><dd>{values.category ? eventCategoryLabel(values.category) : "—"}</dd></div>
            <div><dt>When</dt><dd>{values.date ? `${values.date}${values.time ? ` · ${values.time}` : ""}${values.end_date && values.end_date !== values.date ? ` → ${values.end_date}` : ""}${values.end_time ? ` · until ${values.end_time}` : ""} WAT` : "—"}</dd></div>
            <div><dt>Where</dt><dd>{values.venue || "—"}</dd></div>
          </dl>
          <GuestContactFields signedIn={signedIn} accountEmail={accountEmail} idPrefix="event" />
          <HumanCheck />
          <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
        </section>

        {error ? <p role="alert" className={styles.formError}>{error.message}</p> : null}

        <div className={styles.stepActions}>
          {step > 0 ? <button type="button" className="btn-secondary" onClick={back} disabled={pending}>Back</button> : <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>}
          {step < STEPS.length - 1
            ? <button type="button" className="btn-primary" onClick={next}>Continue</button>
            : <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send to the desk"}</button>}
        </div>
      </form>}
    </BrandedDialog>
  </div>;
}
