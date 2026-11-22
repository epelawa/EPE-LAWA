export type InlinePart = { text: string; kind: "same" | "added" | "removed" };
export type ParagraphOp = { kind: "same" | "added" | "removed"; text: string };

const MAX_TOKENS = 800;

function tokenizeWords(text: string): string[] {
  const matches = text.match(/\S+|\s+/g);
  return matches ? matches.slice(0, MAX_TOKENS) : [];
}

export function inlineWordDiff(before: string, after: string): { words: InlinePart[]; truncated: boolean } {
  const a = tokenizeWords(before);
  const b = tokenizeWords(after);
  const truncated = a.length >= MAX_TOKENS || b.length >= MAX_TOKENS;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const words: InlinePart[] = [];
  const push = (kind: InlinePart["kind"], text: string) => {
    const last = words[words.length - 1];
    if (last && last.kind === kind) last.text += text;
    else words.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("removed", a[i]);
      i += 1;
    } else {
      push("added", b[j]);
      j += 1;
    }
  }
  while (i < a.length) {
    push("removed", a[i]);
    i += 1;
  }
  while (j < b.length) {
    push("added", b[j]);
    j += 1;
  }
  return { words, truncated };
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function collectParagraphs(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  const record = node as { type?: unknown; text?: unknown; content?: unknown };
  if ((record.type === "paragraph" || record.type === "heading") && Array.isArray(record.content)) {
    const text = (record.content as unknown[])
      .map((leaf) => textOf((leaf as { text?: unknown })?.text))
      .join("")
      .trim();
    if (text) out.push(text);
    return;
  }
  if (Array.isArray(record.content)) {
    for (const child of record.content) collectParagraphs(child, out);
  }
}

export function bodyParagraphs(body: unknown): string[] {
  if (typeof body === "string") {
    return body
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }
  const out: string[] = [];
  try {
    collectParagraphs(body, out);
  } catch {
    return [];
  }
  return out.slice(0, 400);
}

export function paragraphDiff(before: string[], after: string[]): ParagraphOp[] {
  const dp: number[][] = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      dp[i][j] = before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: ParagraphOp[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      ops.push({ kind: "same", text: before[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: "removed", text: before[i] });
      i += 1;
    } else {
      ops.push({ kind: "added", text: after[j] });
      j += 1;
    }
  }
  while (i < before.length) {
    ops.push({ kind: "removed", text: before[i] });
    i += 1;
  }
  while (j < after.length) {
    ops.push({ kind: "added", text: after[j] });
    j += 1;
  }
  return ops;
}
