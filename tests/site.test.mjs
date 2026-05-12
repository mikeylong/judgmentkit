import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../site/build-site.mjs";
import { getHostedMcpMetadata } from "../src/mcp-http.mjs";

const EXPECTED_TOOL_NAMES = [
  "analyze_implementation_brief",
  "create_activity_model_review",
  "recommend_ui_workflow_profiles",
  "review_activity_model_candidate",
  "review_ui_workflow_candidate",
  "create_ui_generation_handoff",
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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-"));
const result = await buildSite(tempDir);

assert.deepEqual(result.routes, ["/", "/docs/", "/examples/", "/install", "/mcp"]);

function assertAnalyticsBootstrap(html, label) {
  assert.ok(html.includes("window.va = window.va || function"), `${label} should initialize Vercel Analytics queue`);
  assert.ok(html.includes('src="/_vercel/insights/script.js"'), `${label} should load Vercel Analytics script`);
  assert.ok(html.includes('data-sdkn="@vercel/analytics"'), `${label} should name the analytics SDK`);
  assert.ok(html.includes('data-sdkv="2.0.1"'), `${label} should include the analytics SDK version`);
}

const homepage = fs.readFileSync(path.join(tempDir, "index.html"), "utf8");
const siteCss = fs.readFileSync(path.join(tempDir, "assets", "site.css"), "utf8");
assert.ok(homepage.includes("Judgment before generation."));
assert.ok(homepage.includes("implementation mechanics from becoming UX"));
assert.ok(homepage.includes("Use it before accepting AI-generated product work"));
assert.ok(homepage.includes("Raw brief"));
assert.ok(homepage.includes('class="prompt-evidence" title="Participant"'));
assert.ok(homepage.includes('class="prompt-evidence" title="Objective and activity"'));
assert.ok(homepage.includes('class="prompt-evidence prompt-evidence-diagnostic" title="Diagnostic implementation detail"'));
assert.ok(homepage.includes('class="prompt-evidence" title="Decision"'));
assert.ok(homepage.includes('class="prompt-evidence" title="Outcome"'));
assert.ok(siteCss.includes("background: rgba(36, 95, 115, 0.07);"));
assert.ok(siteCss.includes("background: rgba(138, 90, 22, 0.08);"));
assert.ok(siteCss.includes("-webkit-box-decoration-break: clone;"));
assert.equal(siteCss.includes("text-decoration-line: underline;"), false);
assert.ok(homepage.includes('aria-label="Prompt evidence color key"'));
assert.ok(homepage.includes("activity evidence"));
assert.ok(homepage.includes("implementation detail"));
assert.ok(homepage.includes("support operations manager"));
assert.ok(homepage.includes("refund escalation cases"));
assert.ok(homepage.includes("JSON schema"));
assert.ok(homepage.includes("approved, sent to policy review, or returned"));
assert.ok(homepage.includes("clear handoff"));
assert.ok(homepage.includes("Judgment"));
assert.ok(homepage.includes("Handoff"));
assert.ok(homepage.includes("ready for generation"));
assert.ok(homepage.includes('aria-label="JudgmentKit generation loop"'));
assert.ok(homepage.includes("Generation loop"));
assert.ok(homepage.includes("Context"));
assert.ok(homepage.includes("Generate"));
assert.ok(homepage.includes("Review"));
assert.ok(homepage.includes("Iterate"));
assert.ok(homepage.includes("stays in the loop across iterations"));
assert.ok(homepage.includes("does not render the final UI"));
assert.ok(homepage.includes('rel="canonical" href="https://judgmentkit.ai/"'));
assert.ok(homepage.includes('rel="icon" href="/favicon.svg"'));
assertAnalyticsBootstrap(homepage, "homepage");

for (const forbidden of OLD_FRAMING) {
  assert.equal(
    homepage.includes(forbidden),
    false,
    `homepage must not use old relaunch framing: ${forbidden}`,
  );
}

const docs = fs.readFileSync(path.join(tempDir, "docs", "index.html"), "utf8");
assertAnalyticsBootstrap(docs, "docs");
assert.ok(docs.includes("curl -fsSL https://judgmentkit.ai/install | bash"));
assert.ok(docs.includes("node bin/judgmentkit.mjs review --input examples/refund-triage.brief.txt"));
assert.ok(docs.includes("does not require a live model provider"));
assert.ok(docs.includes("https://judgmentkit.ai/mcp"));
assert.ok(docs.includes("hosted Streamable HTTP endpoint"));
assert.ok(docs.includes("installed local stdio server"));
assert.ok(docs.includes("Generation Loop"));
assert.ok(docs.includes('aria-label="JudgmentKit generation loop for agents"'));
assert.ok(docs.includes("Use JudgmentKit before generation and across iterations"));
assert.ok(docs.includes("create_activity_model_review"));
assert.ok(docs.includes("review_ui_workflow_candidate"));
assert.ok(docs.includes("create_ui_generation_handoff"));
assert.ok(docs.includes("updated context"));
assert.ok(docs.includes("reviewed handoff and updated context"));
assert.ok(docs.includes("resolve targeted questions or leakage details before generating UI"));
assert.ok(docs.includes("not the final UI renderer"));
assert.ok(docs.includes("operator-review-ui"));
assert.equal(docs.includes("judgmentkit2"), false);

const examples = fs.readFileSync(path.join(tempDir, "examples", "index.html"), "utf8");
assertAnalyticsBootstrap(examples, "examples");
assert.ok(examples.includes("Deterministic artifacts"));
assert.ok(examples.includes("JudgmentKit-guided handoff"));
assert.ok(examples.includes('class="examples-browser" data-examples-browser'));
assert.ok(examples.includes('class="examples-rail" aria-label="Examples list"'));
assert.ok(examples.includes('class="example-menu" data-example-menu'));
assert.ok(examples.includes("<summary>Browse examples</summary>"));
assert.ok(examples.includes('aria-label="Selected example"'));
assert.ok(examples.includes('class="example-frame" data-example-frame src="/examples/one-shot-demo.html"'));
assert.ok(examples.includes('id="examples-data"'));
assert.ok(examples.includes("Refund triage comparison"));
assert.ok(examples.includes("Dinner playlist comparison"));
assert.ok(examples.includes('data-example-id="one-shot-proof"'));
assert.ok(examples.includes('data-example-id="refund-triage"'));
assert.ok(examples.includes('data-example-id="dinner-playlist"'));
assert.ok(examples.includes("/examples/one-shot-demo.html"));
assert.ok(examples.includes("/examples/comparison/refund/version-a.html"));
assert.ok(examples.includes("/examples/comparison/refund/version-b.html"));
assert.ok(examples.includes("/examples/comparison/music/version-a.html"));
assert.ok(examples.includes("/examples/comparison/music/version-b.html"));
assert.ok(examples.includes("/examples/comparison/music/facilitator-scorecard.md"));
assert.equal(examples.includes("raw_brief_baseline"), false);
assert.equal(examples.includes("judgmentkit_handoff"), false);
assert.equal(examples.includes("Gemma"), false);
assert.equal(examples.includes("GPT-5.5"), false);

for (const copiedExamplePath of [
  ["examples", "one-shot-demo.html"],
  ["examples", "comparison", "refund", "version-a.html"],
  ["examples", "comparison", "refund", "version-b.html"],
  ["examples", "comparison", "music", "version-a.html"],
  ["examples", "comparison", "music", "version-b.html"],
  ["examples", "comparison", "music", "facilitator-scorecard.md"],
]) {
  const artifactPath = path.join(tempDir, ...copiedExamplePath);

  assert.equal(
    fs.existsSync(artifactPath),
    true,
    `expected copied example artifact ${copiedExamplePath.join("/")}`,
  );

  if (artifactPath.endsWith(".html")) {
    assertAnalyticsBootstrap(
      fs.readFileSync(artifactPath, "utf8"),
      copiedExamplePath.join("/"),
    );
  }
}

const install = fs.readFileSync(path.join(tempDir, "install"), "utf8");
assert.ok(install.startsWith("#!/usr/bin/env bash"));
assert.ok(install.includes("https://github.com/mikeylong/judgmentkit.git"));
assert.ok(install.includes("node ./scripts/install-mcp.mjs --client codex"));
assert.equal(install.includes("--client claude"), false);
assert.equal(install.includes("--client cursor"), false);
assert.equal(fs.existsSync(path.join(tempDir, "favicon.svg")), true);

const mcp = getHostedMcpMetadata();
assert.equal(mcp.name, "JudgmentKit");
assert.equal(mcp.transport, "streamable-http");
assert.deepEqual(mcp.public_route, {
  role: "mcp_endpoint_and_metadata",
  hosted_mcp_endpoint: true,
  usage:
    "Connect an MCP Streamable HTTP client to this URL. GET without an SSE Accept header returns this metadata.",
});
assert.deepEqual(
  mcp.capabilities.tools.map((tool) => tool.name),
  EXPECTED_TOOL_NAMES,
);

for (const oldToolName of [
  "list_resources",
  "get_resource",
  "get_workflow_bundle",
  "get_page_markdown",
  "get_example",
  "resolve_related",
]) {
  assert.equal(
    mcp.capabilities.tools.some((tool) => tool.name === oldToolName),
    false,
    `site MCP route must not expose old tool ${oldToolName}`,
  );
}

{
  const originalAnalyticsConfig = process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
  const configuredTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-analytics-"));

  process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG = JSON.stringify({
    analytics: {
      scriptSrc: "/custom/insights/script.js",
      eventEndpoint: "/custom/insights/event",
      viewEndpoint: "/custom/insights/view",
      sessionEndpoint: "/custom/insights/session",
    },
  });

  try {
    await buildSite(configuredTempDir);
    const configuredHomepage = fs.readFileSync(
      path.join(configuredTempDir, "index.html"),
      "utf8",
    );

    assert.ok(configuredHomepage.includes('src="/custom/insights/script.js"'));
    assert.ok(configuredHomepage.includes('data-event-endpoint="/custom/insights/event"'));
    assert.ok(configuredHomepage.includes('data-view-endpoint="/custom/insights/view"'));
    assert.ok(configuredHomepage.includes('data-session-endpoint="/custom/insights/session"'));
  } finally {
    if (originalAnalyticsConfig === undefined) {
      delete process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
    } else {
      process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG = originalAnalyticsConfig;
    }
  }
}

console.log("Site checks passed.");
