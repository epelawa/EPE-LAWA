"use server";

import { revalidatePath } from "next/cache";
import { formAdminClient, formRateAllowance, formRateMessage } from "../../lib/form-server";
import { humanCheckFailedMessage, verifyHumanCheck } from "../../lib/human-check";
import { resolvePublicSubmitter, slugifyTitle } from "../../lib/public-submitter";
import { storeSubmissionImage } from "../../lib/media-r2";
import { authMailConfig, deliverAuthMessage } from "../../lib/auth-mail-hook";
import { EVENT_CATEGORIES } from "./event-categories";

export type EventSubmitState = { status: "idle" | "error" | "success"; message: string; field?: string };

function partsToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00+01:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const fail = (message: string, field?: string): EventSubmitState => ({ status: "error", message, field });

/**
 * Public event submission. Works signed in or signed out: members are linked by
 * account, everyone else leaves a name and email. Rows land in `events` with
 * status `submitted`, which the staff Events review page reads — not the
 * general enquiries inbox.
 */
export async function submitEvent(_prev: EventSubmitState, form: FormData): Promise<EventSubmitState> {
  if (text(form, "website")) return { status: "success", message: "Your event was sent to the desk for review." };

  const title = text(form, "title");
  const description = text(form, "description");
  const venue = text(form, "venue");
  const category = text(form, "category");
  const dateInput = text(form, "date");
  const timeInput = text(form, "time") || "00:00";
  const endDateInput = text(form, "end_date") || dateInput;
  const endTime = text(form, "end_time");
  if (title.length < 3 || title.length > 200) return fail("Give the event a clear name (3–200 characters).", "title");
  if (description.length < 10 || description.length > 4000) return fail("Describe the event in 10–4000 characters.", "description");
  if (!EVENT_CATEGORIES.some(([value]) => value === category)) return fail("Choose a category for the event.", "category");
  if (venue.length < 2 || venue.length > 200) return fail("Name the venue or meeting point (2–200 characters).", "venue");
  const startsAt = partsToIso(dateInput, timeInput);
  if (!startsAt) return fail("Choose a valid date and start time (WAT).", "date");
  if (Date.parse(startsAt) < Date.now() - 24 * 60 * 60 * 1000) return fail("The event date must be today or later.", "date");
  let endsAt: string | null = null;
  if (endTime || endDateInput !== dateInput) {
    endsAt = partsToIso(endDateInput, endTime || "23:59");
    if (!endsAt) return fail("Choose a valid end date and time (WAT), or leave them empty.", "end_time");
    if (Date.parse(endsAt) <= Date.parse(startsAt)) return fail("The event must end after it starts.", "end_time");
    if (Date.parse(endsAt) - Date.parse(startsAt) > 30 * 24 * 60 * 60 * 1000) return fail("Events can run for up to 30 days. Submit longer programmes as separate events.", "end_time");
  }

  const who = await resolvePublicSubmitter(form);
  if (!who.ok) return fail(who.message, "submitter_email");
  const submitter = who.submitter;

  if ((await verifyHumanCheck(form)) === "fail") return fail(humanCheckFailedMessage);
  if (!(await formRateAllowance("event_submit"))) return fail(await formRateMessage());

  let db;
  try { db = formAdminClient(); } catch { return fail("Event submissions are temporarily unavailable. Nothing was saved — please try again shortly."); }

  const image = await storeSubmissionImage(form, "events", title);
  const { data, error } = await db.from("events").insert({
    slug: slugifyTitle(title, "event"),
    title,
    description,
    venue,
    category,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "submitted",
    submitter_id: submitter.userId,
    submitter_name: submitter.guest ? submitter.name : null,
    submitter_email: submitter.guest ? submitter.email : null,
    image_key: image.state === "stored" ? image.key : null,
    image_alt: image.state === "stored" ? image.alt : null,
  }).select("id").single();
  if (error || !data?.id) {
    console.error("event submission insert failed", { code: error?.code });
    return fail("Your event could not be saved. Check the details and try again — nothing was published.");
  }

  try {
    const config = authMailConfig(process.env);
    if (config.kind === "gmail") {
      await deliverAuthMessage({ to: config.user, subject: "New EPE LAWA event submission", text: "A community event is awaiting review on the Events page of the staff workspace.", html: "<p>A community event is awaiting review on the Events page of the staff workspace.</p>", idempotencyKey: `event-notice/${data.id}` }, config);
      if (submitter.email) {
        await deliverAuthMessage({ to: submitter.email, subject: "We received your event", text: "Thank you for sending your event to EPE LAWA. The desk reviews every submission before it appears on the community calendar.", html: "<p>Thank you for sending your event to EPE LAWA. The desk reviews every submission before it appears on the community calendar.</p>", idempotencyKey: `event-ack/${data.id}` }, config);
      }
    }
  } catch {
    console.error("event submission mail unavailable; check the review queue.");
  }
  try { revalidatePath("/events"); } catch { /* cache refresh is best effort */ }

  const base = "Your event was sent to the desk. Every submission is reviewed before it appears on the community calendar.";
  return { status: "success", message: image.state === "failed" ? `${base} ${image.message}` : base };
}
