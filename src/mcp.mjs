import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  JudgmentKitInputError,
  analyzeImplementationBrief,
  createActivityModelReview,
  createUiGenerationHandoff,
  recommendUiWorkflowProfiles,
  reviewActivityModelCandidate,
  reviewUiWorkflowCandidate,
} from "./index.mjs";

const MCP_SERVER_NAME = "JudgmentKit";
const MCP_SERVER_VERSION = "0.1.0";

const ANALYZE_TOOL = {
  name: "analyze_implementation_brief",
  description:
    "Analyze an implementation-heavy UI brief and return an activity-centered judgment packet before UI generation or styling.",
  inputSchema: {
    type: "object",
    required: ["brief"],
    properties: {
      brief: {
        type: "string",
        minLength: 1,
        description:
          "Implementation-heavy UI brief to translate into activity-centered guidance.",
      },
    },
    additionalProperties: false,
  },
};

const ACTIVITY_MODEL_REVIEW_TOOL = {
  name: "create_activity_model_review",
  description:
    "Create a reviewable activity model candidate from a UI brief, with guardrails and targeted questions before UI generation.",
  inputSchema: {
    type: "object",
    required: ["brief"],
    properties: {
      brief: {
        type: "string",
        minLength: 1,
        description:
          "UI brief or implementation-heavy request to turn into a reviewable activity model candidate.",
      },
    },
    additionalProperties: false,
  },
};

const RECOMMEND_UI_WORKFLOW_PROFILES_TOOL = {
  name: "recommend_ui_workflow_profiles",
  description:
    "Recommend optional UI workflow guidance profiles for a source brief without applying them automatically.",
  inputSchema: {
    type: "object",
    required: ["brief"],
    properties: {
      brief: {
        type: "string",
        minLength: 1,
        description:
          "Source UI brief to classify for optional workflow guidance profiles.",
      },
    },
    additionalProperties: false,
  },
};

const REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL = {
  name: "review_activity_model_candidate",
  description:
    "Review an externally proposed activity model candidate against the source brief and JudgmentKit guardrails.",
  inputSchema: {
    type: "object",
    required: ["brief", "candidate"],
    properties: {
      brief: {
        type: "string",
        minLength: 1,
        description: "Source UI brief the proposed candidate should be grounded in.",
      },
      candidate: {
        type: "object",
        description:
          "Externally proposed activity model candidate with activity_model, interaction_contract, and optional disclosure_policy.",
      },
    },
    additionalProperties: false,
  },
};

const REVIEW_UI_WORKFLOW_CANDIDATE_TOOL = {
  name: "review_ui_workflow_candidate",
  description:
    "Review an externally proposed UI workflow candidate against the source brief, activity review, and JudgmentKit guardrails.",
  inputSchema: {
    type: "object",
    required: ["brief", "candidate"],
    properties: {
      brief: {
        type: "string",
        minLength: 1,
        description: "Source UI brief the proposed workflow candidate should be grounded in.",
      },
      candidate: {
        type: "object",
        description:
          "Externally proposed UI workflow candidate with workflow, primary_ui, handoff, and diagnostics.",
      },
      profile_id: {
        type: "string",
        description:
          "Optional guidance profile id, such as operator-review-ui.",
      },
    },
    additionalProperties: false,
  },
};

const UI_GENERATION_HANDOFF_TOOL = {
  name: "create_ui_generation_handoff",
  description:
    "Create a UI generation handoff from a ready UI workflow review packet, blocking non-ready reviews.",
  inputSchema: {
    type: "object",
    required: ["workflow_review"],
    properties: {
      workflow_review: {
        type: "object",
        description:
          "UI workflow review packet returned by review_ui_workflow_candidate or equivalent library API.",
      },
    },
    additionalProperties: false,
  },
};

function createError(code, message, details) {
  const error = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    error.error.details = details;
  }

  return error;
}

function compactText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function toDisplayList(values, limit = 4) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => compactText(entry))
    .filter(Boolean)
    .slice(0, limit);
}

function termName(entry) {
  if (typeof entry === "string") {
    return compactText(entry);
  }

  if (entry && typeof entry === "object") {
    return compactText(entry.term ?? entry.detected_term ?? "");
  }

  return "";
}

function termList(entries, limit = 4) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return [...new Set(entries.map(termName).filter(Boolean))].slice(0, limit);
}

function missingFieldList(fields) {
  if (!fields || typeof fields !== "object") {
    return [];
  }

  return Object.entries(fields)
    .filter(([, missing]) => Boolean(missing))
    .map(([name]) => name.replaceAll("_", " "));
}

function firstLine(label, value) {
  const text = compactText(value);

  return text ? `**${label}:** ${text}` : "";
}

function listLine(label, values) {
  const entries = toDisplayList(values);

  return entries.length > 0 ? `**${label}:** ${entries.join("; ")}` : "";
}

function addSection(lines, title, entries) {
  const visibleEntries = entries.filter(Boolean);

  if (visibleEntries.length === 0) {
    return;
  }

  lines.push("", `**${title}**`, ...visibleEntries);
}

function bulletList(values) {
  return toDisplayList(values, 3).map((value) => `- ${value}`);
}

function planningStatus(result) {
  if (result.handoff_status === "ready_for_generation") {
    return "Ready for UI generation";
  }

  if (result.review_status === "ready_for_review") {
    return result.candidate?.workflow ? "Ready for UI handoff" : "Ready for concept planning";
  }

  if (result.review_status === "needs_source_context") {
    return "Needs source context";
  }

  if (result.status === "needs_review") {
    return "Needs review";
  }

  if (result.status === "ready") {
    return "Ready";
  }

  return "Blocked";
}

function diagnosticSummary(result) {
  const diagnostics = [];
  const confidence = compactText(result.review?.confidence);

  if (confidence) {
    diagnostics.push(`confidence ${confidence}`);
  }

  const implementationTerms = termList(
    result.guardrails?.implementation_terms_detected ??
      result.implementation_terms_detected ??
      result.review?.evidence?.implementation_terms_detected,
  );

  if (implementationTerms.length > 0) {
    diagnostics.push(`diagnostic terms: ${implementationTerms.join(", ")}`);
  }

  const primaryTerms = termList(result.guardrails?.candidate_primary_terms_detected);

  if (primaryTerms.length > 0) {
    diagnostics.push(`primary-field leaks: ${primaryTerms.join(", ")}`);
  }

  const reviewTerms = termList(result.guardrails?.candidate_primary_meta_terms_detected);

  if (reviewTerms.length > 0) {
    diagnostics.push(`review terms in UI candidate: ${reviewTerms.join(", ")}`);
  }

  const sourceMissing = missingFieldList(
    result.guardrails?.source_missing_evidence ?? result.guardrails?.missing_evidence,
  );

  if (sourceMissing.length > 0) {
    diagnostics.push(`missing source evidence: ${sourceMissing.join(", ")}`);
  }

  const missingFields = missingFieldList(result.guardrails?.candidate_missing_fields);

  if (missingFields.length > 0) {
    diagnostics.push(`missing candidate fields: ${missingFields.join(", ")}`);
  }

  return diagnostics.length > 0 ? diagnostics.join("; ") : "No blocking diagnostics in the planning card.";
}

function formatActivityReviewCard(result) {
  const activity = result.candidate?.activity_model ?? {};
  const interaction = result.candidate?.interaction_contract ?? {};
  const status = planningStatus(result);
  const nextStep = result.review_status === "ready_for_review"
    ? "Use this activity model to plan the UI concept; review any workflow candidate before implementation."
    : "Resolve the targeted questions before UI concept work.";
  const lines = [
    "## JudgmentKit Activity Review",
    `**Status:** ${status}`,
    `**Next step:** ${nextStep}`,
  ];

  addSection(lines, "Plan from this", [
    firstLine("Activity", activity.activity),
    listLine("Participants", activity.participants),
    firstLine("Primary decision", interaction.primary_decision),
    firstLine("Outcome", interaction.completion),
    listLine("Terms to use", activity.domain_vocabulary),
  ]);
  addSection(lines, "Targeted questions", bulletList(result.review?.targeted_questions));
  addSection(lines, "Diagnostics", [`${diagnosticSummary(result)}`]);

  return lines.join("\n");
}

function formatWorkflowReviewCard(result) {
  const workflow = result.candidate?.workflow ?? {};
  const primaryUi = result.candidate?.primary_ui ?? {};
  const handoff = result.candidate?.handoff ?? {};
  const status = planningStatus(result);
  const nextStep = result.review_status === "ready_for_review"
    ? "Call create_ui_generation_handoff with this workflow review before UI implementation."
    : "Revise the workflow candidate or resolve the targeted questions before handoff.";
  const lines = [
    "## JudgmentKit Workflow Review",
    `**Status:** ${status}`,
    `**Next step:** ${nextStep}`,
  ];

  addSection(lines, "Plan from this", [
    firstLine("Workflow", workflow.surface_name),
    listLine("Primary actions", workflow.primary_actions),
    listLine("Decision points", workflow.decision_points),
    firstLine("Completion", workflow.completion_state),
    listLine("Primary sections", primaryUi.sections),
    firstLine("Handoff", handoff.next_action),
  ]);
  addSection(lines, "Targeted questions", bulletList(result.review?.targeted_questions));
  addSection(lines, "Diagnostics", [`${diagnosticSummary(result)}`]);

  return lines.join("\n");
}

function formatHandoffCard(result) {
  const lines = [
    "## JudgmentKit UI Handoff",
    `**Status:** ${planningStatus(result)}`,
    "**Next step:** Generate UI from this handoff, keeping disclosure reminders out of the primary product surface.",
  ];

  addSection(lines, "Plan from this", [
    firstLine("Activity", result.activity_model?.activity),
    firstLine("Primary decision", result.interaction_contract?.primary_decision),
    firstLine("Outcome", result.interaction_contract?.completion),
    firstLine("Workflow", result.workflow?.surface_name),
    listLine("Primary actions", result.workflow?.primary_actions),
    listLine("Primary sections", result.primary_surface?.sections),
    firstLine("Handoff", result.handoff?.next_action),
  ]);
  addSection(lines, "Diagnostics", [
    listLine("Terms to keep out", result.disclosure_reminders?.terms_to_keep_out_of_primary_ui),
    listLine("Diagnostic terms", result.disclosure_reminders?.diagnostic_terms),
  ]);

  return lines.join("\n");
}

function formatAnalysisCard(result) {
  const lines = [
    "## JudgmentKit Brief Analysis",
    `**Status:** ${planningStatus(result)}`,
    "**Next step:** Use create_activity_model_review before UI concept work.",
  ];

  addSection(lines, "Plan from this", [
    firstLine("Activity", result.ui_brief?.activity_focus),
    firstLine("Primary decision", result.ui_brief?.primary_decision),
    firstLine("Outcome", result.ui_brief?.outcome),
    listLine("Terms to use", result.ui_brief?.terms_to_use),
  ]);
  addSection(lines, "Targeted questions", bulletList(result.review_questions));
  addSection(lines, "Diagnostics", [`${diagnosticSummary(result)}`]);

  return lines.join("\n");
}

function formatProfileRecommendationCard(result) {
  const recommended = toDisplayList(result.recommended_profile_ids);
  const blocked = toDisplayList(result.blocked_profile_ids);
  const summary = result.recommendations?.[0] ?? {};
  const status = compactText(summary.status) || "not_recommended";
  const lines = [
    "## JudgmentKit Workflow Profile Recommendation",
    `**Status:** ${status.replaceAll("_", " ")}`,
    recommended.length > 0
      ? `**Next step:** Pass profile_id "${recommended[0]}" when reviewing the workflow candidate.`
      : "**Next step:** Continue without an optional workflow profile unless product context says otherwise.",
  ];

  addSection(lines, "Plan from this", [
    listLine("Recommended profiles", recommended),
    listLine("Blocked profiles", blocked),
    firstLine("Trigger matches", `${summary.trigger_match_count ?? 0} of ${summary.trigger_threshold ?? 0}`),
    listLine("Matched triggers", summary.matched_triggers),
    listLine("Matched exclusions", summary.matched_exclusions),
  ]);

  return lines.join("\n");
}

function formatErrorCard(result) {
  const details = result.error?.details ?? {};
  const lines = [
    "## JudgmentKit Error",
    "**Status:** Blocked",
    "**Next step:** Fix the request or resolve the blocked review details, then retry the MCP call.",
    "",
    `**Error:** ${compactText(result.error?.message) || "Unknown error."}`,
  ];

  addSection(lines, "Targeted questions", bulletList(details.targeted_questions));
  addSection(lines, "Diagnostics", [
    firstLine("Code", result.error?.code),
    firstLine("Review status", details.review_status),
    firstLine("Confidence", details.confidence),
    listLine("Implementation leakage", termList(details.implementation_leakage_terms)),
    listLine("Review-packet leakage", termList(details.review_packet_leakage_terms)),
    listLine("Missing fields", missingFieldList(details.missing_fields)),
    listLine("Missing source evidence", missingFieldList(details.source_missing_evidence)),
  ]);

  return lines.join("\n");
}

function formatPlanningCard(result) {
  if (result?.error) {
    return formatErrorCard(result);
  }

  if (result?.handoff_status) {
    return formatHandoffCard(result);
  }

  if (result?.candidate?.workflow) {
    return formatWorkflowReviewCard(result);
  }

  if (result?.candidate?.activity_model) {
    return formatActivityReviewCard(result);
  }

  if (Array.isArray(result?.recommendations)) {
    return formatProfileRecommendationCard(result);
  }

  if (result?.ui_brief) {
    return formatAnalysisCard(result);
  }

  return [
    "## JudgmentKit Result",
    "**Status:** Ready",
    "**Next step:** Use structuredContent for machine-readable details.",
  ].join("\n");
}

export function listTools() {
  return [
    ANALYZE_TOOL,
    ACTIVITY_MODEL_REVIEW_TOOL,
    RECOMMEND_UI_WORKFLOW_PROFILES_TOOL,
    REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL,
    REVIEW_UI_WORKFLOW_CANDIDATE_TOOL,
    UI_GENERATION_HANDOFF_TOOL,
  ];
}

export function getMcpMetadata(transport = "stdio") {
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    transport,
    capabilities: {
      tools: listTools(),
      prompts: [],
    },
  };
}

export async function handleToolCall(name, args = {}) {
  if (
    ![
      ANALYZE_TOOL.name,
      ACTIVITY_MODEL_REVIEW_TOOL.name,
      RECOMMEND_UI_WORKFLOW_PROFILES_TOOL.name,
      REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL.name,
      REVIEW_UI_WORKFLOW_CANDIDATE_TOOL.name,
      UI_GENERATION_HANDOFF_TOOL.name,
    ].includes(name)
  ) {
    return createError(
      "invalid_request",
      `Tool ${name} is not supported. Use ${ANALYZE_TOOL.name}, ${ACTIVITY_MODEL_REVIEW_TOOL.name}, ${RECOMMEND_UI_WORKFLOW_PROFILES_TOOL.name}, ${REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL.name}, ${REVIEW_UI_WORKFLOW_CANDIDATE_TOOL.name}, or ${UI_GENERATION_HANDOFF_TOOL.name}.`,
    );
  }

  try {
    if (name === UI_GENERATION_HANDOFF_TOOL.name) {
      return createUiGenerationHandoff(args.workflow_review);
    }

    if (name === REVIEW_UI_WORKFLOW_CANDIDATE_TOOL.name) {
      return reviewUiWorkflowCandidate(args.brief, args.candidate, {
        profile_id: args.profile_id,
      });
    }

    if (name === REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL.name) {
      return reviewActivityModelCandidate(args.brief, args.candidate);
    }

    if (name === RECOMMEND_UI_WORKFLOW_PROFILES_TOOL.name) {
      return recommendUiWorkflowProfiles(args.brief);
    }

    if (name === ACTIVITY_MODEL_REVIEW_TOOL.name) {
      return createActivityModelReview(args.brief);
    }

    return analyzeImplementationBrief(args.brief);
  } catch (error) {
    if (error instanceof JudgmentKitInputError) {
      return createError(error.code, error.message, error.details);
    }

    throw error;
  }
}

function createToolResult(result) {
  const isError = "error" in result;

  return {
    content: [
      {
        type: "text",
        text: formatPlanningCard(result),
      },
    ],
    structuredContent: result,
    isError: isError ? true : undefined,
  };
}

export function createJudgmentKitMcpServer() {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  server.registerTool(
    ANALYZE_TOOL.name,
    {
      description: ANALYZE_TOOL.description,
      inputSchema: {
        brief: z.string(),
      },
    },
    async (args) => createToolResult(await handleToolCall(ANALYZE_TOOL.name, args)),
  );

  server.registerTool(
    ACTIVITY_MODEL_REVIEW_TOOL.name,
    {
      description: ACTIVITY_MODEL_REVIEW_TOOL.description,
      inputSchema: {
        brief: z.string(),
      },
    },
    async (args) =>
      createToolResult(await handleToolCall(ACTIVITY_MODEL_REVIEW_TOOL.name, args)),
  );

  server.registerTool(
    RECOMMEND_UI_WORKFLOW_PROFILES_TOOL.name,
    {
      description: RECOMMEND_UI_WORKFLOW_PROFILES_TOOL.description,
      inputSchema: {
        brief: z.string(),
      },
    },
    async (args) =>
      createToolResult(await handleToolCall(RECOMMEND_UI_WORKFLOW_PROFILES_TOOL.name, args)),
  );

  server.registerTool(
    REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL.name,
    {
      description: REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL.description,
      inputSchema: {
        brief: z.string(),
        candidate: z.record(z.any()),
      },
    },
    async (args) =>
      createToolResult(await handleToolCall(REVIEW_ACTIVITY_MODEL_CANDIDATE_TOOL.name, args)),
  );

  server.registerTool(
    REVIEW_UI_WORKFLOW_CANDIDATE_TOOL.name,
    {
      description: REVIEW_UI_WORKFLOW_CANDIDATE_TOOL.description,
      inputSchema: {
        brief: z.string(),
        candidate: z.record(z.any()),
        profile_id: z.string().optional(),
      },
    },
    async (args) =>
      createToolResult(await handleToolCall(REVIEW_UI_WORKFLOW_CANDIDATE_TOOL.name, args)),
  );

  server.registerTool(
    UI_GENERATION_HANDOFF_TOOL.name,
    {
      description: UI_GENERATION_HANDOFF_TOOL.description,
      inputSchema: {
        workflow_review: z.record(z.any()),
      },
    },
    async (args) =>
      createToolResult(await handleToolCall(UI_GENERATION_HANDOFF_TOOL.name, args)),
  );

  return server;
}
