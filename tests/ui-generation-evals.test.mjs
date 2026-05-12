import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "evals/run-ui-generation-evals.mjs");
const casesPath = path.join(root, "evals/ui-generation-cases.json");
const jsonReportPath = path.join(root, "evals/reports/ui-generation-report.json");
const htmlReportPath = path.join(root, "evals/reports/ui-generation-report.html");
const staleMarkdownReportPath = path.join(root, "evals/reports/ui-generation-report.md");

const METRIC_IDS = [
  "activity_fit",
  "decision_support",
  "disclosure_discipline",
  "handoff_completeness",
  "task_success_support",
  "confidence_rework_signals",
];

function runEval() {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

let result = runEval();
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");
assert.ok(result.stdout.includes("# JudgmentKit UI-Generation Eval"));
assert.ok(result.stdout.includes("claim level repeated_pair_signal"));
assert.ok(result.stdout.includes("HTML: evals/reports/ui-generation-report.html"));
assert.equal(fs.existsSync(jsonReportPath), true);
assert.equal(fs.existsSync(htmlReportPath), true);
assert.equal(fs.existsSync(staleMarkdownReportPath), false);

const firstJsonReport = fs.readFileSync(jsonReportPath, "utf8");
const firstHtmlReport = fs.readFileSync(htmlReportPath, "utf8");

result = runEval();
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(jsonReportPath, "utf8"), firstJsonReport);
assert.equal(fs.readFileSync(htmlReportPath, "utf8"), firstHtmlReport);
assert.equal(fs.existsSync(staleMarkdownReportPath), false);

const cases = readJson(casesPath);
const report = JSON.parse(firstJsonReport);
const htmlReport = firstHtmlReport;

assert.equal(report.eval_id, "judgmentkit-ui-generation-paired-artifact-v1");
assert.equal(report.evaluation_type, "deterministic_static_artifact_scoring");
assert.equal(report.claim_level, "repeated_pair_signal");
assert.equal(report.summary.cases, 2);
assert.equal(report.summary.passed, 2);
assert.equal(report.summary.failed, 0);
assert.equal(report.summary.guided_wins, 2);
assert.equal(report.summary.baseline_wins, 0);
assert.ok(htmlReport.startsWith("<!doctype html>"));
assert.ok(htmlReport.includes("not a statistically powered benchmark"));
assert.ok(htmlReport.includes("Claim level"));
assert.ok(htmlReport.includes("repeated_pair_signal"));
assert.ok(htmlReport.includes("Refund triage handoff"));
assert.ok(htmlReport.includes("Dinner playlist builder"));
assert.ok(htmlReport.includes("judgmentkit_handoff"));
assert.ok(htmlReport.includes("Score delta"));
assert.ok(htmlReport.includes("Minimum delta"));
assert.ok(htmlReport.includes("activity_fit"));
assert.ok(htmlReport.includes("disclosure_discipline"));
assert.ok(htmlReport.includes("8 leaks"));
assert.ok(htmlReport.includes("10 leaks"));
assert.ok(htmlReport.includes("examples/comparison/version-b.html"));
assert.ok(htmlReport.includes("examples/comparison/music/version-b.html"));

for (const testCase of cases) {
  assert.ok(testCase.id);
  assert.ok(testCase.task_prompt);
  assert.equal(testCase.variants.length, 2);
  assert.equal(testCase.expected_winner, "judgmentkit_handoff");
  assert.ok(testCase.minimum_score_delta > 0);
  assert.equal(
    Math.round(
      Object.values(testCase.scoring_weights).reduce((sum, weight) => sum + weight, 0) * 1000,
    ),
    1000,
  );

  for (const hiddenTerm of testCase.hidden_treatment_terms) {
    assert.equal(
      testCase.task_prompt.toLowerCase().includes(hiddenTerm.toLowerCase()),
      false,
      `participant prompt leaked treatment term: ${hiddenTerm}`,
    );
  }

  for (const variant of testCase.variants) {
    assert.equal(fs.existsSync(path.join(root, variant.artifact)), true);
    assert.ok(variant.public_artifact.startsWith("/examples/"));
  }
}

for (const caseResult of report.results) {
  assert.equal(caseResult.winner, "judgmentkit_handoff");
  assert.equal(caseResult.expected_winner, "judgmentkit_handoff");
  assert.equal(caseResult.passed, true);
  assert.ok(caseResult.score_delta > 0);
  assert.ok(caseResult.score_delta >= caseResult.minimum_score_delta);
  assert.equal(caseResult.variants.length, 2);

  const baseline = caseResult.variants.find(
    (variant) => variant.treatment === "raw_brief_baseline",
  );
  const guided = caseResult.variants.find(
    (variant) => variant.treatment === "judgmentkit_handoff",
  );

  assert.ok(baseline, `${caseResult.id} missing baseline result`);
  assert.ok(guided, `${caseResult.id} missing guided result`);
  assert.ok(guided.score > baseline.score);
  assert.ok(guided.metric_results.activity_fit.score > baseline.metric_results.activity_fit.score);
  assert.ok(
    guided.metric_results.disclosure_discipline.score >
      baseline.metric_results.disclosure_discipline.score,
  );
  assert.ok(
    baseline.metric_results.disclosure_discipline.implementation_leakage.length >
      guided.metric_results.disclosure_discipline.implementation_leakage.length,
  );

  for (const variant of caseResult.variants) {
    assert.ok(variant.score >= 0 && variant.score <= 100);
    assert.equal(variant.metadata_treatment, variant.treatment);
    assert.ok(variant.public_artifact.startsWith("/examples/"));

    for (const metricId of METRIC_IDS) {
      const metric = variant.metric_results[metricId];
      assert.ok(metric, `${caseResult.id}/${variant.id} missing ${metricId}`);
      assert.ok(metric.score >= 0 && metric.score <= 5);
    }
  }
}

console.log("ui generation eval checks passed.");
