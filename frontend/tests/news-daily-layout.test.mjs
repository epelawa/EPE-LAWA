import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { currentNewsLayout, lagosCalendarDate, NEWS_LAYOUTS, selectNewsLayout } from "../apps/main/lib/news-daily-layout.mjs";

const root = new URL("../apps/main/", import.meta.url);
const page = await readFile(new URL("app/news/page.tsx", root), "utf8");
const footer = await readFile(new URL("components/site-footer.tsx", root), "utf8");
const styles = await readFile(new URL("app/news/news.module.css", root), "utf8");
const globalStyles = await readFile(new URL("app/globals.css", root), "utf8");

test("Lagos calendar date controls a pure stable layout for every visitor that day", () => {
  const date = "2026-11-14";
  assert.equal(selectNewsLayout(date), selectNewsLayout(date));
  assert.equal(currentNewsLayout(new Date("2026-11-14T12:00:00.000Z")), selectNewsLayout(date));
  assert.equal(lagosCalendarDate(new Date("2026-11-14T12:00:00.000Z")), date);
});

test("Africa/Lagos midnight, rather than UTC midnight, advances layout", () => {
  assert.equal(lagosCalendarDate(new Date("2026-11-14T22:59:59.000Z")), "2026-11-14");
  assert.equal(lagosCalendarDate(new Date("2026-11-14T23:00:00.000Z")), "2026-11-15");
});

test("the deterministic rotation advances to a different layout on the next calendar day", () => {
  for (let day = 1; day <= 27; day++) {
    const first = `2026-11-${String(day).padStart(2, "0")}`;
    const second = `2026-11-${String(day + 1).padStart(2, "0")}`;
    assert.notEqual(selectNewsLayout(first), selectNewsLayout(second));
  }
  assert.equal(new Set(NEWS_LAYOUTS).size, 5);
});

test("News listing is forced to request-time rendering and emits the selected layout", () => {
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /currentNewsLayout\(\)/);
  assert.match(page, /data-news-layout=\{dailyLayout\}/);
  assert.doesNotMatch(page, /Math\.random|crypto\.random/);
});

test("News and article routes omit the full footer and retain a small accessible brand mark", () => {
  assert.match(footer, /pathname === "\/news" \|\| pathname\.startsWith\("\/news\/"\)/);
  assert.match(footer, /className="news-route-mark" aria-label="EPE LAWA"/);
  assert.match(footer, /EPE LAWA home/);
  assert.match(globalStyles, /\.news-route-mark/);
  assert.doesNotMatch(footer.split('if (pathname === "/news"')[1].split("return <footer className=\"site-footer\"")[0], /site-footer/);
});

test("truthful accessible search and category navigation remain on the News listing", () => {
  assert.match(page, /role="search" aria-label="Search published stories"/);
  assert.match(page, /<label className="sr-only" htmlFor="news-query">/);
  assert.match(page, /aria-label="News categories"/);
  assert.match(page, /aria-current=\{category === item\.slug \? "page" : undefined\}/);
  assert.match(page, /from\("published_articles"\)/);
  assert.match(page, /aria-label=\{`Read: \$\{lead\.title\}`\}/);
});
