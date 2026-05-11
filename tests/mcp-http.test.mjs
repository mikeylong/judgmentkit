import assert from "node:assert/strict";
import http from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import {
  getHostedMcpMetadata,
  handleJudgmentKitMcpNodeRequest,
} from "../src/mcp-http.mjs";

const EXPECTED_TOOL_NAMES = [
  "analyze_implementation_brief",
  "create_activity_model_review",
  "recommend_ui_workflow_profiles",
  "review_activity_model_candidate",
  "review_ui_workflow_candidate",
  "create_ui_generation_handoff",
];

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

const server = http.createServer((req, res) => {
  handleJudgmentKitMcpNodeRequest(req, res).catch((error) => {
    if (res.headersSent) {
      return;
    }

    res.statusCode = 500;
    res.end(error instanceof Error ? error.message : String(error));
  });
});

await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});

const { port } = server.address();
const endpoint = `http://127.0.0.1:${port}/mcp`;
let transport;
let client;

try {
  const metadata = getHostedMcpMetadata();

  assert.equal(metadata.name, "JudgmentKit");
  assert.equal(metadata.transport, "streamable-http");
  assert.equal(metadata.public_route.hosted_mcp_endpoint, true);
  assert.deepEqual(
    metadata.capabilities.tools.map((tool) => tool.name),
    EXPECTED_TOOL_NAMES,
  );

  const metadataResponse = await fetch(endpoint, {
    headers: {
      accept: "application/json",
    },
  });
  const metadataBody = await metadataResponse.json();

  assert.equal(metadataResponse.status, 200);
  assert.equal(metadataResponse.headers.get("access-control-allow-origin"), "*");
  assert.equal(metadataBody.transport, "streamable-http");
  assert.equal(metadataBody.public_route.hosted_mcp_endpoint, true);
  assert.deepEqual(
    metadataBody.capabilities.tools.map((tool) => tool.name),
    EXPECTED_TOOL_NAMES,
  );

  const optionsResponse = await fetch(endpoint, { method: "OPTIONS" });

  assert.equal(optionsResponse.status, 204);
  assert.equal(
    optionsResponse.headers.get("access-control-allow-methods"),
    "GET, POST, DELETE, OPTIONS",
  );

  transport = new StreamableHTTPClientTransport(new URL(endpoint));
  client = new Client({
    name: "judgmentkit-http-test-client",
    version: "1.0.0",
  });

  await withTimeout(client.connect(transport), 5_000);

  const toolsResponse = await withTimeout(client.listTools(), 5_000);
  assert.deepEqual(
    toolsResponse.tools.map((tool) => tool.name),
    EXPECTED_TOOL_NAMES,
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
  assert.equal(reviewResponse.structuredContent.source.mode, "deterministic");
} finally {
  await client?.close().catch(() => {});
  await transport?.close().catch(() => {});
  server.closeAllConnections?.();
  await new Promise((resolve) => {
    server.close(resolve);
  });
}

console.log("MCP Streamable HTTP checks passed.");
