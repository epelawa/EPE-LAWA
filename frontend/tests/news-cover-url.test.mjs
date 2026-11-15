import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExternalNewsCoverUrl } from "../apps/main/lib/news-cover-url.mjs";

test("normalizes public HTTPS cover, source and license links without fetching them", () => {
  assert.equal(
    normalizeExternalNewsCoverUrl("  https://upload.wikimedia.org/a/photo.jpg?width=1200  "),
    "https://upload.wikimedia.org/a/photo.jpg?width=1200",
  );
  assert.equal(normalizeExternalNewsCoverUrl("https://images.example.com/cover"), "https://images.example.com/cover");
  assert.equal(normalizeExternalNewsCoverUrl("https://images.example.com:443/cover"), "https://images.example.com/cover");
  assert.equal(normalizeExternalNewsCoverUrl("https://creativecommons.org/licenses/by/4.0/"), "https://creativecommons.org/licenses/by/4.0/");
});

test("rejects insecure, credentialed, local, private-address and malformed references", () => {
  const rejected = [
    "http://images.example.com/cover.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//images.example.com/cover.jpg",
    "https://editor:secret@images.example.com/cover.jpg",
    "https://localhost/cover.jpg",
    "https://news.local/cover.jpg",
    "https://service.internal/cover.jpg",
    "https://media.example/cover.jpg",
    "https://192.168.1.10/cover.jpg",
    "https://127.1/cover.jpg",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/cover.jpg",
    "https://images.example.com:8443/cover.jpg",
    "https://images.example.com/cover\n.jpg",
    `https://images.example.com/${"a".repeat(2048)}`,
    "https://images..example.com/cover.jpg",
  ];
  for (const value of rejected) {
    assert.equal(normalizeExternalNewsCoverUrl(value), null, `must reject ${JSON.stringify(value)}`);
  }
  assert.equal(normalizeExternalNewsCoverUrl(null), null);
  assert.equal(normalizeExternalNewsCoverUrl({ href: "https://images.example.com/a" }), null);
});
