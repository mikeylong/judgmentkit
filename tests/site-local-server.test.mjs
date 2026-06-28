import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { JUDGMENTKIT_MCP_TOOL_NAMES } from "../scripts/install-mcp.mjs";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import { buildSite } from "../site/build-site.mjs";

const REVIEW_BRIEF =
  "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.";

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
    "/examples/",
    "/evals/",
    "/install",
  ]) {
    const response = await fetchRoute(url, route);

    assert.equal(response.status, 200, `${route} should return 200`);
  }

  for (const route of [
    "/design-system/",
    "/design-system",
    "/design-system/index.html",
    "/design-system/index.html.md",
    "/design-system/llms.txt",
    "/design-system/llms-full.txt",
    "/design-system/tokens/",
    "/design-system/tokens",
    "/design-system/tokens/index.html",
    "/design-system/tokens/index.html.md",
    "/design-system/fonts",
    "/design-system/fonts/",
    "/design-system/fonts/index.html",
    "/design-system/fonts/index.html.md",
    "/design-system/icons",
    "/design-system/icons/",
    "/design-system/icons/index.html",
    "/design-system/icons/index.html.md",
    "/design-system/components",
    "/design-system/components/",
    "/design-system/components/index.html",
    "/design-system/components/index.html.md",
    "/design-system/patterns",
    "/design-system/patterns/",
    "/design-system/patterns/index.html",
    "/design-system/patterns/index.html.md",
    "/design-system/accessibility",
    "/design-system/accessibility/",
    "/design-system/accessibility/index.html",
    "/design-system/accessibility/index.html.md",
  ]) {
    const response = await fetchRoute(url, route, { redirect: "manual" });

    assert.equal(response.status, 308, `${route} should redirect to Surfaces`);
    assert.equal(
      response.headers.get("location"),
      "https://surfaces.systems/design-system",
    );
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
    assert.equal(body.release_target, "0.6.1");
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

    assert.equal(response.status, 410, `${route} should return 410`);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(body.code, "judgmentkit_design_system_retired");
    assert.equal(body.canonicalUrl, "https://surfaces.systems/design-system");
    assert.equal(body.requestedPath, route);
  }

  {
    const response = await fetchRoute(url, "/design-system/manifest.json", {
      method: "HEAD",
    });

    assert.equal(response.status, 410, "HEAD on retired JSON should return 410");
    assert.equal(await response.text(), "");
  }

  {
    const response = await fetchRoute(url, "/design-system/manifest.json", {
      method: "POST",
    });

    assert.equal(response.status, 405, "POST on retired JSON should return 405");
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  }

  {
    const response = await fetchRoute(url, "/design-system/unknown.json");
    const body = await response.json();

    assert.equal(response.status, 410, "unknown design-system JSON should return 410");
    assert.equal(body.requestedPath, "/design-system/unknown.json");
  }

  {
    const response = await fetchRoute(url, "/design-system/unknown/");

    assert.equal(response.status, 404, "unknown non-JSON child routes should stay 404");
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

  await runMcpClient(`${url}/mcp`);
} finally {
  await closeServer(server);
}

console.log("Local site server checks passed.");
