"use client";

import { useRef, useState, useTransition } from "react";
import { submitTourismContribution } from "./actions";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;
const MAX_UPLOAD_BYTES = 8_388_608;

/** Shrink a photo in the browser before it is sent, so storage stays small. */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("compress");
    const stem = file.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "photo";
    return new File([blob], `${stem}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export default function TourismContributionForm() {
  const [pending, startTransition] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError("");
    setPhotoNote("");
    setPhoto(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) { setPhotoError("That file is not a JPG, PNG or WebP photo."); event.target.value = ""; return; }
    setWorking(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > MAX_UPLOAD_BYTES) { setPhotoError("That photo is too large even after shrinking. Please choose a smaller one."); event.target.value = ""; return; }
      setPhoto(compressed);
      setPhotoNote(`Photo ready to send (${Math.max(1, Math.round(compressed.size / 1024))} KB after automatic shrinking).`);
    } catch {
      setPhotoError("That photo could not be read. Please choose a different image.");
      event.target.value = "";
    } finally {
      setWorking(false);
    }
  }

  function submit(formData: FormData) {
    if (photo) formData.set("mediaUpload", photo, photo.name);
    startTransition(async () => { await submitTourismContribution(formData); });
  }

  const busy = pending || working;
  return <form action={submit} className="ui-stack">
    <div className="ui-form-grid">
      <div className="ui-field"><label className="label" htmlFor="tourism-name">Destination name</label><input className="input" id="tourism-name" name="name" required minLength={2} maxLength={180} /></div>
      <div className="ui-field"><label className="label" htmlFor="tourism-source">Source citation</label><textarea className="input" id="tourism-source" name="source_citation" required minLength={5} maxLength={2000} /></div>
      <div className="ui-field"><label className="label" htmlFor="tourism-description">Description and historical context</label><textarea className="input" id="tourism-description" name="description" required minLength={20} maxLength={12000} /></div>
      <div className="ui-field"><label className="label" htmlFor="tourism-visitor">Visitor context (optional)</label><textarea className="input" id="tourism-visitor" name="visitor_context" maxLength={3000} /></div>
      <div className="ui-field"><label className="label" htmlFor="tourism-visit">Visit details, if documented (optional)</label><textarea className="input" id="tourism-visit" name="visit_details" maxLength={3000} /><p className="ui-meta">Staff will separately verify hours, access, prices and location before publishing any such details.</p></div>
      <div className="ui-field"><label className="label" htmlFor="tourism-source-url">Source URL (optional, HTTPS)</label><input className="input" id="tourism-source-url" name="source_url" type="url" pattern="https://.*" maxLength={1000} /></div>
      <div className="ui-field">
        <label className="label" htmlFor="tourism-photo">Photo (optional)</label>
        <input className="input" id="tourism-photo" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
        <p className="ui-meta">Your photo is shrunk automatically before sending, so it does not fill our storage. A photo you took yourself is best; say who took it below.</p>
        {photoNote ? <p className="ui-meta" role="status">{photoNote}</p> : null}
        {photoError ? <p className="ui-meta" role="alert">{photoError}</p> : null}
      </div>
      <div className="ui-field"><label className="label" htmlFor="tourism-rights">Who took this photo, and any permission basis (required when you add a photo)</label><textarea className="input" id="tourism-rights" name="media_rights" maxLength={2000} /></div>
    </div>
    <label className="ui-subtle ui-row"><input type="checkbox" name="consent" value="yes" required /><span>I confirm these details are submitted for private editorial review, the source is identified, and any photo rights are accurately described. I understand nothing will be published unless provenance and rights are verified.</span></label>
    <div className="ui-actions"><button className="btn-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Submit privately for review"}</button></div>
  </form>;
}
