import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageIntro, Panel } from "../../../components/design-system";
import CorrectionForm from "./correction-form";
import { currentSubmitterHint } from "../../../lib/public-submitter";
import { ArrowRightIcon } from "../../../components/icons";
import styles from "./correction.module.css";

export const metadata: Metadata = {
  title: "Request a correction · Ìtàn Ilú Mi",
  description: "Ask EPE LAWA staff to correct or remove a published Ìtàn Ilú Mi history record. Requests are private and never published.",
  alternates: { canonical: "/itan-ilu-mi/correction" },
};

export const dynamic = "force-dynamic";

/**
 * Correction and removal requests for published history records. Requests go
 * to the private `history_correction_requests` queue shown on the staff
 * Ìtàn Ilú Mi review page, and are never published automatically.
 */
export default async function HistoryCorrectionPage({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const params = await searchParams;
  const who = await currentSubmitterHint();
  const record = typeof params.record === "string" ? params.record.slice(0, 300) : "";
  return <PageFrame className={`${styles.page} ui-stack`}>
    <Link className={styles.back} href="/itan-ilu-mi"><ArrowRightIcon size={18} className={styles.backIcon} aria-hidden /> Back to Ìtàn Ilú Mi</Link>
    <PageIntro title="Correction and removal requests" description="Point us to what is wrong in a published history record, or ask for a record about you or your family to be removed. Requests go to a private staff queue and are never published; we reply by email after checking." />
    <ol className={styles.steps} aria-label="What happens next">
      <li><strong>You send the request.</strong> Name the record and explain what should change.</li>
      <li><strong>Staff review it privately.</strong> We check the sources you point to.</li>
      <li><strong>We reply by email.</strong> Nothing changes on the site until staff approve it.</li>
    </ol>
    <Panel className="ui-stack-sm"><CorrectionForm accountEmail={who.email} defaultRecord={record} /></Panel>
  </PageFrame>;
}
