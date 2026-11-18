import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public filter panels stay consistent while News keeps reference category tabs", async () => {
  const pages = [
    "../apps/main/app/business-directory/page.tsx",
    "../apps/main/app/tourism/page.tsx",
    "../apps/main/app/who-is-who/page.tsx",
    "../apps/main/app/map/map-search.tsx",
  ];
  for (const path of pages) {
    const page = await source(path);
    assert.match(page, /filter-panel/, path);
    assert.match(page, /FilterIcon/, path);
    assert.match(page, /SearchIcon/, path);
    assert.match(page, /role="search"/, path);
  }
  const news = await source("../apps/main/app/news/page.tsx");
  assert.match(news, /role="search"/);
  assert.match(news, /editorialTabs/);
  assert.match(news, /Search stories, topics and authors/);
  assert.doesNotMatch(news, /FilterIcon|filter-panel|Filter news/i);
  const icons = await source("../apps/main/components/icons.tsx");
  assert.match(icons, /export const FilterIcon[\s\S]*?<svg aria-hidden="true"/);
  assert.match(icons, /export const SearchIcon[\s\S]*?<svg aria-hidden="true"/);
  const css = await source("../apps/main/app/globals.css");
  assert.match(css, /\.filter-panel \.input \{[^}]*border-radius: 16px/);
  assert.match(css, /\.filter-panel__control \.input \{ padding-left: 44px; \}/);
  assert.match(css, /\.filter-panel__icon \{[^}]*border-radius: 15px/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.filter-panel[^}]*grid-template-columns: minmax\(0, 1fr\)/);
});
