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
  if (readError) {
    const schemaUnavailable = /relation .*profiles.* does not exist|table .*profiles.* not found|schema cache/i.test(`${readError.message} ${readError.details ?? ""}`);
    return <AccountShell eyebrow="Member account" title={schemaUnavailable ? "Profile database setup required" : "Account setup needs attention"} description={schemaUnavailable ? "The member profile table is not available yet. The required database migration must be approved and applied before account setup can continue." : "We couldn’t finish setting up your member profile. Please try again later."}><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form></AccountShell>;
  }
  if (!profile) {
    if (!user.email_confirmed_at) {
      return <AccountShell eyebrow="One more step" title="Verify your email to continue" description="Your member profile is not active yet. Follow the verification link sent to your email, then sign in again."><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></AccountShell>;
    }
    const { data: bootstrapped, error } = await supabase.rpc("bootstrap_verified_member_profile");
    if (error || !bootstrapped) {
      const schemaUnavailable = !!error && /relation .*profiles.* does not exist|function .*bootstrap_verified_member_profile.* does not exist|schema cache/i.test(`${error.message} ${error.details ?? ""}`);
      return <AccountShell eyebrow="Member account" title={schemaUnavailable ? "Profile database setup required" : "Profile setup could not be completed"} description={schemaUnavailable ? "The member profile schema or bootstrap function is not available yet. The required database migrations must be approved and applied before account setup can continue." : "We couldn’t create your member profile. Your handle may already be in use, or a required database setting may be missing."}><p className="auth-footnote"><Link href="/auth">Try account setup again</Link></p></AccountShell>;
    }
  }
  if (profile?.deleted_at) redirect("/login");
  return <AccountShell eyebrow="Member account" title="You’re signed in" description={`Welcome, ${profile?.display_name ?? "member"}. Your member session is active.`}><div className="ui-stack" style={{marginTop:24}}><Link className="btn-primary" href="/dashboard">Open your member dashboard</Link><Link className="btn-secondary" href="/forum">Visit the community forum</Link><Link className="btn-secondary" href="/business-directory/orders">Your order requests</Link></div><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form><p className="auth-footnote"><Link href="/">Explore EPE LAWA</Link></p></AccountShell>;
}
