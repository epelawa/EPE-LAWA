import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { signOut } from "../auth/actions";
import ProfileEditor from "./profile-editor";
import styles from "./dashboard.module.css";

export const metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function MemberDashboardPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return <main className={`${styles.shell} member-dashboard-shell`}><section className={styles.unavailable}><p className={styles.eyebrow}>Member dashboard</p><h1>Account service unavailable</h1><p>We couldn’t connect to your member account. Please try again later.</p><Link className="btn-secondary" href="/">Back to EPE LAWA</Link></section></main>;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fdashboard");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, handle, display_name, deleted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return <main className={`${styles.shell} member-dashboard-shell`}><section className={styles.unavailable}><p className={styles.eyebrow}>Member dashboard</p><h1>Profile unavailable</h1><p>We couldn’t load your member profile. Your account is still protected; try again later.</p><form action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form></section></main>;
  }
  if (!profile) redirect("/auth/complete");
  if (profile.deleted_at) redirect("/login");

  return (
    <main className={`${styles.shell} member-dashboard-shell`}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Member dashboard</p>
        <h1>Welcome, {profile.display_name}.</h1>
        <p>Manage your public profile and return to your Epe community spaces.</p>
      </header>
      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="profile-title">
          <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Your details</p><h2 id="profile-title">Public profile</h2></div><span className={styles.handle}>@{profile.handle}</span></div>
          <p className={styles.helper}>Your display name and handle appear beside your posts. Keep private contact details out of your public name.</p>
          <ProfileEditor displayName={profile.display_name} handle={profile.handle} />
        </section>
        <aside className={styles.panel} aria-labelledby="spaces-title">
          <p className={styles.eyebrow}>Your community</p>
          <h2 id="spaces-title">Member spaces</h2>
          <nav className={styles.links} aria-label="Member spaces">
            <Link href="/forum">Visit the community forum <span aria-hidden="true">→</span></Link>
            <Link href="/forum/new">Start a discussion <span aria-hidden="true">→</span></Link>
            <Link href="/business-directory/submit">Submit a business listing <span aria-hidden="true">→</span></Link>
            <Link href="/business-directory/orders">View order requests <span aria-hidden="true">→</span></Link>
            <Link href="/itan-ilu-mi">Explore Epe history <span aria-hidden="true">→</span></Link>
          </nav>
          <form className={styles.signOut} action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form>
        </aside>
      </div>
    </main>
  );
}
