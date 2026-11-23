import { createStaffClient } from "../../../lib/supabase";
import {  PageFrame, PageIntro, Notice, SubmitButton } from "@epelawa/ui";
import { saveSitePage } from "./actions";
import RichTextEditor from "../../../components/rich-text-editor";
import UploadModalField from "../../../components/upload-modal-field";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type PhotoEntry = { url?: string; alt?: string; credit?: string };
type SitePageRow = { page: string; body: string; photos: PhotoEntry[]; revision: number; updated_at: string; updated_by: string | null };

const EDITABLE = [
  { key: "about", label: "About page", hint: "Shown to everyone on the About page. Use short paragraphs separated by a blank line, and upload the anchor/pioneer photos below." },
  { key: "privacy", label: "Privacy page notes", hint: "A short note shown above the full privacy policy." },
  { key: "terms", label: "Terms page notes", hint: "A short note shown above the full terms." },
  { key: "guidelines", label: "Community guidelines notes", hint: "A short note shown above the community guidelines." },
];

const STATUS: Record<string, { tone: "success" | "danger"; text: string }> = {
  saved: { tone: "success", text: "Saved. The public page is updated." },
  error: { tone: "danger", text: "The page could not be saved. Check the message and try again." },
};
const REASONS: Record<string, string> = {
  unknown_page: "That page is not editable.",
  body_too_long: "The text is too long. Keep it within the stated limit.",
  photos_invalid: "Each photo needs a description (3+ characters) and optional credit. Files must be JPEG, PNG, WebP or AVIF.",
  revision_conflict: "The page changed while you were editing. Open it again and apply your text once more.",
  unconfigured: "Image storage is not connected yet, so photo uploads are unavailable. Please link public HTTPS image addresses instead.",
  too_large: "A photo is larger than 10 MB.",
  invalid_file: "Only JPEG, PNG, WebP or AVIF photos can be uploaded.",
  storage_failed: "A photo could not be stored right now. Try again later.",
  failed: "The page could not be saved. Reload and try again.",
};

export default async function SitePagesPage({ searchParams }: { searchParams: Promise<{ status?: string; reason?: string }> }) {
  const params = await searchParams;
  let rows: SitePageRow[] = [];
  let failed = false;
  const db = await createStaffClient();
  {
    const { data, error } = await db.from("site_pages").select("*").order("page");
    if (error) failed = true;
    else rows = (data ?? []) as SitePageRow[];
  }
  const status = params.status && STATUS[params.status] ? STATUS[params.status] : null;
  const reasonText = params.status === "error" && params.reason ? REASONS[params.reason] ?? REASONS.failed : null;

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff workspace" title="Site pages" description="Edit the About page and add notes to the public pages. Text saves straight to the live page." />
    {status ? <Notice role="status" tone={status.tone}>{status.tone === "success" ? STATUS.saved.text : reasonText ?? STATUS.error.text}</Notice> : null}
    {failed ? <Notice role="alert" tone="danger">Site pages could not be loaded. Refresh the page to try again.</Notice> : EDITABLE.map((editable) => {
      const row = rows.find((r) => r.page === editable.key) ?? null;
      const photos: PhotoEntry[] = Array.isArray(row?.photos) ? row!.photos : [];
      return (
      <section className="ui-stack" id={`page-${editable.key}`} key={editable.key}>
        <h2>{editable.label}</h2>
        <p className="ui-muted">{editable.hint}</p>
        <form className="ui-stack" action={saveSitePage}>
          <input type="hidden" name="page" value={editable.key} />
          <input type="hidden" name="revision" value={row?.revision ?? 0} />
          <label className="ui-field"><span className="label sr-only">Text</span>
            <RichTextEditor name="body" rows={editorRows(editable.key)} maxLength={50000} defaultValue={row?.body ?? ""} ariaLabel={`${editable.label} text`} />
          </label>
          {editable.key === "about" ? (
            <fieldset className="ui-stack-sm">
              <legend>Anchor / pioneer photos</legend>
              {photos.length > 0 ? <ul className="ui-list">{photos.map((photo, index) => (
                <li className="ui-stack-sm" key={photo.url ?? index}>
                  <label className="ui-row"><input type="checkbox" name={`photoKeep${index + 1}`} defaultChecked /> Keep this photo</label>
                  <input type="hidden" name={`photoUrl${index + 1}`} value={photo.url ?? ""} />
                  <img src={photo.url ?? ""} alt={photo.alt ?? ""} width={120} height={80} style={{ objectFit: "cover", borderRadius: 8 }} />
                  <label className="ui-field"><span className="label">Photo description (what it shows)</span><input className="input" name={`photoAltKeep${index + 1}`} maxLength={500} defaultValue={photo.alt ?? ""} /></label>
                  <label className="ui-field"><span className="label">Photographer / credit (optional)</span><input className="input" name={`photoCreditKeep${index + 1}`} maxLength={300} defaultValue={photo.credit ?? ""} /></label>
                </li>
              ))}</ul> : null}
              <p className="ui-meta">Add up to 3 new photos. Each needs a short description of what it shows.</p>
              <div className="ui-stack-sm">
                {[1, 2, 3].map((slot) => (
                  <div className="ui-stack-sm" key={slot}>
                    <UploadModalField name={`photoFile${slot}`} label={`Photo ${slot} file`} accept="image/jpeg,image/png,image/webp,image/avif" hint="JPEG, PNG, WebP or AVIF. Add a short description of what the photo shows below." description={`Choose photo ${slot} for this page from your device.`} />
                    <label className="ui-field"><span className="label">Photo {slot} description (required if file chosen)</span><input className="input" name={`photoAlt${slot}`} maxLength={500} /></label>
                    <label className="ui-field"><span className="label">Photo {slot} credit (optional)</span><input className="input" name={`photoCredit${slot}`} maxLength={300} /></label>
                  </div>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="ui-actions"><SubmitButton pendingLabel="Publishing…" className="btn-primary" useLegacyClasses>Publish to the live page</SubmitButton><button className="btn-ghost" type="reset">Clear form</button></div>
          {row ? <p className="ui-meta">Last saved {new Date(row.updated_at).toLocaleString("en-NG")}. Version {row.revision}.</p> : <p className="ui-meta">This page has no saved edits yet; the text shows the current built-in content.</p>}
        </form>
      </section>
      );
    })}
  </PageFrame>;
}

function editorRows(page: string): number {
  return page === "about" ? 14 : 6;
}
