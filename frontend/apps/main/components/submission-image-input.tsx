"use client";

import { useId, useRef, useState } from "react";
import { imageErrorMessage, prepareImage } from "../lib/client-image";
import styles from "./submission-image-input.module.css";

/**
 * Optional photo for a public submission (event poster, Ìtàn Ilú Mi photograph).
 * The picked image is compressed in the browser into the hidden `image_data`
 * field; a short description goes in `image_alt`. Nothing is uploaded until the
 * whole form is sent.
 */
export default function SubmissionImageInput({
  label = "Photo (optional)",
  hint = "JPEG, PNG, WebP or a phone photo up to 25 MB. It is resized in your browser before sending.",
  altLabel = "Describe the photo",
  rightsNote,
}: { label?: string; hint?: string; altLabel?: string; rightsNote?: string }) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const data = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  async function pick(chosen: File | undefined) {
    if (!chosen) return;
    setBusy(true);
    setStatus("Preparing photo…");
    try {
      const url = await prepareImage(chosen, 1600);
      if (data.current) data.current.value = url;
      setPreview(url);
      setStatus("Photo ready. It is sent with the rest of the form.");
    } catch (error) {
      if (data.current) data.current.value = "";
      setPreview(null);
      setStatus(imageErrorMessage(error, "photo"));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  function clear() {
    if (data.current) data.current.value = "";
    setPreview(null);
    setStatus("Photo removed.");
  }

  return (
    <div className={styles.field}>
      <span className="label" id={`${id}-label`}>{label}</span>
      <p className="ui-meta" id={`${id}-hint`}>{hint}</p>
      <div className={styles.row}>
        <label className={`btn-secondary ${styles.pick}`} aria-describedby={`${id}-hint`}>
          {preview ? "Choose a different photo" : "Choose a photo"}
          <input ref={file} type="file" accept="image/*" disabled={busy} onChange={(event) => void pick(event.target.files?.[0])} />
        </label>
        {preview ? <button type="button" className="btn-secondary" onClick={clear}>Remove photo</button> : null}
      </div>
      <input ref={data} type="hidden" name="image_data" />
      {preview ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected photo preview" />
          <label className="ui-field">
            <span className="label">{altLabel}</span>
            <input className="input" name="image_alt" maxLength={300} placeholder="e.g. Drummers outside the Oba's palace" />
          </label>
        </div>
      ) : null}
      {rightsNote ? <p className="ui-meta">{rightsNote}</p> : null}
      <p className="ui-meta" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
