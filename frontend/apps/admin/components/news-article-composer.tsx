"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createArticle } from "../lib/actions";
import { adminHref } from "../lib/admin-path";
import { absoluteUrl } from "../../main/lib/site";
import { normalizeExternalNewsCoverUrl } from "../../main/lib/news-cover-url.mjs";
import { suggestNewsHashtags } from "../lib/news-hashtags";
import { NEWS_COVERS, selectedNewsCover } from "../../main/lib/news-covers";
import NewsCoverUrlFields from "./news-cover-url-fields";
import AuthorPicker from "./author-picker";
import styles from "./news-article-composer.module.css";

type Option = { id: string; label?: string; display_name?: string };

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className={styles.submit} type="submit" disabled={pending}>{pending ? "Saving article…" : "Save article"}<span aria-hidden="true"> →</span></button>;
}

export default function NewsArticleComposer({ categories, authors }: { categories: Option[]; authors: Option[] }) {
  const [body, setBody] = useState("");
  const [step, setStep] = useState(1);
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  function move(target: number) {
    setStep(target);
    requestAnimationFrame(() => document.getElementById(`composer-step-${target}`)?.focus());
  }
  function next() {
    const section = form.current?.querySelector<HTMLElement>(`[data-composer-step="${step}"]`);
    const controls = Array.from(section?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select") ?? []);
    for (const control of controls) if (!control.reportValidity()) return;
    move(Math.min(3, step + 1));
  }
  const [authorName, setAuthorName] = useState("");
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState({ title: "", summary: "", body: "", category: "", author: "", image: "", imageAlt: "", illustrative: false });
  function showPreview() {
    if (!form.current) return;
    const data = new FormData(form.current);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const selected = selectedNewsCover(get("ogImageKey"));
    const linked = normalizeExternalNewsCoverUrl(get("coverUrl"));
    setPreview({ title: get("title"), summary: get("summary"), body: get("body"), category: categories.find((item) => item.id === get("categoryId"))?.label ?? "", author: authorName, image: selected ? absoluteUrl(selected.url) : linked ?? "", imageAlt: selected?.alt ?? get("coverAlt"), illustrative: Boolean(selected) });
    previewDialog.current?.showModal();
  }
  const wordCount = body.trim() ? body.trim().split(/\s+/u).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return <form ref={form} action={createArticle} className={styles.composer} onKeyDown={(event) => { if (enhanced && step < 3 && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); next(); } }} onInvalid={(event) => { const target = event.target as HTMLElement; const section = target.closest<HTMLElement>("[data-composer-step]"); const invalidStep = Number(section?.dataset.composerStep); if (enhanced && invalidStep && invalidStep !== step) { move(invalidStep); requestAnimationFrame(() => target.focus()); } }}>
    <div className={styles.intro}><div><span className={styles.eyebrow}>THE NEWSROOM / COMPOSE</span><h2>Tell the story</h2><p>Write in plain text, choose the people and topic behind the story, then save your work.</p></div><div className={styles.introBadge}>New article</div></div>
    {enhanced && <div className={styles.progress} aria-live="polite"><p>Step {step} of 3 · {Math.round(step / 3 * 100)}%</p><div role="progressbar" aria-label="Article form progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(step / 3 * 100)}><span style={{ width: `${step / 3 * 100}%` }} /></div></div>}
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <section id="composer-step-1" tabIndex={-1} data-composer-step="1" hidden={enhanced && step !== 1} className={styles.card} aria-labelledby="story-details-heading">
          <div className={styles.sectionTop}><span className={styles.step}>01</span><div><h3 id="story-details-heading">Story details</h3><p>Start with a clear headline and a concise introduction.</p></div></div>
          <div className={styles.field}><label htmlFor="title">Headline <span>Required</span></label><input id="title" name="title" maxLength={200} required placeholder="Give your story a headline" /></div>
          <div className={styles.field}><label htmlFor="summary">Summary <span>Optional</span></label><textarea id="summary" name="summary" rows={3} maxLength={1000} placeholder="Introduce the story in a sentence or two" /><small>Shown alongside your story in the news listing.</small></div>
          <div className={styles.field}><label htmlFor="body">Article content <span>Required</span></label><textarea id="body" name="body" rows={16} maxLength={100000} required placeholder="Write your story here. Leave a blank line between paragraphs." value={body} onChange={(event) => setBody(event.currentTarget.value)} /><div className={styles.writingMeta}><span>Plain text only · Separate paragraphs with a blank line</span><span aria-live="polite">{wordCount.toLocaleString()} words{wordCount ? ` · about ${readingMinutes} min read` : ""}</span></div></div>
        </section>
        <section id="composer-step-2" tabIndex={-1} data-composer-step="2" hidden={enhanced && step !== 2} className={styles.card} aria-labelledby="cover-heading">
          <div className={styles.sectionTop}><span className={styles.step}>02</span><div><h3 id="cover-heading">Cover image</h3><p>Choose an approved image or link a properly credited cover.</p></div></div>
          <div className={styles.field}><label htmlFor="ogImageKey">Approved cover <span>Optional</span></label><select id="ogImageKey" name="ogImageKey" defaultValue=""><option value="">No approved cover selected</option>{Object.entries(NEWS_COVERS).map(([key, cover]) => <option key={key} value={key}>{cover.title} — {cover.credit}</option>)}</select><small>These images are illustrative and already credited.</small></div>
          <div className={styles.coverPanel}><NewsCoverUrlFields idPrefix="new-cover" /></div>
        </section>
        <details hidden={enhanced && step !== 2} className={styles.advanced}><summary>Search appearance <span>Optional</span></summary><div className={styles.advancedFields}><div className={styles.field}><label htmlFor="seoTitle">Search title</label><input id="seoTitle" name="seoTitle" maxLength={70} /></div><div className={styles.field}><label htmlFor="seoDescription">Search description</label><input id="seoDescription" name="seoDescription" maxLength={200} /></div></div></details>
      </div>
      <aside id="composer-step-3" tabIndex={-1} data-composer-step="3" hidden={enhanced && step !== 3} className={styles.sidebar} aria-label="Article settings">
        <section className={styles.card}><div className={styles.sectionTop}><span className={styles.step}>03</span><div><h3>Story settings</h3><p>Help readers find the right story.</p></div></div>
          <div className={styles.field}><label htmlFor="categoryId">Category <span>Required</span></label><select id="categoryId" name="categoryId" required defaultValue=""><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select><small>To add a new category, visit <Link href={adminHref("/newsroom/settings")}>newsroom settings</Link>.</small></div>
          <div className={styles.field}><AuthorPicker authors={authors} onChange={(_id, name) => setAuthorName(name)} /></div>
        </section>
        <section className={styles.publishInfo}><strong>Before you publish</strong><p>Saving creates a private article. An authorized publisher can review and publish it from the next screen.</p><button ref={previewButton} className={styles.chooseAuthor} type="button" onClick={showPreview}>Preview article</button><SaveButton /><Link href={adminHref("/newsroom")}>Cancel and return</Link></section>
      </aside>
    </div>
    {enhanced && <div className={styles.stepActions}>{step > 1 && <button className={styles.chooseAuthor} type="button" onClick={() => move(step - 1)}>Back</button>}{step < 3 && <button className={styles.submit} type="button" onClick={next}>Continue →</button>}</div>}
    <dialog ref={previewDialog} className={`${styles.dialog} ${styles.previewDialog}`} aria-labelledby="preview-title" onClose={() => previewButton.current?.focus()}>
      <div className={styles.dialogHeader}><div><span className={styles.eyebrow}>PRIVATE PREVIEW</span><h2 id="preview-title">Review your article</h2><p>This preview stays in your browser and has not been published.</p></div><button type="button" className={styles.close} aria-label="Close preview" onClick={() => previewDialog.current?.close()}>×</button></div>
      <article className={styles.previewStory}><p className={styles.eyebrow}>{preview.category || "No category selected"}</p><h3>{preview.title || "Untitled article"}</h3>{preview.summary ? <p className={styles.previewSummary}>{preview.summary}</p> : null}<p className={styles.previewByline}>By {preview.author || "No author selected"}</p>{preview.image ? <><img src={preview.image} alt={preview.imageAlt} referrerPolicy="no-referrer" />{preview.illustrative ? <small>Illustrative image</small> : null}</> : <p className={styles.previewPlaceholder}>No cover selected</p>}<div className={styles.previewBody}>{preview.body ? preview.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>No story content yet.</p>}</div></article>
      <section className={styles.suggestedTags}><h3>Suggested hashtags</h3><p>Keyword suggestions for review; they are not saved or added to the article.</p><div>{suggestNewsHashtags(`${preview.title} ${preview.summary} ${preview.body} ${preview.category}`).length ? suggestNewsHashtags(`${preview.title} ${preview.summary} ${preview.body} ${preview.category}`).map((tag) => <span key={tag}>#{tag}</span>) : <span>No matching suggestions yet</span>}</div></section>
    </dialog>

  </form>;
}
