import assert from "node:assert/strict";
import http from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import {
  getHostedMcpMetadata,
  handleJudgmentKitMcpNodeRequest,
  MAX_MCP_POST_BODY_BYTES,
} from "../src/mcp-http.mjs";
import { getMcpAnalyticsEvents } from "../src/analytics.mjs";

const EXPECTED_TOOL_NAMES = [
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
];

const REVIEW_BRIEF =
  "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.";

function textContent(response) {
  return response.content.find((entry) => entry.type === "text")?.text ?? "";
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

async function withTestServer(analyticsTracker, callback) {
  const server = http.createServer((req, res) => {
    handleJudgmentKitMcpNodeRequest(req, res, { analyticsTracker }).catch((error) => {
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

  try {
    await callback(`http://127.0.0.1:${port}/mcp`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

async function runMcpClient(endpoint) {
  let transport;
  let client;

  try {
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
          brief: REVIEW_BRIEF,
        },
      }),
      5_000,
    );

    assert.equal(reviewResponse.isError, undefined);
    assert.ok(textContent(reviewResponse).includes("## JudgmentKit Activity Review"));
    assert.ok(textContent(reviewResponse).includes("**Status:** Ready for concept planning"));
    assert.equal(textContent(reviewResponse).trim().startsWith("{"), false);
    assert.equal(reviewResponse.structuredContent.review_status, "ready_for_review");
    assert.equal(reviewResponse.structuredContent.source.mode, "deterministic");
  } finally {
    await client?.close().catch(() => {});
    await transport?.close().catch(() => {});
  }
}

async function postRaw(endpoint, body, headers = {}) {
  return fetch(endpoint, {
    method: "POST",
    headers,
    body,
  });
}

const metadata = getHostedMcpMetadata();

assert.equal(metadata.name, "JudgmentKit");
assert.equal(metadata.transport, "streamable-http");
assert.equal(metadata.public_route.hosted_mcp_endpoint, true);
assert.deepEqual(
  metadata.capabilities.tools.map((tool) => tool.name),
  EXPECTED_TOOL_NAMES,
);
assert.deepEqual(
  getMcpAnalyticsEvents({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "leak this brief",
      arguments: {
        brief: REVIEW_BRIEF,
      },
    },
  }),
  [
    {
      name: "JudgmentKit MCP call tool",
      properties: {
        tool_name: "unknown",
      },
    },
  ],
);

const analyticsEvents = [];

await withTestServer(
  async (name, properties, options) => {
    analyticsEvents.push({
      name,
      properties,
      headers: Object.fromEntries(options.headers.entries()),
    });
  },
  async (endpoint) => {
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

    const unsupportedMediaResponse = await postRaw(endpoint, "{}", {
      "content-type": "text/plain",
    });
    const unsupportedMediaBody = await unsupportedMediaResponse.json();

    assert.equal(unsupportedMediaResponse.status, 415);
    assert.equal(
      unsupportedMediaBody.error.message,
      "Unsupported media type: POST /mcp requires application/json.",
    );

    const oversizedResponse = await postRaw(
      endpoint,
      JSON.stringify({ value: "x".repeat(MAX_MCP_POST_BODY_BYTES) }),
      {
        "content-type": "application/json",
      },
    );
    const oversizedBody = await oversizedResponse.json();

    assert.equal(oversizedResponse.status, 413);
    assert.equal(
      oversizedBody.error.message,
      "Request body too large: POST /mcp is limited to 128KB.",
    );

    const parseErrorResponse = await postRaw(endpoint, "{", {
      "content-type": "application/json",
    });
    const parseErrorBody = await parseErrorResponse.json();

    assert.equal(parseErrorResponse.status, 400);
    assert.equal(parseErrorBody.error.code, -32700);

    await runMcpClient(endpoint);
  },
);

assert.deepEqual(
  analyticsEvents.map((event) => [event.name, event.properties]),
  [
    ["JudgmentKit MCP initialize", undefined],
    ["JudgmentKit MCP list tools", undefined],
    [
      "JudgmentKit MCP call tool",
      {
        tool_name: "create_activity_model_review",
      },
    ],
  ],
);
assert.equal(JSON.stringify(analyticsEvents).includes(REVIEW_BRIEF), false);
assert.equal(JSON.stringify(analyticsEvents).includes("ready_for_review"), false);
assert.deepEqual(
  analyticsEvents.map((event) => event.headers["user-agent"]),
  ["judgmentkit-mcp", "judgmentkit-mcp", "judgmentkit-mcp"],
);

await withTestServer(
  async () => {
    throw new Error("analytics unavailable");
  },
  async (endpoint) => {
    await runMcpClient(endpoint);
  },
);


console.log("MCP Streamable HTTP checks passed.");
