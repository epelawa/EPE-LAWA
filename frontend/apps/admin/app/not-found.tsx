import Link from "../components/admin-link";
import { EmptyPanel, PageFrame, PageIntro } from "@epelawa/ui";
import { adminHref } from "../lib/admin-path";

export default function NotFound() {
  return <PageFrame>
    <PageIntro title="Page not found" description="This workspace address may have changed or may not exist." />
    <EmptyPanel
      title="Find your workspace"
      description="Return to the dashboard and choose a section from the staff navigation."
      actions={<Link href={adminHref("/")} className="btn-secondary">Return to dashboard</Link>}
    />
  </PageFrame>;
}
