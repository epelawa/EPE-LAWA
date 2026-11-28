import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const homeCss = fs.readFileSync(path.join(root, 'frontend/apps/main/app/home-client-refresh.css'), 'utf8');
const globals = fs.readFileSync(path.join(root, 'frontend/apps/main/app/globals.css'), 'utf8');

test('hero entrance is a staggered cascade reduced-motion can switch off', () => {
  const section = homeCss.slice(homeCss.indexOf('Apple-style micro-motion'));
  const [noPreference, reduced] = section.split('@media (prefers-reduced-motion: reduce)');
  assert.ok(noPreference && reduced !== undefined, 'micro-motion section has both motion blocks');
  assert.match(noPreference, /\.home-hero__content h1, \.home-hero__lede, \.home-hero__actions \{\s*animation: home-hero-rise 620ms var\(--ep-ease-out\) both;\s*\}/);
  assert.match(noPreference, /\.home-hero__content h1 \{ animation-delay: 90ms; \}/);
  assert.match(noPreference, /\.home-hero__lede \{ animation-delay: 170ms; \}/);
  assert.match(noPreference, /\.home-hero__actions \{ animation-delay: 250ms; \}/);
  assert.match(noPreference, /@keyframes home-hero-rise \{ from \{ opacity: 0; transform: translateY\(var\(--ep-motion-enter-y, 8px\)\); \} to \{ opacity: 1; transform: none; \} \}/);
  assert.match(reduced, /\.home-hero__content h1, \.home-hero__lede, \.home-hero__actions \{ animation: none; \}/);
});

test('shortcut tiles cascade staggered and press like a native control', () => {
  assert.match(homeCss, /\.home-shortcuts a:nth-child\(6\) \{ transition-delay: 275ms; \}/);
  assert.match(homeCss, /\.home-shortcuts a:active \{ transform: scale\(\.965\)/);
  assert.match(homeCss, /-webkit-tap-highlight-color: transparent/);
});

test('story cards lift and zoom with transform-only effects', () => {
  assert.match(homeCss, /\.home-story-card:hover \{ transform: translateY\(var\(--ep-motion-lift, -3px\)\); box-shadow: var\(--ep-shadow-2\); \}/);
  assert.match(homeCss, /\.home-story-card:hover \.home-story-image \{ transform: scale\(1\.035\); \}/);
  const reveals = [...homeCss.matchAll(/@keyframes ([a-z-]+) \{([^}]*)\}/g)];
  for (const [, , body] of reveals) {
    assert.match(body, /(opacity|transform|filter)/, 'keyframes animate compositor-friendly properties');
    assert.doesNotMatch(body, /(top|left|width|height):/, 'keyframes must not animate layout properties');
  }
});

test('button press feedback is guarded by reduced motion', () => {
  assert.match(globals, /\.btn-primary:active,\.btn-secondary:active,\.btn-ghost:active \{ transform: scale\(\.97\); \}/);
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\) \{ \.btn-primary:active,\.btn-secondary:active,\.btn-ghost:active \{ transform: none; \} \}/);
});
