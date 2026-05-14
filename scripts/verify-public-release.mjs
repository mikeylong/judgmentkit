#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { JUDGMENTKIT_MCP_TOOL_NAMES } from "./install-mcp.mjs";

const DEFAULT_BASE_URL = "https://judgmentkit.ai";
const REDIRECT_HOSTS = [
  ["judgmentkit.design", "https://judgmentkit.design/docs/"],
  ["www.judgmentkit.design", "https://www.judgmentkit.design/examples/"],
  ["judgmentkit.com", "https://judgmentkit.com/install"],
  ["www.judgmentkit.com", "https://www.judgmentkit.com/mcp"],
];
const OLD_FRAMING = [
  "resource bundle",
  "workflow bundle",
  "MCP-first product",
  "get_workflow_bundle",
  "list_resources",
  "resolve_related",
  "judgmentkit2",
  "JudgmentKit 2",
  "judgmentkit-2",
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    skipInstall: false,
    skipRedirects: false,
    skipAnalyticsScript: false,
    expectRemoteMcp: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--base-url") {
      options.baseUrl = argv[++index];
    } else if (arg === "--skip-install") {
      options.skipInstall = true;
    } else if (arg === "--skip-redirects") {
      options.skipRedirects = true;
    } else if (arg === "--skip-analytics-script") {
      options.skipAnalyticsScript = true;
    } else if (arg === "--expect-remote-mcp") {
      options.expectRemoteMcp = true;
    } else if (arg === "--expect-metadata-only") {
      options.expectRemoteMcp = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  if (typeof options.baseUrl !== "string" || options.baseUrl.trim().length === 0) {
    throw new Error("--base-url requires a non-empty value.");
  }

  return options;
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/verify-public-release.mjs [--base-url <url>] [--skip-install] [--skip-redirects] [--skip-analytics-script] [--expect-metadata-only]",
      "",
      "By default the verifier expects /mcp to work as a hosted MCP Streamable HTTP endpoint.",
      "",
    ].join("\n"),
  );
}

function urlFor(baseUrl, route) {
  return new URL(route, baseUrl).toString();
}

async function fetchText(baseUrl, route, options = {}) {
  const response = await fetch(urlFor(baseUrl, route), {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
    redirect: options.redirect ?? "follow",
  });
  const text = await response.text();

  if (options.expectStatus !== undefined) {
    assert.equal(response.status, options.expectStatus, `${route} should return ${options.expectStatus}`);
  } else if (options.expectOk !== false) {
    assert.equal(response.ok, true, `${route} should return a 2xx response, got ${response.status}`);
  }

  return { response, text };
}

async function fetchBytes(baseUrl, route, options = {}) {
  const response = await fetch(urlFor(baseUrl, route), {
    method: options.method ?? "GET",
    headers: options.headers,
    redirect: options.redirect ?? "follow",
  });
  const bytes = Buffer.from(await response.arrayBuffer());

  if (options.expectStatus !== undefined) {
    assert.equal(response.status, options.expectStatus, `${route} should return ${options.expectStatus}`);
  } else if (options.expectOk !== false) {
    assert.equal(response.ok, true, `${route} should return a 2xx response, got ${response.status}`);
  }

  return { response, bytes };
}

function assertIncludes(text, needles, label) {
  for (const needle of needles) {
    assert.ok(text.includes(needle), `${label} should include ${needle}`);
  }
}

function assertExcludes(text, needles, label) {
  for (const needle of needles) {
    assert.equal(text.includes(needle), false, `${label} should not include ${needle}`);
  }
}

function getAnalyticsScriptSrc(text, label) {
  assertIncludes(
    text,
    [
      "window.va = window.va || function",
      'data-sdkn="@vercel/analytics"',
      'data-sdkv="2.0.1"',
    ],
    `${label} analytics`,
  );

  for (const [scriptTag] of text.matchAll(/<script\b[^>]*><\/script>/g)) {
    if (!scriptTag.includes('data-sdkn="@vercel/analytics"')) {
      continue;
    }

    const sourceMatch = scriptTag.match(/\bsrc="([^"]+)"/);
    assert.ok(sourceMatch, `${label} Vercel Analytics script should include a src`);
    return sourceMatch[1];
  }

  assert.fail(`${label} should include the Vercel Analytics script`);
}

async function verifyAnalyticsScript(baseUrl, scriptSrc) {
  const response = await fetch(new URL(scriptSrc, baseUrl));

  assert.equal(
    response.ok,
    true,
    `Vercel Analytics script should load from ${scriptSrc}, got ${response.status}. Enable Web Analytics in Vercel before running production verification.`,
  );

  return {
    script_src: scriptSrc,
    status: response.status,
  };
}

async function verifyEvalArchive(baseUrl, analyticsScriptSrc) {
  const index = await fetchText(baseUrl, "/evals/");
  assert.equal(getAnalyticsScriptSrc(index.text, "eval archive"), analyticsScriptSrc);
  assertIncludes(
    index.text,
    [
      "Evaluation evidence",
      "<h1>Evals</h1>",
      "Latest run",
      "Catalog JSON",
    ],
    "eval archive",
  );
  assertExcludes(index.text, ["/examples/evals/"], "eval archive");

  const catalogResponse = await fetchText(baseUrl, "/evals/index.json");
  const catalog = JSON.parse(catalogResponse.text);
  assert.equal(catalog.catalog_id, "judgmentkit-ui-generation-eval-runs");
  assert.ok(catalog.latest, "eval catalog should include latest run");
  assert.ok(Array.isArray(catalog.runs), "eval catalog should include runs");
  assert.ok(catalog.runs.length > 0, "eval catalog should include at least one run");

  const latestHtmlRoute = `/evals/${catalog.latest.html_report}`;
  const latestJsonRoute = `/evals/${catalog.latest.json_report}`;
  const latestHtml = await fetchText(baseUrl, latestHtmlRoute);
  assert.equal(getAnalyticsScriptSrc(latestHtml.text, latestHtmlRoute), analyticsScriptSrc);
  assertIncludes(
    latestHtml.text,
    [
      "JudgmentKit UI-Generation Eval",
      "not a statistically powered benchmark",
      "Claim level",
      "MCP release",
      "Visual evidence",
      "JSON report",
    ],
    "latest eval report",
  );

  const latestJson = JSON.parse((await fetchText(baseUrl, latestJsonRoute)).text);
  assert.equal(latestJson.eval_id, "judgmentkit-ui-generation-paired-artifact-v1");
  assert.equal(latestJson.run.html_report, catalog.latest.html_report);
  assert.equal(latestJson.run.json_report, catalog.latest.json_report);
  assert.equal(latestJson.visual_evidence.capture_engine, "chrome_devtools_protocol");
  const latestScreenshotPath = latestJson.results[0].variants[0].screenshots[0].path;
  assert.ok(latestScreenshotPath.endsWith(".png"), "latest eval JSON should include screenshot paths");
  const latestScreenshotRoute = `/evals/${latestScreenshotPath}`;
  await fetchText(baseUrl, latestScreenshotRoute);

  await fetchText(baseUrl, "/examples/evals/");
  await fetchText(baseUrl, "/examples/evals/index.json");
  await fetchText(baseUrl, `/examples/evals/${catalog.latest.html_report}`);
  await fetchText(baseUrl, `/examples/evals/${catalog.latest.json_report}`);
  await fetchText(baseUrl, `/examples/evals/${latestScreenshotPath}`);

  return {
    index_route: "/evals/",
    catalog_route: "/evals/index.json",
    latest_html_route: latestHtmlRoute,
    latest_json_route: latestJsonRoute,
    latest_screenshot_route: latestScreenshotRoute,
    compatibility_index_route: "/examples/evals/",
  };
}

async function verifyPublicRoutes(baseUrl, options = {}) {
  const home = await fetchText(baseUrl, "/");
  const analyticsScriptSrc = getAnalyticsScriptSrc(home.text, "homepage");
  assertIncludes(
    home.text,
    [
      "Judgment before generation.",
      "JudgmentKit stops implementation mechanics from becoming UX",
      '<link rel="canonical" href="https://judgmentkit.ai/">',
      '<link rel="icon" href="/favicon.svg"',
      '<meta property="og:site_name" content="JudgmentKit">',
    ],
    "homepage",
  );
  assertExcludes(home.text, OLD_FRAMING, "homepage");

  const docs = await fetchText(baseUrl, "/docs/");
  assert.equal(getAnalyticsScriptSrc(docs.text, "docs"), analyticsScriptSrc);
  assertIncludes(
    docs.text,
    [
      "curl -fsSL https://judgmentkit.ai/install | bash",
      "bash -s -- --client claude",
      "bash -s -- --client cursor",
      "https://judgmentkit.ai/mcp",
      "hosted Streamable HTTP endpoint",
      "create_activity_model_review",
      "recommend_surface_types",
      "review_ui_workflow_candidate",
      "create_ui_generation_handoff",
      "create_ui_implementation_contract",
      "review_ui_implementation_candidate",
      "create_frontend_generation_context",
      "operator-review-ui",
    ],
    "docs",
  );

  const examples = await fetchText(baseUrl, "/examples/");
  assert.equal(getAnalyticsScriptSrc(examples.text, "examples"), analyticsScriptSrc);
  assertIncludes(
    examples.text,
    [
      "Refund triage comparison",
      "Model UI generation matrix",
      "Gemma 4 (local LLM)",
      "GPT-5.5",
      "Dinner playlist comparison",
      "/examples/comparison/refund/version-a.html",
      "/examples/comparison/refund/version-b.html",
      "/examples/model-ui/refund-system-map/index.html",
      "/examples/model-ui/refund-system-map/manifest.json",
      "/examples/comparison/music/version-a.html",
      "/examples/comparison/music/version-b.html",
      "/examples/comparison/music/facilitator-scorecard.md",
    ],
    "examples",
  );
  assertExcludes(
    examples.text,
    ["raw_brief_baseline", "judgmentkit_handoff", "UI generation eval report", "/examples/evals/"],
    "examples",
  );

  const evalArchive = await verifyEvalArchive(baseUrl, analyticsScriptSrc);

  await fetchText(baseUrl, "/favicon.svg");

  for (const artifactRoute of [
    "/examples/one-shot-demo.html",
    "/examples/comparison/refund/version-a.html",
    "/examples/comparison/refund/version-b.html",
    "/examples/model-ui/refund-system-map/index.html",
    "/examples/model-ui/refund-system-map/artifacts/deterministic-no-judgmentkit.html",
    "/examples/model-ui/refund-system-map/artifacts/deterministic-with-judgmentkit.html",
    "/examples/model-ui/refund-system-map/artifacts/deterministic-material-ui-only.html",
    "/examples/model-ui/refund-system-map/artifacts/deterministic-judgmentkit-material-ui.html",
    "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-no-judgmentkit.html",
    "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-with-judgmentkit.html",
    "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-material-ui-only.html",
    "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-judgmentkit-material-ui.html",
    "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-no-judgmentkit.html",
    "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-with-judgmentkit.html",
    "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-material-ui-only.html",
    "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-judgmentkit-material-ui.html",
    "/examples/model-ui/refund-system-map/artifacts/deterministic-without-design-system.html",
    "/examples/model-ui/refund-system-map/artifacts/deterministic-with-design-system.html",
    "/examples/model-ui/refund-system-map/artifacts/gemma4-without-design-system.html",
    "/examples/model-ui/refund-system-map/artifacts/gemma4-with-design-system.html",
    "/examples/model-ui/refund-system-map/artifacts/gpt55-without-design-system.html",
    "/examples/model-ui/refund-system-map/artifacts/gpt55-with-design-system.html",
    "/examples/comparison/music/version-a.html",
    "/examples/comparison/music/version-b.html",
  ]) {
    const artifact = await fetchText(baseUrl, artifactRoute);
    assert.equal(getAnalyticsScriptSrc(artifact.text, artifactRoute), analyticsScriptSrc);
  }

  await fetchText(baseUrl, "/examples/comparison/music/facilitator-scorecard.md");
  const modelUiManifestResponse = await fetchText(
    baseUrl,
    "/examples/model-ui/refund-system-map/manifest.json",
  );
  const modelUiManifest = JSON.parse(modelUiManifestResponse.text);
  assert.equal(modelUiManifest.design_system_name, "Material UI");
  assert.equal(modelUiManifest.design_system_package, "@mui/material");
  assert.equal(modelUiManifest.design_system_render_mode, "static-ssr");
  assert.ok(
    modelUiManifest.generation_policy.includes("Material UI"),
    "model UI manifest should describe the Material UI adapter",
  );
  assert.equal(
    modelUiManifest.comparison_rows?.length,
    3,
    "model UI manifest should expose three comparison rows",
  );
  assert.equal(
    modelUiManifest.comparison_columns?.length,
    4,
    "model UI manifest should expose four comparison columns",
  );
  assert.equal(
    modelUiManifest.artifacts?.length,
    12,
    "model UI manifest should expose twelve canonical artifacts",
  );
  const modelUiCaptureRoutes = [];
  const modelUiScreenshotRoutes = [];

  for (const artifact of modelUiManifest.artifacts) {
    assert.ok(artifact.screenshot_path, `${artifact.id} should include a screenshot_path`);
    assert.ok(artifact.approach_title, `${artifact.id} should include an approach_title`);
    assert.ok(artifact.approach_caption, `${artifact.id} should include an approach_caption`);
    assert.ok(artifact.row_id, `${artifact.id} should include row_id`);
    assert.ok(artifact.column_id, `${artifact.id} should include column_id`);
    assert.ok(artifact.context_included, `${artifact.id} should include context_included`);
    assert.ok(artifact.render_source, `${artifact.id} should include render_source`);
    if (artifact.judgmentkit_mode === "no_judgmentkit") {
      assert.equal(
        artifact.context_included.reviewed_handoff,
        false,
        `${artifact.id} should not include reviewed handoff context`,
      );
    }
    if (artifact.design_system_mode === "material_ui") {
      assert.equal(artifact.design_system_name, "Material UI");
      assert.equal(artifact.design_system_package, "@mui/material");
      assert.equal(
        artifact.context_included.material_ui_adapter,
        true,
        `${artifact.id} should include Material UI context`,
      );
    }
    if (artifact.row_id === "gpt55-xhigh-codex") {
      assert.equal(artifact.reasoning_effort, "xhigh", `${artifact.id} should record xhigh`);
    }

    const screenshotRoute = `/examples/model-ui/refund-system-map/${artifact.screenshot_path}`;
    const screenshotResponse = await fetchBytes(baseUrl, screenshotRoute);
    assert.equal(
      screenshotResponse.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
      true,
      `${artifact.id} screenshot should be a PNG`,
    );
    modelUiScreenshotRoutes.push(screenshotRoute);

    if (artifact.generation_source !== "captured_model_output") {
      continue;
    }

    assert.equal(
      artifact.capture_provenance.status,
      "captured",
      `${artifact.id} should be backed by a committed model capture transcript`,
    );
    assert.ok(artifact.capture_file, `${artifact.id} should include a capture_file`);
    const captureRoute = `/examples/model-ui/refund-system-map/${artifact.capture_file}`;
    const captureResponse = await fetchText(baseUrl, captureRoute);
    const capture = JSON.parse(captureResponse.text);

    assert.equal(capture.artifact_id, artifact.id);
    assert.equal(capture.model_label, artifact.model_label);
    assert.equal(capture.row_id, artifact.row_id);
    assert.equal(capture.column_id, artifact.column_id);
    assert.equal(capture.judgmentkit_mode, artifact.judgmentkit_mode);
    assert.equal(capture.design_system_mode, artifact.design_system_mode);
    assert.deepEqual(capture.context_included, artifact.context_included);
    assert.equal(capture.source_context_sha256, artifact.capture_provenance.source_context_sha256);
    assert.ok(capture.prompt_sha256, `${artifact.id} capture should include prompt_sha256`);
    assert.ok(capture.raw_response_sha256, `${artifact.id} capture should include raw_response_sha256`);
    if (artifact.row_id === "gpt55-xhigh-codex") {
      assert.equal(capture.reasoning_effort, "xhigh", `${artifact.id} capture should record xhigh`);
    }
    if (artifact.design_system_mode === "material_ui") {
      assert.equal(capture.design_system_name, "Material UI");
      assert.equal(capture.design_system_package, "@mui/material");
      assert.equal(capture.design_system_render_mode, "static-ssr");
      assert.equal(capture.render_mode, "material_ui");
      assert.ok(capture.parsed?.surface, `${artifact.id} capture should include surface data`);
    } else {
      assert.equal(capture.render_mode, "html");
      assert.ok(
        capture.parsed?.html?.includes("data-primary-surface"),
        `${artifact.id} capture should include parsed primary surface HTML`,
      );
    }
    assert.ok(capture.raw_response, `${artifact.id} capture should include raw_response`);

    modelUiCaptureRoutes.push(captureRoute);
  }

  for (const alias of modelUiManifest.legacy_aliases ?? []) {
    await fetchText(baseUrl, `/examples/model-ui/refund-system-map/${alias.artifact_path}`);
    const screenshotResponse = await fetchBytes(
      baseUrl,
      `/examples/model-ui/refund-system-map/${alias.screenshot_path}`,
    );
    assert.equal(
      screenshotResponse.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
      true,
      `${alias.id} legacy screenshot should be a PNG`,
    );
  }

  await fetchText(baseUrl, "/examples/model-ui/refund-system-map/reviewed-handoff.fixture.json");
  await fetchText(baseUrl, "/examples/model-ui/refund-system-map/design-system-adapter.json");

  const install = await fetchText(baseUrl, "/install");
  assert.ok(install.text.startsWith("#!/usr/bin/env bash"), "install route should return a shell script");
  assertIncludes(
    install.text,
    [
      "node --input-type=module -",
      "DEFAULT_MCP_URL",
      "--client codex|claude|cursor",
      "createCursorConfigBlock",
      "createClaudeInstallCommand",
    ],
    "install script",
  );
  assertExcludes(install.text, ["git clone", "npm install", "mcp:stdio"], "install script");

  return {
    checked: [
      "/",
      "/docs/",
      "/examples/",
      "/favicon.svg",
      "/install",
      "/examples/one-shot-demo.html",
      "/examples/comparison/refund/version-a.html",
      "/examples/comparison/refund/version-b.html",
      "/examples/model-ui/refund-system-map/index.html",
      "/examples/model-ui/refund-system-map/manifest.json",
      "/examples/model-ui/refund-system-map/reviewed-handoff.fixture.json",
      "/examples/model-ui/refund-system-map/design-system-adapter.json",
      "/examples/model-ui/refund-system-map/artifacts/deterministic-no-judgmentkit.html",
      "/examples/model-ui/refund-system-map/artifacts/deterministic-with-judgmentkit.html",
      "/examples/model-ui/refund-system-map/artifacts/deterministic-material-ui-only.html",
      "/examples/model-ui/refund-system-map/artifacts/deterministic-judgmentkit-material-ui.html",
      "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-no-judgmentkit.html",
      "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-with-judgmentkit.html",
      "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-material-ui-only.html",
      "/examples/model-ui/refund-system-map/artifacts/gemma4-lms-judgmentkit-material-ui.html",
      "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-no-judgmentkit.html",
      "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-with-judgmentkit.html",
      "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-material-ui-only.html",
      "/examples/model-ui/refund-system-map/artifacts/gpt55-xhigh-codex-judgmentkit-material-ui.html",
      "/examples/model-ui/refund-system-map/artifacts/deterministic-without-design-system.html",
      "/examples/model-ui/refund-system-map/artifacts/deterministic-with-design-system.html",
      "/examples/model-ui/refund-system-map/artifacts/gemma4-without-design-system.html",
      "/examples/model-ui/refund-system-map/artifacts/gemma4-with-design-system.html",
      "/examples/model-ui/refund-system-map/artifacts/gpt55-without-design-system.html",
      "/examples/model-ui/refund-system-map/artifacts/gpt55-with-design-system.html",
      ...modelUiCaptureRoutes,
      ...modelUiScreenshotRoutes,
      "/examples/comparison/music/version-a.html",
      "/examples/comparison/music/version-b.html",
      "/examples/comparison/music/facilitator-scorecard.md",
      evalArchive.index_route,
      evalArchive.catalog_route,
      evalArchive.latest_html_route,
      evalArchive.latest_json_route,
      evalArchive.latest_screenshot_route,
    ],
    eval_archive: evalArchive,
    analytics: options.skipAnalyticsScript
      ? "script_fetch_skipped"
      : await verifyAnalyticsScript(baseUrl, analyticsScriptSrc),
  };
}

async function verifyMcpMetadata(baseUrl) {
  const { text } = await fetchText(baseUrl, "/mcp");
  const metadata = JSON.parse(text);
  const toolNames = metadata.capabilities.tools.map((tool) => tool.name);

  assert.equal(metadata.name, "JudgmentKit");
  assert.equal(metadata.version, "0.1.0");
  assert.equal(metadata.transport, "streamable-http");
  assert.equal(metadata.public_route.role, "mcp_endpoint_and_metadata");
  assert.equal(metadata.public_route.hosted_mcp_endpoint, true);
  assert.deepEqual(toolNames, JUDGMENTKIT_MCP_TOOL_NAMES);
  assert.deepEqual(metadata.capabilities.prompts, []);

  for (const oldToolName of [
    "list_resources",
    "get_resource",
    "get_workflow_bundle",
    "get_page_markdown",
    "get_example",
    "resolve_related",
  ]) {
    assert.equal(toolNames.includes(oldToolName), false, `/mcp must not expose ${oldToolName}`);
  }

  return {
    name: metadata.name,
    transport: metadata.transport,
    hosted_mcp_endpoint: metadata.public_route.hosted_mcp_endpoint,
    tools: toolNames,
  };
}

async function verifyRedirects() {
  const results = [];

  for (const [host, url] of REDIRECT_HOSTS) {
    const response = await fetch(url, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";

    assert.ok(
      [301, 302, 307, 308].includes(response.status),
      `${host} should redirect, got ${response.status}`,
    );
    assert.ok(
      location.startsWith("https://judgmentkit.ai"),
      `${host} should redirect to judgmentkit.ai, got ${location}`,
    );

    results.push({ host, status: response.status, location });
  }

  return results;
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

async function probeRemoteMcpEndpoint(baseUrl, expectRemoteMcp) {
  const endpointUrl = urlFor(baseUrl, "/mcp");
  const initializeBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: "judgmentkit-public-release-verifier",
        version: "1.0.0",
      },
    },
  });
  const postResponse = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: initializeBody,
  });

  let transport;
  let client;
  let supported = false;
  let tools = [];
  let reviewStatus;
  let errorMessage = "";

  try {
    transport = new StreamableHTTPClientTransport(new URL(endpointUrl));
    client = new Client({
      name: "judgmentkit-public-url-probe",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), 8_000, "public MCP connect");
    const toolsResponse = await withTimeout(client.listTools(), 8_000, "public MCP tools/list");
    tools = toolsResponse.tools.map((tool) => tool.name);
    const reviewResponse = await withTimeout(
      client.callTool({
        name: "create_activity_model_review",
        arguments: {
          brief:
            "A support lead is reviewing refund requests during the daily triage workflow. The activity is deciding whether a case should be approved, sent to policy review, or returned to the agent for missing evidence. The outcome is a clear handoff with the next action and the reason for the decision.",
        },
      }),
      8_000,
      "public MCP tool call",
    );
    reviewStatus = reviewResponse.structuredContent?.review_status;
    supported = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    if (client) {
      await withTimeout(client.close(), 1_000, "public MCP client close").catch(() => {});
    }
    if (transport) {
      await withTimeout(transport.close(), 1_000, "public MCP close").catch(() => {});
    }
  }

  if (expectRemoteMcp) {
    assert.equal(postResponse.ok, true, `/mcp JSON-RPC POST should succeed, got ${postResponse.status}`);
    assert.equal(supported, true, `Expected ${endpointUrl} to work as a remote MCP endpoint: ${errorMessage}`);
    assert.deepEqual(tools, JUDGMENTKIT_MCP_TOOL_NAMES);
    assert.equal(reviewStatus, "ready_for_review");
  } else {
    assert.equal(
      supported,
      false,
      `${endpointUrl} unexpectedly worked as a hosted MCP endpoint.`,
    );
    assert.ok(postResponse.status >= 400, `/mcp JSON-RPC POST should not succeed, got ${postResponse.status}`);
  }

  return {
    endpoint: endpointUrl,
    expected_remote_mcp: expectRemoteMcp,
    supported,
    post_status: postResponse.status,
    sdk_error: errorMessage,
    review_status: reviewStatus,
    tools,
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${command} ${args.join(" ")} timed out after ${options.timeoutMs}ms.`));
    }, options.timeoutMs ?? 180_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code}.\n${stdout}\n${stderr}`.trim(),
        ),
      );
    });

    child.stdin.end(options.input ?? "");
  });
}

function parseLastJsonObject(output) {
  const starts = [...output.matchAll(/\{/g)].map((match) => match.index).reverse();

  for (const startIndex of starts) {
    try {
      return JSON.parse(output.slice(startIndex));
    } catch {
      // Try the next opening brace; command output may include npm status text first.
    }
  }

  throw new Error("Could not parse installer JSON output.");
}

async function verifyHostedInstall(baseUrl) {
  const { text: script } = await fetchText(baseUrl, "/install");
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-public-install-"));
  const mcpUrl = urlFor(baseUrl, "/mcp");
  const configPath = path.join(tempDir, "config.toml");
  const dryRuns = {};

  for (const client of ["codex", "claude", "cursor"]) {
    const { stdout } = await runCommand(
      "bash",
      ["-s", "--", "--client", client, "--mcp-url", mcpUrl, "--dry-run"],
      {
        input: script,
        timeoutMs: 60_000,
      },
    );
    const dryRun = parseLastJsonObject(stdout);

    assert.equal(dryRun.status, "dry_run");
    assert.equal(dryRun.client, client);
    assert.equal(dryRun.mcp_url, mcpUrl);
    assert.deepEqual(dryRun.tools, JUDGMENTKIT_MCP_TOOL_NAMES);
    dryRuns[client] = dryRun;
  }

  const { stdout } = await runCommand(
    "bash",
    ["-s", "--", "--client", "codex", "--mcp-url", mcpUrl, "--config-path", configPath],
    {
      input: script,
      timeoutMs: 120_000,
    },
  );
  const result = parseLastJsonObject(stdout);
  const configText = await fs.readFile(configPath, "utf8");

  assert.equal(result.status, "installed");
  assert.equal(result.client, "codex");
  assert.equal(result.mcp_url, mcpUrl);
  assert.equal(result.config_path, configPath);
  assert.equal(result.verification.verified, true);
  assert.deepEqual(result.verification.tools, JUDGMENTKIT_MCP_TOOL_NAMES);
  assert.ok(configText.includes("[mcp_servers.judgmentkit]"));
  assert.ok(configText.includes(`url = ${JSON.stringify(mcpUrl)}`));

  return {
    temp_dir: tempDir,
    config_path: configPath,
    dry_runs: Object.fromEntries(
      Object.entries(dryRuns).map(([client, dryRun]) => [
        client,
        {
          status: dryRun.status,
          mcp_url: dryRun.mcp_url,
        },
      ]),
    ),
    verified: result.verification.verified,
    tools: result.verification.tools,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const baseUrl = new URL(options.baseUrl);
  const report = {
    base_url: baseUrl.toString(),
    routes: await verifyPublicRoutes(baseUrl.toString(), {
      skipAnalyticsScript: options.skipAnalyticsScript,
    }),
    mcp_metadata: await verifyMcpMetadata(baseUrl.toString()),
    public_mcp_endpoint_probe: await probeRemoteMcpEndpoint(
      baseUrl.toString(),
      options.expectRemoteMcp,
    ),
    redirects: options.skipRedirects ? "skipped" : await verifyRedirects(),
    hosted_install: options.skipInstall ? "skipped" : await verifyHostedInstall(baseUrl.toString()),
  };

  process.stdout.write(`${JSON.stringify({ ok: true, ...report }, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`Public release verification failed:\n${message}\n`);
  process.exitCode = 1;
});
