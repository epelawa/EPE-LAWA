import Link from "next/link";
import { Container, EmptyState, GalleryIcon, buttonClassName } from "@epelawa/ui";

/**
 * Gallery page.
 *
 * A place for photographs from across Epe Division. Nothing is published yet, so this
 * renders an honest empty state rather than invented imagery. Real photographs are licensed
 * and credited before they appear — never stock passed off as Epe.
 */
export default function GalleryPage() {
  return (
    <Container>
      <section className="page-header" aria-labelledby="gallery-heading">
        <h1 id="gallery-heading" className="page-header__title">Gallery</h1>
        <p className="page-header__lede">
          Photographs from across Epe Division. Nothing appears here until it has been
          licensed, sourced and credited.
        </p>
      </section>

      <section className="home-block">
        <div className="home-block__body">
          <EmptyState icon={<GalleryIcon size={24} />}>
            No photographs have been published yet.
          </EmptyState>
        </div>
      </section>

      <section className="trust">
        <p className="trust__text">
          Every photograph in this gallery will carry a credit and a source. Until EPE LAWA
          has licensed imagery of Epe Division, this page stays empty — a stock image of a
          generic waterfront presented as Epe would be a lie told in pixels.
        </p>
      </section>
    </Container>
  );
}
