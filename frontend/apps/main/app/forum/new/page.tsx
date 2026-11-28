import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro } from "../../../components/design-system";
import NewThreadForm from "./new-thread-form";

export const metadata: Metadata = { title: "Start a forum discussion" };
type Props = { searchParams: Promise<{ category?: string }> };
export default async function NewThreadPage({ searchParams }: Props) {
  const { category: selectedId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fforum%2Fnew");
  const { data: categories, error } = await supabase.from("forum_categories").select("id,name").eq("is_active", true).order("sort_order").limit(50);
  return <PageFrame className="ui-stack forum-shell"><nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/forum">Forum</Link><span aria-hidden="true"> / </span><span>New discussion</span></nav>
    <PageIntro title="Start a discussion" description="Share a question or perspective with the community. Please follow the category posting rules." />
    {error ? <Notice role="status" tone="warning">Categories could not be loaded. Please try again later.</Notice> : !categories?.length ? <EmptyPanel title="No active categories" description="A discussion cannot be started until a moderator publishes a category." /> : <>
      <NewThreadForm categories={categories} selectedId={categories.some((item) => item.id === selectedId) ? selectedId ?? "" : ""} />
    </>}
  </PageFrame>;
}
