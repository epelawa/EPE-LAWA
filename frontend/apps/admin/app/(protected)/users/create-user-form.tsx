"use client";

import { useState } from "react";
import { inviteUser } from "./actions";
import { CAPABILITIES } from "../../../lib/capabilities";

type InviteResult = { email: string; staffAccessAssigned: boolean; warning: string };

export default function CreateUserForm() {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState("");

  return (
    <>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setResult(null);
          const form = new FormData(event.currentTarget);
          try {
            const response = await inviteUser(form);
            setResult({ email: response.email, staffAccessAssigned: response.staffAccessAssigned, warning: response.warning });
            event.currentTarget.reset();
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Invitation request failed.");
          }
        }}
      >
        <label htmlFor="new-email">Email</label>
        <input id="new-email" name="email" type="email" autoComplete="email" required />
        <fieldset>
          <legend>Initial capabilities</legend>
          {CAPABILITIES.map((capability) => (
            <label key={capability} style={{ display: "block" }}>
              <input type="checkbox" name="capability" value={capability} /> {capability}
            </label>
          ))}
        </fieldset>
        <button type="submit">Send invitation</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <section aria-live="polite" role={result.warning ? "alert" : "status"}>
          <p>{result.warning || `Supabase Auth accepted the invitation request for ${result.email}.`}</p>
          <p>{result.staffAccessAssigned ? "Staff access is assigned and requires verified email." : "The invited account has no staff capabilities and remains a regular member."}</p>
          <p>No password or sign-in token is displayed here.</p>
        </section>
      ) : null}
    </>
  );
}
