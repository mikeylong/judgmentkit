#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const DEFAULT_REPOSITORY_URL =
  process.env.JUDGMENTKIT_REPOSITORY_URL ?? "https://github.com/mikeylong/judgmentkit.git";
export const DEFAULT_MCP_URL = process.env.JUDGMENTKIT_MCP_URL ?? "https://judgmentkit.ai/mcp";
export const DEFAULT_CHECKOUT_PATH = path.join(os.homedir(), ".codex", "judgmentkit");
export const DEFAULT_CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");
export const DEFAULT_CURSOR_CONFIG_PATH = path.join(os.homedir(), ".cursor", "mcp.json");
export const DEFAULT_CLAUDE_SCOPE = "user";
export const SUPPORTED_CLIENTS = ["codex", "claude", "cursor"];

export const JUDGMENTKIT_MCP_TOOL_NAMES = [
  "analyze_implementation_brief",
  "create_activity_model_review",
  "recommend_ui_workflow_profiles",
  "review_activity_model_candidate",
  "review_ui_workflow_candidate",
  "create_ui_generation_handoff",
];

class InstallError extends Error {
  constructor(message, phase = "install") {
    super(message);
    this.name = "InstallError";
    this.phase = phase;
  }
}

function tomlString(value) {
  return JSON.stringify(value);
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function formatCommand(command, args) {
  return [command, ...args].map(shellQuote).join(" ");
}

function createVerificationSkipped(reason) {
  return {
    verified: false,
    skipped: true,
    reason,
    tools: JUDGMENTKIT_MCP_TOOL_NAMES,
  };
}

export function createCodexConfigBlock(mcpUrl = DEFAULT_MCP_URL) {
  return [
    "[mcp_servers.judgmentkit]",
    `url = ${tomlString(mcpUrl)}`,
    "",
  ].join("\n");
}

function replaceCodexServerBlock(configText, serverBlock) {
  const normalizedBlock = serverBlock.endsWith("\n") ? serverBlock : `${serverBlock}\n`;

  const lines = configText.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === "[mcp_servers.judgmentkit]");

  if (startIndex !== -1) {
    let endIndex = startIndex + 1;

    while (endIndex < lines.length && !/^\s*\[[^\]]+\]\s*$/.test(lines[endIndex])) {
      endIndex += 1;
    }

    const replacementLines = normalizedBlock.trimEnd().split("\n");
    const nextLines = [
      ...lines.slice(0, startIndex),
      ...replacementLines,
      ...lines.slice(endIndex),
    ];

    return `${nextLines.join("\n").replace(/\n*$/, "")}\n`;
  }

  const separator = configText.trim().length > 0 && !configText.endsWith("\n") ? "\n\n" : "";
  return `${configText}${separator}${normalizedBlock}`;
}

export async function writeCodexConfig({ configPath = DEFAULT_CODEX_CONFIG_PATH, mcpUrl = DEFAULT_MCP_URL }) {
  const resolvedConfigPath = path.resolve(configPath);
  const block = createCodexConfigBlock(mcpUrl);
  let current = "";

  try {
    current = await fs.readFile(resolvedConfigPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(path.dirname(resolvedConfigPath), { recursive: true });
  const next = replaceCodexServerBlock(current, block);
  await fs.writeFile(resolvedConfigPath, next);

  return {
    config_path: resolvedConfigPath,
    config_block: block,
  };
}

export function createCursorServerConfig(mcpUrl = DEFAULT_MCP_URL) {
  return {
    url: mcpUrl,
  };
}

export function createCursorConfigBlock(mcpUrl = DEFAULT_MCP_URL) {
  return `${JSON.stringify(
    {
      mcpServers: {
        judgmentkit: createCursorServerConfig(mcpUrl),
      },
    },
    null,
    2,
  )}\n`;
}

export async function writeCursorConfig({ configPath = DEFAULT_CURSOR_CONFIG_PATH, mcpUrl = DEFAULT_MCP_URL }) {
  const resolvedConfigPath = path.resolve(configPath);
  let current = {};

  try {
    const text = await fs.readFile(resolvedConfigPath, "utf8");
    current = text.trim().length === 0 ? {} : JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") {
      current = {};
    } else if (error instanceof SyntaxError) {
      throw new InstallError(`Could not parse Cursor MCP config JSON at ${resolvedConfigPath}.`, "config");
    } else {
      throw error;
    }
  }

  if (!current || typeof current !== "object" || Array.isArray(current)) {
    throw new InstallError(`Cursor MCP config must be a JSON object at ${resolvedConfigPath}.`, "config");
  }

  if (!current.mcpServers || typeof current.mcpServers !== "object" || Array.isArray(current.mcpServers)) {
    current.mcpServers = {};
  }

  current.mcpServers.judgmentkit = createCursorServerConfig(mcpUrl);

  await fs.mkdir(path.dirname(resolvedConfigPath), { recursive: true });
  await fs.writeFile(resolvedConfigPath, `${JSON.stringify(current, null, 2)}\n`);

  return {
    config_path: resolvedConfigPath,
    config_block: createCursorConfigBlock(mcpUrl),
  };
}

export function createClaudeInstallCommand({
  mcpUrl = DEFAULT_MCP_URL,
  scope = DEFAULT_CLAUDE_SCOPE,
} = {}) {
  return {
    command: "claude",
    args: [
      "mcp",
      "add",
      "--transport",
      "http",
      "--scope",
      scope,
      "judgmentkit",
      mcpUrl,
    ],
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env ?? process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || options.ignoreExitCodes?.includes(code)) {
        resolve({ stdout, stderr, code });
        return;
      }

      reject(
        new InstallError(
          `${command} ${args.join(" ")} failed with exit code ${code}.\n${stderr}`.trim(),
          options.phase,
        ),
      );
    });
  });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new InstallError(`Timed out after ${timeoutMs}ms.`, "verify")), timeoutMs);
    }),
  ]);
}

export async function verifyJudgmentKitMcp(mcpUrl = DEFAULT_MCP_URL, options = {}) {
  let transport;
  let client;

  try {
    transport = new StreamableHTTPClientTransport(new URL(mcpUrl));

    client = new Client({
      name: "judgmentkit-install-verifier",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), options.timeoutMs ?? 7_500);
    const toolsResponse = await withTimeout(client.listTools(), options.timeoutMs ?? 7_500);
    const toolNames = toolsResponse.tools.map((tool) => tool.name);

    if (JSON.stringify(toolNames) !== JSON.stringify(JUDGMENTKIT_MCP_TOOL_NAMES)) {
      throw new InstallError(
        `JudgmentKit MCP tools/list mismatch. Expected ${JUDGMENTKIT_MCP_TOOL_NAMES.join(", ")}; received ${toolNames.join(", ")}.`,
        "verify",
      );
    }

    return {
      verified: true,
      transport: "streamable-http",
      endpoint: mcpUrl,
      tools: toolNames,
    };
  } finally {
    await transport?.close();
  }
}

async function commandExists(command) {
  const result = await runCommand("sh", ["-lc", `command -v ${command}`], {
    phase: "verify",
    ignoreExitCodes: [1, 127],
  });

  return result.code === 0;
}

async function verifyCursorClient() {
  if (!(await commandExists("cursor-agent"))) {
    return createVerificationSkipped(
      "cursor-agent was not found. Open Cursor settings for MCP or run cursor-agent mcp enable judgmentkit after installing Cursor Agent.",
    );
  }

  await runCommand("cursor-agent", ["mcp", "enable", "judgmentkit"], { phase: "verify" });
  const { stdout } = await runCommand("cursor-agent", ["mcp", "list-tools", "judgmentkit"], {
    phase: "verify",
  });

  for (const toolName of JUDGMENTKIT_MCP_TOOL_NAMES) {
    if (!stdout.includes(toolName)) {
      throw new InstallError(`cursor-agent did not list expected JudgmentKit tool ${toolName}.`, "verify");
    }
  }

  return {
    verified: true,
    command: "cursor-agent mcp list-tools judgmentkit",
    tools: JUDGMENTKIT_MCP_TOOL_NAMES,
  };
}

async function installClaudeMcp({ mcpUrl, scope }) {
  if (!(await commandExists("claude"))) {
    throw new InstallError("Claude Code CLI was not found. Install Claude Code, then rerun with --client claude.", "install");
  }

  const removeResult = await runCommand(
    "claude",
    ["mcp", "remove", "judgmentkit", "--scope", scope],
    {
      phase: "install",
      ignoreExitCodes: [1],
    },
  );

  if (
    removeResult.code !== 0 &&
    !removeResult.stderr.includes("No user-scoped MCP server found") &&
    !removeResult.stderr.includes("No local-scoped MCP server found") &&
    !removeResult.stderr.includes("No project-scoped MCP server found")
  ) {
    throw new InstallError(removeResult.stderr.trim(), "install");
  }

  const command = createClaudeInstallCommand({ mcpUrl, scope });
  const result = await runCommand(command.command, command.args, { phase: "install" });

  return {
    command: formatCommand(command.command, command.args),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    scope,
  };
}

function parseArgs(argv) {
  const parsed = {
    client: "codex",
    checkoutPath: DEFAULT_CHECKOUT_PATH,
    configPath: undefined,
    cursorConfigPath: undefined,
    repositoryUrl: DEFAULT_REPOSITORY_URL,
    mcpUrl: DEFAULT_MCP_URL,
    scope: DEFAULT_CLAUDE_SCOPE,
    dryRun: false,
    manual: false,
    noVerify: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--client") {
      parsed.client = argv[++index];
    } else if (arg === "--path") {
      parsed.checkoutPath = argv[++index];
    } else if (arg === "--config-path") {
      parsed.configPath = argv[++index];
    } else if (arg === "--cursor-config-path") {
      parsed.cursorConfigPath = argv[++index];
    } else if (arg === "--repository-url") {
      parsed.repositoryUrl = argv[++index];
    } else if (arg === "--mcp-url") {
      parsed.mcpUrl = argv[++index];
    } else if (arg === "--scope") {
      parsed.scope = argv[++index];
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--manual") {
      parsed.manual = true;
    } else if (arg === "--no-verify") {
      parsed.noVerify = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else {
      throw new InstallError(`Unsupported argument: ${arg}`, "args");
    }
  }

  return parsed;
}

function validateOptions(options) {
  if (!SUPPORTED_CLIENTS.includes(options.client)) {
    throw new InstallError(
      `JudgmentKit install supports --client ${SUPPORTED_CLIENTS.join("|")} only.`,
      "args",
    );
  }

  for (const [name, value] of [
    ["--mcp-url", options.mcpUrl],
    ["--repository-url", options.repositoryUrl],
  ]) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new InstallError(`${name} requires a non-empty value.`, "args");
    }
  }

  try {
    new URL(options.mcpUrl);
  } catch {
    throw new InstallError("--mcp-url must be an absolute URL.", "args");
  }

  if (!["local", "user", "project"].includes(options.scope)) {
    throw new InstallError("--scope must be local, user, or project.", "args");
  }

  for (const [name, value] of [
    ["--path", options.checkoutPath],
    ["--config-path", options.configPath],
    ["--cursor-config-path", options.cursorConfigPath],
  ]) {
    if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
      throw new InstallError(`${name} requires a non-empty value.`, "args");
    }
  }
}

function clientConfig(options) {
  if (options.client === "cursor") {
    return {
      config_path: options.cursorConfigPath ?? options.configPath ?? DEFAULT_CURSOR_CONFIG_PATH,
      config_block: createCursorConfigBlock(options.mcpUrl),
    };
  }

  if (options.client === "claude") {
    const command = createClaudeInstallCommand({
      mcpUrl: options.mcpUrl,
      scope: options.scope,
    });

    return {
      command: formatCommand(command.command, command.args),
      scope: options.scope,
    };
  }

  return {
    config_path: options.configPath ?? DEFAULT_CODEX_CONFIG_PATH,
    config_block: createCodexConfigBlock(options.mcpUrl),
  };
}

export async function installJudgmentKitMcp(rawOptions = {}) {
  const options = {
    client: rawOptions.client ?? "codex",
    checkoutPath: rawOptions.checkoutPath ?? DEFAULT_CHECKOUT_PATH,
    configPath: rawOptions.configPath,
    cursorConfigPath: rawOptions.cursorConfigPath,
    repositoryUrl: rawOptions.repositoryUrl ?? DEFAULT_REPOSITORY_URL,
    mcpUrl: rawOptions.mcpUrl ?? DEFAULT_MCP_URL,
    scope: rawOptions.scope ?? DEFAULT_CLAUDE_SCOPE,
    dryRun: rawOptions.dryRun ?? false,
    manual: rawOptions.manual ?? false,
    noVerify: rawOptions.noVerify ?? false,
  };

  validateOptions(options);

  const config = clientConfig(options);

  if (options.dryRun) {
    return {
      status: "dry_run",
      client: options.client,
      mcp_url: options.mcpUrl,
      checkout_path_ignored: path.resolve(options.checkoutPath),
      repository_url_ignored: options.repositoryUrl,
      ...config,
      tools: JUDGMENTKIT_MCP_TOOL_NAMES,
    };
  }

  if (options.manual) {
    return {
      status: "manual",
      client: options.client,
      mcp_url: options.mcpUrl,
      ...config,
      verification: createVerificationSkipped("--manual was supplied."),
    };
  }

  let writtenConfig = {};
  let client_verification = createVerificationSkipped("No client-specific verification is required.");

  if (options.client === "codex") {
    writtenConfig = await writeCodexConfig({
      configPath: config.config_path,
      mcpUrl: options.mcpUrl,
    });
  } else if (options.client === "cursor") {
    writtenConfig = await writeCursorConfig({
      configPath: config.config_path,
      mcpUrl: options.mcpUrl,
    });

    if (!options.noVerify && path.resolve(writtenConfig.config_path) === path.resolve(DEFAULT_CURSOR_CONFIG_PATH)) {
      client_verification = await verifyCursorClient();
    } else if (!options.noVerify) {
      client_verification = createVerificationSkipped(
        "cursor-agent verification is skipped for non-default --config-path values.",
      );
    }
  } else {
    client_verification = await installClaudeMcp({
      mcpUrl: options.mcpUrl,
      scope: options.scope,
    });
  }

  const verification = options.noVerify
    ? createVerificationSkipped("--no-verify was supplied.")
    : await verifyJudgmentKitMcp(options.mcpUrl);

  return {
    status: "installed",
    client: options.client,
    mcp_url: options.mcpUrl,
    ...writtenConfig,
    ...(options.client === "claude" ? config : {}),
    verification,
    client_verification,
  };
}

function printUsage() {
  process.stderr.write(
    [
      "Usage:",
      "  node scripts/install-mcp.mjs [--client codex|claude|cursor] [--mcp-url <url>] [--config-path <path>] [--dry-run] [--manual] [--no-verify]",
      "",
      "Defaults to --client codex and https://judgmentkit.ai/mcp.",
      "",
    ].join("\n"),
  );
}

export async function runInstallCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printUsage();
    return;
  }

  const result = await installJudgmentKitMcp(args);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runInstallCli(process.argv.slice(2));
  } catch (error) {
    if (error instanceof InstallError) {
      process.stderr.write(
        `JudgmentKit installer failed during ${error.phase}: ${error.message}\n`,
      );
    } else {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`JudgmentKit installer failed: ${message}\n`);
    }
    process.exitCode = 1;
  }
}
