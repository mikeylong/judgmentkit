import process from "node:process";

import {
  JudgmentKitInputError,
  createUiWorkflowProposer,
} from "../index.mjs";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

const UI_WORKFLOW_CANDIDATE_SCHEMA = {
  type: "object",
  properties: {
    workflow: {
      type: "object",
      properties: {
        surface_name: { type: "string" },
        steps: {
          type: "array",
          items: { type: "string" },
        },
        primary_actions: {
          type: "array",
          items: { type: "string" },
        },
        decision_points: {
          type: "array",
          items: { type: "string" },
        },
        completion_state: { type: "string" },
      },
      required: [
        "surface_name",
        "steps",
        "primary_actions",
        "decision_points",
        "completion_state",
      ],
      additionalProperties: false,
    },
    primary_ui: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: { type: "string" },
        },
        controls: {
          type: "array",
          items: { type: "string" },
        },
        user_facing_terms: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["sections", "controls", "user_facing_terms"],
      additionalProperties: false,
    },
    handoff: {
      type: "object",
      properties: {
        next_owner: { type: "string" },
        reason: { type: "string" },
        next_action: { type: "string" },
      },
      required: ["next_owner", "reason", "next_action"],
      additionalProperties: false,
    },
    diagnostics: {
      type: "object",
      properties: {
        implementation_terms: {
          type: "array",
          items: { type: "string" },
        },
        reveal_contexts: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["implementation_terms", "reveal_contexts"],
      additionalProperties: false,
    },
  },
  required: ["workflow", "primary_ui", "handoff", "diagnostics"],
  additionalProperties: false,
};

function resolveRequiredOption(name, providedValue, envName) {
  const resolvedValue = providedValue ?? process.env[envName];

  if (typeof resolvedValue !== "string" || resolvedValue.trim().length === 0) {
    throw new JudgmentKitInputError(
      `createOpenAIResponsesUiWorkflowProposer requires ${name} or ${envName}.`,
    );
  }

  return resolvedValue.trim();
}

function resolveFetch(fetchImpl) {
  const resolvedFetch = fetchImpl ?? globalThis.fetch;

  if (typeof resolvedFetch !== "function") {
    throw new JudgmentKitInputError(
      "createOpenAIResponsesUiWorkflowProposer requires fetchImpl or global fetch.",
    );
  }

  return resolvedFetch;
}

function normalizeBaseUrl(baseUrl = DEFAULT_BASE_URL) {
  if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) {
    throw new JudgmentKitInputError(
      "createOpenAIResponsesUiWorkflowProposer requires a non-empty baseUrl.",
    );
  }

  return baseUrl.trim().replace(/\/+$/, "");
}

function buildResponsesInput(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function buildResponsesBody(request, model) {
  return {
    model,
    input: buildResponsesInput(request.messages),
    text: {
      format: {
        type: "json_schema",
        name: "judgmentkit_ui_workflow_candidate",
        strict: true,
        schema: UI_WORKFLOW_CANDIDATE_SCHEMA,
      },
    },
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    throw new JudgmentKitInputError(
      "OpenAI Responses returned a response body that was not valid JSON.",
    );
  }
}

async function readFailureBody(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const outputText = [];

  for (const item of responseJson.output ?? []) {
    for (const content of item.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        outputText.push(content.text);
      }
    }
  }

  if (outputText.length === 0) {
    throw new JudgmentKitInputError(
      "OpenAI Responses response did not include output text.",
    );
  }

  return outputText.join("");
}

export function createOpenAIResponsesUiWorkflowProposer(options = {}) {
  const apiKey = resolveRequiredOption("apiKey", options.apiKey, "OPENAI_API_KEY");
  const model = resolveRequiredOption(
    "model",
    options.model,
    "JUDGMENTKIT_OPENAI_MODEL",
  );
  const fetchImpl = resolveFetch(options.fetchImpl);
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return createUiWorkflowProposer({
    callModel: async (request) => {
      let response;

      try {
        response = await fetchImpl(`${baseUrl}/responses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(buildResponsesBody(request, model)),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown network error";

        throw new JudgmentKitInputError(
          `OpenAI Responses request failed before receiving a response: ${message}`,
        );
      }

      if (!response?.ok) {
        const status = response?.status ?? "unknown";
        const statusText = response?.statusText ? ` ${response.statusText}` : "";
        const failureBody = await readFailureBody(response);
        const suffix = failureBody ? `: ${failureBody}` : "";

        throw new JudgmentKitInputError(
          `OpenAI Responses request failed with status ${status}${statusText}${suffix}`,
        );
      }

      const responseJson = await parseJsonResponse(response);

      return extractOutputText(responseJson);
    },
  });
}
