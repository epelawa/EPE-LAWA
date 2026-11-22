"use server";

import { revalidatePath } from "next/cache";
import { createStaffClient } from "../../../lib/supabase";
import { sendWeeklyDigest, type DigestSendResult } from "../../../../main/lib/digest-mailer";

export type DigestSendState = { status: "idle" | "ok" | "error"; message: string };

function resultMessage(result: DigestSendResult): DigestSendState {
  switch (result.state) {
    case "ok":
    {
      if (result.recipients === 0) return { status: "ok", message: "The digest was generated, but no active newsletter subscribers exist yet — nothing was sent." };
      if (result.failedCount === 0) return { status: "ok", message: `The digest was sent to ${result.sent} ${result.sent === 1 ? "subscriber" : "subscribers"}.` };
      return { status: "error", message: `The digest reached ${result.sent} ${result.sent === 1 ? "subscriber" : "subscribers"}; ${result.failedCount} could not be delivered. Check the SMTP configuration and try again for any missing address.` };
    }
    case "too_many":
      return { status: "error", message: `There are ${result.recipients} active subscribers, above the ${result.max} this form sends in one request. Send in batches or raise the cap deliberately.` };
    case "not_configured":
      return { status: "error", message: "Newsletter SMTP is not configured for this environment (NEWSLETTER_SMTP_* and NEWSLETTER_FROM). Nothing was sent — the copyable digest above is unchanged." };
    default:
      return { status: "error", message: "The digest send could not start: the snapshot or subscriber list is unavailable right now. Nothing was sent." };
  }
}

export async function sendDigestNow(_previous: DigestSendState = { status: "idle", message: "" }, _data: FormData): Promise<DigestSendState> {
  const db = await createStaffClient();
  try {
    const { data: allowed } = await db.rpc("has_capability", { p_capability: "article.publish" });
    if (allowed !== true) return { status: "error", message: "The article.publish capability is required to send digests." };
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = configuredOrigin && /^https:\/\//.test(configuredOrigin) ? configuredOrigin.replace(/\/$/, "") : "https://epelawa.com";
    const result = await sendWeeklyDigest(origin);
    revalidatePath("/admin/digest");
    return resultMessage(result);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: "The digest send failed unexpectedly. Nothing may have been sent; check the state of each subscriber before retrying." };
  }
}
