import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { formatLagosDateTime } from "../../lib/dates";
import { EmptyPanel, Notice, PageFrame } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
import { countActive } from "./active-count";
import ForumLiveCount from "./live-count";
import styles from "./forum.module.css";

type Category = { id: string; slug: string; name: string; description: string | null; rules: string | null };
type Thread = { id: string; category_id: string; slug: string; title: string; post_count: number; last_activity_at: string | null; is_pinned: boolean };

type SearchParams = { forum_error?: string | string[]; sort?: string | string[] };

export const metadata: Metadata = pageMetadata({ title: "Forum", description: "A moderated space for Epe community discussions, questions and replies.", path: "/forum" });

export default async function ForumPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requestedError = typeof params.forum_error === "string" ? params.forum_error : "";
  const requestedSort = typeof params.sort === "string" ? params.sort : "";
  const sort = requestedSort === "newest" || requestedSort === "posts" ? (requestedSort as "active" | "newest" | "posts") : "active";
  const sortHref = (value: "active" | "newest" | "posts") => (value === sort ? undefined : `/forum?sort=${value}`);
  const safeErrors = new Set([
    "Check the category, title, and post text.",
    "A poll needs a question and 2–10 distinct options within the stated limits.",
    "The thread could not be created. Your account may need an active member profile.",
    "The thread was created but its page could not be opened.",
    "Write a reply of up to 20,000 characters.",
    "Your reply could not be posted. The thread may be locked or your membership may be inactive.",
    "Too many attempts from this network this hour. Please wait a while and try again.",
  ]);
  const actionError = safeErrors.has(requestedError) ? requestedError : null;
  let categories: Category[] = [];
  let threads: Thread[] = [];
  let failed = false;
  try {
    const supabase = await createClient();
    let threadRequest = supabase.from("forum_threads").select("id,category_id,slug,title,post_count,last_activity_at,is_pinned")
      .in("state", ["open", "locked"]).is("deleted_at", null)
      .order("is_pinned", { ascending: false });
    if (sort === "newest") threadRequest = threadRequest.order("created_at", { ascending: false });
    else if (sort === "posts") threadRequest = threadRequest.order("post_count", { ascending: false });
    else threadRequest = threadRequest.order("last_activity_at", { ascending: false, nullsFirst: false });
    const [categoryResult, threadResult] = await Promise.all([
      supabase.from("forum_categories").select("id,slug,name,description,rules").eq("is_active", true).order("sort_order").limit(50),
      threadRequest.limit(50),
    ]);
    if (categoryResult.error || threadResult.error) { console.error("forum public listing read failed", { code: categoryResult.error?.code ?? threadResult.error?.code }); failed = true; }
    else { categories = (categoryResult.data ?? []) as Category[]; threads = (threadResult.data ?? []) as Thread[]; }
  } catch { failed = true; }
  const activeNow = countActive(threads);
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Forum";
  return <PageFrame className={`forum-shell ${styles.shell}`}>
    <header className={styles.appBar}>
      <div className={styles.appBarCopy}>
        <p className={styles.eyebrow}>Community</p>
        <h1 className={styles.appTitle}>Forum</h1>
        <p className={styles.appSub}>Epe’s moderated group chat — pick a topic and join the conversation.</p>
      </div>
      <div className={styles.appBarActions}>
        <ForumLiveCount initialActive={activeNow} />
        <Link className="btn-primary" href="/forum/new">Start a discussion</Link>
      </div>
    </header>
    {actionError ? <Notice role="alert" tone="danger">{actionError}</Notice> : null}
    {failed ? <EmptyPanel title="The forum could not be loaded" description="Please try again later. No discussion data is shown." /> : categories.length === 0 && threads.length === 0 ? <EmptyPanel title="No forum categories are available" description="Categories will appear here after moderators publish them." /> : <>
      <div className={styles.split}>
        <aside className={styles.rail} aria-label="Topics">
          <h2 className={styles.railTitle}>Topics</h2>
          {categories.length === 0 ? <p className="ui-muted">Topics will appear here after moderators publish them.</p> : <ul className={styles.railList}>{categories.map((category) => <li key={category.id}>
            <Link className={styles.railRow} href={`/forum/category/${encodeURIComponent(category.slug)}`}>
              <span className={styles.railAvatar} aria-hidden="true">{category.name.trim().slice(0, 1).toLocaleUpperCase("en-NG")}</span>
              <span className={styles.railCopy}>
                <span className={styles.railName}>{category.name}</span>
                {category.description ? <span className={styles.railDesc}>{category.description}</span> : null}
              </span>
            </Link>
          </li>)}</ul>}
        </aside>
        <section className={styles.stream} aria-labelledby="forum-threads">
          <div className={styles.streamHead}>
            <h2 className={styles.railTitle} id="forum-threads">Conversations</h2>
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
          {threads.length === 0 ? <EmptyPanel title="No public threads yet" description="When the community starts a discussion, it will appear here." /> : <ul className={styles.chatList}>{threads.map((thread) => {
            const initial = thread.title.trim().slice(0, 1).toLocaleUpperCase("en-NG") || "•";
            return <li key={thread.id} className={styles.chatRow}>
              <span className={styles.avatar} aria-hidden="true">{initial}</span>
              <div className={styles.chatMain}>
                <h3 className={styles.chatTitle}><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link>{thread.is_pinned ? <span className={styles.pinnedBadge}>Pinned</span> : null}</h3>
                <p className={styles.chatMeta}>{categoryName(thread.category_id)}{thread.last_activity_at ? <> · <time dateTime={thread.last_activity_at}>{formatLagosDateTime(thread.last_activity_at)} Epe time</time></> : null}</p>
              </div>
              <span className={styles.badge} aria-label={`${thread.post_count} ${thread.post_count === 1 ? "post" : "posts"}`}>{thread.post_count}</span>
            </li>;
          })}</ul>}
        </section>
      </div>
    </>}
    <p className={`ui-muted ${styles.guidelineNote}`}>Read the <Link className="ui-text-link" href="/guidelines">community guidelines</Link>.</p>
  </PageFrame>;
}
