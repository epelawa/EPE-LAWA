import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, SectionHeading } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
import { countActive } from "./active-count";
import ForumLiveCount from "./live-count";
import styles from "./forum.module.css";

type Category = { id: string; slug: string; name: string; description: string | null; rules: string | null };
type Thread = { id: string; category_id: string; slug: string; title: string; post_count: number; last_activity_at: string | null };

type SearchParams = { forum_error?: string | string[] };

export const metadata: Metadata = pageMetadata({ title: "Forum", description: "A moderated space for Epe community discussions, questions and replies.", path: "/forum" });

export default async function ForumPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requestedError = typeof params.forum_error === "string" ? params.forum_error : "";
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
    const [categoryResult, threadResult] = await Promise.all([
      supabase.from("forum_categories").select("id,slug,name,description,rules").eq("is_active", true).order("sort_order").limit(50),
      supabase.from("forum_threads").select("id,category_id,slug,title,post_count,last_activity_at").in("state", ["open", "locked"]).is("deleted_at", null).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(50),
    ]);
    if (categoryResult.error || threadResult.error) { console.error("forum public listing read failed", { code: categoryResult.error?.code ?? threadResult.error?.code }); failed = true; }
    else { categories = (categoryResult.data ?? []) as Category[]; threads = (threadResult.data ?? []) as Thread[]; }
  } catch { failed = true; }
  const activeNow = countActive(threads);
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Forum";
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Community" title="Forum" description="Browse public discussions, share a perspective, and take part in community conversations." actions={<><ForumLiveCount initialActive={activeNow} /><Link className="btn-primary" href="/forum/new">Start a discussion</Link></>} />
    {actionError ? <Notice role="alert" tone="danger">{actionError}</Notice> : null}
    {failed ? <EmptyPanel title="The forum could not be loaded" description="Please try again later. No discussion data is shown." /> : categories.length === 0 && threads.length === 0 ? <EmptyPanel title="No forum categories are available" description="Categories will appear here after moderators publish them." /> : <>
      <section className="ui-stack-sm" aria-labelledby="forum-categories"><SectionHeading id="forum-categories" eyebrow="Explore" title="Topics" />
        {categories.length === 0 ? <p className="ui-muted">Topics will appear here after moderators publish them.</p> : <ul className={styles.chips}>{categories.map((category) => <li key={category.id}><Link className={styles.chip} href={`/forum/category/${encodeURIComponent(category.slug)}`}># {category.name}</Link></li>)}</ul>}
      </section>
      <section className="ui-stack-sm" aria-labelledby="forum-threads"><SectionHeading id="forum-threads" eyebrow="Now talking" title="Recent conversations" />
        {threads.length === 0 ? <EmptyPanel title="No public threads yet" description="When the community starts a discussion, it will appear here." /> : <ul className={styles.chatList}>{threads.map((thread) => {
          const initial = thread.title.trim().slice(0, 1).toLocaleUpperCase("en-NG") || "•";
          return <li key={thread.id} className={styles.chatRow}>
            <span className={styles.avatar} aria-hidden="true">{initial}</span>
            <div className={styles.chatMain}>
              <h3 className={styles.chatTitle}><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h3>
              <p className={styles.chatMeta}>{categoryName(thread.category_id)}{thread.last_activity_at ? <> · <time dateTime={thread.last_activity_at}>{new Date(thread.last_activity_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time></> : null}</p>
            </div>
            <span className={styles.badge} aria-label={`${thread.post_count} ${thread.post_count === 1 ? "post" : "posts"}`}>{thread.post_count}</span>
          </li>;
        })}</ul>}
      </section>
    </>}
    <p className="ui-muted">Read the <Link className="ui-text-link" href="/guidelines">community guidelines</Link>.</p>
  </PageFrame>;
}
