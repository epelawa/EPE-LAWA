"use client";

import { useActionState } from "react";
import { sendDigestNow, type DigestSendState } from "./send-action";

const initialState: DigestSendState = { status: "idle", message: "" };

export default function DigestSendForm() {
  const [state, action, pending] = useActionState(sendDigestNow, initialState);
  return <form action={action} className="ui-stack-sm">
    <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send to newsletter subscribers"}</button>
    <p className="ui-meta">Goes to every active newsletter subscriber over the configured NEWSLETTER_SMTP transport. Nothing is sent while that SMTP configuration is absent.</p>
    {state.message ? <p className="ui-prose" role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p> : null}
  </form>;
}
