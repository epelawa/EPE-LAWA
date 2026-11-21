import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const actions = new URL('../apps/admin/lib/actions.ts', import.meta.url);
const fields = new URL('../apps/admin/components/news-cover-url-fields.tsx', import.meta.url);
const composer = new URL('../apps/admin/components/news-article-composer.tsx', import.meta.url);
const newPage = new URL('../apps/admin/app/(protected)/newsroom/new/page.tsx', import.meta.url);
const editPage = new URL('../apps/admin/app/(protected)/newsroom/[id]/page.tsx', import.meta.url);

test('Server actions store uploaded covers in R2 and register them in the media workspace', async () => {
  const source = await readFile(actions, 'utf8');
  assert.match(source, /coverUploadFile/);
  assert.match(source, /storeCoverUpload/);
  assert.match(source, /putMediaObject\("public", objectKey/);
  assert.match(source, /media_asset_create/);
  assert.match(source, /publicMediaUrl/);
  assert.match(source, /COVER_UPLOAD_MAX_BYTES = 26_214_400/);
  assert.doesNotMatch(source, /EXTRACT.*never>, string> = \{\}/);
});

test('Only one cover source is accepted and every path handles uploads', async () => {
  const source = await readFile(actions, 'utf8');
  assert.match(source, /Choose only one cover source: a link or an upload, not both\./);
  assert.match(source, /invalidCover[\s\S]*?coverUploadFile/);
  for (const rpc of ['article_create_with_cover', 'article_draft_update_with_cover', 'article_revise_with_cover']) {
    assert.match(source, new RegExp(rpc));
  }
  const uploadWiring = source.match(/coverUploadFile\(formData\)/g) ?? [];
  assert.ok(uploadWiring.length >= 4, 'upload plumbbed through create, draft and revise paths');
});

test('Cover fields offer device upload only when R2 is configured and keep honest fallback copy', async () => {
  const source = await readFile(fields, 'utf8');
  assert.match(source, /name="coverUpload"/);
  assert.match(source, /image\/jpeg,image\/png,image\/webp,image\/avif/);
  assert.match(source, /uploadAvailable = false/);
  assert.match(source, /An EPE LAWA image-storage bucket is not configured, so direct uploads are unavailable/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /approved cover|ogImageKey/);
});

test('Newsroom pages pass the live upload availability into the composer', async () => {
  const composerSource = await readFile(composer, 'utf8');
  assert.match(composerSource, /coverUploadAvailable = false/);
  assert.match(composerSource, /uploadAvailable=\{coverUploadAvailable\}/);
  const newPageSource = await readFile(newPage, 'utf8');
  assert.match(newPageSource, /coverUploadState/);
  assert.match(newPageSource, /coverUploadAvailable/);
  const editPageSource = await readFile(editPage, 'utf8');
  assert.match(editPageSource, /coverUploadState/);
  assert.match(editPageSource, /uploadAvailable=/);
});
