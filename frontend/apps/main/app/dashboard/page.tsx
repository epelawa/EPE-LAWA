import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountShell from "../../components/account-shell";
import { createClient } from "../../lib/supabase";
import { checkHandleAvailability, signOut } from "../auth/actions";
import { markNotificationsRead } from "./actions";
import { toggleSavedArticle } from "./saved-actions";
import MemberTopbar from "../../components/member-topbar";
import SessionGuard from "../../components/session-guard";
import ProfileEditor from "./profile-editor";
import HandleCompletionForm from "./handle-completion-form";
import { DashboardDiscoverNews, DashboardHomeNews, safePage } from "./news-content";
import { formatPublishedDate } from "../../lib/dates";
import styles from "./dashboard.module.css";
import "../auth/auth.css";
import {
  BellIcon,
  BookmarkIcon,
  CompassIcon,
  HomeIcon,
  UserIcon,
} from "../../components/icons";
import { ACTIVITY_COOKIE, MEMBER_INACTIVITY_MS, isInactiveSince } from "../../lib/session-policy";
import { isValidHandle, normalizeHandle } from "../../lib/member-handle";
import {
  decideMemberEntry,
  type MemberEntryInput,
  type MemberProfileSnapshot,
} from "../../lib/member-entry";

export const metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type DashboardTab = "home" | "discover" | "saved" | "profile" | "notifications";
type DashboardSearchParams = { tab?: string; q?: string | string[]; category?: string | string[]; page?: string | string[] };
type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

const dashboardTabs = [
  { key: "home" as const, href: "/dashboard?tab=home", label: "Home", Icon: HomeIcon },
  { key: "discover" as const, href: "/dashboard?tab=discover", label: "Discover", Icon: CompassIcon },
  { key: "notifications" as const, href: "/dashboard?tab=notifications", label: "Notifications", Icon: BellIcon },
  { key: "saved" as const, href: "/dashboard?tab=saved", label: "Saved", Icon: BookmarkIcon },
  { key: "profile" as const, href: "/dashboard?tab=profile", label: "Profile", Icon: UserIcon },
];

const notificationKinds: Record<string, string> = {
  comment_reply: "Comment reply",
  forum_reply: "Forum reply",
  news_published: "Newsroom",
  radio_live: "Radio",
  order_status: "Order",
  moderation: "Moderation",
};

function DashboardTabs({ active }: { active: DashboardTab }) {
  return <nav className={styles.tabs} aria-label="Member dashboard">
    {dashboardTabs.map(({ key, href, label, Icon }) => <Link key={key} className={styles.tab} href={href} aria-current={active === key ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>)}
  </nav>;
}

type SavedStory = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  category_label: string | null;
};
type SavedResult = { state: "ok"; items: SavedStory[] } | { state: "error"; items: SavedStory[] };

async function loadSavedStories(): Promise<SavedResult> {
  try {
    const supabase = await createClient();
    const { data: savedRows, error } = await supabase
      .from("saved_articles")
      .select("article_id,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      console.error("saved_articles read failed", { code: error.code });
      return { state: "error", items: [] };
    }
    const ids = (savedRows ?? []).map((row) => (row as { article_id: string }).article_id).filter(Boolean);
    if (!ids.length) return { state: "ok", items: [] };
    const { data: stories, error: storyError } = await supabase
      .from("published_articles")
      .select("id,slug,title,summary,published_at,category_label")
      .in("id", ids);
    if (storyError) {
      console.error("saved_articles story read failed", { code: storyError.code });
      return { state: "error", items: [] };
    }
    const byId = new Map((stories ?? []).map((story) => [(story as SavedStory).id, story as SavedStory]));
    const items = ids.map((id) => byId.get(id)).filter((story): story is SavedStory => Boolean(story));
    return { state: "ok", items };
  } catch {
    console.error("saved_articles client unavailable", { reason: "configuration_or_provider" });
    return { state: "error", items: [] };
  }
}

async function DashboardSaved() {
  const { state, items } = await loadSavedStories();
  return <section className={styles.panel} aria-labelledby="saved-title">
    <div className={styles.panelHeading}>
      <div>
        <p className={styles.eyebrow}>Saved</p>
        <h1 id="saved-title">Your reading list</h1>
      </div>
      <span className={styles.handle}>{items.length} saved</span>
    </div>
    <p className={styles.helper}>Stories you save with the bookmark control on any published article are kept here for your account only.</p>
    {state === "error"
      ? <p className={styles.error} role="alert">Your saved stories could not be loaded right now. Nothing is being guessed or substituted.</p>
      : items.length === 0
        ? <div className={styles.savedEmpty}>
          <BookmarkIcon size={30} />
          <h2>Nothing saved yet</h2>
          <p className={styles.helper}>Open any published story and use the save control to add it to this list.</p>
          <Link className="btn-secondary" href="/dashboard?tab=discover">Discover stories</Link>
        </div>
        : <ul className={styles.savedGrid}>
          {items.map((story) => <li className={styles.savedItem} key={story.id}>
            <span className={styles.savedCopy}>
              {story.category_label ? <span className={styles.savedCategory}>{story.category_label}</span> : null}
              <Link className={styles.savedTitle} href={`/news/${story.slug}`}>{story.title}</Link>
              {story.published_at ? <span className={styles.savedMeta}>{formatPublishedDate(story.published_at) ?? ""}</span> : null}
            </span>
            <form action={toggleSavedArticle}>
              <input type="hidden" name="articleId" value={story.id} />
              <input type="hidden" name="slug" value={story.slug} />
              <input type="hidden" name="intent" value="remove" />
              <button className="btn-secondary" type="submit">Remove</button>
            </form>
          </li>)}
        </ul>}
  </section>;
}

function notificationStamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function DashboardNotifications({ notifications, error }: { notifications: NotificationRow[]; error: boolean }) {
  const unread = notifications.filter((row) => !row.read_at).length;
  return <section className={`${styles.panel} ${styles.notificationsPanel}`} aria-labelledby="notifications-title">
    <header className={styles.notificationsHeading}>
      <div>
        <p className={styles.eyebrow}>Notifications</p>
        <h1 id="notifications-title">Your notifications</h1>
        <p className={styles.helper}>Replies, moderation decisions and newsroom updates addressed to your member account.</p>
      </div>
      {unread > 0 ? <form action={markNotificationsRead}><button className="btn-secondary" type="submit">Mark all as read</button></form> : <span className={styles.handle}>All read</span>}
    </header>
    {error
      ? <p className={styles.error} role="alert">Notifications could not be loaded right now. Nothing is being guessed or substituted.</p>
      : notifications.length === 0
        ? <div className={styles.emptyNotifications}>
          <BellIcon size={30} />
          <h2>No notifications yet</h2>
          <p>When someone replies to your comment, a moderator records a decision or the newsroom publishes something you follow, it will appear here.</p>
          <Link className="btn-secondary" href="/dashboard?tab=discover">Browse published stories</Link>
        </div>
        : <ul className={styles.notificationList}>
          {notifications.map((row) => {
            const content = <>
              <span className={styles.notificationDot} data-unread={row.read_at ? undefined : "true"} aria-hidden="true" />
              <span className={styles.notificationCopy}>
                <span className={styles.notificationTitle}>{row.title}{row.read_at ? null : <span className="sr-only"> (unread)</span>}</span>
                <span className={styles.notificationBody}>{row.body}</span>
                <span className={styles.notificationMeta}>{notificationKinds[row.kind] ?? "Update"} · <time dateTime={row.created_at}>{notificationStamp(row.created_at)}</time></span>
              </span>
            </>;
            return <li key={row.id} className={styles.notificationItem} data-unread={row.read_at ? undefined : "true"}>
              {row.url ? <Link href={row.url}>{content}</Link> : content}
            </li>;
          })}
        </ul>}
  </section>;
}

function setupScreen({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <AccountShell eyebrow="Member dashboard" title={title} description={description}>
    {children}
    <form action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form>
  </AccountShell>;
}

export default async function MemberDashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  // Server-side inactivity gate: a stale activity stamp is refused even when
  // JavaScript was suspended before the client guard could sign out.
  if (isInactiveSince(cookieStore.get(ACTIVITY_COOKIE.member)?.value, MEMBER_INACTIVITY_MS)) redirect("/auth/signout?scope=member");
  const requestedTab = params.tab;
  const activeTab: DashboardTab = requestedTab === "discover" || requestedTab === "saved" || requestedTab === "profile" || requestedTab === "notifications" ? requestedTab : "home";
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
  if (!user.email_confirmed_at) {
    return setupScreen({
      title: "Verify your email to continue",
      description: "Your member profile is not active yet. Follow the verification link sent to your email, or enter the code from that message.",
      children: <p className="auth-footnote"><Link href="/auth/verify">Enter a verification code</Link></p>,
    });
  }

  const initialProfile = await supabase
    .from("profiles")
    .select("user_id, handle, display_name, deleted_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const error = initialProfile.error;
  let profile = initialProfile.data as MemberProfileSnapshot | null;

  if (error) {
    return <main className={`${styles.shell} member-dashboard-shell`}><section className={styles.unavailable}><p className={styles.eyebrow}>Member dashboard</p><h1>Profile unavailable</h1><p>We couldn’t load your member profile. Your account is still protected; try again later.</p><form action={signOut}><button className="btn-secondary" type="submit">Sign out</button></form></section></main>;
  }

  let bootstrap: MemberEntryInput["bootstrap"] = "not-needed";
  if (!profile) {
    const { data: created, error: bootstrapError } = await supabase.rpc("bootstrap_verified_member_profile");
    bootstrap = bootstrapError ? "unavailable" : created === true ? "created" : "failed";
    if (!bootstrapError && created === true) {
      const refreshed = await supabase
        .from("profiles")
        .select("user_id, handle, display_name, deleted_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (refreshed.error) bootstrap = "unavailable";
      else profile = refreshed.data as MemberProfileSnapshot | null;
    }
  }

  if (!profile) {
    const metadataHandle = typeof user.user_metadata?.handle === "string" ? normalizeHandle(user.user_metadata.handle) : "";
    const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
    const rawHandleValid = isValidHandle(metadataHandle);
    const availability = !error && rawHandleValid ? await checkHandleAvailability(metadataHandle) : "unavailable";
    const decision = decideMemberEntry({
      emailConfirmed: Boolean(user.email_confirmed_at),
      profile: null,
      bootstrap,
      displayName,
      rawHandle: metadataHandle,
      rawHandleValid,
      handleAvailability: availability,
    });

    if (decision.kind === "unverified") {
      return setupScreen({
        title: "Verify your email to continue",
        description: "Your member profile is not active yet. Follow the verification link sent to your email, or enter the code from that message.",
        children: <p className="auth-footnote"><Link href="/auth/verify">Enter a verification code</Link></p>,
      });
    }
    if (decision.kind === "deleted") redirect("/login");
    if (decision.kind === "needs-handle") {
      return setupScreen({
        title: "Finish your member profile",
        description: "Choose an available public username. Your verified account is the only thing being updated here.",
        children: <><HandleCompletionForm initialHandle={decision.initialHandle} note={decision.note} /><p className="auth-footnote"><Link href="/">Explore EPE LAWA</Link></p></>,
      });
    }
    return setupScreen({
      title: "Profile setup needs attention",
      description: "Your verified sign-in could not complete profile setup. No member profile was created. Try again, or contact support if this continues.",
      children: <p className="auth-footnote"><Link href="/dashboard">Try account setup again</Link></p>,
    });
  }

  if (profile.deleted_at) redirect("/login");
  const showNewsFeed = activeTab === "home" || activeTab === "discover";

  const { data: notificationRows, error: notificationsError } = await supabase
    .from("notifications")
    .select("id,kind,title,body,url,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  const notifications = (notificationRows ?? []) as NotificationRow[];
  const unreadCount = notifications.filter((row) => !row.read_at).length;

  return (
    <>
      <MemberTopbar displayName={profile.display_name} handle={profile.handle} unreadCount={unreadCount} />
      <SessionGuard scope="member" timeoutMs={MEMBER_INACTIVITY_MS} signOutAction={signOut} />
      <main className={`${styles.shell} member-dashboard-shell`}>
        <DashboardTabs active={activeTab} />
        {!showNewsFeed && activeTab !== "notifications" ? <header className={styles.hero}>
          <p className={styles.eyebrow}>Member dashboard</p>
          <h1>{activeTab === "saved" ? "Saved" : "Profile"}</h1>
          <p>{activeTab === "saved" ? "Everything you bookmarked, in published order." : "Manage your public profile details."}</p>
        </header> : null}
        {activeTab === "home" ? <DashboardHomeNews client={supabase} />
          : activeTab === "discover" ? <DashboardDiscoverNews client={supabase} query={query} category={category} page={page} />
            : activeTab === "notifications" ? <DashboardNotifications notifications={notifications} error={Boolean(notificationsError)} />
              : activeTab === "saved" ? <DashboardSaved /> : <div className={styles.grid}>
                <section className={styles.panel} aria-labelledby="profile-title">
                  <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Your details</p><h2 id="profile-title">Public profile</h2></div><span className={styles.handle}>@{profile.handle}</span></div>
                  <p className={styles.helper}>Your display name and handle appear beside your posts. Keep private contact details out of your public name.</p>
                  <ProfileEditor displayName={profile.display_name} handle={profile.handle} />
                </section>
              </div>}
      </main>
    </>
  );
}
