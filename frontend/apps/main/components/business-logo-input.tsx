"use client";

import { useRef, useState } from "react";
import styles from "./business-logo-input.module.css";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}

export default function BusinessLogoInput({ label = "Business logo (optional)" }: { label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | null | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
      setMessage("Logos must be a JPEG, PNG or WebP image smaller than 5 MB.");
      setPreview(null);
      if (hiddenRef.current) hiddenRef.current.value = "";
      return;
    }
    setMessage("Preparing logo…");
    try {
      const dataUrl = await compress(file);
      if (hiddenRef.current) hiddenRef.current.value = dataUrl;
      setPreview(dataUrl);
      setMessage("Logo ready. It is stored once your listing is submitted.");
    } catch {
      setMessage("This logo could not be prepared. You can paste a logo link instead.");
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
      <label className="label">{label}<input type="file" accept={ACCEPTED.join(",")} className="input" onChange={(event) => void onPick(event.target.files?.[0])} /></label>
      <input ref={hiddenRef} type="hidden" name="logo_data" />
      {preview ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Business logo preview" width={56} height={56} />
          <button type="button" className="btn-ghost" onClick={clear}>Remove logo</button>
        </div>
      ) : null}
      {message ? <p className="ui-meta">{message}</p> : <p className="ui-meta">Or paste a logo link below — the image is compressed in your browser before upload.</p>}
    </div>
  );
}
