import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildOrIlikeContains, escapePostgrestLikeTerm } from "../apps/main/lib/postgrest-search.ts";

test("PostgREST search treats wildcard and control characters as literal bounded text", () => {
  assert.equal(escapePostgrestLikeTerm(" 100%_\\*\n"), "100\\%\\_\\\\\\*");
  assert.equal(escapePostgrestLikeTerm("x".repeat(240)).length, 200);
});

test("PostgREST OR filters quote reserved characters and only accept fixed identifiers", () => {
  assert.equal(
    buildOrIlikeContains(["name", "description"], "a,b"),
    'name.ilike."%a,b%",description.ilike."%a,b%"',
  );
  const crafted = buildOrIlikeContains(["name"], 'x"),id.eq.1,(y');
  assert.match(crafted, /\\"\),id\.eq\.1,\(y/);
  assert.throws(() => buildOrIlikeContains(["name).or(id.eq.1"], "x"), /fixed identifiers/);
  assert.equal(buildOrIlikeContains(["name"], "  \n  "), "");
});

test("user-controlled public OR searches use the shared PostgREST builder", async () => {
  const callers = [
    "../apps/main/app/who-is-who/page.tsx",
    "../apps/main/app/business-directory/page.tsx",
    "../apps/main/app/tourism/page.tsx",
    "../apps/main/app/itan-ilu-mi/page.tsx",
    "../apps/main/lib/site-search.ts",
  ];
  for (const path of callers) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /\.or\(buildOrIlikeContains\(/, `${path} must use the safe OR builder`);
    assert.doesNotMatch(source, /\.or\(\s*`[^`]*\$\{/, `${path} must not interpolate request text into OR grammar`);
  }
  const forum = await readFile(new URL("../apps/main/app/forum/page.tsx", import.meta.url), "utf8");
  assert.match(forum, /escapePostgrestLikeTerm\(searchQuery\)/);
});
