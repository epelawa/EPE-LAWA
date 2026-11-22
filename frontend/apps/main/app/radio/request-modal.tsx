"use client";

import { useActionState, useState } from "react";
import BrandedDialog from "../../components/branded-dialog";
import { requestSong, type SongRequestState } from "./request-actions";

const initialState: SongRequestState = { status: "idle", message: "" };

export default function SongRequestModal({ programmes, signedIn }: { programmes: Array<{ id: string; name: string }>; signedIn: boolean }) {
  const [state, action, pending] = useActionState(requestSong, initialState);
  const [open, setOpen] = useState(false);

  if (!signedIn) {
    return <a className="btn-ghost" href={`/login?next=${encodeURIComponent("/radio")}`}>Sign in to request a song</a>;
  }
  if (state.status === "success") {
    return <p role="status" className="ui-meta">{state.message}</p>;
  }
  return <div className="ui-stack-sm">
    {state.status === "error" ? <p role="alert" className="ui-meta">{state.message}</p> : null}
    <button className="btn-ghost" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Request a song on air</button>
    <BrandedDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Request a song"
      description="The radio desk reads every request before airtime. Requests are a wish list, not a play guarantee."
    >
      <form action={action} className="ui-stack-sm">
        <div className="ui-field">
          <label className="label" htmlFor="song-request-name">Song (and artist if you know it)</label>
          <input className="input" id="song-request-name" name="song" required minLength={2} maxLength={200} data-autofocus placeholder="e.g. Sweet Mother — Prince Nico Mbarga" />
        </div>
        <div className="ui-field">
          <label className="label" htmlFor="song-request-programme">Programme (optional)</label>
          <select className="input" id="song-request-programme" name="programme_id" defaultValue="">
            <option value="">Any programme</option>
            {programmes.map(programme => <option value={programme.id} key={programme.id}>{programme.name}</option>)}
          </select>
        </div>
        <div className="ui-field">
          <label className="label" htmlFor="song-request-note">Note to the presenter (optional)</label>
          <textarea className="input" id="song-request-note" name="note" minLength={2} maxLength={500} rows={3} placeholder="A dedication, greeting or why it matters…" />
        </div>
        <div className="ui-actions">
          <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send request"}</button>
        </div>
      </form>
    </BrandedDialog>
  </div>;
}
