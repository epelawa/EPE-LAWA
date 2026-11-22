import type { Metadata } from "next";
import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { safeAdminNextPath } from "../../lib/admin-path";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in | EPE LAWA",
  robots: { index: false, follow: false, noarchive: true },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const nextValue = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = safeAdminNextPath(nextValue);
  const reason = Array.isArray(query.reason) ? query.reason[0] : query.reason;

  return <PageFrame className="admin-login">
    <PageIntro eyebrow="EPE LAWA staff" title="Admin sign in" description="Sign in with your authorised staff account." />
    <Panel className="admin-login__panel">
      {reason === "inactivity" ? <p className="ui-notice ui-notice--warning" role="status">Your staff session ended after ten hours without activity. Sign in again to continue.</p> : null}
      {reason === "session_expired" ? <p className="ui-notice ui-notice--warning" role="status">Your sign-in on the server had ended. Sign in again and your session token is refreshed automatically.</p> : null}
      <p className="ui-muted" style={{ margin: 0 }}>Staff access is limited to authorised accounts. Your permissions determine which workspace areas are available.</p>
      <LoginForm nextPath={nextPath} />
    </Panel>
  </PageFrame>;
}
