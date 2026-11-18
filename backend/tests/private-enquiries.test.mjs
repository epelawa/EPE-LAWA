import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;');
await db.exec(await readFile(new URL('../supabase/migrations/20261119011000_private_enquiries.sql', import.meta.url), 'utf8'));
const insert = (kind, name, email, message) => db.query('select public.private_enquiry_submit($1,$2,$3,$4) id', [kind,name,email,message]);
test('enquiry contents and submission are private from public clients', async () => {
  const r = await db.query(`select has_table_privilege('anon','public.private_enquiries','select') anon_read, has_table_privilege('authenticated','public.private_enquiries','select') auth_read, has_function_privilege('anon','public.private_enquiry_submit(text,text,text,text)','execute') anon_submit, has_function_privilege('service_role','public.private_enquiry_submit(text,text,text,text)','execute') service_submit`);
  assert.deepEqual(r.rows[0], { anon_read: false, auth_read: false, anon_submit: false, service_submit: true });
  await db.exec('set role anon');
  await assert.rejects(insert('contact','Tester','reader@example.invalid','A synthetic enquiry'), e => e.code === '42501');
  await db.exec('reset role');
});
test('trusted requests are validated, normalized and stored', async () => {
  const r = await insert('advertising', '  Example  ', 'READER@example.invalid', '  A synthetic enquiry  ');
  assert.match(r.rows[0].id, /^[a-f0-9-]{36}$/);
  const rows = (await db.query('select kind,sender_name,sender_email,message from public.private_enquiries')).rows;
  assert.deepEqual(rows, [{ kind: 'advertising', sender_name: 'Example', sender_email: 'reader@example.invalid', message: 'A synthetic enquiry' }]);
  for (const args of [['bogus','Example','reader@example.invalid','A synthetic enquiry'], ['contact','X','reader@example.invalid','A synthetic enquiry'], ['contact','Tester','bad','A synthetic enquiry'], ['contact','Tester','reader@example.invalid','short'], ['contact','Line\nbreak','reader@example.invalid','A synthetic enquiry']]) await assert.rejects(insert(...args), e => e.code === '22023');
});
test.after(async () => db.close());
