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
      "npm run mcp:smoke",
      "node bin/judgmentkit.mjs review --input examples/refund-triage.brief.txt",
      "https://judgmentkit.ai/mcp",
      "hosted Streamable HTTP endpoint",
      "installed local stdio server",
      "create_activity_model_review",
      "review_ui_workflow_candidate",
      "create_ui_generation_handoff",
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
      "Dinner playlist comparison",
      "/examples/comparison/refund/version-a.html",
      "/examples/comparison/refund/version-b.html",
      "/examples/comparison/music/version-a.html",
      "/examples/comparison/music/version-b.html",
      "/examples/comparison/music/facilitator-scorecard.md",
    ],
    "examples",
  );
  assertExcludes(examples.text, ["raw_brief_baseline", "judgmentkit_handoff"], "examples");

  await fetchText(baseUrl, "/favicon.svg");

  for (const artifactRoute of [
    "/examples/one-shot-demo.html",
    "/examples/comparison/refund/version-a.html",
    "/examples/comparison/refund/version-b.html",
    "/examples/comparison/music/version-a.html",
    "/examples/comparison/music/version-b.html",
  ]) {
    const artifact = await fetchText(baseUrl, artifactRoute);
    assert.equal(getAnalyticsScriptSrc(artifact.text, artifactRoute), analyticsScriptSrc);
  }

  await fetchText(baseUrl, "/examples/comparison/music/facilitator-scorecard.md");

  const install = await fetchText(baseUrl, "/install");
  assert.ok(install.text.startsWith("#!/usr/bin/env bash"), "install route should return a shell script");
  assertIncludes(
    install.text,
    [
      "https://github.com/mikeylong/judgmentkit.git",
      "npm install",
      "node ./scripts/install-mcp.mjs --client codex",
    ],
    "install script",
  );
  assertExcludes(install.text, ["--client claude", "--client cursor"], "install script");

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
      "/examples/comparison/music/version-a.html",
      "/examples/comparison/music/version-b.html",
      "/examples/comparison/music/facilitator-scorecard.md",
    ],
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
  const checkoutPath = path.join(tempDir, "judgmentkit");
  const configPath = path.join(tempDir, "config.toml");
  const { stdout } = await runCommand(
    "bash",
    ["-s", "--", "--path", checkoutPath, "--config-path", configPath],
    {
      input: script,
      timeoutMs: 240_000,
    },
  );
  const result = parseLastJsonObject(stdout);
  const configText = await fs.readFile(configPath, "utf8");

  assert.equal(result.status, "installed");
  assert.equal(result.client, "codex");
  assert.equal(result.repository_url, "https://github.com/mikeylong/judgmentkit.git");
  assert.equal(result.checkout_path, checkoutPath);
  assert.equal(result.config_path, configPath);
  assert.equal(result.verification.verified, true);
  assert.deepEqual(result.verification.tools, JUDGMENTKIT_MCP_TOOL_NAMES);
  assert.ok(configText.includes("[mcp_servers.judgmentkit]"));
  assert.ok(configText.includes('"mcp:stdio"'));
  assert.ok(configText.includes(JSON.stringify(checkoutPath)));

  return {
    temp_dir: tempDir,
    checkout_path: checkoutPath,
    config_path: configPath,
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
