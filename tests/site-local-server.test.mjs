import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { JUDGMENTKIT_MCP_TOOL_NAMES } from "../scripts/install-mcp.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import { buildSite } from "../site/build-site.mjs";

const REVIEW_BRIEF =
  "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const packageJson = readJson("package.json");
const vercelConfig = readJson("vercel.json");
const EXPECTED_RELEASE_VERSION = packageJson.version;

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

async function closeServer(server) {
  server.closeAllConnections?.();
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function fetchRoute(baseUrl, route, options = {}) {
  return fetch(new URL(route, baseUrl), options);
}

async function runMcpClient(endpoint) {
  let transport;
  let client;

  try {
    transport = new StreamableHTTPClientTransport(new URL(endpoint));
    client = new Client({
      name: "judgmentkit-local-site-test-client",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), 5_000);

    const toolsResponse = await withTimeout(client.listTools(), 5_000);
    assert.deepEqual(
      toolsResponse.tools.map((tool) => tool.name),
      JUDGMENTKIT_MCP_TOOL_NAMES,
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
    assert.equal(reviewResponse.structuredContent.review_status, "ready_for_review");
  } finally {
    await client?.close().catch(() => {});
    await transport?.close().catch(() => {});
  }
}

async function postRawInitialize(endpoint) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: {
          name: "judgmentkit-local-site-raw-post-test",
          version: "1.0.0",
        },
      },
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200, `${endpoint} raw initialize POST should return 200`);
  assert.equal(body.jsonrpc, "2.0", `${endpoint} raw initialize should return JSON-RPC`);
  assert.equal(body.result.serverInfo.name, "JudgmentKit");
  assert.equal(body.result.serverInfo.version, EXPECTED_RELEASE_VERSION);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-local-site-"));
await buildSite(tempDir);

const { server, url } = await listenSiteLocalServer({
  host: "127.0.0.1",
  port: 0,
  siteDir: tempDir,
});

try {
  for (const route of [
    "/",
    "/value/",
    "/docs/",
    "/docs",
    "/design-system/",
    "/design-system/tokens/",
    "/design-system/fonts/",
    "/design-system/icons/",
    "/examples/",
    "/evals/",
    "/install",
  ]) {
    const response = await fetchRoute(url, route);

    assert.equal(response.status, 200, `${route} should return 200`);
  }

  {
    const response = await fetchRoute(url, "/install");

    assert.ok(
      response.headers.get("content-type")?.startsWith("text/x-shellscript"),
      "/install should return shell script content type",
    );
  }

  {
    const response = await fetchRoute(
      url,
      "/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png",
    );

    assert.equal(response.status, 200, "model UI screenshot should return 200");
    assert.equal(response.headers.get("content-type"), "image/png");
  }

  {
    const response = await fetchRoute(
      url,
      "/examples/ai-native-design-system/first-use.json",
    );
    const body = await response.json();

    assert.equal(response.status, 200, "first-use fixture should return 200");
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(body.release_target, EXPECTED_RELEASE_VERSION);
    assert.equal(body.target_time_minutes, 10);
  }

  {
    const response = await fetchRoute(
      url,
      "/examples/ai-native-design-system/canonical-examples.json",
    );
    const body = await response.json();

    assert.equal(response.status, 200, "canonical examples fixture should return 200");
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(body.examples.length, 3);
    assert.equal(body.renderer_boundary.status, "deferred");
  }

  for (const route of [
    "/design-system/manifest.json",
    "/design-system/visual-token-adapter.json",
    "/design-system/component-contracts.json",
    "/design-system/pattern-contracts.json",
    "/design-system/component-specimens.json",
    "/design-system/pattern-specimens.json",
    "/design-system/specimen-provenance.json",
    "/design-system/accessibility-policy.json",
    "/design-system/icon-scenarios.json",
  ]) {
    const response = await fetchRoute(url, route);
    const body = await response.json();

    assert.equal(response.status, 200, `${route} should return 200`);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(typeof body, "object");
  }

  for (const route of [
    "/design-system/index.html.md",
    "/design-system/tokens/index.html.md",
    "/design-system/fonts/index.html.md",
    "/design-system/icons/index.html.md",
    "/design-system/components/index.html.md",
    "/design-system/patterns/index.html.md",
    "/design-system/accessibility/index.html.md",
  ]) {
    const response = await fetchRoute(url, route);
    const body = await response.text();

    assert.equal(response.status, 200, `${route} should return 200`);
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.ok(body.startsWith("# JudgmentKit"), `${route} should return Markdown`);
    assert.equal(body.includes("<nav"), false, `${route} must not include site navigation`);
  }

  for (const route of ["/design-system/llms.txt", "/design-system/llms-full.txt"]) {
    const response = await fetchRoute(url, route);
    const body = await response.text();

    assert.equal(response.status, 200, `${route} should return 200`);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.ok(body.includes("JudgmentKit Design System"));
  }

  {
    const response = await fetchRoute(url, "/_vercel/insights/script.js");
    const body = await response.text();

    assert.equal(response.status, 200, "local analytics shim should return 200");
    assert.ok(
      response.headers.get("content-type")?.startsWith("application/javascript"),
      "local analytics shim should return JavaScript",
    );
    assert.ok(body.includes("window.va"), "local analytics shim should initialize Vercel queue");
  }

  for (const route of ["/mcp", "/mcp/", "/api/mcp"]) {
    const response = await fetchRoute(url, route, {
      headers: {
        accept: "application/json",
      },
    });
    const body = await response.json();

    assert.equal(response.status, 200, `${route} should return metadata`);
    assert.equal(body.transport, "streamable-http");
    assert.equal(body.public_route.hosted_mcp_endpoint, true);
    assert.deepEqual(
      body.capabilities.tools.map((tool) => tool.name),
      JUDGMENTKIT_MCP_TOOL_NAMES,
    );
  }

  {
    const rewrites = vercelConfig.rewrites ?? [];
    const mcpRewrites = rewrites.filter((rewrite) => rewrite.destination === "/api/mcp");

    assert.ok(
      mcpRewrites.some((rewrite) => rewrite.source === "/mcp"),
      "vercel.json should route /mcp to /api/mcp",
    );
    assert.ok(
      mcpRewrites.some((rewrite) => rewrite.source === "/mcp/"),
      "vercel.json should route /mcp/ to /api/mcp",
    );
  }

  {
    const headResponse = await fetchRoute(url, "/", { method: "HEAD" });

    assert.equal(headResponse.status, 200);
    assert.equal(await headResponse.text(), "");
  }

  {
    const postResponse = await fetchRoute(url, "/", { method: "POST" });

    assert.equal(postResponse.status, 405);
    assert.equal(postResponse.headers.get("allow"), "GET, HEAD");
  }

  for (const traversalRoute of [
    "/%2e%2e/package.json",
    "/assets/%2e%2e/%2e%2e/package.json",
  ]) {
    const response = await fetchRoute(url, traversalRoute);

    assert.equal(response.status, 404, `${traversalRoute} should not escape site root`);
  }

  for (const route of ["/mcp", "/mcp/"]) {
    const endpoint = new URL(route, url).toString();
    await postRawInitialize(endpoint);
    await runMcpClient(endpoint);
  }
} finally {
  await closeServer(server);
}

console.log("Local site server checks passed.");
