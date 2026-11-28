import Link from "next/link";
import type { ReactNode } from "react";
import { PageFrame, PageIntro } from "./design-system";
export default function InformationPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <PageFrame><PageIntro title={title} description={description}/><div className="info-layout"><aside className="info-aside"><p>Useful to know.</p><nav aria-label="Information pages"><Link href="/about">About EPE LAWA</Link><Link href="/guidelines">Community guidelines</Link><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms of use</Link><Link href="/contact">Contact availability</Link></nav></aside><article className="info-content"><div className="ui-prose">{children}</div></article></div></PageFrame>;
}
