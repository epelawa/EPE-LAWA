import type { Metadata } from "next";
import NewsletterAvailabilityPage from "../../components/newsletter-availability-page";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Newsletter sign-up unavailable",
    description: "Newsletter subscription is not configured; no email address is collected.",
    path: "/newsletter",
  }),
  robots: { index: false, follow: true },
};

export default function NewsletterSignupPage() {
  return <NewsletterAvailabilityPage mode="signup" />;
}
