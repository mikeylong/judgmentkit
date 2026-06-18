import assert from "node:assert/strict";

import {
  JudgmentKitInputError,
  buildUiWorkflowCandidateRequest,
  createActivityModelReview,
  createFrontendGenerationContext,
  createFrontendImplementationSkillContext,
  createUiGenerationHandoff,
  recommendSurfaceTypes,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const PRODUCT_ANALYTICS_MARKETING = `
  A growth marketer is planning a product analytics landing page for prospects.
  The activity is orienting visitors to the analytics offer, explaining proof,
  and helping them decide whether to request a demo. The outcome is a clear
  signup or demo request.
`;

const PRODUCT_ANALYTICS_WORKBENCH = `
  A product analyst is reviewing product analytics cohorts during weekly
  experiment planning. The activity is comparing funnel evidence, deciding
  which experiment to prioritize, and handing the next action to the growth team.
  The outcome is a chosen experiment and handoff reason.
`;

const PRODUCT_ANALYTICS_DASHBOARD = `
  A product operations manager monitors a product analytics dashboard.
  The activity is tracking status, trends, alerts, and operational health
  with no decision required. The outcome is knowing whether follow-up is needed.
`;

const OPERATOR_REVIEW_BRIEF = `
  An operator reviews several AI agent findings, compares evidence and release risk,
  decides whether each finding is approved, blocked, deferred, tightened, or handed off,
  and leaves an audit receipt while raw tool call traces stay diagnostic.
  The outcome is an audit receipt with the selected next action.
`;

const SETUP_DEBUG_BRIEF = `
  A platform engineer is auditing an integration setup workflow. The activity is
  deciding whether a JSON schema change, prompt template update, and API endpoint
  check are safe to ship, then producing a handoff with the next fix for the platform team.
`;

const FORM_FLOW_BRIEF = `
  A support manager updates an account settings form. The activity is entering required
  billing information, resolving validation errors, and deciding whether the account
  settings are complete enough to submit. The outcome is saved settings and a confirmation.
  The billing information review produces a submitted change, validation decision,
  and confirmation for the support team.
`;

const CONVERSATION_BRIEF = `
  A support agent handles an open-ended live chat. The activity is continuing a
  customer conversation, replying with context, and recovering from failed sends.
  The outcome is a thread the agent can continue or close.
`;

const REFUND_TRIAGE_BRIEF = `
  A support lead is reviewing refund requests during the daily triage workflow.
  The activity is deciding whether a case should be approved, sent to policy review,
  or returned to the agent for missing evidence. The outcome is a clear handoff
  with the next action and the reason for the decision.
`;

function refundWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund escalation queue",
      topology: "workspace",
      work_units: ["Review evidence", "Choose path", "Prepare handoff"],
      primary_actions: ["Approve refund", "Send to policy review", "Return for evidence"],
      decision_points: [
        "Decide whether the case should be approved, sent to policy review, or returned for missing evidence.",
      ],
      completion_state: "Clear handoff with next action and decision reason.",
    },
    surface_set: [
      {
        name: "Refund escalation workspace",
        purpose: "Review evidence, choose the refund path, and send a handoff.",
        sections: ["Selected case", "Evidence checklist", "Policy review context", "Handoff"],
        controls: ["Approve refund", "Send to policy review", "Return for evidence", "Send handoff"],
        relationship_to_workflow: "Keeps evidence, decision controls, and handoff receipt together.",
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

function refundMultiSurfaceCandidate() {
  return {
    workflow: {
      surface_name: "Refund triage workspace",
      topology: "multi_surface",
      work_units: ["Case queue", "Evidence comparison", "Decision handoff"],
      primary_actions: ["Approve refund", "Send to policy review", "Return for evidence"],
      decision_points: [
        "Decide whether the case should be approved, sent to policy review, or returned for missing evidence.",
      ],
      completion_state: "Clear handoff with next action and decision reason.",
    },
    surface_set: [
      {
        name: "Case queue",
        purpose: "Select refund requests and preserve queue context.",
        sections: ["Refund queue", "Selected case"],
        controls: ["Select case"],
        relationship_to_workflow: "Feeds the selected case into review.",
      },
      {
        name: "Evidence workspace",
        purpose: "Compare evidence, choose an action, and send the handoff.",
        sections: ["Evidence checklist", "Policy review context", "Handoff"],
        controls: ["Approve refund", "Send to policy review", "Return for evidence", "Send handoff"],
        relationship_to_workflow: "Keeps decision controls adjacent to case evidence.",
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

function stagedFormCandidate() {
  return {
    workflow: {
      surface_name: "Billing information update",
      topology: "staged_flow",
      work_units: ["Enter billing information", "Resolve validation", "Review and submit"],
      primary_actions: ["Save billing information", "Submit change"],
      decision_points: [
        "Decide whether the billing information is complete enough to submit.",
      ],
      completion_state: "Saved settings with confirmation.",
    },
    surface_set: [
      {
        name: "Billing update form",
        purpose: "Guide required billing fields through validation and confirmation.",
        sections: ["Billing information", "Validation messages", "Review", "Confirmation"],
        controls: ["Save billing information", "Submit change"],
        relationship_to_workflow: "Stages required input before final submission.",
      },
    ],
    handoff: {
      next_owner: "support admin",
      reason: "Required billing information has been validated.",
      next_action: "Submit the saved settings change.",
    },
    diagnostics: {
      implementation_terms: [],
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

{
  const marketing = recommendSurfaceTypes(PRODUCT_ANALYTICS_MARKETING);
  const workbench = recommendSurfaceTypes(PRODUCT_ANALYTICS_WORKBENCH);
  const dashboard = recommendSurfaceTypes(PRODUCT_ANALYTICS_DASHBOARD);

  assert.equal(marketing.recommended_surface_type, "marketing");
  assert.equal(marketing.frontend_posture.density, "editorial");
  assert.ok(marketing.interaction_implications.primary_structure.includes("offer"));

  assert.equal(workbench.recommended_surface_type, "workbench");
  assert.equal(workbench.frontend_posture.density, "operational");
  assert.ok(workbench.frontend_posture.navigation_shape.includes("master-detail"));

  assert.equal(dashboard.recommended_surface_type, "dashboard_monitor");
  assert.ok(dashboard.blocked_surface_types.includes("operator_review"));
  assert.ok(dashboard.interaction_implications.primary_structure.includes("Status"));
}

{
  const operatorReview = recommendSurfaceTypes(OPERATOR_REVIEW_BRIEF);

  assert.equal(operatorReview.recommended_surface_type, "operator_review");
  assert.equal(operatorReview.confidence, "high");
  assert.equal(operatorReview.disclosure_implications.reveal_implementation_terms, false);
  assert.ok(operatorReview.evidence.implementation_terms_detected.some((entry) => entry.term === "tool call"));
}

{
  const setupDebug = recommendSurfaceTypes(SETUP_DEBUG_BRIEF);

  assert.equal(setupDebug.recommended_surface_type, "setup_debug_tool");
  assert.equal(setupDebug.disclosure_implications.reveal_implementation_terms, true);
  assert.ok(setupDebug.evidence.implementation_terms_detected.some((entry) => entry.term === "JSON schema"));
  assert.ok(setupDebug.frontend_posture.component_families.includes("log detail"));
}

{
  assert.equal(recommendSurfaceTypes(FORM_FLOW_BRIEF).recommended_surface_type, "form_flow");
  assert.equal(recommendSurfaceTypes(CONVERSATION_BRIEF).recommended_surface_type, "conversation");
}

{
  const activityReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const surfaceReview = recommendSurfaceTypes(REFUND_TRIAGE_BRIEF, {
    activity_review: activityReview,
  });
  const request = buildUiWorkflowCandidateRequest({
    brief: REFUND_TRIAGE_BRIEF,
    activity_review: activityReview,
    surface_review: surfaceReview,
  });

  assert.equal(request.metadata.recommended_surface_type, "workbench");
  assert.ok(JSON.stringify(request).includes("surface_guidance"));
  assert.equal(JSON.stringify(request).includes("component_families"), false);
}

{
  const surfaceReview = recommendSurfaceTypes(REFUND_TRIAGE_BRIEF);
  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    refundWorkflowCandidate(),
    { surface_review: surfaceReview },
  );
  const handoff = createUiGenerationHandoff(workflowReview);
  const frontendContext = createFrontendGenerationContext({
    ui_generation_handoff: handoff,
    surface_review: surfaceReview,
    frontend_context: {
      target_runtime: "React",
      ui_library: "Material UI",
      approved_component_families: ["queue", "detail panel", "decision controls"],
      files_or_entrypoints: ["src/App.jsx"],
      visual_requirements: ["case evidence hero image"],
      approved_visual_asset_sources: ["imagegen", "Three.js"],
    },
    verification: {
      commands: ["npm test"],
      browser_checks: ["desktop review", "mobile review"],
      states_to_verify: ["empty queue", "selected item", "handoff sent"],
    },
  });

  assert.equal(workflowReview.surface_type, "workbench");
  assert.equal(workflowReview.candidate.workflow.topology, "workspace");
  assert.deepEqual(workflowReview.candidate.workflow.work_units, [
    "Review evidence",
    "Choose path",
    "Prepare handoff",
  ]);
  assert.equal(workflowReview.candidate.workflow.stepper_eligibility.allowed, false);
  assert.equal(handoff.surface_type, "workbench");
  assert.equal(handoff.workflow.topology, "workspace");
  assert.ok(handoff.workflow.work_units.includes("Review evidence"));
  assert.equal(handoff.workflow.stepper_eligibility.allowed, false);
  assert.equal(frontendContext.frontend_context_status, "ready_for_frontend_implementation");
  assert.equal(frontendContext.surface_type, "workbench");
  assert.equal(frontendContext.workflow.topology, "workspace");
  assert.ok(frontendContext.surface_set.length > 0);
  assert.ok(frontendContext.implementation_contract.approved_primitives.length > 0);
  assert.equal(frontendContext.frontend_context.ui_library, "Material UI");
  assert.ok(
    frontendContext.implementation_guidance.visual_asset_policy.preferred_paths.some(
      (rule) => rule.includes("imagegen"),
    ),
  );
  assert.equal(
    frontendContext.implementation_guidance.accessibility_policy.contrast_targets.normal_text_min_ratio,
    4.5,
  );
  assert.ok(
    Boolean(
      frontendContext.implementation_guidance.accessibility_policy.conditional_evidence
        .visual_background_contrast,
    ),
  );
  assert.ok(
    frontendContext.frontend_context.visual_requirements.includes(
      "case evidence hero image",
    ),
  );
  assert.ok(
    frontendContext.frontend_context.approved_visual_asset_sources.includes(
      "Three.js",
    ),
  );
  assert.ok(frontendContext.implementation_guidance.required_sections.includes("Evidence checklist"));
  assert.ok(frontendContext.implementation_guidance.required_surfaces.length > 0);
  assert.ok(frontendContext.implementation_guidance.verification_expectations.commands.includes("npm test"));

  const skillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: frontendContext,
    target_client: "codex",
    design_system_adapter: {
      design_system_name: "Material UI",
      design_system_package: "@mui/material",
      role: "visual renderer after context selection",
      components: ["Stack", "Button", "Alert"],
      constraint:
        "Material UI changes the visual/component layer only; it does not supply activity fit.",
    },
  });

  assert.equal(skillContext.skill_context_status, "ready");
  assert.equal(skillContext.source_skill.name, "frontend-ui-implementation");
  assert.equal(skillContext.source_skill.raw_skill_exposed, false);
  assert.equal(skillContext.source.target_client, "codex");
  assert.equal(skillContext.design_system_policy.mode, "adapter_after_judgment");
  assert.equal(skillContext.design_system_policy.name, "Material UI");
  assert.ok(skillContext.design_system_policy.renderer_components.includes("Button"));
  assert.equal(skillContext.surface_type_guidance.workflow_topology, "workspace");
  assert.ok(skillContext.surface_type_guidance.work_units.includes("Review evidence"));
  assert.equal(skillContext.surface_type_guidance.stepper_eligibility.allowed, false);
  assert.ok(skillContext.surface_type_guidance.surface_set.length > 0);
  assert.ok(skillContext.approved_component_families.includes("queue"));
  assert.ok(skillContext.visual_requirements.includes("case evidence hero image"));
  assert.ok(skillContext.approved_visual_asset_sources.includes("imagegen"));
  assert.ok(
    skillContext.visual_asset_policy.preferred_paths.some((rule) =>
      rule.includes("imagegen"),
    ),
  );
  assert.ok(
    skillContext.accessibility_policy.required_evidence.includes(
      "accessibility_evidence.focus_visible",
    ),
  );
  assert.ok(skillContext.instruction_markdown.includes("Accessibility Policy"));
  assert.ok(skillContext.instruction_markdown.includes("normal text 4.5:1"));
  assert.ok(skillContext.instruction_markdown.includes("reduced_motion"));
  assert.ok(skillContext.instruction_markdown.includes("browser-rendered contrast"));
  assert.ok(
    skillContext.implementation_sequence.some((step) =>
      step.includes("substantive visuals"),
    ),
  );
  assert.ok(
    skillContext.implementation_sequence.some((step) =>
      step.includes("browser-rendered contrast evidence"),
    ),
  );
  assert.ok(
    skillContext.verification_checklist.some((item) =>
      item.includes("substantive visuals"),
    ),
  );
  assert.ok(
    skillContext.verification_checklist.some((item) =>
      item.includes("visual-background contrast evidence"),
    ),
  );
  assert.ok(skillContext.verification_checklist.includes("Run npm test"));
  assert.ok(
    skillContext.implementation_sequence.includes(
      "Call review_ui_implementation_candidate with generated code or evidence before final handoff.",
    ),
  );
  assert.ok(skillContext.instruction_markdown.includes("Frontend Implementation Skill Context"));
  assert.ok(skillContext.instruction_markdown.includes("Material UI"));
  assert.ok(skillContext.instruction_markdown.includes("Visual Asset Policy"));
  assert.ok(skillContext.instruction_markdown.includes("premium Three.js"));
}

{
  const surfaceReview = recommendSurfaceTypes(REFUND_TRIAGE_BRIEF);
  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    refundMultiSurfaceCandidate(),
    { surface_review: surfaceReview },
  );
  const handoff = createUiGenerationHandoff(workflowReview);

  assert.equal(workflowReview.review_status, "ready_for_review");
  assert.equal(workflowReview.candidate.workflow.topology, "multi_surface");
  assert.ok(workflowReview.candidate.workflow.work_units.includes("Evidence comparison"));
  assert.equal("steps" in workflowReview.candidate.workflow, false);
  assert.equal(workflowReview.candidate.surface_set.length, 2);
  assert.equal("primary_ui" in workflowReview.candidate, false);
  assert.ok(workflowReview.candidate.surface_set[1].sections.includes("Evidence checklist"));
  assert.equal(handoff.surface_set.length, 2);
  assert.equal("primary_surface" in handoff, false);
  assert.ok(handoff.surface_set[1].sections.includes("Policy review context"));
}

{
  const surfaceReview = recommendSurfaceTypes(REFUND_TRIAGE_BRIEF);
  const stagedWorkbench = refundMultiSurfaceCandidate();
  stagedWorkbench.workflow.topology = "staged_flow";
  stagedWorkbench.workflow.work_units = ["1. Review evidence", "2. Choose path", "3. Prepare handoff"];

  const workflowReview = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    stagedWorkbench,
    { surface_review: surfaceReview },
  );

  assert.equal(workflowReview.review_status, "needs_source_context");
  assert.equal(workflowReview.guardrails.stepper_eligibility.blocked, true);
  assert.equal(workflowReview.guardrails.stepper_eligibility.allowed, false);
  assert.ok(
    workflowReview.review.targeted_questions.some((question) =>
      question.includes("staged wizard or stepper"),
    ),
  );
}

{
  const surfaceReview = recommendSurfaceTypes(FORM_FLOW_BRIEF);
  const workflowReview = reviewUiWorkflowCandidate(
    FORM_FLOW_BRIEF,
    stagedFormCandidate(),
    { surface_review: surfaceReview },
  );

  assert.equal(workflowReview.review_status, "ready_for_review");
  assert.equal(workflowReview.surface_type, "form_flow");
  assert.equal(workflowReview.candidate.workflow.topology, "staged_flow");
  assert.equal(workflowReview.candidate.workflow.stepper_eligibility.allowed, true);
  assert.equal(workflowReview.guardrails.stepper_eligibility.blocked, false);
}

{
  assert.throws(
    () =>
      createFrontendGenerationContext({
        ui_generation_handoff: { handoff_status: "needs_source_context" },
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_context_blocked",
  );
}

{
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: { frontend_context_status: "blocked" },
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "frontend_skill_context_blocked",
  );
}

console.log("surface type checks passed.");
