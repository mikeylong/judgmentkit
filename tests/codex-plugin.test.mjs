import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCodexPlugin } from "../scripts/build-codex-plugin.mjs";
import { syncCodexPlugin } from "../scripts/sync-codex-plugin.mjs";
import {
  CodexPluginVerificationError,
  DEFAULT_SOURCE_DIR,
  verifyCodexPlugin,
} from "../scripts/verify-codex-plugin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const DEFAULT_MCP_URL = "https://judgmentkit.ai/mcp";

function codexSuffix() {
  return `+${"codex"}`;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function createFixture(overrides = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-codex-plugin-"));
  const sourceDir = path.join(tempDir, "packages", "codex-plugin");
  const packageJsonPath = path.join(sourceDir, "package.json");
  const version = overrides.packageVersion ?? "1.2.3";
  const pluginVersion = overrides.pluginVersion ?? version;
  const skillText = overrides.skillText ?? validSkillText();
  const agentYaml = overrides.agentYaml ?? validAgentYaml();
  const pluginJson = {
    name: "judgmentkit",
    version: pluginVersion,
    description: "AI UI review and handoff guidance that enforces hard design-system acceptance gates.",
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: "JudgmentKit",
      shortDescription: "AI UI review with hard design-system gates",
      longDescription: "The hosted endpoint is for allowed or sanitized work; use a local or self-hosted JudgmentKit path for confidential briefs, unreleased designs, proprietary design-system details, source code, or customer data.",
      developerName: "JudgmentKit",
      category: "Productivity",
      capabilities: ["Interactive", "Read"],
      websiteURL: "https://judgmentkit.ai",
      defaultPrompt: [
        "Turn this product brief into UI decisions and review criteria.",
      ],
    },
  };
  const mcpJson = {
    mcpServers: {
      judgmentkit: {
        type: "http",
        url: overrides.mcpUrl ?? DEFAULT_MCP_URL,
      },
    },
  };

  await writeJson(packageJsonPath, {
    name: "judgmentkit",
    version,
    type: "module",
  });
  await writeJson(path.join(sourceDir, ".codex-plugin", "plugin.json"), pluginJson);
  await writeJson(path.join(sourceDir, ".mcp.json"), mcpJson);
  await fs.mkdir(path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "agents"), { recursive: true });
  await fs.writeFile(path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "SKILL.md"), skillText);

  if (overrides.writeAgentYaml !== false) {
    await fs.writeFile(
      path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "agents", "openai.yaml"),
      agentYaml,
    );
  }

  if (overrides.extraFiles) {
    for (const [relativePath, text] of Object.entries(overrides.extraFiles)) {
      const filePath = path.join(sourceDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, text);
    }
  }

  return {
    tempDir,
    packageJsonPath,
    sourceDir,
    version,
  };
}

function validSkillText() {
  return [
    "---",
    "name: judgmentkit-hosted-mcp",
    "description: Use JudgmentKit when the user explicitly asks or the project opts in to clarify what a UI must support, choose the right surface type, review workflow fit, set disclosure boundaries, enforce design-system acceptance gates, or prepare design-system handoff criteria before product UI is planned, generated, reviewed, or accepted.",
    "---",
    "",
    "# JudgmentKit Hosted MCP",
    "",
    "## Design-System Acceptance Gate",
    "",
    "A generated UI that does not pass the active design system is not an artifact. It is a failed candidate.",
    "",
    "Do not accept, render, publish, summarize as successful, or preserve a generated UI candidate until `review_ui_implementation_candidate` passes against the active implementation contract.",
    "",
    'Do not treat "mostly uses tokens", wrapper normalization, fallback styling, visual cleanup, or post-hoc token rewriting as design-system compliance.',
    "",
    "If the active design-system review fails, the next action is repair or regeneration against the MCP-returned constraints, not acceptance with caveats.",
    "",
    "## Privacy Boundary",
    "",
    "The hosted endpoint processes the MCP request payload and records sanitized usage events such as event type and tool name.",
    "",
    "It does not intentionally store submitted briefs, design context, generated code, or review packets, but hosted requests still leave the local environment.",
    "",
    "Use sanitized inputs for confidential work.",
    "",
    "For unreleased designs, proprietary design-system details, source code, customer data, or internal roadmaps, prefer a local checkout, local stdio server, or self-hosted JudgmentKit MCP endpoint instead of `https://judgmentkit.ai/mcp`.",
    "",
  ].join("\n");
}

function validAgentYaml() {
  return [
    "interface:",
    '  display_name: "JudgmentKit Hosted MCP"',
    '  short_description: "UI workflow review and hard design-system gates"',
    '  default_prompt: "Use $judgmentkit-hosted-mcp to review this UI brief for workflow fit, surface choice, disclosure boundaries, and the hard design-system acceptance gate."',
    "dependencies:",
    "  tools:",
    '    - type: "mcp"',
    '      value: "judgmentkit"',
    '      description: "Hosted JudgmentKit MCP server"',
    '      transport: "streamable_http"',
    `      url: "${DEFAULT_MCP_URL}"`,
    "policy:",
    "  allow_implicit_invocation: false",
    "",
  ].join("\n");
}

async function assertVerifyRejects(options, expectedChecks) {
  await assert.rejects(
    () => verifyCodexPlugin(options),
    (error) => {
      assert.ok(error instanceof CodexPluginVerificationError);
      const checks = new Set(error.failures.map((failure) => failure.check));
      for (const expectedCheck of expectedChecks) {
        assert.ok(checks.has(expectedCheck), `expected failure check ${expectedCheck}, got ${[...checks].join(", ")}`);
      }
      return true;
    },
  );
}

{
  const fixture = await createFixture();
  const result = await verifyCodexPlugin({
    sourceDir: fixture.sourceDir,
    packageJsonPath: fixture.packageJsonPath,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.package_version, fixture.version);
  assert.equal(result.plugin_version, fixture.version);
  assert.equal(result.mcp_url, DEFAULT_MCP_URL);
  assert.ok(result.files_checked.includes(".codex-plugin/plugin.json"));
  assert.ok(result.files_checked.includes("skills/judgmentkit-hosted-mcp/agents/openai.yaml"));
}

{
  const fixture = await createFixture({ pluginVersion: "1.2.4" });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["package_plugin_version_equality"],
  );
}

{
  const fixture = await createFixture({ pluginVersion: `1.2.3${codexSuffix()}.20260704010203` });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["strict_base_semver", "no_codex_version_suffix", "forbidden_source_text"],
  );
}

{
  const fixture = await createFixture({ pluginVersion: "1.2.3-beta.1" });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["strict_base_semver"],
  );
}

{
  const fixture = await createFixture({ mcpUrl: "https://example.test/mcp" });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["mcp_url"],
  );
}

{
  const fixture = await createFixture({
    agentYaml: validAgentYaml().replace("allow_implicit_invocation: false", "allow_implicit_invocation: true"),
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["agent_yaml", "agent_policy"],
  );
}

{
  const fixture = await createFixture({
    agentYaml: validAgentYaml().replace('transport: "streamable_http"', 'transport: "stdio"'),
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["agent_yaml"],
  );
}

{
  const fixture = await createFixture({ writeAgentYaml: false });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["required_file"],
  );
}

{
  const forbiddenText = [
    `Do not keep ${"/Users/" + "mike"}/work paths.`,
    `Do not keep ${".codex/" + "plugins/cache"}/personal paths.`,
    "Avoid get_workflow_bundle.",
    "Avoid mcp:stdio.",
    "Avoid git clone.",
    "Avoid npm install.",
    `Avoid ${["TO", "DO"].join("")} markers.`,
  ].join("\n");
  const fixture = await createFixture({
    extraFiles: {
      "skills/judgmentkit-hosted-mcp/forbidden.md": forbiddenText,
    },
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["forbidden_source_text"],
  );
}

{
  const fixture = await createFixture({ skillText: "# JudgmentKit Hosted MCP\n" });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["privacy_wording", "design_system_gate_wording"],
  );
}

{
  const fixture = await createFixture({
    skillText: "# JudgmentKit Hosted MCP\n",
    extraFiles: {
      "README.md": validSkillText(),
    },
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["privacy_wording", "design_system_gate_wording"],
  );
}

{
  const fixture = await createFixture({
    extraFiles: {
      "skills/judgmentkit-hosted-mcp/dist/forbidden.md": `Avoid ${".codex/" + "plugins/cache"}/personal paths.`,
    },
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["forbidden_source_text"],
  );
}

{
  const fixture = await createFixture({
    extraFiles: {
      "private-notes.md": "This file should not be copied by the build whitelist.\n",
    },
  });
  const outDir = path.join(fixture.tempDir, "dist", "codex-plugin");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "stale.md"), "stale file");
  const result = await buildCodexPlugin({
    sourceDir: fixture.sourceDir,
    outDir,
    packageJsonPath: fixture.packageJsonPath,
    clean: false,
  });

  assert.equal(result.status, "built");
  assert.deepEqual(result.copied_entries, ["package.json", ".codex-plugin", ".mcp.json", "skills"]);
  assert.equal((await readJson(path.join(outDir, ".codex-plugin", "plugin.json"))).version, fixture.version);
  await assert.rejects(
    () => fs.access(path.join(outDir, "private-notes.md")),
    (error) => error.code === "ENOENT",
  );
  await assert.rejects(
    () => fs.access(path.join(outDir, "stale.md")),
    (error) => error.code === "ENOENT",
  );
}

{
  const fixture = await createFixture();
  const outDir = path.join(fixture.tempDir, "build", "codex-plugin");
  const targetDir = path.join(fixture.tempDir, "synced", "judgmentkit");
  const result = await syncCodexPlugin({
    sourceDir: fixture.sourceDir,
    outDir,
    targetDir,
    packageJsonPath: fixture.packageJsonPath,
    timestamp: new Date("2026-07-04T01:02:03Z"),
  });
  const targetPluginJson = await readJson(path.join(targetDir, ".codex-plugin", "plugin.json"));
  const sourcePluginJson = await readJson(path.join(fixture.sourceDir, ".codex-plugin", "plugin.json"));

  assert.equal(result.status, "synced");
  assert.equal(result.source_version, fixture.version);
  assert.equal(result.synced_version, `1.2.3${codexSuffix()}.20260704010203`);
  assert.equal(targetPluginJson.version, result.synced_version);
  assert.equal(sourcePluginJson.version, fixture.version);
}

{
  const fixture = await createFixture();
  const unsafeTargets = [
    root,
    path.join(root, "packages", "codex-plugin"),
    path.join(fixture.sourceDir),
    path.join(fixture.sourceDir, "nested"),
    path.dirname(fixture.sourceDir),
    path.join(fixture.tempDir, "build", "codex-plugin"),
  ];

  for (const targetDir of unsafeTargets) {
    await assert.rejects(
      () =>
        syncCodexPlugin({
          sourceDir: fixture.sourceDir,
          outDir: path.join(fixture.tempDir, "build", "codex-plugin"),
          targetDir,
          packageJsonPath: fixture.packageJsonPath,
          dryRun: true,
        }),
      /Refusing to sync Codex plugin/,
    );
  }
}

{
  const fixture = await createFixture();
  const outDir = path.join(fixture.tempDir, "build", "codex-plugin");
  const targetDir = path.join(fixture.tempDir, "dry-run", "judgmentkit");
  const result = await syncCodexPlugin({
    sourceDir: fixture.sourceDir,
    outDir,
    targetDir,
    packageJsonPath: fixture.packageJsonPath,
    timestamp: new Date("2026-07-04T01:02:03Z"),
    dryRun: true,
  });

  assert.equal(result.status, "dry_run");
  assert.equal(result.synced_version, `1.2.3${codexSuffix()}.20260704010203`);
  await assert.rejects(
    () => fs.access(targetDir),
    (error) => error.code === "ENOENT",
  );
}

{
  await fs.access(DEFAULT_SOURCE_DIR);
  await verifyCodexPlugin({
    sourceDir: DEFAULT_SOURCE_DIR,
  });
}

{
  const installerSource = await fs.readFile(path.join(root, "scripts", "install-mcp.mjs"), "utf8");

  for (const forbiddenText of [
    "packages/codex-plugin",
    "codex plugin add",
    "plugin marketplace",
    ".codex/plugins/cache",
    "mcp:stdio",
    "git clone",
    "npm install",
  ]) {
    assert.equal(
      installerSource.includes(forbiddenText),
      false,
      `install:mcp should stay hosted-MCP-only and not reference ${forbiddenText}`,
    );
  }
}

console.log("Codex plugin checks passed.");
