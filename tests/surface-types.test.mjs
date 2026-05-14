import assert from "node:assert/strict";

import {
  JudgmentKitInputError,
  buildUiWorkflowCandidateRequest,
  createActivityModelReview,
  createFrontendGenerationContext,
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
  A support admin updates an account settings form. The activity is entering required
  billing information, resolving validation errors, and submitting the change.
  The outcome is saved settings and a confirmation.
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
      steps: ["Review evidence", "Choose path", "Prepare handoff"],
      primary_actions: ["Approve refund", "Send to policy review", "Return for evidence"],
      decision_points: [
        "Decide whether the case should be approved, sent to policy review, or returned for missing evidence.",
      ],
      completion_state: "Clear handoff with next action and decision reason.",
    },
    primary_ui: {
      sections: ["Selected case", "Evidence checklist", "Policy review context", "Handoff"],
      controls: ["Approve refund", "Send to policy review", "Return for evidence", "Send handoff"],
      user_facing_terms: ["refund request", "policy review", "missing evidence", "handoff reason"],
    },
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
    },
    verification: {
      commands: ["npm test"],
      browser_checks: ["desktop review", "mobile review"],
      states_to_verify: ["empty queue", "selected item", "handoff sent"],
    },
  });

  assert.equal(workflowReview.surface_type, "workbench");
  assert.equal(handoff.surface_type, "workbench");
  assert.equal(frontendContext.frontend_context_status, "ready_for_frontend_implementation");
  assert.equal(frontendContext.surface_type, "workbench");
  assert.ok(frontendContext.implementation_contract.approved_primitives.length > 0);
  assert.equal(frontendContext.frontend_context.ui_library, "Material UI");
  assert.ok(frontendContext.implementation_guidance.required_sections.includes("Evidence checklist"));
  assert.ok(frontendContext.implementation_guidance.verification_expectations.commands.includes("npm test"));
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

console.log("surface type checks passed.");
