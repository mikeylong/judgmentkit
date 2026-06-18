import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function textContent(response) {
  return response.content.find((entry) => entry.type === "text")?.text ?? "";
}

function assertPlanningCard(response, heading, status) {
  const text = textContent(response);

  assert.ok(text.includes(heading));
  assert.ok(text.includes(`**Status:** ${status}`));
  assert.equal(text.trim().startsWith("{"), false);
  assert.equal(text.includes('"structuredContent"'), false);

  return text;
}

function coreAccessibilityEvidence() {
  return {
    automated_checks: {
      status: "pass",
      method: "static accessibility checks",
      artifacts: ["npm test"],
    },
    semantic_content: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic content verified.",
    },
    landmarks_headings: {
      status: "pass",
      method: "accessibility tree inspection",
      notes: "Landmarks and headings verified.",
    },
    name_role_value: {
      status: "pass",
      method: "accessibility tree inspection",
      notes: "Names, roles, states, and values verified.",
    },
    keyboard_navigation: {
      status: "pass",
      method: "keyboard walkthrough",
      notes: "All actions are keyboard operable.",
    },
    focus_order: {
      status: "pass",
      method: "keyboard walkthrough",
      notes: "Focus order preserves meaning.",
    },
    focus_visible: {
      status: "pass",
      method: "browser review",
      notes: "Focus indicators remain visible.",
    },
    responsive_no_overflow: {
      status: "pass",
      method: "desktop and mobile browser review",
      notes: "No responsive overflow.",
    },
  };
}

let transport;
let client;
let stderrOutput = "";

try {
  transport = new StdioClientTransport({
    command: "npm",
    args: ["--prefix", process.cwd(), "run", "mcp:stdio", "--silent"],
    cwd: process.cwd(),
    stderr: "pipe",
  });

  transport.stderr?.on("data", (chunk) => {
    stderrOutput += chunk.toString();
  });

  client = new Client({
    name: "judgmentkit-stdio-test-client",
    version: "1.0.0",
  });

  await withTimeout(client.connect(transport), 5_000);

  const toolsResponse = await withTimeout(client.listTools(), 5_000);

  assert.deepEqual(
    toolsResponse.tools.map((tool) => tool.name),
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
      "create_frontend_implementation_skill_context",
    ],
  );

  const analyzeResponse = await withTimeout(
    client.callTool({
      name: "analyze_implementation_brief",
      arguments: {
        brief:
          "A support operations manager is auditing an integration setup workflow. The activity is deciding whether a customer JSON schema, prompt template, and data model change are safe to ship, then producing a handoff with the next action for the platform team.",
      },
    }),
    5_000,
  );

  assert.equal(analyzeResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      analyzeResponse,
      "## JudgmentKit Brief Analysis",
      "Needs review",
    ).includes("JSON schema"),
  );
  assert.equal(analyzeResponse.structuredContent.status, "needs_review");
  assert.ok(
    analyzeResponse.structuredContent.implementation_terms_detected.some(
      (entry) => entry.term === "JSON schema",
    ),
  );
  assert.ok(
    analyzeResponse.structuredContent.implementation_terms_detected.some(
      (entry) => entry.term === "prompt template",
    ),
  );
  assert.ok(
    analyzeResponse.structuredContent.activity_model.observed_participants.includes(
      "support operations manager",
    ),
  );
  assert.ok(
    analyzeResponse.structuredContent.ui_brief.terms_to_use.includes(
      "integration setup workflow",
    ),
  );
  assert.equal(
    analyzeResponse.structuredContent.ui_brief.primary_decision.includes("JSON schema"),
    false,
  );

  const reviewResponse = await withTimeout(
    client.callTool({
      name: "create_activity_model_review",
      arguments: {
        brief:
          "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
      },
    }),
    5_000,
  );

  assert.equal(reviewResponse.isError, undefined);
  const reviewText = assertPlanningCard(
    reviewResponse,
    "## JudgmentKit Activity Review",
    "Ready for concept planning",
  );

  assert.ok(reviewText.includes("**Primary decision:**"));
  assert.ok(reviewText.includes("case should be approved"));
  assert.equal(reviewResponse.structuredContent.review_status, "ready_for_review");
  assert.equal(reviewResponse.structuredContent.collaboration_mode, "propose_then_review");
  assert.ok(
    reviewResponse.structuredContent.candidate.activity_model.activity.includes(
      "refund requests",
    ),
  );
  assert.ok(
    reviewResponse.structuredContent.candidate.interaction_contract.primary_decision.includes(
      "case should be approved",
    ),
  );

  const surfaceResponse = await withTimeout(
    client.callTool({
      name: "recommend_surface_types",
      arguments: {
        brief:
          "A product analyst is reviewing product analytics cohorts during weekly planning. The activity is comparing funnel evidence, deciding which experiment to prioritize, and handing the next action to the growth team. The outcome is a chosen experiment and handoff reason.",
      },
    }),
    5_000,
  );

  assert.equal(surfaceResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      surfaceResponse,
      "## JudgmentKit Surface Recommendation",
      "Ready for surface guidance",
    ).includes('surface_type "workbench"'),
  );
  assert.equal(surfaceResponse.structuredContent.recommended_surface_type, "workbench");

  const recommendationResponse = await withTimeout(
    client.callTool({
      name: "recommend_ui_workflow_profiles",
      arguments: {
        brief:
          "An operator reviews several AI agent findings, compares evidence and risk, decides whether each finding is approved, blocked, deferred, tightened, or handed off, and leaves an audit receipt while raw tool call traces stay diagnostic.",
      },
    }),
    5_000,
  );

  assert.equal(recommendationResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      recommendationResponse,
      "## JudgmentKit Workflow Profile Recommendation",
      "recommended",
    ).includes('Pass profile_id "operator-review-ui"'),
  );
  assert.deepEqual(
    recommendationResponse.structuredContent.recommended_profile_ids,
    ["operator-review-ui"],
  );

  const candidateReviewResponse = await withTimeout(
    client.callTool({
      name: "review_activity_model_candidate",
      arguments: {
        brief:
          "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
        candidate: {
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
        },
      },
    }),
    5_000,
  );

  assert.equal(candidateReviewResponse.isError, undefined);
  assertPlanningCard(
    candidateReviewResponse,
    "## JudgmentKit Activity Review",
    "Ready for concept planning",
  );
  assert.equal(candidateReviewResponse.structuredContent.source.mode, "model_assisted");
  assert.equal(
    candidateReviewResponse.structuredContent.source.proposer,
    "external_candidate",
  );
  assert.equal(candidateReviewResponse.structuredContent.review_status, "ready_for_review");

  const workflowReviewResponse = await withTimeout(
    client.callTool({
      name: "review_ui_workflow_candidate",
      arguments: {
        brief:
          "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
        candidate: {
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
              purpose: "Review evidence, choose the refund path, and send a handoff.",
              sections: ["Selected case", "Evidence checklist", "Policy review context", "Handoff"],
              controls: [
                "Approve refund",
                "Send to policy review",
                "Return for evidence",
                "Send handoff",
              ],
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
        },
        profile_id: "operator-review-ui",
        surface_type: "workbench",
      },
    }),
    5_000,
  );

  assert.equal(workflowReviewResponse.isError, undefined);
  const workflowText = assertPlanningCard(
    workflowReviewResponse,
    "## JudgmentKit Workflow Review",
    "Ready for UI handoff",
  );

  assert.ok(workflowText.includes("**Workflow:** Refund escalation queue"));
  assert.ok(workflowText.includes("Approve refund"));
  assert.equal(workflowReviewResponse.structuredContent.source.mode, "model_assisted");
  assert.equal(
    workflowReviewResponse.structuredContent.source.proposer,
    "external_candidate",
  );
  assert.equal(workflowReviewResponse.structuredContent.review_status, "ready_for_review");
  assert.equal(
    workflowReviewResponse.structuredContent.guidance_profile.profile_id,
    "operator-review-ui",
  );
  assert.equal(workflowReviewResponse.structuredContent.surface_type, "workbench");
  assert.ok(
    workflowReviewResponse.structuredContent.candidate.workflow.primary_actions.includes(
      "Approve refund",
    ),
  );

  const blockedWorkflowResponse = await withTimeout(
    client.callTool({
      name: "review_ui_workflow_candidate",
      arguments: {
        brief:
          "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
        candidate: {
          ...workflowReviewResponse.structuredContent.candidate,
          workflow: {
            ...workflowReviewResponse.structuredContent.candidate.workflow,
            surface_name: "ready_for_review JSON schema console",
          },
          surface_set: [
            {
              ...workflowReviewResponse.structuredContent.candidate.surface_set[0],
              sections: ["Activity", "Prompt template"],
            },
          ],
        },
      },
    }),
    5_000,
  );

  assert.equal(blockedWorkflowResponse.isError, undefined);
  const blockedWorkflowText = assertPlanningCard(
    blockedWorkflowResponse,
    "## JudgmentKit Workflow Review",
    "Needs source context",
  );

  assert.ok(blockedWorkflowText.includes("primary-field leaks: JSON schema"));
  assert.equal(blockedWorkflowResponse.structuredContent.review_status, "needs_source_context");

  const implementationContractResponse = await withTimeout(
    client.callTool({
      name: "create_ui_implementation_contract",
      arguments: {
        target_stack: "React",
        approved_primitives: ["queue", "detail panel", "decision controls", "handoff receipt"],
        static_rules: ["npm test"],
        browser_qa_checks: ["desktop review", "mobile review"],
      },
    }),
    5_000,
  );

  assert.equal(implementationContractResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      implementationContractResponse,
      "## JudgmentKit Implementation Contract",
      "Implementation contract ready",
    ).includes("Accessibility evidence"),
  );
  assert.ok(
    assertPlanningCard(
      implementationContractResponse,
      "## JudgmentKit Implementation Contract",
      "Implementation contract ready",
    ).includes("Agent loop"),
  );
  assert.ok(
    assertPlanningCard(
      implementationContractResponse,
      "## JudgmentKit Implementation Contract",
      "Implementation contract ready",
    ).includes("Visual token adapter"),
  );
  assert.equal(
    implementationContractResponse.structuredContent.implementation_contract_status,
    "ready",
  );
  assert.ok(
    Boolean(
      implementationContractResponse.structuredContent.implementation_contract
        .accessibility_policy.conditional_evidence.visual_background_contrast,
    ),
  );
  assert.equal(
    implementationContractResponse.structuredContent.implementation_contract
      .default_ai_native_design_system.mode,
    "contract_defaults",
  );
  assert.equal(
    implementationContractResponse.structuredContent.implementation_contract
      .iteration_policy.default_max_attempts,
    3,
  );
  assert.equal(
    implementationContractResponse.structuredContent.implementation_contract
      .visual_token_adapter.mode,
    "boundary_only",
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .visual_token_adapter.token_families.includes("color"),
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .visual_token_adapter.font_roles.some(
        (entry) => entry.role === "body" && entry.stack.includes("system-ui"),
      ),
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .visual_token_adapter.icon_registry.some(
        (entry) => entry.id === "status-check" && entry.paths.length > 0,
      ),
  );

  const implementationReviewResponse = await withTimeout(
    client.callTool({
      name: "review_ui_implementation_candidate",
      arguments: {
        implementation_contract: implementationContractResponse.structuredContent,
        iteration_context: { current_attempt: 2 },
        candidate: {
          primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
          states_covered:
            implementationContractResponse.structuredContent.implementation_contract
              .state_coverage.required_states,
          static_checks: ["npm test"],
          browser_qa: { desktop: "passed", mobile: "passed" },
          accessibility_evidence: coreAccessibilityEvidence(),
          actions: ["Auto approve refund"],
          action_boundary_evidence: {},
        },
      },
    }),
    5_000,
  );

  assert.equal(implementationReviewResponse.isError, undefined);
  const implementationReviewText = assertPlanningCard(
    implementationReviewResponse,
    "## JudgmentKit Implementation Review",
    "Implementation gate failed",
  );
  assert.ok(implementationReviewText.includes("repair_and_resubmit"));
  assert.equal(
    implementationReviewResponse.structuredContent.next_agent_action,
    "repair_and_resubmit",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.checks.action_boundaries.status,
    "fail",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.checks.visual_tokens.status,
    "pass",
  );

  const handoffResponse = await withTimeout(
    client.callTool({
      name: "create_ui_generation_handoff",
      arguments: {
        workflow_review: workflowReviewResponse.structuredContent,
        implementation_contract: implementationContractResponse.structuredContent,
      },
    }),
    5_000,
  );

  assert.equal(handoffResponse.isError, undefined);
  const handoffText = assertPlanningCard(
    handoffResponse,
    "## JudgmentKit UI Handoff",
    "Ready for UI generation",
  );

  assert.ok(handoffText.includes("Generate UI from this handoff"));
  assert.ok(handoffText.includes("**Handoff:**"));
  assert.equal(handoffResponse.structuredContent.handoff_status, "ready_for_generation");
  assert.equal(
    handoffResponse.structuredContent.guidance_profile.profile_id,
    "operator-review-ui",
  );
  assert.equal(handoffResponse.structuredContent.surface_type, "workbench");
  assert.ok(
    handoffResponse.structuredContent.workflow.primary_actions.includes("Approve refund"),
  );

  const frontendContextResponse = await withTimeout(
    client.callTool({
      name: "create_frontend_generation_context",
      arguments: {
        ui_generation_handoff: handoffResponse.structuredContent,
        frontend_context: {
          target_runtime: "React",
          ui_library: "Material UI",
          approved_component_families: ["queue", "detail panel", "decision controls"],
          visual_requirements: ["substantive product image"],
          approved_visual_asset_sources: ["imagegen", "D3"],
        },
        verification: {
          commands: ["npm test"],
          states_to_verify: ["selected item", "handoff sent"],
        },
      },
    }),
    5_000,
  );

  assert.equal(frontendContextResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      frontendContextResponse,
      "## JudgmentKit Frontend Context",
      "Ready for frontend implementation",
    ).includes("Accessibility evidence"),
  );
  assert.ok(
    assertPlanningCard(
      frontendContextResponse,
      "## JudgmentKit Frontend Context",
      "Ready for frontend implementation",
    ).includes("imagegen"),
  );
  assert.equal(
    frontendContextResponse.structuredContent.frontend_context_status,
    "ready_for_frontend_implementation",
  );
  assert.equal(frontendContextResponse.structuredContent.surface_type, "workbench");
  assert.ok(
    frontendContextResponse.structuredContent.frontend_context.visual_requirements.includes(
      "substantive product image",
    ),
  );
  assert.ok(
    frontendContextResponse.structuredContent.implementation_guidance.visual_asset_policy.preferred_paths.some(
      (rule) => rule.includes("imagegen"),
    ),
  );
  assert.ok(
    Boolean(
      frontendContextResponse.structuredContent.implementation_guidance
        .accessibility_policy.conditional_evidence.visual_background_contrast,
    ),
  );

  const frontendSkillContextResponse = await withTimeout(
    client.callTool({
      name: "create_frontend_implementation_skill_context",
      arguments: {
        frontend_generation_context: frontendContextResponse.structuredContent,
        target_client: "codex",
        design_system_adapter: {
          design_system_name: "Material UI",
          design_system_package: "@mui/material",
          role: "visual renderer after context selection",
          components: ["Stack", "Button"],
          constraint:
            "Material UI changes the renderer layer only; it does not supply activity fit.",
        },
      },
    }),
    5_000,
  );

  assert.equal(frontendSkillContextResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      frontendSkillContextResponse,
      "## JudgmentKit Frontend Skill Context",
      "Frontend skill context ready",
    ).includes("review_ui_implementation_candidate"),
  );
  assert.ok(
    assertPlanningCard(
      frontendSkillContextResponse,
      "## JudgmentKit Frontend Skill Context",
      "Frontend skill context ready",
    ).includes("Font roles"),
  );
  assert.ok(
    assertPlanningCard(
      frontendSkillContextResponse,
      "## JudgmentKit Frontend Skill Context",
      "Frontend skill context ready",
    ).includes("Embedded icons"),
  );
  assert.equal(
    frontendSkillContextResponse.structuredContent.skill_context_status,
    "ready",
  );
  assert.equal(
    frontendSkillContextResponse.structuredContent.source_skill.raw_skill_exposed,
    false,
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.visual_asset_policy.preferred_paths.some(
      (rule) => rule.includes("D3"),
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.font_guidance.font_roles.some(
      (entry) => entry.role === "body" && entry.stack.includes("system-ui"),
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.icon_guidance.icon_registry.some(
      (entry) => entry.id === "status-check" && entry.viewBox === "0 0 24 24",
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.accessibility_policy.required_evidence.includes(
      "accessibility_evidence.focus_visible",
    ),
  );
  assert.ok(
    assertPlanningCard(
      frontendSkillContextResponse,
      "## JudgmentKit Frontend Skill Context",
      "Frontend skill context ready",
    ).includes("Accessibility evidence"),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.verification_checklist.some(
      (item) => item.includes("substantive visuals"),
    ),
  );

  const blockedHandoffResponse = await withTimeout(
    client.callTool({
      name: "create_ui_generation_handoff",
      arguments: {
        workflow_review: blockedWorkflowResponse.structuredContent,
        implementation_contract: implementationContractResponse.structuredContent,
      },
    }),
    5_000,
  );

  assert.equal(blockedHandoffResponse.isError, true);
  const blockedHandoffText = assertPlanningCard(
    blockedHandoffResponse,
    "## JudgmentKit Error",
    "Blocked",
  );

  assert.ok(blockedHandoffText.includes("handoff_blocked"));
  assert.ok(blockedHandoffText.includes("Implementation leakage"));
  assert.equal(
    blockedHandoffResponse.structuredContent.error.details.review_status,
    "needs_source_context",
  );
  assert.equal(stderrOutput.includes("JudgmentKit stdio MCP failed"), false);
} finally {
  await transport?.close();
}

console.log("MCP stdio checks passed.");
