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

function refundWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund escalation queue",
      steps: ["Review evidence", "Choose path", "Prepare handoff"],
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
    primary_ui: {
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
      user_facing_terms: [
        "refund request",
        "policy review",
        "missing evidence",
        "handoff reason",
      ],
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

function integrationAuditWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Integration change audit",
      steps: ["Review change summary", "Check release risk", "Prepare platform handoff"],
      primary_actions: ["Mark safe to ship", "Send to platform review", "Return for evidence"],
      decision_points: [
        "Decide whether the integration change is safe to ship or needs platform review.",
      ],
      completion_state: "Platform team receives a clear handoff with the next action.",
    },
    primary_ui: {
      sections: ["Change summary", "Release risk", "Platform handoff"],
      controls: ["Mark safe to ship", "Send to platform review", "Return for evidence"],
      user_facing_terms: [
        "integration setup workflow",
        "release risk",
        "platform handoff",
      ],
    },
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
  candidate.primary_ui.sections = ["Activity", "Prompt template"];

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
    primary_surface: handoff.primary_surface,
    handoff: handoff.handoff,
  }).toLowerCase();
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
  assert.ok(handoff.primary_surface.sections.includes("Evidence checklist"));
  assert.equal(handoff.handoff.next_owner, "support agent");
  assert.equal(handoff.disclosure_reminders.primary_ui_rule.includes("implementation"), true);
  assert.deepEqual(
    handoff.generation_gates.map((gate) => gate.id),
    ["activity_gate", "implementation_gate"],
  );
  assert.ok(handoff.implementation_contract.approved_primitives.includes("CheckboxGroup"));
  assertNoForbiddenHandoffKeys(handoff);
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
    },
    { implementation_contract: implementationContract },
  );

  assert.equal(approvedReview.implementation_review_status, "passed");
  assert.equal(approvedReview.checks.approved_primitives.status, "pass");
  assert.deepEqual(approvedReview.findings, []);
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
