import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { formatLagosDateTime } from "../../../../lib/dates";
import { EmptyPanel, Notice, PageFrame } from "../../../../components/design-system";
import FollowButton from "../../../../components/follow-button";
import styles from "../../forum.module.css";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> };
const PAGE_SIZE = 20;
const MAX_PAGE = 1000;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Forum category · ${slug}` };
}

export default async function ForumCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const rawPage = (await searchParams).page;
  const page = typeof rawPage === "string" && /^\d{1,6}$/.test(rawPage)
    ? Math.max(1, Math.min(Number(rawPage), MAX_PAGE)) : 1;
  const pageHref = (number: number) => `/forum/category/${encodeURIComponent(slug)}${number > 1 ? `?page=${number}` : ""}`;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try { supabase = await createClient(); } catch {
    return <PageFrame><EmptyPanel as="h1" title="Category unavailable" description="We couldn’t connect to the forum. Please try again later." actions={<Link className="btn-secondary" href="/forum">Back to the forum</Link>} /></PageFrame>;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { data: category, error } = await supabase.from("forum_categories").select("id,name,description,rules").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) return <PageFrame><EmptyPanel as="h1" title="Category unavailable" description="We couldn’t load this category. Please try again." actions={<Link className="btn-secondary" href="/forum">Back to the forum</Link>} /></PageFrame>;
  if (!category) notFound();
  const start = (page - 1) * PAGE_SIZE;
  const [{ data, error: threadError }, unreadResult] = await Promise.all([
    supabase.from("forum_threads").select("id,slug,title,post_count,last_activity_at").eq("category_id", category.id).in("state", ["open", "locked"]).is("deleted_at", null).order("last_activity_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).range(start, start + PAGE_SIZE),
    user ? supabase.rpc("forum_unread_threads", { p_limit: 200 }) : Promise.resolve({ data: [] as string[], error: null }),
  ]);
  const unreadThreadIds = new Set(user && !unreadResult.error && Array.isArray(unreadResult.data) ? (unreadResult.data as unknown[]).filter((id): id is string => typeof id === "string") : []);
  const threads = (data ?? []).slice(0, PAGE_SIZE);
  const hasNext = (data?.length ?? 0) > PAGE_SIZE && page < MAX_PAGE;
  return <PageFrame className={`ui-stack forum-shell ${styles.threadShell}`}>
    <nav className={styles.threadBar} aria-label="Channel header">
      <span className={styles.railAvatar} aria-hidden="true">{category.name.trim().slice(0, 1).toLocaleUpperCase("en-NG")}</span>
      <div className={styles.threadBarCopy}>
        <h1 className={styles.threadTitle}>{category.name}</h1>
        <p className={styles.threadBarMeta}>{category.description ?? "Community channel"}</p>
        {category.rules ? <p className={styles.channelRules}><strong>Channel rules:</strong> {category.rules}</p> : null}
      </div>
      <FollowButton topicType="forum_category" topicId={category.id} returnTo={`/forum/category/${encodeURIComponent(slug)}`} />
    </nav>
    <nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/forum">Forum</Link><span aria-hidden="true"> / </span><span>{category.name}</span></nav>
    <section aria-label="Conversations in this channel">{threadError ? <Notice role="status" tone="warning">Threads could not be loaded. Please try again later.</Notice> : !threads.length ? <EmptyPanel title={page > 1 ? "No discussions on this page" : "No public threads in this category yet"} description={page > 1 ? "Go back to see earlier results." : "There are no visible discussions to show here."} /> : <ul className={styles.chatList}>{threads.map((thread) => {
      const initial = thread.title.trim().slice(0, 1).toLocaleUpperCase("en-NG") || "•";
      return <li key={thread.id} className={styles.chatRow} data-unread={unreadThreadIds.has(thread.id) ? "true" : undefined}>
        <span className={styles.avatar} aria-hidden="true">{initial}</span>
        <div className={styles.chatMain}>
          <h2 className={styles.chatTitle}><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h2>
          <p className={styles.chatMeta}>{thread.post_count} {thread.post_count === 1 ? "message" : "messages"}{thread.last_activity_at ? <> · <time dateTime={thread.last_activity_at}>{formatLagosDateTime(thread.last_activity_at)} Epe time</time></> : null}</p>
        </div>
        {unreadThreadIds.has(thread.id) ? <span className={styles.unreadDot} aria-label="New messages" /> : null}
        <span className={styles.badge} aria-label="Open conversation">›</span>
      </li>;
    })}</ul>}</section>
    {!threadError && (page > 1 || hasNext) ? <nav className="ui-actions" aria-label="Discussion pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1)}>Previous discussions</Link> : null}<span className="ui-meta">Page {page}</span>{hasNext ? <Link className="btn-secondary" href={pageHref(page + 1)}>More discussions</Link> : null}</nav> : null}
    {user ? <Link className={styles.fab} href={`/forum/new?category=${encodeURIComponent(category.id)}`} aria-label="Start a new discussion in this channel">+</Link> : <Link className={styles.fab} href="/forum/new" aria-label="Start a new discussion">+</Link>}
  </PageFrame>;
}
