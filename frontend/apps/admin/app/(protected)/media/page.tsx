import { createStaffClient } from "../../../lib/supabase";
import {  EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { addGalleryPhoto, removeGalleryPhoto } from "./actions";
import ConfirmSubmit from "../../../components/confirm-submit";

export const dynamic = "force-dynamic";

type Photo = {
  id: string;
  title: string;
  credit: string | null;
  alt_text: string | null;
  provider: string;
  bucket: string;
  object_key: string;
  is_public: boolean;
  created_at: string;
};

const input = "input";
const label = "label ui-field";

function photoUrl(photo: Photo, r2Base: string): string | null {
  if (photo.provider === "external") return photo.object_key;
  if (photo.provider === "r2" && r2Base) return `${r2Base.replace(/\/+$/, "")}/${photo.object_key.replace(/^\/+/, "")}`;
  return null;
}

export default async function MediaAdminPage({ searchParams }: { searchParams: Promise<{ media?: string }> }) {
  const params = await searchParams;
  const messages: Record<string, { role: "status" | "alert"; text: string }> = {
    added: { role: "status", text: "Photograph added to the gallery." },
    removed: { role: "status", text: "Photograph removed from the gallery." },
    denied: { role: "alert", text: "You are not authorized to manage gallery photographs. The site.content capability is required." },
    invalid: { role: "alert", text: "Check the photograph details: a title, alt text of at least 5 characters, an HTTPS image address, and a rights/source note of at least 5 characters are required." },
    missing: { role: "alert", text: "That photograph was already removed. Reload the page." },
    add: { role: "alert", text: "The photograph could not be added. Try again in a moment." },
    remove: { role: "alert", text: "The photograph could not be removed. Try again in a moment." },
  };
  const message = params.media ? messages[params.media] : null;
  const db = await createStaffClient();
  const { data: allowed, error: capabilityError } = await db.rpc("has_capability", { p_capability: "site.content" });
  if (capabilityError || allowed !== true) {
    return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="Gallery & media" description="The public photo archive and media records." /><Notice tone="danger" role="alert">The site.content capability is required. No records are shown.</Notice></PageFrame>;
  }

  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "";
  const { data: photosData, error: photosError } = await db.from("media_assets").select("id,title,credit,alt_text,provider,bucket,object_key,is_public,created_at").eq("kind", "gallery").order("created_at", { ascending: false }).limit(200);
  const photos = (photosData ?? []) as Photo[];

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Staff workspace · Media"
        title="Gallery & media"
        description="Publish photographs to the public gallery with a source and a credit for every image. Delete a photograph to withdraw it from the archive."
        meta={<span>Public page: /gallery</span>}
      />
      {message ? <Notice tone={message.role === "alert" ? "danger" : "success"} role={message.role} aria-live={message.role === "alert" ? "assertive" : "polite"}>{message.text}</Notice> : null}
      {photosError ? <EmptyPanel title="Media records unavailable" description="The gallery records could not be loaded. Reload the page to try again." /> : (
        <>
          <section className="ui-stack-sm" aria-labelledby="gallery-add-title">
            <SectionHeading eyebrow="Publish" title="Add a photograph" id="gallery-add-title" />
            <Panel className="ui-stack-sm">
              <form action={addGalleryPhoto} className="ui-stack-sm">
                <div className="ui-form-grid">
                  <label className={label}>Title<input className={input} name="title" required minLength={2} maxLength={160} placeholder="E.g. Sunset over the lagoon" /></label>
                  <label className={label}>Credit<input className={input} name="credit" maxLength={300} placeholder="Who made or owns the photograph" /></label>
                </div>
                <label className={label}>Alt text <span className="ui-meta">Describe the image for screen readers (5–300 characters)</span><textarea className={input} name="alt_text" required minLength={5} maxLength={300} /></label>
                <label className={label}>Image address (HTTPS)<input className={input} name="media_url" required type="url" pattern="https://.*" placeholder="https://…" /></label>
                <label className={label}>Rights / source note (private)<textarea className={input} name="rights_note" required minLength={5} maxLength={2000} placeholder="Where this image came from and why it may be used" /></label>
                <div className="ui-actions">
                  <SubmitButton pendingLabel="Adding…" className="btn-primary w-fit" useLegacyClasses>Add to gallery</SubmitButton>
                </div>
                <p className="ui-muted">The rights note stays staff-only. Add images you have checked; use only addresses you have the licence to display.</p>
              </form>
            </Panel>
          </section>

          <section className="ui-stack-sm" aria-labelledby="gallery-list-title">
            <SectionHeading eyebrow="Archive" title="Published photographs" id="gallery-list-title" />
            {photos.length === 0
              ? <EmptyPanel title="No gallery photographs yet" description="Add the first photograph above. It appears on the public gallery page immediately." />
              : <ul className="ui-list ui-stack-sm">{photos.map((photo) => {
                const url = photoUrl(photo, r2Base);
                return (
                  <li key={photo.id}>
                    <Panel className="ui-stack-sm">
                      <div className="ui-row ui-row--between">
                        <h3 className="ui-item-title">{photo.title}</h3>
                        <StatusBadge tone={photo.is_public ? "success" : "neutral"}>{photo.is_public ? "public" : "private"}</StatusBadge>
                      </div>
                      <p className="ui-meta">{photo.credit ? photo.credit : "No credit recorded"} · {new Date(photo.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}</p>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={photo.alt_text ?? photo.title} loading="lazy" style={{ maxWidth: "240px", borderRadius: "12px" }} referrerPolicy="no-referrer" />
                      ) : <p className="ui-muted">Stored object (preview needs storage configuration).</p>}
                      {photo.alt_text ? <p className="ui-muted">Alt: {photo.alt_text}</p> : null}
                      <form action={removeGalleryPhoto}>
                        <input type="hidden" name="asset_id" value={photo.id} />
                        <ConfirmSubmit className="btn-secondary" message={"Delete the photograph \"" + photo.title + "\" from the gallery? It disappears from the public page immediately. This cannot be undone."}>Remove photograph</ConfirmSubmit>
                      </form>
                    </Panel>
                  </li>
                );
              })}</ul>}
          </section>
        </>
      )}
    </PageFrame>
  );
}
