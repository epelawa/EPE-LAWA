"use client";

import { useActionState, useState } from "react";
import BrandedDialog from "../../components/branded-dialog";
import { submitEvent, type EventSubmitState } from "./actions";

const initialState: EventSubmitState = { status: "idle", message: "" };

const categories = [
  ["festival", "Festival or celebration"],
  ["community", "Community meeting"],
  ["business", "Business or market"],
  ["civic", "Civic or town hall"],
  ["culture", "Culture and heritage"],
  ["faith", "Faith gathering"],
  ["sports", "Sports"],
] as const;

export default function SubmitEventModal({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState(submitEvent, initialState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") {
    return <p role="status" className="ui-meta">{state.message}</p>;
  }
  const trigger = signedIn
    ? <button className="btn-primary" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Submit an event</button>
    : <a className="btn-primary" href={`/login?next=${encodeURIComponent("/events")}`}>Sign in to submit an event</a>;

  return <div className="ui-stack-sm">
    {state.status === "error" ? <p role="alert" className="ui-meta">{state.message}</p> : null}
    {trigger}
    <BrandedDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Submit a community event"
      description="Tell the desk what is happening, where and when. Every submission is reviewed before it appears on the calendar."
    >
      <form action={action} className="ui-stack-sm">
        <div className="ui-field">
          <label className="label" htmlFor="event-title">Event name</label>
          <input className="input" id="event-title" name="title" required minLength={3} maxLength={200} data-autofocus placeholder="e.g. Epe Fisherman's Festival" />
        </div>
        <div className="ui-field">
          <label className="label" htmlFor="event-description">What happens there?</label>
          <textarea className="input" id="event-description" name="description" required minLength={10} maxLength={4000} rows={4} placeholder="Who is it for, what should people expect, is it free?" />
        </div>
        <div className="ui-form-grid">
          <div className="ui-field">
            <label className="label" htmlFor="event-venue">Venue or meeting point</label>
            <input className="input" id="event-venue" name="venue" required minLength={2} maxLength={200} placeholder="e.g. Epe Town Hall" />
          </div>
          <div className="ui-field">
            <label className="label" htmlFor="event-category">Category</label>
            <select className="input" id="event-category" name="category" required defaultValue="">
              <option value="" disabled>Choose a category</option>
              {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="ui-form-grid">
          <div className="ui-field">
            <label className="label" htmlFor="event-date">Date</label>
            <input className="input" id="event-date" name="date" type="date" required />
          </div>
          <div className="ui-field">
            <label className="label" htmlFor="event-time">Starts (WAT)</label>
            <input className="input" id="event-time" name="time" type="time" required />
          </div>
          <div className="ui-field">
            <label className="label" htmlFor="event-end-time">Ends, optional (WAT)</label>
            <input className="input" id="event-end-time" name="end_time" type="time" />
          </div>
        </div>
        <div className="ui-actions">
          <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send to the desk"}</button>
        </div>
      </form>
    </BrandedDialog>
  </div>;
}
