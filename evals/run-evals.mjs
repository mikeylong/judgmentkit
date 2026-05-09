import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyzeImplementationBrief,
  createActivityModelProposer,
  createActivityModelReview,
  createModelAssistedActivityModelReview,
  reviewActivityModelCandidate,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES_PATH = path.join(__dirname, "cases.json");

const FORBIDDEN_PACKET_KEYS = new Set([
  "aesthetic",
  "aesthetics",
  "component",
  "component_rule",
  "component_rules",
  "components",
  "design_system",
  "design_token",
  "design_tokens",
  "layout_polish",
  "prompt_surface",
  "resource",
  "resources",
  "style",
  "styles",
  "styling",
  "token",
  "tokens",
  "v1",
  "visual",
  "visual_direction",
  "workflow_bundle",
]);

function readCases() {
  return JSON.parse(fs.readFileSync(CASES_PATH, "utf8"));
}

function detectedTerms(packet) {
  return new Set(packet.implementation_terms_detected.map((entry) => entry.term));
}

function stringifyLower(value) {
  return JSON.stringify(value).toLowerCase();
}

function walkKeys(value, visitor) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visitor(key);
    walkKeys(child, visitor);
  }
}

function checkForbiddenPacketKeys(packet, failures) {
  walkKeys(packet, (key) => {
    if (FORBIDDEN_PACKET_KEYS.has(key)) {
      failures.push(`packet introduced forbidden field key: ${key}`);
    }
  });
}

function checkIncludes(label, actualSet, expectedValues, failures) {
  for (const expectedValue of expectedValues ?? []) {
    if (!actualSet.has(expectedValue)) {
      failures.push(`${label} missing expected value: ${expectedValue}`);
    }
  }
}

function checkExcludes(label, actualSet, expectedValues, failures) {
  for (const expectedValue of expectedValues ?? []) {
    if (actualSet.has(expectedValue)) {
      failures.push(`${label} included forbidden value: ${expectedValue}`);
    }
  }
}

function checkUiBriefExcludes(packet, expectedValues, failures) {
  const uiBriefText = stringifyLower(packet.ui_brief);

  for (const expectedValue of expectedValues ?? []) {
    if (uiBriefText.includes(expectedValue.toLowerCase())) {
      failures.push(`ui_brief leaked implementation term: ${expectedValue}`);
    }
  }
}

function checkPhrases(label, actualValue, expectedValues, failures) {
  const actualText = stringifyLower(actualValue);

  for (const expectedValue of expectedValues ?? []) {
    if (!actualText.includes(expectedValue.toLowerCase())) {
      failures.push(`${label} missing expected phrase: ${expectedValue}`);
    }
  }
}

function checkUiBriefIncludes(packet, expectedFields, failures) {
  for (const [fieldName, expectedValues] of Object.entries(expectedFields ?? {})) {
    checkPhrases(`ui_brief.${fieldName}`, packet.ui_brief[fieldName], expectedValues, failures);
  }
}

function checkReviewQuestionIncludes(packet, expectedValues, failures) {
  const reviewQuestionText = packet.review_questions.join(" ").toLowerCase();

  for (const expectedValue of expectedValues ?? []) {
    if (!reviewQuestionText.includes(expectedValue.toLowerCase())) {
      failures.push(`review_questions missing expected phrase: ${expectedValue}`);
    }
  }
}

function getObservedValue(packet, key) {
  switch (key) {
    case "activity":
      return packet.activity_model.observed_activity;
    case "participants":
      return packet.activity_model.observed_participants;
    case "domain_terms":
      return packet.activity_model.observed_domain_terms;
    case "outcomes":
      return packet.activity_model.observed_outcomes;
    case "primary_decisions":
      return packet.interaction_contract.observed_primary_decisions;
    case "next_actions":
      return packet.interaction_contract.observed_next_actions;
    case "completion":
      return packet.interaction_contract.observed_completion;
    default:
      return undefined;
  }
}

function checkObservedIncludes(packet, expectedObserved, failures) {
  for (const [key, expectedValues] of Object.entries(expectedObserved ?? {})) {
    checkPhrases(`observed.${key}`, getObservedValue(packet, key), expectedValues, failures);
  }
}

function checkObservedEmpty(packet, expectedKeys, failures) {
  for (const key of expectedKeys ?? []) {
    const actualValue = getObservedValue(packet, key);
    const isEmpty =
      actualValue === null ||
      actualValue === undefined ||
      (Array.isArray(actualValue) && actualValue.length === 0);

    if (!isEmpty) {
      failures.push(`observed.${key} expected empty, got ${JSON.stringify(actualValue)}`);
    }
  }
}

function checkEvidence(packet, expectedEvidence, failures) {
  for (const [key, expectedValue] of Object.entries(expectedEvidence ?? {})) {
    const actualValue = packet.activity_model.evidence[key];

    if (actualValue !== expectedValue) {
      failures.push(`activity_model.evidence.${key} expected ${expectedValue}, got ${actualValue}`);
    }
  }
}

function checkDiagnosticTerms(packet, expectedValues, failures) {
  const actualSet = new Set(
    packet.disclosure_policy.diagnostic_terms_detected.map((entry) => entry.detected_term),
  );

  checkIncludes("disclosure_policy.diagnostic_terms_detected", actualSet, expectedValues, failures);
}

function getPath(value, pathExpression) {
  return pathExpression
    .split(".")
    .reduce((current, pathPart) => current?.[pathPart], value);
}

function checkReviewCandidateIncludes(reviewPacket, expectedFields, failures) {
  for (const [pathExpression, expectedValues] of Object.entries(expectedFields ?? {})) {
    checkPhrases(
      `review.candidate.${pathExpression}`,
      getPath(reviewPacket.candidate, pathExpression),
      expectedValues,
      failures,
    );
  }
}

function checkReviewPrimaryExcludes(reviewPacket, expectedValues, failures) {
  const primaryText = stringifyLower({
    activity_model: reviewPacket.candidate.activity_model,
    interaction_contract: reviewPacket.candidate.interaction_contract,
  });

  for (const expectedValue of expectedValues ?? []) {
    if (primaryText.includes(expectedValue.toLowerCase())) {
      failures.push(`review candidate primary fields leaked implementation term: ${expectedValue}`);
    }
  }
}

function checkReviewGuardrailTerms(reviewPacket, expectedValues, failures) {
  const actualSet = new Set(
    reviewPacket.guardrails.implementation_terms_detected.map((entry) => entry.term),
  );

  checkIncludes("review.guardrails.implementation_terms_detected", actualSet, expectedValues, failures);
}

function checkUiWorkflowCandidateIncludes(reviewPacket, expectedFields, failures) {
  for (const [pathExpression, expectedValues] of Object.entries(expectedFields ?? {})) {
    checkPhrases(
      `ui_workflow.candidate.${pathExpression}`,
      getPath(reviewPacket.candidate, pathExpression),
      expectedValues,
    );
  }
}

function checkUiWorkflowPrimaryExcludes(reviewPacket, expectedValues, failures) {
  const primaryText = stringifyLower({
    workflow: reviewPacket.candidate.workflow,
    primary_ui: reviewPacket.candidate.primary_ui,
    handoff: reviewPacket.candidate.handoff,
  });

  for (const expectedValue of expectedValues ?? []) {
    if (primaryText.includes(expectedValue.toLowerCase())) {
      failures.push(`ui workflow primary fields leaked term: ${expectedValue}`);
    }
  }
}

function checkUiWorkflowGuardrailTerms(reviewPacket, expectedValues, failures) {
  const actualSet = new Set(
    reviewPacket.guardrails.candidate_primary_terms_detected.map((entry) => entry.term),
  );

  checkIncludes(
    "ui_workflow.guardrails.candidate_primary_terms_detected",
    actualSet,
    expectedValues,
    failures,
  );
}

function checkUiWorkflowGuardrailMetaTerms(reviewPacket, expectedValues, failures) {
  const actualSet = new Set(
    reviewPacket.guardrails.candidate_primary_meta_terms_detected.map((entry) => entry.term),
  );

  checkIncludes(
    "ui_workflow.guardrails.candidate_primary_meta_terms_detected",
    actualSet,
    expectedValues,
    failures,
  );
}

function checkUiWorkflowPacket(reviewPacket, expectedWorkflow, failures) {
  if (!expectedWorkflow) {
    return;
  }

  if (!reviewPacket) {
    failures.push("ui_workflow expected review packet but no candidate was provided");
    return;
  }

  if (reviewPacket.review_status !== expectedWorkflow.status) {
    failures.push(
      `ui_workflow.review_status expected ${expectedWorkflow.status}, got ${reviewPacket.review_status}`,
    );
  }

  if (
    Number.isInteger(expectedWorkflow.max_targeted_questions) &&
    reviewPacket.review.targeted_questions.length > expectedWorkflow.max_targeted_questions
  ) {
    failures.push(
      `ui_workflow.review.targeted_questions expected at most ${expectedWorkflow.max_targeted_questions}, got ${reviewPacket.review.targeted_questions.length}`,
    );
  }

  checkUiWorkflowCandidateIncludes(
    reviewPacket,
    expectedWorkflow.candidate_includes,
    failures,
  );
  checkUiWorkflowPrimaryExcludes(
    reviewPacket,
    expectedWorkflow.candidate_primary_excludes,
    failures,
  );
  checkUiWorkflowGuardrailTerms(
    reviewPacket,
    expectedWorkflow.guardrail_terms_includes,
    failures,
  );
  checkUiWorkflowGuardrailMetaTerms(
    reviewPacket,
    expectedWorkflow.guardrail_meta_terms_includes,
    failures,
  );
}

function checkReviewPacket(reviewPacket, expectedReview, failures) {
  if (!expectedReview) {
    return;
  }

  if (reviewPacket.review_status !== expectedReview.status) {
    failures.push(
      `review_status expected ${expectedReview.status}, got ${reviewPacket.review_status}`,
    );
  }

  if (
    Number.isInteger(expectedReview.max_targeted_questions) &&
    reviewPacket.review.targeted_questions.length > expectedReview.max_targeted_questions
  ) {
    failures.push(
      `review.targeted_questions expected at most ${expectedReview.max_targeted_questions}, got ${reviewPacket.review.targeted_questions.length}`,
    );
  }

  checkReviewCandidateIncludes(
    reviewPacket,
    expectedReview.candidate_includes,
    failures,
  );
  checkReviewPrimaryExcludes(
    reviewPacket,
    expectedReview.candidate_primary_excludes,
    failures,
  );
  checkReviewGuardrailTerms(
    reviewPacket,
    expectedReview.guardrail_terms_includes,
    failures,
  );
}

async function evaluateCase(testCase) {
  const packet = analyzeImplementationBrief(testCase.brief);
  const reviewPacket = createActivityModelReview(testCase.brief);
  const modelAssistedReviewPacket = testCase.model_candidate
    ? reviewActivityModelCandidate(testCase.brief, testCase.model_candidate)
    : null;
  const expected = testCase.expect;
  const modelResponseCandidate = testCase.model_response_candidate ?? testCase.model_candidate;
  const modelProposerReviewPacket =
    expected.model_proposer && modelResponseCandidate
      ? await createModelAssistedActivityModelReview(testCase.brief, {
          propose: createActivityModelProposer({
            callModel: async () => JSON.stringify(modelResponseCandidate),
          }),
        })
      : null;
  const uiWorkflowReviewPacket = testCase.ui_workflow_candidate
    ? reviewUiWorkflowCandidate(testCase.brief, testCase.ui_workflow_candidate)
    : null;
  const failures = [];
  const terms = detectedTerms(packet);

  if (packet.status !== expected.status) {
    failures.push(`status expected ${expected.status}, got ${packet.status}`);
  }

  if (
    Number.isInteger(expected.min_review_questions) &&
    packet.review_questions.length < expected.min_review_questions
  ) {
    failures.push(
      `review_questions expected at least ${expected.min_review_questions}, got ${packet.review_questions.length}`,
    );
  }

  if (
    Number.isInteger(expected.max_review_questions) &&
    packet.review_questions.length > expected.max_review_questions
  ) {
    failures.push(
      `review_questions expected at most ${expected.max_review_questions}, got ${packet.review_questions.length}`,
    );
  }

  checkIncludes("implementation_terms_detected", terms, expected.detected_includes, failures);
  checkExcludes("implementation_terms_detected", terms, expected.detected_excludes, failures);
  checkUiBriefExcludes(packet, expected.ui_brief_excludes, failures);
  checkUiBriefIncludes(packet, expected.ui_brief_includes, failures);
  checkReviewQuestionIncludes(packet, expected.review_question_includes, failures);
  checkEvidence(packet, expected.evidence, failures);
  checkObservedIncludes(packet, expected.observed_includes, failures);
  checkObservedEmpty(packet, expected.observed_empty, failures);
  checkDiagnosticTerms(packet, expected.diagnostic_terms_includes, failures);
  checkReviewPacket(reviewPacket, expected.review, failures);
  checkReviewPacket(modelAssistedReviewPacket, expected.model_assisted, failures);
  checkReviewPacket(modelProposerReviewPacket, expected.model_proposer, failures);
  checkUiWorkflowPacket(uiWorkflowReviewPacket, expected.ui_workflow, failures);
  checkForbiddenPacketKeys(packet, failures);
  checkForbiddenPacketKeys(reviewPacket, failures);
  checkForbiddenPacketKeys(modelAssistedReviewPacket, failures);
  checkForbiddenPacketKeys(modelProposerReviewPacket, failures);
  checkForbiddenPacketKeys(uiWorkflowReviewPacket, failures);

  return {
    id: testCase.id,
    tags: testCase.tags ?? [],
    passed: failures.length === 0,
    failures,
    observed: {
      status: packet.status,
      implementation_terms_detected: packet.implementation_terms_detected,
      review_questions_count: packet.review_questions.length,
      evidence: packet.activity_model.evidence,
      observed: {
        activity: packet.activity_model.observed_activity,
        participants: packet.activity_model.observed_participants,
        domain_terms: packet.activity_model.observed_domain_terms,
        primary_decisions: packet.interaction_contract.observed_primary_decisions,
        outcomes: packet.activity_model.observed_outcomes,
      },
      review: {
        status: reviewPacket.review_status,
        confidence: reviewPacket.review.confidence,
        targeted_questions_count: reviewPacket.review.targeted_questions.length,
        candidate_activity: reviewPacket.candidate.activity_model.activity,
      },
      model_assisted: modelAssistedReviewPacket
        ? {
            status: modelAssistedReviewPacket.review_status,
            confidence: modelAssistedReviewPacket.review.confidence,
            targeted_questions_count:
              modelAssistedReviewPacket.review.targeted_questions.length,
            candidate_activity:
              modelAssistedReviewPacket.candidate.activity_model.activity,
          }
        : undefined,
      model_proposer: modelProposerReviewPacket
        ? {
            status: modelProposerReviewPacket.review_status,
            confidence: modelProposerReviewPacket.review.confidence,
            targeted_questions_count:
              modelProposerReviewPacket.review.targeted_questions.length,
            candidate_activity:
              modelProposerReviewPacket.candidate.activity_model.activity,
          }
        : undefined,
      ui_workflow: uiWorkflowReviewPacket
        ? {
            status: uiWorkflowReviewPacket.review_status,
            confidence: uiWorkflowReviewPacket.review.confidence,
            targeted_questions_count:
              uiWorkflowReviewPacket.review.targeted_questions.length,
            surface_name: uiWorkflowReviewPacket.candidate.workflow.surface_name,
          }
        : undefined,
    },
  };
}

const results = await Promise.all(readCases().map(evaluateCase));
const failed = results.filter((result) => !result.passed);
const summary = {
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}
