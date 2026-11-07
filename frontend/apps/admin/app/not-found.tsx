import Link from "next/link";
import { EmptyPanel, PageFrame, PageIntro } from "@epelawa/ui";
export default function NotFound() { return <PageFrame><PageIntro eyebrow="Staff workspace · 404" title="Page not found" description="This workspace address may have changed or may not exist."/><EmptyPanel title="Find your workspace" description="Return to the dashboard and choose a section from the staff navigation." actions={<Link href="/" className="btn-secondary">Return to dashboard</Link>}/></PageFrame>; }
