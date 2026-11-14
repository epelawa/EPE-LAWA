import Link from "next/link";
import { redirect } from "next/navigation";
import AccountShell from "../../../components/account-shell";
import { createClient } from "../../../lib/supabase";
import { signOut } from "../actions";
export const metadata = { title: "Member account" };
async function readMemberSession() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
  } catch { return null; }
}
export default async function CompletePage() {
  const session = await readMemberSession();
  if (!session) return <AccountShell eyebrow="Member account" title="Accounts are temporarily unavailable" description="We couldn’t load the member service. Please try again later."><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></AccountShell>;
  const { supabase, user } = session;
  if (!user) redirect("/login");
  if (!user.email_confirmed_at) return <AccountShell eyebrow="One more step" title="Verify your email to continue" description="Your member account is not verified yet. Enter the one-time code from your EPE LAWA email to continue."><p className="auth-footnote"><Link href="/auth/verify">Enter your verification code</Link></p></AccountShell>;

  const { data: profile, error: readError } = await supabase.from("profiles").select("user_id, handle, display_name, deleted_at").eq("user_id", user.id).maybeSingle();
  if (readError) return <AccountShell eyebrow="Member account" title="Account setup needs attention" description="We couldn’t finish setting up your member profile. Please try again later."><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form></AccountShell>;
  if (profile?.deleted_at) redirect("/login");

  if (!profile) {
    const rawHandle = typeof user.user_metadata?.handle === "string" ? user.user_metadata.handle.toLowerCase() : "";
    const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
    if (!/^[a-z0-9_]{3,24}$/.test(rawHandle) || !displayName || displayName.length > 60) {
      return <AccountShell eyebrow="One more step" title="Profile setup needs attention" description="We couldn’t verify the profile details attached to this signup. Please sign in again or contact the EPE LAWA team."><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></AccountShell>;
    }
    const { error } = await supabase.from("profiles").insert({ user_id: user.id, handle: rawHandle, display_name: displayName });
    if (error) return <AccountShell eyebrow="Member account" title="Profile setup could not be completed" description="We couldn’t create your member profile. Your handle may already be in use, or a required database setting may be missing."><p className="auth-footnote"><Link href="/auth">Try account setup again</Link></p></AccountShell>;
  }

  redirect("/dashboard");
}
