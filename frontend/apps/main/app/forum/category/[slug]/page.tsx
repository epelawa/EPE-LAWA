import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; return { title: `Forum category · ${slug}` }; }
export default async function ForumCategoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: category, error } = await supabase.from("forum_categories").select("id,name,description,rules").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) return <div className="ep-container py-12"><section className="card p-6" role="status"><h1 className="text-2xl font-bold">Category unavailable</h1><p className="mt-2 text-muted-foreground">Please try again later.</p></section></div>;
  if (!category) notFound();
  const { data: threads, error: threadError } = await supabase.from("forum_threads").select("id,slug,title,post_count,last_activity_at").eq("category_id", category.id).in("state", ["open", "locked"]).is("deleted_at", null).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(50);
  return <div className="ep-container py-12"><p className="mb-5 text-sm"><Link className="underline" href="/forum">Forum</Link> / Category</p><header className="mb-8"><h1 className="text-3xl font-bold">{category.name}</h1>{category.description ? <p className="mt-3 max-w-2xl text-muted-foreground">{category.description}</p> : null}{category.rules ? <p className="mt-3 text-sm"><strong>Posting rules:</strong> {category.rules}</p> : null}</header><p className="mb-5"><Link className="button button--primary" href={`/forum/new?category=${encodeURIComponent(category.id)}`}>Start a discussion</Link></p>{threadError ? <section className="card p-6" role="status">Threads could not be loaded. Please try again later.</section> : !threads?.length ? <section className="card p-6 text-muted-foreground">No public threads have been posted in this category yet.</section> : <ul className="space-y-3">{threads.map((thread) => <li className="card p-5" key={thread.id}><h2 className="font-semibold"><Link className="underline-offset-4 hover:underline" href={`/forum/thread/${encodeURIComponent(thread.slug)}`}>{thread.title}</Link></h2><p className="mt-2 text-sm text-muted-foreground">{thread.post_count} {thread.post_count === 1 ? "post" : "posts"}</p></li>)}</ul>}</div>;
}
