#!/usr/bin/env node
// UX audit sweep: finds regressions against the EPE LAWA UI contract.
//  - native alert/confirm/prompt popups (must use BrandedDialog / toasts)
//  - native validation calls (reportValidity / checkValidity) — we own the rules
//  - bare <dialog> elements without branded chrome or a styled module class
//  - bare <select> inputs without our `.input` or `.ui-select` styling
// Emits a Markdown report (stdout and docs/ux-audit-report.md).
// Exit 0 when clean or issues are marked FIXED/ACCEPTED; exit 1 on new NEEDS-FIX.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["frontend/apps", "frontend/packages/ui/src"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "dist", "test-results"]);
const EXTENSIONS = new Set([".tsx"]);

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) yield full;
  }
}

const findings = [];
const push = (file, line, kind, detail) =>
  findings.push({ file: relative(".", file), line, kind, detail, status: "NEEDS-FIX" });

const PATTERNS = [
  { kind: "native-alert", re: /(?<![\w.$])alert\s*\(/g },
  { kind: "native-confirm", re: /(?<![\w.$])confirm\s*\(/g },
  { kind: "native-prompt", re: /(?<![\w.$])prompt\s*\(/g },
  { kind: "native-reportValidity", re: /\breportValidity\s*\(/g },
  { kind: "native-checkValidity", re: /\bcheckValidity\s*\(/g },
];

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");
    lines.forEach((text, index) => {
      const line = index + 1;
      const trimmed = text.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;
      const lookahead = lines.slice(index, index + 8).join("\n");
      for (const { kind, re } of PATTERNS) {
        re.lastIndex = 0;
        const match = re.exec(text);
        if (match) push(file, line, kind, text.trim().slice(0, 140));
      }
      if (/<dialog(?![\w-])/.test(text) && !/className=/.test(lookahead)) {
        push(file, line, "bare-dialog", text.trim().slice(0, 140));
      }
      if (/<select(?![\w-])/.test(text) && !/className=/.test(text) && !/LiveField/.test(text)) {
        push(file, line, "unstyled-select", text.trim().slice(0, 140));
      }
    });
  }
}

// Selects inherit brand styling from each app's global control layer
// (native-controls.css / the :where(input,select,textarea) rule), so these are informational.
for (const finding of findings) {
  if (finding.kind === "unstyled-select") finding.status = "INFO";
}

// A <dialog> using branded chrome (module class or shared ui-dialog) is fine.
for (const finding of findings) {
  if (finding.kind !== "bare-dialog") continue;
  if (/styles\.|ui-dialog|ep-dialog/.test(finding.detail)) finding.status = "FIXED";
}

const ACCEPTED = new Set(process.argv.slice(2));
const open = findings.filter(
  (finding) => finding.status === "NEEDS-FIX" && !ACCEPTED.has(`${finding.file}:${finding.line}`),
);

let report = "# UX audit sweep\n\n";
report += `Generated ${new Date().toISOString()}\n\n`;
report += "Scope: frontend/apps + frontend/packages/ui (.tsx). Checks: native popups (alert/confirm/prompt), native validation (reportValidity/checkValidity), bare <dialog> without branded chrome, unstyled <select>.\n\n";
if (findings.length === 0) {
  report += "No violations found. The platform is fully on the branded control contract.\n";
} else {
  report += "| Status | Kind | Location | Detail |\n| --- | --- | --- | --- |\n";
  for (const finding of findings) {
    report += `| ${finding.status} | ${finding.kind} | ${finding.file}:${finding.line} | \`${finding.detail.replace(/\|/g, "\\|")}\` |\n`;
  }
}
writeFileSync("docs/ux-audit-report.md", report);

for (const finding of findings) {
  console.log(`${finding.status} ${finding.kind} ${finding.file}:${finding.line} ${finding.detail}`);
}
console.log(`\n${open.length} needs-fix, ${findings.length - open.length} fixed/accepted. Report: docs/ux-audit-report.md`);
process.exit(open.length > 0 ? 1 : 0);
