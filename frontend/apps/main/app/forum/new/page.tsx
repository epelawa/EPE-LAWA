import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { createThread } from "../actions";

export const metadata: Metadata = { title: "Start a forum discussion" };
type Props = { searchParams: Promise<{ category?: string }> };
export default async function NewThreadPage({ searchParams }: Props) {
  const { category: selectedId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fforum%2Fnew");
  const { data: categories, error } = await supabase.from("forum_categories").select("id,name").eq("is_active", true).order("sort_order").limit(50);
  return <div className="ep-container py-12"><p className="mb-5 text-sm"><Link className="underline" href="/forum">Forum</Link> / New discussion</p><h1 className="text-3xl font-bold">Start a discussion</h1>{error ? <section className="card mt-6 p-6" role="status">Categories could not be loaded. Please try again later.</section> : !categories?.length ? <section className="card mt-6 p-6"><p>No active categories are available, so a discussion cannot be started yet.</p></section> : <form action={createThread} className="card mt-6 grid max-w-2xl gap-5 p-6"><label className="grid gap-2 font-semibold">Category<select className="min-h-11 rounded-lg border p-3 font-normal" name="category_id" required defaultValue={categories.some((item) => item.id === selectedId) ? selectedId : ""}><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-2 font-semibold">Title<input className="min-h-11 rounded-lg border p-3 font-normal" name="title" required minLength={3} maxLength={160} /></label><label className="grid gap-2 font-semibold">Your first post<textarea className="min-h-40 rounded-lg border p-3 font-normal" name="body" required maxLength={20000} /></label><fieldset className="grid gap-3 rounded-xl border border-[var(--border)] p-4"><legend className="px-1 font-semibold">Optional poll</legend><p className="text-sm text-muted-foreground">Polls are single-choice. Results show totals only, never who voted.</p><label className="grid gap-2 text-sm font-semibold">Poll question<input className="min-h-11 rounded-lg border p-3 font-normal" name="poll_question" minLength={3} maxLength={300} /></label>{[1,2,3,4].map((number) => <label className="grid gap-2 text-sm font-semibold" key={number}>Option {number}<input className="min-h-11 rounded-lg border p-3 font-normal" name="poll_option" maxLength={120} /></label>)}</fieldset><p className="text-sm text-muted-foreground">Posting requires an active member profile. The database applies membership, ban, and category checks.</p><button className="button button--primary min-h-11 w-fit" type="submit">Publish discussion</button></form>}</div>;
}
