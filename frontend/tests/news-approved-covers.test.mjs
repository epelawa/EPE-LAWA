import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
test('approved catalog uses only stable approved keys and includes exact attributions',()=>{
 const c=read('apps/main/lib/news-covers.ts');
 for(const key of ['epe_welcome_demobebz','epe_road_benbeezy']) assert.match(c,new RegExp(key));
 assert.match(c,/Object\.prototype\.hasOwnProperty\.call/); assert.match(c,/CC BY-SA 4\.0/); assert.match(c,/illustrative/); assert.match(c,/No image edits/);
});
test('approved keys resolve locally and admin validates and passes selected key through saves',()=>{
 assert.match(read('apps/main/lib/media.ts'),/isNewsCoverKey\(key\).*NEWS_COVERS\[key\]\.url/s);
 const a=read('apps/admin/lib/actions.ts'); assert.match(a,/rawCover && !isNewsCoverKey\(rawCover\)/); assert.match(a,/p_og_image_key: fields\.ogImageKey/); assert.match(a,/p_og_image_key: ogImageKey/);
});
test('public article renders approved local cover credits and reserves the cover container',()=>{
 const p=read('apps/main/app/news/[slug]/page.tsx'), css=read('apps/main/app/news/news.module.css');
 assert.match(p,/photo-credits#news-photos/); assert.match(p,/Illustrative image/);
 const credits=read("apps/main/app/photo-credits/page.tsx"); assert.match(credits,/image\.source/); assert.match(credits,/image\.license/); assert.match(p,/cover\?\.alt/); assert.match(p,/selectedNewsCover\(article\.og_image_key\)/);
 assert.doesNotMatch(p,/cover_url|cover_alt|cover_credit|cover_source_url|cover_license_url|cover_caption/);
 assert.match(css,/articleHeroImage\.approvedCoverFull[\s\S]*object-fit:cover/); assert.match(css,/approvedCoverThumb \{ object-fit:cover/);
});

import { createHash } from 'node:crypto';
import { NEWS_COVERS, isNewsCoverKey, selectedNewsCover } from '../apps/main/lib/news-covers.ts';
import { publicMediaUrl } from '../apps/main/lib/media.ts';

test('actual cover catalog resolves only approved keys without requiring external storage', () => {
  for (const [key, cover] of Object.entries(NEWS_COVERS)) {
    assert.equal(isNewsCoverKey(key), true);
    assert.equal(selectedNewsCover(key), cover);
    assert.equal(publicMediaUrl(key), cover.url);
    assert.ok(cover.url.startsWith('/news-media/'));
  }
  for (const key of ['__proto__', 'constructor', '../outside.jpg', 'https://example.test/cover.jpg', null]) {
    assert.equal(isNewsCoverKey(key), false);
    assert.equal(selectedNewsCover(key), null);
  }
});

test('approved cover files preserve the exact originally approved bytes', () => {
  for (const [filename, expected] of [
    ['Welcome_to_Epe.jpg','0bc23df878f71d53ea61be7e8a7829ca00eb11025ac36be7921e44cfc4482c9d'],
    ['Epe_Express_Road.jpg','f43e55bd922713b8f4c648e4aa094a78228bedc0d33abcfcd9d189b7d3b61503'],
  ]) {
    const bytes = fs.readFileSync(path.join(root, 'apps/main/public/news-media', filename));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
  }
});

test('Admin imports resolve and editor preserves current-version image key rather than inventing an articles column', () => {
  for (const name of ['new', '[id]']) {
    const file = path.join(root, 'apps/admin/app/(protected)/newsroom', name, 'page.tsx');
    const source = fs.readFileSync(file, 'utf8');
    const relative = source.match(/from "([^"]+news-covers)"/)[1];
    assert.equal(fs.existsSync(path.resolve(path.dirname(file), relative + '.ts')), true);
  }
  const editor = read('apps/admin/app/(protected)/newsroom/[id]/page.tsx');
  assert.match(editor, /isNewsCoverKey\(version\.og_image_key\)/);
  assert.match(editor, /seo_description,og_image_key/);
  assert.doesNotMatch(editor, /published_at,og_image_key/);
  assert.match(editor, /cover_url,cover_alt,cover_credit,cover_source_url,cover_license_url,cover_caption/);
  const fields = read('apps/admin/components/news-cover-url-fields.tsx');
  assert.match(fields, /An EPE LAWA image-storage bucket is not configured/);
  assert.match(fields, /The browser requests the image directly, so its host can see visitors’ IP addresses/);
  assert.match(fields, /a domain’s DNS can change later/);
  assert.match(fields, /urlTouched/);
  assert.match(fields, /onBlur=\{\(\) => setUrlTouched\(true\)\}/);
  assert.match(fields, /aria-describedby=\{invalidUrl \? `\$\{labelId\("help"\)\} \$\{labelId\("error"\)\}`/);
  assert.match(fields, /role="status" aria-live="polite"/);
  assert.match(read('apps/admin/components/news-cover-url-fields.module.css'), /min-block-size:3rem; font-size:1rem/);
  assert.match(fields, /The image preview could not load/);
});

test('public lead covers use approved local keys and images never send a referrer', () => {
  const listing = read('apps/main/app/news/page.tsx');
  const article = read('apps/main/app/news/[slug]/page.tsx');
  assert.match(listing, /loading="eager" fetchPriority="high"/);
  assert.match(listing, /className=\{styles\.storyImage\} src=\{image\} alt="" loading="lazy"/);
  assert.doesNotMatch(listing, /fetchPriority="auto"/);
  assert.match(listing, /selectedNewsCover\(article\.og_image_key\)\?\.url \?\? publicMediaUrl\(article\.og_image_key\)/);
  assert.match(article, /selectedNewsCover\(article\.og_image_key\)\?\.url \?\? publicMediaUrl\(article\.og_image_key\)/);
  assert.doesNotMatch(listing, /cover_url|cover_alt|cover_source_url|cover_license_url/);
  assert.doesNotMatch(article, /cover_url|cover_alt|cover_source_url|cover_license_url/);
  assert.match(article, /loading="eager" fetchPriority="high"/);
  assert.match(article, /referrerPolicy="no-referrer"/);
});
