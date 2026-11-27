"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { staffCreateBusiness, type StaffCreateState } from "../app/(protected)/business-review/actions";
import { pushToast } from "../../main/components/toast";
import BusinessHoursEditor from "../../main/components/business-hours-editor";
import UploadModalField from "./upload-modal-field";

type Option = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button data-pending-self-managed="true" className="btn-primary" type="submit" disabled={pending} aria-busy={pending}>{pending && <span className="ep-btn__spinner" aria-hidden="true" />}{pending ? "Publishing…" : "Publish listing"}</button>;
}

export default function BusinessCreateForm({ categories, areas = [] }: { categories: Option[]; areas?: string[] }) {
  const initial: StaffCreateState = { status: "idle", message: "" };
  const [state, action] = useActionState(staffCreateBusiness, initial);
  const [verify, setVerify] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") { form.current?.reset(); pushToast("success", "Listing published to the directory."); }
    else if (state.status === "error" && state.message) pushToast("error", state.message);
  }, [state]);
  return (
    <form ref={form} action={action} className="ui-stack-sm">
      <div className="ui-form-grid">
        <label className="ui-field"><span className="label">Business name</span><input name="name" required maxLength={160} className="input" /></label>
        <label className="ui-field"><span className="label">Category</span><select name="category_id" required className="input" defaultValue="">{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="ui-field"><span className="label">Description</span><textarea name="description" rows={3} maxLength={4000} className="input" /></label>
        <label className="ui-field"><span className="label">Area or community</span><input name="area" maxLength={160} className="input" list="business-create-areas" autoComplete="off" placeholder="Pick or type an area" /><datalist id="business-create-areas">{areas.map((area) => <option key={area} value={area} />)}</datalist></label>
        <label className="ui-field"><span className="label">Address</span><input name="address" maxLength={300} className="input" /></label>
        <label className="ui-field"><span className="label">Landmark</span><input name="landmark" maxLength={200} className="input" /></label>
        <label className="ui-field"><span className="label">Phone</span><input name="phone" maxLength={24} className="input" placeholder="+234…" /></label>
        <label className="ui-field"><span className="label">WhatsApp</span><input name="whatsapp" maxLength={24} className="input" placeholder="+234…" /></label>
        <label className="ui-field"><span className="label">Email</span><input name="email" type="email" maxLength={254} className="input" /></label>
        <label className="ui-field"><span className="label">Website (HTTPS)</span><input name="website" maxLength={2048} className="input" placeholder="https://" /></label>
        <UploadModalField name="logo_file" label="Logo image (optional)" accept="image/jpeg,image/png,image/webp,image/avif" hint="JPEG, PNG, WebP or AVIF. The logo uploads through the EPE LAWA server when the listing is published." description="Choose a logo for this business from your device, or paste a logo link below." />
        <label className="ui-field"><span className="label">Or logo link (HTTPS)</span><input name="logo_url" maxLength={2048} className="input" placeholder="https://" /></label>
      </div>
      <BusinessHoursEditor />
      <label className="ui-row"><input type="checkbox" name="verify" checked={verify} onChange={(event) => setVerify(event.currentTarget.checked)} /> Mark as Verified now</label>
      {verify ? <label className="ui-field"><span className="label">Verification evidence (at least 10 characters)</span><textarea name="evidence" rows={2} maxLength={2000} required className="input" /></label> : null}
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p> : null}
      <div className="ui-actions"><SubmitButton /><button className="btn-ghost" type="reset">Clear form</button></div>
      <p className="ui-meta">Publishing makes the listing visible in the public business directory immediately.</p>
    </form>
  );
}
