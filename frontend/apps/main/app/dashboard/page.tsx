import { SubmitButton } from "@epelawa/ui";
import { NotificationSoundSettings } from "../../components/notification-sound";
import NotificationLiveRefresh from "../../components/notification-live-refresh";
import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountShell from "../../components/account-shell";
import { createClient } from "../../lib/supabase";
import { checkHandleAvailability, signOut, signOutEverywhere } from "../auth/actions";
import { markNotificationsRead, updateMemberAvatar, updateNotificationPreferences } from "./actions";
import { toggleSavedArticle } from "./saved-actions";
import MemberTopbar from "../../components/member-topbar";
import DashboardSwipe from "../../components/dashboard-swipe";
import type { DashboardTab } from "../../lib/dashboard-swipe";
import LayoutVariation from "../../components/layout-variation";
import SessionGuard from "../../components/session-guard";
import ProfileEditor from "./profile-editor";
import SecurityCard from "./security-card";
import AppealsPanel from "./appeals-panel";
import AvatarEditor from "./avatar-editor";
import HandleCompletionForm from "./handle-completion-form";
import { DashboardDiscoverNews, DashboardHomeNews, safePage } from "./news-content";
import { formatPublishedDate, formatLagosDateTime } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
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
type NotificationPreferences = {
  in_app_news: boolean; in_app_radio: boolean; in_app_comments: boolean; in_app_forum: boolean;
  push_news: boolean; push_radio: boolean; push_comments: boolean; push_forum: boolean;
};

const inAppPreferenceRows: { key: keyof NotificationPreferences; title: string; description: string }[] = [
  { key: "in_app_news", title: "Newsroom updates", description: "New stories in news topics you follow." },
];

function PreferenceRow({ name, title, description, checked }: { name: string; title: string; description: string; checked: boolean }) {
  return <label className={styles.prefRow}>
    <span className={styles.prefCopy}>
      <span className={styles.prefTitle}>{title}</span>
      <span className={styles.prefDescription}>{description}</span>
    </span>
    <input className={styles.prefSwitch} type="checkbox" name={name} defaultChecked={checked} />
  </label>;
}

function NotificationPreferencesPanel({ preferences }: { preferences: NotificationPreferences }) {
  return <section className={styles.prefsPanel} aria-labelledby="notification-preferences-title">
    <h2 id="notification-preferences-title">Notification channels</h2>
    <p className={styles.helper}>Choose whether to receive in-app updates for news topics you follow. Reply and radio alerts and browser push are not currently available.</p>
    <form action={updateNotificationPreferences}>
      <fieldset className={styles.prefsGroup}>
        <legend>In-app</legend>
        {inAppPreferenceRows.map((row) => <PreferenceRow key={row.key} name={row.key} title={row.title} description={row.description} checked={preferences[row.key]} />)}
      </fieldset>
      <SubmitButton pendingLabel="Saving…" className="btn-primary" useLegacyClasses>Save preferences</SubmitButton>
    </form>
  </section>;
}

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
  moderation: "Moderation",
  admin_message: "EPE LAWA message",
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
              <Link className={styles.savedTitle} href={`/news/${story.slug}`}>{story.title}</Link>
              {story.published_at ? <span className={styles.savedMeta}>{formatPublishedDate(story.published_at) ?? ""}</span> : null}
            </span>
            <form action={toggleSavedArticle}>
              <input type="hidden" name="articleId" value={story.id} />
              <input type="hidden" name="slug" value={story.slug} />
              <input type="hidden" name="intent" value="remove" />
              <SubmitButton pendingLabel="Removing…" className="btn-secondary" useLegacyClasses>Remove</SubmitButton>
            </form>
          </li>)}
        </ul>}
  </section>;
}

function notificationStamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : formatLagosDateTime(date.toISOString()) ?? "Date unavailable";
}

function DashboardNotifications({ notifications, error, preferences }: { notifications: NotificationRow[]; error: boolean; preferences: NotificationPreferences | null }) {
  const unread = notifications.filter((row) => !row.read_at).length;
  return <section className={`${styles.panel} ${styles.notificationsPanel}`} aria-labelledby="notifications-title">
    <header className={styles.notificationsHeading}>
      <div>
        <p className={styles.eyebrow}>Notifications</p>
        <h1 id="notifications-title">Your notifications</h1>
        <p className={styles.helper}>Replies, moderation decisions and newsroom updates addressed to your member account.</p>
      </div>
      {unread > 0 ? <form action={markNotificationsRead}><SubmitButton pendingLabel="Marking…" className="btn-secondary" useLegacyClasses>Mark all as read</SubmitButton></form> : <span className={styles.handle}>All read</span>}
    </header>
    <NotificationSoundSettings />
    {preferences ? <NotificationPreferencesPanel preferences={preferences} /> : null}
    {error
      ? <p className={styles.error} role="alert">Notifications could not be loaded right now. Nothing is being guessed or substituted.</p>
      : notifications.length === 0
        ? <div className={styles.emptyNotifications}>
          <BellIcon size={30} />
          <h2>No notifications yet</h2>
          <p>Updates from the EPE LAWA team and new stories in news topics you follow can appear here.</p>
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
    <form action={signOut}><SubmitButton pendingLabel="Signing out…" className="btn-secondary" useLegacyClasses>Sign out</SubmitButton></form>
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
  const category = ""; // No news categories (owner, turn 26).
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
    .select("user_id, handle, display_name, created_at, avatar_key, deleted_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const error = initialProfile.error;
  let profile = initialProfile.data as MemberProfileSnapshot | null;

  if (error) {
    return <main className={`${styles.shell} member-dashboard-shell`}><section className={styles.unavailable}><p className={styles.eyebrow}>Member dashboard</p><h1>Profile unavailable</h1><p>We couldn’t load your member profile. Your account is still protected; try again later.</p><form action={signOut}><SubmitButton pendingLabel="Signing out…" className="btn-secondary" useLegacyClasses>Sign out</SubmitButton></form></section></main>;
  }

  let bootstrap: MemberEntryInput["bootstrap"] = "not-needed";
  if (!profile) {
    const { data: created, error: bootstrapError } = await supabase.rpc("bootstrap_verified_member_profile");
    bootstrap = bootstrapError ? "unavailable" : created === true ? "created" : "failed";
    if (!bootstrapError && created === true) {
      const refreshed = await supabase
        .from("profiles")
        .select("user_id, handle, display_name, created_at, avatar_key, deleted_at")
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
  const { data: preferenceRow, error: preferencesError } = await supabase
    .from("notification_preferences")
    .select("in_app_news,in_app_radio,in_app_comments,in_app_forum,push_news,push_radio,push_comments,push_forum")
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferencesError) console.error("notification_preferences read failed", { code: preferencesError.code });

  return (
    <>
      <NotificationLiveRefresh userId={user.id} />
      <MemberTopbar displayName={profile.display_name} handle={profile.handle} unreadCount={unreadCount} />
      <SessionGuard scope="member" timeoutMs={MEMBER_INACTIVITY_MS} signOutAction={signOut} />
      <main className={`${styles.shell} member-dashboard-shell`}>
        <LayoutVariation area="member">
        <DashboardTabs active={activeTab} />
        <DashboardSwipe active={activeTab}>
        {!showNewsFeed && activeTab !== "notifications" && activeTab !== "saved" ? <header className={styles.hero}>
          <p className={styles.eyebrow}>Member dashboard</p>
          <h1>Profile</h1>
          <p>Manage your public profile details.</p>
        </header> : null}
        {activeTab === "home" ? <DashboardHomeNews client={supabase} />
          : activeTab === "discover" ? <DashboardDiscoverNews client={supabase} query={query} category={category} page={page} />
            : activeTab === "notifications" ? <DashboardNotifications notifications={notifications} error={Boolean(notificationsError)} preferences={preferencesError ? null : ((preferenceRow as unknown as NotificationPreferences) ?? { in_app_news: true, in_app_radio: false, in_app_comments: true, in_app_forum: false, push_news: false, push_radio: false, push_comments: false, push_forum: false })} />
              : activeTab === "saved" ? <DashboardSaved /> : <div className={styles.grid}>
                <section className={styles.panel} aria-labelledby="profile-title">
                  <div className={styles.profileIdentity}><span className={styles.profileAvatar} aria-hidden="true">{publicMediaUrl(profile.avatar_key) ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={publicMediaUrl(profile.avatar_key) ?? ""} alt="" width={56} height={56} style={{ borderRadius: "inherit" }} /> : profile.display_name.trim().slice(0, 1).toUpperCase()}</span><div><h2 id="profile-title">{profile.display_name}</h2><span className={styles.handle}>@{profile.handle}</span>{profile.created_at ? <span className={styles.helper}>Member since {formatPublishedDate(profile.created_at)}</span> : null}</div></div>
                  <AvatarEditor avatarUrl={publicMediaUrl(profile.avatar_key)} displayName={profile.display_name} />
                  {(() => { const checks = [Boolean(profile.display_name.trim()), Boolean(profile.handle), Boolean(profile.avatar_key)]; const done = checks.filter(Boolean).length; const percent = Math.round((done / checks.length) * 100);
                    return <div className="ui-stack-sm"><p className={styles.helper}>Profile strength</p><div role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={styles.strengthTrack}><span style={{ width: `${percent}%` }} /></div><p className={styles.helper}>{percent === 100 ? "Your profile is complete." : profile.avatar_key ? "Your profile is nearly complete." : "Add a profile photo to complete your profile."}</p></div>; })()}
                  <h2>Public profile</h2>
                  <p className={styles.helper}>Your display name and handle appear beside your posts. Keep private contact details out of your public name.</p>
                  <ProfileEditor displayName={profile.display_name} handle={profile.handle} />
                  <SecurityCard email={user.email ?? "your email address"} memberSince={profile.created_at ? formatPublishedDate(profile.created_at) : null} />
                  <AppealsPanel />
                  <form action={signOutEverywhere} className="ui-stack-sm ui-divider">
                    <SubmitButton pendingLabel="Signing out…" className="btn-ghost" useLegacyClasses>Sign out everywhere</SubmitButton>
                    <p className={styles.helper}>Ends this session and every other signed-in session for your account on all devices.</p>
                  </form>
                </section>
              </div>}
        </DashboardSwipe>
        </LayoutVariation>
      </main>
    </>
  );
}
