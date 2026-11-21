import { PageFrame, PageIntro, Notice } from "@epelawa/ui";
import { createClient } from "../../../lib/supabase";
import { deleteMedia, uploadMedia } from "./media-actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type MediaAsset = {
  id: string;
  kind: string;
  title: string | null;
  credit: string | null;
  bucket: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
  alt_text: string | null;
  created_at: string;
};

const MESSAGES: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  uploaded: { tone: "success", text: "Media uploaded and registered." },
  deleted: { tone: "success", text: "Media record and stored object were removed." },
  record_deleted_object_leftover: { tone: "warning", text: "The record was removed, but the stored object could not be deleted right now. Retry later from this page." },
  invalid: { tone: "danger", text: "The request was not valid. Please try again." },
  too_large: { tone: "danger", text: "That file exceeds the 25 MB limit." },
  missing_alt: { tone: "danger", text: "Public images require descriptive alt text." },
  unconfigured: { tone: "warning", text: "R2 storage is not configured on this deployment, so uploading is unavailable." },
  storage_failed: { tone: "danger", text: "The upload could not be stored. Nothing was changed; try again later." },
  object_saved_record_rejected: { tone: "danger", text: "The file reached storage but the database record was rejected. Nothing is listed; remove the stray object before retrying." },
  in_use: { tone: "danger", text: "That media is referenced by other records, so it cannot be deleted yet." },
  failed: { tone: "danger", text: "The deletion was rejected. Check your capability and try again." },
  unavailable: { tone: "danger", text: "Media administration is unavailable until the reviewed database migration is applied." },
};

async function capability(name: string): Promise<boolean> {
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("has_capability", { p_capability: name });
    return !error && data === true;
  } catch {
    return false;
  }
}

async function readAssets(): Promise<{ state: "empty" | "ready"; assets: MediaAsset[] }> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("media_assets")
      .select("id,kind,title,credit,bucket,object_key,mime_type,byte_size,alt_text,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { state: "empty", assets: [] };
    return { state: "ready", assets: (data ?? []) as MediaAsset[] };
  } catch {
    return { state: "empty", assets: [] };
  }
}


export default async function MediaPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const params = await searchParams;
  const message = params.result ? MESSAGES[params.result] : undefined;
  const canCreate = await capability("article.create") || await capability("radio.manage");
  const canDelete = await capability("article.publish") || await capability("radio.manage");
  const { assets } = await readAssets();

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Content / Media"
        title="Media"
        description="Credited, rights-cleared media stored in R2. Uploads register a metadata record with an audit event; deletion removes both the record and the stored object."
      />
      {message ? <Notice tone={message.tone} role={message.tone === "success" ? "status" : "alert"}>{message.text}</Notice> : null}

      {canCreate ? (
        <form action={uploadMedia} className="ui-stack" encType="multipart/form-data">
          <h2>Upload media</h2>
          <div className="ui-form-grid">
            <div className="ui-field"><label className="label" htmlFor="media-file">File (JPEG, PNG, WebP or AVIF, up to 25 MB)</label><input className="input" id="media-file" name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/avif" /></div>
            <div className="ui-field"><label className="label" htmlFor="media-kind">Kind</label><select className="input" id="media-kind" name="kind" defaultValue="image"><option value="image">Image</option><option value="video_thumb">Video thumbnail</option><option value="document">Document</option></select></div>
            <div className="ui-field"><label className="label" htmlFor="media-bucket">Bucket</label><select className="input" id="media-bucket" name="bucket" defaultValue="public"><option value="public">Public</option><option value="private">Private</option></select></div>
            <div className="ui-field"><label className="label" htmlFor="media-title">Title (optional)</label><input className="input" id="media-title" name="title" maxLength={300} /></div>
            <div className="ui-field"><label className="label" htmlFor="media-credit">Credit (photographer/source, optional)</label><input className="input" id="media-credit" name="credit" maxLength={500} /></div>
            <div className="ui-field"><label className="label" htmlFor="media-alt">Alt text (required for public images)</label><input className="input" id="media-alt" name="alt_text" maxLength={300} /></div>
            <div className="ui-field"><label className="label" htmlFor="media-rights">Rights note (optional)</label><textarea className="input" id="media-rights" name="rights_note" maxLength={2000} /></div>
          </div>
          <div className="ui-actions"><button className="btn-primary" type="submit">Upload to R2</button></div>
        </form>
      ) : (
        <Notice tone="warning">Your role does not include the media upload capability. Ask an administrator to grant <strong>article.create</strong> or <strong>radio.manage</strong>.</Notice>
      )}

      <section className="ui-stack-sm" aria-labelledby="media-list-heading">
        <h2 id="media-list-heading">Registered media ({assets.length})</h2>
        {assets.length === 0 ? <p className="ui-muted">No media records yet. Uploaded files will appear here with their credits and rights note.</p> : (
          <ul className="ui-list ui-stack-sm">
            {assets.map((asset) => (
              <li key={asset.id} className="ui-card ui-stack-sm">
                <div className="ui-row">
                  <span className="ui-meta">{asset.kind} · {asset.bucket} · {asset.mime_type} · {Math.ceil(asset.byte_size / 1024)} KB</span>
                  <span className="ui-meta">{new Date(asset.created_at).toISOString().slice(0, 10)}</span>
                </div>
                <h3 className="ui-item-title">{asset.title ?? asset.object_key.split("/").pop()}</h3>
                {asset.credit ? <p className="ui-meta">Credit: {asset.credit}</p> : null}
                {asset.alt_text ? <p className="ui-meta">Alt: {asset.alt_text}</p> : null}
                <p className="ui-meta">Object key: <code>{asset.object_key}</code></p>
                {canDelete ? (
                  <form action={deleteMedia} className="ui-row">
                    <input type="hidden" name="id" value={asset.id} />
                    <label className="ui-subtle ui-row"><input type="checkbox" name="confirm" value="yes" required /><span>I understand this removes the record and the stored object. This cannot be undone.</span></label>
                    <button className="btn-secondary" type="submit">Delete</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}
