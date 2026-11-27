"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { replyToSupportTicket, type ReplyState } from "../app/support/actions";
import { pushToast } from "./toast";

const initial: ReplyState = { status: "idle", message: "" };

export default function SupportTicketReply({ reference, token }: { reference: string; token: string }) {
  const [state, action, pending] = useActionState(replyToSupportTicket, initial);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state.status === "success") { form.current?.reset(); pushToast("success", state.message); }
    else if (state.status === "error" && state.message) pushToast("error", state.message);
  }, [state]);
  return <form ref={form} action={action} className="ui-stack">
    <input type="hidden" name="reference" value={reference} />
    <input type="hidden" name="token" value={token} />
    <div className="ui-field"><label htmlFor={`${id}-msg`}>Your message</label><textarea id={`${id}-msg`} name="message" rows={4} minLength={2} maxLength={5000} required /></div>
    <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send reply"}</button>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
  </form>;
}
