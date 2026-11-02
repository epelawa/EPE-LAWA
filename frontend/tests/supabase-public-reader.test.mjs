import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSupabasePublicArticle, publicArticleResponse } from '../../backend/packages/editorial/src/supabase-public.ts';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const config = { url: 'https://synthetic.supabase.co', publishableKey: 'sb_publishable_synthetic' };
test('public reader only returns allowlisted fields and always fetches fresh', async () => {
  let calls = 0;
  const mock = async (url, init) => {
    calls++;
    assert.equal(url.href, 'https://synthetic.supabase.co/rest/v1/rpc/editorial_prototype_public_get');
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(init.headers['Cache-Control'], 'no-store');
    assert.deepEqual(JSON.parse(init.body), { target: id });
    return Response.json([{ title: 'Synthetic title', summary: '', body: 'Synthetic body', owner_id: 'must not leak', internal_notes: 'private' }]);
  };
  const expected = { status: 'ok', article: { title: 'Synthetic title', summary: '', body: 'Synthetic body' } };
  assert.deepEqual(await readSupabasePublicArticle(config, id, mock), expected);
  assert.deepEqual(await readSupabasePublicArticle(config, id, mock), expected);
  assert.equal(calls, 2);
  const response = publicArticleResponse(expected);
  assert.equal(response.status, 200);
  for (const header of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control']) assert.match(response.headers.get(header), /no-store/);
  assert.deepEqual(await response.json(), expected.article);
});

test('public reader fails closed on invalid config, data, provider errors and withdrawal', async () => {
  let calls = 0;
  const never = async () => { calls++; throw new Error('should not be called'); };
  assert.deepEqual(await readSupabasePublicArticle(config, '../bad', never), { status: 'not_found' });
  for (const bad of [
    { ...config, url: 'http://synthetic.supabase.co' }, { ...config, url: 'https://attacker.invalid' },
    { ...config, url: 'https://synthetic.supabase.co/path' }, { ...config, publishableKey: 'sb_secret_private' },
    { ...config, publishableKey: 'a.' + Buffer.from('{"role":"service_role"}').toString('base64url') + '.c' },
  ]) assert.deepEqual(await readSupabasePublicArticle(bad, id, never), { status: 'unavailable' });
  assert.equal(calls, 0);
  for (const response of [
    new Response('bad', { status: 503 }), Response.json({ title: 'wrong shape' }),
    Response.json([{ title: '', summary: '', body: 'Body' }]), Response.json([{}, {}]),
    new Response('not json', { headers: { 'Content-Type': 'application/json' } }),
    new Response('x'.repeat(1024 * 1024 + 1), { headers: { 'Content-Type': 'application/json' } }),
  ]) assert.deepEqual(await readSupabasePublicArticle(config, id, async () => response), { status: 'unavailable' });
  assert.deepEqual(await readSupabasePublicArticle(config, id, async () => { throw new Error('offline'); }), { status: 'unavailable' });
  const gone = await readSupabasePublicArticle(config, id, async () => Response.json([]));
  assert.deepEqual(gone, { status: 'not_found' });
  assert.equal(publicArticleResponse(gone).status, 404);
  const unavailable = publicArticleResponse({ status: 'unavailable' });
  assert.equal(unavailable.status, 503);
  assert.match(unavailable.headers.get('cache-control'), /no-store/);
});
