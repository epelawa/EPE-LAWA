import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeExternalNewsAttributionUrl,
  normalizeExternalNewsCoverUrl,
} from "../apps/main/lib/news-cover-url.mjs";

test("accepts only exact approved image hosts and normalizes host spelling", () => {
  const approved = [
    ["https://images.unsplash.com/photo/cover.jpg", "https://images.unsplash.com/photo/cover.jpg"],
    ["https://images.pexels.com/photos/cover.jpeg", "https://images.pexels.com/photos/cover.jpeg"],
    ["https://cdn.pixabay.com/photo/cover.png", "https://cdn.pixabay.com/photo/cover.png"],
    ["https://upload.wikimedia.org/a/photo.jpg?width=1200", "https://upload.wikimedia.org/a/photo.jpg?width=1200"],
    ["HTTPS://IMAGES.UNSPLASH.COM:443/photo.jpg", "https://images.unsplash.com/photo.jpg"],
    ["https://images.pexels.com.:443/photo.jpg", "https://images.pexels.com/photo.jpg"],
    ["https://CDN.PIXABAY.COM./photo.jpg", "https://cdn.pixabay.com/photo.jpg"],
  ];
  for (const [input, expected] of approved) {
    assert.equal(normalizeExternalNewsCoverUrl(input), expected, `should accept and normalize ${input}`);
  }
});

test("rejects arbitrary public hosts and allowlist lookalikes as cover images", () => {
  for (const value of [
    "https://public.example.org/cover.jpg",
    "https://evilimages.unsplash.com/cover.jpg",
    "https://images.unsplash.com.attacker.example/cover.jpg",
    "https://images.unsplash.com.evil/cover.jpg",
    "https://commons.wikimedia.org/wiki/File:Photo.jpg",
  ]) {
    assert.equal(normalizeExternalNewsCoverUrl(value), null, `must reject ${JSON.stringify(value)}`);
  }
});

test("keeps safe source and license URLs independent from image-host allowlisting", () => {
  for (const value of [
    "https://commons.wikimedia.org/wiki/File:Photo.jpg",
    "https://creativecommons.org/licenses/by/4.0/",
    "https://photographer.example.org/portfolio/photo",
  ]) {
    assert.equal(normalizeExternalNewsAttributionUrl(value), value);
    assert.equal(normalizeExternalNewsCoverUrl(value), null);
  }
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
