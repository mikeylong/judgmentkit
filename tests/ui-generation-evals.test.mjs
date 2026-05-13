import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "evals/run-ui-generation-evals.mjs");
const casesPath = path.join(root, "evals/ui-generation-cases.json");
const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-ui-evals-"));
const staleMarkdownReportPath = path.join(reportsDir, "ui-generation-report.md");
const legacyJsonReportPath = path.join(reportsDir, "ui-generation-report.json");
const legacyHtmlReportPath = path.join(reportsDir, "ui-generation-report.html");
const catalogJsonPath = path.join(reportsDir, "index.json");
const catalogHtmlPath = path.join(reportsDir, "index.html");

const FIXED_DATE = "2026-05-13";
const FIXED_MCP_VERSION = "0.1.0";
const FIXED_RELEASE_SEGMENT = "mcp-0.1.0";
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
    env: {
      ...process.env,
      JUDGMENTKIT_UI_EVAL_REPORTS_DIR: reportsDir,
      JUDGMENTKIT_UI_EVAL_RUN_DATE: FIXED_DATE,
      JUDGMENTKIT_UI_EVAL_MCP_VERSION: FIXED_MCP_VERSION,
    },
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runPath(runId, filename) {
  return path.join(reportsDir, FIXED_DATE, FIXED_RELEASE_SEGMENT, runId, filename);
}

let result = runEval();
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");
assert.ok(result.stdout.includes("# JudgmentKit UI-Generation Eval"));
assert.ok(result.stdout.includes("claim level repeated_pair_signal"));
assert.ok(result.stdout.includes(`${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-001`));
assert.ok(result.stdout.includes(`HTML: ${path.join(reportsDir, FIXED_DATE, FIXED_RELEASE_SEGMENT, "run-001", "ui-generation-report.html")}`));
assert.equal(fs.existsSync(runPath("run-001", "ui-generation-report.json")), true);
assert.equal(fs.existsSync(runPath("run-001", "ui-generation-report.html")), true);
assert.equal(fs.existsSync(catalogJsonPath), true);
assert.equal(fs.existsSync(catalogHtmlPath), true);
assert.equal(fs.existsSync(legacyJsonReportPath), false);
assert.equal(fs.existsSync(legacyHtmlReportPath), false);
assert.equal(fs.existsSync(staleMarkdownReportPath), false);

const firstJsonReport = fs.readFileSync(runPath("run-001", "ui-generation-report.json"), "utf8");
const firstHtmlReport = fs.readFileSync(runPath("run-001", "ui-generation-report.html"), "utf8");

result = runEval();
assert.equal(result.status, 0, result.stderr);
assert.ok(result.stdout.includes(`${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-002`));
assert.equal(fs.readFileSync(runPath("run-001", "ui-generation-report.json"), "utf8"), firstJsonReport);
assert.equal(fs.readFileSync(runPath("run-001", "ui-generation-report.html"), "utf8"), firstHtmlReport);
assert.equal(fs.existsSync(runPath("run-002", "ui-generation-report.json")), true);
assert.equal(fs.existsSync(runPath("run-002", "ui-generation-report.html")), true);
assert.equal(fs.existsSync(legacyJsonReportPath), false);
assert.equal(fs.existsSync(legacyHtmlReportPath), false);
assert.equal(fs.existsSync(staleMarkdownReportPath), false);

const cases = readJson(casesPath);
const report = JSON.parse(firstJsonReport);
const htmlReport = firstHtmlReport;
const catalog = readJson(catalogJsonPath);
const catalogHtml = fs.readFileSync(catalogHtmlPath, "utf8");

assert.equal(report.eval_id, "judgmentkit-ui-generation-paired-artifact-v1");
assert.equal(report.evaluation_type, "deterministic_static_artifact_scoring");
assert.equal(report.claim_level, "repeated_pair_signal");
assert.deepEqual(report.run, {
  date: FIXED_DATE,
  mcp_release: FIXED_MCP_VERSION,
  mcp_release_segment: FIXED_RELEASE_SEGMENT,
  run_id: "run-001",
  run_path: `${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-001`,
  html_report: `${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-001/ui-generation-report.html`,
  json_report: `${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-001/ui-generation-report.json`,
});
assert.equal(report.summary.cases, 2);
assert.equal(report.summary.passed, 2);
assert.equal(report.summary.failed, 0);
assert.equal(report.summary.guided_wins, 2);
assert.equal(report.summary.baseline_wins, 0);

assert.equal(catalog.catalog_id, "judgmentkit-ui-generation-eval-runs");
assert.equal(catalog.latest.date, FIXED_DATE);
assert.equal(catalog.latest.mcp_release, FIXED_MCP_VERSION);
assert.equal(catalog.latest.mcp_release_segment, FIXED_RELEASE_SEGMENT);
assert.equal(catalog.latest.run_id, "run-002");
assert.equal(catalog.latest.html_report, `${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-002/ui-generation-report.html`);
assert.equal(catalog.latest.json_report, `${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-002/ui-generation-report.json`);
assert.equal(catalog.runs.length, 2);
assert.deepEqual(
  catalog.runs.map((run) => run.run_id),
  ["run-002", "run-001"],
);
assert.ok(catalogHtml.startsWith("<!doctype html>"));
assert.ok(catalogHtml.includes("JudgmentKit UI Eval Runs"));
assert.ok(catalogHtml.includes("Immutable UI-generation eval reports"));
assert.ok(catalogHtml.includes(`${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-002/ui-generation-report.html`));
assert.ok(catalogHtml.includes(`${FIXED_DATE}/${FIXED_RELEASE_SEGMENT}/run-001/ui-generation-report.json`));

assert.ok(htmlReport.startsWith("<!doctype html>"));
assert.ok(htmlReport.includes("not a statistically powered benchmark"));
assert.ok(htmlReport.includes("Claim level"));
assert.ok(htmlReport.includes("Run date"));
assert.ok(htmlReport.includes("MCP release"));
assert.ok(htmlReport.includes("run-001"));
assert.ok(htmlReport.includes("repeated_pair_signal"));
assert.ok(htmlReport.includes("Refund triage handoff"));
assert.ok(htmlReport.includes("Dinner playlist builder"));
assert.ok(htmlReport.includes("judgmentkit_handoff"));
assert.ok(htmlReport.includes("Score delta"));
assert.ok(htmlReport.includes("Minimum delta"));
assert.ok(htmlReport.includes('href="ui-generation-report.json"'));
assert.ok(htmlReport.includes("JSON report"));
assert.ok(htmlReport.includes("activity_fit"));
assert.ok(htmlReport.includes("disclosure_discipline"));
assert.ok(htmlReport.includes("8 leaks"));
assert.ok(htmlReport.includes("10 leaks"));
assert.ok(htmlReport.includes("/examples/comparison/refund/version-b.html"));
assert.ok(htmlReport.includes("/examples/comparison/music/version-b.html"));

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
