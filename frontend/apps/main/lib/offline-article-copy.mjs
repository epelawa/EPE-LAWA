function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(date)
    : "";
}

export function offlineArticleFilename(slug) {
  const safeSlug = String(slug)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `epe-lawa-${safeSlug || "story"}-offline.html`;
}

export function buildOfflineArticleHtml(article, bodyText) {
  const paragraphs = String(bodyText)
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  const summary = article.summary ? `<p class="summary">${escapeHtml(article.summary)}</p>` : "";
  const meta = [article.author, article.category, formatDate(article.publishedAt)]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(article.title)} · EPE LAWA offline copy</title>
<style>
:root{color-scheme:light;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0a1023;background:#f1f4fa}*{box-sizing:border-box}body{margin:0;padding:32px 16px;line-height:1.7}main{max-width:760px;margin:0 auto;padding:clamp(22px,5vw,48px);background:#fff;border:1px solid #d9e1ef;border-radius:24px;box-shadow:0 18px 48px rgba(23,38,74,.08)}.brand{margin:0 0 28px;color:#294b91;font-size:12px;font-weight:800;letter-spacing:.16em}.label{color:#477fe0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}h1{margin:.4em 0 .35em;font-size:clamp(30px,6vw,48px);line-height:1.12;letter-spacing:-.03em}.summary{font-size:1.12rem;font-weight:600;color:#294b91}.meta{color:#65738d;font-size:.9rem}.story{margin:32px 0}.story p{margin:0 0 1.2em}.note{border-top:1px solid #d9e1ef;padding-top:18px;color:#65738d;font-size:.9rem}.note p{margin:.5em 0} @media(prefers-color-scheme:dark){:root{color-scheme:light}}
</style>
</head>
<body>
<main>
<p class="brand">EPE LAWA · OFFLINE COPY</p>
<p class="label">${escapeHtml(article.category || "Newsroom")}</p>
<h1>${escapeHtml(article.title)}</h1>
${summary}
<p class="meta">${meta ? `By ${meta}` : "Published by EPE LAWA"}</p>
<hr>
<section class="story" aria-label="Article text">${paragraphs || "<p>Article text was not available when this copy was created.</p>"}</section>
<footer class="note"><p>This local copy contains text only. Images, later updates and corrections are not included.</p><p>Original story: ${escapeHtml(article.sourceUrl)}</p></footer>
</main>
</body>
</html>`;
}
