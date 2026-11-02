"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button } from "@epelawa/ui";
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
    <div className="field">
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
    <Button type="submit" loading={pending} loadingLabel="Checking your message">
      Submit message
    </Button>
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
    <form className="form" action={formAction} noValidate>
      {state.status !== "idle" ? (
        <div className="form-result" ref={resultRef} tabIndex={-1} role="alert">
          {state.status === "invalid" ? (
            <Alert tone="error" title="Check the highlighted fields">
              <ul className="form-summary__list">
                {fields.map((field) =>
                  state.errors[field] ? (
                    <li key={field}>
                      <a href={`#contact-${field}`}>{state.errors[field]}</a>
                    </li>
                  ) : null,
                )}
              </ul>
            </Alert>
          ) : (
            <Alert tone="warning" title="Your message has not been sent">
              <p>
                Message delivery is not connected yet, so nothing you typed has reached EPE LAWA.
                Your text is still in the form. To reach a person today, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            </Alert>
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

      <div className="form__actions">
        <SubmitButton />
        <p className="field__hint">
          The form checks your text only. It cannot deliver a message yet.
        </p>
      </div>
    </form>
  );
}
