import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  HIDDEN_TREATMENT_TERMS,
  METRIC_IDS,
  VARIANT_IDS,
  buildMcpContextForCase,
  captureFilePath,
  readCases,
  runMcpPilotEval,
  scoreCase,
  validateCases,
} from "../evals/run-mcp-pilot-evals.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cases = readCases();

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function allRequiredText(testCase) {
  return [
    Object.values(testCase.required_terms).flat().join(" "),
    testCase.required_handoff_fields.join(" "),
    testCase.expected_next_action,
  ].join(" ");
}

function mockCapture(testCase, variantId, overrides = {}) {
  const handoff = Object.fromEntries(
    testCase.required_handoff_fields.map((field) => [field.replace(/\s+/g, "_"), field]),
  );
  const response =
    overrides.response ??
    `${allRequiredText(testCase)}. Decision reason is grounded in source evidence.`;

  return {
    case_id: testCase.id,
    variant_id: variantId,
    treatment: variantId,
    model: "gpt-5.5",
    raw_response_sha256: `${testCase.id}-${variantId}-sha`,
    prompt_sha256: `${testCase.id}-${variantId}-prompt`,
    mcp_context_sha256: variantId === "judgmentkit_mcp" ? `${testCase.id}-mcp` : null,
    raw_response: JSON.stringify({ response }),
    parsed: {
      response,
      next_action: overrides.next_action ?? testCase.expected_next_action,
      questions: overrides.questions ?? [],
      handoff: overrides.handoff ?? handoff,
      rationale: overrides.rationale ?? "Grounded in source evidence with a clear required fix or handoff.",
    },
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

validateCases(cases);
assert.equal(cases.length, 20);

for (const testCase of cases) {
  assert.ok(testCase.id);
  assert.ok(testCase.title);
  assert.ok(testCase.task_prompt);
  assert.deepEqual(
    testCase.variants.map((variant) => variant.id),
    VARIANT_IDS,
  );
  assert.ok(testCase.minimum_score_delta > 0);
  assert.equal(
    Math.round(
      METRIC_IDS.reduce((sum, metricId) => sum + testCase.scoring_weights[metricId], 0) * 1000,
    ),
    1000,
  );

  for (const metricId of METRIC_IDS) {
    assert.ok(Array.isArray(testCase.required_terms[metricId]));
  }

  for (const hiddenTerm of HIDDEN_TREATMENT_TERMS) {
    assert.equal(
      normalizeText(testCase.task_prompt).includes(normalizeText(hiddenTerm)),
      false,
      `${testCase.id} task prompt leaked treatment term ${hiddenTerm}`,
    );
  }
}

{
  const testCase = cases.find((candidate) => candidate.id === "vague-system-dashboard");
  const context = await buildMcpContextForCase(testCase);
  assert.deepEqual(context.tool_sequence, testCase.expected_mcp_tools);
  assert.deepEqual(
    context.tool_calls.map((call) => call.summary.status),
    ["needs_source_context", "needs_source_context", "ok"],
  );
}

{
  const testCase = cases.find((candidate) => candidate.id === "missing-handoff-workflow");
  const context = await buildMcpContextForCase(testCase);
  assert.deepEqual(context.tool_sequence, testCase.expected_mcp_tools);
  assert.equal(context.tool_sequence.includes("create_ui_generation_handoff"), false);
}

{
  const testCase = cases.find((candidate) => candidate.id === "refund-schema-admin-translation");
  const baseline = mockCapture(testCase, "baseline_no_mcp", {
    response: `Generic admin console with ${testCase.forbidden_terms.join(", ")}.`,
    handoff: {},
  });
  const guided = mockCapture(testCase, "judgmentkit_mcp");
  const result = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: guided,
  });

  assert.equal(result.status, "evaluated");
  assert.equal(result.winner, "judgmentkit_mcp");
  assert.equal(result.passed, true);
  assert.ok(result.score_delta >= testCase.minimum_score_delta);

  const guidedVariant = result.variants.find((variant) => variant.id === "judgmentkit_mcp");
  assert.equal(guidedVariant.metric_results.activity_fit.score, 5);
  assert.equal(guidedVariant.metric_results.handoff_quality.score, 5);
  assert.deepEqual(guidedVariant.critical_disclosure_leaks, []);

  const leakyGuided = mockCapture(testCase, "judgmentkit_mcp", {
    response: `${allRequiredText(testCase)} ${testCase.forbidden_terms[0]}`,
  });
  const leakyResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: leakyGuided,
  });
  assert.equal(leakyResult.passed, false);
  assert.deepEqual(leakyResult.guided_critical_disclosure_leaks, [testCase.forbidden_terms[0]]);

  const tooManyQuestions = mockCapture(testCase, "judgmentkit_mcp", {
    questions: ["Question one?", "Question two?", "Question three?", "Question four?"],
  });
  const questionResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: tooManyQuestions,
  });
  const questionVariant = questionResult.variants.find((variant) => variant.id === "judgmentkit_mcp");
  assert.ok(questionVariant.metric_results.rework_risk.score < 5);

  const missingHandoff = mockCapture(testCase, "judgmentkit_mcp", {
    handoff: {},
  });
  const missingHandoffResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: missingHandoff,
  });
  const missingHandoffVariant = missingHandoffResult.variants.find(
    (variant) => variant.id === "judgmentkit_mcp",
  );
  assert.ok(missingHandoffVariant.metric_results.handoff_quality.score < 5);

  const weakGuided = mockCapture(testCase, "judgmentkit_mcp", {
    response: "Generic admin console.",
    next_action: "Create the page.",
    handoff: {},
  });
  const weakResult = scoreCase(testCase, {
    baseline_no_mcp: baseline,
    judgmentkit_mcp: weakGuided,
  });
  assert.equal(weakResult.passed, false);
  assert.ok(weakResult.score_delta < testCase.minimum_score_delta);
}

{
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-reports-"));
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-mcp-pilot-captures-"));
  const selected = cases.slice(0, 2);
  const uiCatalogPath = path.join(root, "evals", "reports", "index.json");
  const uiCatalogBefore = fs.existsSync(uiCatalogPath)
    ? fs.readFileSync(uiCatalogPath, "utf8")
    : null;

  for (const testCase of selected) {
    writeJson(
      captureFilePath(captureDir, testCase.id, "baseline_no_mcp"),
      mockCapture(testCase, "baseline_no_mcp", {
        response: `Generic implementation page with ${testCase.forbidden_terms.join(", ")}.`,
        handoff: {},
      }),
    );
    writeJson(
      captureFilePath(captureDir, testCase.id, "judgmentkit_mcp"),
      mockCapture(testCase, "judgmentkit_mcp"),
    );
  }

  const first = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    mcpVersion: "0.1.0",
    cases: selected.map((testCase) => testCase.id),
  });
  assert.equal(first.report.eval_id, "judgmentkit-mcp-private-pilot-v1");
  assert.equal(first.report.summary.cases, 2);
  assert.equal(first.report.summary.evaluated_cases, 2);
  assert.equal(first.report.summary.capture_required_cases, 0);
  assert.equal(first.report.summary.pilot_status, "passed");
  assert.equal(fs.existsSync(first.runInfo.jsonReportPath), true);
  assert.equal(fs.existsSync(first.runInfo.htmlReportPath), true);
  assert.equal(fs.existsSync(path.join(reportsDir, "index.json")), true);
  assert.equal(fs.existsSync(path.join(reportsDir, "index.html")), true);

  const firstJson = fs.readFileSync(first.runInfo.jsonReportPath, "utf8");
  const second = await runMcpPilotEval({
    captureDir,
    reportsDir,
    runDate: "2026-06-12",
    mcpVersion: "0.1.0",
    cases: selected.map((testCase) => testCase.id),
  });
  assert.equal(fs.readFileSync(first.runInfo.jsonReportPath, "utf8"), firstJson);
  assert.equal(second.report.run.run_id, "run-002");
  assert.equal(second.catalog.latest.json_report, "2026-06-12/mcp-0.1.0/run-002/mcp-pilot-report.json");

  if (uiCatalogBefore !== null) {
    assert.equal(fs.readFileSync(uiCatalogPath, "utf8"), uiCatalogBefore);
  }
}

console.log("MCP pilot eval checks passed.");
