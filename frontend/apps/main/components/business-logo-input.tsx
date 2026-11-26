"use client";

import { useRef, useState } from "react";
import BrandedDialog from "./branded-dialog";
import styles from "./business-logo-input.module.css";
import { imageErrorMessage, prepareImage } from "../lib/client-image";

export default function BusinessLogoInput({ label = "Business logo (optional)" }: { label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | null | undefined) {
    if (!file) return;
    setMessage("Preparing logo…");
    try {
      const dataUrl = await prepareImage(file, 512, 300 * 1024);
      if (hiddenRef.current) hiddenRef.current.value = dataUrl;
      setPreview(dataUrl);
      setMessage("Logo ready. It is stored once the form is submitted.");
    } catch (error) {
      setMessage(`${imageErrorMessage(error, "logo")} You can paste a logo link instead.`);
      if (hiddenRef.current) hiddenRef.current.value = "";
      setPreview(null);
    }
  }

  function clear() {
    if (hiddenRef.current) hiddenRef.current.value = "";
    setPreview(null);
    setMessage(null);
  }

  return (
    <div className={styles.field}>
      <div className="ui-field">
        <span className="ui-row">
          <button type="button" className="btn-secondary" aria-haspopup="dialog" onClick={() => setOpen(true)}>{label}</button>
          {preview ? <span className="ui-meta" role="status">Logo ready</span> : <span className="ui-meta" role="status">No logo selected</span>}
        </span>
      </div>
      <BrandedDialog open={open} onClose={() => setOpen(false)} title={label} description="Choose an image from this device. It is compressed in your browser before it is stored with your listing.">
        <div className={styles.pickerStack}>
          <label className="btn-secondary">
            Browse files
            <input type="file" accept="image/*" data-autofocus onChange={(event) => { setOpen(false); void onPick(event.target.files?.[0]); }} />
          </label>
          <p className="ui-meta">JPEG, PNG, WebP or a phone photo up to 25 MB. It is resized in your browser first.</p>
        </div>
      </BrandedDialog>
      <input ref={hiddenRef} type="hidden" name="logo_data" />
      {preview ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Business logo preview" width={56} height={56} />
          <button type="button" className="btn-secondary" onClick={clear}>Remove logo</button>
        </div>
      ) : null}
      {message ? <p className="ui-meta">{message}</p> : null}
    </div>
  );
}
