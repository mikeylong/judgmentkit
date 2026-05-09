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
    name: "judgmentkit2-stdio-test-client",
    version: "1.0.0",
  });

  await withTimeout(client.connect(transport), 5_000);

  const toolsResponse = await withTimeout(client.listTools(), 5_000);

  assert.deepEqual(
    toolsResponse.tools.map((tool) => tool.name),
    [
      "analyze_implementation_brief",
      "create_activity_model_review",
      "review_activity_model_candidate",
      "review_ui_workflow_candidate",
      "create_ui_generation_handoff",
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
            sections: ["Selected case", "Evidence checklist", "Policy review context", "Handoff"],
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
        },
      },
    }),
    5_000,
  );

  assert.equal(workflowReviewResponse.isError, undefined);
  assert.equal(workflowReviewResponse.structuredContent.source.mode, "model_assisted");
  assert.equal(
    workflowReviewResponse.structuredContent.source.proposer,
    "external_candidate",
  );
  assert.equal(workflowReviewResponse.structuredContent.review_status, "ready_for_review");
  assert.ok(
    workflowReviewResponse.structuredContent.candidate.workflow.primary_actions.includes(
      "Approve refund",
    ),
  );

  const handoffResponse = await withTimeout(
    client.callTool({
      name: "create_ui_generation_handoff",
      arguments: {
        workflow_review: workflowReviewResponse.structuredContent,
      },
    }),
    5_000,
  );

  assert.equal(handoffResponse.isError, undefined);
  assert.equal(handoffResponse.structuredContent.handoff_status, "ready_for_generation");
  assert.ok(
    handoffResponse.structuredContent.workflow.primary_actions.includes("Approve refund"),
  );
  assert.equal(stderrOutput.includes("JudgmentKit 2 stdio MCP failed"), false);
} finally {
  await transport?.close();
}

console.log("MCP stdio checks passed.");
