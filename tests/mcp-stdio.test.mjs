import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Ajv from "ajv";

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

function assertActivityPremiseCard(response) {
  const text = textContent(response);

  assert.ok(text.includes("## JudgmentKit Working Premise"));
  assert.ok(text.includes("**Working premise**"));
  assert.ok(text.includes("**Next step:** Show a first direction now"));
  assert.equal(text.includes("**Status:**"), false);
  assert.equal(text.includes("Diagnostics"), false);
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
    non_text_contrast: {
      status: "pass",
      method: "computed contrast review",
      notes: "Control boundaries and state indicators meet non-text contrast.",
    },
    semantic_fallbacks: {
      status: "pass",
      method: "DOM inspection",
      notes: "Semantic HTML provides fallback structure for rendered content.",
    },
  };
}

function defaultDesignSystemProvenance() {
  return {
    source: "judgmentkit_default",
    token_source: "/design-system/visual-token-adapter.json",
    typography_source: "/design-system/visual-token-adapter.json",
    icon_source: "JudgmentKit icon catalog via get_icon_svg",
    renderer_component_source:
      "implementation_contract.default_ai_native_design_system.component_contracts",
    import_boundary:
      "No visual, typography, icon, or component package imports outside the active design-system source.",
    token_prefix_source: "implementation_contract.design_system_source.token_prefixes",
    source_exports: "implementation_contract.design_system_source.source_exports",
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
      "review_cognitive_dimensions_candidate",
      "create_ui_implementation_contract",
      "review_ui_implementation_candidate",
      "create_ui_generation_handoff",
      "create_frontend_generation_context",
      "create_frontend_implementation_skill_context",
      "create_slide_deck",
      "list_icon_catalog",
      "search_icon_catalog",
      "get_icon_svg",
    ],
  );
  const createActivityTool = toolsResponse.tools.find(
    (tool) => tool.name === "create_activity_model_review",
  );
  const validateCreateActivityInput = new Ajv({ strict: false }).compile(
    createActivityTool.inputSchema,
  );

  assert.equal(
    validateCreateActivityInput({
      brief: "Create a clinical review workspace.",
      context_items: [
        {
          id: "clinical-policy",
          kind: "authoritative_source",
          content: "Only physicians may authorize discharge.",
        },
      ],
    }),
    false,
    "The stdio-advertised schema must require source_ref for authoritative context.",
  );
  assert.equal(
    validateCreateActivityInput({
      brief: "Create a clinical review workspace.",
      context_items: [
        {
          id: "clinical-policy",
          kind: "authoritative_source",
          content: "Only physicians may authorize discharge.",
          source_ref: "policy://clinical/discharge",
        },
      ],
    }),
    true,
  );
  const recommendSurfaceTool = toolsResponse.tools.find(
    (tool) => tool.name === "recommend_surface_types",
  );

  assert.ok(recommendSurfaceTool);
  assert.equal(recommendSurfaceTool.inputSchema.properties.activity_review.type, "object");
  assert.equal(recommendSurfaceTool.inputSchema.properties.activityReview.type, "object");
  const reviewImplementationTool = toolsResponse.tools.find(
    (tool) => tool.name === "review_ui_implementation_candidate",
  );

  assert.ok(reviewImplementationTool);
  assert.equal(reviewImplementationTool.inputSchema.properties.surface_type.type, "string");
  assert.equal(reviewImplementationTool.inputSchema.properties.surface_review.type, "object");
  assert.equal(
    reviewImplementationTool.inputSchema.properties.frontend_generation_context.type,
    "object",
  );
  const deckTool = toolsResponse.tools.find((tool) => tool.name === "create_slide_deck");

  assert.ok(deckTool);
  assert.equal(deckTool.inputSchema.properties.slides.type, "array");
  assert.equal(deckTool.inputSchema.properties.output.type, "object");

  const deckResponse = await withTimeout(
    client.callTool({
      name: "create_slide_deck",
      arguments: {
        deck: { deck_id: "stdio review deck" },
        slides: [
          {
            template_id: "slide-21",
            content: {
              title: "Review deck",
              subtitle: "Safe planning response.",
            },
          },
        ],
        dry_run: true,
      },
    }),
    5_000,
  );

  assert.equal(deckResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      deckResponse,
      "## JudgmentKit Slide Deck",
      "Deck plan ready",
    ).includes("slide-21"),
  );
  assert.equal(deckResponse.structuredContent.deck_creation_status, "planned");
  assert.equal(deckResponse.structuredContent.deck.deck_id, "stdio-review-deck");
  assert.equal("content" in deckResponse.structuredContent.slides[0], false);

  const iconListResponse = await withTimeout(
    client.callTool({
      name: "list_icon_catalog",
      arguments: { limit: 2 },
    }),
    5_000,
  );

  assert.equal(iconListResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      iconListResponse,
      "## JudgmentKit Icon Catalog",
      "Ready",
    ).includes("Lucide"),
  );
  assert.equal(iconListResponse.structuredContent.icons.length, 2);
  assert.ok(iconListResponse.structuredContent.total_count > 1000);
  assert.equal("svg" in iconListResponse.structuredContent.icons[0], false);

  const iconSearchResponse = await withTimeout(
    client.callTool({
      name: "search_icon_catalog",
      arguments: { query: "receipt text", limit: 3 },
    }),
    5_000,
  );

  assert.equal(iconSearchResponse.isError, undefined);
  assert.equal(iconSearchResponse.structuredContent.icons[0].id, "receipt-text");

  const iconSvgResponse = await withTimeout(
    client.callTool({
      name: "get_icon_svg",
      arguments: { id: "check" },
    }),
    5_000,
  );

  assert.equal(iconSvgResponse.isError, undefined);
  assert.equal(iconSvgResponse.structuredContent.id, "check");
  assert.ok(iconSvgResponse.structuredContent.inline_svg.includes("<svg"));

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
  const reviewText = assertActivityPremiseCard(reviewResponse);

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

  const aliasSurfaceResponse = await withTimeout(
    client.callTool({
      name: "recommend_surface_types",
      arguments: {
        brief: "Build the provided surface.",
        activityReview: reviewResponse.structuredContent,
      },
    }),
    5_000,
  );

  assert.equal(aliasSurfaceResponse.isError, undefined);
  assert.ok(
    assertPlanningCard(
      aliasSurfaceResponse,
      "## JudgmentKit Surface Recommendation",
      "Ready for surface guidance",
    ).includes('surface_type "workbench"'),
  );
  assert.equal(aliasSurfaceResponse.structuredContent.recommended_surface_type, "workbench");
  assert.equal("activityReview" in aliasSurfaceResponse.structuredContent, false);
  assert.ok(Array.isArray(aliasSurfaceResponse.structuredContent.blocked_surface_types));

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

  const activityContextItems = [
    {
      id: "existing-refund-receipt",
      kind: "provided_artifact",
      content: "A prioritized set of refund requests is ready for follow-up.",
      source_ref: "artifact://refund-follow-up/receipt",
    },
  ];
  const candidateReviewResponse = await withTimeout(
    client.callTool({
      name: "review_activity_model_candidate",
      arguments: {
        brief: "A refund triage tool.",
        context_items: activityContextItems,
        candidate: {
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
              origin: "model_inferred",
              source_refs: [],
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
              source_refs: [],
              confidence: "medium",
              materiality: "low",
              alternatives: [],
              impact_if_wrong: "The first concept direction may need a different next action.",
              reversibility: "easy",
            },
          ],
        },
      },
    }),
    5_000,
  );

  assert.equal(candidateReviewResponse.isError, undefined);
  assertActivityPremiseCard(candidateReviewResponse);
  assert.equal(candidateReviewResponse.structuredContent.source.mode, "model_assisted");
  assert.equal(
    candidateReviewResponse.structuredContent.source.proposer,
    "external_candidate",
  );
  assert.equal(candidateReviewResponse.structuredContent.review_status, "ready_for_review");
  assert.equal(
    candidateReviewResponse.structuredContent.activity_case.schema,
    "judgmentkit.activity-case/v1",
  );
  assert.equal(candidateReviewResponse.structuredContent.activity_case.mode, "inference_first");
  assert.equal(
    candidateReviewResponse.structuredContent.activity_case.readiness.decision,
    "proceed",
  );
  assert.ok(candidateReviewResponse.structuredContent.activity_case.assumptions.length > 0);

  const workflowReviewResponse = await withTimeout(
    client.callTool({
      name: "review_ui_workflow_candidate",
      arguments: {
        brief: "A refund triage tool.",
        activity_review: candidateReviewResponse.structuredContent,
        context_items: activityContextItems,
        candidate: {
          workflow: {
            surface_name: "Refund triage queue",
            topology: "workspace",
            work_units: ["Review requests", "Compare priority", "Record follow-up"],
            primary_actions: [
              "Prioritize for follow-up",
              "Defer for more evidence",
              "Record the next follow-up",
            ],
            decision_points: [
              "Decide which refund requests need attention first.",
            ],
            completion_state: "A prioritized set of refund requests is ready for follow-up.",
          },
          surface_set: [
            {
              name: "Refund triage workspace",
              purpose: "Compare refund requests, set priority, and record follow-up.",
              sections: ["Refund requests", "Selected request", "Evidence", "Follow-up"],
              controls: [
                "Prioritize for follow-up",
                "Defer for more evidence",
                "Record the next follow-up",
              ],
              relationship_to_workflow: "Keeps comparison, priority, and follow-up together.",
            },
          ],
          handoff: {
            next_owner: "support team",
            reason: "Priority and evidence signals are recorded.",
            next_action: "Continue follow-up from the prioritized queue.",
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

  assert.ok(workflowText.includes("**Workflow:** Refund triage queue"));
  assert.ok(workflowText.includes("Prioritize for follow-up"));
  assert.equal(workflowReviewResponse.structuredContent.source.mode, "model_assisted");
  assert.equal(
    workflowReviewResponse.structuredContent.source.proposer,
    "external_candidate",
  );
  assert.equal(workflowReviewResponse.structuredContent.review_status, "ready_for_review");
  assert.deepEqual(
    workflowReviewResponse.structuredContent.activity_review,
    candidateReviewResponse.structuredContent,
    "The workflow gate must preserve the exact reviewed activity packet.",
  );
  assert.equal(
    workflowReviewResponse.structuredContent.guidance_profile.profile_id,
    "operator-review-ui",
  );
  assert.equal(workflowReviewResponse.structuredContent.surface_type, "workbench");
  assert.ok(
    workflowReviewResponse.structuredContent.candidate.workflow.primary_actions.includes(
      "Prioritize for follow-up",
    ),
  );

  const blockedWorkflowResponse = await withTimeout(
    client.callTool({
      name: "review_ui_workflow_candidate",
      arguments: {
        brief: "A refund triage tool.",
        activity_review: candidateReviewResponse.structuredContent,
        context_items: activityContextItems,
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
  assert.equal(
    implementationContractResponse.structuredContent.implementation_contract
      .design_system_source.mode,
    "judgmentkit_default",
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
      .visual_token_adapter.css_custom_properties.some(
        (entry) => entry.name === "--jk-color-surface" && entry.value === "#ffffff",
      ),
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .visual_token_adapter.icon_catalog.icon_count > 1000,
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .visual_token_adapter.icon_catalog.mcp_tools.includes("search_icon_catalog"),
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .default_ai_native_design_system.component_contracts.some(
        (entry) =>
          entry.id === "action_button" &&
          entry.review_checks.some(
            (check) =>
              check.includes("task-specific action phrase") &&
              check.includes("one line"),
          ) &&
          entry.failure_signals.some(
            (signal) => signal.includes("wrap") && signal.includes("multiple lines"),
          ),
      ),
  );
  assert.ok(
    implementationContractResponse.structuredContent.implementation_contract
      .default_ai_native_design_system.pattern_contracts.some(
        (entry) => entry.id === "workbench",
      ),
  );

  const missingProvenanceResponse = await withTimeout(
    client.callTool({
      name: "review_ui_implementation_candidate",
      arguments: {
        implementation_contract: implementationContractResponse.structuredContent,
        candidate: {
          primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
          states_covered:
            implementationContractResponse.structuredContent.implementation_contract
              .state_coverage.required_states,
          static_checks: ["npm test"],
          browser_qa: { desktop: "passed", mobile: "passed" },
          accessibility_evidence: coreAccessibilityEvidence(),
        },
      },
    }),
    5_000,
  );

  assert.equal(missingProvenanceResponse.isError, undefined);
  assert.ok(textContent(missingProvenanceResponse).includes("This is not an artifact"));
  assert.equal(
    missingProvenanceResponse.structuredContent.implementation_review_status,
    "failed",
  );
  assert.equal(
    missingProvenanceResponse.structuredContent.design_system_acceptance_status,
    "failed",
  );
  assert.equal(
    missingProvenanceResponse.structuredContent.checks.design_system_provenance.status,
    "fail",
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
          design_system_provenance: defaultDesignSystemProvenance(),
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
    implementationReviewResponse.structuredContent.candidate_artifact_status,
    "not_an_artifact",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.design_system_acceptance_status,
    "passed",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.checks.action_boundaries.status,
    "fail",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.checks.visual_tokens.status,
    "pass",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.checks.component_contracts.status,
    "pass",
  );
  assert.equal(
    implementationReviewResponse.structuredContent.checks.pattern_contracts.status,
    "pass",
  );

  const selectedSurfaceReviewResponse = await withTimeout(
    client.callTool({
      name: "review_ui_implementation_candidate",
      arguments: {
        implementation_contract: implementationContractResponse.structuredContent,
        surface_type: "operator_review",
        candidate: {
          primitives_used: ["queue", "detail panel", "decision controls", "handoff receipt"],
          states_covered:
            implementationContractResponse.structuredContent.implementation_contract
              .state_coverage.required_states,
          static_checks: ["npm test"],
          browser_qa: { desktop: "passed", mobile: "passed" },
          accessibility_evidence: coreAccessibilityEvidence(),
          design_system_provenance: defaultDesignSystemProvenance(),
          pattern_contract_evidence: {
            pattern_id: "workbench",
            regions_present: [
              "work queue",
              "detail workspace",
              "evidence",
              "decision or handoff",
            ],
            controls_present: [
              "selection",
              "filter or sort",
              "decision action",
              "handoff action",
            ],
          },
        },
      },
    }),
    5_000,
  );

  assert.equal(selectedSurfaceReviewResponse.isError, undefined);
  assert.equal(
    selectedSurfaceReviewResponse.structuredContent.implementation_review_status,
    "failed",
  );
  assert.equal(
    selectedSurfaceReviewResponse.structuredContent.checks.pattern_contracts.status,
    "fail",
  );
  assert.equal(
    selectedSurfaceReviewResponse.structuredContent.checks.pattern_contracts
      .selected_surface_type,
    "operator_review",
  );
  assert.equal(
    selectedSurfaceReviewResponse.structuredContent.checks.pattern_contracts
      .required_surface_type,
    "workbench",
  );

  const invalidPrimitiveResponse = await withTimeout(
    client.callTool({
      name: "review_ui_implementation_candidate",
      arguments: {
        implementation_contract: implementationContractResponse.structuredContent,
        candidate: {
          primitives_used: ["queue", "action_button"],
          states_covered:
            implementationContractResponse.structuredContent.implementation_contract
              .state_coverage.required_states,
          static_checks: ["npm test"],
          browser_qa: { desktop: "passed", mobile: "passed" },
          accessibility_evidence: coreAccessibilityEvidence(),
          design_system_provenance: defaultDesignSystemProvenance(),
        },
      },
    }),
    5_000,
  );

  assert.equal(invalidPrimitiveResponse.isError, undefined);
  const invalidPrimitiveText = assertPlanningCard(
    invalidPrimitiveResponse,
    "## JudgmentKit Implementation Review",
    "Implementation gate failed",
  );
  const approvedPrimitiveFinding =
    invalidPrimitiveResponse.structuredContent.findings.find(
      (finding) => finding.check === "approved_primitives",
    );

  assert.ok(approvedPrimitiveFinding);
  assert.ok(Array.isArray(approvedPrimitiveFinding.evidence));
  assert.ok(approvedPrimitiveFinding.evidence.includes("action_button"));
  assert.ok(
    [
      JSON.stringify(approvedPrimitiveFinding.routing_diagnostics ?? {}),
      invalidPrimitiveText,
    ].some((entry) =>
      entry.includes("component_contract_evidence.components[].id"),
    ),
  );

  const handoffResponse = await withTimeout(
    client.callTool({
      name: "create_ui_generation_handoff",
      arguments: {
        brief: "A refund triage tool.",
        workflow_review: workflowReviewResponse.structuredContent,
        implementation_contract: implementationContractResponse.structuredContent,
        context_items: activityContextItems,
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
  assert.deepEqual(
    handoffResponse.structuredContent.source.activity_context_items,
    candidateReviewResponse.structuredContent.source.context_items,
  );
  assert.ok(
    handoffResponse.structuredContent.workflow.primary_actions.includes(
      "Prioritize for follow-up",
    ),
  );
  assert.deepEqual(
    handoffResponse.structuredContent.activity_case,
    candidateReviewResponse.structuredContent.activity_case,
    "The handoff must preserve the inference-first activity case exactly.",
  );
  assert.deepEqual(
    handoffResponse.structuredContent.disclosure_policy,
    candidateReviewResponse.structuredContent.candidate.disclosure_policy,
    "The handoff must preserve the reviewed disclosure policy exactly.",
  );

  const frontendContextResponse = await withTimeout(
    client.callTool({
      name: "create_frontend_generation_context",
      arguments: {
        ui_generation_handoff: handoffResponse.structuredContent,
        brief: "A refund triage tool.",
        context_items: activityContextItems,
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
  assert.deepEqual(
    frontendContextResponse.structuredContent.activity_case,
    candidateReviewResponse.structuredContent.activity_case,
    "Frontend context must preserve the inference-first activity case exactly.",
  );
  assert.deepEqual(
    frontendContextResponse.structuredContent.disclosure_policy,
    candidateReviewResponse.structuredContent.candidate.disclosure_policy,
    "Frontend context must preserve the reviewed disclosure policy exactly.",
  );
  assert.equal(
    frontendContextResponse.structuredContent.selected_surface_profile.id,
    "judgmentkit.workbench.operational-v1",
  );
  assert.equal(
    frontendContextResponse.structuredContent.selected_surface_profile.status,
    "supported",
  );
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
        brief: "A refund triage tool.",
        context_items: activityContextItems,
        frontend_generation_context: frontendContextResponse.structuredContent,
        target_client: "codex",
        design_system_adapter: {
          design_system_name: "Material UI",
          design_system_package: "@mui/material",
          role: "visual renderer after context selection",
          components: ["Stack", "Button"],
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
    ).includes("Icon catalog"),
  );
  assert.equal(
    frontendSkillContextResponse.structuredContent.skill_context_status,
    "ready",
  );
  assert.equal(
    frontendSkillContextResponse.structuredContent.source_skill.raw_skill_exposed,
    false,
  );
  assert.deepEqual(
    frontendSkillContextResponse.structuredContent.disclosure_policy,
    candidateReviewResponse.structuredContent.candidate.disclosure_policy,
    "Frontend skill context must preserve the reviewed disclosure policy exactly.",
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.visual_asset_policy.preferred_paths.some(
      (rule) => rule.includes("D3"),
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.font_guidance.font_roles.some(
      (entry) => entry.role === "body" && entry.stack === "var(--mui-font-family)",
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.token_guidance.css_custom_properties.some(
      (entry) =>
        entry.name === "--mui-palette-background-paper" &&
        entry.value === "theme.palette.background.paper",
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.component_contracts.some(
      (entry) => entry.id === "Button",
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.pattern_contracts.some(
      (entry) => entry.id === "workbench",
    ),
  );
  assert.ok(
    frontendSkillContextResponse.structuredContent.icon_guidance.icon_catalog
      .icon_count > 1000,
  );
  assert.deepEqual(
    frontendSkillContextResponse.structuredContent.icon_guidance.icon_catalog
      .mcp_tools,
    [],
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
  assert.deepEqual(
    frontendSkillContextResponse.structuredContent.activity_case,
    candidateReviewResponse.structuredContent.activity_case,
    "Portable implementation context must preserve the inference-first activity case exactly.",
  );

  const blockedHandoffResponse = await withTimeout(
    client.callTool({
      name: "create_ui_generation_handoff",
      arguments: {
        brief: "A refund triage tool.",
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
