"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createArticle } from "../lib/actions";
import { adminHref } from "../lib/admin-path";
import { NEWS_COVERS } from "../../main/lib/news-covers";
import NewsCoverUrlFields from "./news-cover-url-fields";
import styles from "./news-article-composer.module.css";

type Option = { id: string; label?: string; display_name?: string };

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className={styles.submit} type="submit" disabled={pending}>{pending ? "Saving article…" : "Save article"}<span aria-hidden="true"> →</span></button>;
}

export default function NewsArticleComposer({ categories, authors }: { categories: Option[]; authors: Option[] }) {
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const authorDialog = useRef<HTMLDialogElement>(null);
  const authorButton = useRef<HTMLButtonElement>(null);
  const wordCount = body.trim() ? body.trim().split(/\s+/u).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return <form action={createArticle} className={styles.composer}>
    <div className={styles.intro}><div><span className={styles.eyebrow}>THE NEWSROOM / COMPOSE</span><h2>Tell the story</h2><p>Write in plain text, choose the people and topic behind the story, then save your work.</p></div><div className={styles.introBadge}>New article</div></div>
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <section className={styles.card} aria-labelledby="story-details-heading">
          <div className={styles.sectionTop}><span className={styles.step}>01</span><div><h3 id="story-details-heading">Story details</h3><p>Start with a clear headline and a concise introduction.</p></div></div>
          <div className={styles.field}><label htmlFor="title">Headline <span>Required</span></label><input id="title" name="title" maxLength={200} required placeholder="Give your story a headline" /></div>
          <div className={styles.field}><label htmlFor="summary">Summary <span>Optional</span></label><textarea id="summary" name="summary" rows={3} maxLength={1000} placeholder="Introduce the story in a sentence or two" /><small>Shown alongside your story in the news listing.</small></div>
          <div className={styles.field}><label htmlFor="body">Article content <span>Required</span></label><textarea id="body" name="body" rows={16} maxLength={100000} required placeholder="Write your story here. Leave a blank line between paragraphs." value={body} onChange={(event) => setBody(event.currentTarget.value)} /><div className={styles.writingMeta}><span>Plain text only · Separate paragraphs with a blank line</span><span aria-live="polite">{wordCount.toLocaleString()} words{wordCount ? ` · about ${readingMinutes} min read` : ""}</span></div></div>
        </section>
        <section className={styles.card} aria-labelledby="cover-heading">
          <div className={styles.sectionTop}><span className={styles.step}>02</span><div><h3 id="cover-heading">Cover image</h3><p>Choose an approved image or link a properly credited cover.</p></div></div>
          <div className={styles.field}><label htmlFor="ogImageKey">Approved cover <span>Optional</span></label><select id="ogImageKey" name="ogImageKey" defaultValue=""><option value="">No approved cover selected</option>{Object.entries(NEWS_COVERS).map(([key, cover]) => <option key={key} value={key}>{cover.title} — {cover.credit}</option>)}</select><small>These images are illustrative and already credited.</small></div>
          <div className={styles.coverPanel}><NewsCoverUrlFields idPrefix="new-cover" /></div>
        </section>
        <details className={styles.advanced}><summary>Search appearance <span>Optional</span></summary><div className={styles.advancedFields}><div className={styles.field}><label htmlFor="seoTitle">Search title</label><input id="seoTitle" name="seoTitle" maxLength={70} /></div><div className={styles.field}><label htmlFor="seoDescription">Search description</label><input id="seoDescription" name="seoDescription" maxLength={200} /></div></div></details>
      </div>
      <aside className={styles.sidebar} aria-label="Article settings">
        <section className={styles.card}><div className={styles.sectionTop}><span className={styles.step}>03</span><div><h3>Story settings</h3><p>Help readers find the right story.</p></div></div>
          <div className={styles.field}><label htmlFor="categoryId">Category <span>Required</span></label><select id="categoryId" name="categoryId" required defaultValue=""><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select><small>To add a new category, visit <Link href={adminHref("/newsroom/settings")}>newsroom settings</Link>.</small></div>
          <div className={styles.field}><label htmlFor="authorId">Author <span>Required</span></label><select id="authorId" name="authorId" required value={author} onChange={(event) => setAuthor(event.currentTarget.value)}><option value="" disabled>Choose an author</option>{authors.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select><button ref={authorButton} className={styles.chooseAuthor} type="button" onClick={() => authorDialog.current?.showModal()}>Browse authors</button></div>
        </section>
        <section className={styles.publishInfo}><strong>Before you publish</strong><p>Saving creates a private article. An authorized publisher can review and publish it from the next screen.</p><SaveButton /><Link href={adminHref("/newsroom")}>Cancel and return</Link></section>
      </aside>
    </div>
    <dialog ref={authorDialog} className={styles.dialog} aria-labelledby="author-dialog-title" onClose={() => authorButton.current?.focus()}>
      <div className={styles.dialogHeader}><div><span className={styles.eyebrow}>BYLINE</span><h2 id="author-dialog-title">Choose an author</h2><p>Select a newsroom byline for this story.</p></div><button type="button" className={styles.close} aria-label="Close author selection" onClick={() => authorDialog.current?.close()}>×</button></div>
      <div className={styles.authorList}>{authors.map((item) => <button type="button" className={styles.authorOption} key={item.id} aria-pressed={author === item.id} onClick={() => { setAuthor(item.id); authorDialog.current?.close(); }}><span className={styles.avatar} aria-hidden="true">{(item.display_name ?? "A").slice(0, 1).toUpperCase()}</span><span>{item.display_name}</span>{author === item.id ? <span className={styles.selected}>Selected</span> : null}</button>)}</div>
      <p className={styles.dialogFoot}>Need another byline? <Link href={adminHref("/newsroom/settings")}>Manage authors</Link></p>
    </dialog>
  </form>;
}
