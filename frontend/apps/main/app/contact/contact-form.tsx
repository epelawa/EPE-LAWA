"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ContactField, ContactState } from "./actions";
import { submitContactMessage } from "./actions";
import { CONTACT_EMAIL } from "../../lib/contact";

const initialState: ContactState = { status: "idle", errors: {} };

type FieldProps = {
  field: ContactField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength: number;
  type?: "text" | "email";
  autoComplete?: string;
  hint?: string;
  multiline?: boolean;
};

function Field({
  field,
  label,
  value,
  onChange,
  error,
  maxLength,
  type = "text",
  autoComplete,
  hint,
  multiline = false,
}: FieldProps) {
  const id = `contact-${field}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const shared = {
    id,
    name: field,
    value,
    required: true,
    maxLength,
    "aria-invalid": error ? ("true" as const) : undefined,
    "aria-describedby": describedBy,
    className: "field__control",
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };

  return (
    <div className="field mb-5">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...shared} rows={6} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} />
      )}
      {error ? (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Checking your message…" : "Submit message"}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, initialState);
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const resultRef = useRef<HTMLDivElement>(null);

  // On a failed submit the summary takes focus, so a keyboard or screen reader user lands
  // on the explanation instead of guessing why nothing happened.
  useEffect(() => {
    if (state.status === "idle") return;
    resultRef.current?.focus();
  }, [state]);

  const setField = (field: ContactField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const fields = ["name", "email", "subject", "message"] as const;

  return (
    <form className="form max-w-md mx-auto" action={formAction} noValidate>
      {state.status !== "idle" ? (
        <div ref={resultRef} className="form-result mb-6" tabIndex={-1} role="alert">
          {state.status === "invalid" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-900 mb-2">Check the highlighted fields</h3>
              <ul className="form-summary__list list-disc pl-5 text-red-800 text-sm">
                {fields.map((field) =>
                  state.errors[field] ? (
                    <li key={field}>
                      <a href={`#contact-${field}`}>{state.errors[field]}</a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-900 mb-2">
                Your message has not been sent
              </h3>
              <p className="text-red-800 text-sm">
                Message delivery is not connected yet, so nothing you typed has reached EPE LAWA.
                Your text is still in the form. To reach a person today, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          )}
        </div>
      ) : null}

      <Field
        field="name"
        label="Name"
        value={values.name}
        onChange={(value) => setField("name", value)}
        error={state.errors.name}
        maxLength={100}
        autoComplete="name"
      />

      <Field
        field="email"
        label="Email"
        type="email"
        value={values.email}
        onChange={(value) => setField("email", value)}
        error={state.errors.email}
        maxLength={254}
        autoComplete="email"
        hint="Only used to reply to you."
      />

      <Field
        field="subject"
        label="Subject"
        value={values.subject}
        onChange={(value) => setField("subject", value)}
        error={state.errors.subject}
        maxLength={150}
      />

      <Field
        field="message"
        label="Message"
        value={values.message}
        onChange={(value) => setField("message", value)}
        error={state.errors.message}
        maxLength={5000}
        multiline
      />

      <div className="form__actions flex items-center gap-3">
        <SubmitButton />
        <p className="field__hint">
          The form checks your text only. It cannot deliver a message yet.
        </p>
      </div>
    </form>
  );
}
