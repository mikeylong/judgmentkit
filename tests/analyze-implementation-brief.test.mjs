import assert from "node:assert/strict";

import {
  JudgmentKitInputError,
  analyzeImplementationBrief,
} from "../src/index.mjs";

const FORBIDDEN_UI_BRIEF_TERMS = [
  "MCP server",
  "tools/list",
  "tool call",
  "prompt template",
  "JSON schema",
  "resource id",
  "data model",
  "database table",
  "API endpoint",
  "CRUD",
];
const FORBIDDEN_FIELD_NAMES = [
  "style",
  "styles",
  "styling",
  "aesthetic",
  "aesthetics",
  "visual",
  "visual_direction",
  "tokens",
  "components",
  "layout_polish",
  "design_system",
];

function terms(packet) {
  return packet.implementation_terms_detected.map((entry) => entry.term);
}

function stringify(value) {
  return JSON.stringify(value);
}

function walkKeys(value, keys = []) {
  if (!value || typeof value !== "object") {
    return keys;
  }

  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    walkKeys(child, keys);
  }

  return keys;
}

function assertNoForbiddenUiBriefTerms(packet) {
  const uiBriefText = stringify(packet.ui_brief).toLowerCase();

  for (const term of FORBIDDEN_UI_BRIEF_TERMS) {
    assert.equal(
      uiBriefText.includes(term.toLowerCase()),
      false,
      `ui_brief leaked implementation term: ${term}`,
    );
  }
}

function assertNoForbiddenFieldNames(packet) {
  const keys = walkKeys(packet);

  for (const fieldName of FORBIDDEN_FIELD_NAMES) {
    assert.equal(
      keys.includes(fieldName),
      false,
      `packet includes forbidden styling field: ${fieldName}`,
    );
  }
}

function assertIncludes(values, expectedValue) {
  assert.ok(
    values.includes(expectedValue),
    `Expected ${JSON.stringify(values)} to include ${expectedValue}`,
  );
}

function assertTextIncludes(value, expectedValue) {
  assert.ok(
    value.includes(expectedValue),
    `Expected ${JSON.stringify(value)} to include ${expectedValue}`,
  );
}

{
  const packet = analyzeImplementationBrief(`
    Build an admin screen from the customer data model. Show every database table field,
    the JSON schema, prompt template, tool call result, resource id, and API endpoint.
    Make it CRUD so the agent can expose tools/list diagnostics.
  `);

  assert.equal(packet.version, "0.1.0");
  assert.equal(packet.contract_id, "judgmentkit2.ai-ui-generation.activity-contract");
  assert.equal(packet.status, "needs_review");
  assert.ok(terms(packet).includes("JSON schema"));
  assert.ok(terms(packet).includes("prompt template"));
  assert.ok(terms(packet).includes("tool call"));
  assert.ok(terms(packet).includes("data model"));
  assert.ok(terms(packet).includes("database table"));
  assert.ok(terms(packet).includes("API endpoint"));
  assert.ok(packet.review_questions.length >= 3);
  assert.ok(
    packet.disclosure_policy.diagnostic_terms_detected.some(
      (entry) => entry.detected_term === "JSON schema",
    ),
  );
  assert.ok(
    packet.disclosure_policy.translation_candidates.some(
      (entry) => entry.detected_term === "resource" && entry.prefer === "guidance",
    ),
  );
  assertNoForbiddenUiBriefTerms(packet);
  assertNoForbiddenFieldNames(packet);
}

{
  const packet = analyzeImplementationBrief(`
    A support lead is reviewing refund requests during the daily triage workflow.
    The activity is deciding whether a case should be approved, sent to policy review,
    or returned to the agent for missing evidence. The outcome is a clear handoff
    with the next action and the reason for the decision.
  `);

  assert.equal(packet.status, "ready");
  assert.equal(packet.review_questions.length, 0);
  assert.equal(packet.activity_model.evidence.activity, true);
  assert.equal(packet.activity_model.evidence.domain_vocabulary, true);
  assert.equal(packet.activity_model.evidence.decision, true);
  assert.equal(packet.activity_model.evidence.outcome, true);
  assertTextIncludes(packet.activity_model.observed_activity, "case should be approved");
  assertIncludes(packet.activity_model.observed_participants, "support lead");
  assertIncludes(packet.activity_model.observed_domain_terms, "refund requests");
  assertIncludes(packet.activity_model.observed_domain_terms, "policy review");
  assertIncludes(packet.activity_model.observed_domain_terms, "missing evidence");
  assertTextIncludes(
    packet.interaction_contract.observed_primary_decisions[0],
    "case should be approved",
  );
  assertTextIncludes(packet.interaction_contract.observed_completion, "clear handoff");
  assertTextIncludes(packet.ui_brief.activity_focus, "case should be approved");
  assertTextIncludes(packet.ui_brief.primary_decision, "case should be approved");
  assertTextIncludes(packet.ui_brief.outcome, "clear handoff");
  assertIncludes(packet.ui_brief.terms_to_use, "refund requests");
  assertIncludes(packet.ui_brief.terms_to_use, "policy review");
  assert.equal(
    packet.ui_brief.purpose,
    "Support the named activity with a concise surface focused on decisions and next actions.",
  );
  assertNoForbiddenUiBriefTerms(packet);
  assertNoForbiddenFieldNames(packet);
}

{
  const packet = analyzeImplementationBrief("Make a dashboard for the system.");

  assert.equal(packet.status, "needs_review");
  assert.equal(packet.activity_model.observed_activity, null);
  assert.deepEqual(packet.activity_model.observed_participants, []);
  assert.deepEqual(packet.activity_model.observed_domain_terms, []);
  assert.deepEqual(packet.interaction_contract.observed_primary_decisions, []);
  assert.equal(
    packet.ui_brief.activity_focus,
    "Clarify the activity before proposing a primary surface.",
  );
  assertNoForbiddenFieldNames(packet);
}

{
  const packet = analyzeImplementationBrief(`
    A support operations manager is auditing an integration setup workflow.
    The activity is deciding whether a JSON schema change and prompt template update are safe to ship,
    then producing a handoff with the next action for the platform team.
  `);

  assert.equal(packet.status, "needs_review");
  assertTextIncludes(packet.activity_model.observed_activity, "JSON schema");
  assertIncludes(packet.activity_model.observed_participants, "support operations manager");
  assertIncludes(packet.activity_model.observed_participants, "platform team");
  assertIncludes(packet.ui_brief.terms_to_use, "integration setup workflow");
  assertIncludes(packet.ui_brief.terms_to_use, "platform team");
  assert.ok(
    packet.disclosure_policy.diagnostic_terms_detected.some(
      (entry) => entry.detected_term === "prompt template",
    ),
  );
  assertNoForbiddenUiBriefTerms(packet);
  assertNoForbiddenFieldNames(packet);
}

{
  const packet = analyzeImplementationBrief(`
    A field operations manager is reviewing repair visits. The activity is deciding
    which technician should handle the next job, comparing route constraints,
    approving the handoff, and leaving the dispatch team with a completed next action.
  `);

  assert.equal(packet.status, "ready");
  assert.equal(terms(packet).includes("field"), false);
  assertIncludes(packet.activity_model.observed_participants, "field operations manager");
  assertIncludes(packet.activity_model.observed_participants, "dispatch team");
  assertIncludes(packet.activity_model.observed_domain_terms, "repair visits");
  assertIncludes(packet.activity_model.observed_domain_terms, "route constraints");
  assertIncludes(packet.activity_model.observed_domain_terms, "technician");
  assertTextIncludes(packet.ui_brief.primary_decision, "technician should handle");
  assertIncludes(packet.ui_brief.terms_to_use, "field operations manager");
  assertNoForbiddenFieldNames(packet);
}

{
  assert.throws(
    () => analyzeImplementationBrief("   "),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("non-empty text input"),
  );
}

console.log("analyzeImplementationBrief checks passed.");
