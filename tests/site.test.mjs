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

const homepage = fs.readFileSync(path.join(tempDir, "index.html"), "utf8");
assert.ok(homepage.includes("Judgment before generation."));
assert.ok(homepage.includes("implementation mechanics from becoming UX"));
assert.ok(homepage.includes("Use it before accepting AI-generated product work"));
assert.ok(homepage.includes("Raw brief"));
assert.ok(homepage.includes("Judgment"));
assert.ok(homepage.includes("Handoff"));
assert.ok(homepage.includes("ready for generation"));
assert.ok(homepage.includes('rel="canonical" href="https://judgmentkit.ai/"'));
assert.ok(homepage.includes('rel="icon" href="/favicon.svg"'));

for (const forbidden of OLD_FRAMING) {
  assert.equal(
    homepage.includes(forbidden),
    false,
    `homepage must not use old relaunch framing: ${forbidden}`,
  );
}

const docs = fs.readFileSync(path.join(tempDir, "docs", "index.html"), "utf8");
assert.ok(docs.includes("curl -fsSL https://judgmentkit.ai/install | bash"));
assert.ok(docs.includes("node bin/judgmentkit.mjs review --input examples/refund-triage.brief.txt"));
assert.ok(docs.includes("does not require a live model provider"));
assert.ok(docs.includes("https://judgmentkit.ai/mcp"));
assert.ok(docs.includes("hosted Streamable HTTP endpoint"));
assert.ok(docs.includes("installed local stdio server"));
assert.ok(docs.includes("create_activity_model_review"));
assert.ok(docs.includes("review_ui_workflow_candidate"));
assert.ok(docs.includes("create_ui_generation_handoff"));
assert.ok(docs.includes("operator-review-ui"));
assert.equal(docs.includes("judgmentkit2"), false);

const examples = fs.readFileSync(path.join(tempDir, "examples", "index.html"), "utf8");
assert.ok(examples.includes("Deterministic artifacts"));
assert.ok(examples.includes("JudgmentKit-guided handoff"));
assert.ok(examples.includes("Refund triage comparison"));
assert.ok(examples.includes("Dinner playlist comparison"));
assert.ok(examples.includes("/examples/comparison/refund/version-a.html"));
assert.ok(examples.includes("/examples/comparison/refund/version-b.html"));
assert.ok(examples.includes("/examples/comparison/music/version-a.html"));
assert.ok(examples.includes("/examples/comparison/music/version-b.html"));
assert.equal(examples.includes("raw_brief_baseline"), false);
assert.equal(examples.includes("judgmentkit_handoff"), false);

for (const copiedExamplePath of [
  ["examples", "comparison", "refund", "version-a.html"],
  ["examples", "comparison", "refund", "version-b.html"],
  ["examples", "comparison", "music", "version-a.html"],
  ["examples", "comparison", "music", "version-b.html"],
  ["examples", "comparison", "music", "facilitator-scorecard.md"],
]) {
  assert.equal(
    fs.existsSync(path.join(tempDir, ...copiedExamplePath)),
    true,
    `expected copied example artifact ${copiedExamplePath.join("/")}`,
  );
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

console.log("Site checks passed.");
