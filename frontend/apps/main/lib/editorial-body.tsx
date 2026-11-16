import type { ReactNode } from "react";
import { publicMediaUrl } from "./media";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeHref(value: unknown): string | null {
  const href = text(value)?.trim();
  if (!href || href.startsWith("//")) return null;
  if (href.startsWith("/")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderChildren(value: unknown, path: string): ReactNode[] {
  if (!Array.isArray(value)) return [];
  return value.map((child, index) => renderNode(child, `${path}-${index}`));
}

function renderNode(value: unknown, key: string): ReactNode {
  const node = record(value);
  if (!node) return null;

  const type = text(node.type);
  if (type === "text") {
    const content = text(node.text) ?? "";
    const marks = Array.isArray(node.marks) ? node.marks : [];
    return marks.reduce<ReactNode>((child, markValue, index) => {
      const mark = record(markValue);
      const markType = text(mark?.type);
      if (markType === "bold") return <strong key={`${key}-b-${index}`}>{child}</strong>;
      if (markType === "italic") return <em key={`${key}-i-${index}`}>{child}</em>;
      if (markType === "strike") return <s key={`${key}-s-${index}`}>{child}</s>;
      if (markType === "code") return <code key={`${key}-c-${index}`}>{child}</code>;
      if (markType === "link") {
        const attrs = record(mark?.attrs);
        const href = safeHref(attrs?.href);
        return href ? <a key={`${key}-a-${index}`} href={href} rel="nofollow noopener noreferrer">{child}</a> : child;
      }
      return child;
    }, content);
  }

  if (type === "hardBreak") return <br key={key} />;
  if (type === "horizontalRule") return <hr key={key} />;

  const children = renderChildren(node.content, key);
  switch (type) {
    case "doc":
      return <div key={key}>{children}</div>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const attrs = record(node.attrs);
      const level = Number(attrs?.level);
      if (level === 2) return <h2 key={key}>{children}</h2>;
      if (level === 3) return <h3 key={key}>{children}</h3>;
      if (level === 4) return <h4 key={key}>{children}</h4>;
      return <h2 key={key}>{children}</h2>;
    }
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "image": {
      const attrs = record(node.attrs);
      const src = publicMediaUrl(text(attrs?.src) ?? text(attrs?.key));
      if (!src) return null;
      const alt = text(attrs?.alt) ?? "";
      return (
        <figure key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" decoding="async" />
        </figure>
      );
    }
    default:
      // Unknown structural nodes are unwrapped; unknown attributes and raw HTML are never rendered.
      return <span key={key}>{children}</span>;
  }
}

function plainTextBody(body: string): ReactNode {
  const paragraphs = body.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>);
}

export function ArticleBody({ body }: { body: unknown }) {
  const content = typeof body === "string" ? plainTextBody(body) : renderNode(body, "root");
  return <div className="article-body">{content}</div>;
}
