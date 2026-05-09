import assert from "node:assert/strict";

import {
  getMcpMetadata,
  handleToolCall,
  listTools,
} from "../src/mcp.mjs";

const tools = listTools();

assert.deepEqual(
  tools.map((tool) => tool.name),
  [
    "analyze_implementation_brief",
    "create_activity_model_review",
    "review_activity_model_candidate",
  ],
);
assert.deepEqual(getMcpMetadata("stdio").capabilities.prompts, []);
assert.equal(tools[0].inputSchema.required.includes("brief"), true);
assert.equal(tools[0].inputSchema.properties.brief.minLength, 1);
assert.equal(tools[1].inputSchema.required.includes("brief"), true);
assert.equal(tools[1].inputSchema.properties.brief.minLength, 1);
assert.equal(tools[2].inputSchema.required.includes("brief"), true);
assert.equal(tools[2].inputSchema.required.includes("candidate"), true);

const refundTriageCandidate = {
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

{
  const result = await handleToolCall("analyze_implementation_brief", {
    brief:
      "A support operations manager is auditing an integration setup workflow. The activity is deciding whether a JSON schema change, data model update, prompt template change, and API endpoint change are safe to ship, then producing a handoff with the next action for the platform team.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.contract_id, "judgmentkit2.ai-ui-generation.activity-contract");
  assert.equal(result.status, "needs_review");
  assert.ok(
    result.implementation_terms_detected.some((entry) => entry.term === "JSON schema"),
  );
  assert.ok(
    result.implementation_terms_detected.some((entry) => entry.term === "data model"),
  );
  assert.ok(result.activity_model.observed_participants.includes("support operations manager"));
  assert.ok(result.activity_model.observed_domain_terms.includes("integration setup workflow"));
  assert.ok(result.ui_brief.terms_to_use.includes("platform team"));
  assert.equal(result.ui_brief.activity_focus.includes("JSON schema"), false);
  assert.ok(
    result.disclosure_policy.diagnostic_terms_detected.some(
      (entry) => entry.detected_term === "prompt template",
    ),
  );
}

{
  const result = await handleToolCall("create_activity_model_review", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.contract_id, "judgmentkit2.ai-ui-generation.activity-contract");
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.collaboration_mode, "propose_then_review");
  assert.equal(result.source.mode, "deterministic");
  assert.ok(result.candidate.activity_model.activity.includes("refund requests"));
  assert.ok(result.candidate.activity_model.participants.includes("support lead"));
  assert.ok(result.candidate.interaction_contract.primary_decision.includes("case should be approved"));
}

{
  const result = await handleToolCall("create_activity_model_review", {
    brief:
      "A support operations manager is auditing an integration setup workflow. The activity is deciding whether a JSON schema change and prompt template update are safe to ship, then producing a handoff with the next action for the platform team.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.guardrails.analyzer_status, "needs_review");
  assert.equal(
    JSON.stringify(result.candidate.activity_model).includes("JSON schema"),
    false,
  );
  assert.ok(
    result.candidate.disclosure_policy.hidden_implementation_terms.some(
      (entry) => entry.detected_term === "JSON schema",
    ),
  );
}

{
  const result = await handleToolCall("review_activity_model_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: refundTriageCandidate,
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.source.mode, "model_assisted");
  assert.equal(result.source.proposer, "external_candidate");
  assert.ok(result.candidate.activity_model.activity.includes("refund requests"));
  assert.ok(result.candidate.interaction_contract.primary_decision.includes("case should be approved"));
  assert.deepEqual(result.guardrails.candidate_primary_terms_detected, []);
}

{
  const result = await handleToolCall("review_activity_model_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {
      ...refundTriageCandidate,
      activity_model: {
        ...refundTriageCandidate.activity_model,
        activity: "Support lead reviews the JSON schema.",
      },
    },
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "needs_source_context");
  assert.ok(
    result.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.equal(JSON.stringify(result.candidate.activity_model).includes("JSON schema"), false);
}

{
  const result = await handleToolCall("analyze_implementation_brief", {
    brief: "  ",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("create_activity_model_review", {
    brief: "  ",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("review_activity_model_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {},
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("get_workflow_bundle", {
    workflow_id: "workflow.ai-ui-generation",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_request");
}

console.log("MCP library checks passed.");
