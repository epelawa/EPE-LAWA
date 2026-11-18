import type { Metadata } from "next";
import { PageFrame, PageIntro, Panel } from "../../components/design-system";
import NewsletterForm from "../../components/newsletter-form";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "EPE LAWA Newsletter",
    description: "Subscribe to reporting and community updates from Epe.",
    path: "/newsletter",
  }),
  robots: { index: false, follow: true },
};

export default function NewsletterSignupPage() {
  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="EPE LAWA NEWSLETTER"
        title="Keep up with Epe."
        description="Get reporting and community updates in your inbox. Subscribe once, and unsubscribe from any newsletter email whenever you choose."
      />
      <Panel className="ui-stack">
        <NewsletterForm id="newsletter-page-signup" />
      </Panel>
    </PageFrame>
  );
}
