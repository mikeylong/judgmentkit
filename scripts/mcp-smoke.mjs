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
    name: "judgmentkit2-smoke-client",
    version: "1.0.0",
  });

  await withTimeout(client.connect(transport), 5_000);

  const toolsResponse = await withTimeout(client.listTools(), 5_000);
  const toolNames = toolsResponse.tools.map((tool) => tool.name);

  assert.deepEqual(toolNames, [
    "analyze_implementation_brief",
    "create_activity_model_review",
    "review_activity_model_candidate",
    "review_ui_workflow_candidate",
    "create_ui_generation_handoff",
  ]);

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
  assert.equal(reviewResponse.structuredContent.source.mode, "deterministic");
  assert.equal(stderrOutput.includes("JudgmentKit 2 stdio MCP failed"), false);

  console.log(
    JSON.stringify(
      {
        ok: true,
        tools: toolNames,
        review_status: reviewResponse.structuredContent.review_status,
      },
      null,
      2,
    ),
  );
} finally {
  await transport?.close();
}
