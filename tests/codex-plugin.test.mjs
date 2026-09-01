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
const canonicalSkillDir = path.join(root, "packages", "agent-skill", "judgmentkit-hosted-mcp");
const canonicalSkillText = await fs.readFile(path.join(canonicalSkillDir, "SKILL.md"), "utf8");
const canonicalUiReferenceText = await fs.readFile(
  path.join(canonicalSkillDir, "references", "ui-handoff-and-acceptance.md"),
  "utf8",
);
const canonicalDeckReferenceText = await fs.readFile(
  path.join(canonicalSkillDir, "references", "deck-creation.md"),
  "utf8",
);

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
  const uiReferenceText = overrides.uiReferenceText ?? canonicalUiReferenceText;
  const deckReferenceText = overrides.deckReferenceText ?? canonicalDeckReferenceText;
  const agentYaml = overrides.agentYaml ?? validAgentYaml();
  const pluginJson = {
    name: "judgmentkit",
    version: pluginVersion,
    description:
      overrides.pluginDescription ??
      "Activity-centered UI design and handoff guidance with hard acceptance gates.",
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: "JudgmentKit",
      shortDescription:
        overrides.pluginShortDescription ??
        "Inference-first UI design and acceptance gates",
      longDescription:
        overrides.pluginLongDescription ??
        "JudgmentKit turns a rough brief into a working premise without beginning with an intake questionnaire, preserves design intent through handoff, and asks only when a decision materially changes the interaction. The hosted endpoint is for allowed or sanitized work; use a local or self-hosted JudgmentKit path for confidential briefs, unreleased designs, proprietary design-system details, source code, or customer data.",
      developerName: "JudgmentKit",
      category: "Productivity",
      capabilities: ["Interactive", "Read"],
      websiteURL: "https://judgmentkit.ai",
      defaultPrompt:
        overrides.pluginDefaultPrompt ??
        ["Make a first UI pass, show the working premise, and ask only if a missing decision would materially change the design."],
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
  await fs.mkdir(path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "references"), { recursive: true });
  await fs.writeFile(path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "SKILL.md"), skillText);
  await fs.writeFile(
    path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "references", "ui-handoff-and-acceptance.md"),
    uiReferenceText,
  );
  await fs.writeFile(
    path.join(sourceDir, "skills", "judgmentkit-hosted-mcp", "references", "deck-creation.md"),
    deckReferenceText,
  );

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
  return canonicalSkillText;
}

function validAgentYaml() {
  return [
    "interface:",
    '  display_name: "JudgmentKit UI Design"',
    '  short_description: "Inference-first UI design and acceptance gates"',
    '  default_prompt: "Use $judgmentkit-hosted-mcp to infer and review a complete activity case before producing the requested UI direction or JudgmentKit slide deck; show the working premise first and ask only one consequential question if needed."',
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
    ["privacy_wording", "activity_case_ux_wording", "conditional_reference_routing", "canonical_skill_mirror"],
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
    ["privacy_wording", "activity_case_ux_wording", "conditional_reference_routing", "canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    deckReferenceText: "# Deck Creation\n",
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["slide_deck_workflow_wording", "canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    agentYaml: validAgentYaml()
      .replace(
        '  short_description: "Inference-first UI design and acceptance gates"',
        '  short_description: "UI workflow review and hard design-system gates"',
      )
      .replace(
        '  default_prompt: "Use $judgmentkit-hosted-mcp to infer and review a complete activity case before producing the requested UI direction or JudgmentKit slide deck; show the working premise first and ask only one consequential question if needed."',
        '  default_prompt: "Use $judgmentkit-hosted-mcp to review this UI brief for workflow fit, surface choice, disclosure boundaries, and the hard design-system acceptance gate."',
      ),
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["agent_activity_case_discovery"],
  );
}

{
  const fixture = await createFixture({
    skillText: validSkillText().replace(
      "Default to **propose, show, then refine**",
      "Default to refine after questions",
    ),
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["activity_case_ux_wording", "canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    skillText: validSkillText().replace(
      "Call `create_activity_model_review({ brief, context_items })` first",
      "Call `create_activity_model_review` when useful",
    ),
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["activity_case_ux_wording", "canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    uiReferenceText: canonicalUiReferenceText.replace(
      "Select `artifact_inspector` only when the rendered artifact is primary, semantic locus selection is required, and support is locus-relative.",
      "Select an inspector when it seems useful.",
    ),
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["ui_handoff_wording", "canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    skillText: `${validSkillText()}\nBefore suggesting screens, components, or styling, establish:\n`,
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["questionnaire_first_wording", "canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    skillText: `${validSkillText()} `,
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["canonical_skill_mirror"],
  );
}

{
  const fixture = await createFixture({
    pluginDescription: "UI review and handoff guidance.",
    pluginShortDescription: "UI review and handoff guidance",
    pluginLongDescription: "Review generated UI and create implementation evidence.",
    pluginDefaultPrompt: ["Review this generated UI."],
  });
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
    },
    ["manifest_activity_case_discovery"],
  );
}

{
  const fixture = await createFixture();
  await assertVerifyRejects(
    {
      sourceDir: fixture.sourceDir,
      packageJsonPath: fixture.packageJsonPath,
      canonicalSkillDir: path.join(fixture.tempDir, "missing-canonical-skill"),
    },
    ["canonical_skill_file"],
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
