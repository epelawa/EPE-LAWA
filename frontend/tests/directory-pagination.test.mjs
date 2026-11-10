import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tourism = await readFile(new URL("../apps/main/app/tourism/page.tsx", import.meta.url), "utf8");
const people = await readFile(new URL("../apps/main/app/who-is-who/page.tsx", import.meta.url), "utf8");

test("Tourism search remains on approved records and uses safe, bounded, stable pagination", () => {
  assert.match(tourism, /from\("tourism_destinations"\)/);
  assert.match(tourism, /function cleanSearch/);
  assert.match(tourism, /const PAGE_SIZE = 50/);
  assert.match(tourism, /const MAX_PAGE = 1000/);
  assert.match(tourism, /\.order\("id", \{ ascending: true \}\)\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(tourism, /hasOlder = rows\.length > PAGE_SIZE && page < MAX_PAGE/);
  assert.match(tourism, /Older destinations/);
  assert.match(tourism, /params\.set\("q", query\)/);
  assert.doesNotMatch(tourism, /\.limit\(50\)|seed|sample destination/i);
});

test("Who-is-Who pagination stays on the published view and does not select private contact fields", () => {
  assert.match(people, /from\("published_people"\)/);
  assert.match(people, /\.range\(start, start \+ PAGE_SIZE\)/);
  assert.match(people, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(people, /params\.set\("name", name\)/);
  assert.match(people, /params\.set\("office", office\)/);
  assert.match(people, /params\.set\("community", community\)/);
  assert.match(people, /function cleanFilter/);
  assert.match(people, /Office search could not be loaded/);
  assert.match(people, /more than 500 public office records/);
  assert.doesNotMatch(people, /email|phone|private_contact|media_rights/i);
  assert.doesNotMatch(people, /from\("people"\)/);
});
