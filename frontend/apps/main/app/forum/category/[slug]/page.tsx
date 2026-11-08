import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, SectionHeading } from "../../../../components/design-system";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; return { title: `Forum category · ${slug}` }; }
export default async function ForumCategoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: category, error } = await supabase.from("forum_categories").select("id,name,description,rules").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) return <PageFrame><Notice role="status" tone="warning"><h1>Category unavailable</h1><p>Please try again later.</p></Notice></PageFrame>;
  if (!category) notFound();
  const { data: threads, error: threadError } = await supabase.from("forum_threads").select("id,slug,title,post_count,last_activity_at").eq("category_id", category.id).in("state", ["open", "locked"]).is("deleted_at", null).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(50);
  return <PageFrame className="ui-stack"><nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/forum">Forum</Link><span aria-hidden="true"> / </span><span>Category</span></nav>
    <PageIntro eyebrow="Community category" title={category.name} description={category.description ?? undefined} actions={<Link className="btn-primary" href={`/forum/new?category=${encodeURIComponent(category.id)}`}>Start a discussion</Link>} meta={category.rules ? <span><strong>Posting rules:</strong> {category.rules}</span> : undefined} />
    <section className="ui-stack-sm"><SectionHeading eyebrow="Conversations" title="Threads" />{threadError ? <Notice role="status" tone="warning">Threads could not be loaded. Please try again later.</Notice> : !threads?.length ? <EmptyPanel title="No public threads in this category yet" description="There are no visible discussions to show here." /> : <ul className="ui-list ui-panel ui-results">{threads.map((thread) => <li className="ui-item" key={thread.id}><h2 className="ui-item-title"><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h2><p className="ui-meta">{thread.post_count} {thread.post_count === 1 ? "post" : "posts"}</p></li>)}</ul>}</section>
  </PageFrame>;
}
