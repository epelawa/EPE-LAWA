import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Tourism photo references are responsive, source-linked and not treated as approved destination records", async () => {
  const page = await read("frontend/apps/main/app/tourism/page.tsx");
  const galleryStart = page.indexOf('aria-labelledby="tourism-photo-references"');
  const databaseStateStart = page.indexOf("{failed ?");
  const gallery = page.slice(galleryStart, page.indexOf('aria-label="Search approved tourism destinations"'));

  assert.ok(galleryStart >= 0, "photo-reference section exists");
  assert.ok(databaseStateStart > galleryStart, "photo references render independently of destination query state");
  assert.match(page, /import Image from "next\/image"/);
  assert.match(gallery, /src="\/epe-iberekodo-beach\.jpg"/);
  assert.match(gallery, /src="\/epe-through-mangrove\.jpg"/);
  assert.match(gallery, /sizes="\(max-width: 640px\) 100vw, 50vw"/);
  assert.match(gallery, /alt="A sandy shoreline with water, sky and green plants in the foreground\."/);
  assert.match(gallery, /alt="People in canoes on a tree-lined waterway, seen from another canoe\."/);
  assert.match(gallery, /not approved destination listings/);
  assert.doesNotMatch(gallery, /Wikimedia Commons title:/);
  assert.match(gallery, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Iberekodo_Beach,_Epe,_Lagos\.jpg"/);
  assert.match(gallery, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Through_Epe_Mangrove\.jpg"/);
  assert.match(gallery, /href="https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/"/);
  assert.match(gallery, /href="\/photo-credits"/);
  assert.doesNotMatch(gallery, /without cropping/);
});

test("Tourism photo attribution file records both creators, source links and share-alike terms", async () => {
  const attribution = await read("frontend/apps/main/public/epe-photo-attributions.txt");
  assert.match(attribution, /Tarikhaldun/);
  assert.match(attribution, /Dotun55 \(Adedotun Ajibade\)/);
  assert.match(attribution, /Iberekodo_Beach,_Epe,_Lagos\.jpg/);
  assert.match(attribution, /Through_Epe_Mangrove\.jpg/);
  assert.match(attribution, /CC BY-SA 4\.0/);
  assert.match(attribution, /Next\.js responsive image optimization/);
  assert.match(attribution, /without cropping/);
  assert.match(attribution, /not verified destination listings/);
});
