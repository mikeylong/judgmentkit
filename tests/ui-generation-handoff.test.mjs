import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  JudgmentKitInputError,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  createUiImplementationContract,
  createUiGenerationHandoff,
  loadActivityContract,
  reviewActivityModelCandidate,
  reviewUiImplementationCandidate as reviewUiImplementationCandidateRaw,
  reviewUiImplementationCandidateWithBrowserRuntime,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

function canonicalIntegrityValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalIntegrityValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalIntegrityValue(value[key])]),
    );
  }

  return value === undefined ? null : value;
}

function recomputeActivityReviewReceipt(activityReview) {
  const packet = structuredClone(activityReview);
  const receiptSource = { ...packet.source };
  delete receiptSource.activity_case_review_integrity;
  const payload = {
    activity_case_policy: loadActivityContract().activity_case_policy,
    packet: {
      ...packet,
      source: receiptSource,
    },
  };
  packet.source.activity_case_review_integrity = {
    schema: "judgmentkit.portable-integrity-receipt/v1",
    algorithm: "sha256-canonical-json",
    kind: "activity_case_review",
    digest: createHash("sha256")
      .update("activity_case_review")
      .update("\0")
      .update(JSON.stringify(canonicalIntegrityValue(payload)))
      .digest("hex"),
  };
  return packet;
}

function recomputeFrontendContextReceipt(frontendContext) {
  const packet = structuredClone(frontendContext);
  const receiptSource = { ...packet.source };
  delete receiptSource.activity_case_frontend_integrity;
  delete receiptSource.artifact_inspector_boundary_integrity;
  const payload = {
    activity_case_policy: loadActivityContract().activity_case_policy,
    stage: "frontend_generation_context",
    packet: {
      ...packet,
      source: receiptSource,
    },
  };
  packet.source.activity_case_frontend_integrity = {
    schema: "judgmentkit.portable-integrity-receipt/v1",
    algorithm: "sha256-canonical-json",
    kind: "activity_case_frontend_generation_context",
    digest: createHash("sha256")
      .update("activity_case_frontend_generation_context")
      .update("\0")
      .update(JSON.stringify(canonicalIntegrityValue(payload)))
      .digest("hex"),
  };
  return packet;
}

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

function withNoApplicableVisualComposition(candidate, contractInput) {
  const activeContract =
    contractInput?.implementation_contract ??
    contractInput ??
    implementationContract;
  if (
    !activeContract?.visual_composition_policy ||
    !candidate ||
    typeof candidate !== "object" ||
    activeContract.design_system_source?.mode === "external_design_system"
  ) {
    return candidate;
  }

  return {
    ...structuredClone(candidate),
    rendered_html:
      '<main data-primary-surface="fixture">No governed visual relationships</main>',
  };
}

async function reviewUiImplementationCandidate(candidate, options = {}) {
  const fixture = withNoApplicableVisualComposition(
    candidate,
    options.implementation_contract ?? options.ui_implementation_contract,
  );
  const contractInput =
    options.implementation_contract ?? options.ui_implementation_contract;
  const activeContract = contractInput?.implementation_contract ?? contractInput;
  if (
    !activeContract?.visual_composition_policy ||
    activeContract.design_system_source?.mode === "external_design_system"
  ) {
    return reviewUiImplementationCandidateRaw(fixture, options);
  }
  return reviewUiImplementationCandidateWithBrowserRuntime(fixture, options);
}

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
        mcp_tools: [],
      },
    },
    components: ["Stack", "Button", "Alert"],
  };
}

function completeMaterialDesignSystemObjectComponentsAdapter() {
  return {
    ...completeMaterialDesignSystemAdapter(),
    components: {
      Stack: {
        label: "Stack",
        purpose: "Use Material UI Stack for external layout composition.",
        required_states: ["ready", "disabled", "focus-visible", "loading"],
      },
      Button: {
        label: "Button",
        purpose: "Use Material UI Button for external action controls.",
        required_states: ["ready", "disabled", "focus-visible", "loading"],
      },
      Alert: {
        label: "Alert",
        purpose: "Use Material UI Alert for external status messaging.",
        required_states: ["ready", "disabled", "focus-visible", "loading"],
      },
    },
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

function refundRecommendationWorkflowCandidate() {
  const candidate = refundWorkflowCandidate();
  candidate.workflow.primary_actions = [
    "Recommend approval",
    "Recommend policy review",
    "Request evidence",
  ];
  candidate.workflow.decision_points = [
    "Choose the recommended route for the refund request.",
  ];
  candidate.surface_set[0].controls = [
    "Recommend approval",
    "Recommend policy review",
    "Request evidence",
    "Send recommendation",
  ];
  candidate.handoff.next_action = "Send recommendation.";
  return candidate;
}

function integrationAuditWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Integration change audit",
      topology: "workspace",
      work_units: ["Review change summary", "Check release risk", "Prepare platform handoff"],
      primary_actions: ["Recommend ready for release", "Send to platform review", "Return for evidence"],
      decision_points: [
        "Decide whether to recommend the integration change for release or send it to platform review.",
      ],
      completion_state: "Platform team receives a clear handoff with the next action.",
    },
    surface_set: [
      {
        name: "Integration change audit",
        purpose: "Review change summary, release risk, and platform handoff.",
        sections: ["Change summary", "Release risk", "Platform handoff"],
        controls: ["Recommend ready for release", "Send to platform review", "Return for evidence"],
        relationship_to_workflow: "Keeps setup audit evidence near the release recommendation.",
      },
    ],
    handoff: {
      next_owner: "platform team",
      reason: "Release risk has been reviewed.",
      next_action: "Send platform handoff with the release recommendation.",
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
    design_system_provenance: defaultDesignSystemProvenance(),
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
    semantic_fallbacks: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic HTML provides fallback structure for rendered content.",
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
    design_system_provenance: defaultDesignSystemProvenance(),
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
    design_system_provenance: defaultDesignSystemProvenance(),
    ...overrides,
    accessibility_evidence: {
      ...modalAccessibilityEvidence(),
      ...(overrides.accessibility_evidence ?? {}),
    },
  };
}

function sessionsButtonLocalAuthorityContract() {
  const localComponentAuthority = {
    required: true,
    component: "SessionsButton",
    required_family: "button.secondary-action",
    accepted_family_selectors: ["button.secondary-action", ".secondary-action"],
    component_specific_selector: ".sessions-button",
    evidence_field: "local_component_authority_evidence",
    allowed_component_specific_rule_categories: ["layout", "overflow"],
    forbidden_component_specific_visual_identity: [
      "--jk-* visual identity custom properties",
      "background",
      "border",
      "border-radius",
      "box-shadow",
      "color",
      "font",
    ],
    rules: [
      "SessionsButton must inherit local button.secondary-action / .secondary-action visual identity.",
      "The component-specific .sessions-button selector may keep layout and overflow rules only.",
      "Do not declare --jk-* visual identity custom properties on .sessions-button.",
    ],
  };
  const packet = createUiImplementationContract({
    repo_name: "Sessions",
    target_stack: "React",
    repo_evidence: ["app/components/button.css", "app/components/SessionsButton.tsx"],
    local_component_authority: localComponentAuthority,
    approved_primitives: ["button"],
    required_states: ["ready", "disabled", "focus-visible"],
    static_rules: ["npm run check"],
    browser_qa_checks: ["desktop viewport", "mobile viewport"],
    default_ai_native_design_system: {
      component_contracts: [
        {
          id: "button.secondary-action",
          label: "Secondary action button",
          purpose:
            "Local secondary button family for lower-emphasis work actions.",
          use_when: ["secondary action", "navigation-adjacent work action"],
          anatomy: ["button.secondary-action", ".secondary-action"],
          required_states: ["ready", "disabled", "focus-visible"],
          review_checks: [
            "component-specific selectors inherit this family instead of redefining visual identity",
          ],
        },
      ],
    },
  });

  return packet.implementation_contract;
}

function sessionsButtonCandidate(contract, overrides = {}) {
  const baseAccessibilityEvidence = coreAccessibilityEvidence({
    non_text_contrast: {
      status: "pass",
      method: "computed contrast review",
      samples: [{ target: "secondary-action button boundary", contrast_ratio: 3.2 }],
    },
    forced_colors: {
      status: "pass",
      method: "forced-colors browser review",
      notes:
        "The inherited secondary-action family preserves text, border, and focus visibility in forced-colors mode.",
    },
  });

  return {
    code: `
      export function SessionsButton({ count }) {
        return <button className="sessions-button">Sessions ({count})</button>;
      }

      .sessions-button {
        --jk-color-surface: #ffffff;
        --jk-color-text: #17324d;
        --jk-color-border: #7d97b8;
        --jk-radius-control: 999px;
        background: var(--jk-color-surface);
        border: 1px solid var(--jk-color-border);
        border-radius: var(--jk-radius-control);
        color: var(--jk-color-text);
        display: inline-flex;
        max-inline-size: 100%;
        overflow: hidden;
      }
    `,
    primitives_used: ["button"],
    states_covered: contract.state_coverage.required_states,
    static_checks: ["npm run check"],
    browser_qa: {
      desktop: "desktop viewport Sessions button checked",
      mobile: "mobile viewport Sessions button checked",
    },
    accessibility_evidence: baseAccessibilityEvidence,
    design_system_provenance: defaultDesignSystemProvenance(),
    component_contract_evidence: {
      components: [
        {
          id: "button.secondary-action",
          states_covered: ["ready", "disabled", "focus-visible"],
        },
      ],
    },
    local_component_authority_evidence: {
      component: "SessionsButton",
      inherited_families: [],
      required_family: "button.secondary-action",
      component_specific_selectors: [
        {
          selector: ".sessions-button",
          declarations: [
            "--jk-color-surface",
            "--jk-color-text",
            "--jk-color-border",
            "--jk-radius-control",
            "background",
            "border",
            "border-radius",
            "color",
            "display",
            "max-inline-size",
            "overflow",
          ],
        },
      ],
    },
    ...overrides,
    accessibility_evidence: {
      ...baseAccessibilityEvidence,
      ...(overrides.accessibility_evidence ?? {}),
    },
  };
}

function repairedSessionsButtonCandidate(contract) {
  return sessionsButtonCandidate(contract, {
    code: `
      export function SessionsButton({ count }) {
        return (
          <button className="button secondary-action sessions-button">
            Sessions ({count})
          </button>
        );
      }

      .sessions-button {
        display: inline-flex;
        max-inline-size: 100%;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
    local_component_authority_evidence: {
      component: "SessionsButton",
      inherited_families: ["button.secondary-action", ".secondary-action"],
      required_family: "button.secondary-action",
      computed_style_evidence: {
        status: "pass",
        method: "browser computed-style comparison",
        compared_to: "button.secondary-action",
        properties: [
          "background",
          "color",
          "border",
          "border-radius",
          "padding",
          "font-weight",
          "focus ring",
          "height",
        ],
      },
      component_specific_selectors: [
        {
          selector: ".sessions-button",
          rule_categories: ["layout", "overflow"],
          declarations: [
            "display",
            "max-inline-size",
            "min-inline-size",
            "overflow",
            "text-overflow",
            "white-space",
          ],
          visual_identity_declarations: [],
        },
      ],
    },
  });
}

{
  const brief = "Design refund decisions for support leads.";
  const contextItems = [
    {
      id: "passive-refund-authority",
      kind: "user_answer",
      content: "Refund requests may be approved or denied by support leads.",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Support leads decide refund requests.",
        participants: ["support leads"],
        objective: "Support leads approve or deny refund requests.",
        outcomes: ["Each refund request has a decision."],
        domain_vocabulary: ["refund request"],
      },
      interaction_contract: {
        primary_decision: "Support leads approve or deny refund requests.",
        next_actions: [
          "Support leads approve refund requests.",
          "Support leads deny refund requests.",
        ],
        completion: "Each refund request has a decision.",
        make_easy: ["Compare refund evidence."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  const workflow = refundWorkflowCandidate();
  workflow.workflow.surface_name = "Support lead refund decisions";
  workflow.workflow.primary_actions = [
    "Approve refund request",
    "Deny refund request",
  ];
  workflow.workflow.decision_points = [
    "Support leads approve or deny refund requests.",
  ];
  workflow.workflow.completion_state = "The refund decision is recorded.";
  workflow.surface_set[0].name = "Support lead refund decisions";
  workflow.surface_set[0].purpose = "Review refund evidence.";
  workflow.surface_set[0].controls = [
    "Approve refund request",
    "Deny refund request",
  ];
  workflow.handoff.next_action = "Send the decision.";

  const review = reviewUiWorkflowCandidate(brief, workflow, {
    activity_review: activityReview,
    context_items: contextItems,
  });
  assert.equal(activityReview.review_status, "ready_for_review");
  assert.equal(review.review_status, "ready_for_review");
  assert.deepEqual(review.guardrails.authority_mismatches, []);
}

{
  const brief = "Design a final report publication workspace for editors.";
  const contextItems = [
    {
      id: "publication-policy",
      kind: "authoritative_source",
      source_ref: "policy://publication/final-reports/v1",
      content: "Editors may publish final reports.",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Editors review and publish final reports.",
        participants: ["editors"],
        objective: "Editors publish final reports.",
        outcomes: ["The final report is published."],
        domain_vocabulary: ["final report", "publication"],
      },
      interaction_contract: {
        primary_decision: "Editors publish the final report.",
        next_actions: ["Editors publish the final report."],
        completion: "The final report is published.",
        make_easy: ["Review publication criteria before publishing."],
      },
      disclosure_policy: {
        terms_to_use: ["final report", "publication"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  const workflow = {
    workflow: {
      surface_name: "Final report publication",
      topology: "workspace",
      work_units: ["Review final report"],
      primary_actions: ["Publish final report"],
      decision_points: ["Editors publish the final report."],
      completion_state: "The final report is published.",
    },
    surface_set: [
      {
        name: "Publication workspace",
        purpose: "Review and publish final report",
        sections: ["Final report", "Publication criteria"],
        controls: ["Publish final report"],
        relationship_to_workflow: "Primary publishing surface",
      },
    ],
    handoff: {
      next_owner: "editors",
      reason: "Publication is complete",
      next_action: "Send publication receipt",
    },
    diagnostics: { implementation_terms: [] },
  };
  const workflowReview = reviewUiWorkflowCandidate(brief, workflow, {
    activity_review: activityReview,
    context_items: contextItems,
  });
  assert.equal(activityReview.review_status, "ready_for_review");
  assert.equal(
    workflowReview.review_status,
    "ready_for_review",
    JSON.stringify(workflowReview.guardrails.authority_mismatches),
  );
  assert.deepEqual(workflowReview.guardrails.authority_mismatches, []);

  const handoff = createUiGenerationHandoff(workflowReview, {
    brief,
    context_items: contextItems,
    implementation_contract: implementationContract,
  });
  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    brief,
    context_items: contextItems,
    surface_type: "workbench",
  });
  assert.equal(
    frontendContext.frontend_context_status,
    "ready_for_frontend_implementation",
  );
}

{
  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    refundRecommendationWorkflowCandidate(),
  );
  const handoff = createUiGenerationHandoff(workflowReview, {
    brief: REFUND_TRIAGE_BRIEF,
    implementation_contract: implementationContract,
  });

  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.equal(handoff.contract_id, workflowReview.contract_id);
  assert.equal(handoff.source.mode, "model_assisted");
  assert.ok(handoff.activity_model.activity.includes("refund requests"));
  assert.ok(handoff.activity_model.participants.includes("support lead"));
  assert.ok(handoff.interaction_contract.primary_decision.includes("case should be approved"));
  assert.equal(handoff.workflow.surface_name, "Refund escalation queue");
  assert.ok(handoff.workflow.primary_actions.includes("Recommend approval"));
  assert.equal("primary_surface" in handoff, false);
  assert.ok(handoff.surface_set[0].sections.includes("Evidence checklist"));
  assert.equal(handoff.handoff.next_owner, "support agent");
  assert.equal(handoff.disclosure_reminders.product_ui_rule.includes("implementation"), true);
  assert.equal(
    handoff.implementation_contract.local_component_authority.token_boundary.rule,
    implementationContract.local_component_authority.token_boundary.rule,
  );
  assert.deepEqual(
    handoff.generation_gates.map((gate) => gate.id),
    ["activity_gate", "implementation_gate", "design_system_gate"],
  );
  assert.ok(handoff.implementation_contract.approved_primitives.includes("CheckboxGroup"));
  assert.equal(
    handoff.implementation_contract.design_system_source.mode,
    "judgmentkit_default",
  );
  assertNoForbiddenHandoffKeys(handoff);
}

{
  const shortBrief = "Create a refund triage workspace for support leads.";
  const activityReview = reviewActivityModelCandidate(shortBrief, {
    activity_model: {
      activity: "Support leads triage refund requests.",
      participants: ["support leads"],
      objective: "Determine the most appropriate next route for each request.",
      outcomes: ["Each request has a clear recommended route and rationale."],
      domain_vocabulary: ["refund request", "evidence", "policy review"],
      existing_tools_artifacts: ["refund queue", "policy guide"],
      rules_rituals: ["Daily triage review"],
      division_of_labor: [
        {
          participant: "support lead",
          responsibility: "Recommend the next route",
        },
      ],
    },
    interaction_contract: {
      primary_decision: "Choose the recommended route for the refund request.",
      next_actions: ["Recommend approval", "Recommend policy review", "Request evidence"],
      completion: "Leave each request with a recommended route and rationale.",
      make_easy: ["Compare request evidence before recommending a route."],
      user_is_trying_to: "Leave each request with the right recommended route.",
      user_thinks_about_work_as: "triaging evidence and recommending a route",
      user_does_not_think_about_work_as: "editing refund records",
      primary_decisions: ["Choose the recommended route for the refund request."],
      make_harder: ["Committing a final refund decision without authority"],
      state_changes: ["Unreviewed to recommendation ready"],
      leave_screen_knowing_or_done: [
        "The request has a recommended route and rationale.",
      ],
    },
    disclosure_policy: {
      terms_to_use: ["refund request", "evidence", "policy review"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  });
  const overreachingWorkflowReview = reviewUiWorkflowCandidate(
    shortBrief,
    refundWorkflowCandidate(),
    { activity_review: activityReview },
  );
  const recommendationWorkflow = refundWorkflowCandidate();
  recommendationWorkflow.workflow.primary_actions = [
    "Recommend approval",
    "Recommend policy review",
    "Request evidence",
  ];
  recommendationWorkflow.workflow.decision_points = [
    "Choose the recommended route for the refund request.",
  ];
  recommendationWorkflow.surface_set[0].controls = [
    "Recommend approval",
    "Recommend policy review",
    "Request evidence",
    "Send recommendation",
  ];
  const workflowReview = reviewUiWorkflowCandidate(
    shortBrief,
    recommendationWorkflow,
    { activity_review: activityReview },
  );
  const handoff = createUiGenerationHandoff(workflowReview, {
    brief: shortBrief,
  });

  assert.equal(activityReview.activity_case.readiness.decision, "proceed");
  assert.ok(activityReview.activity_case.assumptions.length > 0);
  assert.ok(Object.values(activityReview.guardrails.source_missing_evidence).some(Boolean));
  assert.equal(overreachingWorkflowReview.review_status, "needs_source_context");
  assert.ok(
    overreachingWorkflowReview.guardrails.authority_mismatches.some(
      (entry) => entry.unsupported_authority_verbs.includes("approve"),
    ),
  );
  assert.throws(
    () => createUiGenerationHandoff(overreachingWorkflowReview),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "handoff_blocked" &&
      error.details.authority_mismatches.length > 0,
  );
  assert.equal(workflowReview.activity_review, activityReview);
  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.deepEqual(handoff.activity_case, activityReview.activity_case);
  assert.deepEqual(
    handoff.disclosure_policy,
    activityReview.candidate.disclosure_policy,
  );
  assert.deepEqual(handoff.activity_model.existing_tools_artifacts, [
    "refund queue",
    "policy guide",
  ]);
  assert.deepEqual(
    handoff.activity_model.division_of_labor,
    activityReview.candidate.activity_model.division_of_labor,
  );
  assert.deepEqual(handoff.interaction_contract.state_changes, [
    "Unreviewed to recommendation ready",
  ]);
  assert.ok(
    handoff.interaction_contract.user_thinks_about_work_as.includes(
      "Triaging evidence",
    ),
  );
  assert.ok(handoff.activity_model.activity.includes("refund"));

  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    brief: shortBrief,
    surface_type: "workbench",
  });
  const skillContext = createFrontendImplementationSkillContext({
    brief: shortBrief,
    frontend_generation_context: frontendContext,
  });
  assert.deepEqual(frontendContext.activity_case, activityReview.activity_case);
  assert.deepEqual(skillContext.activity_case, activityReview.activity_case);
  assert.deepEqual(frontendContext.activity_model, handoff.activity_model);
  assert.deepEqual(skillContext.activity_model, handoff.activity_model);
  assert.deepEqual(
    frontendContext.interaction_contract,
    handoff.interaction_contract,
  );
  assert.deepEqual(
    skillContext.interaction_contract,
    handoff.interaction_contract,
  );
  assert.deepEqual(
    frontendContext.disclosure_policy,
    activityReview.candidate.disclosure_policy,
  );
  assert.deepEqual(
    skillContext.disclosure_policy,
    activityReview.candidate.disclosure_policy,
  );
  assert.equal(
    skillContext.activity_case.readiness.commitment,
    "not_authorized",
  );

  const tamperedHandoff = structuredClone(handoff);
  tamperedHandoff.activity_case.readiness.commitment = "authorized";
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: tamperedHandoff,
        surface_type: "workbench",
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_context_blocked" &&
      error.details.field ===
        "ui_generation_handoff.source.activity_case_handoff_integrity",
  );

  const downgradedHandoff = structuredClone(handoff);
  delete downgradedHandoff.activity_case;
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: downgradedHandoff,
        surface_type: "workbench",
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_context_blocked" &&
      error.details.field === "ui_generation_handoff.activity_case",
    "Removing the activity-case discriminator must not downgrade a modern handoff to legacy validation.",
  );

  const tamperedDisclosureHandoff = structuredClone(handoff);
  tamperedDisclosureHandoff.disclosure_policy.terms_to_use.push(
    "implementation trace",
  );
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: tamperedDisclosureHandoff,
        surface_type: "workbench",
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_context_blocked" &&
      error.details.field ===
        "ui_generation_handoff.source.activity_case_handoff_integrity",
  );

  const authorityEscalatedHandoff = structuredClone(handoff);
  authorityEscalatedHandoff.workflow.primary_actions = [
    "Approve refund",
    "Commit final refund decision",
  ];
  authorityEscalatedHandoff.workflow.decision_points = [
    "Approve and commit the final refund decision",
  ];
  authorityEscalatedHandoff.surface_set[0].controls = [
    "Approve refund",
    "Commit final refund decision",
  ];
  authorityEscalatedHandoff.handoff.next_action =
    "Send approval and issue refund.";
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: authorityEscalatedHandoff,
        brief: shortBrief,
        surface_type: "workbench",
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_context_blocked" &&
      error.details.field ===
        "ui_generation_handoff.source.activity_case_handoff_integrity",
  );

  const tamperedFrontendContext = structuredClone(frontendContext);
  tamperedFrontendContext.activity_case.readiness.commitment = "authorized";
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: tamperedFrontendContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.field ===
        "frontend_generation_context.source.activity_case_frontend_integrity",
  );

  const authorityEscalatedFrontendContext = structuredClone(frontendContext);
  authorityEscalatedFrontendContext.workflow.primary_actions = [
    "Approve refund",
    "Commit final refund decision",
  ];
  authorityEscalatedFrontendContext.surface_set[0].controls = [
    "Approve refund",
    "Commit final refund decision",
  ];
  authorityEscalatedFrontendContext.handoff.next_action =
    "Send approval and issue refund.";
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: authorityEscalatedFrontendContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.field ===
        "frontend_generation_context.source.activity_case_frontend_integrity",
  );

  const tamperedDisclosureFrontendContext = structuredClone(frontendContext);
  tamperedDisclosureFrontendContext.disclosure_policy.terms_to_use.push(
    "implementation trace",
  );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: tamperedDisclosureFrontendContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.field ===
        "frontend_generation_context.source.activity_case_frontend_integrity",
  );

  const downgradedFrontendContext = structuredClone(frontendContext);
  delete downgradedFrontendContext.activity_case;
  delete downgradedFrontendContext.source.activity_case_frontend_integrity;
  delete downgradedFrontendContext.source.activity_case_handoff_integrity;
  delete downgradedFrontendContext.source.activity_brief_sha256;
  delete downgradedFrontendContext.source.activity_context_items;
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: downgradedFrontendContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.field === "frontend_generation_context.activity_case",
    "Deleting every modern boundary indicator must not downgrade a ready frontend packet to legacy validation.",
  );

  const forgedFrontendContext = structuredClone(frontendContext);
  forgedFrontendContext.activity_model.objective =
    "Support leads approve and commit the final refund decision.";
  forgedFrontendContext.interaction_contract.primary_decision =
    "Support leads approve and commit the final refund decision.";
  forgedFrontendContext.interaction_contract.next_actions = [
    "Support leads approve refund",
    "Issue refund",
  ];
  forgedFrontendContext.workflow.primary_actions = [
    "Support leads approve refund",
    "Issue refund",
  ];
  forgedFrontendContext.workflow.decision_points = [
    "Support leads approve and commit the final refund decision.",
  ];
  forgedFrontendContext.surface_set[0].controls = [
    "Support leads approve refund",
    "Issue refund",
  ];
  forgedFrontendContext.implementation_guidance.required_surfaces =
    structuredClone(forgedFrontendContext.surface_set);
  forgedFrontendContext.implementation_guidance.required_controls = [
    "Support leads approve refund",
    "Issue refund",
  ];
  const reissuedForgedFrontendContext = recomputeFrontendContextReceipt(
    forgedFrontendContext,
  );
  const moduleUrl = new URL("../src/index.mjs", import.meta.url).href;
  const childScript = [
    'import fs from "node:fs";',
    `import { createFrontendImplementationSkillContext } from ${JSON.stringify(moduleUrl)};`,
    'const input = JSON.parse(fs.readFileSync(0, "utf8"));',
    "try {",
    "  createFrontendImplementationSkillContext(input);",
    "  process.exit(0);",
    "} catch (error) {",
    "  process.stdout.write(JSON.stringify({ code: error.code, details: error.details }));",
    "  process.exit(17);",
    "}",
  ].join("\n");
  const forgedConsumer = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", childScript],
    {
      encoding: "utf8",
      input: JSON.stringify({
        brief: shortBrief,
        frontend_generation_context: reissuedForgedFrontendContext,
      }),
    },
  );
  assert.equal(forgedConsumer.status, 17, forgedConsumer.stderr);
  assert.ok(
    [
      "activity_review_revalidation_failed",
      "frontend_context_blocked",
      "frontend_skill_context_blocked",
    ].includes(JSON.parse(forgedConsumer.stdout).code),
    "A publicly recomputed receipt must not let forged execution authority cross a fresh-process skill boundary.",
  );

  const derivedOnlyTamper = structuredClone(frontendContext);
  derivedOnlyTamper.implementation_guidance.required_controls = [
    "Approve and issue refund",
  ];
  const reissuedDerivedOnlyTamper = recomputeFrontendContextReceipt(
    derivedOnlyTamper,
  );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: reissuedDerivedOnlyTamper,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.field ===
        "implementation_guidance.required_controls",
    "Reissuing a continuity receipt cannot make derived controls disagree with the reviewed root surface set.",
  );

  const contradictoryRootActivity = structuredClone(frontendContext);
  contradictoryRootActivity.activity_model.activity =
    "Support leads review renewal-risk accounts.";
  const reissuedContradictoryRootActivity = recomputeFrontendContextReceipt(
    contradictoryRootActivity,
  );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: reissuedContradictoryRootActivity,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.cause_code === "activity_review_revalidation_failed" &&
      error.details.field ===
        "frontend_generation_context.activity_case.claims.activity",
    "A recomputed continuity receipt must not carry a root activity that contradicts the retained activity-case claim.",
  );

  const duplicateRootClaimContext = structuredClone(frontendContext);
  duplicateRootClaimContext.activity_case.claims.push({
    ...structuredClone(
      duplicateRootClaimContext.activity_case.claims.find(
        (claim) => claim.id === "activity",
      ),
    ),
    id: "duplicate_activity",
    value: "Account executives review renewal-risk accounts.",
  });
  const reissuedDuplicateRootClaimContext = recomputeFrontendContextReceipt(
    duplicateRootClaimContext,
  );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: reissuedDuplicateRootClaimContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.cause_code === "activity_review_revalidation_failed" &&
      error.details.field ===
        "frontend_generation_context.activity_case.claims.activity",
    "A recomputed continuity receipt must not hide a contradictory duplicate base claim.",
  );

  const forgedGroundingContext = structuredClone(frontendContext);
  const inferredObjectiveClaim = forgedGroundingContext.activity_case.claims.find(
    (claim) => claim.id === "objective" && claim.source_refs.length === 0,
  );
  assert.ok(inferredObjectiveClaim);
  inferredObjectiveClaim.origin = "source_supported";
  inferredObjectiveClaim.source_refs = ["brief"];
  inferredObjectiveClaim.confidence = "high";
  const reissuedForgedGroundingContext = recomputeFrontendContextReceipt(
    forgedGroundingContext,
  );
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        brief: shortBrief,
        frontend_generation_context: reissuedForgedGroundingContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked" &&
      error.details.cause_code === "activity_review_revalidation_failed" &&
      error.details.field ===
        "frontend_generation_context.activity_case.claims",
    "A recomputed continuity receipt must not relabel an inferred base claim as source-supported.",
  );

  const tamperedWorkflowReview = structuredClone(workflowReview);
  tamperedWorkflowReview.activity_review.activity_case.readiness.commitment =
    "authorized";
  assert.throws(
    () => createUiGenerationHandoff(tamperedWorkflowReview, {
      brief: shortBrief,
    }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "handoff_blocked" &&
      error.details.failures.some(
        (failure) =>
          failure.field ===
          "activity_review.source.activity_case_review_integrity",
      ),
  );
}

{
  const shortBrief = "Create a refund triage workspace for support leads.";
  const contextItems = [
    {
      id: "refund-authority-answer",
      kind: "authoritative_source",
      source_ref: "policy://refund/final-decision/v1",
      content:
        "Support leads may approve or deny refund requests and commit the final refund decision. Their objective is to reach the final decision for each refund request. Each request has a committed refund decision.",
    },
  ];
  const authorityActivityReview = reviewActivityModelCandidate(
    shortBrief,
    {
      activity_model: {
        activity: "Support leads triage refund requests.",
        participants: ["support leads"],
        objective: "Support leads approve or deny refund requests.",
        outcomes: ["Each request has a committed refund decision."],
        domain_vocabulary: ["refund request", "evidence", "policy review"],
      },
      interaction_contract: {
        primary_decision: "Support leads may approve or deny refund requests.",
        next_actions: [
          "Support leads may approve or deny refund requests and commit the final refund decision.",
        ],
        completion: "The final refund decision is committed.",
        make_easy: ["Compare the request evidence before deciding."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "evidence", "policy review"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );

  assert.equal(authorityActivityReview.review_status, "ready_for_review");

  assert.throws(
    () =>
      reviewUiWorkflowCandidate(shortBrief, refundWorkflowCandidate(), {
        activity_review: authorityActivityReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_context_required",
  );

  const workflowReview = reviewUiWorkflowCandidate(
    shortBrief,
    refundWorkflowCandidate(),
    {
      activity_review: authorityActivityReview,
      context_items: contextItems,
    },
  );
  assert.equal(workflowReview.review_status, "ready_for_review");
  assert.deepEqual(workflowReview.guardrails.authority_mismatches, []);

  assert.throws(
    () => createUiGenerationHandoff(workflowReview),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_source_required",
    "A portable receipt cannot substitute for resupplying the raw brief and authority context at handoff.",
  );

  const handoff = createUiGenerationHandoff(workflowReview, {
    brief: shortBrief,
    context_items: contextItems,
  });
  assert.equal(handoff.handoff_status, "ready_for_generation");

  const alteredContextItems = structuredClone(contextItems);
  alteredContextItems[0].content =
    "Support leads may recommend approval to a finance manager.";
  assert.throws(
    () =>
      createUiGenerationHandoff(workflowReview, {
        brief: shortBrief,
        context_items: alteredContextItems,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_context_invalid",
  );

  const alteredContextKind = structuredClone(contextItems);
  alteredContextKind[0].kind = "workspace_evidence";
  assert.throws(
    () =>
      createUiGenerationHandoff(workflowReview, {
        brief: shortBrief,
        context_items: alteredContextKind,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_context_invalid",
  );

  const alteredContextSourceRef = structuredClone(contextItems);
  alteredContextSourceRef[0].source_ref = "answer://different-session";
  assert.throws(
    () =>
      createUiGenerationHandoff(workflowReview, {
        brief: shortBrief,
        context_items: alteredContextSourceRef,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_context_invalid",
  );
}

{
  const brief = "Create a refund follow-up workspace for support leads.";
  const contextItems = [
    {
      id: "existing-refund-receipt",
      kind: "provided_artifact",
      content: "A prioritized set of refund requests is ready for follow-up.",
      source_ref: "artifact://refund-follow-up/receipt",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Support leads follow up on prioritized refund requests.",
        participants: ["support leads"],
        objective: "Prepare the next follow-up for each prioritized refund request.",
        outcomes: ["Each prioritized request has a clear follow-up."],
        domain_vocabulary: ["refund request", "follow-up", "priority"],
      },
      interaction_contract: {
        primary_decision: "Choose the next follow-up for each refund request.",
        next_actions: ["Prepare follow-up", "Request evidence"],
        completion: "A prioritized set of refund requests is ready for follow-up.",
        make_easy: ["Compare priority and evidence before preparing follow-up."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "follow-up", "priority"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  const completionClaim = activityReview.activity_case.claims.find(
    (claim) => claim.path === "interaction_contract.completion",
  );
  const recommendationWorkflow = refundWorkflowCandidate();
  recommendationWorkflow.workflow.primary_actions = [
    "Recommend follow-up",
    "Request evidence",
  ];
  recommendationWorkflow.workflow.decision_points = [
    "Choose the recommended follow-up for the refund request.",
  ];
  recommendationWorkflow.surface_set[0].controls = [
    "Recommend follow-up",
    "Request evidence",
    "Send recommendation",
  ];

  assert.equal(activityReview.review_status, "ready_for_review");
  assert.deepEqual(completionClaim.source_refs, ["existing-refund-receipt"]);
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(brief, recommendationWorkflow, {
        activity_review: activityReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_context_required" &&
      error.details.required_source_refs.includes("existing-refund-receipt"),
    "Ordinary attributed evidence relied on by the activity case must be resupplied at workflow review.",
  );

  const workflowReview = reviewUiWorkflowCandidate(
    brief,
    recommendationWorkflow,
    {
      activity_review: activityReview,
      context_items: contextItems,
    },
  );
  assert.equal(workflowReview.review_status, "ready_for_review");
  assert.throws(
    () => createUiGenerationHandoff(workflowReview),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_source_required",
    "The raw activity brief must be resupplied at handoff before attributed evidence can be checked.",
  );
  assert.equal(
    createUiGenerationHandoff(workflowReview, {
      brief,
      context_items: contextItems,
    })
      .handoff_status,
    "ready_for_generation",
  );
}

{
  const brief =
    "Design a refund triage workspace used by finance managers and support leads.";
  const contextItems = [
    {
      id: "refund-limit-answer",
      kind: "user_answer",
      content:
        "Only finance managers may approve refund requests up to 100 dollars. Support leads prepare recommendations.",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Finance managers and support leads triage refund requests.",
        participants: ["finance managers", "support leads"],
        objective: "Determine the route for each refund request.",
        outcomes: ["Each request has a result and rationale."],
        domain_vocabulary: ["refund request", "recommendation", "approval"],
      },
      interaction_contract: {
        primary_decision:
          "Finance managers may approve refund requests up to 100 dollars.",
        next_actions: [
          "Finance managers may approve refund requests up to 100 dollars.",
          "Support leads prepare recommendations.",
        ],
        completion: "Each request has a result and rationale.",
        make_easy: ["Compare evidence before choosing a route."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "recommendation", "approval"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");

  for (const [term, expectedStatus] of [
    ["approval", "ready_for_review"],
    ["Finance Approval", "ready_for_review"],
    ["Support Lead Approval", "needs_source_context"],
    ["Support Approval", "needs_source_context"],
    ["Support leads approval", "needs_source_context"],
  ]) {
    const vocabularyCandidate = structuredClone(activityReview.candidate);
    vocabularyCandidate.disclosure_policy.terms_to_use = [term];
    const vocabularyReview = reviewActivityModelCandidate(
      brief,
      vocabularyCandidate,
      { context_items: contextItems },
    );
    assert.equal(
      vocabularyReview.review_status,
      expectedStatus,
      `Role-qualified authority vocabulary was classified incorrectly: ${term} ${JSON.stringify(vocabularyReview.activity_case.claims.filter((claim) => claim.path === "disclosure_policy.terms_to_use"))}`,
    );
    if (expectedStatus === "needs_source_context") {
      assert.ok(
        vocabularyReview.activity_case.unresolved_ambiguities.some(
          (entry) => entry.category === "participant_authority",
        ),
        `Unsupported authority vocabulary produced no participant-authority ambiguity: ${term}`,
      );
    }
  }

  const scopedWorkflow = (actor, amount) => {
    const action = `${actor} approve a ${amount} dollar refund`;
    const candidate = refundWorkflowCandidate();
    candidate.workflow.surface_name = `${actor} refund triage`;
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.workflow.completion_state = "Refund review is complete.";
    candidate.surface_set[0].name = `${actor} refund triage`;
    candidate.surface_set[0].purpose = `${actor} review refund evidence.`;
    candidate.surface_set[0].controls = [action];
    candidate.handoff.next_action = "Send the review result.";
    return candidate;
  };

  const allowedReview = reviewUiWorkflowCandidate(
    brief,
    scopedWorkflow("Finance managers", 50),
    { activity_review: activityReview, context_items: contextItems },
  );
  assert.equal(allowedReview.review_status, "ready_for_review");

  const approvalNoticeCandidate = scopedWorkflow("Finance managers", 50);
  approvalNoticeCandidate.handoff.next_action = "Send approval notice.";
  const approvalNoticeReview = reviewUiWorkflowCandidate(
    brief,
    approvalNoticeCandidate,
    { activity_review: activityReview, context_items: contextItems },
  );
  assert.equal(
    approvalNoticeReview.review_status,
    "ready_for_review",
    "Sending an approval notice is not exercising approval authority.",
  );

  for (const action of [
    "Submit refund for finance approval",
    "Route refund to finance for approval",
    "Escalate refund for finance approval",
    "Flag refund for manager approval",
    "Queue refund for finance approval",
    "Prepare refund for finance approval",
    "Request finance approval",
  ]) {
    const candidate = refundRecommendationWorkflowCandidate();
    candidate.workflow.surface_name = "Support lead refund recommendation";
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.surface_set[0].name = "Support lead refund recommendation";
    candidate.surface_set[0].purpose =
      "Support leads prepare refund recommendations for finance.";
    candidate.surface_set[0].controls = [action];
    candidate.handoff.next_owner = "finance managers";
    candidate.handoff.next_action = action;
    const review = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(
      review.review_status,
      "ready_for_review",
      `Routing work for approval must not confer approval authority: ${action}`,
    );
    assert.deepEqual(
      review.guardrails.authority_mismatches,
      [],
      `Routing work for approval produced an authority mismatch: ${action}`,
    );
  }

  for (const field of ["workflow.surface_name", "surface_set[0].name"]) {
    const candidate = refundRecommendationWorkflowCandidate();
    candidate.workflow.surface_name = "Support lead refund recommendation";
    candidate.surface_set[0].name = "Support lead refund recommendation";
    if (field === "workflow.surface_name") {
      candidate.workflow.surface_name = "Support Lead Refund Approval";
    } else {
      candidate.surface_set[0].name = "Support Lead Refund Approval";
    }
    const review = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(
      review.review_status,
      "needs_source_context",
      `A primary UI name must not promote recommendation authority: ${field}`,
    );
    assert.ok(
      review.guardrails.authority_mismatches.some(
        (entry) =>
          entry.field === field &&
          entry.unsupported_authority_verbs.includes("approve"),
      ),
      `The misleading authority name produced no approval mismatch: ${field}`,
    );
  }

  for (const candidate of [
    scopedWorkflow("Support leads", 50),
    scopedWorkflow("Finance managers", 101),
  ]) {
    const review = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(review.review_status, "needs_source_context");
    assert.ok(review.guardrails.authority_mismatches.length > 0);
  }

  for (const action of [
    "Support leads determine the refund outcome",
    "Support leads adjudicate the refund request",
    "Support leads resolve the refund request",
    "Support leads rule on the refund request",
    "Support leads settle the refund request",
    "Support leads render the refund decision",
    "Support leads disposition the refund request",
    "Support leads make the refund determination",
  ]) {
    const candidate = refundWorkflowCandidate();
    candidate.workflow.surface_name = "Support lead refund triage";
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.surface_set[0].name = "Support lead refund triage";
    candidate.surface_set[0].purpose = "Support leads review refund evidence.";
    candidate.surface_set[0].controls = [action];
    candidate.handoff.next_action = "Send the review result.";
    const review = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(
      review.review_status,
      "needs_source_context",
      `A final-decision euphemism must not promote recommendation authority: ${action}`,
    );
    assert.ok(
      review.guardrails.authority_mismatches.length > 0,
      `Final-decision euphemism produced no authority mismatch: ${action}`,
    );
  }
}

{
  const candidateFor = (brief) => ({
    activity_model: {
      activity: "Finance managers and support leads review refund requests.",
      participants: ["finance managers", "support leads"],
      objective: "Route each refund request to the correct decision owner.",
      outcomes: ["Each request has a recorded route and rationale."],
      domain_vocabulary: ["refund request", "recommendation", "approval"],
    },
    interaction_contract: {
      primary_decision:
        "Finance managers may approve refund requests up to 100 dollars.",
      next_actions: [
        "Finance managers may approve refund requests up to 100 dollars.",
        "Support leads prepare recommendations.",
      ],
      completion: "Each request has a recorded route and rationale.",
      make_easy: ["Compare the refund evidence with the approval limit."],
    },
    disclosure_policy: {
      terms_to_use: ["refund request", "recommendation", "approval"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  });
  const unambiguousBrief =
    "Finance managers review refund requests. They may approve refunds up to 100 dollars. Support leads prepare recommendations.";
  const unambiguousReview = reviewActivityModelCandidate(
    unambiguousBrief,
    candidateFor(unambiguousBrief),
  );
  assert.equal(
    unambiguousReview.review_status,
    "ready_for_review",
    `An immediately preceding single participant should resolve a simple They authority reference: ${JSON.stringify(unambiguousReview.activity_case.unresolved_ambiguities)}`,
  );

  const workflow = refundWorkflowCandidate();
  const action = "Finance managers approve a 50 dollar refund";
  workflow.workflow.surface_name = "Finance manager refund review";
  workflow.workflow.primary_actions = [action];
  workflow.workflow.decision_points = [action];
  workflow.surface_set[0].name = "Finance manager refund review";
  workflow.surface_set[0].purpose = "Finance managers review refund evidence.";
  workflow.surface_set[0].controls = [action];
  workflow.handoff.next_action = "Send the refund result.";
  const workflowReview = reviewUiWorkflowCandidate(
    unambiguousBrief,
    workflow,
    { activity_review: unambiguousReview },
  );
  assert.equal(
    workflowReview.review_status,
    "ready_for_review",
    "The resolved brief authority must survive workflow review.",
  );

  const ambiguousBrief =
    "Finance managers and support leads review refund requests. They may approve refunds up to 100 dollars.";
  const ambiguousReview = reviewActivityModelCandidate(
    ambiguousBrief,
    candidateFor(ambiguousBrief),
  );
  assert.equal(
    ambiguousReview.review_status,
    "needs_source_context",
    "A pronoun with more than one participant antecedent must remain unresolved.",
  );
  assert.ok(
    ambiguousReview.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "participant_authority",
    ),
  );
}

{
  const brief = "Design high-value refund review for finance managers.";
  const contextItems = [
    {
      id: "high-value-refund-limit",
      kind: "user_answer",
      content:
        "Finance managers may approve refund requests up to 20,000 dollars.",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Finance managers review high-value refund requests.",
        participants: ["finance managers"],
        objective: "Compare each refund amount with the approval limit.",
        outcomes: ["Each refund request has a decision."],
        domain_vocabulary: ["refund request", "approval limit"],
      },
      interaction_contract: {
        primary_decision:
          "Finance managers may approve refund requests up to 20,000 dollars.",
        next_actions: [
          "Finance managers may approve refund requests up to 20,000 dollars.",
        ],
        completion: "Each refund request has a decision.",
        make_easy: ["Compare the refund amount with the approval limit."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "approval limit"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");

  const amountWorkflow = (amount) => {
    const candidate = refundWorkflowCandidate();
    const action = `Finance managers approve a ${amount} dollar refund`;
    candidate.workflow.surface_name = "Finance manager refund review";
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.workflow.completion_state = "Refund review is complete.";
    candidate.surface_set[0].name = "Finance manager refund review";
    candidate.surface_set[0].purpose = "Finance managers review refund evidence.";
    candidate.surface_set[0].controls = [action];
    candidate.handoff.next_action = "Send the refund result.";
    return candidate;
  };

  for (const amount of ["50", "100", "999", "1,000", "10,000", "20,000"]) {
    const review = reviewUiWorkflowCandidate(brief, amountWorkflow(amount), {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(
      review.review_status,
      "ready_for_review",
      `${amount} must remain within the 20,000 ceiling.`,
    );
  }

  const overLimitReview = reviewUiWorkflowCandidate(
    brief,
    amountWorkflow("20,001"),
    { activity_review: activityReview, context_items: contextItems },
  );
  assert.equal(overLimitReview.review_status, "needs_source_context");
  assert.ok(overLimitReview.guardrails.authority_mismatches.length > 0);
}

{
  const brief = "Design refund limit review for finance managers.";
  const amountWorkflow = (amount) => {
    const candidate = refundWorkflowCandidate();
    const action = `Finance managers approve a ${amount} dollar refund`;
    candidate.workflow.surface_name = "Finance refund limits";
    candidate.workflow.work_units = ["Review refund"];
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.workflow.completion_state = "The refund review is complete.";
    candidate.surface_set[0].name = "Finance refund limits";
    candidate.surface_set[0].purpose = "Review refund evidence and limits.";
    candidate.surface_set[0].sections = ["Refund", "Evidence", "Limit"];
    candidate.surface_set[0].controls = [action];
    candidate.handoff.reason = "The refund review is complete.";
    candidate.handoff.next_action = "Send the refund result.";
    return candidate;
  };

  for (const { rule, allowed, blocked } of [
    {
      rule: "Finance managers may approve refund requests under 100 dollars.",
      allowed: 99,
      blocked: 100,
    },
    {
      rule: "Finance managers may approve refund requests above 100 dollars.",
      allowed: 101,
      blocked: 100,
    },
  ]) {
    const contextItems = [{
      id: `strict-limit-${allowed}`,
      kind: "user_answer",
      content: rule,
    }];
    const activityReview = reviewActivityModelCandidate(
      brief,
      {
        activity_model: {
          activity: "Finance managers review refund requests.",
          participants: ["finance managers"],
          objective: "Compare each refund with the applicable limit.",
          outcomes: ["Each refund review has a recorded result."],
          domain_vocabulary: ["refund request", "limit"],
        },
        interaction_contract: {
          primary_decision: rule,
          next_actions: [rule],
          completion: "Each refund review has a recorded result.",
          make_easy: ["Compare the refund amount with the applicable limit."],
        },
        disclosure_policy: {
          terms_to_use: ["refund request", "limit"],
          hidden_implementation_terms: [],
          translation_candidates: [],
          diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
        },
      },
      { context_items: contextItems },
    );
    assert.equal(activityReview.review_status, "ready_for_review", rule);
    const allowedReview = reviewUiWorkflowCandidate(
      brief,
      amountWorkflow(allowed),
      { activity_review: activityReview, context_items: contextItems },
    );
    assert.equal(allowedReview.review_status, "ready_for_review", rule);
    const blockedReview = reviewUiWorkflowCandidate(
      brief,
      amountWorkflow(blocked),
      { activity_review: activityReview, context_items: contextItems },
    );
    assert.equal(blockedReview.review_status, "needs_source_context", rule);
  }
}

{
  const brief = "Design daily refund limit review for finance managers.";
  const rule =
    "Finance managers may approve up to 10 refund requests per day, each up to 100 dollars.";
  const contextItems = [{
    id: "daily-refund-limits",
    kind: "user_answer",
    content: rule,
  }];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Finance managers review daily refund requests.",
        participants: ["finance managers"],
        objective: "Compare daily refund requests with both limits.",
        outcomes: ["Each refund review has a recorded result."],
        domain_vocabulary: ["refund request", "daily limit", "amount limit"],
      },
      interaction_contract: {
        primary_decision: rule,
        next_actions: [rule],
        completion: "Each refund review has a recorded result.",
        make_easy: ["Compare the daily count and amount with both limits."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "daily limit", "amount limit"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");
  const workflowFor = (count, amount) => {
    const candidate = refundWorkflowCandidate();
    const action =
      `Finance managers approve ${count} refund requests of ${amount} dollars each per day`;
    candidate.workflow.surface_name = "Daily refund limits";
    candidate.workflow.work_units = ["Review daily refunds"];
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.workflow.completion_state = "The daily refund review is complete.";
    candidate.surface_set[0].name = "Daily refund limits";
    candidate.surface_set[0].purpose = "Review daily refund evidence and limits.";
    candidate.surface_set[0].sections = ["Refunds", "Evidence", "Limits"];
    candidate.surface_set[0].controls = [action];
    candidate.handoff.reason = "The daily refund review is complete.";
    candidate.handoff.next_action = "Send the refund result.";
    return candidate;
  };
  const allowedReview = reviewUiWorkflowCandidate(
    brief,
    workflowFor(10, 50),
    { activity_review: activityReview, context_items: contextItems },
  );
  assert.equal(allowedReview.review_status, "ready_for_review");
  for (const [count, amount] of [[11, 50], [10, 101]]) {
    const review = reviewUiWorkflowCandidate(
      brief,
      workflowFor(count, amount),
      { activity_review: activityReview, context_items: contextItems },
    );
    assert.equal(review.review_status, "needs_source_context");
    assert.ok(review.guardrails.authority_mismatches.length > 0);
  }
}

{
  const brief = "Design refund decisions for finance managers.";
  const contextItems = [
    {
      id: "refund-decision-authority",
      kind: "user_answer",
      content: "Finance managers may approve or deny refund requests.",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Finance managers decide refund requests.",
        participants: ["finance managers"],
        objective: "Reach a decision for each refund request.",
        outcomes: ["Each refund request has a decision."],
        domain_vocabulary: ["refund request", "approval", "denial"],
      },
      interaction_contract: {
        primary_decision: "Finance managers may approve or deny refund requests.",
        next_actions: ["Approve refund", "Deny refund"],
        completion: "Each refund request has a decision.",
        make_easy: ["Compare refund evidence before deciding."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "approval", "denial"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");

  for (const decisionPoint of [
    "Decide whether to approve or deny the refund",
    "Approve or deny the refund",
    "Decide whether the refund should be approved or denied",
  ]) {
    const candidate = refundWorkflowCandidate();
    candidate.workflow.surface_name = "Finance manager refund decisions";
    candidate.workflow.primary_actions = [
      "Finance managers approve refund",
      "Finance managers deny refund",
    ];
    candidate.workflow.decision_points = [decisionPoint];
    candidate.workflow.completion_state = "Refund decision is recorded.";
    candidate.surface_set[0].name = "Finance manager refund decisions";
    candidate.surface_set[0].purpose = "Finance managers decide refund requests.";
    candidate.surface_set[0].controls = [
      "Finance managers approve refund",
      "Finance managers deny refund",
    ];
    candidate.handoff.next_action = "Send approval notice.";
    const review = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(
      review.review_status,
      "ready_for_review",
      `Coordinated decision lost its shared refund object: ${decisionPoint}`,
    );
  }
}

{
  const brief = "Design a clinical record review workspace for assigned nurses.";
  const contextItems = [
    {
      id: "assigned-record-policy",
      kind: "authoritative_source",
      source_ref: "policy://records/assigned-team/v1",
      content:
        "Assigned nurses may view patient medical records for patients on their assigned care team.",
    },
  ];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity:
          "Assigned nurses review assigned patient medical records for patients on their assigned care team.",
        participants: ["assigned nurses"],
        objective:
          "Review assigned patient medical records for patients on the assigned care team.",
        outcomes: ["The record review is complete."],
        domain_vocabulary: ["patient medical records", "assigned care team"],
      },
      interaction_contract: {
        primary_decision:
          "Assigned nurses may view patient medical records for patients on their assigned care team.",
        next_actions: [
          "View assigned patient medical records for patients on the assigned care team.",
        ],
        completion: "The record review is complete.",
        make_easy: ["Inspect the assigned patient record."],
      },
      disclosure_policy: {
        terms_to_use: ["patient medical records", "assigned care team"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");
  assert.ok(
    activityReview.activity_case.claims.some(
      (claim) =>
        claim.risk_category === "sensitive_disclosure_boundary" &&
        claim.authoritative_source_refs.includes("assigned-record-policy"),
    ),
  );

  const recordWorkflow = (action) => ({
    workflow: {
      surface_name: "Assigned nurse record review",
      topology: "workspace",
      work_units: ["Review record"],
      primary_actions: [action],
      decision_points: [action],
      completion_state: "The record review is complete.",
    },
    surface_set: [
      {
        name: "Assigned nurse record review",
        purpose: action,
        sections: ["Patient record"],
        controls: [action],
        relationship_to_workflow: "Primary review surface.",
      },
    ],
    handoff: {
      next_owner: "assigned nurse",
      reason: "Review complete.",
      next_action: "Close the review.",
    },
    diagnostics: { implementation_terms: [] },
  });

  for (const action of [
    "Assigned nurses view assigned patient medical records",
    "Patient medical records visible to assigned nurses",
    "Assigned patient medical records are available to assigned nurses",
  ]) {
    const preciseReview = reviewUiWorkflowCandidate(
      brief,
      recordWorkflow(action),
      { activity_review: activityReview, context_items: contextItems },
    );
    assert.equal(
      preciseReview.review_status,
      "ready_for_review",
      `Authorized viewer availability must remain view authority: ${action}`,
    );
  }

  for (const action of [
    "Assigned nurses may view records",
    "Assigned nurses may view all records",
    "View records",
    "Open records",
  ]) {
    const review = reviewUiWorkflowCandidate(brief, recordWorkflow(action), {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(review.review_status, "needs_source_context");
    assert.ok(review.guardrails.authority_mismatches.length > 0);
  }
}

{
  const shortBrief = "Create a refund triage workspace for support leads.";
  const portableCandidate = {
    activity_model: {
      activity: "Support leads triage refund requests.",
      participants: ["support leads"],
      objective: "Determine the most appropriate next route for each request.",
      outcomes: ["Each request has a clear recommended route and rationale."],
      domain_vocabulary: ["refund request", "evidence", "policy review"],
    },
    interaction_contract: {
      primary_decision: "Choose the recommended route for the refund request.",
      next_actions: ["Recommend approval", "Recommend policy review", "Request evidence"],
      completion: "Leave each request with a recommended route and rationale.",
      make_easy: ["Compare request evidence before recommending a route."],
    },
    disclosure_policy: {
      terms_to_use: ["refund request", "evidence", "policy review"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const moduleUrl = new URL("../src/index.mjs", import.meta.url).href;
  const childScript = [
    `import { reviewActivityModelCandidate } from ${JSON.stringify(moduleUrl)};`,
    `const packet = reviewActivityModelCandidate(${JSON.stringify(shortBrief)}, ${JSON.stringify(portableCandidate)});`,
    "process.stdout.write(JSON.stringify(packet));",
  ].join("\n");
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", childScript],
    { encoding: "utf8" },
  );
  assert.equal(child.status, 0, child.stderr);
  const crossProcessActivityReview = JSON.parse(child.stdout);
  const recommendationWorkflow = refundWorkflowCandidate();
  recommendationWorkflow.workflow.primary_actions = [
    "Recommend approval",
    "Recommend policy review",
    "Request evidence",
  ];
  recommendationWorkflow.workflow.decision_points = [
    "Choose the recommended route for the refund request.",
  ];
  recommendationWorkflow.surface_set[0].controls = [
    "Recommend approval",
    "Recommend policy review",
    "Request evidence",
    "Send recommendation",
  ];
  const crossProcessWorkflowReview = reviewUiWorkflowCandidate(
    shortBrief,
    recommendationWorkflow,
    { activity_review: crossProcessActivityReview },
  );
  assert.equal(crossProcessWorkflowReview.review_status, "ready_for_review");
  assert.deepEqual(
    crossProcessWorkflowReview.activity_review.activity_case,
    crossProcessActivityReview.activity_case,
  );

  const fabricatedLegacyReview = structuredClone(crossProcessActivityReview);
  delete fabricatedLegacyReview.activity_case;
  delete fabricatedLegacyReview.source.activity_case_review_integrity;
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(shortBrief, recommendationWorkflow, {
        activity_review: fabricatedLegacyReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_integrity_invalid",
  );

  const forgedAuthorityReview = structuredClone(crossProcessActivityReview);
  const forgedPrimaryDecisionClaim =
    forgedAuthorityReview.activity_case.claims.find(
      (claim) => claim.path === "interaction_contract.primary_decision",
    );
  forgedPrimaryDecisionClaim.value = "Approve the refund request.";
  forgedPrimaryDecisionClaim.origin = "source_supported";
  forgedPrimaryDecisionClaim.source_refs = ["brief"];
  forgedAuthorityReview.candidate.interaction_contract.primary_decision =
    "Approve the refund request.";
  const reissuedForgedAuthorityReview = recomputeActivityReviewReceipt(
    forgedAuthorityReview,
  );
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(shortBrief, refundWorkflowCandidate(), {
        activity_review: reissuedForgedAuthorityReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_revalidation_failed",
  );

  const contradictoryRootReview = structuredClone(crossProcessActivityReview);
  contradictoryRootReview.candidate.activity_model.activity =
    "Support leads review renewal-risk accounts.";
  const reissuedContradictoryRootReview = recomputeActivityReviewReceipt(
    contradictoryRootReview,
  );
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(shortBrief, recommendationWorkflow, {
        activity_review: reissuedContradictoryRootReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_revalidation_failed" &&
      error.details.field ===
        "activity_review.activity_case.claims.activity",
    "A recomputed activity-review receipt must not carry a root activity that contradicts the retained activity-case claim.",
  );

  const duplicateRootClaimReview = structuredClone(crossProcessActivityReview);
  duplicateRootClaimReview.activity_case.claims.push({
    ...structuredClone(
      duplicateRootClaimReview.activity_case.claims.find(
        (claim) => claim.id === "activity",
      ),
    ),
    id: "duplicate_activity",
    value: "Account executives review renewal-risk accounts.",
  });
  const reissuedDuplicateRootClaimReview = recomputeActivityReviewReceipt(
    duplicateRootClaimReview,
  );
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(shortBrief, recommendationWorkflow, {
        activity_review: reissuedDuplicateRootClaimReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_revalidation_failed" &&
      error.details.field ===
        "activity_review.activity_case.claims.activity",
    "A recomputed activity-review receipt must not hide a contradictory duplicate base claim.",
  );

  const forgedGroundingReview = structuredClone(crossProcessActivityReview);
  const inferredReviewObjectiveClaim = forgedGroundingReview.activity_case.claims.find(
    (claim) => claim.id === "objective" && claim.source_refs.length === 0,
  );
  assert.ok(inferredReviewObjectiveClaim);
  inferredReviewObjectiveClaim.origin = "source_supported";
  inferredReviewObjectiveClaim.source_refs = ["brief"];
  inferredReviewObjectiveClaim.confidence = "high";
  const reissuedForgedGroundingReview = recomputeActivityReviewReceipt(
    forgedGroundingReview,
  );
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(shortBrief, recommendationWorkflow, {
        activity_review: reissuedForgedGroundingReview,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "activity_review_revalidation_failed" &&
      error.details.field === "activity_review.activity_case.claims",
    "A recomputed activity-review receipt must not relabel an inferred base claim as source-supported.",
  );
}

{
  const workflowFor = (action, surfaceName = "Decision workspace") => ({
    workflow: {
      surface_name: surfaceName,
      topology: "workspace",
      work_units: ["Review request"],
      primary_actions: [action],
      decision_points: [action],
      completion_state: "The request review is complete.",
    },
    surface_set: [{
      name: surfaceName,
      purpose: "Review request evidence.",
      sections: ["Request", "Evidence"],
      controls: [action],
      relationship_to_workflow: "Keeps the request and evidence together.",
    }],
    handoff: {
      next_owner: "operations",
      reason: "The request review is complete.",
      next_action: "Send the review result.",
    },
    diagnostics: { implementation_terms: [] },
  });
  const brief =
    "Design a decision workspace for finance managers and support leads.";
  const contextItems = [{
    id: "separate-authority-clauses",
    kind: "user_answer",
    content:
      "Finance managers may approve refund requests. Support leads may approve travel expenses.",
  }];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity:
          "Finance managers and support leads review refund requests and travel expenses.",
        participants: ["finance managers", "support leads"],
        objective: "Determine the route for each request.",
        outcomes: ["Each request has a recorded result."],
        domain_vocabulary: ["refund request", "travel expense"],
      },
      interaction_contract: {
        primary_decision: "Determine the route for each request.",
        next_actions: [
          "Finance managers may approve refund requests.",
          "Support leads may approve travel expenses.",
        ],
        completion: "Each request has a recorded result.",
        make_easy: ["Compare the request with its decision owner."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "travel expense"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");

  for (const action of [
    "Finance managers approve refund requests",
    "Support leads approve travel expenses",
  ]) {
    const review = reviewUiWorkflowCandidate(brief, workflowFor(action), {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(review.review_status, "ready_for_review", action);
  }
  for (const action of [
    "Finance managers approve travel expenses",
    "Support leads approve refund requests",
    "Managers approve refund requests",
  ]) {
    const review = reviewUiWorkflowCandidate(brief, workflowFor(action), {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(review.review_status, "needs_source_context", action);
    assert.ok(review.guardrails.authority_mismatches.length > 0, action);
  }
}

{
  const brief = "Design request decisions for finance managers.";
  const contextItems = [{
    id: "compound-authority-clause",
    kind: "user_answer",
    content:
      "Finance managers may approve refund requests and deny travel expenses.",
  }];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Finance managers review refund requests and travel expenses.",
        participants: ["finance managers"],
        objective: "Determine the route for each request.",
        outcomes: ["Each request has a recorded result."],
        domain_vocabulary: ["refund request", "travel expense"],
      },
      interaction_contract: {
        primary_decision: "Determine the route for each request.",
        next_actions: [
          "Finance managers may approve refund requests.",
          "Finance managers may deny travel expenses.",
        ],
        completion: "Each request has a recorded result.",
        make_easy: ["Compare each request with the available route."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "travel expense"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  assert.equal(activityReview.review_status, "ready_for_review");
  const workflowFor = (action) => {
    const candidate = refundWorkflowCandidate();
    candidate.workflow.surface_name = "Finance request decisions";
    candidate.workflow.work_units = ["Review request"];
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.workflow.completion_state = "The request review is complete.";
    candidate.surface_set[0].name = "Finance request decisions";
    candidate.surface_set[0].purpose = "Review request evidence.";
    candidate.surface_set[0].sections = ["Request", "Evidence"];
    candidate.surface_set[0].controls = [action];
    candidate.handoff.reason = "The request review is complete.";
    candidate.handoff.next_action = "Send the review result.";
    return candidate;
  };

  for (const action of [
    "Finance managers approve refund requests",
    "Finance managers deny travel expenses",
  ]) {
    const review = reviewUiWorkflowCandidate(brief, workflowFor(action), {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(review.review_status, "ready_for_review", action);
  }
  for (const action of [
    "Finance managers approve travel expenses",
    "Finance managers deny refund requests",
  ]) {
    const review = reviewUiWorkflowCandidate(brief, workflowFor(action), {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(review.review_status, "needs_source_context", action);
    assert.ok(review.guardrails.authority_mismatches.length > 0, action);
  }
}

{
  const overreachingActivityCandidate = {
    activity_model: {
      activity: "Support leads review refund evidence.",
      participants: ["support leads", "finance managers"],
      objective: "Prepare a refund recommendation for finance.",
      outcomes: ["Finance receives a recommendation and rationale."],
      domain_vocabulary: ["refund evidence", "finance review", "rationale"],
    },
    interaction_contract: {
      primary_decision: "Approve the refund request.",
      next_actions: ["Recommend approval", "Request evidence"],
      completion: "Finance receives the recommended route and rationale.",
      make_easy: ["Compare evidence before recommending a route."],
    },
    disclosure_policy: {
      terms_to_use: ["refund evidence", "finance review", "rationale"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const recommendationOnlyBriefs = [
    "A support lead can recommend approval to a finance manager, but does not make the final decision. The activity is reviewing refund evidence and leaving finance with a recommendation and rationale.",
    "A support lead recommends that finance approve the refund request, but the support lead does not make the final decision. The activity is reviewing refund evidence and leaving finance with a recommendation and rationale.",
    "A support lead recommends approving the refund request to finance, but the support lead does not make the final decision. The activity is reviewing refund evidence and leaving finance with a recommendation and rationale.",
  ];

  for (const recommendationOnlyBrief of recommendationOnlyBriefs) {
    const overreachingActivityReview = reviewActivityModelCandidate(
      recommendationOnlyBrief,
      overreachingActivityCandidate,
    );
    const overreachingWorkflowReview = reviewUiWorkflowCandidate(
      recommendationOnlyBrief,
      refundWorkflowCandidate(),
      { activity_review: overreachingActivityReview },
    );

    assert.equal(overreachingActivityReview.review_status, "needs_source_context");
    assert.equal(
      overreachingActivityReview.activity_case.claims.find(
        (claim) => claim.path === "interaction_contract.primary_decision",
      ).origin,
      "model_inferred",
    );
    assert.equal(overreachingWorkflowReview.review_status, "needs_source_context");
    assert.ok(
      overreachingWorkflowReview.guardrails.authority_mismatches.some(
        (entry) => entry.unsupported_authority_verbs.includes("approve"),
      ),
    );
  }

  const recommendationOnlyReview = reviewActivityModelCandidate(
    recommendationOnlyBriefs[0],
    overreachingActivityCandidate,
  );
  for (const action of [
    "Support leads decide the refund",
    "Support leads choose the refund outcome",
    "Support leads set the final outcome",
    "Support leads make the final call",
    "Support leads greenlight the refund",
    "Support leads give the go-ahead",
  ]) {
    const candidate = refundWorkflowCandidate();
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.surface_set[0].controls = [action];
    const review = reviewUiWorkflowCandidate(
      recommendationOnlyBriefs[0],
      candidate,
      { activity_review: recommendationOnlyReview },
    );
    assert.equal(
      review.review_status,
      "needs_source_context",
      `Decision euphemism must not promote recommendation authority: ${action}`,
    );
    assert.ok(
      review.guardrails.authority_mismatches.length > 0,
      `Decision euphemism produced no authority mismatch: ${action}`,
    );
  }
}

{
  const delegatedAuthorityBriefs = [
    "Support leads may recommend that finance managers approve refund requests.",
    "Support leads may suggest finance managers approve refund requests.",
    "Support leads can propose that finance managers approve refund requests.",
    "Support leads may advise finance managers to approve refund requests.",
    "Support leads may ask finance managers to approve refund requests.",
    "Support leads may request that finance managers approve refund requests.",
    "Support leads may nominate finance managers to approve refund requests.",
  ];

  for (const brief of delegatedAuthorityBriefs) {
    const activityReview = reviewActivityModelCandidate(brief, {
      activity_model: {
        activity: "Support leads review refund requests.",
        participants: ["support leads"],
        objective: "Prepare a recommendation for finance.",
        outcomes: ["Finance receives a recommendation and rationale."],
        domain_vocabulary: ["refund request", "recommendation", "finance"],
      },
      interaction_contract: {
        primary_decision: "Choose what to recommend to finance.",
        next_actions: ["Send the recommendation to finance."],
        completion: "Finance receives a recommendation and rationale.",
        make_easy: ["Compare refund evidence before recommending a route."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "recommendation", "finance"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    });
    const candidate = refundWorkflowCandidate();
    const action = "Support leads approve refund requests";
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.surface_set[0].controls = [action];
    const workflowReview = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
    });

    assert.equal(
      workflowReview.review_status,
      "needs_source_context",
      `Indirect recommendation or delegation must not confer approval authority: ${brief}`,
    );
    assert.ok(
      workflowReview.guardrails.authority_mismatches.some((entry) =>
        entry.unsupported_authority_verbs.includes("approve")),
      `Indirect recommendation or delegation produced no approval mismatch: ${brief}`,
    );
  }
}

{
  const constrainedAuthorityCases = [
    {
      rule: "Finance managers may approve refund requests for enterprise customers only.",
      overreach: "Finance managers approve refund requests",
    },
    {
      rule: "Finance managers may approve refund requests in California.",
      overreach: "Finance managers approve refund requests",
    },
    {
      rule: "Finance managers may approve refund requests during business hours.",
      overreach: "Finance managers approve refund requests",
    },
    {
      rule: "Finance managers may approve all refund requests except international refund requests.",
      overreach: "Finance managers approve international refund requests",
    },
    {
      rule: "Finance managers may approve all refund requests except fraud-related refund requests.",
      overreach: "Finance managers approve fraud-related refund requests",
    },
    {
      rule: "Finance managers may approve refund requests unless the account is frozen.",
      overreach: "Finance managers approve refund requests for frozen accounts",
    },
    ...[
      "if fraud review is complete",
      "provided that fraud review is complete",
      "subject to completed fraud review",
      "contingent on completed fraud review",
      "with fraud review complete",
      "following fraud review",
      "once fraud review is complete",
      "so long as fraud review is complete",
    ].map((condition) => ({
      rule: `Finance managers may approve refund requests up to 100 dollars ${condition}.`,
      overreach: "Finance managers approve refund requests up to 100 dollars",
    })),
    ...[
      "low-risk",
      "verified",
      "domestic",
      "standard",
      "non-fraudulent",
      "pre-approved",
      "business-customer",
      "premium-customer",
      "same-day",
      "internal",
      "eligible",
      "documented",
      "routine",
      "non-escalated",
      "card-purchase",
      "subscription",
    ].map((modifier) => ({
      rule: `Finance managers may approve ${modifier} refund requests up to 100 dollars.`,
      overreach: "Finance managers approve refund requests up to 100 dollars",
    })),
    ...[
      "per transaction",
      "per customer",
      "per day",
      "monthly",
      "total",
    ].map((cadence) => ({
      rule: `Finance managers may approve refund requests up to 100 dollars ${cadence}.`,
      overreach: "Finance managers approve refund requests up to 100 dollars",
    })),
    {
      rule: "Finance managers may approve max 10 refund requests per day.",
      overreach: "Finance managers approve 10 refund requests",
    },
    {
      rule: "Finance managers may approve max 10 refund requests per customer.",
      overreach: "Finance managers approve 10 refund requests",
    },
  ];

  const workflowFor = (action) => {
    const candidate = refundWorkflowCandidate();
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.surface_set[0].controls = [action];
    return candidate;
  };

  for (const [index, { rule, overreach }] of constrainedAuthorityCases.entries()) {
    const brief = "Design constrained refund approval for finance managers.";
    const contextItems = [{
      id: `constrained-refund-authority-${index}`,
      kind: "user_answer",
      content: rule,
    }];
    const activityReview = reviewActivityModelCandidate(
      brief,
      {
        activity_model: {
          activity: "Finance managers review refund requests.",
          participants: ["finance managers"],
          objective: rule,
          outcomes: ["Each refund request has a recorded result."],
          domain_vocabulary: ["refund request", "approval"],
        },
        interaction_contract: {
          primary_decision: rule,
          next_actions: [rule],
          completion: "Each refund request has a recorded result.",
          make_easy: ["Compare the request with the approval rule."],
        },
        disclosure_policy: {
          terms_to_use: ["refund request", "approval"],
          hidden_implementation_terms: [],
          translation_candidates: [],
          diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
        },
      },
      { context_items: contextItems },
    );
    assert.equal(activityReview.review_status, "ready_for_review", rule);

    const preservedReview = reviewUiWorkflowCandidate(
      brief,
      workflowFor(rule),
      { activity_review: activityReview, context_items: contextItems },
    );
    assert.equal(
      preservedReview.review_status,
      "ready_for_review",
      `An exactly preserved authority constraint must remain valid: ${rule}`,
    );

    const overreachReview = reviewUiWorkflowCandidate(
      brief,
      workflowFor(overreach),
      { activity_review: activityReview, context_items: contextItems },
    );
    assert.equal(
      overreachReview.review_status,
      "needs_source_context",
      `Dropping or reversing an authority constraint must block: ${rule}`,
    );
    assert.ok(
      overreachReview.guardrails.authority_mismatches.length > 0,
      `Constraint loss produced no authority mismatch: ${rule}`,
    );
  }

  const aliasRule =
    "Finance managers may approve low-risk refund requests up to 100 dollars.";
  const aliasContextItems = [{
    id: "low-risk-refund-authority",
    kind: "user_answer",
    content: aliasRule,
  }];
  const aliasActivityReview = reviewActivityModelCandidate(
    "Design constrained refund approval for finance managers.",
    {
      activity_model: {
        activity: "Finance managers review refund requests.",
        participants: ["finance managers"],
        objective: aliasRule,
        outcomes: ["Each refund request has a recorded result."],
        domain_vocabulary: ["refund request", "approval"],
      },
      interaction_contract: {
        primary_decision: aliasRule,
        next_actions: [aliasRule],
        completion: "Each refund request has a recorded result.",
        make_easy: ["Compare the request with the approval rule."],
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "approval"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: aliasContextItems },
  );
  assert.equal(aliasActivityReview.review_status, "ready_for_review");

  for (const action of [
    "Finance managers approve low risk refunds up to 100 dollars",
    "Finance managers approve a low-risk refund request up to 100 dollars",
    "Finance managers approve a low risk refund case up to 100 dollars",
    "Finance managers approve a low-risk refund item up to 100 dollars",
  ]) {
    const review = reviewUiWorkflowCandidate(
      "Design constrained refund approval for finance managers.",
      workflowFor(action),
      {
        activity_review: aliasActivityReview,
        context_items: aliasContextItems,
      },
    );
    assert.equal(
      review.review_status,
      "ready_for_review",
      `Harmless object alias must preserve the authority scope: ${action}`,
    );
  }
}

{
  const governedAuthorityCases = [
    {
      participant: "Legal reviewers",
      subject: "contract exceptions",
      rule: "Legal reviewers may approve contract exceptions.",
      risk: "authoritative_safety_rule",
    },
    {
      participant: "Regulatory analysts",
      subject: "license applications",
      rule: "Regulatory analysts may approve license applications.",
      risk: "authoritative_safety_rule",
    },
    {
      participant: "Court clerks",
      subject: "legal filings",
      rule: "Court clerks may approve legal filings.",
      risk: "authoritative_safety_rule",
    },
    {
      participant: "Lawyers",
      subject: "settlement offers",
      rule: "Lawyers may approve settlement offers.",
      risk: "authoritative_safety_rule",
    },
    ...[
      "employee salary records",
      "employee home addresses",
      "customer email addresses",
      "student education records",
      "employee performance reviews",
      "criminal history records",
      "email addresses",
      "home addresses",
      "full names",
      "dates of birth",
      "genetic information",
      "sexual orientation data",
      "religious beliefs",
      "union membership",
      "precise location data",
      "IP addresses",
      "financial transaction history",
      "credit scores",
      "tax returns",
      "insurance claims",
      "disability status",
      "immigration status",
      "employee performance ratings",
      "background screening results",
      "patient lab results",
      "therapy notes",
    ].map((subject) => ({
      participant: "Managers",
      subject,
      rule: `Managers may view ${subject}.`,
      risk: "sensitive_disclosure_boundary",
    })),
    ...[
      ["customer records", "delete customer records"],
      ["customer accounts", "cancel a customer account"],
      ["employee records", "terminate an employee"],
      ["user accounts", "suspend a user account"],
      ["fund transfers", "transfer funds"],
      ["tax filings", "submit a tax filing"],
      ["wire transfers", "send a wire transfer"],
      ["securities trades", "place a securities trade"],
      ["production builds", "deploy a production build"],
      ["audit logs", "erase audit logs"],
      ["backups", "purge backups"],
      ["bank accounts", "close a bank account"],
      ["accounts", "deactivate an account"],
      ["signed contracts", "overwrite a signed contract"],
      ["evidence", "destroy evidence"],
    ].map(([subject, action]) => ({
      participant: "Operations managers",
      subject,
      rule: `Operations managers may ${action}.`,
      risk: "authoritative_irreversible_action",
    })),
  ];

  for (const [index, { participant, subject, rule, risk }] of governedAuthorityCases.entries()) {
    const brief = `Design ${subject} review.`;
    const contextItems = [{
      id: `ungoverned-protected-source-${index}`,
      kind: "user_answer",
      content: rule,
    }];
    const activityReview = reviewActivityModelCandidate(
      brief,
      {
        activity_model: {
          activity: `${participant} review ${subject}.`,
          participants: [participant],
          objective: rule,
          outcomes: [`Each ${subject} item has a recorded result.`],
          domain_vocabulary: [subject],
        },
        interaction_contract: {
          primary_decision: rule,
          next_actions: [rule],
          completion: `Each ${subject} item has a recorded result.`,
          make_easy: [`Compare evidence for ${subject}.`],
        },
        disclosure_policy: {
          terms_to_use: [subject],
          hidden_implementation_terms: [],
          translation_candidates: [],
          diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
        },
      },
      { context_items: contextItems },
    );
    assert.equal(
      activityReview.review_status,
      "needs_source_context",
      `A user answer must not govern ${risk}: ${rule}`,
    );
    assert.ok(
      activityReview.activity_case.unresolved_ambiguities.some(
        (entry) => entry.category === risk,
      ),
      `Protected category ${risk} was not surfaced: ${rule}`,
    );

    const candidate = refundWorkflowCandidate();
    const action = rule.replace(" may ", " ").replace(/\.$/, "");
    candidate.workflow.primary_actions = [action];
    candidate.workflow.decision_points = [action];
    candidate.surface_set[0].controls = [action];
    const workflowReview = reviewUiWorkflowCandidate(brief, candidate, {
      activity_review: activityReview,
      context_items: contextItems,
    });
    assert.equal(
      workflowReview.review_status,
      "needs_source_context",
      `Workflow must not recover authority from an ungoverned protected source: ${rule}`,
    );
    assert.ok(
      workflowReview.guardrails.authority_mismatches.length > 0,
      `Protected workflow produced no authority mismatch: ${rule}`,
    );
  }
}

{
  const brief = "Design medication request review for nurses.";
  const contextItems = [{
    id: "medication-restriction",
    kind: "authoritative_source",
    source_ref: "policy://medication/physician-approval/v1",
    content: "Nurses must not administer medication before physician approval.",
  }];
  const activityReview = reviewActivityModelCandidate(
    brief,
    {
      activity_model: {
        activity: "Nurses review medication requests.",
        participants: ["nurses"],
        objective: "Verify the required evidence before continuing.",
        outcomes: ["Requests without required evidence remain pending."],
        domain_vocabulary: ["medication", "physician approval"],
      },
      interaction_contract: {
        primary_decision:
          "Nurses must not administer medication before physician approval.",
        next_actions: [
          "Do not administer medication before physician approval.",
        ],
        completion: "The review records whether the required evidence is present.",
        make_easy: ["See whether the required evidence is present."],
      },
      disclosure_policy: {
        terms_to_use: ["medication", "physician approval"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    { context_items: contextItems },
  );
  const candidate = refundWorkflowCandidate();
  candidate.workflow.surface_name = "Medication request review";
  candidate.workflow.work_units = ["Review request", "Check required evidence"];
  candidate.workflow.primary_actions = [
    "Do not administer medication before physician approval",
  ];
  candidate.workflow.decision_points = [
    "Do not administer medication before physician approval",
  ];
  candidate.workflow.completion_state = "The evidence review is complete.";
  candidate.surface_set[0].name = "Medication request review";
  candidate.surface_set[0].purpose = "Review the required evidence.";
  candidate.surface_set[0].sections = ["Request", "Required evidence"];
  candidate.surface_set[0].controls = ["Return for required evidence"];
  candidate.handoff.next_action = "Return for required evidence.";
  const review = reviewUiWorkflowCandidate(brief, candidate, {
    activity_review: activityReview,
    context_items: contextItems,
  });

  assert.equal(review.review_status, "ready_for_review");
  assert.deepEqual(review.guardrails.authority_mismatches, []);
}

{
  const rawControlReview = await reviewUiImplementationCandidate(
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

  const approvedReview = await reviewUiImplementationCandidate(
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
      design_system_provenance: defaultDesignSystemProvenance(),
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(
    approvedReview.implementation_review_status,
    "passed",
    JSON.stringify(approvedReview.checks.visual_composition),
  );
  assert.equal(approvedReview.checks.approved_primitives.status, "pass");
  assert.equal(approvedReview.next_agent_action, "accept");
  assert.equal(approvedReview.autofix_loop.status, "passed");
  assert.deepEqual(approvedReview.findings, []);

  const refundOperatorReview = await reviewUiImplementationCandidate(
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

  const tokenMetadataReview = await reviewUiImplementationCandidate(
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

  const componentPatternCandidate = refundOperatorImplementationCandidate({
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
  });
  const componentPatternReview = await reviewUiImplementationCandidate(
    componentPatternCandidate,
    { implementation_contract: implementationContract },
  );

  assert.equal(componentPatternReview.implementation_review_status, "passed");
  assert.equal(componentPatternReview.checks.approved_primitives.status, "pass");
  assert.equal(componentPatternCandidate.primitives_used.includes("action_button"), false);
  assert.equal(
    componentPatternReview.checks.approved_primitives.used.includes("action_button"),
    false,
  );
  assert.equal(componentPatternReview.checks.component_contracts.status, "pass");
  assert.equal(componentPatternReview.checks.component_contracts.reviewed, true);
  assert.equal(componentPatternReview.checks.pattern_contracts.status, "pass");
  assert.equal(componentPatternReview.checks.pattern_contracts.reviewed, true);
  assert.ok(
    componentPatternReview.checks.component_contracts.used_component_ids.includes(
      "action_button",
    ),
  );
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

  const componentIdInPrimitivesReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      primitives_used: [
        "FormField",
        "CheckboxGroup",
        "CheckboxOption",
        "ModalActions",
        "action_button",
      ],
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(componentIdInPrimitivesReview.implementation_review_status, "failed");
  assert.equal(
    componentIdInPrimitivesReview.checks.approved_primitives.status,
    "fail",
  );
  assert.ok(
    componentIdInPrimitivesReview.checks.approved_primitives.invented.includes(
      "action_button",
    ),
  );
  const knownComponentPrimitiveDiagnostics =
    componentIdInPrimitivesReview.checks.approved_primitives
      .known_component_ids_in_primitives_used ??
    componentIdInPrimitivesReview.checks.approved_primitives
      .known_component_contract_ids_in_primitives_used ??
    componentIdInPrimitivesReview.checks.approved_primitives
      .component_contract_ids_in_primitives_used ??
    componentIdInPrimitivesReview.checks.approved_primitives
      .component_ids_in_primitives_used ??
    componentIdInPrimitivesReview.checks.approved_primitives.known_component_ids;
  assert.ok(
    Array.isArray(knownComponentPrimitiveDiagnostics),
    "approved_primitives should expose known component ids used as primitives.",
  );
  assert.ok(knownComponentPrimitiveDiagnostics.includes("action_button"));
  const componentPrimitiveFinding = componentIdInPrimitivesReview.findings.find(
    (finding) => finding.check === "approved_primitives",
  );
  assert.ok(componentPrimitiveFinding);
  assert.deepEqual(componentPrimitiveFinding.evidence, ["action_button"]);
  assert.deepEqual(
    componentPrimitiveFinding.routing_diagnostics.invalid_primitives,
    ["action_button"],
  );
  assert.ok(
    componentPrimitiveFinding.routing_diagnostics.known_component_contract_ids.includes(
      "action_button",
    ),
  );
  assert.ok(
    componentPrimitiveFinding.routing_diagnostics.allowed_approved_primitives.includes(
      "FormField",
    ),
  );
  assert.ok(
    componentPrimitiveFinding.routing_diagnostics.evidence_field_routing
      .component_contract_ids.includes(
        "component_contract_evidence.components[].id",
      ),
  );
  const primitiveRepairText = JSON.stringify(
    componentIdInPrimitivesReview.repair_instructions.groups.primitive_defaults,
  );
  assert.ok(primitiveRepairText.includes("component_contract_evidence.components[].id"));
  assert.ok(primitiveRepairText.includes("states_covered"));
  assert.match(primitiveRepairText, /move|route|put|place/i);

  const patternIdInPrimitivesReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      primitives_used: [
        "FormField",
        "CheckboxGroup",
        "CheckboxOption",
        "ModalActions",
        "operator_review",
      ],
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(patternIdInPrimitivesReview.implementation_review_status, "failed");
  assert.equal(
    patternIdInPrimitivesReview.checks.approved_primitives.status,
    "fail",
  );
  assert.ok(
    patternIdInPrimitivesReview.checks.approved_primitives.invented.includes(
      "operator_review",
    ),
  );
  assert.ok(
    patternIdInPrimitivesReview.checks.approved_primitives
      .known_pattern_ids_in_primitives_used.includes("operator_review"),
  );
  const patternPrimitiveFinding = patternIdInPrimitivesReview.findings.find(
    (finding) => finding.check === "approved_primitives",
  );
  assert.ok(patternPrimitiveFinding);
  assert.deepEqual(patternPrimitiveFinding.evidence, ["operator_review"]);
  assert.deepEqual(
    patternPrimitiveFinding.routing_diagnostics.invalid_primitives,
    ["operator_review"],
  );
  assert.ok(
    patternPrimitiveFinding.routing_diagnostics.known_pattern_contract_ids.includes(
      "operator_review",
    ),
  );
  assert.ok(
    patternPrimitiveFinding.routing_diagnostics.evidence_field_routing
      .pattern_contract_ids.includes("pattern_contract_evidence.pattern_id"),
  );
  const patternPrimitiveRepairText = JSON.stringify(
    patternIdInPrimitivesReview.repair_instructions.groups.primitive_defaults,
  );
  assert.ok(patternPrimitiveRepairText.includes("pattern_contract_evidence.pattern_id"));
  assert.match(patternPrimitiveRepairText, /move|route|put|place/i);

  const unknownComponentReview = await reviewUiImplementationCandidate(
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

  const missingComponentStateReview = await reviewUiImplementationCandidate(
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

  const componentEvidenceMisuseReview = await reviewUiImplementationCandidate(
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

  const patternMismatchReview = await reviewUiImplementationCandidate(
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

  const topLevelPatternMismatchReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      pattern_id: "workbench",
      surface_type: "operator_review",
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(topLevelPatternMismatchReview.implementation_review_status, "failed");
  assert.equal(topLevelPatternMismatchReview.checks.pattern_contracts.status, "fail");
  assert.equal(topLevelPatternMismatchReview.checks.pattern_contracts.reviewed, true);
  assert.equal(
    topLevelPatternMismatchReview.checks.pattern_contracts.selected_pattern_id,
    "workbench",
  );
  assert.equal(
    topLevelPatternMismatchReview.checks.pattern_contracts.selected_surface_type,
    "operator_review",
  );
  assert.equal(
    topLevelPatternMismatchReview.checks.pattern_contracts.required_surface_type,
    "workbench",
  );

  const selfDeclaredWorkbenchPatternCandidate = refundOperatorImplementationCandidate({
    pattern_contract_evidence: {
      pattern_id: "workbench",
      surface_type: "workbench",
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
  });
  const selfDeclaredWorkbenchPatternReview = await reviewUiImplementationCandidate(
    selfDeclaredWorkbenchPatternCandidate,
    { implementation_contract: implementationContract },
  );

  assert.equal(selfDeclaredWorkbenchPatternReview.implementation_review_status, "passed");
  assert.equal(
    selfDeclaredWorkbenchPatternReview.checks.pattern_contracts.status,
    "pass",
  );

  for (const options of [
    { surface_type: "operator_review" },
    { surfaceType: "operator_review" },
    { surface_review: { recommended_surface_type: "operator_review" } },
    { frontend_generation_context: { surface_type: "operator_review" } },
  ]) {
    const selectedSurfaceReview = await reviewUiImplementationCandidate(
      selfDeclaredWorkbenchPatternCandidate,
      { implementation_contract: implementationContract, ...options },
    );

    assert.equal(selectedSurfaceReview.implementation_review_status, "failed");
    assert.equal(selectedSurfaceReview.checks.pattern_contracts.status, "fail");
    assert.equal(
      selectedSurfaceReview.checks.pattern_contracts.selected_surface_type,
      "operator_review",
    );
    assert.equal(
      selectedSurfaceReview.checks.pattern_contracts.required_surface_type,
      "workbench",
    );
    assert.ok(
      selectedSurfaceReview.findings.some(
        (finding) =>
          finding.check === "pattern_contracts" &&
          finding.message.includes("selected surface type"),
      ),
    );
  }

  const missingPatternEvidenceReview = await reviewUiImplementationCandidate(
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

  const componentCannotSatisfyAccessibilityReview = await reviewUiImplementationCandidate(
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

  const fontIconMetadataReview = await reviewUiImplementationCandidate(
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

  const missingDefaultProvenanceReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      design_system_provenance: null,
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(missingDefaultProvenanceReview.implementation_review_status, "failed");
  assert.equal(missingDefaultProvenanceReview.candidate_artifact_status, "not_an_artifact");
  assert.equal(
    missingDefaultProvenanceReview.design_system_acceptance_status,
    "failed",
  );
  assert.equal(
    missingDefaultProvenanceReview.checks.design_system_provenance.status,
    "fail",
  );
  assert.equal(
    missingDefaultProvenanceReview.checks.design_system_provenance.provenance_present,
    false,
  );
  assert.ok(
    missingDefaultProvenanceReview.checks.design_system_provenance.findings.some(
      (finding) => finding.message.includes("missing required design-system provenance"),
    ),
  );
  assert.ok(
    missingDefaultProvenanceReview.repair_instructions.groups.design_system_source.some(
      (entry) => entry.check === "design_system_provenance",
    ),
  );
  assert.ok(
    missingDefaultProvenanceReview.generation_gates.some(
      (gate) => gate.id === "design_system_gate" && gate.status === "failed",
    ),
  );

  const incompleteDefaultProvenanceReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      design_system_provenance: {
        source: "present",
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(incompleteDefaultProvenanceReview.implementation_review_status, "failed");
  assert.equal(
    incompleteDefaultProvenanceReview.design_system_acceptance_status,
    "failed",
  );
  assert.equal(
    incompleteDefaultProvenanceReview.checks.design_system_provenance.status,
    "fail",
  );
  assert.ok(
    incompleteDefaultProvenanceReview.checks.design_system_provenance
      .missing_required_proof.includes("visual_token_source"),
  );
  assert.ok(
    incompleteDefaultProvenanceReview.checks.design_system_provenance.findings.some(
      (finding) => finding.evidence?.missing_proof?.includes("source_export_proof"),
    ),
  );

  const wrongSourceProvenanceReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      design_system_provenance: {
        source: "local app stylesheet",
        token_source: "hard-coded app styles in generated CSS",
        typography_source: "handwritten local CSS font stack",
        icon_source: "inline SVG copied into the component",
        renderer_component_source: "bespoke local components",
        import_boundary: "not checked",
        token_prefix_source: "local --app-* variables",
        source_exports: "not checked",
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(wrongSourceProvenanceReview.implementation_review_status, "failed");
  assert.equal(wrongSourceProvenanceReview.candidate_artifact_status, "not_an_artifact");
  assert.equal(
    wrongSourceProvenanceReview.design_system_acceptance_status,
    "failed",
  );
  assert.ok(
    wrongSourceProvenanceReview.checks.design_system_provenance
      .missing_required_proof.includes("visual_token_source"),
  );
  assert.ok(
    wrongSourceProvenanceReview.checks.design_system_provenance
      .missing_required_proof.includes("import_package_boundary"),
  );

  const genericDefaultProvenanceReview = await reviewUiImplementationCandidate(
    refundOperatorImplementationCandidate({
      design_system_provenance: {
        source: "JudgmentKit",
        token_source: "JudgmentKit",
        typography_source: "JudgmentKit",
        icon_source: "JudgmentKit",
        renderer_component_source: "JudgmentKit",
        import_boundary: "JudgmentKit",
        token_prefix_source: "JudgmentKit",
        source_exports: "JudgmentKit source_exports",
      },
    }),
    { implementation_contract: implementationContract },
  );

  assert.equal(genericDefaultProvenanceReview.implementation_review_status, "failed");
  assert.equal(
    genericDefaultProvenanceReview.checks.design_system_provenance.status,
    "fail",
  );
  for (const missingProof of [
    "visual_token_source",
    "typography_source",
    "icon_asset_source",
    "renderer_component_source",
    "source_export_proof",
  ]) {
    assert.ok(
      genericDefaultProvenanceReview.checks.design_system_provenance
        .missing_required_proof.includes(missingProof),
      `generic default provenance should miss ${missingProof}`,
    );
  }

  const defaultProvenanceFailureReview = await reviewUiImplementationCandidate(
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

  const defaultProvenancePassReview = await reviewUiImplementationCandidate(
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
        token_source: "/design-system/visual-token-adapter.json",
        icon_source: "get_icon_svg('check') from the JudgmentKit icon catalog",
        typography_source: "/design-system/visual-token-adapter.json",
        renderer_component_source:
          "implementation_contract.default_ai_native_design_system.component_contracts",
        import_boundary:
          "No visual, typography, icon, or component package imports outside the active design-system source.",
        token_prefix_source: "implementation_contract.design_system_source.token_prefixes",
        source_exports: "implementation_contract.design_system_source.source_exports",
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

  const incompleteExternalReviewContract = {
    ...implementationContract,
    design_system_source: {
      ...implementationContract.design_system_source,
      mode: "external_design_system",
      definition_point: "implementation_contract.design_system_source",
    },
  };

  await assert.rejects(
    reviewUiImplementationCandidate(refundOperatorImplementationCandidate(), {
        implementation_contract: incompleteExternalReviewContract,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "incomplete_design_system_authority",
    "review flow should reject external_design_system mode without complete external authority.",
  );

  const acmeIconCatalog = {
    source: "external_design_system",
    library: "acme-icons",
    package: "@acme/icons",
    version: "repo-approved",
    icon_count: 120,
    license: "MIT",
    notice: "Repo-approved Acme icon adapter.",
    mcp_tools: [],
  };
  const externalTokenAdapterWithDefaultComponents = {
    ...implementationContract.visual_token_adapter,
    mode: "external_design_system",
    token_families: ["color"],
    css_custom_properties: [
      {
        name: "--acme-color-text",
        role: "text",
        family: "color",
        value: "theme.colors.text",
        usage: "Acme text color",
      },
    ],
    icon_catalog: acmeIconCatalog,
  };
  const misleadingDefaultComponentExternalContract = {
    ...implementationContract,
    visual_token_adapter: externalTokenAdapterWithDefaultComponents,
    design_system_source: {
      ...implementationContract.design_system_source,
      mode: "external_design_system",
      name: "Acme UI",
      package: "@acme/ui",
      definition_point: "implementation_contract.design_system_adapter",
      token_prefixes: ["--acme-"],
      icon_catalog: acmeIconCatalog,
      renderer_components:
        implementationContract.default_ai_native_design_system.component_contracts.map(
          (component) => component.id,
        ),
      component_contract_source:
        "implementation_contract.design_system_adapter.components",
    },
  };

  await assert.rejects(
    reviewUiImplementationCandidate(refundOperatorImplementationCandidate(), {
        implementation_contract: misleadingDefaultComponentExternalContract,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "incomplete_design_system_authority",
    "review flow should reject external_design_system contracts that still point at default component contracts.",
  );

  const materialImplementationContract = createUiImplementationContract({
    design_system_adapter: completeMaterialDesignSystemAdapter(),
  }).implementation_contract;
  const externalMaterialReview = await reviewUiImplementationCandidate(
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

  const materialWithSourceExportsContract = createUiImplementationContract({
    design_system_adapter: {
      ...completeMaterialDesignSystemAdapter(),
      source_exports: {
        component_source:
          "implementation_contract.design_system_adapter.components",
      },
    },
  }).implementation_contract;
  const genericExternalSourceExportsReview = await reviewUiImplementationCandidate(
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
    }),
    { implementation_contract: materialWithSourceExportsContract },
  );

  assert.equal(genericExternalSourceExportsReview.implementation_review_status, "failed");
  assert.equal(
    genericExternalSourceExportsReview.checks.design_system_provenance.status,
    "fail",
  );
  assert.ok(
    genericExternalSourceExportsReview.checks.design_system_provenance
      .missing_required_proof.includes("source_export_proof"),
  );

  const concreteExternalSourceExportsReview = await reviewUiImplementationCandidate(
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
      design_system_provenance: {
        ...materialDesignSystemProvenance(),
        source_exports:
          "implementation_contract.design_system_adapter.components",
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
    { implementation_contract: materialWithSourceExportsContract },
  );

  assert.equal(concreteExternalSourceExportsReview.implementation_review_status, "passed");
  assert.equal(
    concreteExternalSourceExportsReview.checks.design_system_provenance.status,
    "pass",
  );

  const materialWithArraySourceExportsContract = createUiImplementationContract({
    design_system_adapter: {
      ...completeMaterialDesignSystemAdapter(),
      source_exports: {
        component_sources: [
          "implementation_contract.design_system_adapter.components",
        ],
      },
    },
  }).implementation_contract;
  const arrayExternalSourceExportsReview = await reviewUiImplementationCandidate(
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
      design_system_provenance: {
        ...materialDesignSystemProvenance(),
        source_exports:
          "implementation_contract.design_system_adapter.components",
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
    { implementation_contract: materialWithArraySourceExportsContract },
  );

  assert.equal(arrayExternalSourceExportsReview.implementation_review_status, "passed");
  assert.equal(
    arrayExternalSourceExportsReview.checks.design_system_provenance.status,
    "pass",
  );

  const objectComponentsMaterialImplementationContract =
    createUiImplementationContract({
      design_system_adapter:
        completeMaterialDesignSystemObjectComponentsAdapter(),
    }).implementation_contract;
  const objectComponentIds =
    objectComponentsMaterialImplementationContract.default_ai_native_design_system
      .component_contracts.map((contract) => contract.id);

  assert.deepEqual(objectComponentIds, ["Stack", "Button", "Alert"]);
  assert.deepEqual(
    objectComponentsMaterialImplementationContract.design_system_source
      .renderer_components,
    ["Stack", "Button", "Alert"],
  );
  assert.equal(
    objectComponentsMaterialImplementationContract.design_system_source
      .component_contract_source,
    "implementation_contract.design_system_adapter.components",
  );

  const objectComponentsExternalReview = await reviewUiImplementationCandidate(
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
      accessibility_evidence: {
        forced_colors: {
          status: "pass",
          method: "forced-colors emulation",
          notes: "Material UI theme variables preserve visible text and focus.",
        },
      },
    }),
    {
      implementation_contract: objectComponentsMaterialImplementationContract,
    },
  );

  assert.equal(
    objectComponentsExternalReview.implementation_review_status,
    "passed",
  );
  assert.deepEqual(
    objectComponentsExternalReview.checks.component_contracts.allowed_component_ids,
    ["Stack", "Button", "Alert"],
  );

  const mixedExternalReview = await reviewUiImplementationCandidate(
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
      design_system_provenance: materialDesignSystemProvenance(),
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

  const unsupportedIconIdReview = await reviewUiImplementationCandidate(
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

  const unsupportedFontIconReview = await reviewUiImplementationCandidate(
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

  const inaccessibleIconReview = await reviewUiImplementationCandidate(
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

  const tokenMisuseReview = await reviewUiImplementationCandidate(
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

  const tokenCannotSatisfyPrimitiveReview = await reviewUiImplementationCandidate(
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

  const riskyActionReview = await reviewUiImplementationCandidate(
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

  const stoppedActionReview = await reviewUiImplementationCandidate(
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

  const dataLeakReview = await reviewUiImplementationCandidate(
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
    const missingCoreReview = await reviewUiImplementationCandidate(
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

  const notApplicableWithoutRationaleReview = await reviewUiImplementationCandidate(
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

  const visualHeavyReview = await reviewUiImplementationCandidate(
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

  const missingContrastReview = await reviewUiImplementationCandidate(
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

  const contrastFailureReview = await reviewUiImplementationCandidate(
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

  const responsiveAliasReview = await reviewUiImplementationCandidate(
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

  const customWidgetReview = await reviewUiImplementationCandidate(
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

  const formMissingLabelsReview = await reviewUiImplementationCandidate(
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

  const motionMissingEvidenceReview = await reviewUiImplementationCandidate(
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

  const overlayMissingEvidenceReview = await reviewUiImplementationCandidate(
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

  const denseControlMissingTargetReview = await reviewUiImplementationCandidate(
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
  const contract = sessionsButtonLocalAuthorityContract();
  const tokenIslandReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract),
    { implementation_contract: contract },
  );

  assert.equal(tokenIslandReview.implementation_review_status, "failed");
  assert.equal(tokenIslandReview.checks.approved_primitives.status, "pass");
  assert.deepEqual(tokenIslandReview.checks.approved_primitives.used, ["button"]);
  assert.equal(
    tokenIslandReview.checks.approved_primitives.used.includes(
      "button.secondary-action",
    ),
    false,
  );
  assert.equal(tokenIslandReview.checks.component_contracts.status, "pass");
  assert.ok(
    tokenIslandReview.checks.component_contracts.used_component_ids.includes(
      "button.secondary-action",
    ),
  );
  assert.ok(
    tokenIslandReview.checks.local_component_authority,
    "review should include checks.local_component_authority.",
  );
  assert.equal(tokenIslandReview.checks.local_component_authority.status, "fail");
  assert.ok(
    tokenIslandReview.findings.some(
      (finding) => finding.check === "local_component_authority",
    ),
  );
  const localAuthorityRepairText = JSON.stringify(
    tokenIslandReview.repair_instructions.groups.local_component_authority,
  );
  assert.ok(localAuthorityRepairText.includes("button.secondary-action"));
  assert.ok(localAuthorityRepairText.includes(".secondary-action"));
  assert.ok(localAuthorityRepairText.includes("local_component_authority_evidence"));
  assert.match(localAuthorityRepairText, /--jk-\*|--jk-/);
  assert.match(localAuthorityRepairText, /layout|overflow/);
  assert.ok(
    tokenIslandReview.repair_instructions.groups.local_component_authority.some(
      (instruction) =>
        instruction.required_change.includes("button.secondary-action") &&
        instruction.required_change.includes("local_component_authority_evidence"),
    ),
  );

  const spoofedFamilyEvidenceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [".sessions-button"],
        required_family: ".sessions-button",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: ".sessions-button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(spoofedFamilyEvidenceReview.implementation_review_status, "failed");
  assert.equal(
    spoofedFamilyEvidenceReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    spoofedFamilyEvidenceReview.checks.local_component_authority
      .expected_families,
    contract.local_component_authority.families,
  );
  for (const family of ["button.secondary-action", ".secondary-action"]) {
    assert.ok(
      spoofedFamilyEvidenceReview.checks.local_component_authority
        .missing_inherited_families.includes(family),
      `spoofed evidence must still miss contract family ${family}`,
    );
  }

  const isolatedTokenIslandReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button
              aria-expanded="false"
              className="button secondary-action sessions-button"
            >
              Sessions ({count})
            </button>
          );
        }

        .sessions-button {
          --jk-color-surface: #ffffff;
          --jk-color-text: #17324d;
          --jk-color-border: #7d97b8;
          --jk-radius-control: 999px;
          background: var(--jk-color-surface);
          border: 1px solid var(--jk-color-border);
          border-radius: var(--jk-radius-control);
          color: var(--jk-color-text);
        }

        [aria-expanded="false"] {
          background: var(--jk-color-surface);
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action", ".secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            declarations: [
              "--jk-color-surface",
              "--jk-color-text",
              "--jk-color-border",
              "--jk-radius-control",
              "background",
              "border",
              "border-radius",
              "color",
            ],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(isolatedTokenIslandReview.implementation_review_status, "failed");
  assert.equal(
    isolatedTokenIslandReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    isolatedTokenIslandReview.checks.local_component_authority
      .missing_inherited_families,
    [],
  );
  assert.equal(
    isolatedTokenIslandReview.checks.local_component_authority
      .computed_style_evidence_passing,
    true,
  );
  assert.ok(
    isolatedTokenIslandReview.checks.local_component_authority
      .direct_token_uses.length > 0,
  );
  assert.ok(
    isolatedTokenIslandReview.checks.local_component_authority
      .visual_identity_recreations.length > 0,
  );
  assert.ok(
    isolatedTokenIslandReview.checks.local_component_authority
      .component_specific_selectors.includes('[aria-expanded="false"]'),
  );

  const noInheritanceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(noInheritanceReview.implementation_review_status, "failed");
  assert.equal(noInheritanceReview.checks.local_component_authority.status, "fail");
  assert.deepEqual(
    noInheritanceReview.checks.local_component_authority.missing_inherited_families,
    contract.local_component_authority.families,
  );
  assert.ok(
    noInheritanceReview.findings.some(
      (finding) =>
        finding.check === "local_component_authority" &&
        finding.message.includes("inherits the required local component family"),
    ),
  );

  const dottedClassFalsePositiveReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        required_family: ".button",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: ".button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(
    dottedClassFalsePositiveReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    dottedClassFalsePositiveReview.checks.local_component_authority
      .expected_families,
    contract.local_component_authority.families,
  );
  assert.deepEqual(
    dottedClassFalsePositiveReview.checks.local_component_authority
      .missing_inherited_families,
    contract.local_component_authority.families,
  );

  const buttonClassContract = createUiImplementationContract({
    repo_name: "Sessions",
    target_stack: "React",
    repo_evidence: ["app/components/button.css", "app/components/SessionsButton.tsx"],
    local_component_authority: {
      required: true,
      component: "SessionsButton",
      required_family: ".button",
      accepted_family_selectors: [".button"],
      component_specific_selector: ".sessions-button",
      evidence_field: "local_component_authority_evidence",
    },
    approved_primitives: ["button"],
    required_states: ["ready", "disabled", "focus-visible"],
    static_rules: ["npm run check"],
    browser_qa_checks: ["desktop viewport", "mobile viewport"],
  }).implementation_contract;
  const buttonClassContractReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(buttonClassContract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      component_contract_evidence: { components: [] },
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: ".button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: buttonClassContract },
  );

  assert.equal(buttonClassContractReview.implementation_review_status, "failed");
  assert.equal(
    buttonClassContractReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    buttonClassContractReview.checks.local_component_authority.expected_families,
    [".button"],
  );
  assert.deepEqual(
    buttonClassContractReview.checks.local_component_authority
      .missing_inherited_families,
    [".button"],
    "sessions-button must not satisfy a contract-level .button family requirement.",
  );

  const buttonClassCssModuleReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(buttonClassContract, {
      code: `
        import styles from "./button.module.css";

        export function SessionsButton({ count }) {
          return <button className={styles.button}>Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      component_contract_evidence: { components: [] },
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: ".button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: buttonClassContract },
  );

  assert.equal(
    buttonClassCssModuleReview.checks.local_component_authority.status,
    "pass",
    "CSS-module property access should satisfy an exact local class family.",
  );

  const buttonClassUnrelatedPropertyReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(buttonClassContract, {
      code: `
        const tone = theme.button;

        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      component_contract_evidence: { components: [] },
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: ".button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: buttonClassContract },
  );

  assert.equal(
    buttonClassUnrelatedPropertyReview.checks.local_component_authority.status,
    "fail",
    "unrelated object property access must not satisfy an exact local class family.",
  );

  const bareButtonFamilyContract = createUiImplementationContract({
    repo_name: "Sessions",
    target_stack: "React",
    repo_evidence: ["app/components/button.css", "app/components/SessionsButton.tsx"],
    local_component_authority: {
      required: true,
      component: "SessionsButton",
      required_family: "button",
      accepted_family_selectors: ["button"],
      component_specific_selector: ".sessions-button",
      evidence_field: "local_component_authority_evidence",
    },
    approved_primitives: ["button"],
    required_states: ["ready", "disabled", "focus-visible"],
    static_rules: ["npm run check"],
    browser_qa_checks: ["desktop viewport", "mobile viewport"],
  }).implementation_contract;
  const bareButtonImplicitSourceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(bareButtonFamilyContract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      component_contract_evidence: { components: [] },
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: bareButtonFamilyContract },
  );

  assert.equal(
    bareButtonImplicitSourceReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    bareButtonImplicitSourceReview.checks.local_component_authority
      .missing_inherited_families,
    ["button"],
    "a bare local family should not be inferred from a <button> element or sessions-button class token.",
  );

  const bareButtonExactClassTokenReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(bareButtonFamilyContract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="button sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      component_contract_evidence: { components: [] },
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: [],
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: bareButtonFamilyContract },
  );

  assert.equal(
    bareButtonExactClassTokenReview.checks.local_component_authority.status,
    "pass",
    "an exact class token should satisfy a bare local family without relying on tag-name matching.",
  );

  const bareButtonExplicitEvidenceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(bareButtonFamilyContract, {
      code: `
        export function SessionsButton({ count }) {
          return <button className="sessions-button">Sessions ({count})</button>;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      component_contract_evidence: { components: [] },
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button"],
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: bareButtonFamilyContract },
  );

  assert.equal(
    bareButtonExplicitEvidenceReview.checks.local_component_authority.status,
    "pass",
  );
  assert.deepEqual(
    bareButtonExplicitEvidenceReview.checks.local_component_authority
      .missing_inherited_families,
    [],
  );

  const arbitraryVisualOverrideReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button
              id="session-count-trigger"
              className="button secondary-action sessions-button session-count-trigger"
            >
              Sessions ({count})
            </button>
          );
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
        }

        .session-count-trigger {
          background: #ffffff;
          border: 1px solid #7d97b8;
          border-radius: 999px;
          box-shadow: 0 1px 2px rgb(15 23 42 / 20%);
          color: #17324d;
        }

        #session-count-trigger {
          background: #f8fbff;
          border: 1px solid #6d88a8;
          border-radius: 999px;
          box-shadow: 0 2px 4px rgb(15 23 42 / 20%);
          color: #10283f;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action", ".secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(arbitraryVisualOverrideReview.implementation_review_status, "failed");
  assert.equal(
    arbitraryVisualOverrideReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    arbitraryVisualOverrideReview.checks.local_component_authority
      .missing_inherited_families,
    [],
  );
  assert.equal(
    arbitraryVisualOverrideReview.checks.local_component_authority
      .computed_style_evidence_passing,
    true,
  );
  const visualOverrideSelectors = new Set(
    arbitraryVisualOverrideReview.checks.local_component_authority
      .visual_identity_recreations.map((entry) => entry.selector),
  );
  assert.ok(visualOverrideSelectors.has(".session-count-trigger"));
  assert.ok(visualOverrideSelectors.has("#session-count-trigger"));
  const expectedVisualOverrideDeclarations = new Map([
    [
      ".session-count-trigger",
      [
        "background: #ffffff",
        "border: 1px solid #7d97b8",
        "border-radius: 999px",
        "box-shadow: 0 1px 2px rgb(15 23 42 / 20%)",
        "color: #17324d",
      ],
    ],
    [
      "#session-count-trigger",
      [
        "background: #f8fbff",
        "border: 1px solid #6d88a8",
        "border-radius: 999px",
        "box-shadow: 0 2px 4px rgb(15 23 42 / 20%)",
        "color: #10283f",
      ],
    ],
  ]);
  for (const [selector, declarations] of expectedVisualOverrideDeclarations) {
    const recreation =
      arbitraryVisualOverrideReview.checks.local_component_authority
        .visual_identity_recreations.find((entry) => entry.selector === selector);
    assert.ok(recreation, `${selector} should be reported from parsed CSS`);
    assert.deepEqual(recreation.declarations, declarations);
  }

  const arbitraryTokenIslandReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button
              id="session-count-trigger"
              className="button secondary-action sessions-button session-count-trigger"
            >
              Sessions ({count})
            </button>
          );
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
        }

        .session-count-trigger {
          background: var(--jk-color-surface);
          color: var(--jk-color-text);
        }

        #session-count-trigger {
          background: var(--jk-color-surface);
          color: var(--jk-color-text);
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action", ".secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(arbitraryTokenIslandReview.implementation_review_status, "failed");
  assert.equal(
    arbitraryTokenIslandReview.checks.local_component_authority.status,
    "fail",
  );
  assert.deepEqual(
    arbitraryTokenIslandReview.checks.local_component_authority
      .missing_inherited_families,
    [],
  );
  assert.equal(
    arbitraryTokenIslandReview.checks.local_component_authority
      .computed_style_evidence_passing,
    true,
  );
  for (const selector of [".session-count-trigger", "#session-count-trigger"]) {
    const tokenUse =
      arbitraryTokenIslandReview.checks.local_component_authority
        .direct_token_uses.find((entry) => entry.selector === selector);
    assert.ok(tokenUse, `${selector} should be reported as a token island`);
    const customProperties = tokenUse.declarations.flatMap(
      (declaration) => declaration.custom_properties,
    );
    assert.ok(customProperties.includes("--jk-color-surface"));
    assert.ok(customProperties.includes("--jk-color-text"));
  }

  const globalRootSelectorReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button className="button secondary-action sessions-button">
              Sessions ({count})
            </button>
          );
        }

        html.dark {
          color-scheme: dark;
        }

        body.privacy-on {
          background: var(--jk-color-surface);
        }

        :root[data-theme="sessions"] {
          --jk-color-surface: #ffffff;
          --jk-color-text: #17324d;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          min-inline-size: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action", ".secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(globalRootSelectorReview.implementation_review_status, "passed");
  assert.equal(
    globalRootSelectorReview.checks.local_component_authority.status,
    "pass",
  );
  assert.deepEqual(
    globalRootSelectorReview.checks.local_component_authority
      .visual_identity_recreations,
    [],
  );
  assert.deepEqual(
    globalRootSelectorReview.checks.local_component_authority.direct_token_uses,
    [],
  );

  const rootScopedComponentSelectorReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button
              id="session-count-trigger"
              className="button secondary-action sessions-button session-count-trigger"
            >
              Sessions ({count})
            </button>
          );
        }

        html.dark .session-count-trigger {
          background: var(--jk-color-surface);
          color: var(--jk-color-text);
        }

        :root[data-theme="sessions"] #session-count-trigger {
          background: var(--jk-color-surface);
          color: var(--jk-color-text);
        }

        *.session-count-trigger {
          border-radius: 999px;
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          min-inline-size: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action", ".secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            rule_categories: ["layout", "overflow"],
            visual_identity_declarations: [],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(
    rootScopedComponentSelectorReview.implementation_review_status,
    "failed",
  );
  assert.equal(
    rootScopedComponentSelectorReview.checks.local_component_authority.status,
    "fail",
  );
  for (const selector of [
    "html.dark .session-count-trigger",
    ':root[data-theme="sessions"] #session-count-trigger',
  ]) {
    assert.ok(
      rootScopedComponentSelectorReview.checks.local_component_authority
        .direct_token_uses.some((entry) => entry.selector === selector),
      `${selector} should be scanned as a root-scoped component token island`,
    );
  }
  assert.ok(
    rootScopedComponentSelectorReview.checks.local_component_authority
      .visual_identity_recreations.some(
        (entry) => entry.selector === "*.session-count-trigger",
      ),
    "universal-qualified component selectors should not be treated as global root selectors.",
  );

  const structuredSelectorEvidenceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button className="button secondary-action sessions-button">
              Sessions ({count})
            </button>
          );
        }

        .sessions-button {
          display: inline-flex;
          max-inline-size: 100%;
          overflow: hidden;
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action", ".secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        componentSpecificSelectors: [
          {
            selector: ".sessions-button",
            declarations: [
              "display",
              "background: var(--jk-color-surface)",
            ],
            visualIdentityDeclarations: [
              "border: 1px solid var(--jk-color-border)",
              "color",
            ],
          },
          {
            selector: ".session-count-trigger",
            declarations: ["max-inline-size: 100%"],
            directTokenUses: ["--jk-color-text"],
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(
    structuredSelectorEvidenceReview.implementation_review_status,
    "failed",
  );
  assert.equal(
    structuredSelectorEvidenceReview.checks.local_component_authority.status,
    "fail",
  );
  assert.ok(
    structuredSelectorEvidenceReview.checks.local_component_authority
      .structured_component_specific_selectors.includes(".sessions-button"),
  );
  assert.ok(
    structuredSelectorEvidenceReview.checks.local_component_authority
      .structured_component_specific_selectors.includes(
        ".session-count-trigger",
      ),
  );
  const structuredVisualRecreation =
    structuredSelectorEvidenceReview.checks.local_component_authority
      .visual_identity_recreations.find(
        (entry) =>
          entry.selector === ".sessions-button" &&
          entry.source ===
            "local_component_authority_evidence.component_specific_selectors",
      );
  assert.ok(
    structuredVisualRecreation,
    "structured selector evidence should report visual identity declarations.",
  );
  assert.ok(
    structuredVisualRecreation.declarations.includes(
      "background: var(--jk-color-surface)",
    ),
  );
  assert.ok(
    structuredVisualRecreation.declarations.includes(
      "border: 1px solid var(--jk-color-border)",
    ),
  );
  const structuredTokenUses =
    structuredSelectorEvidenceReview.checks.local_component_authority
      .direct_token_uses.filter(
        (entry) =>
          entry.source ===
          "local_component_authority_evidence.component_specific_selectors",
      );
  assert.ok(
    structuredTokenUses.some((entry) =>
      entry.declarations.some((declaration) =>
        declaration.custom_properties.includes("--jk-color-surface"),
      ),
    ),
  );
  assert.ok(
    structuredTokenUses.some((entry) =>
      entry.declarations.some((declaration) =>
        declaration.custom_properties.includes("--jk-color-text"),
      ),
    ),
  );

  const nestedStructuredSelectorEvidenceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button className="button secondary-action sessions-button">
              Sessions ({count})
            </button>
          );
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: [
          {
            selector: ".sessions-button",
            declarations: {
              background: { value: "var(--jk-color-surface)" },
              border: { css_value: "1px solid var(--jk-color-border)" },
            },
          },
        ],
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(
    nestedStructuredSelectorEvidenceReview.implementation_review_status,
    "failed",
  );
  const nestedVisualRecreation =
    nestedStructuredSelectorEvidenceReview.checks.local_component_authority
      .visual_identity_recreations.find(
        (entry) =>
          entry.selector === ".sessions-button" &&
          entry.source ===
            "local_component_authority_evidence.component_specific_selectors",
      );
  assert.ok(
    nestedVisualRecreation,
    "nested structured declaration objects should preserve their CSS property names.",
  );
  assert.ok(
    nestedVisualRecreation.declarations.includes(
      "background: var(--jk-color-surface)",
    ),
  );
  assert.ok(
    nestedVisualRecreation.declarations.includes(
      "border: 1px solid var(--jk-color-border)",
    ),
  );

  const selectorMapStructuredEvidenceReview = await reviewUiImplementationCandidate(
    sessionsButtonCandidate(contract, {
      code: `
        export function SessionsButton({ count }) {
          return (
            <button className="button secondary-action sessions-button">
              Sessions ({count})
            </button>
          );
        }
      `,
      local_component_authority_evidence: {
        component: "SessionsButton",
        inherited_families: ["button.secondary-action"],
        required_family: "button.secondary-action",
        computed_style_evidence: {
          status: "pass",
          method: "browser computed-style comparison",
          compared_to: "button.secondary-action",
        },
        component_specific_selectors: {
          ".sessions-button": {
            background: { value: "var(--jk-color-surface)" },
            border: { css_value: "1px solid var(--jk-color-border)" },
          },
        },
      },
    }),
    { implementation_contract: contract },
  );

  assert.equal(
    selectorMapStructuredEvidenceReview.implementation_review_status,
    "failed",
  );
  const selectorMapVisualRecreation =
    selectorMapStructuredEvidenceReview.checks.local_component_authority
      .visual_identity_recreations.find(
        (entry) =>
          entry.selector === ".sessions-button" &&
          entry.source ===
            "local_component_authority_evidence.component_specific_selectors",
      );
  assert.ok(
    selectorMapVisualRecreation,
    "selector-map declaration objects should be scanned as declarations.",
  );
  assert.ok(
    selectorMapVisualRecreation.declarations.includes(
      "background: var(--jk-color-surface)",
    ),
  );
  assert.ok(
    selectorMapVisualRecreation.declarations.includes(
      "border: 1px solid var(--jk-color-border)",
    ),
  );

  const failedComputedStyleCandidate = repairedSessionsButtonCandidate(contract);
  failedComputedStyleCandidate.local_component_authority_evidence = {
    ...failedComputedStyleCandidate.local_component_authority_evidence,
    computed_style_evidence: {
      status: "fail",
      method: "browser computed-style comparison",
      compared_to: "button.secondary-action",
      differences: ["background differs from representative secondary action"],
    },
  };
  const failedComputedStyleReview = await reviewUiImplementationCandidate(
    failedComputedStyleCandidate,
    { implementation_contract: contract },
  );

  assert.equal(failedComputedStyleReview.implementation_review_status, "failed");
  assert.equal(
    failedComputedStyleReview.checks.local_component_authority.status,
    "fail",
  );
  assert.equal(
    failedComputedStyleReview.checks.local_component_authority
      .computed_style_evidence_present,
    true,
  );
  assert.equal(
    failedComputedStyleReview.checks.local_component_authority
      .computed_style_evidence_passing,
    false,
  );
  assert.ok(
    failedComputedStyleReview.findings.some(
      (finding) =>
        finding.check === "local_component_authority" &&
        finding.message.includes("passing computed-style evidence"),
    ),
  );

  const repairedReview = await reviewUiImplementationCandidate(
    repairedSessionsButtonCandidate(contract),
    { implementation_contract: contract },
  );

  assert.equal(repairedReview.implementation_review_status, "passed");
  assert.ok(
    repairedReview.checks.local_component_authority,
    "review should include checks.local_component_authority.",
  );
  assert.equal(repairedReview.checks.local_component_authority.status, "pass");
  assert.equal(repairedReview.checks.local_component_authority.reviewed, true);
  assert.deepEqual(
    repairedReview.checks.local_component_authority.missing_inherited_families,
    [],
  );
  assert.deepEqual(
    repairedReview.checks.local_component_authority.visual_identity_recreations,
    [],
  );
  assert.deepEqual(
    repairedReview.checks.local_component_authority.direct_token_uses,
    [],
  );
  assert.equal(repairedReview.checks.approved_primitives.status, "pass");
  assert.deepEqual(repairedReview.checks.approved_primitives.used, ["button"]);
  assert.equal(
    repairedReview.checks.approved_primitives.used.includes(
      "button.secondary-action",
    ),
    false,
  );
  assert.equal(repairedReview.checks.component_contracts.status, "pass");
  assert.ok(
    repairedReview.checks.component_contracts.used_component_ids.includes(
      "button.secondary-action",
    ),
  );
  assert.equal(
    repairedReview.findings.some(
      (finding) => finding.check === "local_component_authority",
    ),
    false,
  );
}

{
  const orderedReview = await reviewUiImplementationCandidate(
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

  const primaryFirstReview = await reviewUiImplementationCandidate(
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

  const rightmostCancelReview = await reviewUiImplementationCandidate(
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

  const wrongSubmitReview = await reviewUiImplementationCandidate(
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

  const destructiveReview = await reviewUiImplementationCandidate(
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

  const rtlReview = await reviewUiImplementationCandidate(
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
    refundRecommendationWorkflowCandidate(),
    { profile_id: "operator-review-ui" },
  );
  const handoff = createUiGenerationHandoff(workflowReview, {
    brief: REFUND_TRIAGE_BRIEF,
  });

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
  const releaseActionCandidate = integrationAuditWorkflowCandidate();
  releaseActionCandidate.workflow.primary_actions = ["Release risk report"];
  releaseActionCandidate.surface_set[0].controls = ["Release risk report"];
  const releaseActionReview = reviewUiWorkflowCandidate(
    DIAGNOSTIC_AUDIT_BRIEF,
    releaseActionCandidate,
  );
  assert.equal(releaseActionReview.review_status, "needs_source_context");
  assert.ok(
    releaseActionReview.guardrails.authority_mismatches.some((entry) =>
      entry.unsupported_authority_verbs.includes("release")),
    "An active release command must not inherit the noun-phrase exception for release risk.",
  );

  const workflowReview = reviewUiWorkflowCandidate(
    DIAGNOSTIC_AUDIT_BRIEF,
    integrationAuditWorkflowCandidate(),
  );
  const handoff = createUiGenerationHandoff(workflowReview, {
    brief: DIAGNOSTIC_AUDIT_BRIEF,
  });
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
