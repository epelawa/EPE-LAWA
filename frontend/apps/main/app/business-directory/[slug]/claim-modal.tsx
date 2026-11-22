"use client";

import { useActionState, useState } from "react";
import BrandedDialog from "../../../components/branded-dialog";
import { submitBusinessClaim, type ClaimState } from "../claim-actions";

const initialState: ClaimState = { status: "idle", message: "" };

export default function ClaimBusinessModal({ businessId, slug, signedIn }: { businessId: string; slug: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(submitBusinessClaim, initialState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") {
    return <p role="status" className="ui-meta">{state.message}</p>;
  }
  const trigger = signedIn
    ? <button className="btn-ghost claim-trigger" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Own this business? Claim it</button>
    : <a className="btn-ghost claim-trigger" href={`/login?next=${encodeURIComponent(`/business-directory/${slug}`)}`}>Own this business? Sign in to claim it</a>;

  return <div className="claim-block">
    {state.status === "error" ? <p role="alert" className="ui-meta">{state.message}</p> : null}
    {trigger}
    <BrandedDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Claim this business"
      description="Tell the team how you are connected to this listing. Claims are verified before the account is linked."
    >
      <form action={action} className="ui-stack-sm">
        <input type="hidden" name="business_id" value={businessId} />
        <input type="hidden" name="slug" value={slug} />
        <div className="ui-field">
          <label className="label" htmlFor="claim-message">Your connection to {slug.replace(/-/g, " ")}</label>
          <textarea className="input" id="claim-message" name="message" required minLength={10} maxLength={1000} rows={5} data-autofocus placeholder="e.g. I manage this shop and can confirm the listed phone number…" />
        </div>
        <div className="ui-actions">
          <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send claim"}</button>
        </div>
      </form>
    </BrandedDialog>
  </div>;
}
