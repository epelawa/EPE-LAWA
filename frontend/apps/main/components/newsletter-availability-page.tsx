import Link from "next/link";
import { Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "./design-system";

type Mode = "signup" | "unsubscribe";

export default function NewsletterAvailabilityPage({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";
  const title = isSignup ? "Newsletter sign-up is unavailable." : "Newsletter unsubscribe is unavailable.";
  const description = isSignup
    ? "EPE LAWA does not yet have a verified newsletter subscription service."
    : "EPE LAWA cannot manage newsletter preferences until a complete service is available.";
  const sectionTitle = isSignup ? "This page does not accept email addresses." : "This page cannot change a subscription.";
  const detail = isSignup
    ? "Persistent subscription storage, authorized email delivery, unsubscribe handling and abuse controls have not all been implemented and tested. No signup is created here."
    : "A verified subscription store and unsubscribe process are not configured. This page cannot identify an address or change mailing preferences.";
  const notice = isSignup
    ? "Do not enter or send an email address for newsletter sign-up here. There is no form, and this page collects or sends nothing."
    : "There is no email field and no unsubscribe request is submitted or stored here. If a message came from another provider, use that message’s own unsubscribe link.";

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="EPE LAWA Newsletter"
        title={title}
        description={description}
        meta={<StatusBadge tone="warning">Unavailable</StatusBadge>}
      />
      <Panel className="ui-stack">
        <SectionHeading title={sectionTitle} description={detail} />
        <Notice tone="warning">{notice}</Notice>
        <div className="ui-actions">
          {isSignup ? <Link className="ui-text-link" href="/newsletter/unsubscribe">Unsubscribe availability</Link> : <Link className="ui-text-link" href="/newsletter">Sign-up availability</Link>}
          <Link className="ui-text-link" href="/privacy">Read the privacy notice</Link>
          <Link className="ui-text-link" href="/news">Return to News</Link>
        </div>
      </Panel>
    </PageFrame>
  );
}
