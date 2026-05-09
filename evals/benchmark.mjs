import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { analyzeImplementationBrief, loadActivityContract } from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES_PATH = path.join(__dirname, "cases.json");
const ITERATIONS = 2_000;
const MAX_AVG_MS = 5;
const MAX_P95_MS = 20;

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  );

  return sorted[index];
}

const cases = JSON.parse(fs.readFileSync(CASES_PATH, "utf8"));
const contract = loadActivityContract();
const timings = [];

for (let index = 0; index < ITERATIONS; index += 1) {
  const testCase = cases[index % cases.length];
  const start = performance.now();
  analyzeImplementationBrief(testCase.brief, { contract });
  timings.push(performance.now() - start);
}

const totalMs = timings.reduce((sum, value) => sum + value, 0);
const averageMs = totalMs / timings.length;
const p95Ms = percentile(timings, 95);
const maxMs = Math.max(...timings);
const passed = averageMs <= MAX_AVG_MS && p95Ms <= MAX_P95_MS;

console.log(
  JSON.stringify(
    {
      summary: {
        iterations: ITERATIONS,
        cases: cases.length,
        average_ms: Number(averageMs.toFixed(4)),
        p95_ms: Number(p95Ms.toFixed(4)),
        max_ms: Number(maxMs.toFixed(4)),
        thresholds: {
          average_ms: MAX_AVG_MS,
          p95_ms: MAX_P95_MS,
        },
        passed,
      },
    },
    null,
    2,
  ),
);

if (!passed) {
  process.exitCode = 1;
}
