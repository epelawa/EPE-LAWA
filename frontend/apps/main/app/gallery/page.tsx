import Link from "next/link";
import { ImageIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, TextLink } from "../../components/design-system";
import styles from "./gallery.module.css";

export const metadata = { title: "Gallery", description: "A source-credited visual archive of Epe." };

export default function GalleryPage() {
  return (
    <PageFrame className={styles.page}>
      <PageIntro
        eyebrow="The visual archive"
        title={<>Epe,<br />through a local lens.</>}
        description="A considered home for photographs from across Epe, published with a source and credit for every image."
        meta={<StatusBadge tone="warning">Archive not yet published</StatusBadge>}
        actions={<TextLink href="/photo-credits">View photo credits</TextLink>}
      />

      <section className={styles.intro} aria-labelledby="gallery-standard-title">
        <div className={styles.introHeading}>
          <p className="ui-eyebrow">Our standard</p>
          <h2 id="gallery-standard-title">A beautiful archive starts with responsible sourcing.</h2>
        </div>
        <div className="ui-prose">
          <p>Images appear here only after their licence, source, credit and public use have been checked. We will not fill the archive with unverified or unlicensed material.</p>
          <p>Until that review is complete, this page stays intentionally quiet.</p>
        </div>
      </section>

      <Panel className={styles.emptyPanel}>
        <EmptyPanel
          icon={<ImageIcon size={24} />}
          title="No photographs have been published"
          description="The EPE LAWA gallery is waiting for an approved, credited collection. This is an honest empty state, not a missing feed."
          actions={
            <div className="ui-actions">
              <Link href="/photo-credits" className="btn-secondary">Read photo credits</Link>
              <Link href="/tourism" className="btn-secondary">Explore places in Epe</Link>
            </div>
          }
        />
      </Panel>
    </PageFrame>
  );
}
