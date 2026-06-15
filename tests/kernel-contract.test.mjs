import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createUiImplementationContract } from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const contract = readJson("contracts/ai-ui-generation.activity-contract.json");
const schema = readJson("contracts/judgmentkit-kernel.schema.json");

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
  contract.implementation_contract.approved_primitives.includes("ModalActions"),
  "The implementation contract must provide portable primitive coverage for modal action groups.",
);
const modalActionsRule = contract.implementation_contract.primitive_rules.find(
  (rule) => rule.primitive === "ModalActions",
);
assert.ok(modalActionsRule, "The implementation contract must include ModalActions rules.");
assert.ok(
  modalActionsRule.required.some((rule) => rule.includes("secondary cancel or dismiss")),
  "ModalActions must require cancel/dismiss actions before primary completion actions.",
);
assert.ok(
  modalActionsRule.required.some((rule) => rule.includes("visually final")),
  "ModalActions must require the primary completion action to be visually final.",
);
assert.ok(
  modalActionsRule.required.some((rule) => rule.includes("submit or default Enter")),
  "ModalActions must require form-backed primary actions to submit by default.",
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
assert.ok(
  contract.implementation_contract.browser_qa.checks.some((check) =>
    check.includes("modal or dialog footer order"),
  ),
  "The implementation contract must require modal footer order QA when dialogs are present.",
);
assert.equal(
  contract.implementation_contract.default_ai_native_design_system.mode,
  "contract_defaults",
  "The implementation contract must include built-in AI-native contract defaults.",
);
assert.ok(
  contract.implementation_contract.default_ai_native_design_system.surface_patterns.some(
    (pattern) => pattern.includes("operator review"),
  ),
  "The default AI-native system must include surface pattern defaults.",
);
assert.ok(
  contract.implementation_contract.default_ai_native_design_system.action_boundaries.required.some(
    (rule) => rule.includes("approval boundary"),
  ),
  "The default AI-native system must include action-boundary defaults.",
);
assert.ok(
  contract.implementation_contract.default_ai_native_design_system.data_visibility
    .diagnostic_only_terms.includes("JSON schema"),
  "The default AI-native system must include data-visibility defaults.",
);
assert.ok(
  contract.implementation_contract.default_ai_native_design_system.adapter_boundary
    .visual_token_adapter.includes("visual_token_adapter"),
  "The default AI-native system must point to the visual token adapter boundary.",
);
assert.equal(
  contract.implementation_contract.iteration_policy.owner,
  "agent",
  "The iteration policy must be agent-owned.",
);
assert.equal(
  contract.implementation_contract.iteration_policy.default_max_attempts,
  3,
  "The iteration policy must default to three attempts.",
);
assert.ok(
  contract.implementation_contract.iteration_policy.failure_statuses.includes(
    "repair_and_resubmit",
  ),
  "The iteration policy must support repair-and-resubmit outcomes.",
);
assert.ok(
  contract.implementation_contract.visual_asset_policy.applies_when.some((rule) =>
    rule.includes("substantive visuals"),
  ),
  "The implementation contract must define when the visual asset policy applies.",
);
assert.ok(
  contract.implementation_contract.visual_asset_policy.preferred_paths.some((rule) =>
    rule.includes("imagegen"),
  ),
  "The visual asset policy must prefer imagegen for substantive bitmap assets.",
);
assert.ok(
  contract.implementation_contract.visual_asset_policy.preferred_paths.some((rule) =>
    rule.includes("Three.js") || rule.includes("WebGL"),
  ),
  "The visual asset policy must allow premium JavaScript 3D rendering.",
);
assert.ok(
  contract.implementation_contract.visual_asset_policy.preferred_paths.some((rule) =>
    rule.includes("D3"),
  ),
  "The visual asset policy must allow high-quality data visualization rendering.",
);
assert.ok(
  contract.implementation_contract.visual_asset_policy.deterministic_safe_uses.some(
    (rule) => rule.includes("exact typography"),
  ),
  "The visual asset policy must preserve deterministic rendering for exact UI work.",
);
assert.ok(
  contract.implementation_contract.visual_asset_policy.failure_signals.some((signal) =>
    signal.includes("rudimentary CSS"),
  ),
  "The visual asset policy must fail rudimentary deterministic substitute geometry.",
);
assert.equal(
  contract.implementation_contract.accessibility_policy.contrast_targets.normal_text_min_ratio,
  4.5,
  "The accessibility policy must default normal text contrast to WCAG AA 4.5:1.",
);
assert.equal(
  contract.implementation_contract.accessibility_policy.contrast_targets.large_text_min_ratio,
  3,
  "The accessibility policy must default large text contrast to WCAG AA 3:1.",
);
assert.equal(
  contract.implementation_contract.accessibility_policy.contrast_targets.non_text_min_ratio,
  3,
  "The accessibility policy must default non-text contrast to WCAG AA 3:1.",
);
assert.equal(
  contract.implementation_contract.accessibility_policy.standards_profile.baseline,
  "WCAG 2.2 AA",
  "The accessibility policy must name the WCAG 2.2 AA baseline.",
);
assert.ok(
  contract.implementation_contract.accessibility_policy.standards_profile.sources.some(
    (source) => source.id === "wcag-4.1.2",
  ),
  "The accessibility policy must carry criterion source metadata.",
);
assert.ok(
  contract.implementation_contract.accessibility_policy.rendered_background_readability.applies_to.some(
    (target) => target.includes("WebGL"),
  ),
  "The accessibility policy must cover WebGL/Three.js rendered backgrounds.",
);
assert.ok(
  contract.implementation_contract.accessibility_policy.required_evidence.includes(
    "accessibility_evidence.keyboard_navigation",
  ),
  "The accessibility policy must require keyboard navigation as core evidence.",
);
assert.ok(
  Boolean(
    contract.implementation_contract.accessibility_policy.conditional_evidence
      .visual_background_contrast,
  ),
  "The accessibility policy must define conditional visual-background contrast evidence.",
);
assert.ok(
  contract.implementation_contract.accessibility_policy.evidence_model.conditional_required.includes(
    "reduced_motion",
  ),
  "The accessibility policy must require reduced-motion evidence when motion is present.",
);
assert.ok(
  Object.keys(contract.implementation_contract.accessibility_policy.contracts).includes(
    "keyboard_and_focus",
  ),
  "The accessibility policy must expose grouped accessibility contracts.",
);
assert.ok(
  contract.implementation_contract.accessibility_policy.failure_signals.some((signal) =>
    signal.includes("opacity-based reveal"),
  ),
  "The accessibility policy must fail opacity reveals that pass through low contrast.",
);
assert.ok(
  schema.$defs.implementationContract.required.includes("accessibility_policy"),
  "The schema must require implementation_contract.accessibility_policy.",
);
assert.ok(
  schema.$defs.implementationContract.required.includes(
    "default_ai_native_design_system",
  ),
  "The schema must require implementation_contract.default_ai_native_design_system.",
);
assert.ok(
  schema.$defs.implementationContract.required.includes("iteration_policy"),
  "The schema must require implementation_contract.iteration_policy.",
);
assert.ok(
  schema.$defs.implementationContract.required.includes("visual_token_adapter"),
  "The schema must require implementation_contract.visual_token_adapter.",
);
assert.deepEqual(
  schema.$defs.implementationContract.properties.default_ai_native_design_system.required,
  [
    "id",
    "mode",
    "purpose",
    "primitive_defaults",
    "surface_patterns",
    "state_rules",
    "action_boundaries",
    "data_visibility",
    "accessibility",
    "evidence_gates",
    "adapter_boundary",
  ],
  "The schema must require the default AI-native system shape.",
);
assert.deepEqual(
  schema.$defs.implementationContract.properties.iteration_policy.required,
  [
    "owner",
    "default_max_attempts",
    "loop",
    "pass_status",
    "failure_statuses",
    "judgmentkit_role",
  ],
  "The schema must require the iteration policy shape.",
);
assert.deepEqual(
  schema.$defs.implementationContract.properties.visual_token_adapter.required,
  [
    "id",
    "mode",
    "purpose",
    "token_families",
    "semantic_roles",
    "adapter_rules",
    "evidence_expectations",
    "deferred_renderer",
    "failure_signals",
  ],
  "The schema must require the visual token adapter shape.",
);
assert.deepEqual(
  schema.$defs.implementationContract.properties.accessibility_policy.required,
  [
    "standards_profile",
    "contrast_targets",
    "rendered_background_readability",
    "required_evidence",
    "conditional_evidence",
    "contracts",
    "evidence_model",
    "failure_signals",
  ],
  "The schema must require the accessibility policy shape.",
);
const overriddenContract = createUiImplementationContract({
  accessibility_policy: {
    contrast_targets: {
      normal_text_min_ratio: 7,
      large_text_min_ratio: 4.5,
      non_text_min_ratio: 4,
    },
    rendered_background_readability: {
      applies_to: ["video"],
      requirement: "Use computed browser evidence for text over video.",
    },
    required_evidence: ["accessibility_evidence.keyboard_navigation"],
    conditional_evidence: {
      visual_background_contrast: {
        applies_when: ["text over video"],
        wcag_criteria: ["1.4.3"],
      },
    },
    failure_signals: ["computed contrast below target"],
  },
});
assert.equal(
  overriddenContract.implementation_contract.accessibility_policy.contrast_targets.normal_text_min_ratio,
  7,
  "createUiImplementationContract must round-trip accessibility policy overrides.",
);
assert.deepEqual(
  overriddenContract.implementation_contract.accessibility_policy.rendered_background_readability.applies_to,
  ["video"],
);
assert.deepEqual(
  overriddenContract.implementation_contract.accessibility_policy.conditional_evidence
    .visual_background_contrast.applies_when,
  ["text over video"],
);
const overriddenIterationContract = createUiImplementationContract({
  iteration_policy: {
    default_max_attempts: 5,
  },
});
assert.equal(
  overriddenIterationContract.implementation_contract.iteration_policy.default_max_attempts,
  5,
  "createUiImplementationContract must round-trip iteration policy overrides.",
);
assert.equal(
  overriddenIterationContract.implementation_contract.default_ai_native_design_system
    .adapter_boundary.visual_token_adapter.includes("visual_token_adapter"),
  true,
  "createUiImplementationContract must keep the default system pointing at the token adapter boundary.",
);
assert.equal(
  contract.implementation_contract.visual_token_adapter.mode,
  "boundary_only",
  "The visual token adapter must be boundary-only in Milestone 3.",
);
assert.ok(
  contract.implementation_contract.visual_token_adapter.token_families.includes("color"),
  "The visual token adapter must include color as a supported family.",
);
assert.ok(
  contract.implementation_contract.visual_token_adapter.token_families.includes("motion"),
  "The visual token adapter must include motion as a supported family.",
);
assert.equal(
  contract.implementation_contract.visual_token_adapter.deferred_renderer.renderer_package,
  "deferred",
  "The visual token adapter must defer renderer packages.",
);
assert.ok(
  contract.implementation_contract.visual_token_adapter.adapter_rules.some((rule) =>
    rule.includes("cannot satisfy missing activity"),
  ),
  "The visual token adapter must not weaken existing gates.",
);
const overriddenTokenContract = createUiImplementationContract({
  visual_token_adapter: {
    token_families: ["color", "motion"],
    semantic_roles: ["focus", "status"],
    evidence_expectations: ["map semantic token use to focus and status roles"],
  },
});
assert.deepEqual(
  overriddenTokenContract.implementation_contract.visual_token_adapter.token_families,
  ["color", "motion"],
  "createUiImplementationContract must normalize visual token adapter overrides.",
);
assert.deepEqual(
  overriddenTokenContract.implementation_contract.visual_token_adapter.semantic_roles,
  ["focus", "status"],
);
assert.ok(
  contract.implementation_contract.failure_signals.some((signal) =>
    signal.includes("modal or dialog actions"),
  ),
  "The implementation contract must fail incorrect non-destructive modal action order.",
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
