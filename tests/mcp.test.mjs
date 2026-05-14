import assert from "node:assert/strict";

import {
  getMcpMetadata,
  handleToolCall,
  listTools,
} from "../src/mcp.mjs";

const tools = listTools();
const metadata = getMcpMetadata("stdio");
const OLD_TOOL_NAMES = [
  "list_resources",
  "get_resource",
  "get_workflow_bundle",
  "get_page_markdown",
  "get_example",
  "resolve_related",
];

assert.deepEqual(
  tools.map((tool) => tool.name),
  [
    "analyze_implementation_brief",
    "create_activity_model_review",
    "recommend_surface_types",
    "recommend_ui_workflow_profiles",
    "review_activity_model_candidate",
    "review_ui_workflow_candidate",
    "create_ui_implementation_contract",
    "review_ui_implementation_candidate",
    "create_ui_generation_handoff",
    "create_frontend_generation_context",
  ],
);
assert.equal(metadata.name, "JudgmentKit");
assert.deepEqual(metadata.capabilities.prompts, []);
for (const oldToolName of OLD_TOOL_NAMES) {
  assert.equal(
    tools.some((tool) => tool.name === oldToolName),
    false,
    `MCP catalog must not expose old tool ${oldToolName}`,
  );
}
assert.equal(tools[0].inputSchema.required.includes("brief"), true);
assert.equal(tools[0].inputSchema.properties.brief.minLength, 1);
assert.equal(tools[1].inputSchema.required.includes("brief"), true);
assert.equal(tools[1].inputSchema.properties.brief.minLength, 1);
assert.equal(tools[2].inputSchema.required.includes("brief"), true);
assert.equal(tools[3].inputSchema.required.includes("brief"), true);
assert.equal(tools[4].inputSchema.required.includes("brief"), true);
assert.equal(tools[4].inputSchema.required.includes("candidate"), true);
assert.equal(tools[5].inputSchema.required.includes("brief"), true);
assert.equal(tools[5].inputSchema.required.includes("candidate"), true);
assert.equal(tools[5].inputSchema.properties.profile_id.type, "string");
assert.equal(tools[5].inputSchema.properties.surface_type.type, "string");
assert.equal(tools[6].inputSchema.properties.approved_primitives.type, "array");
assert.equal(tools[7].inputSchema.required.includes("candidate"), true);
assert.equal(tools[7].inputSchema.required.includes("implementation_contract"), true);
assert.equal(tools[8].inputSchema.required.includes("workflow_review"), true);
assert.equal(tools[8].inputSchema.required.includes("implementation_contract"), true);
assert.equal(tools[9].inputSchema.required.includes("ui_generation_handoff"), true);

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

const refundWorkflowCandidate = {
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

function createUiImplementationContractFixture() {
  return {
    approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
    required_states: ["selected item", "handoff sent"],
    static_rules: ["npm test"],
    browser_qa_checks: ["desktop review", "mobile review"],
  };
}

{
  const result = await handleToolCall("analyze_implementation_brief", {
    brief:
      "A support operations manager is auditing an integration setup workflow. The activity is deciding whether a JSON schema change, data model update, prompt template change, and API endpoint change are safe to ship, then producing a handoff with the next action for the platform team.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.contract_id, "judgmentkit.ai-ui-generation.activity-contract");
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
  assert.equal(result.contract_id, "judgmentkit.ai-ui-generation.activity-contract");
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
  const result = await handleToolCall("recommend_surface_types", {
    brief:
      "A product analyst is reviewing product analytics cohorts during weekly planning. The activity is comparing funnel evidence, deciding which experiment to prioritize, and handing the next action to the growth team. The outcome is a chosen experiment and handoff reason.",
  });

  assert.equal("error" in result, false);
  assert.equal(result.recommended_surface_type, "workbench");
  assert.equal(result.frontend_posture.density, "operational");
  assert.ok(result.interaction_implications.primary_structure.includes("Item selection"));
}

{
  const result = await handleToolCall("recommend_ui_workflow_profiles", {
    brief:
      "An operator reviews several AI agent findings, compares evidence and release risk, decides whether each finding is approved, blocked, deferred, tightened, or handed off, and leaves an audit receipt while raw tool call traces stay diagnostic.",
  });

  assert.equal("error" in result, false);
  assert.deepEqual(result.recommended_profile_ids, ["operator-review-ui"]);
  assert.deepEqual(result.blocked_profile_ids, []);
  assert.equal(result.recommendations[0].status, "recommended");
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
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: refundWorkflowCandidate,
    profile_id: "operator-review-ui",
    surface_type: "workbench",
  });

  assert.equal("error" in result, false);
  assert.equal(result.review_status, "ready_for_review");
  assert.equal(result.source.mode, "model_assisted");
  assert.equal(result.source.proposer, "external_candidate");
  assert.equal(result.guidance_profile.profile_id, "operator-review-ui");
  assert.equal(result.surface_type, "workbench");
  assert.ok(result.candidate.workflow.surface_name.includes("Refund escalation"));
  assert.ok(result.candidate.workflow.primary_actions.includes("Approve refund"));
  assert.deepEqual(result.guardrails.candidate_primary_terms_detected, []);
  assert.deepEqual(result.guardrails.candidate_primary_meta_terms_detected, []);

  const implementationContract = await handleToolCall("create_ui_implementation_contract", {
    target_stack: "React",
    approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
    static_rules: ["npm test"],
    browser_qa_checks: ["desktop review", "mobile review"],
  });

  assert.equal("error" in implementationContract, false);
  assert.equal(implementationContract.implementation_contract_status, "ready");

  const implementationReview = await handleToolCall("review_ui_implementation_candidate", {
    implementation_contract: implementationContract,
    candidate: {
      primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
      states_covered: implementationContract.implementation_contract.state_coverage.required_states,
      static_checks: ["npm test"],
      browser_qa: { desktop: "passed", mobile: "passed" },
    },
  });

  assert.equal("error" in implementationReview, false);
  assert.equal(implementationReview.implementation_review_status, "passed");

  const handoffResult = await handleToolCall("create_ui_generation_handoff", {
    workflow_review: result,
    implementation_contract: implementationContract,
  });

  assert.equal("error" in handoffResult, false);
  assert.equal(handoffResult.handoff_status, "ready_for_generation");
  assert.equal(handoffResult.guidance_profile.profile_id, "operator-review-ui");
  assert.equal(handoffResult.surface_type, "workbench");
  assert.ok(handoffResult.workflow.primary_actions.includes("Approve refund"));
  assert.ok(handoffResult.primary_surface.sections.includes("Evidence checklist"));

  const frontendContext = await handleToolCall("create_frontend_generation_context", {
    ui_generation_handoff: handoffResult,
    frontend_context: {
      target_runtime: "React",
      ui_library: "Material UI",
      approved_component_families: ["queue", "detail panel", "decision controls"],
    },
    verification: {
      commands: ["npm test"],
      states_to_verify: ["selected item", "handoff sent"],
    },
  });

  assert.equal("error" in frontendContext, false);
  assert.equal(frontendContext.frontend_context_status, "ready_for_frontend_implementation");
  assert.equal(frontendContext.surface_type, "workbench");
  assert.ok(frontendContext.implementation_guidance.required_sections.includes("Evidence checklist"));
  assert.ok(frontendContext.implementation_guidance.verification_expectations.commands.includes("npm test"));
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {
      ...refundWorkflowCandidate,
      workflow: {
        ...refundWorkflowCandidate.workflow,
        surface_name: "ready_for_review JSON schema console",
      },
      primary_ui: {
        ...refundWorkflowCandidate.primary_ui,
        sections: ["Activity", "Prompt template"],
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
  assert.ok(
    result.guardrails.candidate_primary_meta_terms_detected.some(
      (entry) => entry.term === "ready_for_review",
    ),
  );
  assert.equal(JSON.stringify(result.candidate.workflow).includes("JSON schema"), false);
  assert.equal(JSON.stringify(result.candidate.primary_ui).includes("Prompt template"), false);

  const handoffResult = await handleToolCall("create_ui_generation_handoff", {
    workflow_review: result,
    implementation_contract: createUiImplementationContractFixture(),
  });

  assert.equal("error" in handoffResult, true);
  assert.equal(handoffResult.error.code, "handoff_blocked");
  assert.equal(handoffResult.error.details.review_status, "needs_source_context");
  assert.ok(
    handoffResult.error.details.implementation_leakage_terms.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
}

{
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: refundWorkflowCandidate,
    profile_id: "missing-profile",
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
  assert.ok(result.error.message.includes("Unknown UI workflow guidance profile"));
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
  const result = await handleToolCall("review_ui_workflow_candidate", {
    brief:
      "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
    candidate: {},
  });

  assert.equal("error" in result, true);
  assert.equal(result.error.code, "invalid_input");
}

{
  const result = await handleToolCall("create_ui_generation_handoff", {
    workflow_review: {},
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
