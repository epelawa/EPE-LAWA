import type { Metadata } from "next";
import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import LoginForm from "./login-form";
export const metadata: Metadata = { title: "Admin sign in | EPE LAWA", robots: { index: false, follow: false, noarchive: true } };
export default function LoginPage() {
  return <PageFrame className="admin-login">
    <PageIntro eyebrow="EPE LAWA staff" title="Admin sign in" description="Sign in with your authorised staff account." />
    <Panel className="admin-login__panel"><p className="ui-muted" style={{margin:0}}>Staff access is limited to authorised accounts. Your permissions determine which workspace areas are available.</p><LoginForm /></Panel>
  </PageFrame>;
}
