import LinkIssueView from "../link-issue-view";

export const metadata = {
  title: "Email link expired",
  robots: { index: false, follow: false },
};

export default function ExpiredLinkPage() {
  return <LinkIssueView expired />;
}
