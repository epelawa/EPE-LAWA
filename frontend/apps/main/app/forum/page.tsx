import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

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
  return <div className="ep-container py-12">
    <header className="mb-10"><p className="page-header__eyebrow">Community</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Forum</h1><p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Browse public discussions, share a perspective, and take part in community conversations.</p></header>
    {failed ? <section className="card p-6" role="status"><h2 className="text-lg font-bold">The forum could not be loaded</h2><p className="mt-2 text-muted-foreground">Please try again later. No discussion data is shown.</p></section> : categories.length === 0 ? <section className="card p-8"><h2 className="text-lg font-bold">No forum categories are available</h2><p className="mt-2 text-muted-foreground">Categories will appear here after moderators publish them.</p></section> : <>
      <section aria-labelledby="forum-categories"><h2 id="forum-categories" className="mb-4 text-xl font-bold">Categories</h2><ul className="grid gap-4 sm:grid-cols-2">{categories.map((category) => <li key={category.id} className="card p-5"><h3 className="text-lg font-semibold"><Link className="underline-offset-4 hover:underline focus-visible:underline" href={`/forum/category/${encodeURIComponent(category.slug)}`}>{category.name}</Link></h3>{category.description ? <p className="mt-2 text-muted-foreground">{category.description}</p> : null}{category.rules ? <p className="mt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Posting rules:</span> {category.rules}</p> : null}</li>)}</ul></section>
      <section aria-labelledby="forum-threads" className="mt-10"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="forum-threads" className="text-xl font-bold">Recent threads</h2><Link className="button button--primary" href="/forum/new">Start a discussion</Link></div>{threads.length === 0 ? <p className="card p-6 text-muted-foreground">No public threads have been posted yet.</p> : <ul className="space-y-3">{threads.map((thread) => <li key={thread.id} className="card p-5"><h3 className="font-semibold leading-snug"><Link className="underline-offset-4 hover:underline focus-visible:underline" href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h3><p className="mt-2 text-sm text-muted-foreground">{categories.find((category) => category.id === thread.category_id)?.name ?? "Forum"} · {thread.post_count} {thread.post_count === 1 ? "post" : "posts"}</p></li>)}</ul>}</section>
    </>}
    <p className="mt-8 text-sm text-muted-foreground">Read the <Link className="underline underline-offset-4" href="/guidelines">community guidelines</Link>.</p>
  </div>;
}
