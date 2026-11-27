import { createStaffClient } from "../../../lib/supabase";
import {  PageFrame, PageIntro, Notice, SubmitButton } from "@epelawa/ui";
import { saveLegalPage } from "./actions";
import RichTextEditor from "../../../components/rich-text-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SitePageRow = { page: string; body: string; revision: number; updated_at: string };

const LEGAL = [
  {
    key: "privacy",
    label: "Privacy notice",
    hint: "The note shown at the top of the public /privacy page, above the full policy. Supports bold (…**bold**…), italic (*…*), bullet lists (- item), numbered lists (1. item), quotes (> text) and links [text](https://address).",
  },
  {
    key: "terms",
    label: "Terms of use",
    hint: "The note shown at the top of the public /terms page, above the full terms. Same formatting as the privacy notice.",
  },
  {
    key: "guidelines",
    label: "Community guidelines",
    hint: "The note shown at the top of the public /guidelines page. Same formatting as the privacy notice.",
  },
];

const STATUS: Record<string, { tone: "success" | "danger"; text: string }> = {
  saved: { tone: "success", text: "Saved. The public legal page is updated." },
  error: { tone: "danger", text: "The legal page could not be saved. Check the message and try again." },
};
const REASONS: Record<string, string> = {
  unknown_page: "That legal page is not editable.",
  body_too_long: "The text is too long. Keep it within the stated limit.",
  revision_conflict: "The page changed while you were editing. Open it again and apply your text once more.",
  failed: "The legal page could not be saved. Reload and try again.",
};

export default async function LegalPagesPage({ searchParams }: { searchParams: Promise<{ status?: string; reason?: string }> }) {
  const params = await searchParams;
  let rows: SitePageRow[] = [];
  let failed = false;
  const db = await createStaffClient();
  {
    const { data, error } = await db.from("site_pages").select("page,body,revision,updated_at").in("page", ["privacy", "terms", "guidelines"]);
    if (error) failed = true;
    else rows = (data ?? []) as SitePageRow[];
  }
  const status = params.status && STATUS[params.status] ? STATUS[params.status] : null;
  const reasonText = params.status === "error" && params.reason ? REASONS[params.reason] ?? REASONS.failed : null;

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff workspace" title="Legal pages" description="Maintain the notes published on the Privacy, Terms and Community guidelines pages. The full policy text on each legal page is fixed and reviewed; these notes carry your current announcements and clarifications." />
    {status ? <Notice role="status" tone={status.tone}>{status.tone === "success" ? STATUS.saved.text : reasonText ?? STATUS.error.text}</Notice> : null}
    {failed ? <Notice role="alert" tone="danger">The legal pages could not be loaded. Refresh the page to try again.</Notice> : LEGAL.map((legal) => {
      const row = rows.find((r) => r.page === legal.key) ?? null;
      return (
        <section className="ui-stack" id={`page-${legal.key}`} key={legal.key}>
          <h2>{legal.label}</h2>
          <p className="ui-muted">{legal.hint}</p>
          <form className="ui-stack" action={saveLegalPage} id={`form-${legal.key}`}>
            <input type="hidden" name="page" value={legal.key} />
            <input type="hidden" name="revision" value={row?.revision ?? 0} />
            <RichTextEditor name="body" rows={14} defaultValue={row?.body ?? ""} maxLength={50000} ariaLabel={`${legal.label} text`} />
            <p className="ui-meta">{row ? `Last saved ${new Date(row.updated_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })} · revision ${row.revision}. The editor opens with the text currently live on the page.` : "No note is saved yet, so the page currently shows only the full policy. The editor starts empty — write the note you want visitors to read above it."}</p>
            <div className="ui-actions">
              <SubmitButton pendingLabel="Saving…" className="btn-primary" useLegacyClasses>Save {legal.label.toLowerCase()}</SubmitButton>
              <button className="btn-ghost" type="reset">Clear form</button>
            </div>
          </form>
        </section>
      );
    })}
  </PageFrame>;
}
