import heroImages from "../../lib/hero-images.json";
import { PageFrame, PageIntro } from "../../components/design-system";

export const metadata = {
  title: "Photo credits | EPE LAWA",
  description: "Photographers, source pages and license details for photographs featured on EPE LAWA.",
};

export default function PhotoCreditsPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Image acknowledgements" title="Photo credits" description="Photographs in the homepage gallery are credited below. Each entry links to its source and license; images remain under the terms stated by their creators." />
      <article className="ui-prose" aria-label="Homepage photo attributions">
        <h2>Homepage gallery</h2>
        <ol>
          {heroImages.map((image) => (
            <li key={image.slug}>
              <strong>{image.label}</strong> — Photo by {image.author}. <a href={image.source} rel="noreferrer">Source page</a>. License: <a href={image.licenseUrl} rel="license noreferrer">{image.license}</a>.
            </li>
          ))}
        </ol>
        <h2>News story pictures</h2>
        <p>Each story credits its own cover under the picture. On stories written by the EPE LAWA AI desk the cover is one of: a <strong>file photo</strong> taken from a public report the story is based on (checked so that no outlet logo or branding is used); a <strong>freely licensed photo</strong> from Wikimedia Commons, credited to its author with a link to its license; or an <strong>AI-generated illustration</strong>, labelled as such, which shows the subject of the story rather than the actual event. When none is suitable, the site&apos;s own fallback image is shown.</p>
        <p>If you own a picture used here and want it credited differently or removed, open a <a href="/support">support ticket</a> with the story link.</p>
      </article>
    </PageFrame>
  );
}
