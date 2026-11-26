"use client";

import { useActionState, useRef, useState } from "react";
import BrandedDialog from "../../components/branded-dialog";
import { updateMemberAvatar, type MemberProfileState } from "./actions";
import styles from "./dashboard.module.css";
import { imageErrorMessage, prepareImage } from "../../lib/client-image";

const initialState: MemberProfileState = { status: "idle", message: "" };
/**
 * Avatar picker as a branded popup modal. The compressed image ships with the
 * form as a data URL and is stored server-side; nothing is uploaded directly.
 */
export default function AvatarEditor({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string }) {
  const [state, action, pending] = useActionState(updateMemberAvatar, initialState);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickError, setPickError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setPreview(await prepareImage(file, 256, 200 * 1024));
      setPickError("");
    } catch (error) {
      setPreview(null);
      setPickError(imageErrorMessage(error, "photo"));
    }
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
        description="Choose a JPEG, PNG or WebP photo. It is resized to 256 px, then optimized before it reaches R2."
      >
        <form action={action} className="ui-stack-sm">
          <button className="btn-secondary" type="button" onClick={() => inputRef.current?.click()}>
            {preview ? "Choose a different image" : "Choose image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void pick(event.target.files?.[0])}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clipPath: "inset(50%)" }}
            aria-label="Profile photo file"
          />
          {preview ? <input type="hidden" name="avatar_data" value={preview} /> : null}
          {pickError ? <p className={styles.error} role="alert">{pickError}</p> : null}
          {preview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Profile photo preview" width={120} height={120} style={{ borderRadius: 9999 }} /> : null}
          <div className="ui-actions">
            <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={pending || !preview}>{pending ? "Saving…" : "Save photo"}</button>
          </div>
        </form>
      </BrandedDialog>
    </div>
  );
}
