import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeExternalNewsAttributionUrl,
  normalizeExternalNewsCoverUrl,
} from "../apps/main/lib/news-cover-url.mjs";

test("normalizes only exact approved image-provider hosts for automatically loaded covers", () => {
  const approved = [
    "https://images.unsplash.com/photo/cover.jpg",
    "https://images.pexels.com/photos/cover.jpeg",
    "https://cdn.pixabay.com/photo/cover.png",
    "https://upload.wikimedia.org/a/photo.jpg?width=1200",
  ];
  for (const url of approved) assert.equal(normalizeExternalNewsCoverUrl(url), url);
  assert.equal(
    normalizeExternalNewsCoverUrl("  https://upload.wikimedia.org/a/photo.jpg?width=1200  "),
    "https://upload.wikimedia.org/a/photo.jpg?width=1200",
  );
  assert.equal(normalizeExternalNewsCoverUrl("https://images.unsplash.com:443/cover.jpg"), "https://images.unsplash.com/cover.jpg");
});

test("keeps clickable source and license URLs separate from automatically loaded image hosts", () => {
  assert.equal(
    normalizeExternalNewsAttributionUrl("https://commons.wikimedia.org/wiki/File:Photo.jpg"),
    "https://commons.wikimedia.org/wiki/File:Photo.jpg",
  );
  assert.equal(
    normalizeExternalNewsAttributionUrl("https://creativecommons.org/licenses/by/4.0/"),
    "https://creativecommons.org/licenses/by/4.0/",
  );
  assert.equal(normalizeExternalNewsAttributionUrl("https://images.example.com/cover.jpg"), "https://images.example.com/cover.jpg");
  assert.equal(normalizeExternalNewsCoverUrl("https://commons.wikimedia.org/wiki/File:Photo.jpg"), null);
  assert.equal(normalizeExternalNewsCoverUrl("https://images.example.com/cover.jpg"), null);
  assert.equal(normalizeExternalNewsAttributionUrl("http://creativecommons.org/licenses/by/4.0/"), null);
});

test("rejects non-allowlisted image hosts and hostname lookalikes", () => {
  const rejectedCovers = [
    "https://images.example.com/cover.jpg",
    "https://evilimages.unsplash.com/cover.jpg",
    "https://images.unsplash.com.attacker.example/cover.jpg",
  ];
  for (const value of rejectedCovers) {
    assert.equal(normalizeExternalNewsCoverUrl(value), null, `must reject image host ${JSON.stringify(value)}`);
  }
});

test("rejects insecure, credentialed, local, private-address and malformed references", () => {
  const rejected = [
    "http://images.unsplash.com/cover.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//images.unsplash.com/cover.jpg",
    "https://editor:secret@images.unsplash.com/cover.jpg",
    "https://localhost/cover.jpg",
    "https://news.local/cover.jpg",
    "https://service.internal/cover.jpg",
    "https://media.example/cover.jpg",
    "https://192.168.1.10/cover.jpg",
    "https://127.1/cover.jpg",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/cover.jpg",
    "https://images.unsplash.com:8443/cover.jpg",
    "https://images.unsplash.com/cover\n.jpg",
    `https://images.unsplash.com/${"a".repeat(2048)}`,
    "https://images..unsplash.com/cover.jpg",
  ];
  for (const value of rejected) {
    assert.equal(normalizeExternalNewsCoverUrl(value), null, `must reject image URL ${JSON.stringify(value)}`);
    assert.equal(normalizeExternalNewsAttributionUrl(value), null, `must reject unsafe reference ${JSON.stringify(value)}`);
  }
  assert.equal(normalizeExternalNewsCoverUrl(null), null);
  assert.equal(normalizeExternalNewsCoverUrl({ href: "https://images.unsplash.com/a" }), null);
});
