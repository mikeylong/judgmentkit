import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_REPOSITORY_URL,
  JUDGMENTKIT_MCP_TOOL_NAMES,
  createCodexConfigBlock,
  installJudgmentKitMcp,
  writeCodexConfig,
} from "../scripts/install-mcp.mjs";

const EXPECTED_TOOL_NAMES = [
  "analyze_implementation_brief",
  "create_activity_model_review",
  "recommend_ui_workflow_profiles",
  "review_activity_model_candidate",
  "review_ui_workflow_candidate",
  "create_ui_generation_handoff",
];

const OLD_TOOL_NAMES = [
  "list_resources",
  "get_resource",
  "get_workflow_bundle",
  "get_page_markdown",
  "get_example",
  "resolve_related",
];

{
  assert.equal(DEFAULT_REPOSITORY_URL, "https://github.com/mikeylong/judgmentkit.git");
  assert.deepEqual(JUDGMENTKIT_MCP_TOOL_NAMES, EXPECTED_TOOL_NAMES);

  for (const oldToolName of OLD_TOOL_NAMES) {
    assert.equal(
      JUDGMENTKIT_MCP_TOOL_NAMES.includes(oldToolName),
      false,
      `installer tool list must not include old v1 tool ${oldToolName}`,
    );
  }
}

{
  const block = createCodexConfigBlock("/tmp/judgmentkit checkout");

  assert.ok(block.includes("[mcp_servers.judgmentkit]"));
  assert.ok(block.includes('command = "npm"'));
  assert.ok(block.includes('"--prefix"'));
  assert.ok(block.includes('"/tmp/judgmentkit checkout"'));
  assert.ok(block.includes('"mcp:stdio"'));
  assert.equal(block.includes("judgmentkit2"), false);
  assert.equal(block.includes("get_workflow_bundle"), false);
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-install-test-"));
  const configPath = path.join(tempDir, "config.toml");
  const checkoutPath = path.join(tempDir, "checkout");

  fs.writeFileSync(
    configPath,
    [
      "[profile.default]",
      'model = "test"',
      "",
      "[mcp_servers.judgmentkit]",
      'command = "node"',
      'args = ["old-server.js"]',
      "",
      "[mcp_servers.judgmentkit.tools.create_activity_model_review]",
      'approval_mode = "approve"',
      "",
      "[mcp_servers.other]",
      'command = "node"',
      'args = ["other.js"]',
      "",
    ].join("\n"),
  );

  const result = await writeCodexConfig({ configPath, checkoutPath });
  const nextConfig = fs.readFileSync(configPath, "utf8");

  assert.equal(result.config_path, configPath);
  assert.equal((nextConfig.match(/\[mcp_servers\.judgmentkit\]/g) ?? []).length, 1);
  assert.ok(nextConfig.includes("[mcp_servers.judgmentkit.tools.create_activity_model_review]"));
  assert.ok(nextConfig.includes('approval_mode = "approve"'));
  assert.ok(nextConfig.includes("[mcp_servers.other]"));
  assert.ok(nextConfig.includes(`"${checkoutPath}"`));
  assert.equal(nextConfig.includes("old-server.js"), false);
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-install-dry-"));
  const result = await installJudgmentKitMcp({
    client: "codex",
    checkoutPath: path.join(tempDir, "checkout"),
    configPath: path.join(tempDir, "config.toml"),
    dryRun: true,
  });

  assert.equal(result.status, "dry_run");
  assert.equal(result.client, "codex");
  assert.deepEqual(result.tools, EXPECTED_TOOL_NAMES);
  assert.ok(result.config_block.includes("[mcp_servers.judgmentkit]"));
}

{
  await assert.rejects(
    () => installJudgmentKitMcp({ client: "claude", dryRun: true }),
    (error) =>
      error.name === "InstallError" &&
      error.phase === "args" &&
      error.message.includes("codex only"),
  );
}

console.log("Install MCP checks passed.");
