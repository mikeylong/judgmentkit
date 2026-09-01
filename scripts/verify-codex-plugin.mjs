#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const DEFAULT_SOURCE_DIR = path.join(PROJECT_ROOT, "packages", "codex-plugin");
export const DEFAULT_PACKAGE_JSON_PATH = path.join(DEFAULT_SOURCE_DIR, "package.json");
export const DEFAULT_CANONICAL_SKILL_DIR = path.join(
  PROJECT_ROOT,
  "packages",
  "agent-skill",
  "judgmentkit-hosted-mcp",
);
export const CODEX_PLUGIN_MCP_URL = "https://judgmentkit.ai/mcp";
export const STRICT_BASE_SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export const PORTABLE_SKILL_FILES = [
  "SKILL.md",
  "references/ui-handoff-and-acceptance.md",
  "references/deck-creation.md",
];

export const REQUIRED_PLUGIN_FILES = [
  "package.json",
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "skills/judgmentkit-hosted-mcp/SKILL.md",
  "skills/judgmentkit-hosted-mcp/references/ui-handoff-and-acceptance.md",
  "skills/judgmentkit-hosted-mcp/references/deck-creation.md",
  "skills/judgmentkit-hosted-mcp/agents/openai.yaml",
];

export const OLD_V1_TOOL_NAMES = [
  "list_resources",
  "get_resource",
  "get_workflow_bundle",
  "get_page_markdown",
  "get_example",
  "resolve_related",
];

export const REQUIRED_PRIVACY_WORDING = [
  "The hosted endpoint processes the MCP request payload and records sanitized usage events",
  "It does not intentionally store submitted briefs, design context, generated code, or review packets",
  "Use sanitized inputs for confidential work.",
  "For unreleased designs, proprietary design-system details, source code, customer data, or internal roadmaps, prefer a local checkout, local stdio server, or self-hosted JudgmentKit MCP endpoint instead of `https://judgmentkit.ai/mcp`.",
];

export const REQUIRED_DESIGN_SYSTEM_GATE_WORDING = [
  "A generated UI that does not pass the active design system is not an artifact. It is a failed candidate.",
  "Do not accept, render, publish, summarize as successful, or preserve a generated UI candidate until `review_ui_implementation_candidate` passes against the active implementation contract.",
  'Do not treat "mostly uses tokens", wrapper normalization, fallback styling, visual cleanup, or post-hoc token rewriting as design-system compliance.',
  "If the active design-system review fails, the next action is repair or regeneration against the MCP-returned constraints, not acceptance with caveats.",
];

export const REQUIRED_SLIDE_DECK_WORKFLOW_WORDING = [
  "Use this skill for JudgmentKit slide deck requests",
  "# Deck Creation",
  "## Deck Workflow",
  "deck_creation_status",
  "mcp__judgmentkit.create_slide_deck",
  "If no deck creation tool is listed by the active endpoint",
  "Do not fabricate a JudgmentKit packet, deck, or MCP result",
  "explicit `template_id` values or strong selection metadata",
];

export const REQUIRED_ACTIVITY_CASE_UX_WORDING = [
  "Default to **propose, show, then refine**",
  "Represent non-brief evidence as attributed `context_items`",
  "Call `create_activity_model_review({ brief, context_items })` first",
  "baseline, not as the limit of model inference",
  "Have the host model infer a complete best-current activity case",
  "Call `review_activity_model_candidate({ brief, candidate, context_items })` with the same attributed context items",
  "If `activity_case.readiness.decision` is `stop`, do not show a potentially misleading design direction",
  "Otherwise, show the premise, decisions, and direction before asking a question",
  "Ask at most one consequential question at a time",
  "Do not begin with an intake checklist",
  "The dimensions above are an internal inference and completeness model, not a questionnaire",
  "**Proceed** is the default",
  "**Quick** front-loads the working premise and first design direction",
  "**Guided** still infers and reviews the complete best-current case first",
  "These modes change pacing, not inference depth, model capability, evidence requirements, or acceptance gates",
  "`structuredContent` is the authority",
  "Use raw `content[0].text` only for explicit setup, audit, debugging, or integration work",
];

export const REQUIRED_UI_HANDOFF_WORDING = [
  "`artifact_inspector`",
  "Select `artifact_inspector` only when the rendered artifact is primary, semantic locus selection is required, and support is locus-relative",
];

export const REQUIRED_CONDITIONAL_REFERENCE_WORDING = [
  "[references/ui-handoff-and-acceptance.md](references/ui-handoff-and-acceptance.md)",
  "[references/deck-creation.md](references/deck-creation.md)",
  "Read both references only when the request genuinely includes both routes",
];

export const FORBIDDEN_QUESTIONNAIRE_FIRST_WORDING = [
  "Before suggesting screens, components, or styling, establish:",
  "ask only the targeted blocking questions",
  "Use `content[0].text` as the concise human-facing planning card",
];

export const REQUIRED_AGENT_ACTIVITY_DISCOVERY_WORDING = [
  'display_name: "JudgmentKit UI Design"',
  'short_description: "Inference-first UI design and acceptance gates"',
  "infer and review a complete activity case",
  "show the working premise first",
  "one consequential question",
  "JudgmentKit slide deck",
];

const CODEX_SUFFIX_PATTERN = new RegExp(`\\+${"codex"}\\b`, "i");
const LOCAL_HOME_PATTERN = new RegExp(`/Users/${"mike"}\\b`);
const CODEX_CACHE_PATTERN = new RegExp(`\\.codex/${"plugins"}/cache`);
const TODO_PATTERN = new RegExp(`\\b${["TO", "DO"].join("")}\\b`, "i");

const FORBIDDEN_TEXT_PATTERNS = [
  {
    label: "Codex cachebuster version marker",
    pattern: CODEX_SUFFIX_PATTERN,
  },
  {
    label: "absolute local home path",
    pattern: LOCAL_HOME_PATTERN,
  },
  {
    label: "Codex plugin cache path",
    pattern: CODEX_CACHE_PATTERN,
  },
  {
    label: "stdio MCP install instruction",
    pattern: /\bmcp:stdio\b/i,
  },
  {
    label: "git clone install instruction",
    pattern: /\bgit\s+clone\b/i,
  },
  {
    label: "npm install instruction",
    pattern: /\bnpm\s+install\b/i,
  },
  {
    label: "unfinished placeholder marker",
    pattern: TODO_PATTERN,
  },
  ...OLD_V1_TOOL_NAMES.map((toolName) => ({
    label: `old v1 tool name ${toolName}`,
    pattern: new RegExp(`\\b${escapeRegExp(toolName)}\\b`),
  })),
];

export class CodexPluginVerificationError extends Error {
  constructor(failures) {
    super(`Codex plugin verification failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}.`);
    this.name = "CodexPluginVerificationError";
    this.failures = failures;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function formatRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, failures, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    failures.push({
      check: "valid_json",
      file: filePath,
      message: `${label} must be readable JSON: ${error.message}`,
    });
    return null;
  }
}

async function listFiles(rootDir) {
  const files = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (currentDir === rootDir && entry.name === "dist") {
          continue;
        }
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  return files.sort();
}

async function readTextFiles(rootDir, files, failures) {
  const entries = [];

  for (const filePath of files) {
    try {
      const text = await fs.readFile(filePath, "utf8");
      entries.push({
        filePath,
        relativePath: formatRelative(rootDir, filePath),
        text,
      });
    } catch (error) {
      failures.push({
        check: "read_source_file",
        file: filePath,
        message: `Could not read ${filePath}: ${error.message}`,
      });
    }
  }

  return entries;
}

async function readPortableSkillFiles(rootDir, failures, { check, filePrefix }) {
  const entries = new Map();

  for (const relativePath of PORTABLE_SKILL_FILES) {
    const filePath = path.join(rootDir, relativePath);
    if (!(await pathExists(filePath))) {
      failures.push({
        check,
        file: path.posix.join(filePrefix, relativePath),
        message: `Missing required portable skill file: ${filePath}`,
      });
      continue;
    }

    try {
      entries.set(relativePath, await fs.readFile(filePath, "utf8"));
    } catch (error) {
      failures.push({
        check,
        file: path.posix.join(filePrefix, relativePath),
        message: `Could not read portable skill file ${filePath}: ${error.message}`,
      });
    }
  }

  return entries;
}

function collectPortableMirrorFailures(canonicalFiles, adapterFiles) {
  const failures = [];

  for (const relativePath of PORTABLE_SKILL_FILES) {
    const canonicalText = canonicalFiles.get(relativePath);
    const adapterText = adapterFiles.get(relativePath);

    if (typeof canonicalText !== "string" || typeof adapterText !== "string") {
      continue;
    }

    if (adapterText !== canonicalText) {
      failures.push({
        check: "canonical_skill_mirror",
        file: path.posix.join("skills/judgmentkit-hosted-mcp", relativePath),
        message: `Codex adapter must be byte-identical to canonical portable skill file ${relativePath}.`,
      });
    }
  }

  return failures;
}

function collectForbiddenTextFailures(textEntries) {
  const failures = [];

  for (const entry of textEntries) {
    for (const rule of FORBIDDEN_TEXT_PATTERNS) {
      if (rule.pattern.test(entry.text)) {
        failures.push({
          check: "forbidden_source_text",
          file: entry.relativePath,
          message: `${entry.relativePath} contains ${rule.label}.`,
        });
      }
    }
  }

  return failures;
}

function collectMissingWordingFailures({ skillText, uiReferenceText, deckReferenceText }) {
  const normalizedSkillText = normalizeText(skillText);
  const normalizedUiReferenceText = normalizeText(uiReferenceText);
  const normalizedDeckReferenceText = normalizeText(deckReferenceText);
  const failures = [];

  for (const phrase of REQUIRED_PRIVACY_WORDING) {
    if (!normalizedSkillText.includes(normalizeText(phrase))) {
      failures.push({
        check: "privacy_wording",
        file: "skills/judgmentkit-hosted-mcp/SKILL.md",
        message: `Missing required privacy wording from hosted MCP skill: ${phrase}`,
      });
    }
  }

  for (const phrase of REQUIRED_DESIGN_SYSTEM_GATE_WORDING) {
    if (!normalizedUiReferenceText.includes(normalizeText(phrase))) {
      failures.push({
        check: "design_system_gate_wording",
        file: "skills/judgmentkit-hosted-mcp/references/ui-handoff-and-acceptance.md",
        message: `Missing required design-system gate wording from UI handoff reference: ${phrase}`,
      });
    }
  }

  for (const phrase of REQUIRED_UI_HANDOFF_WORDING) {
    if (!normalizedUiReferenceText.includes(normalizeText(phrase))) {
      failures.push({
        check: "ui_handoff_wording",
        file: "skills/judgmentkit-hosted-mcp/references/ui-handoff-and-acceptance.md",
        message: `Missing required UI handoff wording: ${phrase}`,
      });
    }
  }

  for (const phrase of REQUIRED_SLIDE_DECK_WORKFLOW_WORDING) {
    if (!normalizedDeckReferenceText.includes(normalizeText(phrase))) {
      failures.push({
        check: "slide_deck_workflow_wording",
        file: "skills/judgmentkit-hosted-mcp/references/deck-creation.md",
        message: `Missing required slide-deck workflow wording from deck reference: ${phrase}`,
      });
    }
  }

  for (const phrase of REQUIRED_ACTIVITY_CASE_UX_WORDING) {
    if (!normalizedSkillText.includes(normalizeText(phrase))) {
      failures.push({
        check: "activity_case_ux_wording",
        file: "skills/judgmentkit-hosted-mcp/SKILL.md",
        message: `Missing required inference-first activity-case wording: ${phrase}`,
      });
    }
  }

  for (const phrase of REQUIRED_CONDITIONAL_REFERENCE_WORDING) {
    if (!normalizedSkillText.includes(normalizeText(phrase))) {
      failures.push({
        check: "conditional_reference_routing",
        file: "skills/judgmentkit-hosted-mcp/SKILL.md",
        message: `Missing required conditional-reference routing wording: ${phrase}`,
      });
    }
  }

  for (const phrase of FORBIDDEN_QUESTIONNAIRE_FIRST_WORDING) {
    if (normalizedSkillText.includes(normalizeText(phrase))) {
      failures.push({
        check: "questionnaire_first_wording",
        file: "skills/judgmentkit-hosted-mcp/SKILL.md",
        message: `Hosted MCP skill contains forbidden questionnaire-first wording: ${phrase}`,
      });
    }
  }

  return failures;
}

function collectManifestFailures(pluginJson) {
  const failures = [];

  if (pluginJson?.name !== "judgmentkit") {
    failures.push({
      check: "plugin_manifest",
      file: ".codex-plugin/plugin.json",
      message: "Plugin manifest name must be judgmentkit.",
    });
  }

  if (pluginJson?.skills !== "./skills/") {
    failures.push({
      check: "plugin_manifest",
      file: ".codex-plugin/plugin.json",
      message: "Plugin manifest skills path must be ./skills/.",
    });
  }

  if (pluginJson?.mcpServers !== "./.mcp.json") {
    failures.push({
      check: "plugin_manifest",
      file: ".codex-plugin/plugin.json",
      message: "Plugin manifest mcpServers path must be ./.mcp.json.",
    });
  }

  for (const [field, value] of [
    ["interface.displayName", pluginJson?.interface?.displayName],
    ["interface.shortDescription", pluginJson?.interface?.shortDescription],
    ["interface.longDescription", pluginJson?.interface?.longDescription],
    ["interface.developerName", pluginJson?.interface?.developerName],
    ["interface.category", pluginJson?.interface?.category],
    ["interface.websiteURL", pluginJson?.interface?.websiteURL],
  ]) {
    if (typeof value !== "string" || value.trim().length === 0) {
      failures.push({
        check: "plugin_manifest",
        file: ".codex-plugin/plugin.json",
        message: `Plugin manifest must define ${field}.`,
      });
    }
  }

  if (!Array.isArray(pluginJson?.interface?.capabilities) || !pluginJson.interface.capabilities.includes("Read")) {
    failures.push({
      check: "plugin_manifest",
      file: ".codex-plugin/plugin.json",
      message: "Plugin manifest interface.capabilities must include Read.",
    });
  }

  if (!Array.isArray(pluginJson?.interface?.defaultPrompt) || pluginJson.interface.defaultPrompt.length === 0) {
    failures.push({
      check: "plugin_manifest",
      file: ".codex-plugin/plugin.json",
      message: "Plugin manifest interface.defaultPrompt must include at least one starter prompt.",
    });
  }

  const activityDiscoveryFields = [
    pluginJson?.description,
    pluginJson?.interface?.shortDescription,
    pluginJson?.interface?.longDescription,
    ...(Array.isArray(pluginJson?.interface?.defaultPrompt) ? pluginJson.interface.defaultPrompt : []),
  ];
  const normalizedActivityDiscovery = normalizeText(activityDiscoveryFields.filter(Boolean).join(" "));
  const requiredActivityDiscovery = [
    "Activity-centered UI design",
    "Inference-first UI design",
    "working premise",
    "without beginning with an intake questionnaire",
    "ask only if a missing decision would materially change the design",
  ];

  for (const phrase of requiredActivityDiscovery) {
    if (!normalizedActivityDiscovery.includes(normalizeText(phrase))) {
      failures.push({
        check: "manifest_activity_case_discovery",
        file: ".codex-plugin/plugin.json",
        message: `Plugin manifest must preserve inference-first discovery wording: ${phrase}`,
      });
    }
  }

  return failures;
}

function collectAgentYamlFailures(agentYamlText, mcpUrl) {
  const normalizedAgentYaml = normalizeText(agentYamlText);
  const requiredSnippets = [
    'display_name: "JudgmentKit UI Design"',
    'type: "mcp"',
    'value: "judgmentkit"',
    'transport: "streamable_http"',
    `url: "${mcpUrl}"`,
    "allow_implicit_invocation: false",
  ];
  const failures = [];

  for (const snippet of requiredSnippets) {
    if (!normalizedAgentYaml.includes(normalizeText(snippet))) {
      failures.push({
        check: "agent_yaml",
        file: "skills/judgmentkit-hosted-mcp/agents/openai.yaml",
        message: `OpenAI agent metadata must include ${snippet}.`,
      });
    }
  }

  if (normalizedAgentYaml.includes("allow_implicit_invocation: true")) {
    failures.push({
      check: "agent_policy",
      file: "skills/judgmentkit-hosted-mcp/agents/openai.yaml",
      message: "Hosted JudgmentKit plugin must not allow implicit invocation.",
    });
  }

  for (const phrase of REQUIRED_AGENT_ACTIVITY_DISCOVERY_WORDING) {
    if (!normalizedAgentYaml.includes(normalizeText(phrase))) {
      failures.push({
        check: "agent_activity_case_discovery",
        file: "skills/judgmentkit-hosted-mcp/agents/openai.yaml",
        message: `OpenAI agent metadata must preserve inference-first discovery wording: ${phrase}`,
      });
    }
  }

  return failures;
}

function assertNoFailures(failures) {
  if (failures.length > 0) {
    throw new CodexPluginVerificationError(failures);
  }
}

export async function verifyCodexPlugin({
  sourceDir = DEFAULT_SOURCE_DIR,
  packageJsonPath = DEFAULT_PACKAGE_JSON_PATH,
  canonicalSkillDir = DEFAULT_CANONICAL_SKILL_DIR,
  mcpUrl = CODEX_PLUGIN_MCP_URL,
} = {}) {
  const resolvedSourceDir = path.resolve(sourceDir);
  const resolvedPackageJsonPath = path.resolve(packageJsonPath);
  const resolvedCanonicalSkillDir = path.resolve(canonicalSkillDir);
  const failures = [];

  let sourceStat = null;
  try {
    sourceStat = await fs.stat(resolvedSourceDir);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (!sourceStat?.isDirectory()) {
    failures.push({
      check: "source_directory",
      file: resolvedSourceDir,
      message: `Codex plugin source directory does not exist: ${resolvedSourceDir}`,
    });
    assertNoFailures(failures);
  }

  const packageJson = await readJsonFile(resolvedPackageJsonPath, failures, "root package.json");
  const packageVersion = packageJson?.version;

  for (const relativePath of REQUIRED_PLUGIN_FILES) {
    const filePath = path.join(resolvedSourceDir, relativePath);
    if (!(await pathExists(filePath))) {
      failures.push({
        check: "required_file",
        file: relativePath,
        message: `Missing required Codex plugin file: ${relativePath}`,
      });
    }
  }

  const pluginJsonPath = path.join(resolvedSourceDir, ".codex-plugin", "plugin.json");
  const pluginJson = (await pathExists(pluginJsonPath))
    ? await readJsonFile(pluginJsonPath, failures, "plugin manifest")
    : null;
  const pluginVersion = pluginJson?.version;

  if (typeof packageVersion !== "string" || packageVersion.trim().length === 0) {
    failures.push({
      check: "package_version",
      file: resolvedPackageJsonPath,
      message: "Root package.json must define a non-empty version.",
    });
  }

  if (typeof pluginVersion !== "string" || pluginVersion.trim().length === 0) {
    failures.push({
      check: "plugin_version",
      file: ".codex-plugin/plugin.json",
      message: "Plugin manifest must define a non-empty version.",
    });
  } else {
    if (!STRICT_BASE_SEMVER_PATTERN.test(pluginVersion)) {
      failures.push({
        check: "strict_base_semver",
        file: ".codex-plugin/plugin.json",
        message: `Plugin version must be strict base semver, got ${pluginVersion}.`,
      });
    }

    if (CODEX_SUFFIX_PATTERN.test(pluginVersion)) {
      failures.push({
        check: "no_codex_version_suffix",
        file: ".codex-plugin/plugin.json",
        message: "Plugin source version must not include Codex cachebuster build metadata.",
      });
    }
  }

  if (packageVersion && pluginVersion && packageVersion !== pluginVersion) {
    failures.push({
      check: "package_plugin_version_equality",
      file: ".codex-plugin/plugin.json",
      message: `Plugin version ${pluginVersion} must equal package version ${packageVersion}.`,
    });
  }
  failures.push(...collectManifestFailures(pluginJson));

  const mcpJsonPath = path.join(resolvedSourceDir, ".mcp.json");
  const mcpJson = (await pathExists(mcpJsonPath))
    ? await readJsonFile(mcpJsonPath, failures, "Codex MCP manifest")
    : null;
  const actualMcpUrl = mcpJson?.mcpServers?.judgmentkit?.url;

  if (actualMcpUrl !== mcpUrl) {
    failures.push({
      check: "mcp_url",
      file: ".mcp.json",
      message: `mcpServers.judgmentkit.url must equal ${mcpUrl}, got ${actualMcpUrl ?? "(missing)"}.`,
    });
  }

  if (mcpJson?.mcpServers?.judgmentkit?.type !== "http") {
    failures.push({
      check: "mcp_transport",
      file: ".mcp.json",
      message: "mcpServers.judgmentkit.type must be http.",
    });
  }

  const sourceFiles = await listFiles(resolvedSourceDir);
  const textEntries = await readTextFiles(resolvedSourceDir, sourceFiles, failures);
  failures.push(...collectForbiddenTextFailures(textEntries));

  const canonicalFiles = await readPortableSkillFiles(resolvedCanonicalSkillDir, failures, {
    check: "canonical_skill_file",
    filePrefix: "packages/agent-skill/judgmentkit-hosted-mcp",
  });
  const adapterFiles = await readPortableSkillFiles(
    path.join(resolvedSourceDir, "skills", "judgmentkit-hosted-mcp"),
    failures,
    {
      check: "required_file",
      filePrefix: "skills/judgmentkit-hosted-mcp",
    },
  );
  const canonicalTextEntries = [...canonicalFiles.entries()].map(([relativePath, text]) => ({
    relativePath: path.posix.join("packages/agent-skill/judgmentkit-hosted-mcp", relativePath),
    text,
  }));

  failures.push(...collectForbiddenTextFailures(canonicalTextEntries));
  failures.push(...collectPortableMirrorFailures(canonicalFiles, adapterFiles));

  const agentYamlEntry = textEntries.find(
    (entry) => entry.relativePath === "skills/judgmentkit-hosted-mcp/agents/openai.yaml",
  );
  failures.push(...collectMissingWordingFailures({
    skillText: adapterFiles.get("SKILL.md") ?? "",
    uiReferenceText: adapterFiles.get("references/ui-handoff-and-acceptance.md") ?? "",
    deckReferenceText: adapterFiles.get("references/deck-creation.md") ?? "",
  }));
  failures.push(...collectAgentYamlFailures(agentYamlEntry?.text ?? "", mcpUrl));

  assertNoFailures(failures);

  return {
    status: "passed",
    source_dir: resolvedSourceDir,
    canonical_skill_dir: resolvedCanonicalSkillDir,
    package_json_path: resolvedPackageJsonPath,
    package_version: packageVersion,
    plugin_version: pluginVersion,
    mcp_url: actualMcpUrl,
    files_checked: textEntries.map((entry) => entry.relativePath),
    required_files: REQUIRED_PLUGIN_FILES,
    portable_skill_files: PORTABLE_SKILL_FILES,
  };
}

function parseArgs(argv) {
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    packageJsonPath: DEFAULT_PACKAGE_JSON_PATH,
    canonicalSkillDir: DEFAULT_CANONICAL_SKILL_DIR,
    mcpUrl: CODEX_PLUGIN_MCP_URL,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--source") {
      options.sourceDir = argv[++index];
    } else if (arg === "--package") {
      options.packageJsonPath = argv[++index];
    } else if (arg === "--canonical-skill") {
      options.canonicalSkillDir = argv[++index];
    } else if (arg === "--mcp-url") {
      options.mcpUrl = argv[++index];
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  return options;
}

function printUsage() {
  process.stderr.write(
    [
      "Usage:",
      "  node scripts/verify-codex-plugin.mjs [--source <dir>] [--package <package.json>] [--canonical-skill <dir>] [--mcp-url <url>] [--json]",
      "",
      `Defaults to ${path.relative(PROJECT_ROOT, DEFAULT_SOURCE_DIR)} with ${path.relative(PROJECT_ROOT, DEFAULT_CANONICAL_SKILL_DIR)}, ${path.relative(PROJECT_ROOT, DEFAULT_PACKAGE_JSON_PATH)}, and ${CODEX_PLUGIN_MCP_URL}.`,
      "",
    ].join("\n"),
  );
}

export async function runVerifyCodexPluginCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return;
  }

  const result = await verifyCodexPlugin(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      "Codex plugin verification passed.",
      `Source: ${result.source_dir}`,
      `Version: ${result.plugin_version}`,
      `Files checked: ${result.files_checked.length}`,
      "",
    ].join("\n"),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runVerifyCodexPluginCli(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CodexPluginVerificationError) {
      process.stderr.write(`${error.message}\n`);
      for (const failure of error.failures) {
        process.stderr.write(`- [${failure.check}] ${failure.message}\n`);
      }
    } else {
      process.stderr.write(`Codex plugin verification failed: ${error.message}\n`);
    }
    process.exitCode = 1;
  }
}
