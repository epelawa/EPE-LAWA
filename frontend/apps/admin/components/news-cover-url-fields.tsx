"use client";

import { useState } from "react";
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

export default function NewsCoverUrlFields({ idPrefix, initial = {} }: { idPrefix: string; initial?: InitialCover }) {
  const [url, setUrl] = useState(initial.url ?? "");
  const [urlTouched, setUrlTouched] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const normalizedPreview = normalizeExternalNewsCoverUrl(url);
  const hasUrl = url.trim().length > 0;
  const invalidUrl = hasUrl && !normalizedPreview && urlTouched;
  const labelId = (name: string) => `${idPrefix}-${name}`;

  return (
    <fieldset className={`${styles.root} ui-stack`}>
      <legend className={`label ${styles.legend}`}>Or link a cover image</legend>
      <p className="ui-meta">An EPE LAWA image-storage bucket is not configured, so direct uploads are unavailable. Paste a publicly accessible HTTPS image link; provide its alt text, credit, source and license. Choose either this link or an approved cover above; clear this URL before switching. The browser requests the image directly, so its host can see visitors’ IP addresses; page referrers are not sent. Use only a trusted public image host: obvious private/local hosts are rejected, but a domain’s DNS can change later.</p>
      <div className="ui-field">
        <label className="label" htmlFor={labelId("url")}>Cover image URL</label>
        <input id={labelId("url")} name="coverUrl" className="input" type="url" pattern="https://.+" title="Enter a public HTTPS image URL." maxLength={2048} autoComplete="url" value={url} onChange={(event) => { setUrl(event.currentTarget.value); setPreviewFailed(false); }} onBlur={() => setUrlTouched(true)} onInvalid={() => setUrlTouched(true)} aria-describedby={invalidUrl ? `${labelId("help")} ${labelId("error")}` : labelId("help")} aria-invalid={invalidUrl ? "true" : "false"} />
        <span id={labelId("help")} className="ui-meta">HTTPS only. Private/local hosts and embedded credentials are rejected.</span>
        {invalidUrl ? <span id={labelId("error")} className="ui-meta" role="status" aria-live="polite">Use a valid public HTTPS URL without credentials or a private/local host.</span> : null}
      </div>
      {normalizedPreview ? <img className={styles.preview} src={normalizedPreview} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" onLoad={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} /> : null}
      {normalizedPreview && previewFailed ? <p className="ui-meta" role="status">The image preview could not load. Check that the URL is public and serves an image.</p> : null}
      <div className="ui-form-grid">
        <div className="ui-field"><label className="label" htmlFor={labelId("alt")}>Cover alt text</label><input id={labelId("alt")} name="coverAlt" className="input" maxLength={500} defaultValue={initial.alt ?? ""} required={hasUrl} /></div>
        <div className="ui-field"><label className="label" htmlFor={labelId("credit")}>Image credit</label><input id={labelId("credit")} name="coverCredit" className="input" maxLength={300} defaultValue={initial.credit ?? ""} required={hasUrl} /></div>
        <div className="ui-field"><label className="label" htmlFor={labelId("source")}>Source page URL</label><input id={labelId("source")} name="coverSourceUrl" className="input" type="url" maxLength={2048} defaultValue={initial.sourceUrl ?? ""} required={hasUrl} /></div>
        <div className="ui-field"><label className="label" htmlFor={labelId("license")}>License URL</label><input id={labelId("license")} name="coverLicenseUrl" className="input" type="url" maxLength={2048} defaultValue={initial.licenseUrl ?? ""} required={hasUrl} /></div>
      </div>
      <div className="ui-field"><label className="label" htmlFor={labelId("caption")}>Credit caption (optional)</label><input id={labelId("caption")} name="coverCaption" className="input" maxLength={500} defaultValue={initial.caption ?? ""} /></div>
    </fieldset>
  );
}
