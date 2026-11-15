import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { signOut } from "../auth/actions";
import ProfileEditor from "./profile-editor";
import { DashboardDiscoverNews, DashboardHomeNews, safePage } from "./news-content";
import styles from "./dashboard.module.css";
import { BookmarkIcon, CompassIcon, HomeIcon, UserIcon } from "../../components/icons";
import MobileBottomNav from "../../components/mobile-bottom-nav";

export const metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type DashboardTab = "home" | "discover" | "saved" | "profile";
type DashboardSearchParams = { tab?: string; q?: string | string[]; category?: string | string[]; page?: string | string[] };

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

function DashboardSaved() {
  return <section className={`${styles.panel} ${styles.emptyState}`} aria-labelledby="saved-title">
    <p className={styles.eyebrow}>Saved</p>
    <h2 id="saved-title">Saving isn’t available yet</h2>
    <p className={styles.helper}>This account area does not currently provide saved-item storage, so no saved records are being queried or reported here.</p>
    <Link className="btn-secondary" href="/dashboard?tab=discover">Discover stories</Link>
  </section>;
}

export default async function MemberDashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const params = await searchParams;
  const activeTab: DashboardTab = params.tab === "discover" || params.tab === "saved" || params.tab === "profile" ? params.tab : "home";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const category = typeof params.category === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category) ? params.category : "";
  const page = safePage(typeof params.page === "string" ? params.page : undefined);
  let supabase: Awaited<ReturnType<typeof createClient>>;
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
  const showNewsFeed = activeTab === "home" || activeTab === "discover";

  return (
    <main className={`${styles.shell} member-dashboard-shell`}>
      <DashboardTabs active={activeTab} />
      {!showNewsFeed ? <header className={styles.hero}>
        <p className={styles.eyebrow}>Member dashboard</p>
        <h1>{activeTab === "saved" ? "Saved" : "Profile"}</h1>
        <p>{activeTab === "saved" ? "Saved-item storage is not available yet." : "Manage your public profile details."}</p>
      </header> : null}
      {activeTab === "home" ? <DashboardHomeNews client={supabase} />
        : activeTab === "discover" ? <DashboardDiscoverNews client={supabase} query={query} category={category} page={page} />
          : activeTab === "saved" ? <DashboardSaved /> : <div className={styles.grid}>
            <section className={styles.panel} aria-labelledby="profile-title">
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Your details</p><h2 id="profile-title">Public profile</h2></div><span className={styles.handle}>@{profile.handle}</span></div>
              <p className={styles.helper}>Your display name and handle appear beside your posts. Keep private contact details out of your public name.</p>
              <ProfileEditor displayName={profile.display_name} handle={profile.handle} />
            </section>
          </div>}
      <form className={styles.signOut} action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form>
      <MobileBottomNav />
    </main>
  );
}
