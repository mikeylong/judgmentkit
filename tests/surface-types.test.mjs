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

const SYSTEM_RECOMMENDATIONS_OPERATOR_REVIEW_BRIEF = `
  A release lead reviews system recommendations before deployment. The activity is
  comparing evidence and risk, then deciding whether each recommendation should be
  approved, blocked, returned, or handed off. The outcome is an audit receipt with
  the selected next action.
`;

const HUMAN_CANDIDATE_WORKBENCH_BRIEF = `
  A recruiting coordinator reviews human candidates in a hiring queue. The activity
  is comparing interview evidence, deciding whether each candidate advances, is held,
  or is rejected, and leaving a hiring handoff.
`;

const DESIGN_SYSTEM_RECOMMENDATIONS_WORKBENCH_BRIEF = `
  A design system lead reviews design system recommendations for component usage.
  The activity is comparing adoption evidence, deciding which recommendations to
  accept, return, or hand off, and leaving an implementation handoff.
`;

const HYPHENATED_DESIGN_SYSTEM_RECOMMENDATIONS_WORKBENCH_BRIEF = `
  A design-system lead reviews design-system-generated recommendations for component
  usage. The activity is comparing adoption evidence, deciding which recommendations
  to accept, return, or hand off, and leaving an implementation handoff.
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

const SETTINGS_WORKSPACE_FORM_FLOW_BRIEF = `
  A support manager uses an account settings workspace. The activity is entering
  required billing information, resolving validation errors, and deciding whether
  the account settings are complete enough to submit. The outcome is saved settings
  and a confirmation.
`;

const SETTINGS_WORKSPACE_FIELD_LIST_FORM_FLOW_BRIEF = `
  A support manager uses an account settings workspace while reviewing a list of
  required billing fields. The activity is entering billing information, resolving
  validation errors, and deciding whether the account settings are complete enough
  to submit. The outcome is saved settings and a confirmation.
`;

const TRIAL_SIGNUP_CONVERSION_BRIEF = `
  A growth marketer is creating a public trial signup page for prospects.
  The activity is orienting visitors to the offer, proof, and plan fit, then
  capturing a qualified lead through a short signup form. The outcome is a
  completed trial request and follow-up path for sales.
`;

const ONBOARDING_SETTINGS_FORM_FLOW_BRIEF = `
  A customer success admin completes an onboarding settings form for a new
  account. The activity is entering required company details, resolving validation
  errors, reviewing completeness, and submitting the onboarding record. The
  outcome is a saved setup confirmation.
`;

const CHECKOUT_SUBMISSION_FORM_FLOW_BRIEF = `
  A shopper completes a checkout form. The activity is entering shipping and
  payment inputs, seeing required field validation, confirming totals, and
  submitting the order. The outcome is an order confirmation.
`;

const CASE_INTAKE_FORM_FLOW_BRIEF = `
  An intake coordinator completes a case intake form. The activity collects
  structured information, checks required fields and validation errors, then
  submits the case for confirmation. The outcome is an accepted case record.
`;

const OPERATIONAL_LEAD_MONITOR_BRIEF = `
  An operations lead monitors service health and alerts on an operational
  dashboard. The activity is tracking status, trends, and incident health at a
  glance; no operational decision is required on the surface. The outcome is
  awareness of whether follow-up is needed.
`;

const FIELD_SERVICE_DISPATCH_WORKBENCH_BRIEF = `
# Minimal Brief

Create a standalone HTML prototype for a same-day field-service dispatch workbench. A dispatcher is reviewing repair exceptions and needs to decide whether to reassign a technician, hold for parts, or escalate to customer care. Keep the selected visit, evidence, route impact, handoff owner, decision state, and next-action receipt visible together.

# Experiment Constraint

No design-system token, CSS variable, component rule, icon rule, or visual styling detail was manually added to the brief.

MCP endpoint: http://127.0.0.1:3333/mcp
`;

const MANUAL_APPLICATION_WORKBENCH_BRIEF = `
  A loan officer reviews a mortgage application. The activity is comparing
  borrower evidence, deciding whether the application advances, returns for
  missing documents, or escalates, and leaving a handoff receipt for the
  applicant.
`;

const CONTENT_REPORT_BRIEF = `
  A policy reader uses an internal compliance report. The activity is reading
  the report, understanding the summary, citing reference sections, and sharing
  a briefing with stakeholders. The outcome is a cited report and shared
  briefing.
`;

const RESEARCH_MEMO_CONTENT_REPORT_BRIEF = `
  A policy analyst reads an internal research memo report. The activity is
  reading a narrative summary, understanding evidence, citing references, and
  sharing a brief with stakeholders. The outcome is a cited memo summary.
`;

const PUBLIC_GUIDE_WITH_NEGATED_CTA_CONTENT_REPORT_BRIEF = `
  A public reader uses a product guide that explicitly has no signup, demo,
  pricing, or conversion CTA. The activity is reading explanatory documentation,
  learning concepts through a narrative explanation, following reference
  sections, and sharing the guide. The outcome is understanding, not lead
  capture.
`;

const CHARTED_REPORT_NO_OPERATIONAL_DECISION_BRIEF = `
  An executive reads a charted quarterly report. The activity is reading chart
  annotations, understanding the narrative summary, and sharing the report with
  stakeholders. No operational decision is required.
`;

const CONFIGURATION_WIZARD_SETUP_DEBUG_BRIEF = `
  A platform admin uses a configuration wizard for an SSO integration. The
  activity is configuring connection details, testing the API endpoint, resolving
  setup errors, and saving a validated configuration. The outcome is a working
  integration and diagnostic status.
`;

const SAFE_TO_SHIP_AUDIT_CHECKLIST_BRIEF = `
  A platform engineer uses a safe-to-ship audit checklist. The activity is
  inspecting a JSON schema change, prompt template update, and API endpoint
  behavior, testing release risk, and recording whether the integration is safe
  to ship. The outcome is a diagnostic handoff for the next fix.
`;

const CONVERSATION_BRIEF = `
  A support agent handles an open-ended live chat. The activity is continuing a
  customer conversation, replying with context, and recovering from failed sends.
  The outcome is a thread the agent can continue or close.
`;

const LAUNCH_TEAM_THREAD_CONVERSATION_BRIEF = `
  A product team uses a launch thread. The activity is an open-ended
  conversation where teammates ask questions, reply with context, and keep the
  thread active. The outcome is a continuing team thread.
`;

const TRIAGE_CHAT_CONVERSATION_BRIEF = `
  A service specialist uses a triage chat during an incident. The activity is an
  open-ended chat where people ask questions, respond, and share context while
  the thread stays active. The outcome is a continuing conversation.
`;

const SIGNUP_DEMO_CHAT_MARKETING_BRIEF = `
  A prospect uses a signup and demo chat on a public trial page. The activity is
  asking conversion questions, seeing proof, and choosing whether to start a
  trial or book a demo. The outcome is captured lead details for follow-up.
`;

const AI_ARTIFACT_COMPARISON_OPERATOR_REVIEW_BRIEF = `
  A human reviewer compares several AI-generated artifacts before release. The
  activity is reviewing evidence and risk, deciding whether each artifact is
  approved, blocked, returned, or handed off, and leaving an audit receipt.
`;

const HUMAN_ARTIFACT_COMPARISON_WORKBENCH_BRIEF = `
  A studio lead reviews human-produced artifacts in an editorial queue. The activity
  is reviewing evidence and deciding which artifact advances, returns for
  revision, or is handed off, with a project receipt.
`;

const SUPPORT_AGENT_DRAFT_WORKBENCH_BRIEF = `
  A support lead reviews support agent draft responses in a service queue. The
  activity is comparing policy evidence, deciding which response advances or
  returns for revision, and leaving a coaching handoff receipt.
`;

const NOT_ONLY_AI_ARTIFACT_OPERATOR_REVIEW_BRIEF = `
  A lead does not only review AI-generated artifacts; they compare evidence and
  approve or reject each artifact with an audit receipt.
`;

const SALES_OPERATIONS_FORM_FLOW_BRIEF = `
  A sales operations admin updates a CRM lead record. The activity is entering
  required company fields, resolving validation errors, submitting the change,
  and seeing a saved record confirmation.
`;

const INTERNAL_SALES_LEAD_RECORD_FORM_FLOW_BRIEF = `
  An internal sales operations admin updates a sales lead record. The activity
  is entering required company fields, resolving validation errors, submitting
  the change, and seeing a saved record confirmation.
`;

const READ_ONLY_REQUIRED_FIELDS_REPORT_BRIEF = `
  A policy reader uses a read-only reference report. The activity is reading a
  narrative summary of required fields and validation rules for a separate
  compliance process, then sharing the reference with stakeholders. The surface
  has no data entry, editing, or submission.
`;

const BARE_NO_DECISION_REPORT_BRIEF = `
  An executive reads a narrative quarterly report. The activity is understanding
  the summary, citing reference sections, and sharing the report with
  stakeholders. No decision is required on this surface.
`;

const IMPLEMENTATION_TERMS_REPORT_BRIEF = `
  A policy analyst reads an implementation appendix report that mentions JSON
  schema, prompt template, resource id, and API endpoint as source labels. The
  activity is reading the narrative, citing references, and sharing the report
  with stakeholders. This is not setup, debugging, auditing, or integration work.
`;

const DIAGNOSTIC_SOURCE_LABELS_REPORT_BRIEF = `
  A policy analyst reads a diagnostic report that mentions JSON schema and API
  endpoint as source labels. The activity is reading the narrative, citing
  references, and sharing the report with stakeholders.
`;

const DIAGNOSTIC_INTEGRATION_SOURCE_LABELS_REPORT_BRIEF = `
  A policy analyst reads a diagnostic report for an integration that mentions
  JSON schema and API endpoint as source labels. The activity is reading the
  narrative, citing references, and sharing the report with stakeholders. This
  is not setup, debugging, auditing, or integration work.
`;

const PLAYLIST_COMPARISON_WORKBENCH_BRIEF = `
  A host is curating a 10-song dinner playlist for friends. The activity is
  comparing suggested tracks, deciding which songs belong, shaping the sequence,
  resolving explicit-track and disliked-artist conflicts, and saving a playlist
  with a sequence note.
`;

const NO_FINAL_DECISION_WORKBENCH_BRIEF = `
  A support lead reviews case evidence in a workbench. No final decision is made
  until evidence is compared, then the lead decides whether to approve, return,
  or hand off the case.
`;

const MUSIC_SEQUENCE_REPORT_BRIEF = `
  A music editor reads a narrative report comparing song sequence choices for
  last week's dinner playlist. The activity is reading the summary, citing
  reference sections, and sharing the report; no decision is required.
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

function readyWorkbenchActivityReview() {
  return {
    review_status: "ready_for_review",
    candidate: {
      activity_model: {
        activity: "Reviewing refund requests during daily triage.",
        participants: ["support lead"],
        objective: "Resolve refund cases with evidence.",
        outcomes: ["approved, returned, or handed off refund cases"],
        domain_vocabulary: ["refund request", "support lead"],
      },
      interaction_contract: {
        primary_decision:
          "Decide whether each refund case should be approved, returned for evidence, or handed off.",
        next_actions: ["Approve refund", "Return for evidence", "Send handoff"],
        completion:
          "A handoff receipt records the selected next action and reason.",
      },
      disclosure_policy: {
        terms_to_use: ["refund request", "handoff receipt"],
      },
    },
    guardrails: {
      source_missing_evidence: {
        decision: false,
      },
    },
  };
}

function surfaceTypeScore(surfaceReview, surfaceType) {
  return surfaceReview.evidence.surface_type_scores.find(
    (entry) => entry.surface_type === surfaceType,
  );
}

function assertSurfaceRecommendation({
  label,
  brief,
  surfaceType,
  operatorProfileNotRecommended = surfaceType !== "operator_review",
  operatorProfileRecommended = surfaceType === "operator_review",
}) {
  const surfaceReview = recommendSurfaceTypes(brief);
  const selectedScore = surfaceTypeScore(surfaceReview, surfaceType);

  assert.equal(
    surfaceReview.recommended_surface_type,
    surfaceType,
    `${label} should recommend ${surfaceType}`,
  );
  assert.ok(selectedScore, `${label} should include selected surface score`);
  assert.ok(
    selectedScore.score > 0,
    `${label} should have positive score for ${surfaceType}`,
  );

  const operatorScore = surfaceTypeScore(surfaceReview, "operator_review");
  assert.ok(operatorScore, `${label} should include operator_review score`);

  if (operatorProfileNotRecommended) {
    assert.notEqual(
      operatorScore?.profile_status,
      "recommended",
      `${label} should not recommend operator_review profile`,
    );
  }

  if (operatorProfileRecommended) {
    assert.equal(
      operatorScore?.profile_status,
      "recommended",
      `${label} should recommend operator_review profile`,
    );
  }

  return surfaceReview;
}

{
  const nonOperatorSurfaceCases = [
    {
      label: "marketing offer",
      surfaceType: "marketing",
      brief: PRODUCT_ANALYTICS_MARKETING,
      trigger: "persuade_or_convert",
    },
    {
      label: "operational workbench",
      surfaceType: "workbench",
      brief: PRODUCT_ANALYTICS_WORKBENCH,
      trigger: "inspect_compare_decide_act",
    },
    {
      label: "manual single-application review",
      surfaceType: "workbench",
      brief: MANUAL_APPLICATION_WORKBENCH_BRIEF,
      trigger: "inspect_compare_decide_act",
    },
    {
      label: "form flow",
      surfaceType: "form_flow",
      brief: FORM_FLOW_BRIEF,
      trigger: "collect_or_change_structured_information",
    },
    {
      label: "dashboard monitor",
      surfaceType: "dashboard_monitor",
      brief: PRODUCT_ANALYTICS_DASHBOARD,
      trigger: "monitor_status_or_trends",
    },
    {
      label: "content report",
      surfaceType: "content_report",
      brief: CONTENT_REPORT_BRIEF,
      trigger: "read_understand_or_share",
    },
    {
      label: "setup debug tool",
      surfaceType: "setup_debug_tool",
      brief: SETUP_DEBUG_BRIEF,
      trigger: "configure_inspect_test_or_troubleshoot",
    },
    {
      label: "conversation",
      surfaceType: "conversation",
      brief: CONVERSATION_BRIEF,
      trigger: "open_ended_exchange",
    },
  ];

  for (const { label, surfaceType, brief, trigger } of nonOperatorSurfaceCases) {
    const surfaceReview = recommendSurfaceTypes(brief);
    const selectedScore = surfaceTypeScore(surfaceReview, surfaceType);
    const operatorScore = surfaceTypeScore(surfaceReview, "operator_review");

    assert.equal(
      surfaceReview.recommended_surface_type,
      surfaceType,
      `${label} should recommend ${surfaceType}`,
    );
    assert.ok(selectedScore, `${label} should include selected surface score`);
    assert.ok(
      selectedScore.score > 0,
      `${label} should have positive score for ${surfaceType}`,
    );
    assert.ok(
      selectedScore.matched_triggers.includes(trigger),
      `${label} should match ${trigger}`,
    );
    assert.notEqual(
      operatorScore?.profile_status,
      "recommended",
      `${label} should not recommend operator_review profile`,
    );
  }
}

{
  const surfaceRecommendationSmokeCases = [
    {
      label: "trial/signup conversion",
      brief: TRIAL_SIGNUP_CONVERSION_BRIEF,
      surfaceType: "marketing",
    },
    {
      label: "onboarding/settings form",
      brief: ONBOARDING_SETTINGS_FORM_FLOW_BRIEF,
      surfaceType: "form_flow",
    },
    {
      label: "checkout submission",
      brief: CHECKOUT_SUBMISSION_FORM_FLOW_BRIEF,
      surfaceType: "form_flow",
    },
    {
      label: "case intake",
      brief: CASE_INTAKE_FORM_FLOW_BRIEF,
      surfaceType: "form_flow",
    },
    {
      label: "operational lead health monitor",
      brief: OPERATIONAL_LEAD_MONITOR_BRIEF,
      surfaceType: "dashboard_monitor",
    },
    {
      label: "research memo",
      brief: RESEARCH_MEMO_CONTENT_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "public guide with negated conversion CTA",
      brief: PUBLIC_GUIDE_WITH_NEGATED_CTA_CONTENT_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "charted report with no operational decision",
      brief: CHARTED_REPORT_NO_OPERATIONAL_DECISION_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "configuration wizard",
      brief: CONFIGURATION_WIZARD_SETUP_DEBUG_BRIEF,
      surfaceType: "setup_debug_tool",
    },
    {
      label: "safe-to-ship audit checklist",
      brief: SAFE_TO_SHIP_AUDIT_CHECKLIST_BRIEF,
      surfaceType: "setup_debug_tool",
    },
    {
      label: "launch team thread",
      brief: LAUNCH_TEAM_THREAD_CONVERSATION_BRIEF,
      surfaceType: "conversation",
    },
    {
      label: "triage chat",
      brief: TRIAGE_CHAT_CONVERSATION_BRIEF,
      surfaceType: "conversation",
    },
    {
      label: "signup/demo chat",
      brief: SIGNUP_DEMO_CHAT_MARKETING_BRIEF,
      surfaceType: "marketing",
    },
    {
      label: "AI artifact comparison",
      brief: AI_ARTIFACT_COMPARISON_OPERATOR_REVIEW_BRIEF,
      surfaceType: "operator_review",
    },
    {
      label: "human artifact comparison",
      brief: HUMAN_ARTIFACT_COMPARISON_WORKBENCH_BRIEF,
      surfaceType: "workbench",
    },
    {
      label: "support agent draft response review",
      brief: SUPPORT_AGENT_DRAFT_WORKBENCH_BRIEF,
      surfaceType: "workbench",
    },
    {
      label: "not-only AI artifact review",
      brief: NOT_ONLY_AI_ARTIFACT_OPERATOR_REVIEW_BRIEF,
      surfaceType: "operator_review",
    },
    {
      label: "sales operations data entry",
      brief: SALES_OPERATIONS_FORM_FLOW_BRIEF,
      surfaceType: "form_flow",
    },
    {
      label: "internal sales lead record data entry",
      brief: INTERNAL_SALES_LEAD_RECORD_FORM_FLOW_BRIEF,
      surfaceType: "form_flow",
    },
    {
      label: "read-only required fields report",
      brief: READ_ONLY_REQUIRED_FIELDS_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "bare no-decision report",
      brief: BARE_NO_DECISION_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "implementation terms report",
      brief: IMPLEMENTATION_TERMS_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "diagnostic source labels report",
      brief: DIAGNOSTIC_SOURCE_LABELS_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "diagnostic integration source labels report",
      brief: DIAGNOSTIC_INTEGRATION_SOURCE_LABELS_REPORT_BRIEF,
      surfaceType: "content_report",
    },
    {
      label: "playlist comparison workbench",
      brief: PLAYLIST_COMPARISON_WORKBENCH_BRIEF,
      surfaceType: "workbench",
    },
    {
      label: "no final decision workbench",
      brief: NO_FINAL_DECISION_WORKBENCH_BRIEF,
      surfaceType: "workbench",
    },
    {
      label: "music sequence report",
      brief: MUSIC_SEQUENCE_REPORT_BRIEF,
      surfaceType: "content_report",
    },
  ];

  for (const surfaceCase of surfaceRecommendationSmokeCases) {
    assertSurfaceRecommendation(surfaceCase);
  }
}

{
  const requiredFieldsReport = recommendSurfaceTypes(READ_ONLY_REQUIRED_FIELDS_REPORT_BRIEF);
  const formFlowScore = surfaceTypeScore(requiredFieldsReport, "form_flow");

  assert.equal(requiredFieldsReport.recommended_surface_type, "content_report");
  assert.ok(formFlowScore);
  assert.equal(
    formFlowScore.matched_triggers.includes("validation_or_required_inputs"),
    false,
  );
}

{
  const bareNoDecisionReport = recommendSurfaceTypes(BARE_NO_DECISION_REPORT_BRIEF);
  const dashboardScore = surfaceTypeScore(bareNoDecisionReport, "dashboard_monitor");

  assert.equal(bareNoDecisionReport.recommended_surface_type, "content_report");
  assert.ok(dashboardScore);
  assert.equal(
    dashboardScore.matched_triggers.includes("passive_or_periodic_read"),
    false,
  );
}

{
  const noDecisionDashboard = recommendSurfaceTypes(
    "An operations lead uses a health dashboard to monitor incident status and alerts. No decision is required on this surface.",
  );
  const dashboardScore = surfaceTypeScore(noDecisionDashboard, "dashboard_monitor");

  assert.equal(noDecisionDashboard.recommended_surface_type, "dashboard_monitor");
  assert.ok(dashboardScore);
  assert.ok(dashboardScore.matched_triggers.includes("passive_or_periodic_read"));
}

{
  const implementationTermsReport = recommendSurfaceTypes(IMPLEMENTATION_TERMS_REPORT_BRIEF);
  const setupScore = surfaceTypeScore(implementationTermsReport, "setup_debug_tool");

  assert.equal(implementationTermsReport.recommended_surface_type, "content_report");
  assert.ok(
    implementationTermsReport.evidence.implementation_terms_detected.length > 0,
  );
  assert.ok(setupScore);
  assert.equal(
    setupScore.matched_triggers.includes("implementation_terms_are_task_material"),
    false,
  );
}

{
  const diagnosticReport = recommendSurfaceTypes(DIAGNOSTIC_SOURCE_LABELS_REPORT_BRIEF);
  const setupScore = surfaceTypeScore(diagnosticReport, "setup_debug_tool");

  assert.equal(diagnosticReport.recommended_surface_type, "content_report");
  assert.ok(diagnosticReport.evidence.implementation_terms_detected.length > 0);
  assert.ok(setupScore);
  assert.equal(
    setupScore.matched_triggers.includes("implementation_terms_are_task_material"),
    false,
  );
}

{
  const diagnosticIntegrationReport = recommendSurfaceTypes(
    DIAGNOSTIC_INTEGRATION_SOURCE_LABELS_REPORT_BRIEF,
  );
  const setupScore = surfaceTypeScore(
    diagnosticIntegrationReport,
    "setup_debug_tool",
  );

  assert.equal(
    diagnosticIntegrationReport.recommended_surface_type,
    "content_report",
  );
  assert.ok(
    diagnosticIntegrationReport.evidence.implementation_terms_detected.length > 0,
  );
  assert.ok(setupScore);
  assert.equal(
    setupScore.matched_triggers.includes("implementation_terms_are_task_material"),
    false,
  );
}

{
  const playlistWorkbench = recommendSurfaceTypes(PLAYLIST_COMPARISON_WORKBENCH_BRIEF);
  const workbenchScore = surfaceTypeScore(playlistWorkbench, "workbench");
  const formFlowScore = surfaceTypeScore(playlistWorkbench, "form_flow");

  assert.equal(playlistWorkbench.recommended_surface_type, "workbench");
  assert.ok(workbenchScore);
  assert.ok(workbenchScore.matched_triggers.includes("repeated_work_items"));
  assert.ok(formFlowScore);
  assert.ok(
    formFlowScore.score < workbenchScore.score,
    `expected form_flow score ${formFlowScore.score} to be below workbench score ${workbenchScore.score}`,
  );
}

{
  const noFinalDecisionWorkbench = recommendSurfaceTypes(
    NO_FINAL_DECISION_WORKBENCH_BRIEF,
  );
  const workbenchScore = surfaceTypeScore(noFinalDecisionWorkbench, "workbench");
  const contentScore = surfaceTypeScore(noFinalDecisionWorkbench, "content_report");

  assert.equal(noFinalDecisionWorkbench.recommended_surface_type, "workbench");
  assert.ok(workbenchScore);
  assert.equal(
    workbenchScore.matched_exclusions.includes("reading_or_report_primary"),
    false,
  );
  assert.ok(contentScore);
  assert.ok(
    workbenchScore.score > contentScore.score,
    `expected workbench score ${workbenchScore.score} to exceed content score ${contentScore.score}`,
  );
}

{
  const musicReport = recommendSurfaceTypes(MUSIC_SEQUENCE_REPORT_BRIEF);
  const workbenchScore = surfaceTypeScore(musicReport, "workbench");

  assert.equal(musicReport.recommended_surface_type, "content_report");
  assert.ok(workbenchScore);
  assert.ok(workbenchScore.matched_exclusions.includes("reading_or_report_primary"));
}

{
  const surfaceReview = recommendSurfaceTypes("Build the provided surface.", {
    activity_review: readyWorkbenchActivityReview(),
  });

  assert.equal(surfaceReview.recommended_surface_type, "workbench");
  assert.equal(surfaceReview.confidence, "high");
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

  const systemRecommendations = recommendSurfaceTypes(
    SYSTEM_RECOMMENDATIONS_OPERATOR_REVIEW_BRIEF,
  );
  const systemRecommendationScore = surfaceTypeScore(
    systemRecommendations,
    "operator_review",
  );

  assert.equal(systemRecommendations.recommended_surface_type, "operator_review");
  assert.equal(systemRecommendationScore.profile_status, "recommended");
  assert.ok(
    systemRecommendationScore.matched_triggers.includes(
      "human_review_before_advance",
    ),
  );

  const humanCandidateWorkbench = recommendSurfaceTypes(
    HUMAN_CANDIDATE_WORKBENCH_BRIEF,
  );
  const humanCandidateOperatorScore = surfaceTypeScore(
    humanCandidateWorkbench,
    "operator_review",
  );

  assert.equal(humanCandidateWorkbench.recommended_surface_type, "workbench");
  assert.notEqual(humanCandidateOperatorScore.profile_status, "recommended");

  const designSystemRecommendations = recommendSurfaceTypes(
    DESIGN_SYSTEM_RECOMMENDATIONS_WORKBENCH_BRIEF,
  );
  const designSystemOperatorScore = surfaceTypeScore(
    designSystemRecommendations,
    "operator_review",
  );

  assert.equal(designSystemRecommendations.recommended_surface_type, "workbench");
  assert.notEqual(designSystemOperatorScore.profile_status, "recommended");

  const hyphenatedDesignSystemRecommendations = recommendSurfaceTypes(
    HYPHENATED_DESIGN_SYSTEM_RECOMMENDATIONS_WORKBENCH_BRIEF,
  );
  const hyphenatedDesignSystemOperatorScore = surfaceTypeScore(
    hyphenatedDesignSystemRecommendations,
    "operator_review",
  );

  assert.equal(
    hyphenatedDesignSystemRecommendations.recommended_surface_type,
    "workbench",
  );
  assert.notEqual(
    hyphenatedDesignSystemOperatorScore.profile_status,
    "recommended",
  );
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
  const settingsWorkspace = recommendSurfaceTypes(SETTINGS_WORKSPACE_FORM_FLOW_BRIEF);
  const settingsWorkbenchScore = surfaceTypeScore(settingsWorkspace, "workbench");

  assert.equal(settingsWorkspace.recommended_surface_type, "form_flow");
  assert.ok(
    settingsWorkbenchScore.matched_exclusions.includes("structured_form_flow"),
  );
  const settingsFieldList = recommendSurfaceTypes(
    SETTINGS_WORKSPACE_FIELD_LIST_FORM_FLOW_BRIEF,
  );
  const settingsFieldListWorkbenchScore = surfaceTypeScore(
    settingsFieldList,
    "workbench",
  );

  assert.equal(settingsFieldList.recommended_surface_type, "form_flow");
  assert.ok(
    settingsFieldListWorkbenchScore.matched_exclusions.includes(
      "structured_form_flow",
    ),
  );
  assert.equal(recommendSurfaceTypes(CONVERSATION_BRIEF).recommended_surface_type, "conversation");
}

{
  const surfaceReview = recommendSurfaceTypes(FIELD_SERVICE_DISPATCH_WORKBENCH_BRIEF);
  const workbenchScore = surfaceTypeScore(surfaceReview, "workbench");
  const formFlowScore = surfaceTypeScore(surfaceReview, "form_flow");

  assert.equal(surfaceReview.recommended_surface_type, "workbench");
  assert.equal(surfaceReview.blocked_surface_types.includes("workbench"), false);
  assert.ok(workbenchScore);
  assert.ok(workbenchScore.matched_triggers.includes("inspect_compare_decide_act"));
  assert.ok(workbenchScore.matched_triggers.includes("repeated_work_items"));
  assert.equal(workbenchScore.matched_exclusions.includes("structured_form_flow"), false);
  assert.ok(formFlowScore);
  assert.ok(
    formFlowScore.score < workbenchScore.score,
    `expected form_flow score ${formFlowScore.score} to be below workbench score ${workbenchScore.score}`,
  );
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
  assert.equal(
    frontendContext.implementation_guidance.evidence_field_mapping
      .pattern_contract_evidence.selected_pattern_contract.id,
    "workbench",
  );
  assert.equal(
    frontendContext.implementation_guidance.evidence_field_mapping
      .pattern_contract_evidence.selected_pattern_evidence_template.pattern_id,
    "workbench",
  );
  assert.ok(
    frontendContext.implementation_guidance.evidence_field_mapping
      .pattern_contract_evidence.selected_pattern_evidence_template.regions_present.includes(
        "evidence",
      ),
  );
  const rawExternalFrontendContext = {
    ...frontendContext,
    implementation_contract: {
      ...frontendContext.implementation_contract,
      design_system_source: {
        ...frontendContext.implementation_contract.design_system_source,
        mode: "external_design_system",
        definition_point: "implementation_contract.design_system_adapter",
      },
    },
  };
  assert.throws(
    () =>
      createFrontendImplementationSkillContext({
        frontend_generation_context: rawExternalFrontendContext,
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "incomplete_design_system_authority",
    "Frontend skill context must not accept raw external_design_system mode without a complete adapter.",
  );

  const skillContext = createFrontendImplementationSkillContext({
    frontend_generation_context: frontendContext,
    target_client: "codex",
    design_system_adapter: {
      design_system_name: "Material UI",
      design_system_package: "@mui/material",
      role: "visual renderer after context selection",
      components: ["Stack", "Button", "Alert"],
      token_guidance: {
        token_families: ["color", "type"],
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
      constraint:
        "Material UI changes the visual/component layer only; it does not supply activity fit.",
    },
  });

  assert.equal(skillContext.skill_context_status, "ready");
  assert.equal(skillContext.source_skill.name, "frontend-ui-implementation");
  assert.equal(skillContext.source_skill.raw_skill_exposed, false);
  assert.equal(skillContext.source.target_client, "codex");
  assert.equal(skillContext.design_system_policy.mode, "external_design_system");
  assert.equal(skillContext.design_system_policy.name, "Material UI");
  assert.ok(skillContext.design_system_policy.renderer_components.includes("Button"));
  assert.equal(skillContext.surface_type_guidance.workflow_topology, "workspace");
  assert.ok(skillContext.surface_type_guidance.work_units.includes("Review evidence"));
  assert.equal(skillContext.surface_type_guidance.stepper_eligibility.allowed, false);
  assert.ok(skillContext.surface_type_guidance.surface_set.length > 0);
  assert.ok(skillContext.approved_component_families.includes("queue"));
  assert.ok(skillContext.visual_requirements.includes("case evidence hero image"));
  assert.ok(skillContext.approved_visual_asset_sources.includes("imagegen"));
  assert.equal(
    skillContext.evidence_field_mapping.pattern_contract_evidence
      .selected_pattern_contract.id,
    "workbench",
  );
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
