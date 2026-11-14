#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_MANIFEST = path.join(ROOT, 'backend/scripts/schema-audit-manifest.json');
const MAX_OUTPUT = 12000;
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

export function validateManifest(manifest) {
  if (!manifest || !IDENTIFIER.test(manifest.schema) || !Array.isArray(manifest.tables) || manifest.tables.length > 200) {
    throw new Error('Invalid manifest schema or table list (maximum 200 tables).');
  }
  const seen = new Set();
  for (const table of manifest.tables) {
    if (!table || !IDENTIFIER.test(table.name) || seen.has(table.name) || !Array.isArray(table.columns) || table.columns.length > 200) {
      throw new Error('Invalid or duplicate table entry in manifest.');
    }
    seen.add(table.name);
    for (const column of table.columns) if (!IDENTIFIER.test(column)) throw new Error(`Invalid column identifier in ${table.name}.`);
  }
  if (manifest.rowExpectations !== undefined && (!Array.isArray(manifest.rowExpectations) || manifest.rowExpectations.length > 100)) throw new Error('Invalid rowExpectations (maximum 100).');
  const rowIds = new Set();
  for (const row of manifest.rowExpectations || []) {
    if (!row || !IDENTIFIER.test(row.id) || rowIds.has(row.id) || !seen.has(row.table) || !IDENTIFIER.test(row.column) || !manifest.tables.find(t => t.name === row.table).columns.includes(row.column) || typeof row.value !== 'string' || row.value.length > 256 || row.value.includes('\0')) throw new Error('Invalid row expectation; use a unique id, listed table/column, and string key value.');
    rowIds.add(row.id);
  }
  for (const key of ['functions', 'views']) {
    if (manifest[key] !== undefined && (!Array.isArray(manifest[key]) || manifest[key].length > 200 || manifest[key].some(name => !IDENTIFIER.test(name)))) throw new Error(`Invalid ${key} list.`);
  }
  return manifest;
}

export function createInventoryQuery(manifest) {
  validateManifest(manifest);
  const tuples = manifest.tables.flatMap(t => t.columns.map(column => `('${t.name}', '${column}')`)).join(',');
  // All SQL is a fixed SELECT against information_schema; caller-provided identifiers are validated,
  // and values are safely SQL-escaped (identifier regex excludes quotes).
  const rows = (manifest.rowExpectations || []).map(r => `SELECT 'ROW' || E'\\t' || '${r.id}' || E'\\t' || CASE WHEN EXISTS (SELECT 1 FROM ${manifest.schema}.${r.table} WHERE ${r.column} = '${r.value.replaceAll("'", "''")}') THEN 'OK' ELSE 'MISSING' END`).join(' UNION ALL ');
  const columnQuery = `WITH expected(table_name, column_name) AS (VALUES ${tuples || "('__audit_no_table__','__audit_no_column__')"}) SELECT 'COLUMN' || E'\\t' || e.table_name || E'\\t' || e.column_name || E'\\t' || CASE WHEN c.column_name IS NULL THEN 'MISSING' ELSE 'OK' END FROM expected e LEFT JOIN information_schema.columns c ON c.table_schema = '${manifest.schema}' AND c.table_name = e.table_name AND c.column_name = e.column_name`;
  const objects = [];
  for (const table of manifest.tables) objects.push(`SELECT 'TABLE' || E'\\t' || '${table.name}' || E'\\t' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${manifest.schema}' AND table_name = '${table.name}' AND table_type IN ('BASE TABLE','VIEW','FOREIGN')) THEN 'OK' ELSE 'MISSING' END`);
  for (const name of manifest.functions || []) objects.push(`SELECT 'FUNCTION' || E'\\t' || '${name}' || E'\\t' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE specific_schema = '${manifest.schema}' AND routine_name = '${name}' AND routine_type = 'FUNCTION') THEN 'OK' ELSE 'MISSING' END`);
  for (const name of manifest.views || []) objects.push(`SELECT 'VIEW' || E'\\t' || '${name}' || E'\\t' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = '${manifest.schema}' AND table_name = '${name}') THEN 'OK' ELSE 'MISSING' END`);
  return `${columnQuery}${rows ? ` UNION ALL ${rows}` : ''}${objects.length ? ` UNION ALL ${objects.join(' UNION ALL ')}` : ''};`;
}

export function parseInventory(manifest, text) {
  const expected = new Map(manifest.tables.map(t => [t.name, new Set(t.columns)]));
  const expectedRows = new Set((manifest.rowExpectations || []).map(r => r.id));
  const expectedTables = new Set(manifest.tables.map(t => t.name));
  const expectedObjects = new Map([...(manifest.functions || []).map(x => [`FUNCTION:${x}`, 'function']), ...(manifest.views || []).map(x => [`VIEW:${x}`, 'view'])]);
  const missingObjects = [];
  const missingTables = [];
  const missingRows = [];
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const parts = line.split('\t');
    if (parts[0] === 'TABLE') {
      const [, name, status] = parts;
      if (!expectedTables.has(name) || !['OK', 'MISSING'].includes(status)) throw new Error('Unexpected psql result; refusing to interpret it.');
      if (status === 'MISSING') missingTables.push(name);
      expectedTables.delete(name);
    } else if (parts[0] === 'FUNCTION' || parts[0] === 'VIEW') {
      const [kind, name, status] = parts;
      const key = `${kind}:${name}`;
      if (!expectedObjects.has(key) || !['OK', 'MISSING'].includes(status)) throw new Error('Unexpected psql result; refusing to interpret it.');
      if (status === 'MISSING') missingObjects.push({ type: expectedObjects.get(key), name });
      expectedObjects.delete(key);
    } else if (parts[0] === 'ROW') {
      const [, id, status] = parts;
      if (!expectedRows.has(id) || !['OK', 'MISSING'].includes(status)) throw new Error('Unexpected psql result; refusing to interpret it.');
      if (status === 'MISSING') missingRows.push(id);
      expectedRows.delete(id);
    } else {
      const [, table, column, status] = parts;
      if (parts[0] !== 'COLUMN' || !expected.has(table) || !expected.get(table).has(column) || !['OK', 'MISSING'].includes(status)) throw new Error('Unexpected psql result; refusing to interpret it.');
      if (status === 'OK') expected.get(table).delete(column);
    }
  }
  if (expectedRows.size) throw new Error('psql omitted expected row-check results.');
  if (expectedTables.size) throw new Error('psql omitted expected table-check results.');
  if (expectedObjects.size) throw new Error('psql omitted expected object-check results.');
  const missing = [];
  for (const [table, columns] of expected) for (const column of columns) missing.push({ table, column });
  return { checked: manifest.tables.reduce((n, t) => n + t.columns.length, 0), missing, missingRows, missingTables, missingObjects };
}

function main(argv) {
  const json = argv.includes('--json');
  const args = argv.filter(a => a !== '--json');
  const idx = args.indexOf('--manifest');
  if (args.some((a, i) => a !== '--manifest' && i !== idx + 1)) throw new Error('Usage: node backend/scripts/schema-audit.mjs [--json] [--manifest <path>]');
  if (idx !== -1 && (!args[idx + 1] || idx !== args.length - 2)) throw new Error('Usage: --manifest must be followed by one path.');
  const manifestPath = idx === -1 ? DEFAULT_MANIFEST : path.resolve(args[idx + 1]);
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required (value is never displayed).');
  const result = spawnSync('psql', ['--no-psqlrc', '--set=ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--field-separator=\t', '--dbname', process.env.DATABASE_URL, '--command', createInventoryQuery(manifest)], { encoding: 'utf8', maxBuffer: 1024 * 1024, env: { ...process.env, PGOPTIONS: `${process.env.PGOPTIONS || ''} -c default_transaction_read_only=on`.trim() } });
  // Never forward psql diagnostics: connection errors can contain host/user/connection details.
  if (result.error || result.status !== 0) throw new Error('psql failed; diagnostics suppressed to protect connection details. Confirm psql, connectivity, and read-only SELECT permission.');
  if ((result.stdout || '').length > MAX_OUTPUT) throw new Error(`psql returned more than ${MAX_OUTPUT} bytes; audit aborted.`);
  const report = parseInventory(manifest, result.stdout || '');
  report.schema = manifest.schema;
  report.tables = manifest.tables.length;
  report.missingTables = [...new Set([...report.missingTables, ...report.missing.map(x => x.table)])];
  report.checkedRows = (manifest.rowExpectations || []).length;
  report.checkedFunctions = (manifest.functions || []).length;
  report.checkedViews = (manifest.views || []).length;
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Schema audit: ${report.schema}; ${report.tables} expected tables; ${report.checked} expected columns.`);
    if (report.missingTables.length) console.log(`Missing tables: ${report.missingTables.join(', ')}`);
    if (report.missing.length) console.log(`Missing columns: ${report.missing.map(x => `${x.table}.${x.column}`).join(', ')}`);
    if (report.missingObjects.length) console.log(`Missing ${report.missingObjects.map(x => `${x.type}s: ${x.name}`).join(', ')}`);
    if (report.missingRows.length) console.log(`Missing row expectations: ${report.missingRows.join(', ')}`);
    if (!report.missing.length && !report.missingTables.length && !report.missingObjects.length && !report.missingRows.length) console.log('All manifest expectations are present.');
  }
  return report.missing.length || report.missingRows.length || report.missingObjects.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`Schema audit error: ${error.message}`); process.exitCode = 2; }
}
