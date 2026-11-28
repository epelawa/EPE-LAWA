import Link from "next/link";
import type { Metadata } from "next";
import { PageFrame, PageIntro, Panel } from "../../../components/design-system";
import { RadioReminderSettings } from "../../../components/radio-reminder";
import { pageMetadata } from "../../../lib/metadata";

export const metadata: Metadata = pageMetadata({ title: "Radio notifications", description: "Get a push notification when EPE LAWA Radio goes on air.", path: "/radio/reminders" });

export default function RadioRemindersPage() {
  return <PageFrame className="ui-stack">
    <PageIntro title="Radio notifications" description="Get told the moment EPE LAWA Radio goes on air." />
    <Panel><RadioReminderSettings /></Panel>
    <Link href="/radio" className="ui-text-link">Back to radio</Link>
  </PageFrame>;
}
