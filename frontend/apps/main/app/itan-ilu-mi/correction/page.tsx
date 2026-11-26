import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageIntro, Panel, Notice } from "../../../components/design-system";
import EnquiryForm from "../../../components/enquiry-form";
import { ArrowRightIcon } from "../../../components/icons";
import styles from "./correction.module.css";

export const metadata: Metadata = {
  title: "Request a correction · Ìtàn Ilú Mi",
  description: "Ask EPE LAWA staff to correct or remove a published Ìtàn Ilú Mi history record. Requests are private and never published.",
  alternates: { canonical: "/itan-ilu-mi/correction" },
};

/**
 * Correction and removal requests for published history records. Uses the
 * private enquiry channel (server-side validation, Turnstile, rate limiting and
 * duplicate-safe submission); requests go to the staff queue and are never
 * published automatically.
 */
export default function HistoryCorrectionPage() {
  const enabled = process.env.ENQUIRY_INTAKE_ENABLED === "true";
  return <PageFrame className={`${styles.page} ui-stack`}>
    <Link className={styles.back} href="/itan-ilu-mi"><ArrowRightIcon size={18} className={styles.backIcon} aria-hidden /> Back to Ìtàn Ilú Mi</Link>
    <PageIntro eyebrow="Fix the record" title="Correction and removal requests" description="Point us to what is wrong in a published history record, or ask for a record about you or your family to be removed. Requests go to a private staff queue and are never published; we reply by email after checking." />
    <ol className={styles.steps} aria-label="What happens next">
      <li><strong>You send the request.</strong> Name the record and explain what should change.</li>
      <li><strong>Staff review it privately.</strong> We check the sources you point to.</li>
      <li><strong>We reply by email.</strong> Nothing changes on the site until staff approve it.</li>
    </ol>
    {enabled
      ? <Panel className="ui-stack-sm"><EnquiryForm kind="correction" privacyHref="/privacy" messageLabel="Which record needs correcting or removing, and what should change? Include the record title and any source we can check." /></Panel>
      : <Notice tone="warning" role="status">The correction form is temporarily unavailable. Please check back later; nothing can be submitted right now.</Notice>}
  </PageFrame>;
}
