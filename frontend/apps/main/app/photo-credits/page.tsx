import { NEWS_COVERS } from "../../lib/news-covers";
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
      <article className="ui-prose" id="news-photos" aria-label="News photo attributions">
        <h2>News photographs</h2>
        <p>These photographs are illustrative and are not evidence of the events described in the stories.</p>
        <ul>{Object.values(NEWS_COVERS).map((image) => <li key={image.url}><strong>{image.title}</strong> — Photo by {image.author}, via Wikimedia Commons. <a href={image.source} rel="noreferrer">Source and attribution</a>. <a href={image.license} rel="license noreferrer">CC BY-SA 4.0</a>. No image edits.</li>)}</ul>
      </article>
      <article className="ui-prose" aria-label="Homepage photo attributions">
        <h2>Homepage gallery</h2>
        <ol>
          {heroImages.map((image) => (
            <li key={image.slug}>
              <strong>{image.label}</strong> — Photo by {image.author}. <a href={image.source} rel="noreferrer">Source page</a>. License: <a href={image.licenseUrl} rel="license noreferrer">{image.license}</a>.
            </li>
          ))}
        </ol>
      </article>
    </PageFrame>
  );
}
