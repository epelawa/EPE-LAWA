import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const templateUrl = new URL("../../backend/supabase/templates/invite.html", import.meta.url);
const configUrl = new URL("../../backend/supabase/config.toml", import.meta.url);

test("staff invitation email is branded, responsive and uses only the secure Supabase confirmation link", async () => {
  const template = await readFile(templateUrl, "utf8");
  assert.match(template, /<html lang="en">/);
  assert.match(template, /name="viewport"/);
  assert.match(template, /#294B91/);
  assert.match(template, /#F1F4FA/);
  assert.match(template, /Your staff invitation/);
  assert.match(template, /set your own password/);
  assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
  assert.doesNotMatch(template, /\{\{ \.Password \}\}|access_token|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("local Supabase Auth config selects the branded invite template", async () => {
  const config = await readFile(configUrl, "utf8");
  assert.match(config, /\[auth\.email\.template\.invite\]\s+subject = "Set up your EPE LAWA staff access"\s+content_path = "\.\/supabase\/templates\/invite\.html"/);
});
