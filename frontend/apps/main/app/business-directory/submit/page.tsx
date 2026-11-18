import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import BusinessForm from "./business-form";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel } from "../../../components/design-system";
export const metadata: Metadata = { title: "Submit a business" };
export default async function Page({ searchParams }: { searchParams: Promise<{ submission_error?: string; submitted?: string }> }) {
  const p = await searchParams, db = await createClient();
  const { data: cats, error } = await db.from("business_categories").select("id,label").eq("is_active", true).order("sort_order").limit(50);
  return <PageFrame className="ui-stack"><nav className="ui-meta" aria-label="Breadcrumb"><Link className="ui-back-link" href="/business-directory">Business directory</Link><span aria-hidden="true">/</span><span>Submit a listing</span></nav><PageIntro eyebrow="Community listings" title="Submit your business" description="Email-verified active member access is required. Listings remain unpublished until staff review." />
    {p.submitted ? <Notice role="status" tone="success">Submission received. Your listing is unpublished and awaits staff review.</Notice> : p.submission_error ? <Notice role="alert" tone="danger">{p.submission_error}</Notice> : null}
    {error || !cats?.length ? <EmptyPanel title="Categories are unavailable" description="Submissions cannot be accepted right now. Please try again later." /> : <Panel className="ui-card"><BusinessForm categories={cats} /></Panel>}
  </PageFrame>;
}
