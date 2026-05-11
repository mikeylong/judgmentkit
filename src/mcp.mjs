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
        text: JSON.stringify(result, null, 2),
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
