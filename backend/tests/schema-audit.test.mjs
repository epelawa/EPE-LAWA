import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInventoryQuery, parseInventory, validateManifest } from '../scripts/schema-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = { schema: 'public', tables: [{ name: 'articles', columns: ['id', 'title'] }] };
test('validates identifiers and rejects SQL-shaped manifest input', () => {
  assert.equal(validateManifest(manifest), manifest);
  assert.throws(() => validateManifest({ schema: 'public;DROP', tables: [] }), /Invalid manifest/);
  assert.throws(() => validateManifest({ schema: 'public', tables: [{ name: 'articles', columns: ['id; DROP'] }] }), /Invalid column/);
});
test('builds read-only schema and explicit row-existence SELECTs and parses gaps', () => {
  const sql = createInventoryQuery(manifest);
  assert.match(sql, /^WITH expected/);
  assert.match(sql, /information_schema\.columns/);
  assert.match(sql, /^WITH expected[\s\S]*SELECT/);
  assert.doesNotMatch(sql, /\b(CREATE|ALTER|INSERT|UPDATE|DELETE)\b/i);
  const withRows = { ...manifest, rowExpectations: [{ id: 'profile_user', table: 'articles', column: 'id', value: "id'value" }] };
  const rowSql = createInventoryQuery(withRows);
  assert.match(rowSql, /id''value/);
  assert.match(rowSql, /EXISTS \(SELECT 1 FROM public\.articles WHERE id =/);
  assert.deepEqual(parseInventory(withRows, 'TABLE\tarticles\tOK\nCOLUMN\tarticles\tid\tOK\nCOLUMN\tarticles\ttitle\tMISSING\nROW\tprofile_user\tMISSING\n'), { checked: 2, missing: [{ table: 'articles', column: 'title' }], missingRows: ['profile_user'], missingTables: [], missingObjects: [] });
});
test('CLI invokes stub psql in read-only mode, outputs JSON and exits nonzero for missing columns', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-audit-'));
  try {
    const manifestPath = path.join(tmp, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const stub = path.join(tmp, 'psql');
    fs.writeFileSync(stub, '#!/usr/bin/env node\nconst fs=require("fs"); fs.writeFileSync(process.env.PSQL_CAPTURE, JSON.stringify(process.argv)); process.stdout.write("TABLE\\tarticles\\tOK\\nCOLUMN\\tarticles\\tid\\tOK\\nCOLUMN\\tarticles\\ttitle\\tMISSING\\n");\n');
    fs.chmodSync(stub, 0o755);
    const capture = path.join(tmp, 'args.json');
    const env = { ...process.env, PATH: `${tmp}:${process.env.PATH}`, DATABASE_URL: 'postgres://hidden:secret@example.invalid/db', PSQL_CAPTURE: capture };
    const r = spawnSync(process.execPath, ['backend/scripts/schema-audit.mjs', '--json', '--manifest', manifestPath], { cwd: ROOT, env, encoding: 'utf8' });
    assert.equal(r.status, 1, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).missing, [{ table: 'articles', column: 'title' }]);
    assert.doesNotMatch(`${r.stdout}\n${r.stderr}`, /secret|hidden/);
    const args = JSON.parse(fs.readFileSync(capture, 'utf8'));
    assert(args.includes('--no-psqlrc'));
    assert(args.includes('--set=ON_ERROR_STOP=1'));
    assert(args.includes('--command'));
    assert(args.join(' ').includes('information_schema.columns'));
    assert(!args.join(' ').match(/\b(CREATE|ALTER|INSERT|UPDATE|DELETE)\b/i));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('CLI suppresses psql connection diagnostics that may contain secrets', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-audit-fail-'));
  try {
    const stub = path.join(tmp, 'psql');
    fs.writeFileSync(stub, '#!/bin/sh\necho "postgres://user:secret@example" >&2\nexit 2\n'); fs.chmodSync(stub, 0o755);
    const r = spawnSync(process.execPath, ['backend/scripts/schema-audit.mjs'], { cwd: ROOT, env: { ...process.env, PATH: `${tmp}:${process.env.PATH}`, DATABASE_URL: 'postgres://user:secret@example' }, encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /diagnostics suppressed/);
    assert.doesNotMatch(r.stderr, /secret|postgres:\/\//);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
