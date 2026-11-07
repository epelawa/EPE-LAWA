import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { signOut } from "../actions";
export const metadata = { title: "Member account" };
export default async function CompletePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error: readError } = await supabase.from("profiles").select("user_id, handle, display_name, deleted_at").eq("user_id", user.id).maybeSingle();
  if (readError) return <section className="auth-wrap"><div className="auth-card"><h1>Account setup needs attention</h1><p>We couldn’t finish setting up your member profile. Please try again later.</p><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form></div></section>;
  if (!profile) {
    const rawHandle = typeof user.user_metadata?.handle === "string" ? user.user_metadata.handle.toLowerCase() : "";
    const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
    if (!/^[a-z0-9_]{3,24}$/.test(rawHandle) || !displayName || displayName.length > 60 || !user.email_confirmed_at) {
      return <section className="auth-wrap"><div className="auth-card"><h1>Verify your email to continue</h1><p>Your member profile is not active yet. Follow the verification link sent to your email, then sign in again.</p><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></div></section>;
    }
    const { error } = await supabase.from("profiles").insert({ user_id: user.id, handle: rawHandle, display_name: displayName });
    if (error) return <section className="auth-wrap"><div className="auth-card"><h1>Profile setup could not be completed</h1><p>We couldn’t create your member profile. Your handle may already be in use, or a required database setting may be missing.</p><p className="auth-footnote"><Link href="/auth">Try account setup again</Link></p></div></section>;
  }
  if (profile?.deleted_at) redirect("/login");
  return <section className="auth-wrap"><div className="auth-card"><p className="auth-eyebrow">MEMBER ACCOUNT</p><h1>You’re signed in</h1><p>Welcome, {profile?.display_name ?? "member"}. Your member session is active.</p><form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form><p className="auth-footnote"><Link href="/">Explore EPE LAWA</Link></p></div></section>;
}
