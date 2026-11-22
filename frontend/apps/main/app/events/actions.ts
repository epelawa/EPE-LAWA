"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../lib/form-server";

export type EventSubmitState = { status: "idle" | "error" | "success"; message: string };

function partsToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00+01:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function submitEvent(_prev: EventSubmitState, form: FormData): Promise<EventSubmitState> {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Sign in with your member account to submit an event." };
  if (!user.email_confirmed_at) return { status: "error", message: "Verify your email address before submitting an event." };
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const venue = String(form.get("venue") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const dateInput = String(form.get("date") ?? "").trim();
  const timeInput = String(form.get("time") ?? "").trim() || "00:00";
  const endTime = String(form.get("end_time") ?? "").trim();
  if (title.length < 3 || title.length > 200) return { status: "error", message: "Give the event a clear name (3–200 characters)." };
  if (description.length < 10 || description.length > 4000) return { status: "error", message: "Describe the event in 10–4000 characters." };
  if (venue.length < 2 || venue.length > 200) return { status: "error", message: "Name the venue or meeting point (2–200 characters)." };
  if (!["festival", "community", "business", "civic", "culture", "faith", "sports"].includes(category)) {
    return { status: "error", message: "Choose a category for the event." };
  }
  const startsAt = partsToIso(dateInput, timeInput);
  if (!startsAt) return { status: "error", message: "Choose a valid date and start time (WAT)." };
  const endsAt = endTime ? partsToIso(dateInput, endTime) : null;
  if (endTime && !endsAt) return { status: "error", message: "Choose a valid end time (WAT), or leave it empty." };
  if (!(await formRateAllowance("event_submit"))) {
    return { status: "error", message: formRateLimitedMessage };
  }
  const { data, error } = await db.rpc("member_event_submit", {
    p_title: title, p_description: description, p_venue: venue, p_category: category, p_starts_at: startsAt, p_ends_at: endsAt,
  });
  if (error) {
    const reason = error.message;
    const text = reason === "event_window_invalid"
      ? "The event date must be from today onwards, and the end time must be within 30 days of the start."
      : "The event could not be submitted right now. Please try again.";
    return { status: "error", message: text };
  }
  revalidatePath("/events");
  return {
    status: "success",
    message: typeof data === "string" && data
      ? "Your event was submitted. The desk reviews every submission before it appears on the community calendar."
      : "Your event was submitted for review.",
  };
}
