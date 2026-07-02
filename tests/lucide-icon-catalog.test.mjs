import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  createUiGenerationHandoff,
  createUiImplementationContract,
  getIconSvg,
  listIconCatalog,
  reviewUiImplementationCandidate,
  reviewUiWorkflowCandidate,
  searchIconCatalog,
} from "../src/index.mjs";
import {
  LUCIDE_ICON_CATALOG,
  LUCIDE_ICON_INDEX,
  LUCIDE_ICON_SOURCE,
} from "../src/lucide-icon-catalog.generated.mjs";

const knownIconIds = [
  "check",
  "info",
  "chevron-right",
  "list-filter",
  "send",
  "receipt-text",
];

execFileSync("node", ["scripts/generate-lucide-icon-catalog.mjs", "--check"], {
  cwd: process.cwd(),
  stdio: "pipe",
});

assert.ok(LUCIDE_ICON_CATALOG.length > 1000);
assert.equal(LUCIDE_ICON_CATALOG.length, LUCIDE_ICON_SOURCE.icon_count);

for (const id of knownIconIds) {
  const icon = LUCIDE_ICON_INDEX.get(id);
  assert.ok(icon, `${id} should be present in the generated Lucide catalog.`);
  assert.equal(icon.source.library, "lucide");
  assert.equal(icon.source.version, LUCIDE_ICON_SOURCE.version);
  assert.ok(icon.source.license.includes("ISC"));
  assert.equal(icon.viewBox, "0 0 24 24");
  assert.ok(icon.elements.length > 0);
  assert.ok(icon.svg.startsWith("<svg"));
}

const listResult = listIconCatalog({ limit: 5 });
assert.equal(listResult.icons.length, 5);
assert.ok(listResult.next_cursor);
assert.equal(listResult.include_svg, false);
assert.equal("svg" in listResult.icons[0], false);
assert.equal(listResult.source.library, "lucide");

const listWithSvg = listIconCatalog({ limit: 1, include_svg: true });
assert.ok(listWithSvg.icons[0].svg.includes("<svg"));
assert.ok(listWithSvg.icons[0].elements.length > 0);

const searchResult = searchIconCatalog({ query: "receipt text", limit: 5 });
assert.equal(searchResult.icons[0].id, "receipt-text");
assert.ok(searchResult.icons[0].score > searchResult.icons.at(-1).score);

const getResult = getIconSvg({ id: "check" });
assert.equal(getResult.id, "check");
assert.ok(getResult.inline_svg.includes("<path"));
assert.ok(getResult.icon.source.feather_mit_derived);

const implementationContract = createUiImplementationContract();
const visualTokenAdapter =
  implementationContract.implementation_contract.visual_token_adapter;
const designSystemSource =
  implementationContract.implementation_contract.design_system_source;
assert.equal(designSystemSource.mode, "judgmentkit_default");
assert.ok(designSystemSource.source_exports.icon_tools.includes("get_icon_svg"));
assert.equal("icon_registry" in visualTokenAdapter, false);
assert.equal(visualTokenAdapter.icon_catalog.library, "lucide");
assert.ok(visualTokenAdapter.icon_catalog.icon_count > 1000);
assert.ok(visualTokenAdapter.icon_catalog.mcp_tools.includes("get_icon_svg"));
assert.ok(
  visualTokenAdapter.css_custom_properties.some(
    (entry) => entry.name === "--jk-color-surface" && entry.value === "#ffffff",
  ),
);

const unsupportedIconReview = reviewUiImplementationCandidate(
  {
    primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
    states_covered:
      implementationContract.implementation_contract.state_coverage.required_states,
    static_checks: ["npm test"],
    browser_qa: { desktop: "passed", mobile: "passed" },
    accessibility_evidence: {
      automated_checks: { status: "pass", method: "test" },
      semantic_content: { status: "pass", method: "test" },
      landmarks_headings: { status: "pass", method: "test" },
      name_role_value: { status: "pass", method: "test" },
      keyboard_navigation: { status: "pass", method: "test" },
      focus_order: { status: "pass", method: "test" },
      focus_visible: { status: "pass", method: "test" },
      responsive_no_overflow: { status: "pass", method: "test" },
      non_text_contrast: { status: "pass", method: "test" },
      semantic_fallbacks: { status: "pass", method: "test" },
    },
    visual_token_evidence: {
      token_families: ["color"],
      icon_roles: ["status"],
      selected_icons: ["not-a-real-lucide-icon"],
    },
    design_system_provenance: {
      source: "judgmentkit_default",
      token_source: "/design-system/visual-token-adapter.json",
      typography_source: "/design-system/visual-token-adapter.json",
      icon_source: "JudgmentKit icon catalog via get_icon_svg",
      renderer_component_source:
        "implementation_contract.default_ai_native_design_system.component_contracts",
      import_boundary:
        "No visual, typography, icon, or component package imports outside the active design-system source.",
      token_prefix_source: "implementation_contract.design_system_source.token_prefixes",
      source_exports: "implementation_contract.design_system_source.source_exports",
    },
  },
  { implementation_contract: implementationContract.implementation_contract },
);

assert.equal(unsupportedIconReview.implementation_review_status, "failed");
assert.deepEqual(unsupportedIconReview.checks.visual_tokens.unsupported_icon_ids, [
  "not-a-real-lucide-icon",
]);

const workflowReview = reviewUiWorkflowCandidate(
  "A support lead reviews refund requests, decides whether to approve, return, or escalate each case, and creates a handoff receipt.",
  {
    workflow: {
      surface_name: "Refund review workspace",
      topology: "workspace",
      work_units: ["Refund case queue", "Decision detail"],
      stepper_eligibility: { allowed: false, reason: "Work is triage, not staged setup." },
      primary_actions: ["Approve refund", "Return for evidence", "Escalate"],
      decision_points: ["Evidence is sufficient", "Policy exception is present"],
      completion_state: "Case has a handoff receipt.",
    },
    surface_set: [
      {
        name: "Case queue",
        purpose: "Scan refund requests.",
        sections: ["Queue", "Filters"],
        controls: ["Select case", "Filter queue"],
      },
    ],
    handoff: {
      next_action: "Generate the review UI.",
      payload: ["Decision", "Reason", "Owner"],
    },
    diagnostics: { assumptions: [] },
  },
);
const handoff = createUiGenerationHandoff(workflowReview, {
  implementation_contract: implementationContract.implementation_contract,
});
const frontendContext = createFrontendGenerationContext({
  ui_generation_handoff: handoff,
});
const skillContext = createFrontendImplementationSkillContext({
  frontend_generation_context: frontendContext,
});

assert.equal(skillContext.icon_guidance.icon_catalog.library, "lucide");
assert.ok(skillContext.icon_guidance.icon_catalog.icon_count > 1000);
assert.equal(Array.isArray(skillContext.icon_guidance.icon_catalog.icons), false);
assert.equal(JSON.stringify(skillContext).includes("status-check"), false);
assert.ok(skillContext.token_guidance.css_custom_properties.length > 0);
assert.ok(skillContext.component_contracts.some((entry) => entry.id === "action_button"));
assert.ok(skillContext.pattern_contracts.some((entry) => entry.id === "workbench"));
assert.ok(skillContext.instruction_markdown.includes("Icon catalog"));
assert.ok(skillContext.instruction_markdown.includes("--jk-color-surface"));
assert.ok(skillContext.instruction_markdown.includes("Component contracts"));
