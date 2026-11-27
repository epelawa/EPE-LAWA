import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { formatLagosDateTime } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { EmptyPanel, Notice, PageFrame } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
import { formRateLimitedMessage, formRateUnavailableMessage } from "../../lib/form-server";
import { countActive } from "./active-count";
import ForumLiveCount from "./live-count";
import { escapePostgrestLikeTerm } from "../../lib/postgrest-search";
import styles from "./forum.module.css";

type Category = { id: string; slug: string; name: string; description: string | null; rules: string | null };
type Thread = { id: string; category_id: string; slug: string; title: string; post_count: number; last_activity_at: string | null; is_pinned: boolean };

type SearchParams = { forum_error?: string | string[]; sort?: string | string[]; q?: string | string[] };

export const metadata: Metadata = pageMetadata({ title: "Forum", description: "A moderated space for Epe community discussions, questions and replies.", path: "/forum" });

export default async function ForumPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requestedError = typeof params.forum_error === "string" ? params.forum_error : "";
  const requestedSort = typeof params.sort === "string" ? params.sort : "";
  const sort = requestedSort === "newest" || requestedSort === "posts" ? (requestedSort as "active" | "newest" | "posts") : "active";
  const requestedQuery = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const searchQuery = requestedQuery ? requestedQuery : "";
  const sortHref = (value: "active" | "newest" | "posts") => {
    const query = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
    return value === sort ? undefined : `/forum?sort=${value}${query}`;
  };
  const safeErrors = new Set([
    "Check the category, title, and post text.",
    "A poll needs a question and 2–10 distinct options within the stated limits.",
    "The thread could not be created. Your account may need an active member profile.",
    "The thread was created but its page could not be opened.",
    "Write a reply of up to 20,000 characters.",
    "Your reply could not be posted. The thread may be locked or your membership may be inactive.",
    formRateLimitedMessage,
    formRateUnavailableMessage,
  ]);
  const actionError = safeErrors.has(requestedError) ? requestedError : null;
  let categories: Category[] = [];
  let threads: Thread[] = [];
  const unreadThreadIds = new Set<string>();
  const unreadByCategory = new Map<string, number>();
  let displayName = "";
  let avatarUrl: string | null = null;
  let failed = false;
  try {
    const supabase = await createClient();
    let threadRequest = supabase.from("forum_threads").select("id,category_id,slug,title,post_count,last_activity_at,is_pinned")
      .in("state", ["open", "locked"]).is("deleted_at", null)
      .order("is_pinned", { ascending: false });
    if (sort === "newest") threadRequest = threadRequest.order("created_at", { ascending: false });
    else if (sort === "posts") threadRequest = threadRequest.order("post_count", { ascending: false });
    else threadRequest = threadRequest.order("last_activity_at", { ascending: false, nullsFirst: false });
    if (searchQuery) threadRequest = threadRequest.ilike("title", `%${escapePostgrestLikeTerm(searchQuery)}%`);
    const { data: { user } } = await supabase.auth.getUser();
    const [categoryResult, threadResult, unreadResult, profileResult] = await Promise.all([
      supabase.from("forum_categories").select("id,slug,name,description,rules").eq("is_active", true).order("sort_order").limit(50),
      threadRequest.limit(50),
      user ? supabase.rpc("forum_unread_threads", { p_limit: 200 }) : Promise.resolve({ data: [] as string[], error: null }),
      user ? supabase.from("profiles").select("display_name,avatar_key,deleted_at").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (categoryResult.error || threadResult.error) { console.error("forum public listing read failed", { code: categoryResult.error?.code ?? threadResult.error?.code }); failed = true; }
    else { categories = (categoryResult.data ?? []) as Category[]; threads = (threadResult.data ?? []) as Thread[]; }
    if (!failed && user && !profileResult.error && profileResult.data && !profileResult.data.deleted_at) {
      const profile = profileResult.data as { display_name: string; avatar_key: string | null };
      displayName = profile.display_name;
      avatarUrl = publicMediaUrl(profile.avatar_key);
    }
    if (!failed && user && !unreadResult.error && Array.isArray(unreadResult.data)) {
      const unreadIds = (unreadResult.data as unknown[]).filter((id): id is string => typeof id === "string");
      for (const id of unreadIds) unreadThreadIds.add(id);
      if (unreadIds.length) {
        const { data: unreadThreads } = await supabase.from("forum_threads").select("id,category_id").in("id", unreadIds);
        for (const row of (unreadThreads ?? []) as { id: string; category_id: string }[]) {
          unreadByCategory.set(row.category_id, (unreadByCategory.get(row.category_id) ?? 0) + 1);
        }
      }
    }
  } catch { failed = true; }
  const activeNow = countActive(threads);
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Forum";
  const searched = Boolean(searchQuery);
  return <PageFrame className={`forum-shell ${styles.shell}`}>
    <header className={styles.appBar}>
      <div className={styles.appBarCopy}>
        {displayName ? (
          <div className={styles.welcome}>
            <span className={styles.welcomeAvatar} aria-hidden="true">{avatarUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={avatarUrl} alt="" width={40} height={40} /> : displayName.trim().slice(0, 1).toLocaleUpperCase("en-NG")}</span>
            <div>
              <h1 className={styles.appTitle}>Hello, {displayName}</h1>
              <p className={styles.appSub}>{unreadThreadIds.size > 0 ? `${unreadThreadIds.size} ${unreadThreadIds.size === 1 ? "conversation has" : "conversations have"} new messages for you.` : "You're all caught up."}</p>
            </div>
          </div>
        ) : (
          <div className={styles.welcome}>
            <span className={styles.welcomeAvatar} aria-hidden="true">E</span>
            <div>
              <h1 className={styles.appTitle}>Community</h1>
              <p className={styles.appSub}>Epe’s moderated group chat — join in seconds.</p>
            </div>
          </div>
        )}
      </div>
      <div className={styles.appBarActions}>
        <ForumLiveCount initialActive={activeNow} />
        <Link className="btn-primary" href="/forum/new">Start a discussion</Link>
      </div>
    </header>
    {actionError ? <Notice role="alert" tone="danger">{actionError}</Notice> : null}
    {failed ? <EmptyPanel title="The forum could not be loaded" description="Please try again later. No discussion data is shown." /> : categories.length === 0 && threads.length === 0 ? <EmptyPanel title="No forum categories are available" description="Categories will appear here after moderators publish them." /> : <>
      <form className={styles.searchBar} action="/forum" method="get">
        <input className={styles.searchInput} type="search" name="q" defaultValue={searchQuery} placeholder="Search conversations" maxLength={80} aria-label="Search conversations" />
        {sort !== "active" ? <input type="hidden" name="sort" value={sort} /> : null}
        <button className={styles.searchButton} type="submit">Search</button>
        {searched ? <Link className={styles.searchClear} href="/forum">Clear</Link> : null}
      </form>
      <div className={styles.split}>
        <aside className={styles.rail} aria-label="Topics">
          <h2 className={styles.railTitle}>Channels</h2>
          <ul className={styles.railList}>
            <li><Link className={styles.railRow} href="/forum"><span className={styles.railAvatar} aria-hidden="true">★</span><span className={styles.railCopy} aria-current="true"><span className={styles.railName}>All conversations</span></span></Link></li>
            {categories.map((category) => <li key={category.id}>
              <Link className={styles.railRow} href={`/forum/category/${encodeURIComponent(category.slug)}`}>
                <span className={styles.railAvatar} aria-hidden="true">{category.name.trim().slice(0, 1).toLocaleUpperCase("en-NG")}</span>
                <span className={styles.railCopy}>
                  <span className={styles.railName}>{category.name}</span>
                  {category.description ? <span className={styles.railDesc}>{category.description}</span> : null}
                </span>
                {unreadByCategory.get(category.id) ? <span className={styles.unreadPill} aria-label={`${unreadByCategory.get(category.id)} conversations with new messages`}>{unreadByCategory.get(category.id)}</span> : null}
              </Link>
            </li>)}
          </ul>
        </aside>
        <section className={styles.stream} aria-labelledby="forum-threads">
          <div className={styles.streamHead}>
            <h2 className={styles.railTitle} id="forum-threads">{searched ? `Search: ${searchQuery}` : "Conversations"}</h2>
            <nav className={styles.sortRow} aria-label="Sort threads">
              {(["active", "newest", "posts"] as const).map((value) => {
                const href = sortHref(value);
                const label = value === "active" ? "Most recent activity" : value === "newest" ? "Newest" : "Most posts";
                return href
                  ? <Link key={value} className={styles.sortLink} href={href}>{label}</Link>
                  : <span key={value} className={styles.sortCurrent} aria-current="true">{label}</span>;
              })}
            </nav>
          </div>
          {threads.length === 0 ? <EmptyPanel title={searched ? "No conversations match your search" : "No public threads yet"} description={searched ? "Try a shorter or different word." : "When the community starts a discussion, it will appear here."} /> : <ul className={styles.chatList}>{threads.map((thread) => {
            const initial = thread.title.trim().slice(0, 1).toLocaleUpperCase("en-NG") || "•";
            return <li key={thread.id} className={styles.chatRow} data-unread={unreadThreadIds.has(thread.id) ? "true" : undefined}>
              <span className={styles.avatar} aria-hidden="true">{initial}</span>
              <div className={styles.chatMain}>
                <h3 className={styles.chatTitle}><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link>{thread.is_pinned ? <span className={styles.pinnedBadge}>Pinned</span> : null}</h3>
                <p className={styles.chatMeta}>{categoryName(thread.category_id)}{thread.last_activity_at ? <> · <time dateTime={thread.last_activity_at}>{formatLagosDateTime(thread.last_activity_at)} Epe time</time></> : null}</p>
              </div>
              {unreadThreadIds.has(thread.id) ? <span className={styles.unreadDot} aria-label="New messages" /> : null}
              <span className={styles.badge} aria-label={`${thread.post_count} ${thread.post_count === 1 ? "post" : "posts"}`}>{thread.post_count}</span>
            </li>;
          })}</ul>}
        </section>
      </div>
    </>}
    <p className={`ui-muted ${styles.guidelineNote}`}>Read the <Link className="ui-text-link" href="/guidelines">community guidelines</Link>.</p>
    <Link className={styles.fab} href="/forum/new" aria-label="Start a new discussion">+</Link>
  </PageFrame>;
}
