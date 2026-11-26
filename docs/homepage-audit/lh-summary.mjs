// Usage: node lh-summary.mjs <lighthouse.json>... → prints a compact JSON summary per report
import { readFileSync } from "node:fs";
const out = {};
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(file, "utf8")); const a = r.audits;
  out[file.split("/").pop()] = {
    fetchTime: r.fetchTime, formFactor: r.configSettings.formFactor, throttling: r.configSettings.throttlingMethod, benchmarkIndex: r.environment.benchmarkIndex,
    scores: Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)])),
    metrics: Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index", "interactive", "total-byte-weight"].map((k) => [k, a[k].displayValue])),
    failing: Object.entries(a).filter(([, v]) => v.score !== null && v.score < 0.9 && !["informative", "notApplicable", "manual"].includes(v.scoreDisplayMode)).map(([k, v]) => `${k}${v.displayValue ? ` (${v.displayValue})` : ""}`),
  };
}
console.log(JSON.stringify(out, null, 2));
