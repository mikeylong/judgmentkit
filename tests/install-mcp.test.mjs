import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_MCP_URL,
  JUDGMENTKIT_MCP_TOOL_NAMES,
  SUPPORTED_CLIENTS,
  createClaudeInstallCommand,
  createCodexConfigBlock,
  createCursorConfigBlock,
  installJudgmentKitMcp,
  writeCodexConfig,
  writeCursorConfig,
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
  assert.equal(DEFAULT_MCP_URL, "https://judgmentkit.ai/mcp");
  assert.deepEqual(SUPPORTED_CLIENTS, ["codex", "claude", "cursor"]);
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
  const block = createCodexConfigBlock("https://example.test/mcp");

  assert.ok(block.includes("[mcp_servers.judgmentkit]"));
  assert.ok(block.includes('url = "https://example.test/mcp"'));
  assert.equal(block.includes('command = "npm"'), false);
  assert.equal(block.includes("mcp:stdio"), false);
  assert.equal(block.includes("judgmentkit2"), false);
}

{
  const command = createClaudeInstallCommand({
    mcpUrl: "https://example.test/mcp",
    scope: "user",
  });

  assert.equal(command.command, "claude");
  assert.deepEqual(command.args, [
    "mcp",
    "add",
    "--transport",
    "http",
    "--scope",
    "user",
    "judgmentkit",
    "https://example.test/mcp",
  ]);
}

{
  const block = createCursorConfigBlock("https://example.test/mcp");
  const parsed = JSON.parse(block);

  assert.deepEqual(parsed, {
    mcpServers: {
      judgmentkit: {
        url: "https://example.test/mcp",
      },
    },
  });
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-install-test-"));
  const configPath = path.join(tempDir, "config.toml");

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

  const result = await writeCodexConfig({
    configPath,
    mcpUrl: "https://example.test/mcp",
  });
  const nextConfig = fs.readFileSync(configPath, "utf8");

  assert.equal(result.config_path, configPath);
  assert.equal((nextConfig.match(/\[mcp_servers\.judgmentkit\]/g) ?? []).length, 1);
  assert.ok(nextConfig.includes('url = "https://example.test/mcp"'));
  assert.ok(nextConfig.includes("[mcp_servers.judgmentkit.tools.create_activity_model_review]"));
  assert.ok(nextConfig.includes('approval_mode = "approve"'));
  assert.ok(nextConfig.includes("[mcp_servers.other]"));
  assert.equal(nextConfig.includes("old-server.js"), false);
  assert.equal(nextConfig.includes("mcp:stdio"), false);
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-cursor-install-test-"));
  const configPath = path.join(tempDir, "mcp.json");

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        mcpServers: {
          other: {
            url: "https://other.example.test/mcp",
          },
          judgmentkit: {
            command: "node",
            args: ["old-server.js"],
          },
        },
      },
      null,
      2,
    ),
  );

  const result = await writeCursorConfig({
    configPath,
    mcpUrl: "https://example.test/mcp",
  });
  const nextConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

  assert.equal(result.config_path, configPath);
  assert.deepEqual(nextConfig.mcpServers.other, {
    url: "https://other.example.test/mcp",
  });
  assert.deepEqual(nextConfig.mcpServers.judgmentkit, {
    url: "https://example.test/mcp",
  });
}

for (const client of ["codex", "claude", "cursor"]) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `judgmentkit-${client}-dry-`));
  const result = await installJudgmentKitMcp({
    client,
    configPath: path.join(tempDir, "config"),
    mcpUrl: "https://example.test/mcp",
    dryRun: true,
  });

  assert.equal(result.status, "dry_run");
  assert.equal(result.client, client);
  assert.equal(result.mcp_url, "https://example.test/mcp");
  assert.deepEqual(result.tools, EXPECTED_TOOL_NAMES);

  if (client === "codex") {
    assert.ok(result.config_block.includes("[mcp_servers.judgmentkit]"));
    assert.ok(result.config_block.includes('url = "https://example.test/mcp"'));
  } else if (client === "claude") {
    assert.ok(result.command.includes("'claude'"));
    assert.ok(result.command.includes("'--transport' 'http'"));
  } else {
    assert.deepEqual(JSON.parse(result.config_block).mcpServers.judgmentkit, {
      url: "https://example.test/mcp",
    });
  }
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-codex-install-"));
  const result = await installJudgmentKitMcp({
    client: "codex",
    configPath: path.join(tempDir, "config.toml"),
    mcpUrl: "https://example.test/mcp",
    noVerify: true,
  });
  const configText = fs.readFileSync(result.config_path, "utf8");

  assert.equal(result.status, "installed");
  assert.equal(result.client, "codex");
  assert.equal(result.verification.skipped, true);
  assert.ok(configText.includes('url = "https://example.test/mcp"'));
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-cursor-install-"));
  const result = await installJudgmentKitMcp({
    client: "cursor",
    configPath: path.join(tempDir, "mcp.json"),
    mcpUrl: "https://example.test/mcp",
    noVerify: true,
  });
  const config = JSON.parse(fs.readFileSync(result.config_path, "utf8"));

  assert.equal(result.status, "installed");
  assert.equal(result.client, "cursor");
  assert.equal(result.verification.skipped, true);
  assert.deepEqual(config.mcpServers.judgmentkit, {
    url: "https://example.test/mcp",
  });
}

{
  const result = await installJudgmentKitMcp({
    client: "claude",
    mcpUrl: "https://example.test/mcp",
    manual: true,
  });

  assert.equal(result.status, "manual");
  assert.equal(result.client, "claude");
  assert.ok(result.command.includes("'claude'"));
  assert.ok(result.command.includes("'--scope' 'user'"));
}

{
  await assert.rejects(
    () => installJudgmentKitMcp({ client: "windsurf", dryRun: true }),
    (error) =>
      error.name === "InstallError" &&
      error.phase === "args" &&
      error.message.includes("codex|claude|cursor"),
  );
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-cursor-invalid-"));
  const configPath = path.join(tempDir, "mcp.json");
  fs.writeFileSync(configPath, "{not json");

  await assert.rejects(
    () => writeCursorConfig({ configPath, mcpUrl: "https://example.test/mcp" }),
    (error) =>
      error.name === "InstallError" &&
      error.phase === "config" &&
      error.message.includes("Could not parse Cursor MCP config JSON"),
  );
}

console.log("Install MCP checks passed.");
