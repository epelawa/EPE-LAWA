import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageIntro, Panel } from "../../../components/design-system";
import ConfirmForm from "./confirm-form";
export const metadata: Metadata = { title: "Confirm newsletter", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const value = (await searchParams).token;
  const token = typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : "";
  return <PageFrame className="ui-stack"><PageIntro title="Confirm your subscription" description="Confirm only if you requested the EPE LAWA newsletter." /><Panel className="ui-stack">
    {token && process.env.NEWSLETTER_SIGNUP_ENABLED === "true" ? <ConfirmForm token={token} /> : <p>This link is invalid, expired, or confirmation is temporarily unavailable.</p>}
    <Link href="/news" className="ui-text-link">Back to News</Link>
  </Panel></PageFrame>;
}
