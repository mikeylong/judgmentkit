import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  JudgmentKitInputError,
  buildActivityModelCandidateRequest,
  buildUiWorkflowCandidateRequest,
  createActivityModelProposer,
  createUiWorkflowProposer,
  createActivityModelReview,
  createModelAssistedActivityModelReview,
  createModelAssistedUiWorkflowReview,
  recommendUiWorkflowProfiles,
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

function assertNoProductUiWorkflowLeaks(packet) {
  const primaryCandidateText = stringify({
    workflow: packet.candidate.workflow,
    surface_set: packet.candidate.surface_set,
    product_terms: packet.candidate.product_terms,
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
  and leaving the dispatch team with a completed next action. The field operations
  manager may approve the handoff.
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
      next_actions: ["Field operations manager approves the handoff."],
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

function refundPrioritizationCandidate() {
  return {
    activity_model: {
      activity: "Support leads triage refund requests.",
      participants: ["support leads"],
      objective: "Identify which refund requests need attention first.",
      outcomes: ["A prioritized set of refund requests is ready for follow-up."],
      domain_vocabulary: ["refund requests", "triage", "follow-up"],
    },
    interaction_contract: {
      primary_decision: "Decide which refund requests need attention first.",
      next_actions: ["Prioritize a refund request for follow-up."],
      completion: "A prioritized set of refund requests is ready for follow-up.",
      make_easy: ["Compare refund requests and record the next follow-up."],
    },
    disclosure_policy: {
      terms_to_use: ["refund requests", "triage", "follow-up"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
    claims: [
      {
        id: "completion_assumption",
        path: "interaction_contract.completion",
        value: "A prioritized set of refund requests is ready for follow-up.",
        origin: "user_stated",
        source_refs: ["brief"],
        confidence: "medium",
        materiality: "low",
        alternatives: [],
        impact_if_wrong: "The concept may need a different follow-up receipt.",
        reversibility: "easy",
      },
      {
        id: "next_action_convention",
        path: "interaction_contract.next_actions",
        value: ["Prioritize a refund request for follow-up."],
        origin: "convention_assumed",
        source_refs: ["brief"],
        confidence: "medium",
        materiality: "low",
        alternatives: [],
        impact_if_wrong: "The first concept direction may need a different next action.",
        reversibility: "easy",
      },
    ],
  };
}

function refundApprovalCandidate() {
  const candidate = refundPrioritizationCandidate();
  candidate.activity_model.objective =
    "Approve a refund request or deny it as the final decision.";
  candidate.activity_model.outcomes = ["The refund decision is committed."];
  candidate.interaction_contract.primary_decision =
    "Approve or deny the refund request as the final decision.";
  candidate.interaction_contract.next_actions = ["Commit the refund decision."];
  candidate.interaction_contract.completion = "The refund decision is committed.";
  candidate.claims = [
    {
      id: "refund_authority",
      path: "interaction_contract.primary_decision",
      value: "Support leads may approve or deny refund requests.",
      origin: "model_inferred",
      source_refs: [],
      confidence: "medium",
      materiality: "high",
      alternatives: [
        "Support leads only recommend a refund decision",
        "Support leads commit the refund decision",
      ],
      impact_if_wrong: "The interface would expose the wrong commitment authority.",
      reversibility: "costly",
    },
  ];
  return candidate;
}

function clinicalDischargeCandidate() {
  const candidate = refundPrioritizationCandidate();
  candidate.activity_model = {
    activity: "Nurses review clinical intake cases.",
    participants: ["nurses"],
    objective: "Decide whether each patient is safe to discharge.",
    outcomes: ["A clinical discharge decision is recorded."],
    domain_vocabulary: ["clinical intake", "patient", "discharge"],
  };
  candidate.interaction_contract = {
    primary_decision: "Decide whether each patient is safe to discharge.",
    next_actions: ["Clear the patient for discharge."],
    completion: "A clinical discharge decision is recorded.",
    make_easy: ["Review clinical intake evidence."],
  };
  candidate.disclosure_policy = {
    terms_to_use: ["clinical intake", "patient", "discharge"],
    hidden_implementation_terms: [],
    translation_candidates: [],
    diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
  };
  candidate.claims = [
    {
      id: "clinical_safety_rule",
      path: "interaction_contract.safety_rule",
      value: "A nurse may clear a patient as safe to discharge.",
      origin: "model_inferred",
      source_refs: [],
      confidence: "medium",
      materiality: "high",
      alternatives: [],
      impact_if_wrong: "An unsafe clinical action could advance.",
      reversibility: "unsafe",
    },
  ];
  return candidate;
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
        purpose: "Review refund context, evidence, policy details, and handoff result.",
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
  ];
  candidate.handoff.next_action = "Send the recommendation.";
  return candidate;
}

function fieldOperationsWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Repair visit dispatch review",
      topology: "workspace",
      work_units: [
        "Review repair visit",
        "Compare route constraints",
        "Field operations manager approves handoff",
      ],
      primary_actions: [
        "Assign technician",
        "Field operations manager approves handoff",
        "Return to dispatch",
      ],
      decision_points: ["Decide which technician should handle the next job."],
      completion_state: "Dispatch team leaves with a completed next action.",
    },
    surface_set: [
      {
        name: "Repair visit dispatch review",
        purpose: "Compare repair visit details, route constraints, and technician options.",
        sections: ["Repair visit", "Route constraints", "Technician options", "Handoff"],
        controls: [
          "Assign technician",
          "Field operations manager approves handoff",
        ],
        relationship_to_workflow: "Keeps dispatch evidence near the assignment decision.",
      },
    ],
    handoff: {
      next_owner: "dispatch team",
      reason: "Technician assignment is ready for dispatch.",
      next_action: "Field operations manager approves the handoff.",
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
  assertTextIncludes(stringify(request), "claims");
  assertTextIncludes(stringify(request), "refund requests");
  assertTextIncludes(stringify(request), "infer reasonable reversible gaps");
  assertTextIncludes(stringify(request), "do not provide hidden chain-of-thought");
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
  const packet = reviewActivityModelCandidate(
    "A refund triage tool.",
    refundPrioritizationCandidate(),
  );

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.activity_case.schema, "judgmentkit.activity-case/v1");
  assert.equal(packet.activity_case.mode, "inference_first");
  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.readiness.exploration,
    "allowed_with_visible_assumptions",
  );
  assert.equal(packet.activity_case.readiness.commitment, "not_authorized");
  assert.ok(packet.activity_case.assumptions.length > 0);
  assert.deepEqual(packet.activity_case.unresolved_ambiguities, []);
  assert.deepEqual(packet.review.targeted_questions, []);
  assert.equal(packet.review.confidence, "medium");
  assert.equal(
    packet.source.brief_sha256,
    createHash("sha256").update("A refund triage tool.").digest("hex"),
  );
  assert.deepEqual(
    {
      activity: packet.review.evidence.activity,
      domain_vocabulary: packet.review.evidence.domain_vocabulary,
      decision: packet.review.evidence.decision,
      outcome: packet.review.evidence.outcome,
    },
    {
      activity: false,
      domain_vocabulary: false,
      decision: true,
      outcome: false,
    },
    "A useful one-signal prompt should not be blocked by a legacy evidence-count gate.",
  );

  const completionClaim = packet.activity_case.claims.find(
    (claim) => claim.path === "interaction_contract.completion",
  );
  assert.equal(completionClaim.origin, "model_inferred");
  assert.deepEqual(completionClaim.source_refs, []);
  const nextActionsClaim = packet.activity_case.claims.find(
    (claim) => claim.path === "interaction_contract.next_actions",
  );
  assert.equal(nextActionsClaim.origin, "convention_assumed");
  assert.deepEqual(nextActionsClaim.source_refs, []);
  assert.equal(nextActionsClaim.confidence, "medium");
}

{
  const recommendationCandidate = refundPrioritizationCandidate();
  recommendationCandidate.interaction_contract.next_actions = [
    "Recommend approval",
    "Record the approval recommendation",
  ];
  const packet = reviewActivityModelCandidate(
    "A refund triage tool.",
    recommendationCandidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "participant_authority",
    ),
    false,
    "Recommendation language must not be mistaken for authority to approve.",
  );
}

for (const safeCreativeActivity of [
  "Explore color combinations in a safe sandbox.",
  "Choose a safe color combination for a marketing draft.",
  "Create a safe area around the logo.",
]) {
  const candidate = {
    activity_model: {
      activity: safeCreativeActivity,
      participants: ["designer"],
      objective: safeCreativeActivity,
      outcomes: ["A reversible visual direction is ready to compare."],
      domain_vocabulary: ["color combination", "marketing draft", "logo"],
    },
    interaction_contract: {
      primary_decision: safeCreativeActivity,
      next_actions: ["Compare another visual direction."],
      completion: "A reversible visual direction is ready to compare.",
      make_easy: ["Compare alternatives without committing the final design."],
    },
    disclosure_policy: {
      terms_to_use: ["color combination", "marketing draft", "logo"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(safeCreativeActivity, candidate);

  assert.equal(
    packet.activity_case.readiness.decision,
    "proceed",
    `Ordinary design language must not trigger a safety stop: ${safeCreativeActivity}`,
  );
}

{
  const legalResearchBrief = [
    "Create a legal research workspace for paralegals.",
    "They compare a court decision with related decisions and identify the most relevant holding.",
    "The outcome is a research memo that an attorney can review.",
  ].join(" ");
  const legalResearchCandidate = {
    activity_model: {
      activity: "Paralegals conduct legal research by comparing court decisions.",
      participants: ["paralegals", "attorney"],
      objective: "Compare a court decision with related decisions and identify the most relevant holding.",
      outcomes: ["A legal research memo is ready for attorney review."],
      domain_vocabulary: ["legal research", "court decision", "holding", "research memo"],
    },
    interaction_contract: {
      primary_decision: "Decide which court decision best answers the legal research question.",
      next_actions: ["Add the relevant holding to the research memo."],
      completion: "A legal research memo is ready for attorney review.",
      make_easy: ["Compare decisions and preserve their citations."],
    },
    disclosure_policy: {
      terms_to_use: ["legal research", "court decision", "holding", "research memo"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(
    legalResearchBrief,
    legalResearchCandidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_safety_rule",
    ),
    false,
    "Researching and comparing court decisions must not imply governing legal authority.",
  );
}

{
  const governingLegalActionCandidate = {
    activity_model: {
      activity: "Paralegals prepare regulatory filings.",
      participants: ["paralegals"],
      objective: "Determine whether the filing is legally permitted and submit it.",
      outcomes: ["A binding regulatory decision is acted on."],
      domain_vocabulary: ["regulatory filing", "legal requirement", "authorization"],
    },
    interaction_contract: {
      primary_decision: "Determine whether the filing is legally permitted.",
      next_actions: ["Submit the filing without attorney review."],
      completion: "The regulatory filing is submitted.",
      make_easy: ["Apply the governing legal requirement."],
    },
    disclosure_policy: {
      terms_to_use: ["regulatory filing", "legal requirement", "authorization"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(
    "Create a regulatory filing workspace for paralegals.",
    governingLegalActionCandidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_safety_rule",
    ),
    "A governing legal or regulatory action must still require an authoritative source.",
  );
}

{
  const medicationCandidate = {
    activity_model: {
      activity: "Clinicians review a patient's medication plan.",
      participants: ["clinicians"],
      objective: "Choose a dosage for the medication.",
      outcomes: ["A prescription is ready to send."],
      domain_vocabulary: ["medication", "dosage", "prescription"],
    },
    interaction_contract: {
      primary_decision: "Choose the medication dosage.",
      next_actions: ["Prescribe the medication", "Send the prescription"],
      completion: "A prescription is ready to send.",
      make_easy: ["Review the medication plan before prescribing."],
    },
    disclosure_policy: {
      terms_to_use: ["medication", "dosage", "prescription"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(
    "Create a medication review workspace for clinicians.",
    medicationCandidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.ok(packet.review.targeted_questions[0].includes("authoritative safety"));
}

{
  const materialForkCandidate = refundPrioritizationCandidate();
  const completionClaim = materialForkCandidate.claims.find(
    (claim) => claim.path === "interaction_contract.completion",
  );
  completionClaim.origin = "model_inferred";
  completionClaim.materiality = "high";
  completionClaim.alternatives = [
    "A ranked work queue",
    "A completed handoff to another participant",
  ];
  completionClaim.impact_if_wrong =
    "The concepts would optimize for a different completion state.";
  completionClaim.reversibility = "costly";
  const packet = reviewActivityModelCandidate(
    "A refund triage tool.",
    materialForkCandidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "ask");
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "material_alternatives",
    ),
  );
}

{
  const packet = reviewActivityModelCandidate(
    "Design a refund triage tool for support leads.",
    refundApprovalCandidate(),
  );

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.equal(
    packet.activity_case.readiness.exploration,
    "blocked_for_authoritative_source",
  );
  assert.equal(packet.review.targeted_questions.length, 1);
  assert.ok(packet.review.targeted_questions[0].includes("authoritative source"));
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "participant_authority",
    ),
  );
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_irreversible_action",
    ),
  );
}

{
  const candidate = refundPrioritizationCandidate();
  candidate.claims.push({
    id: "manufactured_authority_evidence",
    path: "interaction_contract.participant_authority",
    value: "refund triage",
    origin: "source_supported",
    source_refs: ["brief"],
    confidence: "high",
    materiality: "high",
    alternatives: [],
    impact_if_wrong: "The wrong participant could be treated as the decision authority.",
    reversibility: "costly",
  });
  const packet = reviewActivityModelCandidate(
    "A refund triage tool.",
    candidate,
  );

  const authorityClaim = packet.activity_case.claims.find(
    (claim) => claim.id === "manufactured_authority_evidence",
  );
  assert.equal(authorityClaim.origin, "model_inferred");
  assert.deepEqual(authorityClaim.source_refs, []);
  assert.equal(packet.activity_case.readiness.decision, "ask");
}

{
  const clinicalCandidate = clinicalDischargeCandidate();

  const packet = reviewActivityModelCandidate(
    "Design a clinical intake review for nurses.",
    clinicalCandidate,
  );

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.equal(
    packet.activity_case.readiness.exploration,
    "blocked_for_authoritative_source",
  );
  assert.ok(packet.review.targeted_questions[0].includes("authoritative safety"));
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_safety_rule",
    ),
  );
}

{
  const packet = createActivityModelReview([
    "A nurse is reviewing clinical intake cases during the daily discharge workflow.",
    "The activity is deciding whether a patient is safe to discharge, sent to physician review, or held for missing evidence.",
    "The outcome is a clinical discharge decision with the next action and reason.",
    "The nurse clears safe patients for discharge.",
  ].join(" "));

  assert.equal(packet.review_status, "needs_source_context");
  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.ok(packet.review.targeted_questions[0].includes("authoritative safety"));
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_safety_rule",
    ),
    "The deterministic baseline must not label an unsupported clinical safety rule ready.",
  );
}

{
  const candidate = clinicalDischargeCandidate();
  const clinicalBrief = [
    "Nurses review clinical intake cases.",
    "Decide whether each patient is safe to discharge.",
    "A clinical discharge decision is recorded.",
    "Clear the patient for discharge.",
    "A nurse may clear a patient as safe to discharge.",
  ].join(" ");
  const packet = reviewActivityModelCandidate(clinicalBrief, candidate);
  const safetyClaim = packet.activity_case.claims.find(
    (claim) => claim.id === "clinical_safety_rule",
  );

  assert.equal(safetyClaim.origin, "source_supported");
  assert.deepEqual(safetyClaim.authoritative_source_refs, []);
  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.ok(packet.review.targeted_questions[0].includes("authoritative safety"));
}

{
  const nonGoverningClinicalContent = [
    "Nurses review clinical intake cases.",
    "The participants are nurses.",
    "Decide whether each patient is safe to discharge.",
    "A clinical discharge decision is recorded.",
    "The approved vocabulary is clinical intake, patient, and discharge.",
    "Clear the patient for discharge.",
    "A nurse may clear a patient as safe to discharge.",
  ].join(" ");

  for (const kind of [
    "user_answer",
    "workspace_evidence",
    "provided_artifact",
  ]) {
    const packet = reviewActivityModelCandidate(
      "Design a clinical intake review for nurses.",
      clinicalDischargeCandidate(),
      {
        context_items: [
          {
            id: `${kind}-clinical-grant`,
            kind,
            content: nonGoverningClinicalContent,
          },
        ],
      },
    );
    const safetyClaim = packet.activity_case.claims.find(
      (claim) => claim.id === "clinical_safety_rule",
    );

    assert.equal(
      packet.activity_case.readiness.decision,
      "stop",
      `${kind} must not establish a governing clinical boundary.`,
    );
    assert.deepEqual(safetyClaim.authoritative_source_refs, []);
  }
}

{
  const candidate = clinicalDischargeCandidate();
  const authoritativeContent = [
    "Nurses review clinical intake cases.",
    "The participants are nurses.",
    "Decide whether each patient is safe to discharge.",
    "A clinical discharge decision is recorded.",
    "The approved vocabulary is clinical intake, patient, and discharge.",
    "Clear the patient for discharge.",
    "A nurse may clear a patient as safe to discharge.",
  ].join(" ");
  const packet = reviewActivityModelCandidate(
    "Design a clinical intake review for nurses.",
    candidate,
    {
      context_items: [
        {
          id: "clinical-discharge-policy",
          kind: "authoritative_source",
          content: authoritativeContent,
          source_ref: "policy://clinical-discharge/v3",
        },
      ],
    },
  );
  const safetyClaims = packet.activity_case.claims.filter((claim) =>
    claim.authoritative_source_refs.includes("clinical-discharge-policy"));

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.ok(safetyClaims.length > 0);
  assert.equal(packet.source.context_items[0].kind, "authoritative_source");
  assert.equal(packet.source.context_items[0].source_ref, "policy://clinical-discharge/v3");
  assert.equal(stringify(packet.source).includes(authoritativeContent), false);
}

{
  const candidate = clinicalDischargeCandidate();
  const prohibitingAuthority = [
    "Nurses review clinical intake cases.",
    "The participants are nurses.",
    "Decide whether each patient is safe to discharge.",
    "A clinical discharge decision is recorded.",
    "The approved vocabulary is clinical intake, patient, and discharge.",
    "Nurses must not clear the patient for discharge.",
    "A nurse may not clear a patient as safe to discharge.",
  ].join(" ");
  const packet = reviewActivityModelCandidate(
    "Design a clinical intake review for nurses.",
    candidate,
    {
      context_items: [
        {
          id: "prohibiting-clinical-policy",
          kind: "authoritative_source",
          content: prohibitingAuthority,
          source_ref: "policy://clinical-discharge/prohibited",
        },
      ],
    },
  );
  const nextActionsClaim = packet.activity_case.claims.find(
    (claim) => claim.path === "interaction_contract.next_actions",
  );

  assert.equal(packet.activity_case.readiness.decision, "ask");
  assert.deepEqual(nextActionsClaim.authoritative_source_refs, []);
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) =>
        entry.category === "authoritative_safety_rule" &&
        entry.resolution === "candidate_revision",
    ),
  );
}

{
  const brief = "Design a clinical record review workspace for assigned nurses.";
  const contextItem = {
    id: "assigned-record-policy",
    kind: "authoritative_source",
    source_ref: "policy://records/assigned-team/v1",
    content:
      "Assigned nurses may view patient medical records for patients on their assigned care team.",
  };
  const genericCandidate = {
    activity_model: {
      activity: "Assigned nurses review records.",
      participants: ["assigned nurses"],
      objective: "Review assigned records.",
      outcomes: ["The record review is complete."],
      domain_vocabulary: ["records"],
    },
    interaction_contract: {
      primary_decision: "Assigned nurses may view records.",
      next_actions: ["View records"],
      completion: "The record review is complete.",
      make_easy: ["Open records."],
    },
    disclosure_policy: {
      terms_to_use: ["records"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(brief, genericCandidate, {
    context_items: [contextItem],
  });
  const contextualClaims = packet.activity_case.claims.filter((claim) =>
    claim.context_boundary_expected);

  assert.equal(packet.activity_case.readiness.decision, "ask");
  assert.ok(contextualClaims.length > 0);
  assert.ok(
    contextualClaims
      .filter((claim) => !claim.path.startsWith("context_items."))
      .every((claim) => claim.source_refs.length === 0),
    "A generic candidate must not inherit the source's actor, information, or scope boundary.",
  );
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) =>
        entry.category === "sensitive_disclosure_boundary" &&
        entry.resolution === "candidate_revision",
    ),
  );
  assert.ok(
    packet.activity_case.claims.some(
      (claim) =>
        claim.path ===
        "context_items.assigned-record-policy.protected_boundary",
    ),
  );
}

{
  const packet = reviewActivityModelCandidate(
    "Design endpoint settings for integration engineers.",
    {
      activity_model: {
        activity: "Integration engineers configure endpoint settings.",
        participants: ["integration engineers"],
        objective: "Restore a working endpoint connection.",
        outcomes: ["The endpoint connection is configured."],
        domain_vocabulary: ["endpoint", "connection", "settings"],
      },
      interaction_contract: {
        primary_decision: "Choose the endpoint configuration.",
        next_actions: ["View connection status", "Open endpoint configuration"],
        completion: "The endpoint connection is configured.",
        make_easy: ["Compare endpoint settings."],
      },
      disclosure_policy: {
        terms_to_use: ["endpoint", "connection", "settings"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    {
      context_items: [
        {
          id: "unrelated-medical-policy",
          kind: "authoritative_source",
          source_ref: "policy://records/assigned-team/v1",
          content:
            "Assigned nurses may view patient medical records for patients on their assigned care team.",
        },
      ],
    },
  );

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.claims.some(
      (claim) =>
        claim.path ===
          "context_items.unrelated-medical-policy.protected_boundary" ||
        claim.context_boundary_expected,
    ),
    false,
    "An unrelated protected source must not contaminate the activity case.",
  );
}

{
  const candidate = refundApprovalCandidate();
  candidate.activity_model.participants = ["finance managers"];
  candidate.activity_model.activity = "Finance managers triage refund requests.";
  candidate.activity_model.outcomes = ["Each refund request has a decision."];
  candidate.interaction_contract.primary_decision =
    "Finance managers may approve requests up to 100 dollars.";
  candidate.interaction_contract.next_actions = [
    "Finance managers approve requests up to 100 dollars.",
  ];
  candidate.interaction_contract.completion =
    "Each refund request has a decision.";
  candidate.claims = [];
  const packet = reviewActivityModelCandidate(
    "Design refund triage for finance managers.",
    candidate,
    {
      context_items: [
        {
          id: "refund-limit-answer",
          kind: "user_answer",
          content:
            "Only finance managers may approve refund requests up to 100 dollars.",
        },
      ],
    },
  );

  assert.equal(packet.activity_case.readiness.decision, "ask");
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) =>
        entry.category === "participant_authority" &&
        entry.resolution === "candidate_revision",
    ),
  );
  assert.ok(packet.review.targeted_questions[0].includes("Revise the candidate"));
}

{
  assert.throws(
    () =>
      reviewActivityModelCandidate(
        "Design a clinical intake review for nurses.",
        clinicalDischargeCandidate(),
        {
          context_items: [
            {
              id: "clinical-policy-without-source-ref",
              kind: "authoritative_source",
              content: "A nurse may clear a patient as safe to discharge.",
            },
          ],
        },
      ),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "authoritative_source_ref_required",
  );
}

{
  const sensitiveCandidate = refundPrioritizationCandidate();
  sensitiveCandidate.claims = [
    {
      id: "customer_visibility",
      path: "disclosure_policy.sensitive_information",
      value: "Support leads may view confidential customer payment details.",
      origin: "model_inferred",
      source_refs: [],
      confidence: "medium",
      materiality: "high",
      alternatives: [],
      impact_if_wrong: "Confidential customer information could be disclosed.",
      reversibility: "unsafe",
    },
  ];

  const packet = reviewActivityModelCandidate(
    "Design a refund triage tool for support leads.",
    sensitiveCandidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "stop");
  assert.ok(packet.review.targeted_questions[0].includes("sensitive information"));
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "sensitive_disclosure_boundary",
    ),
  );
}

{
  const unsafeDisclosure =
    "Support leads may view confidential customer payment details.";
  const cases = [
    {
      field: "hidden_implementation_terms",
      value: [{ detected_term: unsafeDisclosure, count: 1 }],
    },
    {
      field: "translation_candidates",
      value: [
        {
          detected_term: "confidential customer payment details",
          count: 1,
          prefer: unsafeDisclosure,
        },
      ],
    },
    {
      field: "diagnostic_contexts",
      value: [unsafeDisclosure],
    },
  ];

  for (const disclosureCase of cases) {
    const candidate = refundPrioritizationCandidate();
    candidate.disclosure_policy[disclosureCase.field] = disclosureCase.value;
    candidate.claims.push({
      id: `benign_${disclosureCase.field}`,
      path: `disclosure_policy.${disclosureCase.field}`,
      value: "setup",
      origin: "source_supported",
      source_refs: ["brief"],
      confidence: "high",
      materiality: "low",
      alternatives: [],
      impact_if_wrong: "",
      reversibility: "easy",
    });

    const packet = reviewActivityModelCandidate(
      "Support leads review refund requests and decide which need follow-up first.",
      candidate,
    );
    const derivedClaim = packet.activity_case.claims.find(
      (claim) => claim.path === `disclosure_policy.${disclosureCase.field}`,
    );

    assert.equal(
      packet.activity_case.readiness.decision,
      "stop",
      `${disclosureCase.field} must fail closed on an unverified sensitive-disclosure rule.`,
    );
    assert.ok(derivedClaim);
    assert.ok(stringify(derivedClaim.value).includes("confidential customer payment"));
    assert.deepEqual(derivedClaim.source_refs, []);
    assert.ok(
      packet.activity_case.unresolved_ambiguities.some(
        (entry) =>
          entry.claim_id === derivedClaim.id &&
          entry.category === "sensitive_disclosure_boundary",
      ),
    );
  }
}

{
  const candidate = refundPrioritizationCandidate();
  candidate.disclosure_policy.hidden_implementation_terms = ["PII"];
  const packet = reviewActivityModelCandidate(
    "Support leads review refund requests and decide which need follow-up first.",
    candidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "sensitive_disclosure_boundary",
    ),
    false,
    "Naming a sensitive term in the hide list is not permission to view or disclose it.",
  );
}

{
  const sensitiveDisclosurePhrases = [
    "Support leads can view confidential customer payment details.",
    "Support leads are allowed to view confidential customer payment details.",
    "Confidential customer payment details are visible to support leads.",
    "Support leads can see confidential customer payment details.",
    "Support leads have access to confidential customer payment details.",
    "Support leads may view credit card numbers.",
    "Support leads may view Social Security numbers.",
    "Support leads may view customer passwords.",
    "Support leads may view bank account numbers.",
    "Support leads may view protected health information.",
    "Support leads may view private API credentials.",
    "Fraud investigators view confidential customer payment details.",
    "Auditors see confidential customer payment details.",
    "Claims specialists read confidential customer payment details.",
    "Risk investigators inspect confidential customer payment details.",
    "Support leads are shown confidential customer payment details.",
    "Fraud investigators receive confidential customer payment details.",
    "Confidential customer payment details appear on the investigator screen.",
    "The system displays confidential customer payment details for fraud investigators.",
  ];

  for (const phrase of sensitiveDisclosurePhrases) {
    const candidate = refundPrioritizationCandidate();
    candidate.disclosure_policy.diagnostic_contexts = [phrase];
    const packet = reviewActivityModelCandidate(
      "Support leads review refund requests and decide which need follow-up first.",
      candidate,
    );

    assert.equal(
      packet.activity_case.readiness.decision,
      "stop",
      `Sensitive disclosure wording must fail closed: ${phrase}`,
    );
    assert.ok(
      packet.activity_case.unresolved_ambiguities.some(
        (entry) => entry.category === "sensitive_disclosure_boundary",
      ),
    );
  }
}

{
  const ordinarySensitiveObjectActivities = [
    {
      brief:
        "Support agents help users reset forgotten passwords and leave each account ready for sign-in.",
      candidate: {
        activity_model: {
          activity: "Support agents help users reset forgotten passwords.",
          participants: ["support agents", "users"],
          objective: "Complete a password reset.",
          outcomes: ["The account is ready for sign-in."],
          domain_vocabulary: ["password reset", "account", "sign-in"],
        },
        interaction_contract: {
          primary_decision: "Decide whether the password reset is complete.",
          next_actions: ["Complete the password reset."],
          completion: "The account is ready for sign-in.",
          make_easy: ["Recover account access without exposing credentials."],
        },
      },
    },
    {
      brief:
        "Administrators inventory expiring API credentials and decide which credential needs rotation first.",
      candidate: {
        activity_model: {
          activity: "Administrators inventory expiring API credentials.",
          participants: ["administrators"],
          objective: "Prioritize credential rotation.",
          outcomes: ["An ordered credential rotation plan is ready."],
          domain_vocabulary: ["API credentials", "expiration", "rotation"],
        },
        interaction_contract: {
          primary_decision: "Decide which credential needs rotation first.",
          next_actions: ["Prioritize a credential for rotation."],
          completion: "An ordered credential rotation plan is ready.",
          make_easy: ["Compare expiration dates."],
        },
      },
    },
    {
      brief:
        "Users can see password reset progress and decide whether another recovery step is needed.",
      candidate: {
        activity_model: {
          activity: "Users review password reset progress.",
          participants: ["users"],
          objective: "See password reset progress.",
          outcomes: ["The next recovery step is clear."],
          domain_vocabulary: ["password reset progress", "recovery step"],
        },
        interaction_contract: {
          primary_decision: "Decide whether another recovery step is needed.",
          next_actions: ["Continue account recovery."],
          completion: "The next recovery step is clear.",
          make_easy: ["Understand reset progress."],
        },
      },
    },
    {
      brief:
        "Administrators can see when API credentials expire and prioritize the next rotation.",
      candidate: {
        activity_model: {
          activity: "Administrators review API credential expiration.",
          participants: ["administrators"],
          objective: "See when API credentials expire.",
          outcomes: ["The next credential rotation is prioritized."],
          domain_vocabulary: ["API credential expiration", "rotation"],
        },
        interaction_contract: {
          primary_decision: "Decide which credential needs rotation next.",
          next_actions: ["Prioritize the next rotation."],
          completion: "The next credential rotation is prioritized.",
          make_easy: ["Compare expiration timing."],
        },
      },
    },
  ];

  for (const activityCase of ordinarySensitiveObjectActivities) {
    activityCase.candidate.disclosure_policy = {
      terms_to_use: activityCase.candidate.activity_model.domain_vocabulary,
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: [],
    };
    const packet = reviewActivityModelCandidate(
      activityCase.brief,
      activityCase.candidate,
    );

    assert.equal(
      packet.activity_case.readiness.decision,
      "proceed",
      "Working with a sensitive object is not itself a disclosure grant.",
    );
    assert.equal(
      packet.activity_case.unresolved_ambiguities.some(
        (entry) => entry.category === "sensitive_disclosure_boundary",
      ),
      false,
    );
  }
}

{
  const authoritativeDisclosureRules = [
    "Support leads can see confidential customer payment details.",
    "Confidential customer payment details are visible to support leads.",
  ];

  for (const [index, rule] of authoritativeDisclosureRules.entries()) {
    const candidate = refundPrioritizationCandidate();
    candidate.disclosure_policy.diagnostic_contexts = [rule];
    const sourceId = `customer-payment-policy-${index + 1}`;
    const packet = reviewActivityModelCandidate(
      "Support leads review refund requests and decide which need follow-up first.",
      candidate,
      {
        context_items: [
          {
            id: sourceId,
            kind: "authoritative_source",
            content: rule,
            source_ref: `policy://customer-payment/${index + 1}`,
          },
        ],
      },
    );
    const disclosureClaim = packet.activity_case.claims.find(
      (claim) => claim.path === "disclosure_policy.diagnostic_contexts",
    );

    assert.equal(packet.activity_case.readiness.decision, "proceed");
    assert.ok(disclosureClaim.authoritative_source_refs.includes(sourceId));
  }
}

{
  const restrictiveDisclosureStatements = [
    "Support leads may not view confidential customer payment details.",
    "Support leads do not view confidential customer payment details.",
    "Confidential customer payment details are not visible to support leads.",
    "Support leads are not shown confidential customer payment details.",
    "Fraud investigators do not receive confidential customer payment details.",
    "Confidential customer payment details do not appear on the investigator screen.",
    "The system does not display confidential customer payment details for fraud investigators.",
  ];

  for (const statement of restrictiveDisclosureStatements) {
    const candidate = refundPrioritizationCandidate();
    candidate.disclosure_policy.diagnostic_contexts = [statement];
    const packet = reviewActivityModelCandidate(
      "Support leads review refund requests and decide which need follow-up first.",
      candidate,
    );

    assert.equal(packet.activity_case.readiness.decision, "proceed");
    assert.equal(
      packet.activity_case.unresolved_ambiguities.some(
        (entry) => entry.category === "sensitive_disclosure_boundary",
      ),
      false,
      `A restrictive disclosure statement must not become a positive grant: ${statement}`,
    );
  }
}

{
  const completeCandidate = {
    activity_model: {
      activity: "Dispatchers assign field work.",
      participants: ["dispatcher", "technician"],
      objective: "Assign the right technician.",
      outcomes: ["A work order is assigned."],
      domain_vocabulary: ["work order", "technician"],
      existing_tools_artifacts: ["dispatch board"],
      rules_rituals: ["Morning assignment huddle"],
      division_of_labor: [
        { participant: "dispatcher", responsibility: "Assign work" },
      ],
    },
    interaction_contract: {
      primary_decision: "Choose the technician.",
      next_actions: ["Assign the work order."],
      completion: "The work order is assigned.",
      make_easy: ["Compare availability."],
      user_is_trying_to: "Assign each work order to the right technician.",
      user_thinks_about_work_as: "balancing the route",
      user_does_not_think_about_work_as: "editing dispatch records",
      primary_decisions: ["Choose the technician."],
      make_harder: ["Double-booking"],
      state_changes: ["Unassigned to assigned"],
      leave_screen_knowing_or_done: ["The work order has a clear owner."],
    },
    disclosure_policy: {
      terms_to_use: ["work order", "technician"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: [],
    },
  };
  const packet = reviewActivityModelCandidate(
    "Dispatchers assign field work orders to technicians. Choose the technician and assign the work order.",
    completeCandidate,
  );

  assert.deepEqual(
    packet.candidate.activity_model.existing_tools_artifacts,
    ["dispatch board"],
  );
  assert.deepEqual(packet.candidate.activity_model.rules_rituals, [
    "Morning assignment huddle",
  ]);
  assert.deepEqual(packet.candidate.activity_model.division_of_labor, [
    { participant: "dispatcher", responsibility: "Assign work" },
  ]);
  assertTextIncludes(
    packet.candidate.interaction_contract.user_thinks_about_work_as,
    "Balancing the route",
  );
  assert.deepEqual(packet.candidate.interaction_contract.make_harder, [
    "Double-booking",
  ]);
  assert.deepEqual(packet.candidate.interaction_contract.state_changes, [
    "Unassigned to assigned",
  ]);
  assert.ok(
    packet.activity_case.claims.some(
      (claim) => claim.path === "activity_model.division_of_labor",
    ),
  );
  assert.ok(
    packet.activity_case.claims.some(
      (claim) => claim.path === "interaction_contract.state_changes",
    ),
  );
}

{
  const candidate = refundPrioritizationCandidate();
  candidate.activity_model.existing_tools_artifacts = ["safety checklist"];
  candidate.activity_model.rules_rituals = ["morning safety huddle"];
  const packet = reviewActivityModelCandidate(
    [
      "Support leads triage refund requests and decide which need follow-up first.",
      "They use a safety checklist and hold a morning safety huddle.",
      "A prioritized set of refund requests is ready for follow-up.",
    ].join(" "),
    candidate,
  );

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_safety_rule",
    ),
    false,
    "Safety-named artifacts and rituals are not governing safety rules by name alone.",
  );
}

{
  const authorityContent =
    "Support leads may approve or deny refund requests and commit the final refund decision.";
  for (const kind of ["workspace_evidence", "provided_artifact"]) {
    const sourceId = `${kind}-authority-control`;
    const packet = reviewActivityModelCandidate(
      "Design a refund triage tool for support leads.",
      refundApprovalCandidate(),
      {
        context_items: [
          {
            id: sourceId,
            kind,
            content: authorityContent,
          },
        ],
      },
    );

    const primaryDecisionClaim = packet.activity_case.claims.find(
      (claim) => claim.path === "interaction_contract.primary_decision",
    );
    assert.equal(primaryDecisionClaim.origin, "model_inferred");
    assert.deepEqual(primaryDecisionClaim.source_refs, []);
    assert.equal(
      packet.activity_case.readiness.decision,
      "stop",
      `${kind} must not grant participant action authority.`,
    );
    assert.ok(packet.review.targeted_questions[0].includes("authoritative source"));
  }
}

{
  const completionContent =
    "A prioritized set of refund requests is ready for follow-up.";
  const packet = reviewActivityModelCandidate(
    "A refund triage tool.",
    refundPrioritizationCandidate(),
    {
      context_items: [
        {
          id: "existing-refund-receipt",
          kind: "provided_artifact",
          content: completionContent,
        },
      ],
    },
  );

  const completionClaim = packet.activity_case.claims.find(
    (claim) => claim.path === "interaction_contract.completion",
  );
  assert.equal(completionClaim.origin, "workspace_observed");
  assert.deepEqual(completionClaim.source_refs, ["existing-refund-receipt"]);
  assert.equal(packet.activity_case.readiness.decision, "proceed");
}

{
  const authorityContent =
    "Support leads may approve or deny refund requests.";
  const candidate = refundApprovalCandidate();
  candidate.activity_model.objective =
    "Support leads approve or deny refund requests.";
  candidate.activity_model.outcomes = ["The refund decision is recorded."];
  candidate.interaction_contract.primary_decision =
    "Support leads approve or deny refund requests.";
  candidate.interaction_contract.next_actions = [
    "Support leads approve or deny the refund request.",
  ];
  candidate.interaction_contract.completion = "The refund decision is recorded.";
  candidate.claims[0].value =
    "Support leads may approve or deny refund requests.";
  candidate.claims[0].alternatives = [];
  candidate.claims[0].impact_if_wrong = "";
  candidate.claims[0].reversibility = "easy";
  candidate.claims[0].origin = "user_stated";
  candidate.claims[0].source_refs = ["brief", "unrelated-context"];
  const packet = reviewActivityModelCandidate(
    "Design a refund triage tool for support leads.",
    candidate,
    {
      context_items: [
        {
          id: "designer-authority-answer",
          kind: "user_answer",
          content: authorityContent,
        },
        {
          id: "unrelated-context",
          kind: "workspace_evidence",
          content: "The current dashboard uses a compact density setting.",
        },
      ],
    },
  );

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(packet.source.context_items[0].id, "designer-authority-answer");
  assert.equal(
    packet.source.context_items[0].sha256,
    createHash("sha256").update(authorityContent).digest("hex"),
  );
  assert.equal("content" in packet.source.context_items[0], false);
  assert.equal(stringify(packet.source).includes(authorityContent), false);
  const primaryDecisionClaim = packet.activity_case.claims.find(
    (claim) => claim.path === "interaction_contract.primary_decision",
  );
  assert.equal(primaryDecisionClaim.origin, "source_supported");
  assert.deepEqual(primaryDecisionClaim.source_refs, ["designer-authority-answer"]);
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
  for (const term of [
    "MCP server",
    "JSON schema",
    "resource id",
    "prompt template",
    "tool call trace",
    "model configuration",
  ]) {
    const leakyCandidate = refundTriageCandidate();
    leakyCandidate.disclosure_policy.terms_to_use = [
      "refund request",
      term,
    ];
    const packet = reviewActivityModelCandidate(
      REFUND_TRIAGE_BRIEF,
      leakyCandidate,
    );

    assert.equal(
      packet.review_status,
      "needs_source_context",
      `Primary product vocabulary must reject implementation term: ${term}`,
    );
    assert.ok(
      packet.guardrails.candidate_primary_terms_detected.length > 0,
      `No implementation term was detected for product vocabulary: ${term}`,
    );
    assert.equal(
      stringify({
        terms_to_use: packet.candidate.disclosure_policy.terms_to_use,
        domain_vocabulary: packet.candidate.activity_model.domain_vocabulary,
      }).toLowerCase().includes(term.toLowerCase()),
      false,
      `Implementation vocabulary leaked into the normalized activity packet: ${term}`,
    );
  }
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
  const setupBrief =
    "Build an MCP server setup screen where developers configure an endpoint and test the connection.";
  const setupCandidate = {
    activity_model: {
      activity: "Developers configure an MCP server endpoint.",
      participants: ["developers"],
      objective: "Connect the MCP server and verify that the endpoint responds.",
      outcomes: ["The MCP server connection is verified or has a clear diagnostic."],
      domain_vocabulary: ["MCP server", "endpoint", "connection test"],
    },
    interaction_contract: {
      primary_decision: "Decide whether the MCP server endpoint is configured correctly.",
      next_actions: ["Test the endpoint connection.", "Correct the MCP server configuration."],
      completion: "The connection test records a verified result or a next fix.",
      make_easy: ["Configure the endpoint and inspect the connection result."],
    },
    disclosure_policy: {
      terms_to_use: ["MCP server", "endpoint", "connection test"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(setupBrief, setupCandidate);

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(packet.guardrails.setup_diagnostic_context, true);
  assert.deepEqual(packet.guardrails.candidate_primary_terms_detected, []);
  assertTextIncludes(packet.candidate.activity_model.activity, "MCP server");
  assertTextIncludes(
    packet.candidate.interaction_contract.primary_decision,
    "endpoint",
  );

  const workflowReview = reviewUiWorkflowCandidate(
    setupBrief,
    {
      workflow: {
        surface_name: "MCP server setup",
        topology: "workspace",
        work_units: ["Configure endpoint", "Test connection", "Record next fix"],
        primary_actions: ["Test endpoint", "Save MCP server configuration"],
        decision_points: ["Decide whether the endpoint connection is valid."],
        completion_state: "The MCP server has a verified connection or a recorded next fix.",
      },
      surface_set: [
        {
          name: "MCP server setup",
          purpose: "Configure the endpoint and verify the connection.",
          sections: ["Endpoint configuration", "Connection test", "Diagnostic result"],
          controls: ["Test endpoint", "Save MCP server configuration"],
          relationship_to_workflow: "Keeps configuration, test status, and remediation together.",
        },
      ],
      handoff: {
        next_owner: "developer",
        reason: "The connection result identifies whether configuration is complete.",
        next_action: "Use the verified MCP server or apply the recorded next fix.",
      },
      diagnostics: {
        implementation_terms: ["MCP server", "endpoint"],
        reveal_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    {
      activity_review: packet,
      surface_type: "setup_debug_tool",
    },
  );

  assert.equal(workflowReview.review_status, "ready_for_review");
  assert.equal(workflowReview.guardrails.setup_diagnostic_context, true);
  assert.deepEqual(workflowReview.guardrails.candidate_primary_terms_detected, []);
  assertTextIncludes(workflowReview.candidate.workflow.surface_name, "MCP server");
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
    "surface_set",
    "handoff",
    "diagnostics",
  ]);
  assertTextIncludes(stringify(request), "candidate_shape");
  assertTextIncludes(stringify(request), "refund requests");
  assertTextIncludes(stringify(request), "judgmentkit.activity-case/v1");
  assertTextIncludes(stringify(request), "Keep implementation terms");
  assertTextIncludes(stringify(request), "work_units");
  assertTextIncludes(stringify(request), "strong staged-flow intent");
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

      return refundRecommendationWorkflowCandidate();
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
  assertIncludes(packet.candidate.workflow.primary_actions, "Recommend approval");
  assert.equal("steps" in packet.candidate.workflow, false);
  assert.equal("primary_ui" in packet.candidate, false);
  assertIncludes(packet.candidate.surface_set[0].sections, "Evidence checklist");
  assertTextIncludes(packet.candidate.handoff.next_action, "Send the recommendation");
  assert.deepEqual(packet.guardrails.candidate_primary_terms_detected, []);
  assert.deepEqual(packet.guardrails.candidate_primary_meta_terms_detected, []);
  assertNoProductUiWorkflowLeaks(packet);
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
  assertNoProductUiWorkflowLeaks(packet);
}

{
  const leakyCandidate = refundWorkflowCandidate();
  leakyCandidate.workflow.surface_name = "Refund JSON schema console";
  leakyCandidate.workflow.primary_actions = ["Save CRUD update", "Send to policy review"];
  leakyCandidate.surface_set[0].sections = ["Prompt template", "Evidence checklist"];

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
  assertNoProductUiWorkflowLeaks(packet);
}

{
  const leakyCandidate = refundWorkflowCandidate();
  leakyCandidate.workflow.surface_name = "ready_for_review";
  leakyCandidate.surface_set[0].sections = ["Activity", "Evidence checklist"];
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
  assertNoProductUiWorkflowLeaks(packet);
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
  assert.equal("primary_ui" in packet.candidate, false);
  assertIncludes(packet.candidate.product_terms, "field operations manager");
  assertIncludes(packet.candidate.product_terms, "technician");
  assertNoProductUiWorkflowLeaks(packet);
}

{
  const packet = recommendUiWorkflowProfiles(`
    An operations lead reviews several AI agent findings before release.
    Multiple candidates compete for attention. The activity is comparing evidence
    and release risk, then deciding whether each finding should be approved,
    blocked, deferred, tightened, or handed off. Completion requires an audit
    receipt and closure state. Raw tool call traces stay diagnostic.
  `);
  const recommendation = packet.recommendations[0];

  assert.deepEqual(packet.recommended_profile_ids, ["operator-review-ui"]);
  assert.deepEqual(packet.blocked_profile_ids, []);
  assert.equal(recommendation.status, "recommended");
  assert.ok(recommendation.trigger_match_count >= recommendation.trigger_threshold);
  assertIncludes(recommendation.matched_triggers, "competing_work_items");
  assertIncludes(recommendation.matched_triggers, "raw_mechanics_secondary");
}

{
  const packet = recommendUiWorkflowProfiles(`
    A reviewer checks one AI-generated coverage finding before it advances.
    The activity is comparing evidence and risk, deciding whether to approve
    or block the finding, and leaving an audit receipt with the handoff reason.
  `);

  assert.deepEqual(packet.recommended_profile_ids, ["operator-review-ui"]);
  assert.equal(packet.recommendations[0].status, "recommended");
  assert.equal(
    packet.recommendations[0].matched_triggers.includes("competing_work_items"),
    false,
  );
}

{
  const packet = recommendUiWorkflowProfiles(`
    A support operations manager is reviewing an AI-produced integration audit.
    The source brief includes JSON schema changes, prompt template notes, and
    tool call traces, but the activity is comparing evidence and release risk,
    deciding whether to approve, block, or defer the release, and handing off an
    audit receipt to the platform team.
  `);

  assert.deepEqual(packet.recommended_profile_ids, ["operator-review-ui"]);
  assert.ok(
    packet.evidence["operator-review-ui"].implementation_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assertIncludes(
    packet.recommendations[0].matched_triggers,
    "raw_mechanics_secondary",
  );
}

for (const brief of [
  "Build a simple form to submit one setting.",
  "Make a dashboard for the system.",
  "Create a report meant only for reading.",
  "Build an open-ended live chat where the primary activity is conversation.",
  "Run a fully automated workflow with no human review.",
  "Create a debugging tool where raw system mechanics are the primary task.",
]) {
  const packet = recommendUiWorkflowProfiles(brief);

  assert.deepEqual(packet.recommended_profile_ids, []);
  assert.deepEqual(packet.blocked_profile_ids, ["operator-review-ui"]);
  assert.equal(packet.recommendations[0].status, "blocked");
}

{
  const activityReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const request = buildUiWorkflowCandidateRequest({
    brief: REFUND_TRIAGE_BRIEF,
    activity_review: activityReview,
    profile_id: "operator-review-ui",
  });

  assert.equal(request.metadata.guidance_profile_id, "operator-review-ui");
  assert.equal(request.metadata.guidance_profile.pattern_id, "operator-review");
  assertTextIncludes(stringify(request), "guidance_profile");
  assertTextIncludes(stringify(request), "guardrail.control-proximity");
  assertTextIncludes(stringify(request), "do not copy guardrail ids");
  assertNoAdapterRequestKeys(request);
}

{
  let callModelSawProfile = false;
  const activityReview = createActivityModelReview(REFUND_TRIAGE_BRIEF);
  const propose = createUiWorkflowProposer({
    profile_id: "operator-review-ui",
    callModel: async (request) => {
      callModelSawProfile =
        request.metadata.guidance_profile_id === "operator-review-ui" &&
        request.messages.some((message) => message.content.includes("guidance_profile"));

      return refundWorkflowCandidate();
    },
  });
  const candidate = await propose({
    brief: REFUND_TRIAGE_BRIEF,
    activity_review: activityReview,
  });

  assert.equal(callModelSawProfile, true);
  assertTextIncludes(candidate.workflow.surface_name, "Refund escalation");
}

{
  const packet = reviewUiWorkflowCandidate(
    REFUND_TRIAGE_BRIEF,
    refundRecommendationWorkflowCandidate(),
    { profile_id: "operator-review-ui" },
  );

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.guidance_profile.profile_id, "operator-review-ui");
  assert.equal(packet.guidance_profile.pattern_id, "operator-review");
  assert.equal(packet.guardrails.guidance_profile_id, "operator-review-ui");
  assertNoProductUiWorkflowLeaks(packet);
}

{
  const packet = await createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {
    profile_id: "operator-review-ui",
    propose: async ({ profile_id: profileId }) => {
      assert.equal(profileId, "operator-review-ui");
      return refundRecommendationWorkflowCandidate();
    },
  });

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.guidance_profile.profile_id, "operator-review-ui");
}

{
  assert.throws(
    () =>
      reviewUiWorkflowCandidate(REFUND_TRIAGE_BRIEF, refundWorkflowCandidate(), {
        profile_id: "missing-profile",
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("Unknown UI workflow guidance profile") &&
      error.details.available_profile_ids.includes("operator-review-ui"),
  );
}

{
  for (const phrase of [
    "Prepare release notes",
    "Review published report",
    "Read prescription label",
    "Review discharge summary",
  ]) {
    const packet = reviewActivityModelCandidate(
      `Analysts ${phrase.toLowerCase()}. The activity is ${phrase.toLowerCase()}. The outcome is a completed artifact review.`,
      {
        activity_model: {
          activity: phrase,
          participants: ["analysts"],
          objective: phrase,
          outcomes: ["The artifact review is complete."],
          domain_vocabulary: ["artifact review"],
        },
        interaction_contract: {
          primary_decision: "Choose the next review action.",
          next_actions: ["Record the review result."],
          completion: "The artifact review is complete.",
          make_easy: [phrase],
        },
        disclosure_policy: {
          terms_to_use: ["artifact review"],
          hidden_implementation_terms: [],
          translation_candidates: [],
          diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
        },
      },
    );

    assert.equal(
      packet.review_status,
      "ready_for_review",
      `Read-only or artifact wording must not be treated as protected execution: ${phrase}`,
    );
    assert.equal(
      packet.activity_case.claims.some((claim) =>
        [
          "authoritative_irreversible_action",
          "authoritative_safety_rule",
        ].includes(claim.risk_category)),
      false,
      `Read-only or artifact wording produced a protected action risk: ${phrase}`,
    );
  }
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
  assert.throws(
    () => createActivityModelReview(REFUND_TRIAGE_BRIEF, {
      context_items: [
        {
          id: "brief",
          kind: "user_answer",
          content: "This must not overwrite the reserved brief provenance id.",
        },
      ],
    }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("reserved id brief"),
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
  const restrictiveRule =
    "Nurses must not administer medication before physician approval.";
  const candidate = {
    activity_model: {
      activity: "Nurses review medication requests.",
      participants: ["nurses"],
      objective: "Verify the required evidence before continuing.",
      outcomes: ["Requests without required evidence remain pending."],
      domain_vocabulary: ["medication", "physician approval"],
    },
    interaction_contract: {
      primary_decision: restrictiveRule,
      next_actions: ["Do not administer medication before physician approval."],
      completion: "The review records whether the required evidence is present.",
      make_easy: ["See whether the required evidence is present."],
    },
    disclosure_policy: {
      terms_to_use: ["medication", "physician approval"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
  const packet = reviewActivityModelCandidate(
    "Design medication administration review for nurses.",
    candidate,
    {
      context_items: [{
        id: "medication-restriction",
        kind: "authoritative_source",
        source_ref: "policy://medication/physician-approval/v1",
        content: restrictiveRule,
      }],
    },
  );

  assert.equal(packet.activity_case.readiness.decision, "proceed");
  assert.equal(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) => entry.category === "authoritative_safety_rule",
    ),
    false,
    "An exact restrictive rule from its governing source must be retained, not re-requested.",
  );
}

{
  const brief =
    "Support leads recommend a refund route to finance and do not make the final decision.";
  for (const path of [
    "interaction_contract.make_easy",
    "disclosure_policy.terms_to_use",
  ]) {
    const candidate = refundPrioritizationCandidate();
    if (path === "interaction_contract.make_easy") {
      candidate.interaction_contract.make_easy = [
        "Support leads approve refund requests.",
      ];
    } else {
      candidate.disclosure_policy.terms_to_use = [
        "Support leads approve refund requests",
      ];
    }
    const packet = reviewActivityModelCandidate(brief, candidate);
    const riskyClaim = packet.activity_case.claims.find(
      (claim) => claim.path === path,
    );

    assert.equal(packet.activity_case.readiness.decision, "ask");
    assert.equal(riskyClaim.risk_category, "participant_authority");
    assert.ok(
      packet.activity_case.unresolved_ambiguities.some(
        (entry) =>
          entry.claim_id === riskyClaim.id &&
          entry.category === "participant_authority",
      ),
    );
  }
}

{
  const brief = "Design refund decisions for support leads.";
  const passiveAuthority = {
    id: "passive-refund-authority",
    kind: "user_answer",
    content: "Refund requests may be approved or denied by support leads.",
  };
  const candidate = {
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
  };

  const allowed = reviewActivityModelCandidate(brief, candidate, {
    context_items: [passiveAuthority],
  });
  assert.equal(allowed.review_status, "ready_for_review");
  assert.ok(
    allowed.activity_case.claims.some(
      (claim) =>
        claim.risk_category === "participant_authority" &&
        claim.context_participant_grant_available === true,
    ),
  );

  const prohibited = reviewActivityModelCandidate(brief, candidate, {
    context_items: [
      {
        ...passiveAuthority,
        content:
          "Refund requests may not be approved or denied by support leads.",
      },
    ],
  });
  assert.equal(prohibited.review_status, "needs_source_context");
}

{
  const packet = reviewActivityModelCandidate(
    "Design a record review workspace for nurses.",
    {
      activity_model: {
        activity: "Nurses review records.",
        participants: ["nurses"],
        objective: "Review records.",
        outcomes: ["The record review is complete."],
        domain_vocabulary: ["records"],
      },
      interaction_contract: {
        primary_decision: "Nurses may view records.",
        next_actions: ["View records"],
        completion: "The record review is complete.",
        make_easy: ["Open records."],
      },
      disclosure_policy: {
        terms_to_use: ["records"],
        hidden_implementation_terms: [],
        translation_candidates: [],
        diagnostic_contexts: ["setup", "debugging", "auditing", "integration"],
      },
    },
    {
      context_items: [
        {
          id: "nurse-record-policy",
          kind: "authoritative_source",
          source_ref: "policy://records/assigned-patients/v1",
          content:
            "Nurses may view patient medical records only for assigned patients.",
        },
      ],
    },
  );

  assert.equal(packet.review_status, "needs_source_context");
  assert.ok(
    packet.activity_case.unresolved_ambiguities.some(
      (entry) =>
        entry.category === "sensitive_disclosure_boundary" &&
        entry.resolution === "candidate_revision",
    ),
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

{
  const sensitiveSubjects = [
    "SSNs",
    "CVVs",
    "CVCs",
    "PIN",
    "PINs",
    "tax IDs",
    "government IDs",
    "driver license numbers",
    "OAuth tokens",
    "authentication tokens",
    "auth tokens",
    "session tokens",
    "recovery codes",
    "security answers",
    "secret keys",
    "API secrets",
  ];
  const candidateFor = (disclosureRule) => ({
    activity_model: {
      activity: "Support leads review customer cases.",
      participants: ["support leads"],
      objective: "Identify which customer cases need follow-up.",
      outcomes: ["A prioritized set of customer cases is ready."],
      domain_vocabulary: ["customer case", "follow-up"],
    },
    interaction_contract: {
      primary_decision: "Choose the next follow-up for each customer case.",
      next_actions: ["Record the next follow-up."],
      completion: "A prioritized set of customer cases is ready.",
      make_easy: ["Compare customer-case evidence."],
    },
    disclosure_policy: {
      terms_to_use: ["customer case", "follow-up"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: [disclosureRule],
    },
  });

  for (const [index, subject] of sensitiveSubjects.entries()) {
    const rule = `Support leads may view ${subject}.`;
    const unsupported = reviewActivityModelCandidate(
      "Design customer-case review for support leads.",
      candidateFor(rule),
    );
    assert.equal(
      unsupported.review_status,
      "needs_source_context",
      `Sensitive identifier or secret must fail closed without authority: ${subject}`,
    );
    assert.ok(
      unsupported.activity_case.unresolved_ambiguities.some(
        (entry) => entry.category === "sensitive_disclosure_boundary",
      ),
      `Sensitive identifier or secret was not classified: ${subject}`,
    );

    const supported = reviewActivityModelCandidate(
      "Design customer-case review for support leads.",
      candidateFor(rule),
      {
        context_items: [{
          id: `sensitive-disclosure-policy-${index + 1}`,
          kind: "authoritative_source",
          source_ref: `policy://sensitive-disclosure/${index + 1}`,
          content: rule,
        }],
      },
    );
    assert.equal(
      supported.review_status,
      "ready_for_review",
      `An exactly preserved authoritative disclosure grant must pass: ${subject}`,
    );
  }
}

{
  const irreversibleActions = [
    "deploy production releases",
    "issue refund",
    "pay refund",
    "pay invoice",
    "suspend user access",
    "erase records",
    "deactivate user access",
    "release the release",
    "process refund",
    "send refund",
    "disburse refund",
    "credit customer account",
    "charge customer card",
    "debit customer account",
    "wire funds",
    "remit payment",
    "disburse funds",
    "submit payment",
    "book trade",
    "buy securities",
    "sell stock",
    "file tax return",
    "promote build to production",
    "disable account",
    "revoke account access",
    "fire employee",
    "dismiss employee",
    "wipe customer records",
    "remove customer records",
    "expunge customer records",
  ];
  const candidateFor = (rule, vocabulary) => ({
    activity_model: {
      activity: rule,
      participants: ["operations managers"],
      objective: rule,
      outcomes: [rule],
      domain_vocabulary: [vocabulary],
    },
    interaction_contract: {
      primary_decision: rule,
      next_actions: [rule],
      completion: rule,
      make_easy: [rule],
    },
    disclosure_policy: {
      terms_to_use: [vocabulary],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: [],
    },
  });

  for (const [index, action] of irreversibleActions.entries()) {
    const rule = `Operations managers may ${action}.`;
    const unsupported = reviewActivityModelCandidate(
      "Design an operations workspace.",
      candidateFor(rule, action),
    );
    assert.equal(
      unsupported.review_status,
      "needs_source_context",
      `Irreversible authority must fail closed without a source: ${action}`,
    );
    assert.ok(
      unsupported.activity_case.unresolved_ambiguities.some(
        (entry) => entry.category === "authoritative_irreversible_action",
      ),
      `Irreversible action was not classified: ${action}`,
    );

    const supported = reviewActivityModelCandidate(
      "Design an operations workspace.",
      candidateFor(rule, action),
      {
        context_items: [{
          id: `irreversible-action-policy-${index + 1}`,
          kind: "authoritative_source",
          source_ref: `policy://irreversible-action/${index + 1}`,
          content: rule,
        }],
      },
    );
    assert.equal(
      supported.review_status,
      "ready_for_review",
      `An exact authoritative irreversible grant must pass: ${action}`,
    );
  }
}

{
  const brief =
    "Operations managers triage operational requests and decide which need follow-up first.";
  const activityReview = reviewActivityModelCandidate(brief, {
    activity_model: {
      activity: "Operations managers triage operational requests.",
      participants: ["operations managers"],
      objective: "Identify which requests need attention first.",
      outcomes: ["A prioritized set of requests is ready for follow-up."],
      domain_vocabulary: ["operational request", "triage", "follow-up"],
    },
    interaction_contract: {
      primary_decision: "Decide which requests need attention first.",
      next_actions: ["Prioritize a request for follow-up."],
      completion: "A prioritized set of requests is ready for follow-up.",
      make_easy: ["Compare requests and record the next follow-up."],
    },
    disclosure_policy: {
      terms_to_use: ["operational request", "triage", "follow-up"],
      hidden_implementation_terms: [],
      translation_candidates: [],
      diagnostic_contexts: [],
    },
  });
  assert.equal(activityReview.review_status, "ready_for_review");

  const executionSynonyms = [
    "Refund",
    "Process refund",
    "Send refund",
    "Disburse refund",
    "Credit customer account",
    "Charge customer card",
    "Debit customer account",
    "Wire funds",
    "Remit payment",
    "Disburse funds",
    "Submit payment",
    "Book trade",
    "Buy securities",
    "Sell stock",
    "File tax return",
    "Promote build to production",
    "Disable account",
    "Revoke account access",
    "Fire employee",
    "Dismiss employee",
    "Wipe customer records",
    "Remove customer records",
    "Expunge customer records",
  ];
  const workflowFor = (action) => ({
    workflow: {
      surface_name: "Operations recommendation",
      topology: "workspace",
      work_units: ["Review evidence", "Prepare recommendation"],
      primary_actions: [action],
      decision_points: [action],
      completion_state: "A recommendation is ready for handoff.",
    },
    surface_set: [{
      name: "Operations recommendation",
      purpose: "Review evidence and prepare a recommendation.",
      sections: ["Evidence", "Recommendation"],
      controls: [action],
      relationship_to_workflow:
        "Keeps operational evidence near the recommendation.",
    }],
    handoff: {
      next_owner: "decision owner",
      reason: "The recommendation is ready.",
      next_action: "Send recommendation.",
    },
    diagnostics: {
      implementation_terms: [],
      reveal_contexts: [],
    },
  });

  for (const action of executionSynonyms) {
    const review = reviewUiWorkflowCandidate(
      brief,
      workflowFor(action),
      { activity_review: activityReview },
    );
    assert.equal(
      review.review_status,
      "needs_source_context",
      `Execution synonym must not inherit recommendation-only authority: ${action}`,
    );
    assert.ok(
      review.guardrails.authority_mismatches.some((entry) =>
        entry.unsupported_authority_verbs.includes("execute")),
      `Execution synonym produced no execute-authority mismatch: ${action}`,
    );
  }
}

console.log("createActivityModelReview checks passed.");
