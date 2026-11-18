"use client";
import { useActionState } from "react";
import { confirmNewsletter, type NewsletterState } from "../actions";
const initial: NewsletterState = { status: "idle", message: "" };
export default function ConfirmForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmNewsletter, initial);
  return <form action={action} className="ui-stack-sm">
    <input type="hidden" name="token" value={token} />
    <button className="btn-primary" type="submit" disabled={pending || state.status === "success"}>{pending ? "Confirming…" : "Confirm subscription"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}
