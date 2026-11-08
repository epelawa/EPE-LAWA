import LinkIssueView from "../link-issue-view";

export const metadata = {
  title: "Email link problem",
  robots: { index: false, follow: false },
};

export default function LinkProblemPage() {
  return <LinkIssueView expired={false} />;
}
