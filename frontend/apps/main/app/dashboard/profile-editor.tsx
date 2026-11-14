"use client";

import { useActionState } from "react";
import { updateMemberProfile, type MemberProfileState } from "./actions";
import styles from "./dashboard.module.css";

const initialState: MemberProfileState = { status: "idle", message: "" };

export default function ProfileEditor({ displayName, handle }: { displayName: string; handle: string }) {
  const [state, action, pending] = useActionState(updateMemberProfile, initialState);
  return (
    <form className={styles.profileForm} action={action} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="profile-display-name">Display name</label>
        <input id="profile-display-name" name="displayName" type="text" autoComplete="name" defaultValue={displayName} maxLength={60} required aria-describedby="profile-name-help" />
        <small id="profile-name-help">This name is visible on your public profile.</small>
      </div>
      <div className={styles.field}>
        <label htmlFor="profile-handle">Handle</label>
        <div className={styles.handleField}><span aria-hidden="true">@</span><input id="profile-handle" name="handle" type="text" autoComplete="username" defaultValue={handle} minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" required aria-describedby="profile-handle-help" /></div>
        <small id="profile-handle-help">3–24 letters, numbers or underscores. Your handle is public.</small>
      </div>
      {state.status !== "idle" ? <p className={state.status === "error" ? styles.error : styles.success} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
