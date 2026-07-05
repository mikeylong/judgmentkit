#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  CODEX_PLUGIN_MCP_URL,
  DEFAULT_PACKAGE_JSON_PATH,
  DEFAULT_SOURCE_DIR,
  PROJECT_ROOT,
  verifyCodexPlugin,
} from "./verify-codex-plugin.mjs";

export const DEFAULT_DIST_DIR = path.join(DEFAULT_SOURCE_DIR, "dist", "judgmentkit");
export const PLUGIN_BUILD_ENTRIES = [
  "package.json",
  ".codex-plugin",
  ".mcp.json",
  "skills",
];

function assertDistinctPaths(sourceDir, outDir) {
  const resolvedSourceDir = path.resolve(sourceDir);
  const resolvedOutDir = path.resolve(outDir);
  const sourceRelativeToOut = path.relative(resolvedOutDir, resolvedSourceDir);
  const outRelativeToSource = path.relative(resolvedSourceDir, resolvedOutDir);

  if (resolvedSourceDir === resolvedOutDir || !sourceRelativeToOut.startsWith("..")) {
    throw new Error(`Build output must not contain, or be contained by, source directory: ${resolvedOutDir}`);
  }

  if (!outRelativeToSource.startsWith("..") && !outRelativeToSource.split(path.sep).includes("dist")) {
    throw new Error(`Build output inside source directory must be under dist/: ${resolvedOutDir}`);
  }
}

async function copyIfPresent(sourcePath, outPath) {
  try {
    await fs.cp(sourcePath, outPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function buildCodexPlugin({
  sourceDir = DEFAULT_SOURCE_DIR,
  outDir = DEFAULT_DIST_DIR,
  packageJsonPath = DEFAULT_PACKAGE_JSON_PATH,
  mcpUrl = CODEX_PLUGIN_MCP_URL,
  clean = true,
} = {}) {
  const resolvedSourceDir = path.resolve(sourceDir);
  const resolvedOutDir = path.resolve(outDir);
  const resolvedPackageJsonPath = path.resolve(packageJsonPath);

  assertDistinctPaths(resolvedSourceDir, resolvedOutDir);

  const sourceVerification = await verifyCodexPlugin({
    sourceDir: resolvedSourceDir,
    packageJsonPath: resolvedPackageJsonPath,
    mcpUrl,
  });

  await fs.rm(resolvedOutDir, { recursive: true, force: true });
  await fs.mkdir(resolvedOutDir, { recursive: true });

  const copiedEntries = [];
  for (const entry of PLUGIN_BUILD_ENTRIES) {
    const didCopy = await copyIfPresent(path.join(resolvedSourceDir, entry), path.join(resolvedOutDir, entry));
    if (didCopy) copiedEntries.push(entry);
  }

  const outputVerification = await verifyCodexPlugin({
    sourceDir: resolvedOutDir,
    packageJsonPath: path.join(resolvedOutDir, "package.json"),
    mcpUrl,
  });

  return {
    status: "built",
    source_dir: resolvedSourceDir,
    out_dir: resolvedOutDir,
    copied_entries: copiedEntries,
    source_verification: sourceVerification,
    output_verification: outputVerification,
  };
}

function parseArgs(argv) {
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    outDir: DEFAULT_DIST_DIR,
    packageJsonPath: DEFAULT_PACKAGE_JSON_PATH,
    mcpUrl: CODEX_PLUGIN_MCP_URL,
    clean: true,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--source") {
      options.sourceDir = argv[++index];
    } else if (arg === "--out") {
      options.outDir = argv[++index];
    } else if (arg === "--package") {
      options.packageJsonPath = argv[++index];
    } else if (arg === "--mcp-url") {
      options.mcpUrl = argv[++index];
    } else if (arg === "--no-clean") {
      throw new Error("--no-clean is not supported for Codex plugin builds.");
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
      "  node scripts/build-codex-plugin.mjs [--source <dir>] [--out <dir>] [--package <package.json>] [--mcp-url <url>] [--no-clean] [--json]",
      "",
      `Defaults to ${path.relative(PROJECT_ROOT, DEFAULT_SOURCE_DIR)} -> ${path.relative(PROJECT_ROOT, DEFAULT_DIST_DIR)}.`,
      "",
    ].join("\n"),
  );
}

export async function runBuildCodexPluginCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return;
  }

  const result = await buildCodexPlugin(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      "Codex plugin build complete.",
      `Source: ${result.source_dir}`,
      `Output: ${result.out_dir}`,
      `Version: ${result.output_verification.plugin_version}`,
      "",
    ].join("\n"),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runBuildCodexPluginCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Codex plugin build failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
