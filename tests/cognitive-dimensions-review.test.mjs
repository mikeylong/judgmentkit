import assert from "node:assert/strict";

import {
  createUiGenerationHandoff,
  createUiImplementationContract,
  reviewCognitiveDimensionsCandidate,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const REFUND_BRIEF =
  "A support lead reviews high-value refund requests and must decide whether to approve, send to policy review, or return for missing evidence. Policy evidence and the reason for the decision must stay visible before approval. The outcome is a handoff receipt with the decision, reason, and next action.";

const detachedRefundCandidate = {
  workflow: {
    surface_name: "Refund approval console",
    topology: "workspace",
    work_units: ["Pick refund case", "Choose approval path", "Send result"],
    primary_actions: ["Approve refund", "Send to policy review", "Return case"],
    decision_points: ["Choose refund outcome"],
    completion_state: "Decision submitted.",
  },
  surface_set: [
    {
      name: "Refund queue",
      purpose: "Choose a refund case and submit an approval decision.",
      sections: ["Case list", "Decision footer"],
      controls: ["Approve refund", "Send to policy review", "Return case"],
      relationship_to_workflow: "Queue and footer support the refund decision.",
    },
  ],
  handoff: {
    next_owner: "support lead",
    reason: "Decision submitted.",
    next_action: "Close the case.",
  },
  diagnostics: {
    implementation_terms: [],
    reveal_contexts: ["setup", "debugging", "auditing", "integration"],
  },
};

const readyRefundCandidate = {
  workflow: {
    surface_name: "Refund evidence workspace",
    topology: "workspace",
    work_units: ["Review selected case", "Check policy evidence", "Choose path", "Send handoff"],
    primary_actions: ["Approve refund with reason", "Send to policy review", "Return for missing evidence"],
    decision_points: ["Choose refund outcome from evidence, policy risk, and missing evidence status"],
    completion_state: "Handoff receipt records next action and decision reason.",
  },
  surface_set: [
    {
      name: "Selected refund case",
      purpose: "Keep selected case, policy evidence, risk, decision controls, and handoff receipt together.",
      sections: ["Selected case summary", "Policy evidence", "Risk and completeness", "Decision controls", "Handoff receipt"],
      controls: ["Approve refund with reason", "Send to policy review", "Return for missing evidence"],
      relationship_to_workflow: "Keeps evidence, decision controls, and handoff receipt in the same workspace.",
    },
  ],
  handoff: {
    next_owner: "support agent",
    reason: "Policy evidence and missing evidence status determine the next action.",
    next_action: "Send handoff with decision reason and receipt.",
  },
  diagnostics: {
    implementation_terms: [],
    reveal_contexts: ["setup", "debugging", "auditing", "integration"],
  },
};

{
  const review = reviewCognitiveDimensionsCandidate(
    REFUND_BRIEF,
    detachedRefundCandidate,
    { surface_type: "workbench" },
  );

  assert.equal(review.cognitive_dimensions_review_status, "repair_required");
  assert.equal(review.next_agent_action, "repair_and_resubmit");
  assert.ok(
    review.findings.some(
      (finding) => finding.dimension === "visibility_juxtaposability",
    ),
  );
  assert.ok(
    review.findings.every(
      (finding) =>
        finding.evidence &&
        finding.user_cost &&
        finding.repair_instruction &&
        finding.acceptance_check,
    ),
  );
}

{
  const review = reviewCognitiveDimensionsCandidate(
    "A platform engineer is debugging a billing webhook setup. The activity is checking endpoint status, API retries, request IDs, and test event results to decide the next fix.",
    {
      workflow: {
        surface_name: "Webhook setup debugger",
        topology: "staged_flow",
        work_units: ["Check endpoint status", "Inspect API retry result", "Review request ID", "Choose next fix"],
        primary_actions: ["Run test event", "Retry API delivery", "Send next fix"],
        decision_points: ["Decide next setup fix"],
        completion_state: "Next fix and test status recorded.",
      },
      surface_set: [
        {
          name: "Webhook diagnostic panel",
          purpose: "Inspect endpoint status, API retries, request IDs, error cause, and next fix.",
          sections: ["Endpoint status", "API retry result", "Request ID", "Error cause", "Next fix"],
          controls: ["Run test event", "Retry API delivery", "Send next fix"],
          relationship_to_workflow: "Keeps diagnostic evidence with remediation.",
        },
      ],
      handoff: {
        next_owner: "platform engineer",
        reason: "Test status and error cause identify the next fix.",
        next_action: "Apply next fix and rerun the test.",
      },
      diagnostics: {
        implementation_terms: ["API endpoint", "request ID"],
        reveal_contexts: ["setup", "debugging", "integration"],
      },
    },
    { surface_type: "setup_debug_tool" },
  );

  assert.equal(review.cognitive_dimensions_review_status, "ready_for_review");
  assert.ok(
    review.findings.some(
      (finding) =>
        finding.dimension === "disclosure_discipline" &&
        finding.severity === "warn",
    ),
  );
}

{
  const workflowReview = reviewUiWorkflowCandidate(REFUND_BRIEF, readyRefundCandidate, {
    surface_type: "workbench",
  });
  const implementationContract = createUiImplementationContract({
    approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
    static_rules: ["npm test"],
    browser_qa_checks: ["desktop review", "mobile review"],
  });
  const failedCognitiveReview = reviewCognitiveDimensionsCandidate(
    REFUND_BRIEF,
    detachedRefundCandidate,
    { surface_type: "workbench" },
  );
  const readyCognitiveReview = reviewCognitiveDimensionsCandidate(
    REFUND_BRIEF,
    readyRefundCandidate,
    { surface_type: "workbench" },
  );

  assert.throws(
    () =>
      createUiGenerationHandoff(workflowReview, {
        implementation_contract: implementationContract.implementation_contract,
        cognitive_dimensions_review: failedCognitiveReview,
      }),
    /Cognitive Dimensions review/,
  );

  const handoff = createUiGenerationHandoff(workflowReview, {
    implementation_contract: implementationContract.implementation_contract,
    cognitive_dimensions_review: readyCognitiveReview,
  });

  assert.equal(handoff.handoff_status, "ready_for_generation");
  assert.equal(handoff.cognitive_dimensions_review.status, "ready_for_review");
  assert.ok(
    handoff.generation_gates.some(
      (gate) => gate.id === "cognitive_dimensions_gate" && gate.status === "passed",
    ),
  );
}

console.log("Cognitive Dimensions review checks passed.");
