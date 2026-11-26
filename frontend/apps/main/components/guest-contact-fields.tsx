"use client";

import { useState, type ChangeEvent } from "react";
import { LiveField, type FieldRules } from "@epelawa/ui";

const NAME_RULES: FieldRules = { required: true, minLength: 2, maxLength: 100 };
const EMAIL_RULES: FieldRules = { required: true, email: true, maxLength: 254 };

/**
 * Private contact details for visitors who submit without signing in. The values
 * are stored on the submission for staff replies only — never published.
 * Signed-in visitors see a short note instead, because their account email is used.
 */
export default function GuestContactFields({ signedIn, accountEmail, idPrefix = "guest" }: { signedIn: boolean; accountEmail?: string | null; idPrefix?: string }) {
  const [values, setValues] = useState({ submitter_name: "", submitter_email: "" });
  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  if (signedIn) {
    return (
      <p className="ui-muted" id={`${idPrefix}-account-note`}>
        {accountEmail ? <>Signed in as <strong>{accountEmail}</strong>. We will use this email if our team needs to reply.</> : "You are signed in. We will use your account email if our team needs to reply."}
      </p>
    );
  }

  return (
    <fieldset className="ui-stack-sm guest-contact" aria-describedby={`${idPrefix}-contact-note`}>
      <legend>Your contact details</legend>
      <p className="ui-muted" id={`${idPrefix}-contact-note`}>Signing in is optional. We only use these details to reply about this submission — they are never published.</p>
      <div className="ui-form-grid">
        <LiveField label="Your name" rules={NAME_RULES} value={values.submitter_name} onChange={change}>
          <input name="submitter_name" autoComplete="name" maxLength={100} value={values.submitter_name} onChange={change} className="input" required />
        </LiveField>
        <LiveField label="Your email" rules={EMAIL_RULES} value={values.submitter_email} onChange={change}>
          <input name="submitter_email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={values.submitter_email} onChange={change} className="input" required />
        </LiveField>
      </div>
    </fieldset>
  );
}
