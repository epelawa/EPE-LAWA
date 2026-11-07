import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "./icons";

export default function AccountShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="auth-page"><aside className="auth-story"><p className="ui-eyebrow">A shared home for Epe</p><div><p className="auth-story__title">A little closer.<br /><em>A lot more connected.</em></p><p className="auth-story__copy">Local stories, shared knowledge, and conversations with the people who make this place home.</p></div><Link className="ui-text-link" href="/about">Get to know EPE LAWA <ArrowUpRightIcon size={16} aria-hidden="true" /></Link></aside><div className="auth-card"><p className="ui-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-description">{description}</p>{children}</div></section>;
}
