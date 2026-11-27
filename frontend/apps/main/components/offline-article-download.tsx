"use client";

import { useState } from "react";
import { buildOfflineArticleHtml, offlineArticleFilename } from "../lib/offline-article-copy.mjs";
import { saveOfflineStory } from "../lib/offline-story-cache";
import type { OfflineArticle } from "../lib/offline-article-copy.mjs";

export default function OfflineArticleDownload({ article }: { article: OfflineArticle }) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function articleHtml() {
    const body = document.querySelector<HTMLElement>("[data-offline-article-body]");
    const bodyText = body?.innerText?.trim() ?? "";
    if (!bodyText) {
      setStatus("The story text could not be prepared. Please reload the article and try again.");
      return null;
    }
    return buildOfflineArticleHtml(article, bodyText);
  }

  async function saveCopy() {
    const html = articleHtml();
    if (html === null) return;
    setSaving(true);
    setStatus("");
    try {
      await saveOfflineStory(article.slug, html);
      setStatus("Saved on this device. Reopen this story at the same address to read it offline.");
    } catch {
      setStatus("Could not save this story in your browser. Try downloading a copy instead.");
    } finally {
      setSaving(false);
    }
  }

  function downloadCopy() {
    const html = articleHtml();
    if (html === null) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = offlineArticleFilename(article.slug);
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setStatus("Offline copy downloaded. It contains the story text as published; later corrections will not sync.");
  }

  return <div className="ui-stack-sm">
    <button type="button" className="btn-secondary" onClick={() => void saveCopy()} disabled={saving} aria-busy={saving}>
      {saving ? "Saving story…" : "Save for offline reading"}
    </button>
    <button type="button" className="btn-secondary" onClick={downloadCopy} aria-label={`Download ${article.title} for offline reading`}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Download offline copy</span>
    </button>
    <p className="ui-meta">Offline copies contain story text only. Your browser keeps up to 20 saved stories on this device.</p>
    <p role="status" aria-live="polite" className="ui-meta">{status}</p>
  </div>;
}
