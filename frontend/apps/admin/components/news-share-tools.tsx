"use client";

import { useState } from "react";
import { buildShareCover } from "../../main/lib/share-cover";
import { NEWS_HASHTAGS, suggestNewsHashtags } from "../lib/news-hashtags";
import styles from "./news-share-tools.module.css";

export default function NewsShareTools({ title, summary, url, imageUrl }: { title: string; summary: string | null; url: string; imageUrl: string | null }) {
  const [selected, setSelected] = useState<string[]>(() => suggestNewsHashtags(`${title} ${summary ?? ""}`).slice(0, 5));
  const [message, setMessage] = useState("");
  const [showManual, setShowManual] = useState(false);
  const caption = [title, summary, selected.map((tag) => `#${tag}`).join(" ")].filter(Boolean).join("\n\n");
  const text = `${caption}\n\n${url}`;
  function toggle(tag: string) { setSelected((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]); }
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("unavailable");
      await navigator.clipboard.writeText(text);
      setShowManual(false);
      setMessage("Caption and public link copied.");
    } catch { setShowManual(true); setMessage("Copy the caption and link below."); }
  }
  async function share() {
    if (navigator.share) {
      try {
        if (navigator.canShare?.({ files: [new File(["x"], "cover.png", { type: "image/png" })] })) {
          const cover = await buildShareCover(imageUrl || new URL("/brand-logo.webp", url).toString());
          if (cover && navigator.canShare({ files: [cover] })) {
            await navigator.share({ title, text, files: [cover] });
            setMessage("Cover image and caption sent to the share sheet.");
            return;
          }
        }
        await navigator.share({ title, text: caption, url });
        setMessage("Link shared. This device or image host did not allow attaching the cover file.");
        return;
      } catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    }
    await copy();
    setMessage("The cover image could not be attached. Use the copied caption and link, or select them below if clipboard access is unavailable.");
  }
  return <section className={styles.share} aria-labelledby="admin-share-title">
    <div><h2 id="admin-share-title">Share this story</h2><p>Choose hashtags and share the public link with a caption. When supported, the cover is attached as a file; otherwise only the link and caption can be shared.</p></div>
    <details><summary>Choose hashtags ({selected.length} selected)</summary><p>Suggestions are based on matching words, not AI. Review them before sharing.</p><div className={styles.tags}>{NEWS_HASHTAGS.map(({ tag }) => <button key={tag} type="button" aria-pressed={selected.includes(tag)} onClick={() => toggle(tag)}>#{tag}</button>)}</div></details>
    <div className={styles.actions}><button type="button" onClick={share}>Share article</button><button type="button" onClick={copy}>Copy caption and link</button></div>
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
    {showManual ? <label className={styles.manual}>Caption and public link<textarea readOnly value={text} onFocus={(event) => event.currentTarget.select()} rows={6} /></label> : null}
  </section>;
}
