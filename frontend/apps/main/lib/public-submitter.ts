import "server-only";
import { createClient } from "./supabase";
import { formAdminClient } from "./form-server";

/**
 * Who is sending a public submission (business, event, Ìtàn Ilú Mi, tourism…).
 *
 * Public forms accept submissions signed in or signed out. When the visitor is a
 * signed-in, email-verified member with an active profile, the row is linked to
 * that member. Everyone else — signed-out visitors and staff accounts, which have
 * no member profile — gives a name and email so reviewers can reply. Banned
 * members are refused.
 */
export type PublicSubmitter = {
  /** auth.users id when signed in with a verified email (any account type). */
  userId: string | null;
  /** profiles.user_id when the account has an active member profile. */
  memberId: string | null;
  /** Contact used for acknowledgement mail and stored on guest rows. */
  name: string | null;
  email: string | null;
  /** True when the row must carry submitter_name/submitter_email. */
  guest: boolean;
};

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const text = (f: FormData, key: string) => {
  const value = f.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export type SubmitterResult = { ok: true; submitter: PublicSubmitter } | { ok: false; message: string };

export function validateGuestContact(name: string, email: string): string | null {
  if (name.length < 2 || name.length > 100) return "Enter your name (2–100 characters) so our team can reply.";
  if (!email || email.length > 254 || !EMAIL_RX.test(email)) return "Enter a valid email address so our team can reply.";
  return null;
}

export async function resolvePublicSubmitter(f: FormData): Promise<SubmitterResult> {
  let user: { id: string; email?: string | null; email_confirmed_at?: string | null } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch {
    user = null;
  }

  const formName = text(f, "submitter_name");
  const formEmail = text(f, "submitter_email").toLowerCase();

  if (user && user.email_confirmed_at) {
    let memberId: string | null = null;
    let displayName: string | null = null;
    try {
      const db = formAdminClient();
      const [profile, ban] = await Promise.all([
        db.from("profiles").select("user_id,display_name").eq("user_id", user.id).is("deleted_at", null).maybeSingle(),
        db.from("member_bans").select("user_id,expires_at").eq("user_id", user.id).is("revoked_at", null).limit(5),
      ]);
      const now = Date.now();
      if ((ban.data ?? []).some((row: { expires_at: string | null }) => !row.expires_at || Date.parse(row.expires_at) > now)) {
        return { ok: false, message: "Your account cannot submit community content right now. Contact support if you think this is a mistake." };
      }
      if (profile.data) {
        memberId = profile.data.user_id as string;
        displayName = (profile.data.display_name as string | null) ?? null;
      }
    } catch {
      return { ok: false, message: "Submissions are temporarily unavailable. Nothing was saved — please try again shortly." };
    }
    if (memberId) {
      return { ok: true, submitter: { userId: user.id, memberId, name: displayName, email: user.email ?? null, guest: false } };
    }
    // Signed in without a member profile (for example a staff account): use the
    // account email and the name typed in the form, or the email's local part.
    const email = (user.email ?? formEmail).toLowerCase();
    const name = formName || (email.split("@")[0] ?? "").slice(0, 100);
    const problem = validateGuestContact(name.length >= 2 ? name : "Staff", email);
    if (problem) return { ok: false, message: problem };
    return { ok: true, submitter: { userId: user.id, memberId: null, name: name.length >= 2 ? name : "Staff", email, guest: true } };
  }

  const problem = validateGuestContact(formName, formEmail);
  if (problem) return { ok: false, message: problem };
  return { ok: true, submitter: { userId: null, memberId: null, name: formName, email: formEmail, guest: true } };
}

/** Lightweight read used by pages to decide whether to show name/email fields. */
export async function currentSubmitterHint(): Promise<{ signedIn: boolean; email: string | null }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return { signedIn: Boolean(data.user), email: data.user?.email ?? null };
  } catch {
    return { signedIn: false, email: null };
  }
}

export function randomSlugSuffix(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function slugifyTitle(value: string, fallback: string): string {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return `${base || fallback}-${randomSlugSuffix()}`;
}
