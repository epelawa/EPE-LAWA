import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel } from "../../../components/design-system";
import { createThread } from "../actions";

export const metadata: Metadata = { title: "Start a forum discussion" };
type Props = { searchParams: Promise<{ category?: string }> };
export default async function NewThreadPage({ searchParams }: Props) {
  const { category: selectedId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fforum%2Fnew");
  const { data: categories, error } = await supabase.from("forum_categories").select("id,name").eq("is_active", true).order("sort_order").limit(50);
  return <PageFrame className="ui-stack"><nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/forum">Forum</Link><span aria-hidden="true"> / </span><span>New discussion</span></nav>
    <PageIntro eyebrow="Community" title="Start a discussion" description="Share a question or perspective with the community. Please follow the category posting rules." />
    {error ? <Notice role="status" tone="warning">Categories could not be loaded. Please try again later.</Notice> : !categories?.length ? <EmptyPanel title="No active categories" description="A discussion cannot be started until a moderator publishes a category." /> : <form action={createThread} className="ui-stack-sm"><Panel className="ui-card ui-stack-sm">
      <div className="ui-field"><label className="label" htmlFor="category_id">Category</label><select className="input" id="category_id" name="category_id" required defaultValue={categories.some((item) => item.id === selectedId) ? selectedId : ""}><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div className="ui-field"><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required minLength={3} maxLength={160} /></div>
      <div className="ui-field"><label className="label" htmlFor="body">Your first post</label><textarea className="input" id="body" name="body" required maxLength={20000} rows={7} /></div>
      <fieldset className="ui-subtle ui-stack-sm"><legend className="label">Optional poll</legend><p className="ui-muted">Polls are single-choice. Results show totals only, never who voted.</p><div className="ui-field"><label className="label" htmlFor="poll_question">Poll question</label><input className="input" id="poll_question" name="poll_question" minLength={3} maxLength={300} /></div>{[1,2,3,4].map((number) => <div className="ui-field" key={number}><label className="label" htmlFor={`poll_option_${number}`}>Option {number}</label><input className="input" id={`poll_option_${number}`} name="poll_option" maxLength={120} /></div>)}</fieldset>
      <p className="ui-muted">Posting requires an active member profile. The database applies membership, ban, and category checks.</p><div className="ui-actions"><button className="btn-primary" type="submit">Publish discussion</button><Link className="btn-secondary" href="/forum">Cancel</Link></div>
    </Panel></form>}
  </PageFrame>;
}
