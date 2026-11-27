import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = new URL('../apps/main/app/gallery/page.tsx', import.meta.url);
const styles = new URL('../apps/main/app/gallery/gallery.module.css', import.meta.url);

test('Gallery remains an honest empty state until media is approved', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /No photographs have been published/);
  // Turn 5 owner brief: the "Our standard / responsible sourcing" block was removed from the page;
  // the empty state and the photo-credits link still carry the honesty contract.
  assert.doesNotMatch(source, /Our standard|responsible sourcing|intentionally quiet/);
  assert.match(source, /approved, credited collection/i);
  assert.match(source, /honest empty state/i);
  assert.match(source, /href="\/photo-credits"/);
  assert.match(source, /href="\/tourism"/);
});

test('Gallery provides a responsive, reduced-motion-safe presentation', async () => {
  const source = await readFile(styles, 'utf8');
  // The two-column "standard" split (and its 700px breakpoint) went with the removed block in turn 5.
  assert.ok(!source.includes('.intro {'), 'removed standard block leaves no dead styles');
  assert.ok(source.includes('prefers-reduced-motion: reduce'), 'reduced motion');
  assert.ok(source.includes('focus-visible'), 'keyboard focus');
});
