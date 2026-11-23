import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = new URL('../apps/admin/app/(protected)/roles/page.tsx', import.meta.url);
const picker = new URL('../apps/admin/components/roles-capability-picker.tsx', import.meta.url);
const catalogue = new URL('../apps/admin/lib/capability-groups.ts', import.meta.url);

test('Roles page uses grouped capability labels instead of raw keys', async () => {
  const pickerSource = await readFile(picker, 'utf8');
  const catalogueSource = await readFile(catalogue, 'utf8');
  assert.match(catalogueSource, /Full administrative access/);
  assert.match(catalogueSource, /Publish articles and flag breaking news/);
  assert.match(pickerSource, /label\}</);
  assert.match(pickerSource, /"use client"/);
});

test('Roles picker offers full access plus per-group selection', async () => {
  const pickerSource = await readFile(picker, 'utf8');
  assert.match(pickerSource, /Full access/);
  assert.match(pickerSource, /Select all \$\{group\.label\} capabilities/);
});

test('Roles page keeps server-side authorization and shows staff email', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /staff_roles_authorized/);
  assert.match(source, /person\.email/);
  assert.match(source, /CapabilityPicker groups=\{groups\}/);
});

test('Roles page starts compact and separates editing from staff assignments', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /<details className=\{styles\.create\}>/);
  assert.match(source, /<details key=\{role\.id\} className=\{styles\.role\}>/);
  assert.match(source, /\{granted\.length\} permissions/);
  assert.match(source, /\{assignedCount\} staff/);
  assert.match(source, /Edit role and permissions/);
  assert.match(source, /Manage staff access/);
});
