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
export const DEFAULT_CHECKOUT_PATH = path.join(os.homedir(), ".codex", "judgmentkit");
export const DEFAULT_CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");
export const DEFAULT_MCP_ENDPOINT_URL =
  process.env.JUDGMENTKIT_MCP_ENDPOINT_URL ?? "https://judgmentkit.ai/mcp";

export const JUDGMENTKIT_MCP_TOOL_NAMES = [
  "analyze_implementation_brief",
  "create_activity_model_review",
  "recommend_ui_workflow_profiles",
  "review_activity_model_candidate",
  "review_ui_workflow_candidate",
  "create_ui_generation_handoff",
];

const SUPPORTED_CLIENTS = new Set(["codex"]);

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

export function createCodexConfigBlock(_checkoutPath, endpointUrl = DEFAULT_MCP_ENDPOINT_URL) {
  return [
    "[mcp_servers.judgmentkit]",
    `url = ${tomlString(endpointUrl)}`,
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

export async function writeCodexConfig({ configPath, checkoutPath }) {
  const resolvedConfigPath = path.resolve(configPath);
  const block = createCodexConfigBlock(checkoutPath);
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
    mcp_transport: "streamable-http",
    mcp_endpoint_url: DEFAULT_MCP_ENDPOINT_URL,
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
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
      if (code === 0) {
        resolve({ stdout, stderr });
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

export async function verifyJudgmentKitMcp(_checkoutPath, options = {}) {
  let transport;
  let client;
  const endpointUrl = options.endpointUrl ?? DEFAULT_MCP_ENDPOINT_URL;

  try {
    transport = new StreamableHTTPClientTransport(new URL(endpointUrl));

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
      endpoint_url: endpointUrl,
      tools: toolNames,
    };
  } finally {
    await transport?.close();
  }
}

function parseArgs(argv) {
  const parsed = {
    client: "codex",
    checkoutPath: DEFAULT_CHECKOUT_PATH,
    configPath: DEFAULT_CODEX_CONFIG_PATH,
    repositoryUrl: DEFAULT_REPOSITORY_URL,
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
    } else if (arg === "--repository-url") {
      parsed.repositoryUrl = argv[++index];
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
  if (!SUPPORTED_CLIENTS.has(options.client)) {
    throw new InstallError("JudgmentKit install currently supports --client codex only.", "args");
  }

  for (const [name, value] of [
    ["--path", options.checkoutPath],
    ["--config-path", options.configPath],
    ["--repository-url", options.repositoryUrl],
  ]) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new InstallError(`${name} requires a non-empty value.`, "args");
    }
  }
}

export async function installJudgmentKitMcp(rawOptions = {}) {
  const options = {
    client: rawOptions.client ?? "codex",
    checkoutPath: rawOptions.checkoutPath ?? DEFAULT_CHECKOUT_PATH,
    configPath: rawOptions.configPath ?? DEFAULT_CODEX_CONFIG_PATH,
    repositoryUrl: rawOptions.repositoryUrl ?? DEFAULT_REPOSITORY_URL,
    dryRun: rawOptions.dryRun ?? false,
    manual: rawOptions.manual ?? false,
    noVerify: rawOptions.noVerify ?? false,
  };

  validateOptions(options);

  const checkoutPath = path.resolve(options.checkoutPath);
  const configPath = path.resolve(options.configPath);
  const configBlock = createCodexConfigBlock(checkoutPath);

  if (options.dryRun) {
    return {
      status: "dry_run",
      client: options.client,
      checkout_path: checkoutPath,
      config_path: configPath,
      repository_url: options.repositoryUrl,
      mcp_transport: "streamable-http",
      mcp_endpoint_url: DEFAULT_MCP_ENDPOINT_URL,
      config_block: configBlock,
      tools: JUDGMENTKIT_MCP_TOOL_NAMES,
    };
  }

  try {
    await fs.access(path.join(checkoutPath, ".git"));
  } catch {
    await fs.mkdir(path.dirname(checkoutPath), { recursive: true });
    await runCommand("git", ["clone", options.repositoryUrl, checkoutPath], { phase: "clone" });
  }

  await runCommand("npm", ["install"], { cwd: checkoutPath, phase: "install" });

  const config = options.manual
    ? {
        config_path: configPath,
        config_block: configBlock,
        manual: true,
        mcp_transport: "streamable-http",
        mcp_endpoint_url: DEFAULT_MCP_ENDPOINT_URL,
      }
    : await writeCodexConfig({ configPath, checkoutPath });

  const verification = options.noVerify
    ? { verified: false, skipped: true, tools: JUDGMENTKIT_MCP_TOOL_NAMES }
    : await verifyJudgmentKitMcp(checkoutPath);

  return {
    status: "installed",
    client: options.client,
    checkout_path: checkoutPath,
    repository_url: options.repositoryUrl,
    ...config,
    verification,
  };
}

function printUsage() {
  process.stderr.write(
    [
      "Usage:",
      "  node scripts/install-mcp.mjs --client codex [--path <checkout-path>] [--config-path <path>] [--dry-run] [--manual] [--no-verify]",
      "",
    ].join("\n"),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printUsage();
      process.exit(0);
    }

    const result = await installJudgmentKitMcp(args);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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
