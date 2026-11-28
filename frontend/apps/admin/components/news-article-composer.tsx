"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import Link from "./admin-link";
import { useRouter } from "next/navigation";
import { LiveField, validateField, type FieldRules } from "@epelawa/ui";
import { createArticle, createArticleWithFeedback } from "../lib/actions";
import { adminRouterHref, adminHref } from "../lib/admin-path";
import { normalizeExternalNewsCoverUrl } from "../../main/lib/news-cover-url.mjs";
import { ARTICLE_TAG_INPUT_LIMIT, ARTICLE_TAG_LIMIT, NEWS_HASHTAGS, articleTags, articleTagsError, suggestNewsHashtags } from "../lib/news-hashtags";
import NewsCoverUrlFields from "./news-cover-url-fields";
import AuthorPicker from "./author-picker";
import styles from "./news-article-composer.module.css";

type Option = { id: string; label?: string; display_name?: string };

const COMPOSER_RULES: Record<string, FieldRules> = {
  title: { required: true, maxLength: 200 },
  summary: { maxLength: 1000 },
  body: { required: true, maxLength: 100000, message: "Write your story before continuing." },
  categoryId: { required: true, message: "Choose a category." },
  coverUrl: { url: true },
};

function firstInvalid(step: string, values: Record<string, string>): string {
  for (const [name, rules] of Object.entries(COMPOSER_RULES)) {
    const error = validateField(values[name] ?? "", rules);
    if (!error) continue;
    const field = document.querySelector<HTMLElement>(`[data-composer-step="${step}"] [name="${name}"]`);
    if (field) return error;
  }
  return "";
}

function currentValues(form: HTMLFormElement | null): Record<string, string> {
  if (!form) return {};
  const values: Record<string, string> = {};
  const data = new FormData(form);
  for (const name of Object.keys(COMPOSER_RULES)) {
    const raw = data.get(name);
    if (typeof raw === "string") values[name] = raw;
  }
  return values;
}

function SaveButton({saving, blocked}: {saving: boolean; blocked: boolean}) {
  const { pending } = useFormStatus();
  return <button data-pending-self-managed="true" className={styles.submit} type="submit" aria-busy={pending || saving} disabled={pending || saving || blocked}>{(pending || saving) && <span className="ep-btn__spinner" aria-hidden="true" />}{pending || saving ? "Publishing article…" : "Publish article"}</button>;
}

export default function NewsArticleComposer({ categories, authors, coverUploadAvailable = false }: { categories: Option[]; authors: Option[]; coverUploadAvailable?: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");

  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<{status: "error" | "uncertain"; message: string} | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  function move(target: number) {
    setStep(target);
    requestAnimationFrame(() => document.getElementById(`composer-step-${target}`)?.focus());
  }
  function next() {
    const error = (step === 1 && articleTagsError(tags)) || firstInvalid(String(step), currentValues(form.current));
    if (error) {
      setStepError(error);
      return;
    }
    setStepError("");
    move(Math.min(3, step + 1));
  }
  function validateAll(): boolean {
    const values = currentValues(form.current);
    for (let target = 1; target <= 3; target += 1) {
      const error = (target === 1 && articleTagsError(tags)) || firstInvalid(String(target), values);
      if (error) {
        move(target);
        setStepError(error);
        return false;
      }
    }
    setStepError("");
    return true;
  }
  const onComposerChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const name = event.currentTarget.name;
    const nextValue = event.currentTarget.value;
    if (name === "title") setTitle(nextValue);
    if (name === "summary") setSummary(nextValue);
    if (name === "body") setBody(nextValue);
    if (name === "categoryId") setCategoryId(nextValue);
    if (name === "tags") setTags(nextValue);
  };
  const [authorName, setAuthorName] = useState("");
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const previewBlob = useRef<string | null>(null);
  function releasePreviewBlob() {
    if (previewBlob.current) {
      URL.revokeObjectURL(previewBlob.current);
      previewBlob.current = null;
    }
  }
  useEffect(() => () => releasePreviewBlob(), []);
  const [preview, setPreview] = useState({ title: "", summary: "", body: "", category: "", author: "", image: "", imageAlt: "" });
  function showPreview() {
    if (!form.current) return;
    const data = new FormData(form.current);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const pickedFile = data.get("coverUpload");
    const linked = normalizeExternalNewsCoverUrl(get("coverUrl"));
    releasePreviewBlob();
    if (pickedFile instanceof File && pickedFile.size > 0) previewBlob.current = URL.createObjectURL(pickedFile);
    setPreviewImageFailed(false);
    setPreview({ title: get("title"), summary: get("summary"), body: get("body"), category: categories.find((item) => item.id === get("categoryId"))?.label ?? "", author: authorName, image: previewBlob.current ?? (linked ?? ""), imageAlt: get("coverAlt") });
    previewDialog.current?.showModal();
  }
  const selectedTags = articleTags(tags);
  const selectedTagKeys = new Set(selectedTags.map((tag) => tag.toLowerCase()));
  function toggleTag(tag: string) {
    const key = tag.toLowerCase();
    const next = selectedTagKeys.has(key) ? selectedTags.filter((value) => value.toLowerCase() !== key) : [...selectedTags, tag];
    const text = next.join(", ");
    if (next.length < selectedTags.length || !articleTagsError(text)) {
      setTags(text);
      setStepError("");
    }
  }
  const tagQuery = tagFilter.trim().replace(/^#/, "").toLowerCase();
  const filteredPresets = NEWS_HASHTAGS.filter(({ tag, words }) =>
    !tagQuery || tag.toLowerCase().includes(tagQuery) || words.some((word) => word.includes(tagQuery))
  );
  const previewSuggestions = useMemo(() => suggestNewsHashtags(`${preview.title} ${preview.summary} ${preview.body} ${preview.category}`), [preview]);
  const tagButton = (tag: string) => {
    const selected = selectedTagKeys.has(tag.toLowerCase());
    const unavailable = !selected && articleTagsError([...selectedTags, tag].join(", ")) !== null;
    return <button key={tag} type="button" className="btn-secondary" aria-pressed={selected}
      aria-disabled={unavailable || undefined} onClick={() => toggleTag(tag)}>#{tag}</button>;
  };
  const wordCount = body.trim() ? body.trim().split(/\s+/u).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return <form ref={form} action={createArticle} noValidate className={styles.composer} onSubmit={(event) => {
    if (!enhanced) return;
    event.preventDefault();
    if (saving || saved || saveError?.status === "uncertain") return;
    if (!validateAll()) return;
    const data = new FormData(event.currentTarget);
    setSaveError(null);
    startSaving(async () => {
      try { const result = await createArticleWithFeedback(data); if (result.status === "success") { setSaved(true); router.push(adminRouterHref(adminHref(`/newsroom/${result.articleId}?${result.published ? "published=1" : "created=1"}`))); } else setSaveError(result); }
      catch { setSaveError({ status: "uncertain", message: "We could not confirm whether the article was saved. Check the newsroom list before trying again to avoid a duplicate." }); }
    });
  }} onKeyDown={(event) => { if (enhanced && step < 3 && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); next(); } }} onInvalid={(event) => { const target = event.target as HTMLElement; const section = target.closest<HTMLElement>("[data-composer-step]"); const invalidStep = Number(section?.dataset.composerStep); if (enhanced && invalidStep && invalidStep !== step) { move(invalidStep); requestAnimationFrame(() => target.focus()); } }}>
    {saveError && <div role="alert" className="ui-notice"><p>{saveError.message}</p>{saveError.status === "uncertain" && <><Link href={adminHref("/newsroom")} target="_blank" rel="noopener noreferrer">Check the newsroom list in a new tab</Link><button type="button" className="btn-secondary" onClick={() => setSaveError(null)}>I checked; allow another attempt</button></>}</div>}
    <div className={styles.intro}><div><h2>Create Story</h2><p>Write in plain text, choose the people and topic behind the story, then save your work.</p></div><div className={styles.introStatus}><span className={styles.introBadge}>New article</span></div></div>
    {enhanced && <div className={styles.progress} aria-live="polite"><p>Step {step} of 3 · {Math.round(step / 3 * 100)}%</p><div role="progressbar" aria-label="Article form progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(step / 3 * 100)}><span style={{ width: `${step / 3 * 100}%` }} /></div></div>}
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <section id="composer-step-1" tabIndex={-1} data-composer-step="1" hidden={enhanced && step !== 1} className={styles.card} aria-labelledby="story-details-heading">
          <div className={styles.sectionTop}><span className={styles.step}>01</span><div><h3 id="story-details-heading">Story details</h3><p>Start with a clear headline and a concise introduction.</p></div></div>
          <LiveField label="Headline" value={title} rules={COMPOSER_RULES.title} onChange={onComposerChange}><input id="title" name="title" maxLength={200} value={title} onChange={onComposerChange} placeholder="Give your story a headline" /></LiveField>
          <LiveField label="Summary" optional hint="Shown alongside your story in the news listing." value={summary} rules={COMPOSER_RULES.summary} onChange={onComposerChange}><textarea id="summary" name="summary" rows={2} maxLength={1000} value={summary} onChange={onComposerChange} placeholder="Introduce the story in a sentence or two" /></LiveField>
          <LiveField label="Article content" hint="Plain text only · Separate paragraphs with a blank line." value={body} rules={COMPOSER_RULES.body} onChange={onComposerChange}><textarea id="body" name="body" rows={10} maxLength={100000} placeholder="Write your story here. Leave a blank line between paragraphs." value={body} onChange={onComposerChange} /></LiveField><div className={styles.writingMeta}><span>Plain text only · Separate paragraphs with a blank line</span><span aria-live="polite">{wordCount.toLocaleString()} words{wordCount ? ` · about ${readingMinutes} min read` : ""}</span></div>
          <LiveField label="Hashtags" optional hint="Choose presets or enter your own, separated by commas. Up to 12 per article." value={tags} rules={{ maxLength: ARTICLE_TAG_INPUT_LIMIT }} onChange={onComposerChange}><input id="tags" name="tags" maxLength={ARTICLE_TAG_INPUT_LIMIT} value={tags} onChange={onComposerChange} placeholder="e.g., EpeNews, CommunityNews, LocalNews" /></LiveField>
          <details className={styles.suggestedTags}>
            <summary>Browse {NEWS_HASHTAGS.length} preset hashtags</summary>
            <p role="status">{selectedTags.length} of {ARTICLE_TAG_LIMIT} selected</p>
            <label className={styles.field}>Search preset hashtags
              <input type="search" value={tagFilter} onChange={(event) => setTagFilter(event.currentTarget.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); } }}
                placeholder="e.g., climate change, presidency, or tech" />
            </label>
            {filteredPresets.length
              ? <div className={styles.presetTags}>{filteredPresets.map(({ tag }) => tagButton(tag))}</div>
              : <p role="status">No presets match that search. You can enter your own in Hashtags.</p>}
          </details>
          {enhanced && stepError && step === 1 ? <p role="alert" aria-live="polite" className={styles.stepError}>{stepError}</p> : null}
        </section>
        <section id="composer-step-2" tabIndex={-1} data-composer-step="2" hidden={enhanced && step !== 2} className={styles.card} aria-labelledby="cover-heading">
          <div className={styles.sectionTop}><span className={styles.step}>02</span><div><h3 id="cover-heading">Cover image</h3><p>Upload a photo from this device or link a properly credited image.</p></div></div>
          <div className={styles.coverPanel}><NewsCoverUrlFields idPrefix="new-cover" uploadAvailable={coverUploadAvailable} /></div>
        </section>
      </div>
      <aside id="composer-step-3" tabIndex={-1} data-composer-step="3" hidden={enhanced && step !== 3} className={styles.sidebar} aria-label="Article settings">
        <section className={styles.card}><div className={styles.sectionTop}><span className={styles.step}>03</span><div><h3>Story settings</h3><p>Help readers find the right story.</p></div></div>
          {/* One section only (owner, turn 26): every story files under Epe Division. */}<input type="hidden" name="categoryId" value={categoryId} />
          <div className={styles.field}><AuthorPicker authors={authors} onChange={(_id, name) => setAuthorName(name)} /></div>
        </section>
        <section className={styles.publishInfo}><strong>Ready to go live</strong><p>Publishing puts your story on the public site straight away — no review queue, no waiting. Use the preview to double-check first.</p><button ref={previewButton} className={styles.chooseAuthor} type="button" onClick={showPreview}>Preview article</button><SaveButton saving={saving || saved} blocked={saveError?.status === "uncertain"} /><Link href={adminHref("/newsroom")}>Cancel and return</Link>{enhanced && stepError && step === 3 ? <p role="alert" aria-live="polite" className={styles.stepError}>{stepError}</p> : null}</section>
      </aside>
    </div>
    {enhanced && <div className={styles.stepActions}>{step > 1 && <button className={styles.chooseAuthor} type="button" onClick={() => move(step - 1)}>Back</button>}{step < 3 && <button className={styles.submit} type="button" onClick={next}>Continue →</button>}{enhanced && stepError && step === 2 ? <p role="alert" aria-live="polite" className={styles.stepError}>{stepError}</p> : null}</div>}
    <dialog ref={previewDialog} className={`${styles.dialog} ${styles.previewDialog}`} aria-labelledby="preview-title" onClose={() => previewButton.current?.focus()}>
      <div className={styles.dialogHeader}><div><h2 id="preview-title">Review your article</h2><p>This preview stays in your browser and has not been published.</p></div><button type="button" className={styles.close} aria-label="Close preview" onClick={() => previewDialog.current?.close()}>×</button></div>
      <article className={styles.previewStory}><h3>{preview.title || "Untitled article"}</h3>{preview.summary ? <p className={styles.previewSummary}>{preview.summary}</p> : null}<p className={styles.previewByline}>By {preview.author || "No author selected"}</p>{preview.image && !previewImageFailed ? <><img src={preview.image} alt={preview.imageAlt} referrerPolicy="no-referrer" onError={() => setPreviewImageFailed(true)} /></> : <div className={styles.previewPlaceholder}><img src="/brand-logo.webp" alt="EPE LAWA logo" /><p>{previewImageFailed ? "The cover preview could not load. The EPE LAWA logo is shown as a fallback." : "No cover selected. The EPE LAWA logo is used as a fallback."}</p></div>}<div className={styles.previewBody}>{preview.body ? preview.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>No story content yet.</p>}</div></article>
      <section className={styles.suggestedTags} aria-labelledby="preview-hashtags">
        <h3 id="preview-hashtags">Suggested hashtags</h3>
        <p>Choose a suggestion to attach it when you save the article. Choose it again to remove it.</p>
        <p role="status">{selectedTags.length} of {ARTICLE_TAG_LIMIT} selected</p>
        {previewSuggestions.length
          ? <div className={styles.presetTags}>{previewSuggestions.map(tagButton)}</div>
          : <p>No suggestions match this story yet. You can browse presets or enter a custom hashtag in Story details.</p>}
      </section>
    </dialog>

  </form>;
}
