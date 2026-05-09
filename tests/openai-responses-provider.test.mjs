import assert from "node:assert/strict";
import process from "node:process";

import {
  JudgmentKitInputError,
  createActivityModelReview,
  createModelAssistedUiWorkflowReview,
} from "../src/index.mjs";
import { createOpenAIResponsesUiWorkflowProposer } from "judgmentkit-2/providers/openai-responses";

const REFUND_TRIAGE_BRIEF = `
  A support lead is reviewing refund requests during the daily triage workflow.
  The activity is deciding whether a case should be approved, sent to policy review,
  or returned to the agent for missing evidence. The outcome is a clear handoff
  with the next action and the reason for the decision.
`;

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

function refundWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Refund escalation queue",
      steps: ["Review evidence", "Choose path", "Prepare handoff"],
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
    primary_ui: {
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
      user_facing_terms: [
        "refund request",
        "policy review",
        "missing evidence",
        "handoff reason",
      ],
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
}

function leakyWorkflowCandidate() {
  const candidate = refundWorkflowCandidate();

  candidate.workflow.surface_name = "Refund JSON schema console";
  candidate.workflow.primary_actions = ["Save CRUD update", "Send to policy review"];
  candidate.primary_ui.sections = ["Prompt template", "Evidence checklist"];

  return candidate;
}

function jsonResponse(body, options = {}) {
  const { ok = true, status = 200, statusText = "OK", text } = options;

  return {
    ok,
    status,
    statusText,
    async json() {
      return body;
    },
    async text() {
      return text ?? JSON.stringify(body);
    },
  };
}

function createRecordingFetch(responseFactory) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({
      url,
      init,
      body: JSON.parse(init.body),
    });

    return responseFactory(url, init);
  };

  fetchImpl.calls = calls;

  return fetchImpl;
}

function outputTextResponse(value) {
  return jsonResponse({
    output_text: typeof value === "string" ? value : JSON.stringify(value),
  });
}

function outputArrayResponse(value) {
  return jsonResponse({
    output: [
      {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: typeof value === "string" ? value : JSON.stringify(value),
          },
        ],
      },
    ],
  });
}

function assertNoAdapterRequestKeys(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(
      FORBIDDEN_ADAPTER_KEYS.has(key),
      false,
      `OpenAI provider request introduced forbidden field key: ${key}`,
    );
    assertNoAdapterRequestKeys(child);
  }
}

function createProvider(fetchImpl) {
  return createOpenAIResponsesUiWorkflowProposer({
    apiKey: "test-api-key",
    model: "test-model",
    fetchImpl,
    baseUrl: "https://api.example.test/v1/",
  });
}

{
  const fetchImpl = createRecordingFetch(() =>
    outputTextResponse(refundWorkflowCandidate()),
  );
  const propose = createProvider(fetchImpl);
  const packet = await createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {
    propose,
  });

  assert.equal(packet.review_status, "ready_for_review");
  assert.equal(packet.source.mode, "model_assisted");
  assert.equal(packet.source.proposer, "injected");
  assert.equal(packet.candidate.workflow.surface_name, "Refund escalation queue");
  assert.deepEqual(packet.guardrails.candidate_primary_terms_detected, []);
  assert.deepEqual(packet.guardrails.candidate_primary_meta_terms_detected, []);

  assert.equal(fetchImpl.calls.length, 1);
  const call = fetchImpl.calls[0];
  assert.equal(call.url, "https://api.example.test/v1/responses");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.Authorization, "Bearer test-api-key");
  assert.equal(call.body.model, "test-model");
  assert.equal(call.body.input[0].role, "system");
  assert.equal(call.body.input[1].role, "user");
  assert.equal(call.body.text.format.type, "json_schema");
  assert.equal(call.body.text.format.strict, true);
  assert.deepEqual(call.body.text.format.schema.required, [
    "workflow",
    "primary_ui",
    "handoff",
    "diagnostics",
  ]);
  assertNoAdapterRequestKeys(call.body);
}

{
  const fetchImpl = createRecordingFetch(() =>
    outputArrayResponse(leakyWorkflowCandidate()),
  );
  const propose = createProvider(fetchImpl);
  const packet = await createModelAssistedUiWorkflowReview(REFUND_TRIAGE_BRIEF, {
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
  assert.ok(
    packet.guardrails.candidate_primary_terms_detected.some(
      (entry) => entry.term === "CRUD",
    ),
  );
}

{
  assert.throws(
    () =>
      createOpenAIResponsesUiWorkflowProposer({
        apiKey: "",
        model: "test-model",
        fetchImpl: async () => outputTextResponse(refundWorkflowCandidate()),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("apiKey"),
  );
}

{
  const previousApiKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.JUDGMENTKIT_OPENAI_MODEL;

  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.JUDGMENTKIT_OPENAI_MODEL;

    assert.throws(
      () =>
        createOpenAIResponsesUiWorkflowProposer({
          fetchImpl: async () => outputTextResponse(refundWorkflowCandidate()),
        }),
      (error) =>
        error instanceof JudgmentKitInputError &&
        error.code === "invalid_input" &&
        error.message.includes("apiKey"),
    );

    process.env.OPENAI_API_KEY = "env-api-key";

    assert.throws(
      () =>
        createOpenAIResponsesUiWorkflowProposer({
          fetchImpl: async () => outputTextResponse(refundWorkflowCandidate()),
        }),
      (error) =>
        error instanceof JudgmentKitInputError &&
        error.code === "invalid_input" &&
        error.message.includes("model"),
    );

    process.env.JUDGMENTKIT_OPENAI_MODEL = "env-model";

    const fetchImpl = createRecordingFetch(() =>
      outputTextResponse(refundWorkflowCandidate()),
    );
    const propose = createOpenAIResponsesUiWorkflowProposer({ fetchImpl });
    const candidate = await propose({
      brief: REFUND_TRIAGE_BRIEF,
      activity_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
    });

    assert.equal(candidate.workflow.surface_name, "Refund escalation queue");
    assert.equal(fetchImpl.calls[0].init.headers.Authorization, "Bearer env-api-key");
    assert.equal(fetchImpl.calls[0].body.model, "env-model");
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousApiKey;
    }

    if (previousModel === undefined) {
      delete process.env.JUDGMENTKIT_OPENAI_MODEL;
    } else {
      process.env.JUDGMENTKIT_OPENAI_MODEL = previousModel;
    }
  }
}

{
  assert.throws(
    () =>
      createOpenAIResponsesUiWorkflowProposer({
        apiKey: "test-api-key",
        model: "",
        fetchImpl: async () => outputTextResponse(refundWorkflowCandidate()),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("model"),
  );
}

{
  const propose = createProvider(
    createRecordingFetch(() =>
      jsonResponse(
        { error: { message: "bad request" } },
        { ok: false, status: 400, statusText: "Bad Request" },
      ),
    ),
  );

  await assert.rejects(
    () =>
      propose({
        brief: REFUND_TRIAGE_BRIEF,
        activity_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("OpenAI Responses request failed with status 400"),
  );
}

{
  const propose = createProvider(createRecordingFetch(() => jsonResponse({})));

  await assert.rejects(
    () =>
      propose({
        brief: REFUND_TRIAGE_BRIEF,
        activity_review: createActivityModelReview(REFUND_TRIAGE_BRIEF),
      }),
    (error) =>
      error instanceof JudgmentKitInputError &&
      error.code === "invalid_input" &&
      error.message.includes("did not include output text"),
  );
}

{
  const propose = createProvider(createRecordingFetch(() => outputTextResponse("{not json")));

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
  const propose = createProvider(createRecordingFetch(() => outputTextResponse({})));

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

console.log("OpenAI Responses provider checks passed.");
