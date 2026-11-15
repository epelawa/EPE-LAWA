import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { signOut } from "../auth/actions";
import ProfileEditor from "./profile-editor";
import styles from "./dashboard.module.css";
import { BookmarkIcon, CompassIcon, HomeIcon, UserIcon } from "../../components/icons";

export const metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type DashboardTab = "home" | "discover" | "saved" | "profile";

const dashboardTabs = [
  { key: "home" as const, href: "/dashboard?tab=home", label: "Home", Icon: HomeIcon },
  { key: "discover" as const, href: "/dashboard?tab=discover", label: "Discover", Icon: CompassIcon },
  { key: "saved" as const, href: "/dashboard?tab=saved", label: "Saved", Icon: BookmarkIcon },
  { key: "profile" as const, href: "/dashboard?tab=profile", label: "Profile", Icon: UserIcon },
];

function DashboardTabs({ active }: { active: DashboardTab }) {
  return <nav className={styles.tabs} aria-label="Member dashboard">
    {dashboardTabs.map(({ key, href, label, Icon }) => <Link key={key} className={styles.tab} href={href} aria-current={active === key ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>)}
  </nav>;
}

function MemberSpaces() {
  return <nav className={styles.links} aria-label="Member spaces">
    <Link href="/forum">Visit the community forum <span aria-hidden="true">→</span></Link>
    <Link href="/forum/new">Start a discussion <span aria-hidden="true">→</span></Link>
    <Link href="/business-directory/submit">Submit a business listing <span aria-hidden="true">→</span></Link>
    <Link href="/business-directory/orders">View order requests <span aria-hidden="true">→</span></Link>
    <Link href="/itan-ilu-mi">Explore Epe history <span aria-hidden="true">→</span></Link>
  </nav>;
}

function DashboardHome() {
  return <div className={styles.grid}>
    <section className={styles.panel} aria-labelledby="home-title">
      <p className={styles.eyebrow}>Home</p>
      <h2 id="home-title">Your community spaces</h2>
      <p className={styles.helper}>Pick up where you left off in the member areas available to your account.</p>
      <MemberSpaces />
    </section>
    <aside className={styles.panel} aria-labelledby="home-note-title">
      <p className={styles.eyebrow}>Member account</p>
      <h2 id="home-note-title">Keep participating</h2>
      <p className={styles.helper}>Your profile helps identify your contributions across EPE LAWA. Use Profile to update your public details.</p>
    </aside>
  </div>;
}

function DashboardDiscover() {
  return <div className={styles.grid}>
    <section className={styles.panel} aria-labelledby="discover-title">
      <p className={styles.eyebrow}>Discover</p>
      <h2 id="discover-title">Explore Epe on EPE LAWA</h2>
      <p className={styles.helper}>Browse the community spaces and public areas connected to your member account.</p>
      <nav className={styles.links} aria-label="Discovery spaces">
        <Link href="/tourism">Historical sites and tourism <span aria-hidden="true">→</span></Link>
        <Link href="/map">Map and navigation <span aria-hidden="true">→</span></Link>
        <Link href="/business-directory">Business directory and marketplace <span aria-hidden="true">→</span></Link>
        <Link href="/radio">EPE LAWA Radio <span aria-hidden="true">→</span></Link>
      </nav>
    </section>
    <aside className={styles.panel} aria-labelledby="discover-member-title">
      <p className={styles.eyebrow}>Member spaces</p>
      <h2 id="discover-member-title">Join the conversation</h2>
      <MemberSpaces />
    </aside>
  </div>;
}

function DashboardSaved() {
  return <section className={`${styles.panel} ${styles.emptyState}`} aria-labelledby="saved-title">
    <p className={styles.eyebrow}>Saved</p>
    <h2 id="saved-title">Saving isn’t available yet</h2>
    <p className={styles.helper}>This account area does not currently provide saved-item storage, so no saved records are being queried or reported here.</p>
    <Link className="btn-secondary" href="/dashboard?tab=discover">Discover Epe</Link>
  </section>;
}

export default async function MemberDashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const requestedTab = (await searchParams).tab;
  const activeTab: DashboardTab = requestedTab === "discover" || requestedTab === "saved" || requestedTab === "profile" ? requestedTab : "home";
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
      <DashboardTabs active={activeTab} />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Member dashboard</p>
        <h1>Welcome, {profile.display_name}.</h1>
        <p>Manage your public profile and return to your Epe community spaces.</p>
      </header>
      {activeTab === "home" ? <DashboardHome /> : activeTab === "discover" ? <DashboardDiscover /> : activeTab === "saved" ? <DashboardSaved /> : <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="profile-title">
          <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Your details</p><h2 id="profile-title">Public profile</h2></div><span className={styles.handle}>@{profile.handle}</span></div>
          <p className={styles.helper}>Your display name and handle appear beside your posts. Keep private contact details out of your public name.</p>
          <ProfileEditor displayName={profile.display_name} handle={profile.handle} />
        </section>
      </div>}
      <form className={styles.signOut} action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form>
    </main>
  );
}
