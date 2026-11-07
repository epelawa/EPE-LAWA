import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { EmptyPanel, PageFrame, PageIntro, Panel, SectionHeading } from "../../components/design-system";

export const metadata: Metadata = { title: "Community forum", description: "Browse community discussion categories and threads.", alternates: { canonical: "/forum" } };
type Category = { id: string; slug: string; name: string; description: string | null; rules: string | null };
type Thread = { id: string; category_id: string; slug: string; title: string; post_count: number; last_activity_at: string | null };

export default async function ForumPage() {
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
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Community" title="Forum" description="Browse public discussions, share a perspective, and take part in community conversations." actions={<Link className="btn-primary" href="/forum/new">Start a discussion</Link>} />
    {failed ? <EmptyPanel title="The forum could not be loaded" description="Please try again later. No discussion data is shown." /> : categories.length === 0 ? <EmptyPanel title="No forum categories are available" description="Categories will appear here after moderators publish them." /> : <>
      <section className="ui-stack-sm" aria-labelledby="forum-categories"><SectionHeading id="forum-categories" eyebrow="Explore" title="Categories" /><ul className="ui-grid ui-grid--2 ui-list">{categories.map((category) => <li key={category.id}><Panel className="ui-card ui-stack-sm"><h3 className="ui-item-title"><Link href={`/forum/category/${encodeURIComponent(category.slug)}`}>{category.name}</Link></h3>{category.description ? <p className="ui-muted">{category.description}</p> : null}{category.rules ? <p className="ui-muted"><strong>Posting rules:</strong> {category.rules}</p> : null}</Panel></li>)}</ul></section>
      <section className="ui-stack-sm" aria-labelledby="forum-threads"><SectionHeading id="forum-threads" eyebrow="The conversation" title="Recent threads" action={<Link className="btn-secondary" href="/forum/new">Start a discussion</Link>} />{threads.length === 0 ? <EmptyPanel title="No public threads yet" description="When the community starts a discussion, it will appear here." /> : <ul className="ui-list ui-panel ui-results">{threads.map((thread) => <li key={thread.id} className="ui-item"><h3 className="ui-item-title"><Link href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h3><p className="ui-meta"><span>{categories.find((category) => category.id === thread.category_id)?.name ?? "Forum"}</span><span>{thread.post_count} {thread.post_count === 1 ? "post" : "posts"}</span></p></li>)}</ul>}</section>
    </>}
    <p className="ui-muted">Read the <Link className="ui-text-link" href="/guidelines">community guidelines</Link>.</p>
  </PageFrame>;
}
