import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  createFrontendGenerationContext,
  createUiGenerationHandoff,
  createUiImplementationContract,
  createVisualCompositionEvidenceBinding,
  reviewUiImplementationCandidate,
  reviewUiImplementationCandidateWithBrowserRuntime,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";
import { measureVisualCompositionInBrowser } from "../src/visual-composition-browser-runtime.mjs";
import { deriveFieldValueTrailingIndicatorSlotObservation } from "../src/visual-composition-observation.mjs";

const DEFAULT_POLICY_ID = "judgmentkit.visual-composition.adapter-v1";
const EXTERNAL_POLICY_ID = "material.visual-composition.v1";

function canonicalJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalJsonValue(value[key])]),
    );
  }
  return value;
}

function sha256CanonicalValue(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalJsonValue(value)))
    .digest("hex");
}

const REFUND_REVIEW_BRIEF = `
  A support lead reviews refund requests, decides whether each case should be
  approved, sent to policy review, or returned for missing evidence, and leaves
  the support agent a clear handoff receipt.
`;

function refundWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund escalation queue",
      topology: "workspace",
      work_units: ["Review evidence", "Choose path", "Prepare handoff"],
      primary_actions: [
        "Approve refund",
        "Send to policy review",
        "Return for evidence",
      ],
      decision_points: [
        "Decide whether the case should be approved, sent to policy review, or returned for missing evidence.",
      ],
      completion_state: "Clear handoff with next action and decision reason.",
    },
    surface_set: [
      {
        name: "Refund escalation workspace",
        purpose: "Review refund context, evidence, policy details, and handoff outcome.",
        sections: [
          "Selected case",
          "Evidence checklist",
          "Policy review context",
          "Handoff",
        ],
        controls: [
          "Approve refund",
          "Send to policy review",
          "Return for evidence",
          "Send handoff",
        ],
        relationship_to_workflow:
          "Keeps refund evidence and decision controls together.",
      },
    ],
    handoff: {
      next_owner: "support agent",
      reason: "Receipt or support evidence is missing.",
      next_action: "Send handoff with next action and decision reason.",
    },
    diagnostics: {
      implementation_terms: [],
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function coreAccessibilityEvidence() {
  return {
    automated_checks: {
      status: "pass",
      method: "axe and static accessibility lint",
      artifacts: ["npm run check"],
    },
    semantic_content: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic regions and fallback content verified.",
    },
    landmarks_headings: {
      status: "pass",
      method: "accessibility tree inspection",
      notes: "Landmarks and heading order support orientation.",
    },
    name_role_value: {
      status: "pass",
      method: "accessibility tree inspection",
      notes: "Interactive controls expose names, roles, states, and values.",
    },
    keyboard_navigation: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "All actions are reachable and operable by keyboard.",
    },
    focus_order: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "Tab order follows visual and DOM reading order.",
    },
    focus_visible: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "Focus indicators remain visible.",
    },
    responsive_no_overflow: {
      status: "pass",
      method: "desktop and mobile browser review",
      notes: "Text reflows without overflow.",
    },
    semantic_fallbacks: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic HTML provides fallback structure.",
    },
    non_text_contrast: {
      status: "pass",
      method: "computed style contrast check",
      samples: [{ target: "checkbox boundary", contrast_ratio: 3.4 }],
    },
    visual_background_contrast: {
      status: "pass",
      browser_rendered: true,
      method: "browser-rendered contrast sampling",
      samples: [{ target: "refund review text", contrast_ratio: 5.2 }],
    },
    forced_colors: {
      status: "pass",
      method: "forced-colors emulation",
      notes: "Text, controls, and focus remain visible in forced-colors mode.",
    },
    form_labels_instructions: {
      status: "pass",
      method: "DOM inspection",
      notes: "Inputs have visible labels and programmatic associations.",
    },
    form_errors: {
      status: "pass",
      method: "validation state review",
      notes: "Invalid fields have text and programmatic error state.",
    },
    status_messages: {
      status: "pass",
      method: "live region inspection",
      notes: "Save, error, and progress messages are programmatically determinable.",
    },
    focus_not_obscured: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "Focused controls remain visible in the modal.",
    },
    no_keyboard_trap: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "Focus can exit the modal.",
    },
  };
}

function defaultDesignSystemProvenance() {
  return {
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
  };
}

function materialDesignSystemProvenance() {
  return {
    source: "external_design_system",
    token_source: "implementation_contract.design_system_adapter.token_guidance",
    typography_source: "implementation_contract.design_system_adapter.font_guidance",
    icon_source: "implementation_contract.design_system_adapter.icon_guidance",
    renderer_component_source:
      "implementation_contract.design_system_adapter.components",
    import_boundary:
      "Material UI imports come from @mui/material and @mui/icons-material, the active external design-system packages.",
    token_prefix_source: "implementation_contract.design_system_source.token_prefixes",
    source_exports: "implementation_contract.design_system_source.source_exports",
  };
}

function baseImplementationCandidate(implementationContract, overrides = {}) {
  return {
    code: "renderRefundReviewWorkbench({ queue, evidence, decisionBar })",
    primitives_used: ["FormField", "CheckboxGroup", "CheckboxOption", "ModalActions"],
    states_covered: implementationContract.state_coverage.required_states,
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport refund review checked",
      mobile: "mobile viewport refund review checked",
    },
    accessibility_evidence: coreAccessibilityEvidence(),
    actions: ["Approve refund", "Send to policy review", "Return for evidence"],
    action_boundary_evidence: {
      approval_boundary:
        "Approve refund requires an explicit user confirmation before submission.",
      completion_receipt:
        "Completion leaves a handoff receipt with the decision reason.",
    },
    visible_text: [
      "Refund request",
      "Evidence checklist",
      "Policy review",
      "Decision reason",
      "Send handoff",
    ],
    data_visibility_evidence: {
      primary_data_roles: ["domain evidence", "decision options", "handoff receipt"],
    },
    design_system_provenance: defaultDesignSystemProvenance(),
    ...overrides,
  };
}

function completeMaterialDesignSystemAdapter(visualCompositionPolicy) {
  return {
    design_system_name: "Material UI",
    design_system_package: "@mui/material",
    token_guidance: {
      token_families: ["color", "type", "spacing", "radius"],
      token_roles: [
        {
          role: "surface",
          families: ["color"],
          usage: "Material UI Paper and surface colors",
        },
        {
          role: "decision",
          families: ["color"],
          usage: "Material UI Button states",
        },
      ],
      css_custom_properties: [
        {
          name: "--mui-palette-background-paper",
          role: "surface",
          family: "color",
          value: "theme.palette.background.paper",
          usage: "Material UI Paper surfaces",
        },
        {
          name: "--mui-font-family",
          role: "text",
          family: "type",
          value: "theme.typography.fontFamily",
          usage: "Material UI Typography",
        },
      ],
    },
    font_guidance: {
      font_roles: {
        body: {
          stack: "var(--mui-font-family)",
          usage: "Material UI body typography",
        },
        heading: {
          stack: "var(--mui-font-family)",
          usage: "Material UI headings",
        },
      },
    },
    icon_guidance: {
      icon_roles: ["status", "action"],
      icon_catalog: {
        source: "external_design_system",
        library: "mui-icons-material",
        package: "@mui/icons-material",
        version: "repo-approved",
        icon_count: 2000,
        license: "MIT",
        notice: "Repo-approved Material UI icon adapter.",
        mcp_tools: [],
      },
    },
    components: ["Stack", "Button", "Alert"],
    ...(visualCompositionPolicy
      ? { visual_composition_policy: visualCompositionPolicy }
      : {}),
  };
}

function materialImplementationCandidate(implementationContract, overrides = {}) {
  return baseImplementationCandidate(implementationContract, {
    code: `
      import { Stack, Button } from "@mui/material";
      import CheckCircle from "@mui/icons-material/CheckCircle";
      export function Review() {
        return <Stack sx={{ color: "var(--mui-palette-background-paper)" }}>
          <Button startIcon={<CheckCircle />}>Send handoff</Button>
        </Stack>;
      }
    `,
    visual_token_evidence: {
      token_families: ["color", "type"],
      font_roles: ["body"],
      icon_roles: ["status", "action"],
      selected_icons: [{ role: "status", id: "CheckCircle" }],
    },
    design_system_provenance: materialDesignSystemProvenance(),
    component_contract_evidence: {
      components: [
        {
          id: "Stack",
          states_covered: ["ready", "disabled", "focus-visible", "loading"],
        },
        {
          id: "Button",
          states_covered: ["ready", "disabled", "focus-visible", "loading"],
        },
      ],
    },
    ...overrides,
  });
}

function calibrationForRule(policy, ruleId) {
  const entry = Object.entries(policy.calibrations).find(
    ([, calibration]) => calibration.rule_id === ruleId,
  );
  assert.ok(entry, `The active policy must declare a ${ruleId} calibration.`);
  return { ref: entry[0], ...entry[1] };
}

function calibrationForSelectVariant(policy, compositionVariant) {
  const entry = Object.entries(policy.calibrations).find(
    ([, calibration]) =>
      calibration.rule_id === "presentation_owner.select_indicator" &&
      calibration.composition_variant === compositionVariant,
  );
  assert.ok(
    entry,
    `The active policy must declare the ${compositionVariant} select calibration.`,
  );
  return { ref: entry[0], ...entry[1] };
}

function protectedAtomManifest(policy) {
  const calibration = calibrationForRule(policy, "protected_atom.single_line");
  return {
    samples: [
      {
        sample_id: "refund-choice-label",
        rule_id: "protected_atom.single_line",
        calibration_ref: calibration.ref,
        component_family: calibration.component_family,
        selector: "[data-part='refund-label']",
        target_selector: "[data-part='refund-label']",
      },
    ],
  };
}

function protectedAtomCandidate(implementationContract, { failing = false } = {}) {
  return baseImplementationCandidate(implementationContract, {
    rendered_html: `<!doctype html>
      <html>
        <head>
          <style>
            body { font: 16px/20px Arial, sans-serif; padding: 24px; }
            [data-part='refund-label'] {
              display: inline-block;
              ${failing ? "width: 52px; white-space: normal;" : "white-space: nowrap;"}
            }
          </style>
        </head>
        <body>
          <span data-part="refund-label">Refund decision reason</span>
        </body>
      </html>`,
    visual_composition_manifest: protectedAtomManifest(
      implementationContract.visual_composition_policy,
    ),
  });
}

function noApplicableCandidate(implementationContract) {
  return baseImplementationCandidate(implementationContract, {
    rendered_html:
      "<main><p>A plain refund review document with no governed visual relationship.</p></main>",
  });
}

function nativeSelectCandidate(implementationContract) {
  return baseImplementationCandidate(implementationContract, {
    code: "SelectField({ label: 'Refund path', options: refundPaths })",
    primitives_used: [
      "FormField",
      "SelectField",
      "CheckboxGroup",
      "CheckboxOption",
      "ModalActions",
    ],
    rendered_html: `
      <main>
        <label for="refund-path">Refund path</label>
        <select id="refund-path">
          <option>Approve refund</option>
          <option>Send to policy review</option>
        </select>
      </main>`,
  });
}

function fieldSelectCandidate(
  implementationContract,
  {
    valueStartInset = 16,
    indicatorSlotWidth = 48,
    indicatorInlineSize = 16,
    indicatorInlineEndInSlot = 16,
    direction = "ltr",
    value = "Send to policy review",
    valueWhiteSpace = "nowrap",
    valueOverflowX = "visible",
    valueTextOverflow = "clip",
  } = {},
) {
  const calibration = calibrationForSelectVariant(
    implementationContract.visual_composition_policy,
    "field_value_trailing_indicator_slot",
  );
  return baseImplementationCandidate(implementationContract, {
    code: "SelectField({ label: 'Refund path', options: refundPaths })",
    primitives_used: [
      "FormField",
      "SelectField",
      "CheckboxGroup",
      "CheckboxOption",
      "ModalActions",
    ],
    rendered_html: `<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font: 16px/20px Arial, sans-serif; }
            #refund-path {
              position: relative;
              width: 320px;
              height: 64px;
              direction: ${direction};
            }
            #refund-path [data-part='value'] {
              position: absolute;
              inset-inline: 0 48px;
              top: 22px;
              padding-inline-start: ${valueStartInset}px;
              white-space: ${valueWhiteSpace};
              overflow: ${valueOverflowX};
              text-overflow: ${valueTextOverflow};
            }
            #refund-path [data-part='indicator-slot'] {
              position: absolute;
              inset-block: 0;
              inset-inline-end: 0;
              width: ${indicatorSlotWidth}px;
            }
            #refund-path [data-part='indicator'] {
              position: absolute;
              inset-inline-end: ${indicatorInlineEndInSlot}px;
              top: calc(50% - ${indicatorInlineSize / 2}px);
              display: block;
              width: ${indicatorInlineSize}px;
              height: ${indicatorInlineSize}px;
            }
          </style>
        </head>
        <body>
          <div id="refund-path" role="combobox" aria-label="Refund path">
            <span data-part="value">${value}</span>
            <span data-part="indicator-slot" aria-hidden="true">
              <svg data-part="indicator" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg>
            </span>
          </div>
        </body>
      </html>`,
    visual_composition_manifest: {
      samples: [
        {
          sample_id: "refund-path-field",
          rule_id: "presentation_owner.select_indicator",
          calibration_ref: calibration.ref,
          component_family: calibration.component_family,
          composition_variant: calibration.composition_variant,
          selector: "#refund-path",
          presentation_owner: "design_system",
          value_selector: "[data-part='value']",
          indicator_slot_selector: "[data-part='indicator-slot']",
          indicator_selector: "[data-part='indicator']",
        },
      ],
    },
  });
}

function undeclaredFieldSelectIntentCandidate(implementationContract) {
  const calibration = calibrationForSelectVariant(
    implementationContract.visual_composition_policy,
    "field_value_trailing_indicator_slot",
  );
  const control = (id) => `
    <div id="${id}" class="intent-control" role="combobox" aria-label="Refund path">
      <span data-part="value">Send to policy review</span>
      <span data-part="indicator-slot" aria-hidden="true">
        <svg data-part="indicator" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" /></svg>
      </span>
    </div>`;
  const sample = (sampleId, selector, overrides = {}) => ({
    sample_id: sampleId,
    rule_id: "presentation_owner.select_indicator",
    component_family: calibration.component_family,
    selector,
    presentation_owner: "design_system",
    value_selector: "[data-part='value']",
    indicator_slot_selector: "[data-part='indicator-slot']",
    indicator_selector: "[data-part='indicator']",
    ...overrides,
  });
  return baseImplementationCandidate(implementationContract, {
    rendered_html: `<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font: 16px/20px Arial, sans-serif; }
            .intent-control { position: relative; width: 320px; height: 64px; }
            .intent-control [data-part='value'] {
              position: absolute;
              inset-inline-start: 16px;
              top: 22px;
            }
            .intent-control [data-part='indicator-slot'] {
              position: absolute;
              inset-block: 0;
              inset-inline-end: 0;
              width: 48px;
            }
            .intent-control [data-part='indicator'] {
              position: absolute;
              inset-inline-end: 16px;
              top: 24px;
              display: block;
              width: 16px;
              height: 16px;
            }
          </style>
        </head>
        <body>
          ${control("intent-ref")}
          ${control("intent-family")}
        </body>
      </html>`,
    visual_composition_manifest: {
      samples: [
        sample("intent-ref", "#intent-ref", {
          calibration_ref: calibration.ref,
        }),
        sample("intent-family", "#intent-family"),
      ],
    },
  });
}

function reviewCandidate(candidate, implementationContract, options = {}) {
  return reviewUiImplementationCandidate(candidate, {
    implementation_contract: implementationContract,
    ...options,
  });
}

async function reviewCandidateInBrowser(
  candidate,
  implementationContract,
  options = {},
) {
  return reviewUiImplementationCandidateWithBrowserRuntime(candidate, {
    implementation_contract: implementationContract,
    ...options,
  });
}

function assertRepair(review) {
  assert.equal(review.implementation_review_status, "failed");
  assert.equal(review.candidate_artifact_status, "not_an_artifact");
  assert.equal(review.next_agent_action, "repair_and_resubmit");
  assert.equal(review.repair_instructions.status, "repair_required");
  assert.ok(
    review.findings.some(
      (finding) =>
        finding.severity === "fail" && finding.check === "visual_composition",
    ),
  );
  assert.ok(
    review.repair_instructions.groups.visual_composition.some(
      (entry) => entry.check === "visual_composition",
    ),
  );
}

async function callerAuthoredBrowserReceipt(candidate, implementationContract) {
  const measured = await measureVisualCompositionInBrowser({
    candidate,
    implementationContract,
  });
  assert.ok(measured.manifest);
  assert.ok(measured.receipt);

  const claimedCandidate = {
    ...structuredClone(candidate),
    visual_composition_manifest: measured.manifest,
  };
  const binding = createVisualCompositionEvidenceBinding({
    candidate: claimedCandidate,
    implementation_contract: implementationContract,
    visual_composition_manifest: measured.manifest,
  });
  claimedCandidate.visual_composition_evidence = {
    ...measured.receipt,
    ...binding,
    documents: measured.receipt.documents.map((document) => ({
      ...document,
      candidate_sha256: binding.candidate_ref.sha256,
    })),
  };
  return claimedCandidate;
}

const defaultContractPacket = createUiImplementationContract({
  repo_name: "Refund Ops",
  target_stack: "vanilla JS",
});
const defaultContract = defaultContractPacket.implementation_contract;

// The reviewer derives value, slot, indicator, gap, and containment results
// from raw geometry; forged summaries cannot turn failing geometry into a pass.
{
  const calibration = calibrationForSelectVariant(
    defaultContract.visual_composition_policy,
    "field_value_trailing_indicator_slot",
  );
  const rule = defaultContract.visual_composition_policy.rules.find(
    (candidateRule) =>
      candidateRule.id === "presentation_owner.select_indicator",
  );
  assert.ok(rule);
  const passingEvidence = {
    direction: "ltr",
    container_rect: { left: 0, right: 320 },
    value_part_rect: { left: 0, right: 272 },
    value_text_rect: { left: 16, right: 160 },
    indicator_slot_rect: { left: 272, right: 320 },
    indicator_rect: { left: 288, right: 304 },
    value_white_space: "nowrap",
    value_overflow_x: "visible",
    value_text_overflow: "clip",
    value_start_inset_css_px: 16,
    indicator_slot_width_css_px: 48,
    indicator_slot_end_inset_css_px: 0,
    indicator_inline_size_css_px: 16,
    indicator_end_inset_css_px: 16,
    value_indicator_gap_css_px: 16,
    value_slot_gap_css_px: 0,
    expected_value_start_inset_css_px: 16,
    expected_indicator_slot_width_css_px: 48,
    expected_indicator_inline_size_css_px: 16,
    minimum_value_indicator_gap_css_px: 16,
    geometry_delta_limit_css_px: 2,
    indicator_slot_center_delta_limit_css_px: 1,
    value_start_delta_css_px: 0,
    indicator_slot_width_delta_css_px: 0,
    indicator_inline_size_delta_css_px: 0,
    indicator_slot_center_delta_css_px: 0,
    raw_value_text_overflows_part: false,
    value_overflow_governed: false,
    value_part_contained_inline: true,
    indicator_slot_contained_inline: true,
    indicator_contained_in_slot: true,
    value_does_not_overlap_slot: true,
    logical_geometry_nonnegative: true,
  };
  assert.deepEqual(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: passingEvidence,
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    { actual: "pass", code: rule.id },
  );

  const failingEvidence = {
    ...passingEvidence,
    indicator_rect: { left: 298, right: 314 },
    indicator_end_inset_css_px: 6,
    value_indicator_gap_css_px: 26,
    indicator_slot_center_delta_css_px: 10,
  };
  assert.deepEqual(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: failingEvidence,
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    { actual: "fail", code: rule.failure_code },
  );
  assert.equal(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: {
        ...failingEvidence,
        indicator_slot_center_delta_css_px: 0,
      },
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    null,
    "A forged slot-centering summary must be rejected.",
  );
  assert.equal(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: {
        ...passingEvidence,
        indicator_rect: { left: 298, right: 314 },
        indicator_end_inset_css_px: 16,
      },
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    null,
    "A claimed 16px indicator inset must be rejected when the raw rect proves 6px.",
  );
  const overlappingEvidence = {
    ...passingEvidence,
    value_part_rect: { left: 0, right: 280 },
    value_text_rect: { left: 16, right: 280 },
    value_indicator_gap_css_px: 8,
    value_slot_gap_css_px: -8,
    value_does_not_overlap_slot: true,
  };
  assert.equal(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: overlappingEvidence,
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    null,
    "A forged value-versus-slot non-overlap summary must be rejected.",
  );

  const constrainedLongValueEvidence = {
    ...passingEvidence,
    value_text_rect: { left: 16, right: 520 },
    value_white_space: "nowrap",
    value_overflow_x: "hidden",
    value_text_overflow: "ellipsis",
    raw_value_text_overflows_part: true,
    value_overflow_governed: true,
  };
  assert.deepEqual(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: constrainedLongValueEvidence,
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    { actual: "pass", code: rule.id },
    "Raw long text may extend beyond its bounded value part when computed styles prove clipping and ellipsis.",
  );

  const visibleLongValueEvidence = {
    ...constrainedLongValueEvidence,
    value_overflow_x: "visible",
    value_overflow_governed: false,
  };
  assert.deepEqual(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: visibleLongValueEvidence,
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    { actual: "fail", code: rule.failure_code },
    "The same raw long text must fail when computed overflow remains visible.",
  );
  assert.equal(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: {
        ...constrainedLongValueEvidence,
        raw_value_text_overflows_part: false,
      },
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    null,
    "A forged non-overflow claim must not override the raw value-part and text rectangles.",
  );
  assert.equal(
    deriveFieldValueTrailingIndicatorSlotObservation({
      evidence: {
        ...visibleLongValueEvidence,
        value_overflow_governed: true,
      },
      calibration,
      ruleId: rule.id,
      failureCode: rule.failure_code,
    }),
    null,
    "A forged clipping claim must not override visible computed overflow.",
  );
}
const defaultPolicy = defaultContract.visual_composition_policy;

// The default adapter policy must survive every public generation handoff layer.
{
  assert.equal(defaultPolicy.kind, "visual_composition_policy");
  assert.equal(defaultPolicy.id, DEFAULT_POLICY_ID);
  assert.equal(defaultPolicy.version, "1.1.0");
  assert.equal(defaultPolicy.layer, "implementation_adapter");
  assert.equal(defaultPolicy.enforcement, "required_when_applicable");
  assert.equal(defaultPolicy.receipt_contract.kind, "visual_composition_evidence");
  const { sha256: policySha256, ...policyWithoutDigest } = defaultPolicy;
  assert.equal(policySha256, sha256CanonicalValue(policyWithoutDigest));

  const implementationGate = defaultContractPacket.generation_gates.find(
    (gate) => gate.id === "implementation_gate",
  );
  assert.ok(implementationGate.checks.includes("visual composition evidence"));

  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_REVIEW_BRIEF,
    refundWorkflowCandidate(),
  );
  const handoff = createUiGenerationHandoff(workflowReview, {
    implementation_contract: defaultContract,
  });
  assert.deepEqual(
    handoff.implementation_contract.visual_composition_policy,
    defaultPolicy,
  );

  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
  });
  assert.deepEqual(
    frontendContext.implementation_contract.visual_composition_policy,
    defaultPolicy,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.implementation_contract
      .visual_composition_policy,
    defaultPolicy,
  );
  assert.deepEqual(
    frontendContext.implementation_guidance.evidence_field_mapping
      .visual_composition_evidence,
    {
      field: "visual_composition_evidence",
      alias: "browser_qa.visual_composition",
      reviewed_by: "checks.visual_composition",
      source_path: "implementation_contract.visual_composition_policy",
      policy_ref: {
        id: defaultPolicy.id,
        version: defaultPolicy.version,
        sha256: defaultPolicy.sha256,
      },
      accepts:
        "Candidate-scoped rendered DOM geometry for declared relationships plus deterministic runtime discovery of governed icon-text pairs and select-like controls.",
      not_for:
        "A harness conformance receipt with seeded failing fixtures is not candidate acceptance evidence. The reviewer derives status from every sample and never trusts a top-level success claim.",
    },
  );
}

// The synchronous reviewer treats even a structurally valid browser receipt as
// an untrusted caller claim. Only the browser-review API owns attestation.
{
  const claimedCandidate = await callerAuthoredBrowserReceipt(
    protectedAtomCandidate(defaultContract),
    defaultContract,
  );
  const review = reviewCandidate(claimedCandidate, defaultContract);

  assert.equal(review.checks.visual_composition.status, "fail");
  assert.equal(
    review.checks.visual_composition.reason,
    "untrusted_visual_composition_evidence",
  );
  assert.equal(review.checks.visual_composition.trusted_evidence_present, false);
  assertRepair(review);

  const copiedClaim = structuredClone(claimedCandidate);
  const replayedClaim = structuredClone(claimedCandidate);
  replayedClaim.code += "\nrenderUnreceiptedCompositionChange();";
  const malformedClaim = structuredClone(claimedCandidate);
  malformedClaim.visual_composition_evidence.kind = "visual_composition_proof";

  for (const [label, candidate] of [
    ["serialized", copiedClaim],
    ["replayed", replayedClaim],
    ["malformed", malformedClaim],
  ]) {
    const rejected = reviewCandidate(candidate, defaultContract);
    assert.equal(rejected.checks.visual_composition.status, "fail", label);
    assert.equal(
      rejected.checks.visual_composition.reason,
      "untrusted_visual_composition_evidence",
      label,
    );
    assertRepair(rejected);
  }
}

// Review input cannot loosen or disable the governing JudgmentKit-default
// calibration policy. Custom policy authority belongs to an external adapter.
{
  const loosenedContract = structuredClone(defaultContract);
  loosenedContract.visual_composition_policy.calibrations[
    "judgmentkit.inline_pair.box_center"
  ].max_box_center_delta_css_px = 10_000;
  loosenedContract.visual_composition_policy.calibrations[
    "judgmentkit.select_indicator.centered_label_symmetric_rails"
  ].max_label_center_delta_css_px = 10_000;
  delete loosenedContract.visual_composition_policy.sha256;

  await assert.rejects(
    () =>
      reviewCandidateInBrowser(
        noApplicableCandidate(loosenedContract),
        loosenedContract,
      ),
    (error) =>
      error?.code === "noncanonical_default_visual_composition_policy",
  );

  const disabledContract = structuredClone(defaultContract);
  disabledContract.visual_composition_policy = false;
  await assert.rejects(
    () =>
      reviewCandidateInBrowser(
        noApplicableCandidate(disabledContract),
        disabledContract,
      ),
    (error) =>
      error?.code === "noncanonical_default_visual_composition_policy",
  );
}

// The browser-owned path accepts a rendered, conforming protected atom.
{
  const review = await reviewCandidateInBrowser(
    protectedAtomCandidate(defaultContract),
    defaultContract,
  );

  assert.equal(review.checks.visual_composition.status, "pass");
  assert.equal(review.checks.visual_composition.trusted_evidence_present, true);
  assert.equal(review.checks.visual_composition.derived_outcome, "pass");
  assert.equal(review.implementation_review_status, "passed");
  assert.equal(review.candidate_artifact_status, "accepted_artifact");
  assert.equal(review.next_agent_action, "accept");
}

// Trusted inspection can establish that no governed relationship is present.
{
  const review = await reviewCandidateInBrowser(
    noApplicableCandidate(defaultContract),
    defaultContract,
  );

  assert.equal(review.checks.visual_composition.status, "not_applicable");
  assert.equal(review.checks.visual_composition.trusted_evidence_present, true);
  assert.equal(
    review.checks.visual_composition.derived_outcome,
    "not_applicable",
  );
  assert.equal(review.implementation_review_status, "passed");
}

// Browser-measured protected-atom fragmentation enters the repair loop.
{
  const review = await reviewCandidateInBrowser(
    protectedAtomCandidate(defaultContract, { failing: true }),
    defaultContract,
  );

  assert.equal(review.checks.visual_composition.status, "fail");
  assert.equal(review.checks.visual_composition.trusted_evidence_present, true);
  assert.equal(review.checks.visual_composition.derived_outcome, "fail");
  assert.deepEqual(review.checks.visual_composition.invalid_reasons, []);
  assertRepair(review);
}

// The reviewer independently recomputes field-select value/slot/indicator
// geometry from the trusted browser receipt instead of accepting a caller claim.
{
  const governed = await reviewCandidateInBrowser(
    fieldSelectCandidate(defaultContract),
    defaultContract,
  );
  assert.equal(governed.checks.visual_composition.status, "pass");
  assert.deepEqual(governed.checks.visual_composition.invalid_reasons, []);

  const ungovernedCandidate = fieldSelectCandidate(defaultContract, {
    valueStartInset: 28,
    indicatorInlineEndInSlot: 6,
  });
  ungovernedCandidate.visual_composition_evidence = {
    kind: "visual_composition_evidence",
    outcome: "pass",
    samples: [
      {
        rule_id: "presentation_owner.select_indicator",
        actual: "pass",
        code: "presentation_owner.select_indicator",
        evidence: { indicator_slot_center_delta_css_px: 0 },
      },
    ],
  };
  const ungoverned = await reviewCandidateInBrowser(
    ungovernedCandidate,
    defaultContract,
  );
  assert.equal(ungoverned.checks.visual_composition.status, "fail");
  assert.equal(ungoverned.checks.visual_composition.derived_outcome, "fail");
  assert.deepEqual(ungoverned.checks.visual_composition.invalid_reasons, []);
  const blockingSamples = ungoverned.checks.visual_composition.findings.flatMap(
    (finding) => finding.evidence?.blocking_samples ?? [],
  );
  assert.equal(blockingSamples.length, 2);
  assert.ok(
    blockingSamples.every(
      (sample) =>
        sample.code === "owned_select_composition_mismatch" &&
        sample.evidence.value_start_inset_css_px === 28 &&
        sample.evidence.indicator_slot_width_css_px === 48 &&
        sample.evidence.indicator_inline_size_css_px === 16 &&
        sample.evidence.indicator_end_inset_css_px === 6 &&
        sample.evidence.indicator_slot_center_delta_css_px === 10,
    ),
  );
  assertRepair(ungoverned);
}

// Caller-authored clipping claims cannot make a visibly overflowing long value
// pass. The browser reviewer replaces them with raw LTR/RTL geometry and
// computed-style evidence from the rendered value part.
{
  const longValues = [
    {
      direction: "ltr",
      value:
        "A very long refund path name that visibly runs through the trailing indicator slot",
    },
    {
      direction: "rtl",
      value:
        "هذا مسار استرداد طويل للغاية ويظهر فوق منطقة مؤشر القائمة",
    },
  ];

  for (const fixture of longValues) {
    const candidate = fieldSelectCandidate(defaultContract, {
      ...fixture,
      valueOverflowX: "visible",
      valueTextOverflow: "ellipsis",
    });
    candidate.visual_composition_evidence = {
      kind: "visual_composition_evidence",
      outcome: "pass",
      samples: [
        {
          rule_id: "presentation_owner.select_indicator",
          actual: "pass",
          code: "presentation_owner.select_indicator",
          evidence: {
            value_overflow_x: "hidden",
            value_text_overflow: "ellipsis",
            raw_value_text_overflows_part: false,
            value_overflow_governed: true,
          },
        },
      ],
    };

    const review = await reviewCandidateInBrowser(candidate, defaultContract);
    assert.equal(review.checks.visual_composition.status, "fail", fixture.direction);
    assert.equal(
      review.checks.visual_composition.derived_outcome,
      "fail",
      fixture.direction,
    );
    assert.deepEqual(
      review.checks.visual_composition.invalid_reasons,
      [],
      fixture.direction,
    );
    const blockingSamples = review.checks.visual_composition.findings.flatMap(
      (finding) => finding.evidence?.blocking_samples ?? [],
    );
    assert.equal(blockingSamples.length, 2, fixture.direction);
    assert.ok(
      blockingSamples.every(
        (sample) =>
          sample.code === "owned_select_composition_mismatch" &&
          sample.evidence.direction === fixture.direction &&
          sample.evidence.value_start_inset_css_px === 16 &&
          sample.evidence.indicator_slot_width_css_px === 48 &&
          sample.evidence.indicator_inline_size_css_px === 16 &&
          sample.evidence.value_white_space === "nowrap" &&
          sample.evidence.value_overflow_x === "visible" &&
          sample.evidence.value_text_overflow === "ellipsis" &&
          sample.evidence.raw_value_text_overflows_part === true &&
          sample.evidence.value_overflow_governed === false &&
          sample.evidence.value_part_contained_inline === true,
      ),
      fixture.direction,
    );
    assertRepair(review);
  }
}

// A calibration ref or component family cannot supply field-versus-compact
// intent. Both declarations remain trusted review outcomes until the manifest
// explicitly names composition_variant.
{
  const review = await reviewCandidateInBrowser(
    undeclaredFieldSelectIntentCandidate(defaultContract),
    defaultContract,
  );
  assert.equal(review.checks.visual_composition.status, "fail");
  assert.equal(review.checks.visual_composition.derived_outcome, "review");
  assert.deepEqual(review.checks.visual_composition.invalid_reasons, []);
  const blockingSamples = review.checks.visual_composition.findings.flatMap(
    (finding) => finding.evidence?.blocking_samples ?? [],
  );
  assert.equal(blockingSamples.length, 4);
  assert.ok(
    blockingSamples.every(
      (sample) =>
        sample.actual === "review" &&
        sample.code === "calibration_missing" &&
        sample.calibration_ref ===
          "judgmentkit.select_indicator.field_value_trailing_indicator_slot" &&
        sample.evidence.classification ===
          "owned_select_composition_intent_undeclared",
    ),
  );
  assertRepair(review);
}

// A browser-owned native-select indicator stays a visual-composition warning,
// not a forged hard gate. Raw rendered form markup is reviewed separately.
{
  const review = await reviewCandidateInBrowser(
    nativeSelectCandidate(defaultContract),
    defaultContract,
  );

  assert.equal(review.checks.visual_composition.status, "pass_with_warning");
  assert.equal(review.checks.visual_composition.trusted_evidence_present, true);
  assert.deepEqual(
    [
      ...new Set(
        review.checks.visual_composition.warnings.map((warning) => warning.code),
      ),
    ],
    ["browser_owned_indicator_unmeasured"],
  );
  assert.equal(
    review.findings.some(
      (finding) =>
        finding.severity === "fail" && finding.check === "visual_composition",
    ),
    false,
  );
}

// An active policy still fails closed when there is no renderable browser input.
{
  await assert.rejects(
    () =>
      reviewCandidateInBrowser(
        baseImplementationCandidate(defaultContract),
        defaultContract,
      ),
    (error) =>
      error?.code === "visual_composition_candidate_not_renderable" &&
      error?.details?.retryable === false,
  );

  const priorChromePath =
    process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
  const originalConsoleError = console.error;
  const runtimeDiagnostics = [];
  process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH =
    "/judgmentkit-test/missing-chrome";
  console.error = (...parts) => runtimeDiagnostics.push(parts.join(" "));
  try {
    await assert.rejects(
      () =>
        reviewCandidateInBrowser(
          noApplicableCandidate(defaultContract),
          defaultContract,
        ),
      (error) =>
        error?.code === "visual_composition_browser_runtime_unavailable" &&
        error?.details?.retryable === true &&
        !String(error?.message).includes("missing manifest"),
    );
  } finally {
    console.error = originalConsoleError;
    if (priorChromePath === undefined) {
      delete process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH;
    } else {
      process.env.JUDGMENTKIT_VISUAL_COMPOSITION_CHROME_PATH = priorChromePath;
    }
  }
  assert.equal(runtimeDiagnostics.length, 1);
  const runtimeDiagnostic = JSON.parse(runtimeDiagnostics[0]);
  assert.deepEqual(
    {
      level: runtimeDiagnostic.level,
      event: runtimeDiagnostic.event,
      code: runtimeDiagnostic.code,
      error_code: runtimeDiagnostic.error_code,
    },
    {
      level: "error",
      event: "visual_composition_browser_runtime_unavailable",
      code: "visual_composition_browser_runtime_unavailable",
      error_code: "configured_chrome_unavailable",
    },
  );
  assert.equal(runtimeDiagnostics[0].includes("rendered_html"), false);

  const missingManifest = reviewCandidate(
    baseImplementationCandidate(defaultContract),
    defaultContract,
  );
  assert.equal(missingManifest.checks.visual_composition.status, "fail");
  assert.equal(
    missingManifest.checks.visual_composition.reason,
    "missing_visual_composition_manifest",
  );
  assertRepair(missingManifest);

  const manifestWithoutEvidence = reviewCandidate(
    protectedAtomCandidate(defaultContract),
    defaultContract,
  );
  assert.equal(manifestWithoutEvidence.checks.visual_composition.status, "fail");
  assert.equal(
    manifestWithoutEvidence.checks.visual_composition.reason,
    "missing_visual_composition_evidence",
  );
  assertRepair(manifestWithoutEvidence);
}

// External design systems get no JudgmentKit visual-composition fallback.
{
  const noPolicyContract = createUiImplementationContract({
    design_system_adapter: completeMaterialDesignSystemAdapter(),
  }).implementation_contract;
  const review = reviewCandidate(
    materialImplementationCandidate(noPolicyContract),
    noPolicyContract,
  );

  assert.equal(noPolicyContract.visual_composition_policy, undefined);
  assert.equal(review.checks.visual_composition.status, "not_applicable");
  assert.equal(
    review.checks.visual_composition.reason,
    "no_active_visual_composition_policy",
  );
  assert.equal(review.implementation_review_status, "passed");
  assert.equal(JSON.stringify(noPolicyContract).includes(DEFAULT_POLICY_ID), false);
}

// An external adapter's declared policy is enforced through the same browser boundary.
{
  const { sha256: _defaultDigest, ...externalPolicy } = structuredClone(defaultPolicy);
  externalPolicy.id = EXTERNAL_POLICY_ID;
  externalPolicy.authority.presentation_owner = "Material UI";

  const externalContract = createUiImplementationContract({
    design_system_adapter: completeMaterialDesignSystemAdapter(externalPolicy),
  }).implementation_contract;
  const candidate = materialImplementationCandidate(externalContract, {
    rendered_html: `
      <main>
        <span data-part="refund-label" style="display:inline-block;white-space:nowrap">
          Refund decision reason
        </span>
      </main>`,
    visual_composition_manifest: protectedAtomManifest(
      externalContract.visual_composition_policy,
    ),
  });
  const review = await reviewCandidateInBrowser(candidate, externalContract);

  assert.equal(externalContract.visual_composition_policy.id, EXTERNAL_POLICY_ID);
  assert.equal(JSON.stringify(externalContract).includes(DEFAULT_POLICY_ID), false);
  assert.equal(review.checks.visual_composition.status, "pass");
  assert.equal(review.checks.visual_composition.trusted_evidence_present, true);
  assert.equal(review.implementation_review_status, "passed");
  assert.equal(review.next_agent_action, "accept");
}

process.stdout.write("Visual composition integration tests passed.\n");
