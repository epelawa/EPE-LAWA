"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import styles from "./rich-text-editor.module.css";

type Props = {
  name: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  ariaLabel: string;
  describedBy?: string;
};

export default function RichTextEditor({ name, defaultValue = "", rows = 12, maxLength = 50000, ariaLabel, describedBy }: Props) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [length, setLength] = useState(defaultValue.length);

  function recount() { setLength(areaRef.current?.value.length ?? 0); }

  useEffect(() => {
    const form = areaRef.current?.closest("form");
    form?.addEventListener("reset", recount);
    return () => form?.removeEventListener("reset", recount);
  }, []);

  function escapeReg(text: string): string { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function replaceSelection(before: string, after: string) {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = area.value.slice(start, end);
    const inner = selected.replace(new RegExp(`^\\s*${escapeReg(before)}\\s*`), "").replace(new RegExp(`\\s*${escapeReg(after)}\\s*$`), "");
    const next = `${area.value.slice(0, start)}${before}${inner}${after}${area.value.slice(end)}`;
    area.value = next;
    setLength(next.length);
    const cursor = start + before.length + inner.length;
    area.focus();
    area.setSelectionRange(cursor, cursor);
  }

  function prefixLines(prefixFor: (line: string, index: number) => string) {
    const area = areaRef.current;
    if (!area) return;
    const start = area.value.lastIndexOf("\n", Math.max(area.selectionStart - 1, 0)) + 1;
    const endIndex = area.value.indexOf("\n", area.selectionEnd);
    const end = endIndex === -1 ? area.value.length : endIndex;
    let counter = 1;
    const nextChunk = area.value.slice(start, end).split("\n").map((line, index) => {
      const stripped = line.replace(/^([-•]\s+|\d{1,2}[.)]\s+|>\s?)/, "");
      return stripped.trim() || index === 0 ? prefixFor(stripped, counter++) : line;
    }).join("\n");
    const next = `${area.value.slice(0, start)}${nextChunk}${area.value.slice(end)}`;
    area.value = next;
    setLength(next.length);
    area.focus();
    area.setSelectionRange(start, start + nextChunk.length);
  }

  function insertLink() {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const label = area.value.slice(start, end).trim() || "link text";
    const url = window.prompt("Full HTTPS address to link to, for example https://example.com");
    if (!url || !/^https:\/\//.test(url)) return;
    const token = `[${label}](${url})`;
    const next = `${area.value.slice(0, start)}${token}${area.value.slice(end)}`;
    area.value = next;
    setLength(next.length);
    area.focus();
    const cursor = start + token.length;
    area.setSelectionRange(cursor, cursor);
  }

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) { setLength(event.target.value.length); }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
        <button type="button" className={styles.tool} onClick={() => replaceSelection("**", "**")} title="Bold (wraps the selected text in **)"><span aria-hidden="true">B</span><span className="sr-only">Bold</span></button>
        <button type="button" className={styles.tool} onClick={() => replaceSelection("*", "*")} title="Italic (wraps the selected text in *)"><span aria-hidden="true"><em>I</em></span><span className="sr-only">Italic</span></button>
        <button type="button" className={styles.tool} onClick={() => prefixLines(() => "- ")} title="Bullet list"><span aria-hidden="true">&#8226;&#8867;</span><span className="sr-only">Bullet list</span></button>
        <button type="button" className={styles.tool} onClick={() => prefixLines((_line, index) => `${index}. `)} title="Numbered list"><span aria-hidden="true">1.&#8867;</span><span className="sr-only">Numbered list</span></button>
        <button type="button" className={styles.tool} onClick={insertLink} title="Add a link to the selected text"><span aria-hidden="true">&#128279;</span><span className="sr-only">Add link</span></button>
        <button type="button" className={styles.tool} onClick={() => prefixLines(() => "> ")} title="Quote"><span aria-hidden="true">&#8220;&#8221;</span><span className="sr-only">Quote</span></button>
        <span className={styles.count} aria-live="polite">{length.toLocaleString("en-NG")} / {maxLength.toLocaleString("en-NG")}</span>
      </div>
      <textarea
        ref={areaRef}
        className={`input admin-textarea ${styles.area}`}
        name={name}
        rows={rows}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        defaultValue={defaultValue}
        onChange={onChange}
      />
    </div>
  );
}
