import type { Metadata } from "next";
import NewsletterAvailabilityPage from "../../../components/newsletter-availability-page";
import { pageMetadata } from "../../../lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Newsletter unsubscribe unavailable",
    description: "Newsletter preferences cannot be changed here; no email address is collected.",
    path: "/newsletter/unsubscribe",
  }),
  robots: { index: false, follow: true },
};

export default function NewsletterUnsubscribePage() {
  return <NewsletterAvailabilityPage mode="unsubscribe" />;
}
