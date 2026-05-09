import assert from "node:assert/strict";

import {
  JudgmentKitInputError,
  buildActivityModelCandidateRequest,
  buildUiWorkflowCandidateRequest,
  createActivityModelProposer,
  createUiWorkflowProposer,
  createActivityModelReview,
  createModelAssistedActivityModelReview,
  createModelAssistedUiWorkflowReview,
  reviewActivityModelCandidate,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const FORBIDDEN_PRIMARY_TERMS = [
  "JSON schema",
  "prompt template",
  "data model",
  "database table",
  "API endpoint",
  "tool call",
  "resource id",
  "CRUD",
];

const FORBIDDEN_WORKFLOW_META_TERMS = [
  "Activity",
  "Primary user",
  "Outcome",
  "Main decision",
  "ready_for_review",
  "activity_model",
  "interaction_contract",
  "review_status",
  "guardrails",
];

function stringify(value) {
  return JSON.stringify(value);
}

function assertTextIncludes(value, expectedValue) {
  assert.ok(
    value.includes(expectedValue),
    `Expected ${JSON.stringify(value)} to include ${expectedValue}`,
  );
}

function assertIncludes(values, expectedValue) {
  assert.ok(
    values.includes(expectedValue),
    `Expected ${JSON.stringify(values)} to include ${expectedValue}`,
  );
}

function assertNoPrimaryImplementationTerms(packet) {
  const primaryCandidateText = stringify({
    activity_model: packet.candidate.activity_model,
    interaction_contract: packet.candidate.interaction_contract,
  }).toLowerCase();

  for (const term of FORBIDDEN_PRIMARY_TERMS) {
    assert.equal(
      primaryCandidateText.includes(term.toLowerCase()),
      false,
      `candidate primary fields leaked implementation term: ${term}`,
    );
  }
}

function assertNoPrimaryUiWorkflowLeaks(packet) {
  const primaryCandidateText = stringify({
    workflow: packet.candidate.workflow,
    primary_ui: packet.candidate.primary_ui,
    handoff: packet.candidate.handoff,
  }).toLowerCase();

  for (const term of [...FORBIDDEN_PRIMARY_TERMS, ...FORBIDDEN_WORKFLOW_META_TERMS]) {
    assert.equal(
      primaryCandidateText.includes(term.toLowerCase()),
      false,
      `workflow candidate primary fields leaked term: ${term}`,
    );
  }
}

const FORBIDDEN_ADAPTER_KEYS = new Set([
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

function assertNoAdapterRequestKeys(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(
      FORBIDDEN_ADAPTER_KEYS.has(key),
      false,
      `adapter request introduced forbidden field key: ${key}`,
    );
    assertNoAdapterRequestKeys(child);
  }
}

const REFUND_TRIAGE_BRIEF = `
  A support lead is reviewing refund requests during the daily triage workflow.
  The activity is deciding whether a case should be approved, sent to policy review,
  or returned to the agent for missing evidence. The outcome is a clear handoff
  with the next action and the reason for the decision.
`;

const FIELD_OPERATIONS_BRIEF = `
  A field operations manager is reviewing repair visits. The activity is deciding
  which technician should handle the next job, comparing route constraints,
  approving the handoff, and leaving the dispatch team with a completed next action.
`;

function refundTriageCandidate() {
  return {
    activity_model: {
      activity: "Support lead reviews refund requests during daily triage workflow.",
      participants: ["support lead"],
      objective:
        "Decide whether a case should be approved, sent to policy review, or returned for missing evidence.",
      outcomes: ["Clear handoff with next action and decision reason."],
      domain_vocabulary: ["refund requests", "policy review", "missing evidence"],
    },
    interaction_contract: {
      primary_decision:
        "Decide whether a case should be approved, sent to policy review, or returned for missing evidence.",
      next_actions: ["Confirm the handoff path."],
      completion: "Clear handoff with next action and decision reason.",
      make_easy: ["Review decision options in domain language."],
    },
    disclosure_policy: {
      terms_to_use: ["refund requests", "policy review", "missing evidence"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function fieldOperationsCandidate() {
  return {
    activity_model: {
      activity: "Field operations manager reviews repair visits.",
      participants: ["field operations manager", "dispatch team"],
      objective: "Decide which technician should handle the next job.",
      outcomes: ["Dispatch team leaves with a completed next action."],
      domain_vocabulary: ["repair visits", "route constraints", "technician", "next job"],
    },
    interaction_contract: {
      primary_decision: "Decide which technician should handle the next job.",
      next_actions: ["Approve the handoff."],
      completion: "Dispatch team leaves with a completed next action.",
      make_easy: ["Compare route constraints in domain language."],
    },
    disclosure_policy: {
      terms_to_use: ["repair visits", "route constraints", "technician", "next job"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

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

function fieldOperationsWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Repair visit dispatch review",
      steps: ["Review repair visit", "Compare route constraints", "Approve handoff"],
      primary_actions: ["Assign technician", "Approve handoff", "Return to dispatch"],
      decision_points: ["Decide which technician should handle the next job."],
      completion_state: "Dispatch team leaves with a completed next action.",
    },
    primary_ui: {
      sections: ["Repair visit", "Route constraints", "Technician options", "Handoff"],
      controls: ["Assign technician", "Approve handoff"],
      user_facing_terms: ["repair visits", "route constraints", "technician", "next job"],
    },
    handoff: {
      next_owner: "dispatch team",
      reason: "Technician assignment is ready for dispatch.",
      next_action: "Approve the handoff.",
    },
    diagnostics: {
      implementation_terms: [],
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

{
  const packet = createActivityModelReview(REFUND_TRIAGE_BRIEF);

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.collaboration_mode, "propose_then_review");
  assert.equal(packet.source.mode, "deterministic");
  assert.equal(packet.review.confidence, "high");
  assert.deepEqual(packet.review.targeted_questions, []);
  assertTextIncludes(packet.candidate.activity_model.activity, "refund requests");
  assertIncludes(packet.candidate.activity_model.participants, "support lead");
  assertIncludes(packet.candidate.activity_model.domain_vocabulary, "policy review");
  assertTextIncludes(packet.candidate.interaction_contract.primary_decision, "case should be approved");
  assertTextIncludes(packet.candidate.interaction_contract.completion, "clear handoff");
  assert.equal(packet.guardrails.analyzer_status, "ready");
  assertNoPrimaryImplementationTerms(packet);
}

{
  const deterministicReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const request = buildActivityModelCandidateRequest({
    brief: REFUND_TRIAGE_BRIEF,
    deterministic_review: deterministicReview,
  });

  assert.equal(request.metadata.request_kind, "activity_model_candidate");
  assert.equal(request.metadata.contract_id, deterministicReview.contract_id);
  assert.equal(request.metadata.source_review_status, "ready_for_review");
  assert.equal(request.response_format.type, "json_object");
  assert.deepEqual(request.response_format.required_top_level_keys, [
    "activity_model",
    "interaction_contract",
    "disclosure_policy",
  ]);
  assertTextIncludes(stringify(request), "candidate_shape");
  assertTextIncludes(stringify(request), "refund requests");
  assertTextIncludes(stringify(request), "Do not propose UI layout");
  assertNoAdapterRequestKeys(request);
}

{
  let callModelSawDeterministicReview = false;
  let callModelRequest;
  const propose = createActivityModelProposer({
    callModel: async (request) => {
      callModelRequest = request;
      callModelSawDeterministicReview =
        request.metadata.source_review_status === "ready_for_review" &&
        request.messages.some((message) => message.content.includes("candidate_shape")) &&
        request.messages.some((message) => message.content.includes("refund requests"));

      return refundTriageCandidate();
    },
  });
  const packet = await createModelAssistedActivityModelReview(REFUND_TRIAGE_BRIEF, {
    propose,
  });

  assert.equal(callModelSawDeterministicReview, true);
  assertNoAdapterRequestKeys(callModelRequest);
  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.source.mode, "model_assisted");
  assert.equal(packet.source.proposer, "injected");
  assertTextIncludes(packet.candidate.activity_model.activity, "refund requests");
  assert.deepEqual(packet.guardrails.candidate_primary_terms_detected, []);
  assertNoPrimaryImplementationTerms(packet);
}

{
  const deterministicReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const propose = createActivityModelProposer({
    callModel: async () => JSON.stringify(refundTriageCandidate()),
  });
  const candidate = await propose({
    brief: REFUND_TRIAGE_BRIEF,
    deterministic_review: deterministicReview,
  });

  assertTextIncludes(candidate.activity_model.activity, "refund requests");
  assertTextIncludes(candidate.interaction_contract.completion, "Clear handoff");
}

{
  const propose = createActivityModelProposer({
    callModel: async () => refundTriageCandidate(),
  });
  const packet = await createModelAssistedActivityModelReview(
    "Make a dashboard for the system.",
    { propose },
  );

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.guardrails.source_missing_evidence.activity, true);
  assert.ok(packet.review.targeted_questions.length <= 3);
  assertNoPrimaryImplementationTerms(packet);
}

{
  const leakyCandidate = refundTriageCandidate();
  leakyCandidate.activity_model.activity = "Support lead reviews the JSON schema.";
  leakyCandidate.activity_model.domain_vocabulary = ["JSON schema", "policy review"];
  leakyCandidate.interaction_contract.primary_decision =
    "Decide whether the prompt template is ready.";

  const propose = createActivityModelProposer({
    callModel: async () => JSON.stringify(leakyCandidate),
  });
  const packet = await createModelAssistedActivityModelReview(REFUND_TRIAGE_BRIEF, {
    propose,
  });

  assert.equal(packet.review_status, "needs_source_context");
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "prompt template",
    ),
  );
  assertNoPrimaryImplementationTerms(packet);
}

{
  const propose = createActivityModelProposer({
    callModel: async () => fieldOperationsCandidate(),
  });
  const packet = await createModelAssistedActivityModelReview(FIELD_OPERATIONS_BRIEF, {
    propose,
  });

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(
    packet.guardrails.implementation_terms_detected.some((entry) => entry.term === "field"),
    false,
  );
  assert.equal(
    packet.guardrails.candidate_primary_terms_detected.some((entry) => entry.term === "field"),
    false,
  );
  assertIncludes(packet.candidate.activity_model.participants, "field operations manager");
  assertNoPrimaryImplementationTerms(packet);
}

{
  const packet = reviewActivityModelCandidate(
    "Make a dashboard for the system.",
    refundTriageCandidate(),
  );

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.source.mode, "model_assisted");
  assert.equal(packet.source.proposer, "external_candidate");
  assert.equal(packet.guardrails.source_missing_evidence.activity, true);
  assert.equal(packet.guardrails.candidate_missing_fields.activity, false);
  assert.ok(packet.review.targeted_questions.length <= 3);
  assertNoPrimaryImplementationTerms(packet);
}

{
  const leakyCandidate = refundTriageCandidate();
  leakyCandidate.activity_model.activity = "Support lead reviews the JSON schema.";
  leakyCandidate.activity_model.domain_vocabulary = ["JSON schema", "policy review"];
  leakyCandidate.interaction_contract.primary_decision =
    "Decide whether the JSON schema is ready.";

  const packet = reviewActivityModelCandidate(REFUND_TRIAGE_BRIEF, leakyCandidate);

  assert.equal(packet.review_status, "needs_source_context");
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.ok(
    packet.review.targeted_questions.some((question) =>
      question.includes("implementation terms"),
    ),
  );
  assertNoPrimaryImplementationTerms(packet);
}

{
  const packet = createActivityModelReview("Make a dashboard for the system.");

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.review.confidence, "low");
  assert.ok(packet.review.targeted_questions.length <= 3);
  assert.ok(
    packet.review.targeted_questions.some((question) => question.includes("activity")),
  );
  assert.ok(
    packet.review.targeted_questions.some((question) =>
      question.includes("decision or next action"),
    ),
  );
  assert.equal(packet.guardrails.missing_evidence.activity, true);
  assert.equal(packet.guardrails.missing_evidence.decision, true);
  assertNoPrimaryImplementationTerms(packet);
}

{
  const packet = createActivityModelReview(`
    A support operations manager is auditing an integration setup workflow.
    The activity is deciding whether a JSON schema change and prompt template update are safe to ship,
    then producing a handoff with the next action for the platform team.
  `);

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.review.confidence, "medium");
  assert.equal(packet.guardrails.analyzer_status, "needs_review");
  assert.ok(
    packet.candidate.disclosure_policy.hidden_implementation_terms.some(
      (entry) => entry.detected_term === "JSON schema",
    ),
  );
  assert.ok(
    packet.guardrails.implementation_terms_detected.some(
      (entry) => entry.term === "prompt template",
    ),
  );
  assertIncludes(packet.candidate.activity_model.domain_vocabulary, "integration setup workflow");
  assertTextIncludes(packet.candidate.interaction_contract.completion, "handoff");
  assertNoPrimaryImplementationTerms(packet);
}

{
  const packet = createActivityModelReview(FIELD_OPERATIONS_BRIEF);

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(
    packet.guardrails.implementation_terms_detected.some((entry) => entry.term === "field"),
    false,
  );
  assertIncludes(packet.candidate.activity_model.participants, "field operations manager");
  assertIncludes(packet.candidate.activity_model.domain_vocabulary, "repair visits");
  assertTextIncludes(packet.candidate.interaction_contract.primary_decision, "technician");
  assertNoPrimaryImplementationTerms(packet);
}

{
  const activityReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const request = buildUiWorkflowCandidateRequest({
    brief: REFUND_TRIAGE_BRIEF,
    activity_review: activityReview,
  });

  assert.equal(request.metadata.request_kind, "ui_workflow_candidate");
  assert.equal(request.metadata.contract_id, activityReview.contract_id);
  assert.equal(request.metadata.source_review_status, "ready_for_review");
  assert.equal(request.response_format.type, "json_object");
  assert.deepEqual(request.response_format.required_top_level_keys, [
    "workflow",
    "primary_ui",
    "handoff",
    "diagnostics",
  ]);
  assertTextIncludes(stringify(request), "candidate_shape");
  assertTextIncludes(stringify(request), "refund requests");
  assertTextIncludes(stringify(request), "Keep implementation terms");
  assertNoAdapterRequestKeys(request);
}

{
  let callModelSawActivityReview = false;
  let callModelRequest;
  const propose = createUiWorkflowProposer({
    callModel: async (request) => {
      callModelRequest = request;
      callModelSawActivityReview =
        request.metadata.request_kind === "ui_workflow_candidate" &&
        request.metadata.source_review_status === "ready_for_review" &&
        request.messages.some((message) => message.content.includes("candidate_shape")) &&
        request.messages.some((message) => message.content.includes("refund requests"));

      return refundWorkflowCandidate();
    },
  });
  const packet = await createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {
    propose,
  });

  assert.equal(callModelSawActivityReview, true);
  assertNoAdapterRequestKeys(callModelRequest);
  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.source.mode, "model_assisted");
  assert.equal(packet.source.proposer, "injected");
  assert.equal(packet.activity_review.review_status, "ready_for_review");
  assertTextIncludes(packet.candidate.workflow.surface_name, "Refund escalation queue");
  assertIncludes(packet.candidate.workflow.primary_actions, "Approve refund");
  assertIncludes(packet.candidate.primary_ui.sections, "Evidence checklist");
  assertTextIncludes(packet.candidate.handoff.next_action, "Send handoff");
  assert.deepEqual(packet.guardrails.candidate_primary_terms_detected, []);
  assert.deepEqual(packet.guardrails.candidate_primary_meta_terms_detected, []);
  assertNoPrimaryUiWorkflowLeaks(packet);
}

{
  const activityReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const propose = createUiWorkflowProposer({
    callModel: async () => JSON.stringify(refundWorkflowCandidate()),
  });
  const candidate = await propose({
    brief: REFUND_TRIAGE_BRIEF,
    activity_review: activityReview,
  });

  assertTextIncludes(candidate.workflow.surface_name, "Refund escalation");
  assertIncludes(candidate.workflow.primary_actions, "Approve refund");
}

{
  const propose = createUiWorkflowProposer({
    callModel: async () => refundWorkflowCandidate(),
  });
  const packet = await createModelAssistedUiWorkflowReview(
    "Make a dashboard for the system.",
    { propose },
  );

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.guardrails.activity_review_status, "needs_source_context");
  assert.equal(packet.guardrails.source_missing_evidence.activity, true);
  assert.ok(packet.review.targeted_questions.length <= 3);
  assertNoPrimaryUiWorkflowLeaks(packet);
}

{
  const leakyCandidate = refundWorkflowCandidate();
  leakyCandidate.workflow.surface_name = "Refund JSON schema console";
  leakyCandidate.workflow.primary_actions = ["Save CRUD update", "Send to policy review"];
  leakyCandidate.primary_ui.sections = ["Prompt template", "Evidence checklist"];

  const packet = reviewUiWorkflowCandidate(REFUND_TRIAGE_BRIEF, leakyCandidate);

  assert.equal(packet.review_status, "needs_source_context");
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "prompt template",
    ),
  );
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "CRUD",
    ),
  );
  assertNoPrimaryUiWorkflowLeaks(packet);
}

{
  const leakyCandidate = refundWorkflowCandidate();
  leakyCandidate.workflow.surface_name = "ready_for_review";
  leakyCandidate.primary_ui.sections = ["Activity", "Evidence checklist"];
  leakyCandidate.workflow.decision_points = ["Main decision: approve or return the case."];

  const packet = reviewUiWorkflowCandidate(REFUND_TRIAGE_BRIEF, leakyCandidate);

  assert.equal(packet.review_status, "needs_source_context");
  assert.ok(
    packet.guardrails.candidate_primary_meta_terms_detected.some(
      (entry) => entry.term === "ready_for_review",
    ),
  );
  assert.ok(
    packet.guardrails.candidate_primary_meta_terms_detected.some(
      (entry) => entry.term === "Activity",
    ),
  );
  assert.ok(
    packet.review.targeted_questions.some((question) =>
      question.includes("JudgmentKit review terms"),
    ),
  );
  assertNoPrimaryUiWorkflowLeaks(packet);
}

{
  const packet = reviewUiWorkflowCandidate(
    FIELD_OPERATIONS_BRIEF,
    fieldOperationsWorkflowCandidate(),
  );

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(
    packet.guardrails.implementation_terms_detected.some((entry) => entry.term === "field"),
    false,
  );
  assert.equal(
    packet.guardrails.candidate_primary_terms_detected.some((entry) => entry.term === "field"),
    false,
  );
  assertIncludes(packet.candidate.primary_ui.user_facing_terms, "field operations manager");
  assertIncludes(packet.candidate.primary_ui.user_facing_terms, "technician");
  assertNoPrimaryUiWorkflowLeaks(packet);
}

{
  assert.throws(
    () => createActivityModelProposer({}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("callModel function"),
  );
}

{
  assert.throws(
    () => createUiWorkflowProposer({}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("callModel function"),
  );
}

{
  assert.throws(
    () => buildActivityModelCandidateRequest({ brief: REFUND_TRIAGE_BRIEF }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("deterministic_review object"),
  );
}

{
  assert.throws(
    () => buildUiWorkflowCandidateRequest({ brief: REFUND_TRIAGE_BRIEF }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("activity_review object"),
  );
}

{
  assert.throws(
    () => createActivityModelReview("   "),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("non-empty text input"),
  );
}

{
  const propose = createActivityModelProposer({
    callModel: async () => "{not valid JSON",
  });

  await assert.rejects(
    () =>
      propose({
        brief: REFUND_TRIAGE_BRIEF,
        deterministic_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("invalid JSON"),
  );
}

{
  const propose = createUiWorkflowProposer({
    callModel: async () => "{not valid JSON",
  });

  await assert.rejects(
    () =>
      propose({
        brief: REFUND_TRIAGE_BRIEF,
        activity_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("invalid JSON"),
  );
}

{
  await assert.rejects(
    () => createModelAssistedActivityModelReview(REFUND_TRIAGE_BRIEF, {}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("propose function"),
  );
}

{
  await assert.rejects(
    () => createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("propose function"),
  );
}

{
  const propose = createActivityModelProposer({
    callModel: async () => ({}),
  });

  await assert.rejects(
    () =>
      propose({
        brief: REFUND_TRIAGE_BRIEF,
        deterministic_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("activity_model"),
  );
}

{
  const propose = createUiWorkflowProposer({
    callModel: async () => ({}),
  });

  await assert.rejects(
    () =>
      propose({
        brief: REFUND_TRIAGE_BRIEF,
        activity_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("workflow"),
  );
}

{
  assert.throws(
    () => reviewActivityModelCandidate(REFUND_TRIAGE_BRIEF, {}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("activity_model"),
  );
}

{
  assert.throws(
    () => reviewUiWorkflowCandidate(REFUND_TRIAGE_BRIEF, {}),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("workflow"),
  );
}

{
  await assert.rejects(
    () =>
      createModelAssistedActivityModelReview(REFUND_TRIAGE_BRIEF, {
        propose: async () => ({}),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("activity_model"),
  );
}

{
  await assert.rejects(
    () =>
      createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {
        propose: async () => ({}),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("workflow"),
  );
}

console.log("createActivityModelReview checks passed.");
