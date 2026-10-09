import assert from "node:assert/strict";
import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import {
  createUiImplementationContract,
  loadActivityContract,
  preflightUiImplementationCandidate,
  preflightUiImplementationCandidateWithBrowserRuntime,
  reviewUiImplementationCandidate,
  reviewUiImplementationCandidateWithBrowserRuntime,
} from "../src/index.mjs";
import { normalizeChartReviewPolicy } from "../src/chart-review.mjs";

const contract = createUiImplementationContract().implementation_contract;
const validShape = { primitives_used: [], states_covered: [], static_checks: [] };
const malformed = { states_covered: "loading", primitives_used: 42, static_checks: [] };
for (const review of [
  preflightUiImplementationCandidate(malformed),
  reviewUiImplementationCandidate(malformed, { iteration_context: { current_attempt: 2, max_attempts: 3 } }),
  await reviewUiImplementationCandidateWithBrowserRuntime(malformed, { iteration_context: { current_attempt: 2, max_attempts: 3 } }),
]) {
  assert.equal(review.admission_status, "repair_evidence_packet");
  assert.equal(review.substantive_review_performed, false);
  assert.equal(review.attempt_consumed, false);
  assert.equal(review.next_agent_action, "repair_packet_and_resubmit");
  assert.ok(review.diagnostics.some(({ path, expected }) => path === "candidate.states_covered" && expected === "string[]"));
  assert.ok(review.diagnostics.some(({ path }) => path === "candidate.primitives_used"));
  if (review.autofix_loop) {
    assert.equal(review.autofix_loop.remaining_attempts, 2);
    assert.equal(review.autofix_loop.current_attempt, 2);
  }
}
const omitted = preflightUiImplementationCandidate({});
assert.deepEqual(omitted.diagnostics.map(({ path }) => path).sort(), ["candidate.states_covered", "candidate.static_checks"]);
assert.equal(preflightUiImplementationCandidate({ covered_states: [], checks_run: [] }).admission_status, "ready_for_review");
assert.equal(preflightUiImplementationCandidate({ covered_states: "loading", checks_run: [] }).diagnostics[0].path, "candidate.covered_states");
const failingUi = reviewUiImplementationCandidate(validShape);
assert.equal(failingUi.implementation_review_status, "failed");
assert.equal(failingUi.substantive_review_performed, true);
assert.equal(failingUi.attempt_consumed, true);
assert.equal(failingUi.checks.state_coverage.status, "fail");
assert.equal(failingUi.checks.static_enforcement.status, "fail");

const wrongRegions = preflightUiImplementationCandidate({
  ...validShape,
  pattern_contract_evidence: { pattern_id: "dashboard_monitor", regions: { metrics: true }, controls: [] },
});
assert.ok(wrongRegions.diagnostics.some(({ path, code }) => path === "candidate.pattern_contract_evidence.regions" && code === "pattern_evidence_array_required"));
const wrongRationale = preflightUiImplementationCandidate({
  ...validShape,
  accessibility_evidence: { overlay_focus: { status: "not_applicable", notes: "No overlay is present." } },
});
assert.equal(wrongRationale.diagnostics[0].path, "candidate.accessibility_evidence.overlay_focus.rationale");
assert.equal(preflightUiImplementationCandidate({ ...validShape, accessibility_evidence: { overlay_focus: { status: "not_applicable", rationale: "No overlay is present." } } }).admission_status, "ready_for_review");
assert.equal(preflightUiImplementationCandidate({ ...validShape, design_system_provenance: null }).admission_status, "repair_evidence_packet");
assert.equal(preflightUiImplementationCandidate({ ...validShape, design_system_provenance: {} }).admission_status, "ready_for_review");

const declared = { samples: [{ rule_id: "presentation_owner.select_indicator", selector: ".control" }] };
const html = '<main><div class="control"><select aria-label="Day"><option>Today</option></select></div></main>';
const wrapper = await preflightUiImplementationCandidateWithBrowserRuntime({ ...validShape, rendered_html: html, visual_composition_manifest: declared });
assert.equal(wrapper.admission_status, "repair_evidence_packet");
assert.equal(wrapper.attempt_consumed, false);
assert.ok(wrapper.diagnostics.every(({ code }) => code === "select_selector_not_control"));
const repaired = await preflightUiImplementationCandidateWithBrowserRuntime({ ...validShape, rendered_html: html, visual_composition_manifest: { samples: [{ rule_id: "presentation_owner.select_indicator", selector: ".control select" }] } });
assert.equal(repaired.admission_status, "ready_for_review");
assert.equal(repaired.selector_observation_status, "observed");

// Admission and substantive rendering must use the same safe HTML aliases.
for (const alias of ["markup", "rendered_markup", "code"]) {
  const result = await preflightUiImplementationCandidateWithBrowserRuntime({ ...validShape, [alias]: html, visual_composition_manifest: { samples: [{ rule_id: "presentation_owner.select_indicator", selector: "???" }] } });
  assert.equal(result.admission_status, "repair_evidence_packet", alias);
  assert.ok(result.diagnostics.some(({ code }) => code === "selector_syntax_invalid"), alias);
}

const chartRequired = createUiImplementationContract({ chart_review_required: true }).implementation_contract;
const noOracle = preflightUiImplementationCandidate(validShape, { implementation_contract: chartRequired });
assert.equal(noOracle.admission_status, "repair_evidence_packet");
assert.ok(noOracle.diagnostics.some(({ code, path }) => code === "chart_data_oracle_required" && path === "implementation_contract.chart_review_policy"));
const textualNoOracle = reviewUiImplementationCandidate("A chart implementation", { implementation_contract: chartRequired });
assert.equal(textualNoOracle.admission_status, "repair_evidence_packet");
assert.equal(textualNoOracle.attempt_consumed, false);
const frontendRequiresChart = { frontend_context_status: "ready_for_frontend_implementation", surface_type: "dashboard_monitor", implementation_contract: chartRequired };
const reconciled = reviewUiImplementationCandidate(validShape, { implementation_contract: contract, frontend_generation_context: frontendRequiresChart });
assert.equal(reconciled.admission_status, "repair_evidence_packet");
assert.equal(reconciled.attempt_consumed, false);
assert.ok(reconciled.diagnostics.some(({ code }) => code === "chart_data_oracle_required"));
assert.throws(() => createUiImplementationContract({ chart_review_required: "true" }), (error) => error.code === "invalid_chart_review_requirement");

const example = JSON.parse(fs.readFileSync(new URL("../contracts/chart-review.policy-contract.json", import.meta.url), "utf8"));
const schema = JSON.parse(fs.readFileSync(new URL("../contracts/chart-review-policy.schema.json", import.meta.url), "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
assert.equal(validate(example), true, JSON.stringify(validate.errors));
const policy = normalizeChartReviewPolicy(example);
assert.equal(validate(policy), true, JSON.stringify(validate.errors));
assert.match(policy.data_cases[0].data_sha256, /^[a-f0-9]{64}$/);
assert.deepEqual(normalizeChartReviewPolicy(policy), policy);
assert.throws(() => normalizeChartReviewPolicy({ ...example, data_cases: [{ ...example.data_cases[0], data_sha256: "0".repeat(64) }] }), (error) => error.code === "invalid_chart_review_policy");
assert.throws(() => normalizeChartReviewPolicy({ ...example, data_cases: [{ ...example.data_cases[0], points: [{ x: 1, y: 0 }, { x: 0, y: 1 }] }] }));
const chartContract = createUiImplementationContract({ chart_review_policy: example }).implementation_contract;

// A governing contract remains the implementation authority when no explicit
// implementation or frontend contract was supplied. All admission/review routes
// must keep its oracle and request the missing render, not a replacement oracle.
const governing = structuredClone(loadActivityContract());
governing.implementation_contract = chartContract;
for (const review of [
  preflightUiImplementationCandidate,
  preflightUiImplementationCandidateWithBrowserRuntime,
  reviewUiImplementationCandidate,
  reviewUiImplementationCandidateWithBrowserRuntime,
]) {
  const inherited = await review(validShape, { contract: governing });
  const explicit = await review(validShape, { contract: governing, implementation_contract: chartContract });
  assert.deepEqual(inherited, explicit, review.name);
  assert.ok(inherited.diagnostics.some(({ code }) => code === "chart_manifest_required"), review.name);
  assert.equal(inherited.diagnostics.some(({ code }) => code === "chart_data_oracle_required"), false, review.name);
  assert.equal(inherited.attempt_consumed, false, review.name);
}
for (const options of [
  { implementation_contract: contract },
  { ui_implementation_contract: contract },
  { frontend_generation_context: { implementation_contract: contract } },
]) {
  const override = preflightUiImplementationCandidate(validShape, { contract: governing, ...options });
  assert.equal(override.admission_status, "repair_evidence_packet", "A weaker supplied contract cannot suppress the governing chart requirement.");
  assert.ok(override.diagnostics.some(({ code }) => code === "chart_data_oracle_required"));
  assert.equal(override.attempt_consumed, false);
}
const suppliedChartContract = createUiImplementationContract({
  chart_review_policy: { ...example, data_cases: example.data_cases.map(entry => ({ ...entry, state_id: "supplied-today" })) },
}).implementation_contract;
const suppliedCandidate = {
  ...validShape,
  chart_review_manifest: {
    chart_selector: "svg", series_selector: "path", selection_selectors: { period: "select" },
    states: [{ state_id: "supplied-today", rendered_html: '<main><select><option value="today">Today</option></select><svg><path d="M0 0 L1 1"/></svg></main>' }],
  },
};
assert.ok(preflightUiImplementationCandidate(suppliedCandidate, { contract: governing }).diagnostics
  .some(({ code }) => code === "chart_required_state_missing"));
for (const options of [
  { implementation_contract: suppliedChartContract },
  { ui_implementation_contract: suppliedChartContract },
  { frontend_generation_context: { implementation_contract: suppliedChartContract } },
]) {
  assert.equal(preflightUiImplementationCandidate(suppliedCandidate, { contract: governing, ...options }).admission_status,
    "ready_for_review", "A compatible supplied oracle takes precedence over the governing default oracle.");
}
assert.throws(() => createUiImplementationContract({ chart_review_required: true, chart_review_policy: { ...example, required_checks: ["label_collision"] } }), (error) => error.code === "incomplete_chart_review_policy");
const invalidChartSelector = await preflightUiImplementationCandidateWithBrowserRuntime({
  ...validShape,
  chart_review_manifest: {
    chart_selector: "svg", series_selector: "???", selection_selectors: { period: "select" },
    states: [{ state_id: "example-today", rendered_html: '<main><select><option value="today">Today</option></select><svg><path d="M0 0 L1 1"/></svg></main>' }],
  },
}, { implementation_contract: chartContract });
assert.equal(invalidChartSelector.admission_status, "repair_evidence_packet");
assert.equal(invalidChartSelector.attempt_consumed, false);
assert.ok(invalidChartSelector.diagnostics.some(({ code, path }) => code === "selector_syntax_invalid" && path === "candidate.chart_review_manifest.series_selector"));
for (const manifest of [undefined, { applicability: "none", states: [] }]) {
  const result = preflightUiImplementationCandidate({ ...validShape, chart_review_manifest: manifest }, { implementation_contract: chartContract });
  assert.equal(result.admission_status, "repair_evidence_packet");
  assert.equal(result.attempt_consumed, false);
}

const priorChrome = process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
const priorConsoleError = console.error;
process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH = "/judgmentkit-test/missing-chrome";
console.error = () => {};
try {
  const unavailable = await preflightUiImplementationCandidateWithBrowserRuntime({ ...validShape, rendered_html: html, visual_composition_manifest: declared });
  assert.equal(unavailable.admission_status, "retry_evidence_preflight");
  assert.equal(unavailable.next_agent_action, "retry_preflight");
  assert.equal(unavailable.retryable, true);
  assert.equal(unavailable.attempt_consumed, false);
  const unavailableReview = await reviewUiImplementationCandidateWithBrowserRuntime({ ...validShape, rendered_html: html, visual_composition_manifest: declared });
  assert.equal(unavailableReview.implementation_review_status, "not_reviewed");
  assert.equal(unavailableReview.attempt_consumed, false);
} finally {
  console.error = priorConsoleError;
  if (priorChrome === undefined) delete process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
  else process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH = priorChrome;
}
console.log("Evidence admission tests passed.");
