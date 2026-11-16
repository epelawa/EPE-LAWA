import Link from "next/link";
import type { Metadata } from "next";
import { PageFrame, PageIntro, Panel } from "../../../components/design-system";
import { RadioReminderSettings } from "../../../components/radio-reminder";
import { pageMetadata } from "../../../lib/metadata";

export const metadata: Metadata = pageMetadata({ title: "Radio alerts", description: "Manage radio reminders on this browser.", path: "/radio/reminders" });

export default function RadioRemindersPage() {
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="EPE LAWA RADIO" title="Radio alerts" description="Manage your reminder on this browser." />
    <Panel><RadioReminderSettings /></Panel>
    <Link href="/radio" className="ui-text-link">Back to radio</Link>
  </PageFrame>;
}
