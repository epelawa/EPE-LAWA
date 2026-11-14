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
  const { data: profile, error: readError } = await supabase.from("profiles").select("user_id, handle, display_name, deleted_at").eq("user_id", user.id).maybeSingle();
  if (readError) return <AccountShell eyebrow="Member account" title="Account setup needs attention" description="We couldn’t finish setting up your member profile. Please try again later."><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form></AccountShell>;
  if (!profile) {
    const rawHandle = typeof user.user_metadata?.handle === "string" ? user.user_metadata.handle.toLowerCase() : "";
    const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
    if (!/^[a-z0-9_]{3,24}$/.test(rawHandle) || !displayName || displayName.length > 60 || !user.email_confirmed_at) {
      return <AccountShell eyebrow="One more step" title="Verify your email to continue" description="Your member profile is not active yet. Follow the verification link sent to your email, then sign in again."><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></AccountShell>;
    }
    const { error } = await supabase.from("profiles").insert({ user_id: user.id, handle: rawHandle, display_name: displayName });
    if (error) return <AccountShell eyebrow="Member account" title="Profile setup could not be completed" description="We couldn’t create your member profile. Your handle may already be in use, or a required database setting may be missing."><p className="auth-footnote"><Link href="/auth">Try account setup again</Link></p></AccountShell>;
  }
  if (profile?.deleted_at) redirect("/login");
  return <AccountShell eyebrow="Member account" title="You’re signed in" description={`Welcome, ${profile?.display_name ?? "member"}. Your member session is active.`}><div className="ui-stack" style={{marginTop:24}}><Link className="btn-primary" href="/dashboard">Open your member dashboard</Link><Link className="btn-secondary" href="/forum">Visit the community forum</Link><Link className="btn-secondary" href="/business-directory/orders">Your order requests</Link></div><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form><p className="auth-footnote"><Link href="/">Explore EPE LAWA</Link></p></AccountShell>;
}
