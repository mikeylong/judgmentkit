import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { JUDGMENTKIT_MCP_TOOL_NAMES } from "../scripts/install-mcp.mjs";
import { config as mcpFunctionConfig } from "../api/mcp.js";
import { listenSiteLocalServer } from "../scripts/site-local-server.mjs";
import {
  assertRouteNotPublic,
  diagnosticPrivatePaths,
  modelUiPublicRoutePath,
  probeRemoteMcpEndpoint,
  verifyDesignSystemSurfaceProfiles,
} from "../scripts/verify-public-release.mjs";
import { buildSite, modelUiPublicPath } from "../site/build-site.mjs";
import { MAX_MCP_POST_BODY_BYTES } from "../src/mcp-http.mjs";

const REVIEW_BRIEF =
  "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.";
const PUBLIC_MCP_ROUTES = ["/mcp", "/mcp/"];
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

function cssRuleBody(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(match, `expected served CSS rule for ${selector}`);
  return match[1];
}

function cssDeclarationValue(ruleBody, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return ruleBody
    .match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, "m"))?.[1]
    ?.trim();
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

{
  const sourceManifest = {
    diagnostic_candidates: [
      {
        id: "diag-leak",
        artifact_path: "artifacts/diag-leak.html",
        screenshot_path: "screenshots/diag-leak.png",
        capture_file: "captures/diag-leak.json",
      },
    ],
  };
  const publicManifest = {
    diagnostic_candidates: [{ id: "diag-leak" }],
  };

  assert.deepEqual(diagnosticPrivatePaths(sourceManifest, publicManifest), [
    { id: "diag-leak", privatePath: "artifacts/diag-leak.html" },
    { id: "diag-leak", privatePath: "screenshots/diag-leak.png" },
    { id: "diag-leak", privatePath: "captures/diag-leak.json" },
  ]);
  assert.throws(
    () =>
      diagnosticPrivatePaths(
        {
          diagnostic_candidates: [
            {
              id: "diag-leak",
              artifact_path: "artifacts/../diag-leak.html",
            },
          ],
        },
        publicManifest,
      ),
    /diag-leak diagnostic artifact_path must be a safe relative path/,
  );
}

{
  const safeUseCase = {
    id: "refund-system-map",
    index_path: "examples/model-ui/refund-system-map/index.html",
    manifest_path: "examples/model-ui/refund-system-map/manifest.json",
  };

  assert.equal(
    modelUiPublicPath(safeUseCase, "manifest_path"),
    "examples/model-ui/refund-system-map/manifest.json",
  );
  assert.equal(
    modelUiPublicRoutePath(safeUseCase, "index_path"),
    "/examples/model-ui/refund-system-map/index.html",
  );

  for (const [field, value] of [
    ["manifest_path", "../manifest.json"],
    ["manifest_path", "/examples/model-ui/refund-system-map/manifest.json"],
    ["manifest_path", "//example.com/model-ui/manifest.json"],
    ["manifest_path", "https://example.com/model-ui/manifest.json"],
    ["manifest_path", "examples/model-ui/../secret/manifest.json"],
    ["manifest_path", "examples/model-ui/refund-system-map/manifest.json?debug=1"],
    ["manifest_path", "examples/model-ui/refund-system-map/manifest.json#debug"],
    ["manifest_path", "examples\\model-ui\\refund-system-map\\manifest.json"],
    ["manifest_path", "examples/other/manifest.json"],
    ["index_path", "examples/other/index.html"],
  ]) {
    const useCase = { ...safeUseCase, [field]: value };
    assert.throws(
      () => modelUiPublicPath(useCase, field),
      /must (be a safe relative path|stay under examples\/model-ui\/)/,
    );
    assert.throws(
      () => modelUiPublicRoutePath(useCase, field),
      /must (be a safe relative path|stay under examples\/model-ui\/)/,
    );
  }
}

function listenFixtureServer(handler) {
  const server = http.createServer(handler);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function fetchRoute(baseUrl, route, options = {}) {
  return fetch(new URL(route, baseUrl), options);
}

async function assertStaticGetAndHead(baseUrl, route, contentType, verifyBody) {
  const response = await fetchRoute(baseUrl, route);
  const body = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200, `${route} GET should return 200`);
  assert.equal(response.headers.get("content-type"), contentType);
  assert.equal(
    Number(response.headers.get("content-length")),
    body.length,
    `${route} GET should report the full body size`,
  );
  verifyBody?.(body);

  const headResponse = await fetchRoute(baseUrl, route, { method: "HEAD" });

  assert.equal(headResponse.status, 200, `${route} HEAD should return 200`);
  assert.equal(headResponse.headers.get("content-type"), contentType);
  assert.equal(
    Number(headResponse.headers.get("content-length")),
    body.length,
    `${route} HEAD should report the GET body size`,
  );
  assert.equal(await headResponse.text(), "", `${route} HEAD should not return a body`);

  return body;
}

async function assertStaticByteRanges(baseUrl, route) {
  const fullResponse = await fetchRoute(baseUrl, route);
  const fullBody = Buffer.from(await fullResponse.arrayBuffer());
  const assetSize = Number(fullResponse.headers.get("content-length"));

  assert.equal(fullResponse.status, 200, `${route} full GET should return 200`);
  assert.equal(assetSize, fullBody.length, `${route} should report its full byte length`);
  assert.ok(assetSize >= 100, `${route} should contain at least 100 bytes`);
  assert.equal(fullResponse.headers.get("accept-ranges"), "bytes");

  const rangeResponse = await fetch(new URL(route, baseUrl), {
    headers: { Range: "bytes=0-99" },
  });
  const rangeBody = Buffer.from(await rangeResponse.arrayBuffer());
  assert.equal(rangeResponse.status, 206);
  assert.equal(rangeResponse.headers.get("accept-ranges"), "bytes");
  assert.equal(rangeResponse.headers.get("content-length"), "100");
  assert.equal(rangeResponse.headers.get("content-range"), `bytes 0-99/${assetSize}`);
  assert.deepEqual(rangeBody, fullBody.subarray(0, 100));

  const invalidRangeResponse = await fetch(new URL(route, baseUrl), {
    headers: { Range: `bytes=${assetSize}-` },
  });
  assert.equal(invalidRangeResponse.status, 416);
  assert.equal(invalidRangeResponse.headers.get("content-range"), `bytes */${assetSize}`);
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
    assert.ok(textContent(reviewResponse).includes("## JudgmentKit Working Premise"));
    assert.ok(textContent(reviewResponse).includes("**Working premise**"));
    assert.equal(textContent(reviewResponse).includes("**Status:**"), false);
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

async function assertPublicMcpMetadata(baseUrl, route) {
  const response = await fetchRoute(baseUrl, route, {
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

async function assertPublicMcpOptions(baseUrl, route) {
  const response = await fetchRoute(baseUrl, route, { method: "OPTIONS" });

  assert.equal(response.status, 204, `${route} OPTIONS should return 204`);
  assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, DELETE, OPTIONS");
}

async function assertPublicMcpAppGuards(baseUrl, route) {
  const unsupportedMediaResponse = await fetchRoute(baseUrl, route, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
    },
    body: "{}",
  });
  const unsupportedMediaBody = await unsupportedMediaResponse.json();

  assert.equal(unsupportedMediaResponse.status, 415, `${route} non-JSON POST should return 415`);
  assert.equal(
    unsupportedMediaBody.error.message,
    "Unsupported media type: POST /mcp requires application/json.",
  );

  const oversizedResponse = await fetchRoute(baseUrl, route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ value: "x".repeat(MAX_MCP_POST_BODY_BYTES) }),
  });
  const oversizedBody = await oversizedResponse.json();

  assert.equal(oversizedResponse.status, 413, `${route} oversized POST should return 413`);
  assert.equal(
    oversizedBody.error.message,
    "Request body too large: POST /mcp is limited to 128KB.",
  );

  const parseErrorResponse = await fetchRoute(baseUrl, route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{",
  });
  const parseErrorBody = await parseErrorResponse.json();

  assert.equal(parseErrorResponse.status, 400, `${route} malformed JSON should return 400`);
  assert.equal(parseErrorBody.error.code, -32700);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-local-site-"));
await buildSite(tempDir);
fs.writeFileSync(path.join(tempDir, "empty.txt"), "");

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

  await assertStaticGetAndHead(url, "/empty.txt", "text/plain; charset=utf-8", (body) => {
    assert.equal(body.length, 0, "zero-byte static files should remain valid responses");
  });
  {
    const response = await fetchRoute(url, "/empty.txt", {
      headers: { Range: "bytes=0-0" },
    });
    assert.equal(response.status, 416, "a byte range cannot be satisfied for an empty file");
    assert.equal(response.headers.get("content-range"), "bytes */0");
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
    const response = await fetchRoute(url, "/assets/judgment-lens-hero.webp");
    const body = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200, "homepage hero art should return 200");
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(Number(response.headers.get("content-length")), body.length);
    assert.equal(body.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(body.subarray(8, 12).toString("ascii"), "WEBP");

    const headResponse = await fetchRoute(url, "/assets/judgment-lens-hero.webp", {
      method: "HEAD",
    });

    assert.equal(headResponse.status, 200, "homepage hero art HEAD should return 200");
    assert.equal(headResponse.headers.get("content-type"), "image/webp");
    assert.equal(
      Number(headResponse.headers.get("content-length")),
      body.length,
      "homepage hero art HEAD should report the full body size",
    );
    assert.equal(await headResponse.text(), "");
  }

  await assertStaticGetAndHead(
    url,
    "/assets/patterns/marketing-surface-weeknight-meal-plan.webp",
    "image/webp",
    (body) => {
      assert.equal(body.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(body.subarray(8, 12).toString("ascii"), "WEBP");
      assert.ok(body.length > 0);
      assert.ok(body.length < 250_000);
    },
  );

  await assertStaticGetAndHead(url, "/assets/site.css", "text/css; charset=utf-8", (body) => {
    const css = body.toString("utf8");
    const controlsCss = cssRuleBody(css, ".homepage-film-controls");
    assert.match(
      controlsCss,
      /color:\s*var\(--homepage-film-control-ink\);/,
      "served player icons should follow the current site theme",
    );

    for (const property of [
      "border",
      "background",
      "box-shadow",
      "-webkit-backdrop-filter",
      "backdrop-filter",
    ]) {
      const value = cssDeclarationValue(controlsCss, property);
      assert.ok(
        value === undefined || /^(?:0|none|transparent)$/i.test(value),
        `served video-control group must not render a shared ${property} surface`,
      );
    }
    assert.ok(
      !(
        cssDeclarationValue(controlsCss, "left") &&
        !/^auto$/i.test(cssDeclarationValue(controlsCss, "left")) &&
        cssDeclarationValue(controlsCss, "right") &&
        !/^auto$/i.test(cssDeclarationValue(controlsCss, "right"))
      ),
      "served video-control group should not stretch edge-to-edge across the film",
    );
    assert.match(controlsCss, /right:\s*clamp\(/);
    assert.match(controlsCss, /bottom:\s*clamp\(/);
    assert.match(controlsCss, /left:\s*auto;/);
    assert.match(controlsCss, /transform:\s*none;/);
    assert.ok(
      !cssDeclarationValue(controlsCss, "opacity") ||
        cssDeclarationValue(controlsCss, "opacity") === "1",
      "served video-control group must not lower child contrast with shared opacity",
    );
    assert.match(
      controlsCss,
      /width:\s*min\(236px,/,
      "served video controls should use the reduced bottom-right footprint",
    );
    assert.match(controlsCss, /grid-template-columns:\s*44px minmax\(0, 1fr\) 44px;/);
    assert.match(controlsCss, /gap:\s*4px;/);

    const buttonCss = cssRuleBody(css, ".homepage-film-control-button");
    assert.match(buttonCss, /width:\s*44px;/);
    assert.match(buttonCss, /min-width:\s*44px;/);
    assert.match(buttonCss, /height:\s*44px;/);
    assert.match(buttonCss, /min-height:\s*44px;/);
    assert.match(buttonCss, /background:\s*transparent;/);
    const buttonSurfaceCss = cssRuleBody(css, ".homepage-film-control-button::before");
    assert.match(buttonSurfaceCss, /width:\s*36px;/);
    assert.match(buttonSurfaceCss, /height:\s*36px;/);
    assert.match(buttonSurfaceCss, /background:\s*var\(--homepage-film-control-surface\);/);
    assert.match(buttonSurfaceCss, /border:\s*1px solid var\(--homepage-film-control-border\);/);
    const iconCss = cssRuleBody(css, ".homepage-film-control-button svg");
    assert.match(iconCss, /width:\s*16px;/);
    assert.match(iconCss, /height:\s*16px;/);
    const scrubberCss = cssRuleBody(css, ".homepage-film-scrubber");
    assert.match(scrubberCss, /height:\s*44px;/);
    assert.match(scrubberCss, /padding:\s*0 8px;/);
    assert.equal(cssDeclarationValue(scrubberCss, "background"), "transparent");
    assert.match(scrubberCss, /-webkit-backdrop-filter:\s*none;/);
    assert.match(scrubberCss, /backdrop-filter:\s*none;/);
    const webkitTrackCss = cssRuleBody(
      css,
      ".homepage-film-scrubber::-webkit-slider-runnable-track",
    );
    assert.match(webkitTrackCss, /height:\s*4px;/);
    assert.match(webkitTrackCss, /box-shadow:\s*0 0 0 1px/);
    const webkitThumbCss = cssRuleBody(
      css,
      ".homepage-film-scrubber::-webkit-slider-thumb",
    );
    assert.match(webkitThumbCss, /width:\s*(?:14|15)px;/);
    assert.match(webkitThumbCss, /height:\s*(?:14|15)px;/);
    const mozThumbCss = cssRuleBody(css, ".homepage-film-scrubber::-moz-range-thumb");
    assert.match(mozThumbCss, /width:\s*(?:14|15)px;/);
    assert.match(mozThumbCss, /height:\s*(?:14|15)px;/);
    assert.match(
      css,
      /@media \(max-width: 560px\)\s*\{[\s\S]*?\.homepage-film-controls\s*\{[\s\S]*?width:\s*min\(236px,\s*calc\(100% - 24px\)\);[\s\S]*?gap:\s*4px;/,
      "served mobile controls should preserve the reduced width without shrinking hit targets",
    );

    const sectionCss = cssRuleBody(css, ".homepage-film-section");
    const shellCss = cssRuleBody(css, ".homepage-film-shell");
    const frameCss = cssRuleBody(css, ".homepage-film-frame");
    for (const token of [
      "--homepage-film-control-ink",
      "--homepage-film-control-surface",
      "--homepage-film-control-surface-solid",
      "--homepage-film-control-border",
    ]) {
      assert.match(css, new RegExp(`:root\\s*\\{[^}]*${token}:`, "s"));
      assert.match(
        css,
        new RegExp(`@media \\(prefers-color-scheme: dark\\)\\s*\\{\\s*:root\\s*\\{[^}]*${token}:`, "s"),
      );
    }
    assert.doesNotMatch(
      css,
      /\.homepage-film-scroll-cue|homepage-film-scroll-cue-bob/,
    );
    for (const property of ["padding", "border", "background", "box-shadow"]) {
      const value = cssDeclarationValue(frameCss, property);
      assert.ok(
        value === undefined || /^(?:0|none|transparent)$/i.test(value),
        `served homepage film wrapper must not render decorative ${property} chrome`,
      );
    }
    assert.doesNotMatch(
      css,
      /\.homepage-film-frame::(?:before|after)\s*\{/,
      "served film wrapper should not recreate a frame with pseudo-elements",
    );
    assert.match(frameCss, /overflow:\s*hidden;/);
    assert.doesNotMatch(sectionCss, /(?:radial|linear)-gradient\(/i);
    assert.equal(
      Number.parseFloat(cssDeclarationValue(shellCss, "max-width") ?? "0"),
      1440,
      "served live stage should grow to but not upscale beyond the 1440px source width",
    );
    assert.match(
      css,
      /@media \(min-width: 821px\) and \(min-height: 600px\)\s*\{\s*\.homepage-film-shell\s*\{[^}]*max-width:\s*min\(1440px,\s*108vh\);[^}]*max-width:\s*min\(1440px,\s*108svh\);[^}]*\}/,
      "served wide-view layout should cap the film by height and preserve a visible continuation below",
    );
    const videoCss = cssRuleBody(css, ".homepage-film-source-media");
    assert.match(videoCss, /display:\s*block;/);
    assert.match(videoCss, /width:\s*100%;/);
    assert.match(videoCss, /height:\s*auto;/);
    assert.match(videoCss, /aspect-ratio:\s*16\s*\/\s*10;/);
    assert.match(videoCss, /object-fit:\s*cover;/);
    assert.match(videoCss, /border-radius:\s*0;/);
    assert.match(videoCss, /background:\s*var\(--bg\);/);
    assert.match(videoCss, /transform:\s*scaleX\(1\.004\);/);
    assert.match(videoCss, /transform-origin:\s*center;/);
    assert.doesNotMatch(
      css,
      /\.homepage-film-(?:stage|live|live-scale)\b|\.homepage-film-source-media--soundtrack\b/,
      "served CSS should contain only the native video renderer",
    );
    const screenReaderOnlyCss = cssRuleBody(css, ".sr-only");
    assert.match(screenReaderOnlyCss, /position:\s*absolute;/);
    assert.match(screenReaderOnlyCss, /clip-path:\s*inset\(50%\);/);
    assert.doesNotMatch(screenReaderOnlyCss, /display:\s*none|visibility:\s*hidden/);
  });

  await assertStaticGetAndHead(
    url,
    "/assets/component-specimens.css",
    "text/css; charset=utf-8",
    (body) => {
      const css = body.toString("utf8");
      assert.match(css, /\.jk-action-button\s*\{/);
      assert.match(css, /\.jk-toggle__control\s*\{/);
    },
  );
  await assertStaticGetAndHead(
    url,
    "/assets/component-specimens.js",
    "application/javascript; charset=utf-8",
    (body) => {
      assert.match(body.toString("utf8"), /componentSpecimenMounted/);
    },
  );

  await assertStaticGetAndHead(url, "/", "text/html; charset=utf-8", (body) => {
    const html = body.toString("utf8");
    const main = html.match(/<main>([\s\S]*)<\/main>/)?.[1] ?? "";
    assert.equal((main.match(/<video\b/gi) ?? []).length, 0);
    assert.doesNotMatch(
      main,
      /homepage-film|data-homepage-film|judgmentkit-select-field-agent-demo/,
      "served homepage should not include the retired film or its behavior",
    );
    assert.match(main, /^\s*<section class="hero homepage-hero">/);
    assert.match(main, /<section class="section homepage-category"/);
    assert.match(main, /A design system can make the wrong interface consistent\./);
    assert.equal(html.includes("/releases/visual-composition/"), false);
  });

  {
    const response = await fetchRoute(url, "/releases/visual-composition/");

    assert.equal(response.status, 404, "separate visual-composition route should not ship");
  }

  {
    const response = await fetchRoute(url, "/releases/visual-composition/demo/");

    assert.equal(response.status, 404, "retired interactive demo route should not ship");
  }

  await assertStaticGetAndHead(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo.mp4",
    "video/mp4",
    (body) => {
      assert.equal(body.subarray(4, 8).toString("ascii"), "ftyp");
    },
  );

  await assertStaticGetAndHead(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo-dark.mp4",
    "video/mp4",
    (body) => {
      assert.equal(body.subarray(4, 8).toString("ascii"), "ftyp");
    },
  );

  await assertStaticByteRanges(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo.mp4",
  );
  await assertStaticByteRanges(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo-dark.mp4",
  );

  await assertStaticGetAndHead(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo-poster.png",
    "image/png",
    (body) => {
      assert.equal(body.subarray(1, 4).toString("ascii"), "PNG");
    },
  );

  await assertStaticGetAndHead(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo-poster-dark.png",
    "image/png",
    (body) => {
      assert.equal(body.subarray(1, 4).toString("ascii"), "PNG");
    },
  );
  await assertStaticByteRanges(
    url,
    "/assets/releases/judgmentkit-select-field-agent-demo-poster-dark.png",
  );

  for (const method of ["GET", "HEAD"]) {
    const response = await fetchRoute(
      url,
      "/assets/releases/judgmentkit-select-field-agent-demo.vtt",
      { method },
    );
    assert.equal(
      response.status,
      404,
      `disabled caption asset ${method} should not be publicly served`,
    );
  }

  {
    const response = await fetchRoute(
      url,
      "/examples/model-ui/refund-system-map/manifest.json",
    );
    const manifest = await response.json();
    const sourceManifest = readJson("examples/model-ui/refund-system-map/manifest.json");
    const sourceDiagnosticCandidatesById = new Map(
      (sourceManifest.diagnostic_candidates ?? []).map((candidate) => [candidate.id, candidate]),
    );
    const diagnosticIds = new Set([
      ...manifest.diagnostic_candidates.map((candidate) => candidate.id),
      ...manifest.comparison_rows
        .flatMap((row) => row.cells)
        .filter((cell) => cell.release_evidence_status === "diagnostic_only")
        .map((cell) => cell.diagnostic_candidate_id),
    ]);

    assert.equal(response.status, 200, "model UI manifest should return 200");
    assert.equal(
      manifest.diagnostic_candidates.length,
      sourceManifest.diagnostic_candidates.length,
    );
    assert.equal(diagnosticIds.size, sourceManifest.diagnostic_candidates.length);

    for (const id of [...diagnosticIds].sort()) {
      const sourceCandidate = sourceDiagnosticCandidatesById.get(id) ?? {};
      for (const privatePath of [
        sourceCandidate.artifact_path ?? `artifacts/${id}.html`,
        sourceCandidate.screenshot_path ?? `screenshots/${id}.png`,
        sourceCandidate.capture_file ?? `captures/${id}.json`,
      ].filter(Boolean)) {
        await assertRouteNotPublic(
          url,
          `/examples/model-ui/refund-system-map/${privatePath}`,
          `${id} diagnostic ${privatePath}`,
          { bytes: privatePath.endsWith(".png") },
        );
      }
    }
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
    "/design-system/component-inventory.json",
    "/design-system/component-contracts.json",
    "/design-system/component-registry.json",
    "/design-system/pattern-contracts.json",
    "/design-system/surface-presentation-profiles.json",
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

  {
    const verification = await verifyDesignSystemSurfaceProfiles(url);

    assert.deepEqual(verification.checked, [
      "/design-system/manifest.json",
      "/design-system/surface-presentation-profiles.json",
    ]);
    assert.deepEqual(verification.profiles, {
      "judgmentkit.workbench.operational-v1": "supported",
      "judgmentkit.artifact-inspector.v1": "proposed",
    });
    assert.equal(
      verification.profile_id,
      "judgmentkit.workbench.operational-v1",
    );
    assert.equal(verification.profile_status, "supported");
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

  for (const route of PUBLIC_MCP_ROUTES) {
    await assertPublicMcpMetadata(url, route);
    await assertPublicMcpOptions(url, route);
    await assertPublicMcpAppGuards(url, route);
  }

  {
    const route = "/api/mcp";
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
    const mcpFunction = vercelConfig.functions?.["api/mcp.js"];

    assert.ok(
      mcpRewrites.some((rewrite) => rewrite.source === "/mcp"),
      "vercel.json should route /mcp to /api/mcp",
    );
    assert.ok(
      mcpRewrites.some((rewrite) => rewrite.source === "/mcp/"),
      "vercel.json should route /mcp/ to /api/mcp",
    );
    assert.equal(
      mcpFunctionConfig.architecture,
      "x86_64",
      "The hosted browser function must match the x86_64 Chromium binary shipped by @sparticuz/chromium.",
    );
    assert.equal(mcpFunction?.maxDuration, 30);
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

  {
    const fixture = await listenFixtureServer((req, res) => {
      if (req.url === "/gone") {
        res.statusCode = 410;
        res.end("gone");
        return;
      }

      if (req.url === "/ok") {
        res.statusCode = 200;
        res.end("ok");
        return;
      }

      if (req.url === "/redirect") {
        res.writeHead(302, { location: "/ok" });
        res.end("redirect");
        return;
      }

      if (req.url === "/error") {
        res.statusCode = 500;
        res.end("error");
        return;
      }

      res.statusCode = 404;
      res.end("missing");
    });

    try {
      await assertRouteNotPublic(fixture.url, "/missing", "missing fixture route");
      await assertRouteNotPublic(fixture.url, "/gone", "gone fixture route");
      await assert.rejects(
        () => assertRouteNotPublic(fixture.url, "/ok", "ok fixture route"),
        /ok fixture route should not be public at \/ok; expected 404\/410, got 200; Location: \(none\)/,
      );
      await assert.rejects(
        () => assertRouteNotPublic(fixture.url, "/redirect", "redirect fixture route"),
        /redirect fixture route should not be public at \/redirect; expected 404\/410, got 302; Location: \/ok/,
      );
      await assert.rejects(
        () => assertRouteNotPublic(fixture.url, "/error", "error fixture route"),
        /error fixture route should not be public at \/error; expected 404\/410, got 500; Location: \(none\)/,
      );
    } finally {
      await closeServer(fixture.server);
    }
  }

  for (const route of PUBLIC_MCP_ROUTES) {
    const endpoint = new URL(route, url).toString();
    await postRawInitialize(endpoint);
    await runMcpClient(endpoint);
  }

  const metadataOnlyProbe = await probeRemoteMcpEndpoint(url, false);

  assert.equal(metadataOnlyProbe.skipped, true);
  assert.equal(metadataOnlyProbe.reason, "metadata_only");
  assert.deepEqual(metadataOnlyProbe.routes, PUBLIC_MCP_ROUTES);
} finally {
  await closeServer(server);
}

console.log("Local site server checks passed.");
