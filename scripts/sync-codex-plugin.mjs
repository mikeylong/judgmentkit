#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { buildCodexPlugin, DEFAULT_DIST_DIR } from "./build-codex-plugin.mjs";
import {
  CODEX_PLUGIN_MCP_URL,
  DEFAULT_PACKAGE_JSON_PATH,
  DEFAULT_SOURCE_DIR,
  PROJECT_ROOT,
} from "./verify-codex-plugin.mjs";

export const DEFAULT_LOCAL_PLUGIN_DIR = path.join(os.homedir(), "plugins", "judgmentkit");

function isSameOrInside(parentDir, childDir) {
  const relative = path.relative(parentDir, childDir);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function pathsOverlap(firstDir, secondDir) {
  return isSameOrInside(firstDir, secondDir) || isSameOrInside(secondDir, firstDir);
}

function assertSafeSyncTarget(targetDir, protectedDirs = []) {
  const resolvedTargetDir = path.resolve(targetDir);
  const parsed = path.parse(resolvedTargetDir);

  if (resolvedTargetDir === parsed.root || resolvedTargetDir === os.homedir()) {
    throw new Error(`Refusing to sync Codex plugin into unsafe target: ${resolvedTargetDir}`);
  }

  for (const protectedDir of protectedDirs) {
    const resolvedProtectedDir = path.resolve(protectedDir);
    if (pathsOverlap(resolvedTargetDir, resolvedProtectedDir)) {
      throw new Error(
        `Refusing to sync Codex plugin into path that overlaps protected directory ${resolvedProtectedDir}: ${resolvedTargetDir}`,
      );
    }
  }
}

function codexSuffix() {
  return `+${"codex"}.`;
}

export function createCodexSyncVersion(baseVersion, timestamp = new Date()) {
  const stamp = timestamp.toISOString().replace(/\D/g, "").slice(0, 14);
  return `${baseVersion}${codexSuffix()}${stamp}`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function rewriteSyncedPluginVersion(pluginDir, version) {
  const pluginJsonPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  const pluginJson = await readJson(pluginJsonPath);
  pluginJson.version = version;
  await writeJson(pluginJsonPath, pluginJson);
  return {
    plugin_json_path: pluginJsonPath,
    version,
  };
}

export async function syncCodexPlugin({
  sourceDir = DEFAULT_SOURCE_DIR,
  outDir = DEFAULT_DIST_DIR,
  targetDir = DEFAULT_LOCAL_PLUGIN_DIR,
  packageJsonPath = DEFAULT_PACKAGE_JSON_PATH,
  mcpUrl = CODEX_PLUGIN_MCP_URL,
  cachebuster = true,
  timestamp = new Date(),
  cleanBuild = true,
  dryRun = false,
} = {}) {
  const resolvedTargetDir = path.resolve(targetDir);
  const resolvedSourceDir = path.resolve(sourceDir);
  const requestedOutDir = path.resolve(outDir);
  const resolvedOutDir = dryRun
    ? await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-codex-plugin-dry-run-"))
    : requestedOutDir;
  assertSafeSyncTarget(resolvedTargetDir, [PROJECT_ROOT, resolvedSourceDir, requestedOutDir, resolvedOutDir]);

  const build = await buildCodexPlugin({
    sourceDir: resolvedSourceDir,
    outDir: resolvedOutDir,
    packageJsonPath,
    mcpUrl,
    clean: cleanBuild,
  });

  if (!dryRun) {
    await fs.rm(resolvedTargetDir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(resolvedTargetDir), { recursive: true });
    await fs.cp(build.out_dir, resolvedTargetDir, {
      recursive: true,
      force: true,
    });
  }

  let syncedVersion = build.output_verification.plugin_version;
  let versionRewrite = null;

  if (cachebuster) {
    syncedVersion = createCodexSyncVersion(build.output_verification.plugin_version, timestamp);
    if (!dryRun) {
      versionRewrite = await rewriteSyncedPluginVersion(resolvedTargetDir, syncedVersion);
    }
  }

  return {
    status: dryRun ? "dry_run" : "synced",
    source_dir: build.source_dir,
    build_dir: build.out_dir,
    target_dir: resolvedTargetDir,
    source_version: build.output_verification.plugin_version,
    synced_version: syncedVersion,
    cachebuster,
    dry_run: dryRun,
    version_rewrite: versionRewrite,
  };
}

function parseArgs(argv) {
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    outDir: DEFAULT_DIST_DIR,
    targetDir: DEFAULT_LOCAL_PLUGIN_DIR,
    packageJsonPath: DEFAULT_PACKAGE_JSON_PATH,
    mcpUrl: CODEX_PLUGIN_MCP_URL,
    cachebuster: true,
    cleanBuild: true,
    dryRun: false,
    timestamp: undefined,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--source") {
      options.sourceDir = argv[++index];
    } else if (arg === "--out") {
      options.outDir = argv[++index];
    } else if (arg === "--target") {
      options.targetDir = argv[++index];
    } else if (arg === "--package") {
      options.packageJsonPath = argv[++index];
    } else if (arg === "--mcp-url") {
      options.mcpUrl = argv[++index];
    } else if (arg === "--timestamp") {
      options.timestamp = new Date(argv[++index]);
    } else if (arg === "--no-cachebuster") {
      options.cachebuster = false;
    } else if (arg === "--no-clean-build") {
      options.cleanBuild = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  if (options.timestamp && Number.isNaN(options.timestamp.getTime())) {
    throw new Error("--timestamp must be a valid date or ISO timestamp.");
  }

  return options;
}

function printUsage() {
  process.stderr.write(
    [
      "Usage:",
      "  node scripts/sync-codex-plugin.mjs [--source <dir>] [--out <dir>] [--target <dir>] [--package <package.json>] [--mcp-url <url>] [--timestamp <iso>] [--no-cachebuster] [--dry-run] [--json]",
      "",
      `Defaults to ${path.relative(PROJECT_ROOT, DEFAULT_SOURCE_DIR)} -> ${path.relative(PROJECT_ROOT, DEFAULT_DIST_DIR)} -> ${DEFAULT_LOCAL_PLUGIN_DIR}.`,
      "",
    ].join("\n"),
  );
}

export async function runSyncCodexPluginCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return;
  }

  const result = await syncCodexPlugin(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      result.dry_run ? "Codex plugin sync dry run complete." : "Codex plugin sync complete.",
      `Target: ${result.target_dir}`,
      `Source version: ${result.source_version}`,
      `Synced version: ${result.synced_version}`,
      "",
    ].join("\n"),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runSyncCodexPluginCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Codex plugin sync failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
