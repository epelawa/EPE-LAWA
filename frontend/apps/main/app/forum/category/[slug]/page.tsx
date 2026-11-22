import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, SectionHeading } from "../../../../components/design-system";
import FollowButton from "../../../../components/follow-button";

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
    return <PageFrame><EmptyPanel title="Category unavailable" description="We couldn’t connect to the forum. Please try again later." actions={<Link className="btn-secondary" href="/forum">Back to the forum</Link>} /></PageFrame>;
  }
  const { data: category, error } = await supabase.from("forum_categories").select("id,name,description,rules").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) return <PageFrame><EmptyPanel title="Category unavailable" description="We couldn’t load this category. Please try again." actions={<Link className="btn-secondary" href="/forum">Back to the forum</Link>} /></PageFrame>;
  if (!category) notFound();
  const start = (page - 1) * PAGE_SIZE;
  const { data, error: threadError } = await supabase.from("forum_threads").select("id,slug,title,post_count,last_activity_at").eq("category_id", category.id).in("state", ["open", "locked"]).is("deleted_at", null).order("last_activity_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).range(start, start + PAGE_SIZE);
  const threads = (data ?? []).slice(0, PAGE_SIZE);
  const hasNext = (data?.length ?? 0) > PAGE_SIZE && page < MAX_PAGE;
  return <PageFrame className="ui-stack forum-shell"><nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/forum">Forum</Link><span aria-hidden="true"> / </span><span>{category.name}</span></nav>
    <PageIntro eyebrow="Community category" title={category.name} description={category.description ?? undefined} actions={<>
      <Link className="btn-primary" href={`/forum/new?category=${encodeURIComponent(category.id)}`}>Start a discussion</Link>
      <FollowButton topicType="forum_category" topicId={category.id} returnTo={`/forum/category/${encodeURIComponent(slug)}`} />
    </>} meta={category.rules ? <span><strong>Posting rules:</strong> {category.rules}</span> : undefined} />
    <section className="ui-stack-sm"><SectionHeading eyebrow="Conversations" title="Threads" />{threadError ? <Notice role="status" tone="warning">Threads could not be loaded. Please try again later.</Notice> : !threads.length ? <EmptyPanel title={page > 1 ? "No discussions on this page" : "No public threads in this category yet"} description={page > 1 ? "Go back to see earlier results." : "There are no visible discussions to show here."} /> : <ul className="ui-list ui-panel ui-results">{threads.map((thread) => <li className="ui-item" key={thread.id}><h2 className="ui-item-title"><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h2><p className="ui-meta">{thread.post_count} {thread.post_count === 1 ? "post" : "posts"}</p></li>)}</ul>}</section>
    {!threadError && (page > 1 || hasNext) ? <nav className="ui-actions" aria-label="Discussion pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1)}>Previous discussions</Link> : null}<span className="ui-meta">Page {page}</span>{hasNext ? <Link className="btn-secondary" href={pageHref(page + 1)}>More discussions</Link> : null}</nav> : null}
  </PageFrame>;
}
