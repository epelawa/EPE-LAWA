"use client";

import { useState } from "react";
import { normalizeExternalNewsAttributionUrl, normalizeExternalNewsCoverUrl } from "../../main/lib/news-cover-url.mjs";
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
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const [sourceTouched, setSourceTouched] = useState(false);
  const [licenseUrl, setLicenseUrl] = useState(initial.licenseUrl ?? "");
  const [licenseTouched, setLicenseTouched] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const retainedLegacyUrl = url === (initial.url ?? "");
  const normalizedPreview = normalizeExternalNewsCoverUrl(url) ?? (
    retainedLegacyUrl ? normalizeExternalNewsAttributionUrl(url) : null
  );
  const hasUrl = url.trim().length > 0;
  const invalidUrl = hasUrl && !normalizedPreview && urlTouched;
  const invalidSourceUrl = hasUrl && sourceTouched && !normalizeExternalNewsAttributionUrl(sourceUrl);
  const invalidLicenseUrl = hasUrl && licenseTouched && !normalizeExternalNewsAttributionUrl(licenseUrl);
  const labelId = (name: string) => `${idPrefix}-${name}`;

  return (
    <fieldset className={`${styles.root} ui-stack`}>
      <legend className={`label ${styles.legend}`}>Or link a cover image</legend>
      <p className="ui-meta">An EPE LAWA image-storage bucket is not configured, so direct uploads are unavailable. New or changed cover images must use images.unsplash.com, images.pexels.com, cdn.pixabay.com, or upload.wikimedia.org. A safe existing cover from another host can be retained unchanged. Source and license links may use any safe public HTTPS host. The browser requests the image from its provider, which can see visitors’ IP addresses; page referrers are not sent.</p>
      <div className="ui-field">
        <label className="label" htmlFor={labelId("url")}>Cover image URL</label>
        <input id={labelId("url")} name="coverUrl" className="input" type="url" title="Enter an HTTPS image URL from an approved host." maxLength={2048} autoComplete="url" value={url} onChange={(event) => { setUrl(event.currentTarget.value); setPreviewFailed(false); }} onBlur={() => setUrlTouched(true)} onInvalid={() => setUrlTouched(true)} aria-describedby={invalidUrl ? `${labelId("help")} ${labelId("error")}` : labelId("help")} aria-invalid={invalidUrl ? "true" : "false"} />
        <span id={labelId("help")} className="ui-meta">HTTPS only; new or changed covers must use one of the approved hosts. Existing safe legacy covers may remain unchanged.</span>
        {invalidUrl ? <span id={labelId("error")} className="ui-meta" role="status" aria-live="polite">Use an approved image host, or keep this existing legacy URL unchanged.</span> : null}
      </div>
      {normalizedPreview ? <img className={styles.preview} src={normalizedPreview} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" onLoad={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} /> : null}
      {normalizedPreview && previewFailed ? <p className="ui-meta" role="status">The image preview could not load. Check that the URL is public and serves an image.</p> : null}
      <div className="ui-form-grid">
        <div className="ui-field"><label className="label" htmlFor={labelId("alt")}>Cover alt text</label><input id={labelId("alt")} name="coverAlt" className="input" maxLength={500} defaultValue={initial.alt ?? ""} required={hasUrl} /></div>
        <div className="ui-field"><label className="label" htmlFor={labelId("credit")}>Image credit</label><input id={labelId("credit")} name="coverCredit" className="input" maxLength={300} defaultValue={initial.credit ?? ""} required={hasUrl} /></div>
        <div className="ui-field">
          <label className="label" htmlFor={labelId("source")}>Source page URL</label>
          <input id={labelId("source")} name="coverSourceUrl" className="input" type="url" maxLength={2048} autoComplete="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} onBlur={() => setSourceTouched(true)} onInvalid={() => setSourceTouched(true)} required={hasUrl} aria-describedby={invalidSourceUrl ? `${labelId("source-help")} ${labelId("source-error")}` : labelId("source-help")} aria-invalid={invalidSourceUrl ? "true" : "false"} />
          <span id={labelId("source-help")} className="ui-meta">Any safe public HTTPS source page is allowed.</span>
          {invalidSourceUrl ? <span id={labelId("source-error")} className="ui-meta" role="status" aria-live="polite">Enter a safe public HTTPS source page URL.</span> : null}
        </div>
        <div className="ui-field">
          <label className="label" htmlFor={labelId("license")}>License URL</label>
          <input id={labelId("license")} name="coverLicenseUrl" className="input" type="url" maxLength={2048} autoComplete="url" value={licenseUrl} onChange={(event) => setLicenseUrl(event.currentTarget.value)} onBlur={() => setLicenseTouched(true)} onInvalid={() => setLicenseTouched(true)} required={hasUrl} aria-describedby={invalidLicenseUrl ? `${labelId("license-help")} ${labelId("license-error")}` : labelId("license-help")} aria-invalid={invalidLicenseUrl ? "true" : "false"} />
          <span id={labelId("license-help")} className="ui-meta">Any safe public HTTPS license page is allowed.</span>
          {invalidLicenseUrl ? <span id={labelId("license-error")} className="ui-meta" role="status" aria-live="polite">Enter a safe public HTTPS license page URL.</span> : null}
        </div>
      </div>
      <div className="ui-field"><label className="label" htmlFor={labelId("caption")}>Credit caption (optional)</label><input id={labelId("caption")} name="coverCaption" className="input" maxLength={500} defaultValue={initial.caption ?? ""} /></div>
    </fieldset>
  );
}
