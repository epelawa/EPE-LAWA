import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "../../components/enquiry-form";
import { PageFrame } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
import styles from "./advertise.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Advertise with EPE LAWA",
  description: "Advertising information and current sponsorship enquiry availability for EPE LAWA.",
  path: "/advertise",
});

export default function AdvertisePage() {
  return (
    <>
      <PageFrame className={`${styles.page} ui-stack`}>
        <header className={styles.hero}>
          <h1>Advertise with EPE LAWA</h1>
          <p>Reach Epe readers, listeners and community members with a clearly labelled placement.</p>
        </header>
        <section className={styles.panel} aria-labelledby="placements-heading">
          <div className={styles.panelHeading}>
            <div>
              <h2 id="placements-heading">Build a useful presence in Epe</h2>
            </div>
            <span className={styles.statusBadge}>{process.env.ENQUIRY_INTAKE_ENABLED === "true" ? "Enquiries open" : "Enquiries unavailable"}</span>
          </div>
          <p>Contact our team to discuss your business and advertising needs.</p>
          {process.env.ENQUIRY_INTAKE_ENABLED === "true" ? <EnquiryForm kind="advertising" /> : <div className={styles.notice} role="status">
            <strong>Online enquiry intake is not connected.</strong>
            <span>This page does not collect or store contact details. We will enable enquiries only after a secure delivery channel is configured.</span>
          </div>}
          <div className={styles.links}>
            <Link href="/privacy">Read the privacy notice</Link>
            <Link href="/news">Return to News</Link>
          </div>
        </section>
      </PageFrame>
    </>
  );
}
