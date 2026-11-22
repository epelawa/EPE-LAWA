"use client";

import { useEffect, useRef, useState } from "react";
import BrandedDialog from "./branded-dialog";
import { normalizeExternalNewsCoverUrl } from "../../main/lib/news-cover-url.mjs";
import styles from "./news-cover-url-fields.module.css";

type InitialCover = {
  url?: string | null;
  alt?: string | null;
  credit?: string | null;
  sourceUrl?: string | null;
  licenseUrl?: string | null;
  caption?: string | null;
};

export default function NewsCoverUrlFields({ idPrefix, initial = {}, uploadAvailable = false }: { idPrefix: string; initial?: InitialCover; uploadAvailable?: boolean }) {
  const fieldset = useRef<HTMLFieldSetElement>(null);
  const previewBlob = useRef<string | null>(null);
  const [url, setUrl] = useState(initial.url ?? "");
  const [urlTouched, setUrlTouched] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const normalizedPreview = normalizeExternalNewsCoverUrl(url);
  const hasUrl = url.trim().length > 0;
  const hasFile = uploadName.trim().length > 0;
  const needsMetadata = hasUrl || hasFile;
  const invalidUrl = hasUrl && !normalizedPreview && urlTouched;
  const labelId = (name: string) => `${idPrefix}-${name}`;

  function releaseUploadPreview() {
    if (previewBlob.current) {
      URL.revokeObjectURL(previewBlob.current);
      previewBlob.current = null;
    }
  }
  useEffect(() => releaseUploadPreview, []);
  // Keep browser validation in sync with the same one-cover and HTTPS rules
  // enforced by the server. Never silently discard a selected source or credit.
  useEffect(() => {
    const root = fieldset.current;
    const form = root?.form;
    if (!root || !form) return;
    const cover = root.querySelector<HTMLInputElement>('[name="coverUrl"]');
    if (!cover) return;
    function validate() {
      const linked = cover!.value.trim();
      const upload = form!.elements.namedItem("coverUpload");
      const picked = upload instanceof HTMLInputElement && upload.files && upload.files.length > 0;
      cover!.setCustomValidity(
        linked && picked ? "Choose only one cover source: a link or an upload."
        : linked && !normalizeExternalNewsCoverUrl(linked) ? "Use a public HTTPS image URL without credentials or a private host."
        : "");
    }
    form.addEventListener("input", validate);
    form.addEventListener("change", validate);
    validate();
    return () => { form.removeEventListener("input", validate); form.removeEventListener("change", validate); cover.setCustomValidity(""); };
  }, []);

  return (
    <fieldset ref={fieldset} className={`${styles.root} ui-stack`}>
      <legend className={`label ${styles.legend}`}>{uploadAvailable ? "Cover image" : "Or link a cover image"}</legend>
      {uploadAvailable ? (
        <>
          <p className="ui-meta">Upload an image from this device, or paste a publicly accessible HTTPS image link. Choose only one cover source. The browser requests a linked image directly, so its host can see visitors’ IP addresses; page referrers are not sent.</p>
          <div className="ui-field">
            <span className="ui-row">
              <button type="button" className="btn-secondary" aria-haspopup="dialog" onClick={() => setUploadOpen(true)}>Upload from this device</button>
              <span className="ui-meta" role="status">{uploadName ? `Selected: ${uploadName}` : "No file selected"}</span>
            </span>
          </div>
          <BrandedDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload cover image" description="Choose an image from this device. You can still fill in alt text,  after closing this dialog.">
            <div className="ui-stack-sm">
              <label className="label" htmlFor={labelId("upload")}>Cover image file</label>
              <input
                id={labelId("upload")}
                name="coverUpload"
                className="input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                data-autofocus
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  releaseUploadPreview();
                  if (file) {
                    previewBlob.current = URL.createObjectURL(file);
                    setUploadPreview(previewBlob.current);
                    setUploadName(file.name);
                    setUploadOpen(false);
                  } else {
                    setUploadPreview(null);
                    setUploadName("");
                  }
                  setPreviewFailed(false);
                }}
              />
              <span id={labelId("upload-help")} className="ui-meta">JPEG, PNG, WebP or AVIF, up to 26 MB. The upload happens through the EPE LAWA server; covers are served from the image-storage domain.</span>
            </div>
          </BrandedDialog>
          {uploadPreview && !previewFailed ? <img className={styles.preview} src={uploadPreview} alt="" loading="eager" decoding="async" onLoad={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} /> : null}
          {uploadPreview && previewFailed ? <p className="ui-meta" role="status">The uploaded image preview could not load. Try a different image file.</p> : null}
          {uploadName ? <p className="ui-meta" role="status">Selected file: {uploadName}. Clear the file input to switch back to a linked image.</p> : null}
        </>
      ) : (
        <p className="ui-meta">An EPE LAWA image-storage bucket is not configured, so direct uploads are unavailable. Paste a publicly accessible HTTPS image link. The browser requests the image directly, so its host can see visitors’ IP addresses; page referrers are not sent. Use only a trusted public image host: obvious private/local hosts are rejected, but a domain’s DNS can change later.</p>
      )}
      <div className="ui-field">
        <label className="label" htmlFor={labelId("url")}>{uploadAvailable ? "Or link a cover image URL" : "Cover image URL"}</label>
        <input id={labelId("url")} name="coverUrl" className="input" type="url" pattern="https://.+" title="Enter a public HTTPS image URL." maxLength={2048} autoComplete="url" value={url} onChange={(event) => { setUrl(event.currentTarget.value); setPreviewFailed(false); }} onBlur={() => setUrlTouched(true)} onInvalid={() => setUrlTouched(true)} aria-describedby={invalidUrl ? `${labelId("help")} ${labelId("error")}` : labelId("help")} aria-invalid={invalidUrl ? "true" : "false"} />
        <span id={labelId("help")} className="ui-meta">HTTPS only. Private/local hosts and embedded credentials are rejected.</span>
        {invalidUrl ? <span id={labelId("error")} className="ui-meta" role="status" aria-live="polite">Use a valid public HTTPS URL without credentials or a private/local host.</span> : null}
      </div>
      {!uploadPreview && normalizedPreview ? <img className={styles.preview} src={normalizedPreview} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" onLoad={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} /> : null}
      {!uploadPreview && normalizedPreview && previewFailed ? <p className="ui-meta" role="status">The image preview could not load. Check that the URL is public and serves an image.</p> : null}
      <div className="ui-field">
        <label className="label" htmlFor={labelId("alt")}>Cover alt text (optional)</label>
        <input id={labelId("alt")} name="coverAlt" className="input" maxLength={500} defaultValue={initial.alt ?? ""} />
      </div>
    </fieldset>
  );
}
