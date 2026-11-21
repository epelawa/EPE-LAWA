"use client";

import { useState } from "react";
import BrandedDialog from "./branded-dialog";
import styles from "./upload-modal-field.module.css";

export default function UploadModalField({
  name,
  label,
  accept,
  hint,
  description,
  required = false,
}: {
  name: string;
  label: string;
  accept: string;
  hint: string;
  description?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div className="ui-field">
      <span className={styles.triggerRow}>
        <button type="button" className="btn-secondary" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {label}
        </button>
        <span className={styles.choice} role="status">{fileName ? `Selected: ${fileName}` : "No file selected"}</span>
      </span>
      <BrandedDialog open={open} onClose={() => setOpen(false)} title={label} description={description}>
        <div className={styles.pickerStack}>
          <label className={styles.dropzone}>
            <input type="file" name={name} accept={accept} required={required} onChange={(event) => {
              const file = event.target.files?.[0];
              setFileName(file?.name ?? null);
              if (file) setOpen(false);
            }} data-autofocus />
            <span>Browse files</span>
          </label>
          <p className="ui-meta">{hint}</p>
        </div>
      </BrandedDialog>
    </div>
  );
}
