import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "../../components/enquiry-form";
import { PageFrame } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";
import styles from "./advertise.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Advertise with EPE LAWA",
  description: "Advertising information and current enquiry availability for EPE LAWA.",
  path: "/advertise",
});

export default function AdvertisePage() {
  return (
    <>
      <PageFrame className={`${styles.page} ui-stack`}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>EPE LAWA · PARTNERSHIPS</p>
          <h1>Advertise with EPE LAWA</h1>
          <p>Information for organisations exploring a clearly labelled placement across EPE LAWA.</p>
        </header>
        <section className={styles.panel} aria-labelledby="placements-heading">
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>CURRENT STATUS</p>
              <h2 id="placements-heading">Advertising details are being prepared</h2>
            </div>
            <span className={styles.statusBadge}>{process.env.ENQUIRY_INTAKE_ENABLED === "true" ? "Enquiries open" : "Enquiries unavailable"}</span>
          </div>
          <p>Placement formats, rates and terms will be listed here once approved. No audience figures or prices are published on this page.</p>
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
