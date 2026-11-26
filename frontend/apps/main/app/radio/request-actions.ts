"use server";

import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateMessage } from "../../lib/form-server";

export type SongRequestState = { status: "idle" | "error" | "success"; message: string };

export async function requestSong(_prev: SongRequestState, form: FormData): Promise<SongRequestState> {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Sign in with your member account to request a song." };
  if (!user.email_confirmed_at) return { status: "error", message: "Verify your email address before sending a song request." };
  const song = String(form.get("song") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const programmeId = String(form.get("programme_id") ?? "").trim();
  if (song.length < 2 || song.length > 200) return { status: "error", message: "Name the song in 2–200 characters." };
  if (note && (note.length < 2 || note.length > 500)) return { status: "error", message: "Keep the note between 2 and 500 characters." };
  if (programmeId && !/^[0-9a-f-]{36}$/i.test(programmeId)) return { status: "error", message: "Choose a programme from the list." };
  if (!(await formRateAllowance("song_request", 8))) {
    return { status: "error", message: formRateMessage() };
  }
  const { error } = await db.rpc("member_request_song", {
    p_song: song, p_note: note || null, p_programme_id: programmeId || null,
  });
  if (error) {
    const reason = error.message;
    const text = reason === "request_programme_unknown"
      ? "That programme was not found; refresh the page and pick again."
      : "The request could not be sent right now. Please try again.";
    return { status: "error", message: text };
  }
  return {
    status: "success",
    message: "Request received. The radio desk decides what plays on air — this desk cannot promise a slot.",
  };
}
