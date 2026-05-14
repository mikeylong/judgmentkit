import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const contract = readJson("contracts/ai-ui-generation.activity-contract.json");

assert.equal(contract.source_model, "fresh_start");
assert.deepEqual(contract.quality_order.slice(0, 4), [
  "activity fit",
  "domain appropriateness",
  "succinct interaction",
  "decision support",
]);
assert.equal(contract.quality_order.at(-1), "aesthetic fit");

for (const section of [
  "surface_types",
  "activity_model",
  "interaction_contract",
  "disclosure_policy",
  "implementation_contract",
  "evaluation",
]) {
  assert.ok(contract[section], `Missing ${section}`);
}

const hiddenTerms = new Set(contract.activity_model.implementation_concepts_to_hide);
for (const term of [
  "MCP server",
  "tools/list",
  "tool call",
  "prompt template",
  "JSON schema",
  "resource id",
]) {
  assert.ok(hiddenTerms.has(term), `Expected ${term} to be hidden by default`);
  assert.ok(
    contract.disclosure_policy.primary_ui_must_not_show.includes(term),
    `Expected ${term} to be excluded from primary UI`,
  );
}

assert.ok(
  contract.non_goals.some((goal) => goal.includes("design system")),
  "The kernel must reject design-system-first framing.",
);
assert.ok(
  contract.evaluation.failure_signals.some((signal) =>
    signal.includes("visual style changes as the main fix"),
  ),
  "The kernel must fail aesthetic-first fixes.",
);

assert.ok(
  contract.implementation_contract.approved_primitives.includes("CheckboxGroup"),
  "The implementation contract must provide portable primitive coverage for checkbox groups.",
);
assert.ok(
  contract.implementation_contract.static_enforcement.default_rules.some((rule) =>
    rule.includes("raw input"),
  ),
  "The implementation contract must block raw controls outside approved helpers.",
);
assert.ok(
  contract.implementation_contract.browser_qa.required,
  "The implementation contract must require browser QA for UI generation.",
);

assert.equal(contract.workflow.id, "workflow.ai-ui-generation");
assert.deepEqual(Object.keys(contract.surface_types), [
  "marketing",
  "workbench",
  "operator_review",
  "form_flow",
  "dashboard_monitor",
  "content_report",
  "setup_debug_tool",
  "conversation",
]);
assert.ok(
  contract.surface_types.marketing.purpose.includes("offer"),
  "marketing surface must classify persuasion and offer explanation by purpose.",
);
assert.ok(
  contract.surface_types.workbench.purpose.includes("inspect"),
  "workbench surface must classify repeated inspect/compare/decide/act work.",
);
assert.ok(
  contract.surface_types.setup_debug_tool.applies_when_most_true.some((entry) =>
    entry.includes("Implementation details"),
  ),
  "setup/debug surface must allow implementation details when they are task material.",
);

const operatorReviewProfile = contract.profiles["operator-review-ui"];
assert.equal(operatorReviewProfile.pattern_id, "operator-review");
assert.deepEqual(
  operatorReviewProfile.guardrails.map((guardrail) => guardrail.id),
  [
    "guardrail.activity-first-ia",
    "guardrail.work-queue-topology",
    "guardrail.primary-surface-economy",
    "guardrail.selector-density-boundary",
    "guardrail.control-proximity",
    "guardrail.readable-label-value-patterns",
    "guardrail.contextual-help-disclosure",
    "guardrail.quiet-operational-state",
  ],
);
assert.ok(
  operatorReviewProfile.applies_when_most_true.some((trigger) =>
    trigger.includes("system-produced work"),
  ),
  "operator-review-ui must describe AI/system work review triggers.",
);
assert.ok(
  operatorReviewProfile.do_not_use_when.some((entry) =>
    entry.includes("passive dashboard"),
  ),
  "operator-review-ui must include false-positive exclusions.",
);
assert.ok(
  operatorReviewProfile.review_criteria.some((entry) =>
    entry.includes("current item"),
  ),
  "operator-review-ui must include review criteria for current item clarity.",
);
assert.ok(
  operatorReviewProfile.test_scenarios.some((entry) =>
    entry.includes("False-positive"),
  ),
  "operator-review-ui must include false-positive test scenarios.",
);

const operatorProfileText = JSON.stringify(operatorReviewProfile).toLowerCase();
for (const forbiddenPhrase of [
  "surfaces",
  "css selector",
  "figma",
  "left rail",
]) {
  assert.equal(
    operatorProfileText.includes(forbiddenPhrase),
    false,
    `operator-review-ui must stay implementation-agnostic and avoid ${forbiddenPhrase}`,
  );
}
assert.equal(
  /\b\d+\s*px\b/.test(operatorProfileText),
  false,
  "operator-review-ui must not include pixel-level guidance.",
);

const readme = readText("README.md");
assert.ok(
  readme.includes("Aesthetics are adapter-layer work"),
  "README must keep aesthetics as a later adapter.",
);
assert.ok(!readme.includes("/Users/mike/judgmentkit"), "README must not anchor to v1 path.");

for (const staleFile of [
  "contracts/design-tokens.schema.json",
  "contracts/component-rules.json",
]) {
  assert.equal(fs.existsSync(path.join(root, staleFile)), false, `${staleFile} should not exist`);
}

console.log("JudgmentKit kernel contract checks passed.");
