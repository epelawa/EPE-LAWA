import Link from "next/link";
import { redirect } from "next/navigation";
import AccountShell from "../../../components/account-shell";
import { createClient } from "../../../lib/supabase";
import { signOut, checkHandleAvailability } from "../actions";
import { isValidHandle, normalizeHandle } from "../../../lib/member-handle";
import HandleCompletionForm from "./handle-completion-form";
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
  if (!user.email_confirmed_at) return <AccountShell eyebrow="One more step" title="Verify your email to continue" description="Your member profile is not active yet. Follow the verification link sent to your email, then sign in again."><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></AccountShell>;
  let { data: profile, error: readError } = await supabase.from("profiles").select("user_id, handle, display_name, deleted_at").eq("user_id", user.id).maybeSingle();
  if (readError) return <AccountShell eyebrow="Member account" title="Account setup needs attention" description="The member profile service is not ready. Your sign-in was verified, but account setup is incomplete. Please try again later or contact support."><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form></AccountShell>;
  if (!profile) {
    const { data: created, error } = await supabase.rpc("bootstrap_verified_member_profile");
    if (error || created !== true) {
      const rawHandle = typeof user.user_metadata?.handle === "string" ? normalizeHandle(user.user_metadata.handle) : "";
      const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
      const correctableName = displayName.length >= 1 && displayName.length <= 60;
      const knownBadHandle = !isValidHandle(rawHandle);
      const availability = !error && isValidHandle(rawHandle) ? await checkHandleAvailability(rawHandle) : "unavailable";
      if (!error && correctableName && (knownBadHandle || availability === "taken")) {
        const handleNote = availability === "taken" ? "Your current handle is reserved or already in use. Choose another available handle to continue." : undefined;
        return <AccountShell eyebrow="Member account" title="Finish your member profile" description="Choose an available public username."><HandleCompletionForm initialHandle={rawHandle} note={handleNote} /><p className="auth-footnote"><Link href="/">Explore EPE LAWA</Link></p></AccountShell>;
      }
      return <AccountShell eyebrow="Member account" title="Profile setup needs attention" description="Your verified sign-in could not complete profile setup. No member profile was created; please try again later or contact support."><p className="auth-footnote"><Link href="/auth">Try account setup again</Link></p><form action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form></AccountShell>;
    }
    const refreshed = await supabase.from("profiles").select("user_id, handle, display_name, deleted_at").eq("user_id", user.id).maybeSingle();
    profile = refreshed.data;
    readError = refreshed.error;
    if (readError || !profile) return <AccountShell eyebrow="Member account" title="Profile setup needs attention" description="Your profile creation could not be confirmed. Please try again later; you are not yet signed in to member spaces."><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form></AccountShell>;
  }
  if (profile?.deleted_at) redirect("/login");
  return <AccountShell eyebrow="Member account" title="You’re signed in" description={`Welcome, ${profile?.display_name ?? "member"}. Your member session is active.`}><div className="ui-stack" style={{marginTop:24}}><Link className="btn-primary" href="/dashboard">Open your member dashboard</Link><Link className="btn-secondary" href="/forum">Visit the community forum</Link><Link className="btn-secondary" href="/business-directory/orders">Your order requests</Link></div><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form><p className="auth-footnote"><Link href="/">Explore EPE LAWA</Link></p></AccountShell>;
}
