import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('the newsroom publish composer opens as a blur-backdrop popup modal, not only a full page', async () => {
  const [modal, css, listing, dashboard] = await Promise.all([
    read('frontend/apps/admin/components/composer-modal.tsx'),
    read('frontend/apps/admin/components/article-composer-modal.module.css'),
    read('frontend/apps/admin/app/(protected)/newsroom/page.tsx'),
    read('frontend/apps/admin/app/(protected)/page.tsx'),
  ]);

  assert.match(css, /\.modal::backdrop[\s\S]*?backdrop-filter:\s*blur\(/);
  assert.match(css, /\.modal::backdrop[\s\S]*?-webkit-backdrop-filter:\s*blur\(/);

  assert.match(modal, /defaultOpen = false/);
  assert.match(modal, /useState\(defaultOpen\)/);
  assert.match(modal, /dialog\.showModal\(\)/);

  assert.match(listing, /defaultOpen=\{compose === "1" && canCompose\}/);
  assert.equal((listing.match(/<ComposerTrigger/g) ?? []).length, 2);
  assert.match(modal, /ComposerContext\.Provider/);
  assert.match(dashboard, /href=\{`\$\{adminHref\("\/newsroom"\)\}\?compose=1`\}/);
  assert.match(listing, /adminHref\("\/newsroom\/new"\)/);
});

test('other upload forms keep popup modal entry points with blur backdrops', async () => {
  const [uploadField, coverFields, mainDialog, mainDialogCss] = await Promise.all([
    read('frontend/apps/admin/components/upload-modal-field.tsx'),
    read('frontend/apps/admin/components/news-cover-url-fields.tsx'),
    read('frontend/apps/main/components/branded-dialog.tsx'),
    read('frontend/apps/main/app/native-controls.css'),
  ]);

  assert.match(uploadField, /BrandedDialog/);
  assert.match(coverFields, /BrandedDialog/);
  assert.match(mainDialog, /showModal\(\)/);
  assert.match(mainDialogCss, /\.ui-dialog::backdrop[\s\S]*?backdrop-filter/);
});
