import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../site/build-site.mjs";

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
assert.ok(homepage.includes("Raw brief"));
assert.ok(homepage.includes("Judgment"));
assert.ok(homepage.includes("Handoff"));
assert.ok(homepage.includes("ready for generation"));

for (const forbidden of OLD_FRAMING) {
  assert.equal(
    homepage.includes(forbidden),
    false,
    `homepage must not use old relaunch framing: ${forbidden}`,
  );
}

const docs = fs.readFileSync(path.join(tempDir, "docs", "index.html"), "utf8");
assert.ok(docs.includes("judgmentkit review --input examples/refund-triage.brief.txt"));
assert.ok(docs.includes("create_activity_model_review"));
assert.ok(docs.includes("review_ui_workflow_candidate"));
assert.ok(docs.includes("create_ui_generation_handoff"));
assert.ok(docs.includes("operator-review-ui"));
assert.equal(docs.includes("judgmentkit2"), false);

const examples = fs.readFileSync(path.join(tempDir, "examples", "index.html"), "utf8");
assert.ok(examples.includes("Deterministic artifacts"));
assert.ok(examples.includes("JudgmentKit-guided handoff"));

const install = fs.readFileSync(path.join(tempDir, "install"), "utf8");
assert.ok(install.startsWith("#!/usr/bin/env bash"));
assert.ok(install.includes("https://github.com/mikeylong/judgmentkit.git"));
assert.ok(install.includes("node ./scripts/install-mcp.mjs --client codex"));
assert.equal(install.includes("--client claude"), false);
assert.equal(install.includes("--client cursor"), false);

const mcp = JSON.parse(fs.readFileSync(path.join(tempDir, "mcp"), "utf8"));
assert.equal(mcp.name, "JudgmentKit");
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
