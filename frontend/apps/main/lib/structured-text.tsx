import type { ReactNode } from "react";

const TOKEN = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]{1,300})\]\((https:\/\/[^)\s]{1,600})\)/g;

function renderInline(text: string, keyBase: string, depth = 0): ReactNode[] {
  if (depth > 3 || text.length > 20000) return [text];
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const key = `${keyBase}-${index}`;
    if (match[1] !== undefined) nodes.push(<strong key={key}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<em key={key}>{match[2]}</em>);
    else if (match[3] !== undefined && match[4] !== undefined) {
      const safeLabel = match[3].replace(/https?:\/\//g, "").replace(/[*[\]()<>]/g, "").trim();
      nodes.push(
        <a key={key} href={match[4]} target="_blank" rel="noopener noreferrer nofollow">
          {safeLabel || "link"}
        </a>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function StructuredText({ text, maxBlocks = 40 }: { text: string; maxBlocks?: number }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).slice(0, maxBlocks);
  if (blocks.length === 0) return null;
  const out: ReactNode[] = [];
  for (let b = 0; b < blocks.length; b += 1) {
    const block = blocks[b];
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.every((l) => /^[-•]\s+/.test(l))) {
      out.push(
        <ul key={b}>
          {lines.map((l, i) => <li key={i}>{renderInline(l.replace(/^[-•]\s+/, ""), `${b}-${i}`)}</li>)}
        </ul>,
      );
      continue;
    }
    if (lines.every((l) => /^\d{1,2}[.)]\s+/.test(l))) {
      out.push(
        <ol key={b}>
          {lines.map((l, i) => <li key={i}>{renderInline(l.replace(/^\d{1,2}[.)]\s+/, ""), `${b}-${i}`)}</li>)}
        </ol>,
      );
      continue;
    }
    const quoted = lines.filter((l) => l.length > 0 && (l.startsWith("> ") || l === ">"));
    if (quoted.length === lines.length) {
      out.push(
        <blockquote key={b}>
          {quoted.map((l, i) => <p key={i}>{renderInline(l.replace(/^>\s?/, ""), `${b}-${i}`)}</p>)}
        </blockquote>,
      );
      continue;
    }
    out.push(<p key={b}>{renderInline(block, String(b))}</p>);
  }
  return <>{out}</>;
}

export function renderInlineText(text: string, keyBase = "i"): ReactNode[] {
  return renderInline(text, keyBase);
}
