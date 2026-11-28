import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('the newsroom upload form sits beside the article list, not in a popup modal', async () => {
  const [listing, css, dashboard] = await Promise.all([
    read('frontend/apps/admin/app/(protected)/newsroom/page.tsx'),
    read('frontend/apps/admin/app/(protected)/newsroom/newsroom-list.module.css'),
    read('frontend/apps/admin/app/(protected)/page.tsx'),
  ]);
  await assert.rejects(read('frontend/apps/admin/components/composer-modal.tsx'));
  assert.doesNotMatch(listing, /ComposerModal|ComposerTrigger|showModal|<dialog/);
  assert.match(listing, /id="upload-article"/);
  assert.match(listing, /<NewsArticleComposer/);
  assert.match(listing, /styles\.workspace/);
  assert.match(listing, /href="#upload-article"/);
  assert.match(listing, /adminHref\("\/newsroom\/new"\)/);
  assert.match(css, /\.workspace \{ grid-template-columns:minmax\(0,1\.1fr\) minmax\(0,1fr\); \}/);
  assert.match(css, /@container \(max-width:640px\)/);
  assert.match(dashboard, /href=\{`\$\{adminHref\("\/newsroom"\)\}#upload-article`\}/);
});

test('other upload forms keep popup modal entry points with solid scrims', async () => {
  const [uploadField, coverFields, mainDialog, mainDialogCss] = await Promise.all([
    read('frontend/apps/admin/components/upload-modal-field.tsx'),
    read('frontend/apps/admin/components/news-cover-url-fields.tsx'),
    read('frontend/apps/main/components/branded-dialog.tsx'),
    read('frontend/apps/main/app/native-controls.css'),
  ]);

  assert.match(uploadField, /BrandedDialog/);
  assert.match(coverFields, /BrandedDialog/);
  assert.match(mainDialog, /showModal\(\)/);
  assert.match(mainDialogCss, /\.ui-dialog::backdrop/);
  assert.doesNotMatch(mainDialogCss, /backdrop-filter/);
});
