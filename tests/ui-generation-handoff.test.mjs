import assert from "node:assert/strict";

import {
  JudgmentKitInputError,
  createUiImplementationContract,
  createUiGenerationHandoff,
  reviewUiImplementationCandidate,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const FORBIDDEN_HANDOFF_KEYS = new Set([
  "component",
  "components",
  "design_system",
  "layout",
  "layout_polish",
  "style",
  "styles",
  "styling",
  "token",
  "tokens",
  "visual",
  "visual_direction",
]);

const REFUND_TRIAGE_BRIEF = `
  A support lead is reviewing refund requests during the daily triage workflow.
  The activity is deciding whether a case should be approved, sent to policy review,
  or returned to the agent for missing evidence. The outcome is a clear handoff
  with the next action and the reason for the decision.
`;

const DIAGNOSTIC_AUDIT_BRIEF = `
  A support operations manager is auditing an integration setup workflow.
  The activity is deciding whether a JSON schema change and prompt template update are safe to ship,
  then producing a handoff with the next action for the platform team.
`;

const implementationContractPacket = createUiImplementationContract({
  repo_name: "Refund Ops",
  target_stack: "vanilla JS",
});
const implementationContract = implementationContractPacket.implementation_contract;

function completeMaterialDesignSystemAdapter() {
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
        style_system: "Material Symbols-compatible outline icons",
        style_attributes: {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
        },
        mcp_tools: [],
        default_include_svg: false,
      },
    },
    components: ["Stack", "Button", "Alert"],
  };
}

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
          "Customer refund context",
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
        relationship_to_workflow: "Keeps refund evidence and decision controls together.",
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

function integrationAuditWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Integration change audit",
      topology: "workspace",
      work_units: ["Review change summary", "Check release risk", "Prepare platform handoff"],
      primary_actions: ["Mark safe to ship", "Send to platform review", "Return for evidence"],
      decision_points: [
        "Decide whether the integration change is safe to ship or needs platform review.",
      ],
      completion_state: "Platform team receives a clear handoff with the next action.",
    },
    surface_set: [
      {
        name: "Integration change audit",
        purpose: "Review change summary, release risk, and platform handoff.",
        sections: ["Change summary", "Release risk", "Platform handoff"],
        controls: ["Mark safe to ship", "Send to platform review", "Return for evidence"],
        relationship_to_workflow: "Keeps setup audit evidence near the release decision.",
      },
    ],
    handoff: {
      next_owner: "platform team",
      reason: "Release risk has been reviewed.",
      next_action: "Send platform handoff with the release decision.",
    },
    diagnostics: {
      implementation_terms: ["JSON schema", "prompt template"],
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function leakyWorkflowCandidate() {
  const candidate = refundWorkflowCandidate();

  candidate.workflow.surface_name = "ready_for_review JSON schema console";
  candidate.workflow.primary_actions = ["Save CRUD update", "Send to policy review"];
  candidate.surface_set[0].sections = ["Activity", "Prompt template"];

  return candidate;
}

function assertNoForbiddenHandoffKeys(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(
      FORBIDDEN_HANDOFF_KEYS.has(key),
      false,
      `handoff introduced forbidden field key: ${key}`,
    );
    assertNoForbiddenHandoffKeys(child);
  }
}

function primaryHandoffText(handoff) {
  return JSON.stringify({
    activity_model: handoff.activity_model,
    interaction_contract: handoff.interaction_contract,
    workflow: handoff.workflow,
    surface_set: handoff.surface_set,
    handoff: handoff.handoff,
  }).toLowerCase();
}

function modalImplementationCandidate(modalAction) {
  return {
    code: "renderModalActions({ primaryAction, secondaryActions })",
    primitives_used: ["FormField", "ModalActions"],
    states_covered: implementationContract.state_coverage.required_states,
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport modal footer order checked",
      mobile: "mobile viewport modal footer order checked",
    },
    accessibility_evidence: modalAccessibilityEvidence(),
    modal_actions: [modalAction],
  };
}

function coreAccessibilityEvidence(overrides = {}) {
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
      notes: "Browser-rendered focus indicators are visible for interactive controls.",
    },
    responsive_no_overflow: {
      status: "pass",
      method: "desktop and mobile browser review",
      notes: "Text reflows without overflow at desktop and mobile sizes.",
    },
    ...overrides,
  };
}

function formAccessibilityEvidence(overrides = {}) {
  return {
    ...coreAccessibilityEvidence(),
    non_text_contrast: {
      status: "pass",
      method: "computed style contrast check",
      samples: [{ target: "checkbox boundary", contrast_ratio: 3.4 }],
    },
    form_labels_instructions: {
      status: "pass",
      method: "DOM inspection",
      notes: "Inputs have visible labels and programmatic associations.",
    },
    form_errors: {
      status: "pass",
      method: "validation state review",
      notes: "Invalid fields are identified with text and programmatic error state.",
    },
    status_messages: {
      status: "pass",
      method: "live region inspection",
      notes: "Save, error, and progress messages are programmatically determinable.",
    },
    ...overrides,
  };
}

function modalAccessibilityEvidence(overrides = {}) {
  return {
    ...formAccessibilityEvidence(),
    focus_not_obscured: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "Focused controls remain visible when the modal is open.",
    },
    no_keyboard_trap: {
      status: "pass",
      method: "browser keyboard walkthrough",
      notes: "Focus cycles inside the modal and Escape or cancel exits.",
    },
    ...overrides,
  };
}

function visualAccessibilityEvidence(overrides = {}) {
  return {
    ...coreAccessibilityEvidence(),
    visual_background_contrast: {
      status: "pass",
      browser_rendered: true,
      method: "Playwright pixel sampling",
      samples: [
        {
          target: "Hero headline over generated visual",
          text_size: "large",
          contrast_ratio: 4.2,
        },
        {
          target: "Hero supporting copy over gradient",
          text_size: "normal",
          contrast_ratio: 5.1,
        },
      ],
    },
    non_text_contrast: {
      status: "pass",
      method: "computed contrast check",
      samples: [{ target: "visual indicator against gradient", contrast_ratio: 3.3 }],
    },
    forced_colors: {
      status: "pass",
      method: "forced-colors emulation",
      notes: "Text, focus, and controls remain visible in forced-colors mode.",
    },
    semantic_fallbacks: {
      status: "pass",
      method: "DOM inspection",
      notes: "Generated image has alt text and canvas fallback content.",
    },
    ...overrides,
  };
}

function visualHeavyStaticCandidate(overrides = {}) {
  const baseAccessibilityEvidence = visualAccessibilityEvidence();

  return {
    code: "renderLandingHero({ backgroundImage: imagegenAsset, overlayGradient, headline })",
    visual_heavy: true,
    visual_backgrounds: ["imagegen hero image", "gradient overlay"],
    primitives_used: [],
    states_covered: implementationContract.state_coverage.required_states,
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport screenshot checked",
      mobile: "mobile viewport screenshot checked",
    },
    accessibility_evidence: baseAccessibilityEvidence,
    ...overrides,
    accessibility_evidence: {
      ...baseAccessibilityEvidence,
      ...(overrides.accessibility_evidence ?? {}),
    },
  };
}

function refundOperatorImplementationCandidate(overrides = {}) {
  return {
    code: "renderRefundReviewWorkbench({ queue, evidence, decisionBar })",
    primitives_used: ["FormField", "CheckboxGroup", "CheckboxOption", "ModalActions"],
    states_covered: implementationContract.state_coverage.required_states,
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport refund review checked",
      mobile: "mobile viewport refund review checked",
    },
    accessibility_evidence: modalAccessibilityEvidence(),
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
    ...overrides,
    accessibility_evidence: {
      ...modalAccessibilityEvidence(),
      ...(overrides.accessibility_evidence ?? {}),
    },
  };
}

{
  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    refundWorkflowCandidate(),
  );
  const handoff = createUiGenerationHandoff(workflowReview, {
    implementation_contract: implementationContract,
  });

  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.equal(handoff.contract_id, workflowReview.contract_id);
  assert.equal(handoff.source.mode, "model_assisted");
  assert.ok(handoff.activity_model.activity.includes("refund requests"));
  assert.ok(handoff.activity_model.participants.includes("support lead"));
  assert.ok(handoff.interaction_contract.primary_decision.includes("case should be approved"));
  assert.equal(handoff.workflow.surface_name, "Refund escalation queue");
  assert.ok(handoff.workflow.primary_actions.includes("Approve refund"));
  assert.equal("primary_surface" in handoff, false);
  assert.ok(handoff.surface_set[0].sections.includes("Evidence checklist"));
  assert.equal(handoff.handoff.next_owner, "support agent");
  assert.equal(handoff.disclosure_reminders.product_ui_rule.includes("implementation"), true);
  assert.deepEqual(
    handoff.generation_gates.map((gate) => gate.id),
    ["activity_gate", "implementation_gate"],
  );
  assert.ok(handoff.implementation_contract.approved_primitives.includes("CheckboxGroup"));
  assert.equal(
    handoff.implementation_contract.design_system_source.mode,
    "judgmentkit_default",
  );
  assertNoForbiddenHandoffKeys(handoff);

  const defaultHandoff = createUiGenerationHandoff(workflowReview);
  assert.equal(
    defaultHandoff.implementation_contract.design_system_source.mode,
    "judgmentkit_default",
    "Omitting implementation_contract should keep the JudgmentKit default design system working.",
  );

  assert.throws(
    () =>
      createUiGenerationHandoff(workflowReview, {
        implementation_contract: {
          design_system_source: {},
        },
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_design_system_source",
    "Explicit malformed design_system_source must fail before handoff creation.",
  );
}

{
  const rawControlReview = reviewUiImplementationCandidate(
    {
      code: '<fieldset><input type="checkbox"> Approve</fieldset>',
      primitives_used: ["CheckboxGroup"],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop screenshot checked",
        mobile: "mobile screenshot checked",
      },
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(rawControlReview.implementation_review_status, "failed");
  assert.equal(rawControlReview.checks.raw_controls.status, "fail");
  assert.ok(rawControlReview.checks.raw_controls.detected.includes("checkbox"));

  const approvedReview = reviewUiImplementationCandidate(
    {
      code: "renderCheckboxGroup({ options, legend: 'Lane responsibility' })",
      primitives_used: ["FormField", "CheckboxGroup", "CheckboxOption"],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check", "node scripts/check-ui-contract.mjs"],
      browser_qa: {
        desktop: "desktop viewport screenshot checked",
        mobile: "mobile viewport screenshot checked",
      },
      accessibility_evidence: formAccessibilityEvidence(),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(approvedReview.implementation_review_status, "passed");
  assert.equal(approvedReview.checks.approved_primitives.status, "pass");
  assert.equal(approvedReview.next_agent_action, "accept");
  assert.equal(approvedReview.autofix_loop.status, "passed");
  assert.deepEqual(approvedReview.findings, []);

  const refundOperatorReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate(),
    { implementation_contract: implementationContract },
  );

  assert.equal(refundOperatorReview.implementation_review_status, "passed");
  assert.equal(refundOperatorReview.checks.action_boundaries.status, "pass");
  assert.equal(refundOperatorReview.checks.action_boundaries.reviewed, true);
  assert.equal(refundOperatorReview.checks.data_visibility.status, "pass");
  assert.equal(refundOperatorReview.checks.data_visibility.reviewed, true);
  assert.equal(refundOperatorReview.checks.visual_tokens.status, "pass");
  assert.equal(refundOperatorReview.checks.visual_tokens.reviewed, false);
  assert.equal(refundOperatorReview.next_agent_action, "accept");

  const tokenMetadataReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      visual_token_evidence: {
        token_families: ["color", "type", "spacing", "motion"],
        semantic_roles: ["focus", "status", "decision"],
        evidence_expectations: [
          "color and focus roles map to decision controls and handoff receipt",
        ],
      },
      accessibility_evidence: {
        forced_colors: {
          status: "pass",
          method: "forced-colors emulation",
          notes: "Tokenized color roles preserve text, status, and focus visibility.",
        },
        reduced_motion: {
          status: "pass",
          method: "prefers-reduced-motion review",
          notes: "Motion tokens are disabled or reduced when the user requests reduced motion.",
        },
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(tokenMetadataReview.implementation_review_status, "passed");
  assert.equal(tokenMetadataReview.checks.visual_tokens.status, "pass");
  assert.equal(tokenMetadataReview.checks.visual_tokens.reviewed, true);
  assert.deepEqual(tokenMetadataReview.checks.visual_tokens.unsupported_families, []);
  assert.ok(
    tokenMetadataReview.checks.visual_tokens.allowed_font_roles.includes("body"),
    "visual token checks should expose portable font role defaults.",
  );
  assert.ok(
    tokenMetadataReview.checks.visual_tokens.icon_catalog.icon_count > 1000,
    "visual token checks should expose the Lucide icon catalog summary.",
  );

  const componentPatternReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      component_contract_evidence: {
        components: [
          {
            id: "action_button",
            states_covered: ["ready", "disabled", "focus-visible", "loading"],
          },
          {
            id: "dialog",
            states_covered: ["ready", "loading", "error", "focus-visible"],
          },
        ],
      },
      pattern_contract_evidence: {
        pattern_id: "operator_review",
        surface_type: "operator_review",
        regions_present: ["produced work", "evidence", "risk", "decision", "receipt"],
        controls_present: [
          "approve or accept",
          "return or request changes",
          "handoff action",
        ],
        completion_or_handoff: "Review produces a decision reason and receipt.",
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(componentPatternReview.implementation_review_status, "passed");
  assert.equal(componentPatternReview.checks.component_contracts.status, "pass");
  assert.equal(componentPatternReview.checks.component_contracts.reviewed, true);
  assert.equal(componentPatternReview.checks.pattern_contracts.status, "pass");
  assert.equal(componentPatternReview.checks.pattern_contracts.reviewed, true);
  assert.ok(
    componentPatternReview.checks.component_contracts.allowed_component_ids.includes(
      "action_button",
    ),
  );
  assert.ok(
    componentPatternReview.checks.pattern_contracts.allowed_pattern_ids.includes(
      "operator_review",
    ),
  );

  const unknownComponentReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      component_contract_evidence: {
        components_used: ["mystery_panel"],
        states_by_component: {
          mystery_panel: ["ready"],
        },
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(unknownComponentReview.implementation_review_status, "failed");
  assert.equal(unknownComponentReview.checks.component_contracts.status, "fail");
  assert.deepEqual(
    unknownComponentReview.checks.component_contracts.unsupported_component_ids,
    ["mystery_panel"],
  );
  assert.ok(
    unknownComponentReview.repair_instructions.groups.component_contracts.some(
      (instruction) => instruction.check === "component_contracts",
    ),
  );

  const missingComponentStateReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      component_contract_evidence: {
        components: [{ id: "action_button", states_covered: ["ready"] }],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(missingComponentStateReview.implementation_review_status, "failed");
  assert.equal(missingComponentStateReview.checks.component_contracts.status, "fail");
  assert.ok(
    missingComponentStateReview.checks.component_contracts.missing_state_evidence.some(
      (entry) =>
        entry.component_id === "action_button" &&
        entry.missing_states.includes("focus-visible"),
    ),
  );

  const componentEvidenceMisuseReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      component_contract_evidence: {
        components: [
          {
            id: "action_button",
            states_covered: ["ready", "disabled", "focus-visible", "loading"],
          },
        ],
        notes: "component contracts replace accessibility evidence for this pass",
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(componentEvidenceMisuseReview.implementation_review_status, "failed");
  assert.equal(componentEvidenceMisuseReview.checks.component_contracts.status, "fail");
  assert.ok(
    componentEvidenceMisuseReview.repair_instructions.groups.component_contracts.some(
      (instruction) => instruction.check === "component_contracts",
    ),
  );

  const patternMismatchReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      pattern_contract_evidence: {
        pattern_id: "workbench",
        surface_type: "dashboard_monitor",
        regions_present: [
          "work queue",
          "detail workspace",
          "evidence",
          "decision or handoff",
        ],
        controls_present: [
          "selection",
          "filter or sort",
          "decision action",
          "handoff action",
        ],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(patternMismatchReview.implementation_review_status, "failed");
  assert.equal(patternMismatchReview.checks.pattern_contracts.status, "fail");
  assert.equal(
    patternMismatchReview.checks.pattern_contracts.required_surface_type,
    "workbench",
  );

  const missingPatternEvidenceReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      pattern_contract_evidence: {
        pattern_id: "operator_review",
        surface_type: "operator_review",
        regions_present: ["produced work"],
        controls_present: ["approve or accept"],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(missingPatternEvidenceReview.implementation_review_status, "failed");
  assert.equal(missingPatternEvidenceReview.checks.pattern_contracts.status, "fail");
  assert.ok(
    missingPatternEvidenceReview.checks.pattern_contracts.missing_regions.includes(
      "receipt",
    ),
  );
  assert.ok(
    missingPatternEvidenceReview.checks.pattern_contracts.missing_controls.includes(
      "handoff action",
    ),
  );

  const componentCannotSatisfyAccessibilityReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      component_contract_evidence: {
        components: [
          {
            id: "action_button",
            states_covered: ["ready", "disabled", "focus-visible", "loading"],
          },
        ],
      },
      accessibility_evidence: {
        keyboard_navigation: undefined,
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(
    componentCannotSatisfyAccessibilityReview.implementation_review_status,
    "failed",
  );
  assert.equal(
    componentCannotSatisfyAccessibilityReview.checks.component_contracts.status,
    "pass",
  );
  assert.equal(
    componentCannotSatisfyAccessibilityReview.checks.accessibility_evidence
      .keyboard_navigation.status,
    "fail",
  );

  const fontIconMetadataReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      visual_token_evidence: {
        token_families: ["color", "type"],
        font_roles: ["body", "numeric", "diagnostic"],
        icon_roles: ["status", "action", "receipt"],
        selected_icons: [{ role: "status", id: "check" }],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(fontIconMetadataReview.implementation_review_status, "passed");
  assert.equal(fontIconMetadataReview.checks.visual_tokens.status, "pass");
  assert.deepEqual(fontIconMetadataReview.checks.visual_tokens.unsupported_font_roles, []);
  assert.deepEqual(fontIconMetadataReview.checks.visual_tokens.unsupported_icon_roles, []);
  assert.ok(fontIconMetadataReview.checks.visual_tokens.font_roles.includes("numeric"));
  assert.ok(fontIconMetadataReview.checks.visual_tokens.icon_roles.includes("receipt"));
  assert.ok(fontIconMetadataReview.checks.visual_tokens.selected_icon_ids.includes("check"));

  const defaultProvenanceFailureReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      code: `
        import { Check } from "lucide-react";
        export function Review() {
          return <section style={{ color: "var(--surfaceops-text)" }}><Check />Decision</section>;
        }
      `,
      visual_token_evidence: {
        token_families: ["color"],
        icon_roles: ["status"],
        selected_icons: [{ role: "status", id: "check" }],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(defaultProvenanceFailureReview.implementation_review_status, "failed");
  assert.equal(
    defaultProvenanceFailureReview.checks.design_system_provenance.status,
    "fail",
  );
  assert.ok(
    defaultProvenanceFailureReview.checks.design_system_provenance.findings.some(
      (finding) => finding.evidence.imports?.includes("lucide-react"),
    ),
  );
  assert.ok(
    defaultProvenanceFailureReview.checks.design_system_provenance.findings.some(
      (finding) =>
        finding.evidence.custom_properties?.includes("--surfaceops-text"),
    ),
  );

  const defaultProvenancePassReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      code: `
        export function Review() {
          return <section style={{ color: "var(--jk-color-text)" }}>Decision</section>;
        }
      `,
      visual_token_evidence: {
        token_families: ["color"],
        font_roles: ["body"],
        icon_roles: ["status"],
        selected_icons: [{ role: "status", id: "check" }],
      },
      design_system_provenance: {
        source: "judgmentkit_default",
        token_source:
          "package://judgmentkit/design-system/visual-token-adapter.json",
        icon_source: "get_icon_svg('check') from the JudgmentKit default catalog",
      },
      accessibility_evidence: {
        forced_colors: {
          status: "pass",
          method: "forced-colors emulation",
          notes: "JudgmentKit custom properties preserve visible text and focus.",
        },
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(defaultProvenancePassReview.implementation_review_status, "passed");
  assert.equal(
    defaultProvenancePassReview.checks.design_system_provenance.status,
    "pass",
  );
  assert.equal(
    defaultProvenancePassReview.checks.design_system_provenance.mode,
    "judgmentkit_default",
  );

  const materialImplementationContract = createUiImplementationContract({
    design_system_adapter: completeMaterialDesignSystemAdapter(),
  }).implementation_contract;
  const externalMaterialReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      code: `
        import { Stack, Button } from "@mui/material";
        import CheckCircle from "@mui/icons-material/CheckCircle";
        export function Review() {
          return <Stack sx={{ color: "var(--mui-palette-background-paper)" }}><Button startIcon={<CheckCircle />}>Send handoff</Button></Stack>;
        }
      `,
      visual_token_evidence: {
        token_families: ["color", "type"],
        font_roles: ["body"],
        icon_roles: ["status", "action"],
        selected_icons: [{ role: "status", id: "CheckCircle" }],
      },
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
      accessibility_evidence: {
        forced_colors: {
          status: "pass",
          method: "forced-colors emulation",
          notes: "Material UI theme variables preserve visible text and focus.",
        },
      },
    }),
    { implementation_contract: materialImplementationContract },
  );

  assert.equal(externalMaterialReview.implementation_review_status, "passed");
  assert.equal(
    externalMaterialReview.checks.design_system_provenance.mode,
    "external_design_system",
  );
  assert.equal(externalMaterialReview.checks.design_system_provenance.status, "pass");
  assert.deepEqual(externalMaterialReview.checks.visual_tokens.unsupported_icon_ids, []);

  const mixedExternalReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      code: `
        import { Stack } from "@mui/material";
        export function Review() {
          get_icon_svg("check");
          return <Stack sx={{ color: "var(--jk-color-surface)" }}>Decision</Stack>;
        }
      `,
      visual_token_evidence: {
        token_families: ["color"],
        font_roles: ["body"],
        icon_roles: ["status"],
        selected_icons: [{ role: "status", id: "CheckCircle" }],
      },
    }),
    { implementation_contract: materialImplementationContract },
  );

  assert.equal(mixedExternalReview.implementation_review_status, "failed");
  assert.equal(mixedExternalReview.checks.design_system_provenance.status, "fail");
  assert.ok(
    mixedExternalReview.findings.some(
      (finding) => finding.check === "design_system_provenance",
    ),
  );

  const unsupportedIconIdReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      visual_token_evidence: {
        token_families: ["color"],
        icon_roles: ["status"],
        selected_icons: [{ role: "status", id: "not-a-lucide-icon" }],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(unsupportedIconIdReview.implementation_review_status, "failed");
  assert.equal(unsupportedIconIdReview.checks.visual_tokens.status, "fail");
  assert.deepEqual(unsupportedIconIdReview.checks.visual_tokens.unsupported_icon_ids, [
    "not-a-lucide-icon",
  ]);

  const unsupportedFontIconReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      visual_token_evidence: {
        token_families: ["color"],
        font_roles: ["brand-display"],
        icon_roles: ["mascot"],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(unsupportedFontIconReview.implementation_review_status, "failed");
  assert.equal(unsupportedFontIconReview.checks.visual_tokens.status, "fail");
  assert.deepEqual(unsupportedFontIconReview.checks.visual_tokens.unsupported_font_roles, [
    "brand-display",
  ]);
  assert.deepEqual(unsupportedFontIconReview.checks.visual_tokens.unsupported_icon_roles, [
    "mascot",
  ]);

  const inaccessibleIconReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      code: "renderIconButton({ icon: 'filter', label: undefined })",
      visual_token_evidence: {
        token_families: ["color"],
        icon_roles: ["action"],
        icons: [{ role: "action", id: "filter" }],
      },
      accessibility_evidence: {
        name_role_value: undefined,
        non_text_contrast: undefined,
        target_size: undefined,
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(inaccessibleIconReview.implementation_review_status, "failed");
  assert.equal(inaccessibleIconReview.checks.visual_tokens.status, "pass");
  assert.equal(
    inaccessibleIconReview.checks.accessibility_evidence.name_role_value.status,
    "fail",
  );
  assert.equal(
    inaccessibleIconReview.checks.accessibility_evidence.non_text_contrast.status,
    "fail",
  );

  const tokenMisuseReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      visual_token_evidence: {
        token_families: ["color", "texture"],
        evidence_expectations: [
          "visual tokens replace accessibility and browser QA evidence",
          "component package is ready for this boundary slice",
        ],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(tokenMisuseReview.implementation_review_status, "failed");
  assert.equal(tokenMisuseReview.checks.visual_tokens.status, "fail");
  assert.ok(
    tokenMisuseReview.repair_instructions.groups.visual_tokens.some(
      (instruction) => instruction.check === "visual_tokens",
    ),
  );

  const tokenCannotSatisfyPrimitiveReview = reviewUiImplementationCandidate(
    {
      ...refundOperatorImplementationCandidate({
        primitives_used: ["ImaginaryTokenWorkbench"],
        visual_token_evidence: {
          token_families: ["color", "spacing"],
          semantic_roles: ["decision"],
        },
      }),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(tokenCannotSatisfyPrimitiveReview.implementation_review_status, "failed");
  assert.equal(tokenCannotSatisfyPrimitiveReview.checks.visual_tokens.status, "pass");
  assert.equal(tokenCannotSatisfyPrimitiveReview.checks.approved_primitives.status, "fail");
  assert.ok(
    tokenCannotSatisfyPrimitiveReview.repair_instructions.groups.primitive_defaults.some(
      (instruction) => instruction.check === "approved_primitives",
    ),
  );

  const riskyActionReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      actions: ["Auto approve refund", "Charge card"],
      action_boundary_evidence: {},
    }),
    {
      implementation_contract: implementationContract,
      iteration_context: { current_attempt: 2 },
    },
  );

  assert.equal(riskyActionReview.implementation_review_status, "failed");
  assert.equal(riskyActionReview.checks.action_boundaries.status, "fail");
  assert.equal(riskyActionReview.next_agent_action, "repair_and_resubmit");
  assert.equal(riskyActionReview.autofix_loop.current_attempt, 2);
  assert.equal(riskyActionReview.autofix_loop.max_attempts, 3);
  assert.ok(
    riskyActionReview.repair_instructions.groups.action_boundaries.some(
      (instruction) => instruction.check === "action_boundaries",
    ),
  );

  const stoppedActionReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      actions: ["Auto approve refund"],
      action_boundary_evidence: {},
    }),
    {
      implementation_contract: implementationContract,
      iteration_context: { current_attempt: 3 },
    },
  );

  assert.equal(stoppedActionReview.next_agent_action, "stop_for_human");
  assert.equal(stoppedActionReview.autofix_loop.status, "stopped");

  const dataLeakReview = reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      visible_text: ["Refund request", "JSON schema", "resource id"],
      data_visibility_evidence: {
        primary_data_roles: ["domain evidence"],
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(dataLeakReview.implementation_review_status, "failed");
  assert.equal(dataLeakReview.checks.data_visibility.status, "fail");
  assert.equal(dataLeakReview.next_agent_action, "repair_and_resubmit");
  assert.ok(
    dataLeakReview.repair_instructions.groups.data_visibility.some(
      (instruction) => instruction.required_change.includes("diagnostic-only terms"),
    ),
  );

  const coreEvidenceKeys = [
    "automated_checks",
    "semantic_content",
    "landmarks_headings",
    "name_role_value",
    "keyboard_navigation",
    "focus_order",
    "focus_visible",
    "responsive_no_overflow",
  ];

  for (const key of coreEvidenceKeys) {
    const accessibilityEvidence = formAccessibilityEvidence();
    accessibilityEvidence[key] = key === "automated_checks" ? null : undefined;
    const missingCoreReview = reviewUiImplementationCandidate(
      {
        code: "renderCheckboxGroup({ options, legend: 'Lane responsibility' })",
        primitives_used: ["FormField", "CheckboxGroup", "CheckboxOption"],
        states_covered: implementationContract.state_coverage.required_states,
        static_checks: ["npm run check"],
        browser_qa: {
          desktop: "desktop viewport screenshot checked",
          mobile: "mobile viewport screenshot checked",
        },
        accessibility_evidence: accessibilityEvidence,
      },
      { implementation_contract: implementationContract },
    );

    assert.equal(
      missingCoreReview.implementation_review_status,
      "failed",
      `${key} must be required core accessibility evidence.`,
    );
    assert.equal(missingCoreReview.checks.accessibility_evidence[key].status, "fail");
  }

  const notApplicableWithoutRationaleReview = reviewUiImplementationCandidate(
    {
      code: "renderCheckboxGroup({ options, legend: 'Lane responsibility' })",
      primitives_used: ["FormField", "CheckboxGroup", "CheckboxOption"],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop viewport screenshot checked",
        mobile: "mobile viewport screenshot checked",
      },
      accessibility_evidence: formAccessibilityEvidence({
        form_errors: { status: "not_applicable" },
      }),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(notApplicableWithoutRationaleReview.implementation_review_status, "failed");
  assert.equal(
    notApplicableWithoutRationaleReview.checks.accessibility_evidence.form_errors.status,
    "fail",
  );

  const visualHeavyReview = reviewUiImplementationCandidate(
    visualHeavyStaticCandidate({
      states_covered: undefined,
      static_checks: undefined,
      covered_states: implementationContract.state_coverage.required_states,
      static_evidence: ["npm run check"],
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(visualHeavyReview.implementation_review_status, "passed");
  assert.equal(visualHeavyReview.checks.state_coverage.status, "pass");
  assert.equal(visualHeavyReview.checks.static_enforcement.status, "pass");
  assert.equal(visualHeavyReview.checks.accessibility_evidence.status, "pass");
  assert.equal(
    visualHeavyReview.checks.accessibility_evidence.visual_background_contrast.status,
    "pass",
  );

  const missingContrastReview = reviewUiImplementationCandidate(
    visualHeavyStaticCandidate({
      accessibility_evidence: {
        visual_background_contrast: undefined,
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(missingContrastReview.implementation_review_status, "failed");
  assert.equal(
    missingContrastReview.checks.accessibility_evidence.visual_background_contrast.status,
    "fail",
  );
  assert.ok(
    missingContrastReview.findings.some(
      (finding) => finding.check === "accessibility_evidence.visual_background_contrast",
    ),
  );

  const contrastFailureReview = reviewUiImplementationCandidate(
    visualHeavyStaticCandidate({
      accessibility_evidence: {
        visual_background_contrast: {
          status: "fail",
          browser_rendered: true,
          samples: [
            {
              target: "Hero body copy over video",
              text_size: "normal",
              contrast_ratio: 2.6,
            },
          ],
        },
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(contrastFailureReview.implementation_review_status, "failed");
  assert.equal(contrastFailureReview.checks.browser_qa.status, "pass");
  assert.equal(
    contrastFailureReview.checks.accessibility_evidence.visual_background_contrast.status,
    "fail",
  );
  assert.ok(
    contrastFailureReview.findings.some((finding) =>
      String(finding.message).includes("visual background contrast") ||
      String(finding.message).includes("below"),
    ),
  );

  const responsiveAliasReview = reviewUiImplementationCandidate(
    visualHeavyStaticCandidate({
      accessibility_evidence: visualAccessibilityEvidence({
        responsive_no_overflow: undefined,
        reflow_zoom: {
          status: "pass",
          method: "320px reflow and zoom browser review",
          notes: "No two-dimensional scrolling or content loss.",
        },
      }),
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(responsiveAliasReview.implementation_review_status, "passed");
  assert.equal(
    responsiveAliasReview.checks.accessibility_evidence.responsive_no_overflow.status,
    "pass",
  );

  const customWidgetReview = reviewUiImplementationCandidate(
    {
      code: 'renderTabs({ role: "tablist", tabs })',
      custom_widgets: true,
      primitives_used: [],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop viewport checked",
        mobile: "mobile viewport checked",
      },
      accessibility_evidence: {
        ...coreAccessibilityEvidence(),
        non_text_contrast: {
          status: "pass",
          method: "computed contrast check",
          samples: [{ target: "selected tab indicator", contrast_ratio: 3.2 }],
        },
      },
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(customWidgetReview.implementation_review_status, "failed");
  assert.equal(
    customWidgetReview.checks.accessibility_evidence.no_keyboard_trap.status,
    "fail",
  );

  const formMissingLabelsReview = reviewUiImplementationCandidate(
    {
      code: "renderFormFlow({ fields, validation })",
      forms: true,
      primitives_used: ["FormField"],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop viewport checked",
        mobile: "mobile viewport checked",
      },
      accessibility_evidence: formAccessibilityEvidence({
        form_labels_instructions: undefined,
      }),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(formMissingLabelsReview.implementation_review_status, "failed");
  assert.equal(
    formMissingLabelsReview.checks.accessibility_evidence.form_labels_instructions.status,
    "fail",
  );

  const motionMissingEvidenceReview = reviewUiImplementationCandidate(
    {
      code: "renderAutoAdvancingCarousel({ animation: true, autoAdvance: true })",
      motion: true,
      auto_updating: true,
      primitives_used: [],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop viewport checked",
        mobile: "mobile viewport checked",
      },
      accessibility_evidence: coreAccessibilityEvidence(),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(motionMissingEvidenceReview.implementation_review_status, "failed");
  assert.equal(
    motionMissingEvidenceReview.checks.accessibility_evidence.reduced_motion.status,
    "fail",
  );
  assert.equal(
    motionMissingEvidenceReview.checks.accessibility_evidence.pause_stop_hide.status,
    "fail",
  );

  const overlayMissingEvidenceReview = reviewUiImplementationCandidate(
    {
      code: "renderDialogOverlay({ stickyFooter: true })",
      overlay: true,
      primitives_used: ["ModalActions"],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop viewport checked",
        mobile: "mobile viewport checked",
      },
      accessibility_evidence: coreAccessibilityEvidence(),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(overlayMissingEvidenceReview.implementation_review_status, "failed");
  assert.equal(
    overlayMissingEvidenceReview.checks.accessibility_evidence.focus_not_obscured.status,
    "fail",
  );
  assert.equal(
    overlayMissingEvidenceReview.checks.accessibility_evidence.no_keyboard_trap.status,
    "fail",
  );

  const denseControlMissingTargetReview = reviewUiImplementationCandidate(
    {
      code: "renderToolbar({ iconButtons })",
      dense_controls: true,
      primitives_used: [],
      states_covered: implementationContract.state_coverage.required_states,
      static_checks: ["npm run check"],
      browser_qa: {
        desktop: "desktop viewport checked",
        mobile: "mobile viewport checked",
      },
      accessibility_evidence: {
        ...coreAccessibilityEvidence(),
        non_text_contrast: {
          status: "pass",
          method: "computed contrast check",
          samples: [{ target: "icon button glyph", contrast_ratio: 3.2 }],
        },
      },
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(denseControlMissingTargetReview.implementation_review_status, "failed");
  assert.equal(
    denseControlMissingTargetReview.checks.accessibility_evidence.target_size.status,
    "fail",
  );
}

{
  const orderedReview = reviewUiImplementationCandidate(
    modalImplementationCandidate({
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Cancel", "Create card"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Create card",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(orderedReview.implementation_review_status, "passed");
  assert.equal(orderedReview.checks.modal_actions.status, "pass");
  assert.equal(orderedReview.checks.modal_actions.reviewed, 1);
  assert.deepEqual(orderedReview.findings, []);

  const primaryFirstReview = reviewUiImplementationCandidate(
    modalImplementationCandidate({
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Create card", "Cancel"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Create card",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(primaryFirstReview.implementation_review_status, "failed");
  assert.equal(primaryFirstReview.checks.modal_actions.status, "fail");
  assert.ok(
    primaryFirstReview.findings.some((finding) => finding.check === "modal_actions"),
  );
  assert.ok(
    primaryFirstReview.checks.modal_actions.entries[0].problems.some((problem) =>
      problem.includes("must precede primary action"),
    ),
  );

  const rightmostCancelReview = reviewUiImplementationCandidate(
    modalImplementationCandidate({
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Back", "Create card", "Cancel"],
      primary_action: "Create card",
      secondary_actions: ["Back"],
      form_submit_action: "Create card",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(rightmostCancelReview.implementation_review_status, "failed");
  assert.equal(rightmostCancelReview.checks.modal_actions.status, "fail");
  assert.ok(
    rightmostCancelReview.checks.modal_actions.entries[0].problems.some((problem) =>
      problem.includes("visually final"),
    ),
  );

  const wrongSubmitReview = reviewUiImplementationCandidate(
    modalImplementationCandidate({
      context: "New card modal",
      direction: "ltr",
      destructive: false,
      visual_order: ["Cancel", "Create card"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Cancel",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(wrongSubmitReview.implementation_review_status, "failed");
  assert.equal(wrongSubmitReview.checks.modal_actions.status, "fail");
  assert.ok(
    wrongSubmitReview.checks.modal_actions.entries[0].problems.some((problem) =>
      problem.includes("submit/default Enter"),
    ),
  );

  const destructiveReview = reviewUiImplementationCandidate(
    modalImplementationCandidate({
      context: "Delete board modal",
      direction: "ltr",
      destructive: true,
      visual_order: ["Delete board", "Cancel"],
      primary_action: "Delete board",
      secondary_actions: ["Cancel"],
      form_submit_action: "Delete board",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(destructiveReview.implementation_review_status, "passed");
  assert.equal(destructiveReview.checks.modal_actions.status, "not_applicable");
  assert.equal(destructiveReview.checks.modal_actions.entries[0].status, "not_applicable");

  const rtlReview = reviewUiImplementationCandidate(
    modalImplementationCandidate({
      context: "RTL create modal",
      direction: "rtl",
      destructive: false,
      visual_order: ["Create card", "Cancel"],
      primary_action: "Create card",
      secondary_actions: ["Cancel"],
      form_submit_action: "Create card",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(rtlReview.implementation_review_status, "passed");
  assert.equal(rtlReview.checks.modal_actions.status, "not_applicable");
  assert.equal(rtlReview.checks.modal_actions.entries[0].status, "not_applicable");
}

{
  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    refundWorkflowCandidate(),
    { profile_id: "operator-review-ui" },
  );
  const handoff = createUiGenerationHandoff(workflowReview);

  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.equal(handoff.guidance_profile.profile_id, "operator-review-ui");
  assert.equal(handoff.guidance_profile.pattern_id, "operator-review");
  assert.ok(
    handoff.guidance_profile.review_criteria.some((entry) =>
      entry.includes("current item"),
    ),
  );
  assertNoForbiddenHandoffKeys(handoff);
}

{
  const leakyReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    leakyWorkflowCandidate(),
  );

  assert.throws(
    () => createUiGenerationHandoff(leakyReview),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "handoff_blocked" &&
      error.details.review_status === "needs_source_context" &&
      error.details.implementation_leakage_terms.some(
        (entry) => entry.term === "JSON schema",
      ) &&
      error.details.review_packet_leakage_terms.some(
        (entry) => entry.term === "ready_for_review",
      ),
  );
}

{
  const vagueReview = reviewUiWorkflowCandidate(
    "Make a dashboard for the system.",
    refundWorkflowCandidate(),
  );

  assert.throws(
    () => createUiGenerationHandoff(vagueReview),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "handoff_blocked" &&
      error.details.source_missing_evidence.activity === true &&
      error.details.targeted_questions.some((question) =>
        question.includes("activity"),
      ),
  );
}

{
  const workflowReview = reviewUiWorkflowCandidate(
    DIAGNOSTIC_AUDIT_BRIEF,
    integrationAuditWorkflowCandidate(),
  );
  const handoff = createUiGenerationHandoff(workflowReview);
  const primaryText = primaryHandoffText(handoff);

  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.ok(handoff.disclosure_reminders.diagnostic_terms.includes("JSON schema"));
  assert.ok(handoff.disclosure_reminders.diagnostic_terms.includes("prompt template"));
  assert.equal(primaryText.includes("json schema"), false);
  assert.equal(primaryText.includes("prompt template"), false);
}

{
  assert.throws(
    () => createUiGenerationHandoff(null),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("workflow_review object"),
  );

  assert.throws(
    () => createUiGenerationHandoff({}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("review_status"),
  );
}

console.log("UI generation handoff checks passed.");
