import { bodyParagraphs, inlineWordDiff, paragraphDiff } from "../../../../lib/revision-diff";

export type RevisionVersion = {
  id: string;
  version_number: number;
  title: string;
  summary: string | null;
  body: unknown;
  state: string;
  created_at: string;
};

function InlineDiff({ parts }: { parts: { text: string; kind: string }[] }) {
  return <p className="revision-diff-inline">
    {parts.map((part, index) => part.kind === "same"
      ? <span key={index}>{part.text}</span>
      : <span key={index} className={part.kind === "added" ? "revision-add" : "revision-remove"}>{part.text}</span>)}
  </p>;
}

export default function RevisionDiffView({ before, after }: { before: RevisionVersion; after: RevisionVersion }) {
  const titleDiff = inlineWordDiff(before.title, after.title);
  const summaryDiff = before.summary || after.summary
    ? inlineWordDiff(before.summary ?? "", after.summary ?? "")
    : null;
  const bodyOps = paragraphDiff(bodyParagraphs(before.body), bodyParagraphs(after.body));
  const changed = bodyOps.filter((op) => op.kind !== "same");
  const unchangedCount = bodyOps.length - changed.length;

  return <div className="revision-diff ui-stack-sm">
    <div>
      <h3>Headline</h3>
      <InlineDiff parts={titleDiff.words} />
      {titleDiff.truncated ? <p className="ui-meta">Headline diff truncated at 800 words.</p> : null}
    </div>
    {summaryDiff ? <div>
      <h3>Summary</h3>
      <InlineDiff parts={summaryDiff.words} />
      {summaryDiff.truncated ? <p className="ui-meta">Summary diff truncated at 800 words.</p> : null}
    </div> : null}
    <div>
      <h3>Body</h3>
      {changed.length === 0
        ? <p className="ui-meta">The body paragraphs are identical between these two versions.</p>
        : <div className="ui-stack-sm">
          {changed.map((op, index) => <p key={index} className={op.kind === "added" ? "revision-paragraph revision-paragraph-added" : "revision-paragraph revision-paragraph-removed"}>
            <span className="revision-marker" aria-hidden="true">{op.kind === "added" ? "+" : "−"}</span> {op.text}
          </p>)}
          {unchangedCount > 0 ? <p className="ui-meta">{unchangedCount} unchanged paragraph{unchangedCount === 1 ? "" : "s"} hidden.</p> : null}
        </div>}
    </div>
  </div>;
}
