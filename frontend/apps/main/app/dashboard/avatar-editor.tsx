"use client";

import { useActionState, useRef, useState } from "react";
import BrandedDialog from "../../components/branded-dialog";
import { updateMemberAvatar, type MemberProfileState } from "./actions";
import styles from "./dashboard.module.css";

const initialState: MemberProfileState = { status: "idle", message: "" };
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 256;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}

/**
 * Avatar picker as a branded popup modal. The compressed image ships with the
 * form as a data URL and is stored server-side; nothing is uploaded directly.
 */
export default function AvatarEditor({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string }) {
  const [state, action, pending] = useActionState(updateMemberAvatar, initialState);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
      setPreview(null);
      return;
    }
    try { setPreview(await compress(file)); } catch { setPreview(null); }
  };

  const current = preview ?? avatarUrl;

  return (
    <div className={styles.profileIdentity}>
      <span className={styles.profileAvatar} aria-hidden="true">
        {current ? <img src={current} alt="" width={56} height={56} style={{ borderRadius: "inherit" }} /> : displayName.trim().slice(0, 1).toUpperCase()}
      </span>
      <div className="ui-stack-sm">
        <h2>Profile photo</h2>
        <button className="btn-secondary" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {avatarUrl ? "Change photo" : "Add profile photo"}
        </button>
        {state.status !== "idle" ? <p className={state.status === "error" ? styles.error : styles.success} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      </div>
      <BrandedDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Profile photo"
        description="A square JPEG, PNG or WebP smaller than 5 MB works best."
      >
        <form action={action} className="ui-stack-sm">
          <button className="btn-secondary" type="button" onClick={() => inputRef.current?.click()}>
            {preview ? "Choose a different image" : "Choose image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            name="avatar_file"
            accept={ACCEPTED.join(",")}
            onChange={(event) => void pick(event.target.files?.[0])}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clipPath: "inset(50%)" }}
            aria-label="Profile photo file"
          />
          {preview ? <input type="hidden" name="avatar_data" value={preview} /> : null}
          {preview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Profile photo preview" width={120} height={120} style={{ borderRadius: 9999 }} /> : null}
          <div className="ui-actions">
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={pending || !preview}>{pending ? "Saving…" : "Save photo"}</button>
          </div>
        </form>
      </BrandedDialog>
    </div>
  );
}
