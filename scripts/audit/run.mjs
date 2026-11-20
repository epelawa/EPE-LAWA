#!/usr/bin/env node
/**
 * Honest wrapper around `founda-scan --json`.
 *
 * It does not "fix" or suppress findings. It parses the scanner's JSON,
 * optionally narrows to a category, counts findings by severity, and applies
 * a fail-on threshold. Any output is a real report from the scanner.
 *
 * Node builtins only. No packages added.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCANNER_BIN = process.env.FOUNDA_SCAN_BIN || 'founda-scan';

const SEVERITIES = ['CRITICAL', 'WARNING', 'INFO'];
const SEVERITY_RANK = { INFO: 1, WARNING: 2, CRITICAL: 3 };

// founda-scan emits CRITICAL / WARNING / INFO only. There is no HIGH tier.
// medium -> WARNING and above; high and critical -> CRITICAL only.
const THRESHOLDS = { medium: 2, high: 3, critical: 3 };

// The installed founda-scan has no --only flag, so filtering happens here.
// Layer 12 = security; layers 1 and 3 = UI / accessibility.
const CATEGORY_LAYERS = { hacking: new Set([12]), ui: new Set([1, 3]) };
const CATEGORY_EXTRA_RULES = {
  hacking: new Set(),
  // Scanner tags colours as layer 7, but it is a UI/design-token concern.
  ui: new Set(['hardcoded-colour']),
};

function fail(message) {
  process.stderr.write(`audit: ${message}\n`);
  process.exit(2);
}

function usage() {
  process.stdout.write(
    [
      'Usage: node scripts/audit/run.mjs [options]',
      '',
      '  --only=hacking|ui   Narrow findings to a category (default: all)',
      '  --fail-on=medium|high|critical   Exit 1 at/above threshold (default: high)',
      '  --json              Emit a machine-readable summary instead of text',
      '',
      'Severity mapping (scanner has no HIGH tier):',
      '  medium -> WARNING+, high -> CRITICAL, critical -> CRITICAL',
      '',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const opts = { only: null, failOn: 'high', json: false };
  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg.startsWith('--only=')) opts.only = arg.slice('--only='.length);
    else if (arg.startsWith('--fail-on=')) opts.failOn = arg.slice('--fail-on='.length);
    else fail(`unknown argument: ${arg}`);
  }
  if (opts.only !== null && !Object.hasOwn(CATEGORY_LAYERS, opts.only)) {
    fail(`invalid --only="${opts.only}" (expected hacking or ui)`);
  }
  if (!Object.hasOwn(THRESHOLDS, opts.failOn)) {
    fail(`invalid --fail-on="${opts.failOn}" (expected medium, high or critical)`);
  }
  return opts;
}

function runScanner() {
  const result = spawnSync(SCANNER_BIN, ['--json', REPO_ROOT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) fail(`cannot run ${SCANNER_BIN}: ${result.error.message}`);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    const detail = (result.stderr || '').trim().slice(0, 400);
    fail(
      `${SCANNER_BIN} did not return valid JSON (exit ${result.status})` +
        (detail ? `: ${detail}` : ''),
    );
  }
  if (!Array.isArray(parsed.findings)) fail(`${SCANNER_BIN} JSON has no findings array`);
  return parsed;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = runScanner();

  const layers = opts.only ? CATEGORY_LAYERS[opts.only] : null;
  const extraRules = opts.only ? CATEGORY_EXTRA_RULES[opts.only] : null;
  const findings = opts.only
    ? report.findings.filter((f) => layers.has(f.layer) || extraRules.has(f.rule))
    : report.findings;

  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
  const ruleCounts = new Map();
  for (const f of findings) {
    if (Object.hasOwn(counts, f.severity)) counts[f.severity] += 1;
    ruleCounts.set(f.rule, (ruleCounts.get(f.rule) || 0) + 1);
  }

  const neededRank = THRESHOLDS[opts.failOn];
  const blocking = findings.filter(
    (f) => (SEVERITY_RANK[f.severity] || 0) >= neededRank,
  ).length;
  const passed = blocking === 0;
  const topRules = [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));

  const summary = report.summary || {};
  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        {
          scanner: report.scanner || 'founda-scan',
          version: report.version || null,
          scope: opts.only || 'all',
          failOn: opts.failOn,
          severityMapping: 'medium=WARNING+, high=CRITICAL, critical=CRITICAL',
          counts,
          blocking,
          passed,
          filesAnalysed: summary.files_analysed ?? null,
          coveragePct: summary.coverage_pct ?? null,
          health: summary.health ?? null,
          readiness: summary.readiness ?? null,
          topRules,
        },
        null,
        2,
      ) + '\n',
    );
  } else {
    const lines = [
      `founda-scan audit${report.version ? ` v${report.version}` : ''}`,
      `scope: ${opts.only || 'all'}   fail-on: ${opts.failOn} (medium=WARNING+, high/critical=CRITICAL)`,
      `  CRITICAL  ${String(counts.CRITICAL).padStart(5)}`,
      `  WARNING   ${String(counts.WARNING).padStart(5)}`,
      `  INFO      ${String(counts.INFO).padStart(5)}`,
      `files analysed: ${summary.files_analysed ?? '?'}   coverage: ${summary.coverage_pct ?? '?'}%   health: ${summary.health ?? '?'}`,
      `top rules: ${topRules.map((r) => `${r.rule} (${r.count})`).join(', ') || 'none'}`,
      passed
        ? `VERDICT: PASS — no finding at or above ${opts.failOn}`
        : `VERDICT: FAIL — ${blocking} finding(s) at or above ${opts.failOn}`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
  }

  process.exit(passed ? 0 : 1);
}

main();
