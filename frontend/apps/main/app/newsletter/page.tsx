import type { Metadata } from "next";
import { PageFrame, PageIntro, Panel } from "../../components/design-system";
import NewsletterForm from "../../components/newsletter-form";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "EPE LAWA Newsletter",
    description: "Newsletter information and subscription management.",
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
        description={process.env.NEWSLETTER_SIGNUP_ENABLED === "true" ? "Confirm your email to receive reporting and community updates." : "Sign-up is temporarily unavailable while subscription security is improved. Existing unsubscribe links remain available."}
      />
      <Panel className="ui-stack">
        <NewsletterForm id="newsletter-page-signup" />
      </Panel>
    </PageFrame>
  );
}
