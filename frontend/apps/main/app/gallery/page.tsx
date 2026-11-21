import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "../../lib/supabase";
import { ImageIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, TextLink } from "../../components/design-system";
import GalleryLightboxGrid, { type LightboxPhoto } from "./lightbox-grid";
import styles from "./gallery.module.css";

export const metadata: Metadata = { title: "Gallery", description: "A source-credited visual archive of Epe." };

type GalleryPhoto = {
  id: string;
  title: string;
  credit: string | null;
  alt_text: string | null;
  provider: string;
  bucket: string;
  object_key: string;
  created_at: string;
};

function photoUrl(photo: GalleryPhoto, r2Base: string): string | null {
  if (photo.provider === "external") return photo.object_key;
  if (photo.provider === "r2" && r2Base) return `${r2Base.replace(/\/+$/, "")}/${photo.object_key.replace(/^\/+/, "")}`;
  return null;
}

export default async function GalleryPage() {
  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "";
  let photos: GalleryPhoto[] = [];
  let failed = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("media_assets")
      .select("id,title,credit,alt_text,provider,bucket,object_key,created_at")
      .eq("kind", "gallery")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) failed = true;
    else photos = (data ?? []) as GalleryPhoto[];
  } catch {
    failed = true;
  }

  return (
    <PageFrame className={styles.page}>
      <PageIntro
        eyebrow="The visual archive"
        title={<>Epe,<br />through a local lens.</>}
        description="A considered home for photographs from across Epe, published with a source and credit for every image."
        meta={<StatusBadge tone={photos.length ? "success" : "warning"}>{photos.length ? "Published photographs" : "Archive not yet published"}</StatusBadge>}
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

      {photos.length > 0 ? (
        <section className={styles.archiveSection} aria-labelledby="gallery-archive-title">
          <SectionHeading eyebrow="Now showing" title="Photographs of Epe" id="gallery-archive-title" />
          {(() => {
            const withUrl: LightboxPhoto[] = [];
            const withoutUrl: GalleryPhoto[] = [];
            for (const photo of photos) {
              const url = photoUrl(photo, r2Base);
              if (url) withUrl.push({ id: photo.id, title: photo.title, credit: photo.credit, alt: photo.alt_text ?? photo.title, url });
              else withoutUrl.push(photo);
            }
            return (
              <>
                {withUrl.length ? <GalleryLightboxGrid photos={withUrl} /> : null}
                {withoutUrl.length ? (
                  <ul className={styles.archiveGrid}>
                    {withoutUrl.map((photo) => (
                      <li key={photo.id} className={styles.archivedPhoto}>
                        <div className={styles.archivePlaceholder} aria-hidden="true"><ImageIcon size={24} /></div>
                        <div className={styles.archiveCaption}>
                          <strong>{photo.title}</strong>
                          <span>{photo.credit ? `Photograph by ${photo.credit}` : "Credit on record"}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            );
          })()}
          <p className="ui-muted">Every photograph is checked for licence and credit before it appears here.</p>
        </section>
      ) : (
        <Panel className={styles.emptyPanel}>
          <EmptyPanel
            icon={<ImageIcon size={24} />}
            title={failed ? "The gallery could not be loaded" : "No photographs have been published"}
            description={failed ? "The archive is temporarily unavailable — please try again in a moment." : "The EPE LAWA gallery is waiting for an approved, credited collection. This is an honest empty state, not a missing feed."}
            actions={
              <div className="ui-actions">
                <Link href="/photo-credits" className="btn-secondary">Read photo credits</Link>
                <Link href="/tourism" className="btn-secondary">Explore places in Epe</Link>
              </div>
            }
          />
        </Panel>
      )}
    </PageFrame>
  );
}
