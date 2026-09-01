#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const CANONICAL_AGENT_SKILL_DIR = path.join(
  PROJECT_ROOT,
  "packages",
  "agent-skill",
  "judgmentkit-hosted-mcp",
);
export const AGENT_PLUGIN_SKILL_TARGETS = [
  {
    client: "codex",
    directory: path.join(
      PROJECT_ROOT,
      "packages",
      "codex-plugin",
      "skills",
      "judgmentkit-hosted-mcp",
    ),
    overlayPaths: ["agents"],
  },
  {
    client: "claude",
    directory: path.join(
      PROJECT_ROOT,
      "packages",
      "claude-plugin",
      "skills",
      "judgmentkit-hosted-mcp",
    ),
  },
];

export class AgentPluginAdapterDriftError extends Error {
  constructor(failures) {
    super(
      `Agent plugin adapter check failed with ${failures.length} drift issue${failures.length === 1 ? "" : "s"}.`,
    );
    this.name = "AgentPluginAdapterDriftError";
    this.failures = failures;
  }
}

function normalizeRelativePath(value) {
  return value.split(path.sep).join("/");
}

function isSameOrInside(parentDir, childDir) {
  const relative = path.relative(parentDir, childDir);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeTarget(canonicalDir, targetDir) {
  const resolvedCanonicalDir = path.resolve(canonicalDir);
  const resolvedTargetDir = path.resolve(targetDir);
  const parsedTarget = path.parse(resolvedTargetDir);

  if (
    resolvedTargetDir === parsedTarget.root ||
    resolvedTargetDir === os.homedir() ||
    path.basename(resolvedTargetDir) !== "judgmentkit-hosted-mcp"
  ) {
    throw new Error(`Refusing to sync an unsafe agent-plugin skill target: ${resolvedTargetDir}`);
  }

  if (
    isSameOrInside(resolvedCanonicalDir, resolvedTargetDir) ||
    isSameOrInside(resolvedTargetDir, resolvedCanonicalDir)
  ) {
    throw new Error(
      `Refusing to sync an agent-plugin skill target that overlaps canonical source: ${resolvedTargetDir}`,
    );
  }
}

async function assertDirectory(directory, label) {
  let stat;
  try {
    stat = await fs.stat(directory);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${label} does not exist: ${directory}`);
    }
    throw error;
  }

  if (!stat.isDirectory()) {
    throw new Error(`${label} must be a directory: ${directory}`);
  }
}

async function assertCanonicalSkill(directory) {
  await assertDirectory(directory, "Canonical agent skill");
  const skillPath = path.join(directory, "SKILL.md");
  let stat;

  try {
    stat = await fs.stat(skillPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Canonical agent skill is missing SKILL.md: ${skillPath}`);
    }
    throw error;
  }

  if (!stat.isFile()) {
    throw new Error(`Canonical agent skill SKILL.md must be a file: ${skillPath}`);
  }
}

async function readTree(rootDir) {
  await assertDirectory(rootDir, "Skill directory");

  const directories = [];
  const files = [];

  async function visit(currentDir, relativeDir = "") {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const relativePath = relativeDir
        ? path.join(relativeDir, entry.name)
        : entry.name;
      const fullPath = path.join(currentDir, entry.name);
      const normalizedPath = normalizeRelativePath(relativePath);

      if (entry.isSymbolicLink()) {
        throw new Error(`Agent-plugin skill trees must not contain symlinks: ${fullPath}`);
      }

      if (entry.isDirectory()) {
        directories.push(normalizedPath);
        await visit(fullPath, relativePath);
        continue;
      }

      if (!entry.isFile()) {
        throw new Error(`Agent-plugin skill trees may contain only files and directories: ${fullPath}`);
      }

      files.push({
        relativePath: normalizedPath,
        content: await fs.readFile(fullPath),
      });
    }
  }

  await visit(rootDir);
  return {
    directories,
    files,
  };
}

function treeDigest(tree) {
  const digest = crypto.createHash("sha256");

  for (const directory of tree.directories) {
    digest.update("directory\0");
    digest.update(directory);
    digest.update("\0");
  }

  for (const file of tree.files) {
    digest.update("file\0");
    digest.update(file.relativePath);
    digest.update("\0");
    digest.update(String(file.content.byteLength));
    digest.update("\0");
    digest.update(file.content);
    digest.update("\0");
  }

  return digest.digest("hex");
}

function normalizeOverlayPaths(values = []) {
  if (!Array.isArray(values)) {
    throw new Error("Agent-plugin overlayPaths must be an array.");
  }

  return values.map((value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("Agent-plugin overlay paths must be non-empty strings.");
    }

    const normalized = normalizeRelativePath(path.normalize(value.trim()));
    if (
      path.isAbsolute(value) ||
      normalized === "." ||
      normalized === ".." ||
      normalized.startsWith("../")
    ) {
      throw new Error(`Agent-plugin overlay path must be relative and bounded: ${value}`);
    }
    return normalized.replace(/\/$/, "");
  });
}

function isOverlayPath(relativePath, overlayPaths) {
  return overlayPaths.some(
    (overlayPath) =>
      relativePath === overlayPath || relativePath.startsWith(`${overlayPath}/`),
  );
}

function assertOverlayIsolation(canonicalTree, target) {
  for (const relativePath of [
    ...canonicalTree.directories,
    ...canonicalTree.files.map((file) => file.relativePath),
  ]) {
    if (isOverlayPath(relativePath, target.overlayPaths)) {
      throw new Error(
        `Agent-plugin overlay for ${target.client} overlaps canonical path: ${relativePath}`,
      );
    }
  }
}

function canonicalProjection(canonicalTree, targetTree) {
  const targetFiles = new Map(
    targetTree.files.map((file) => [file.relativePath, file.content]),
  );
  return {
    directories: [...canonicalTree.directories],
    files: canonicalTree.files
      .filter((file) => targetFiles.has(file.relativePath))
      .map((file) => ({
        relativePath: file.relativePath,
        content: targetFiles.get(file.relativePath),
      })),
  };
}

function compareTrees(canonicalTree, targetTree, target) {
  const failures = [];
  const canonicalDirectories = new Set(canonicalTree.directories);
  const targetDirectories = new Set(targetTree.directories);
  const canonicalFiles = new Map(
    canonicalTree.files.map((file) => [file.relativePath, file.content]),
  );
  const targetFiles = new Map(
    targetTree.files.map((file) => [file.relativePath, file.content]),
  );

  for (const directory of canonicalDirectories) {
    if (!targetDirectories.has(directory)) {
      failures.push({
        client: target.client,
        target_dir: target.directory,
        path: directory,
        issue: "missing_directory",
      });
    }
  }

  for (const directory of targetDirectories) {
    if (
      !canonicalDirectories.has(directory) &&
      !isOverlayPath(directory, target.overlayPaths)
    ) {
      failures.push({
        client: target.client,
        target_dir: target.directory,
        path: directory,
        issue: "unexpected_directory",
      });
    }
  }

  for (const [relativePath, canonicalContent] of canonicalFiles) {
    const targetContent = targetFiles.get(relativePath);

    if (!targetContent) {
      failures.push({
        client: target.client,
        target_dir: target.directory,
        path: relativePath,
        issue: "missing_file",
      });
      continue;
    }

    if (!canonicalContent.equals(targetContent)) {
      failures.push({
        client: target.client,
        target_dir: target.directory,
        path: relativePath,
        issue: "content_mismatch",
      });
    }
  }

  for (const relativePath of targetFiles.keys()) {
    if (
      !canonicalFiles.has(relativePath) &&
      !isOverlayPath(relativePath, target.overlayPaths)
    ) {
      failures.push({
        client: target.client,
        target_dir: target.directory,
        path: relativePath,
        issue: "unexpected_file",
      });
    }
  }

  return failures;
}

function normalizedTargets(targets) {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("At least one agent-plugin skill target is required.");
  }

  return targets.map((target) => {
    if (
      !target ||
      typeof target.client !== "string" ||
      target.client.trim().length === 0 ||
      typeof target.directory !== "string" ||
      target.directory.trim().length === 0
    ) {
      throw new Error("Each agent-plugin skill target requires client and directory strings.");
    }

    return {
      client: target.client.trim(),
      directory: path.resolve(target.directory),
      overlayPaths: normalizeOverlayPaths(target.overlayPaths),
    };
  });
}

export async function checkAgentPluginAdapters({
  canonicalDir = CANONICAL_AGENT_SKILL_DIR,
  targets = AGENT_PLUGIN_SKILL_TARGETS,
} = {}) {
  const resolvedCanonicalDir = path.resolve(canonicalDir);
  await assertCanonicalSkill(resolvedCanonicalDir);
  const canonicalTree = await readTree(resolvedCanonicalDir);
  const canonicalDigest = treeDigest(canonicalTree);
  const failures = [];
  const checkedTargets = [];

  for (const target of normalizedTargets(targets)) {
    assertOverlayIsolation(canonicalTree, target);
    let targetTree;
    try {
      targetTree = await readTree(target.directory);
    } catch (error) {
      if (/does not exist/.test(error.message)) {
        failures.push({
          client: target.client,
          target_dir: target.directory,
          path: ".",
          issue: "missing_target",
        });
        continue;
      }
      throw error;
    }

    failures.push(
      ...compareTrees(canonicalTree, targetTree, target),
    );
    const portableTree = canonicalProjection(canonicalTree, targetTree);
    checkedTargets.push({
      client: target.client,
      directory: target.directory,
      sha256: treeDigest(portableTree),
      file_count: portableTree.files.length,
      overlay_paths: target.overlayPaths,
    });
  }

  if (failures.length > 0) {
    throw new AgentPluginAdapterDriftError(failures);
  }

  return {
    status: "passed",
    canonical_dir: resolvedCanonicalDir,
    canonical_sha256: canonicalDigest,
    file_count: canonicalTree.files.length,
    targets: checkedTargets,
  };
}

export async function syncAgentPluginAdapters({
  canonicalDir = CANONICAL_AGENT_SKILL_DIR,
  targets = AGENT_PLUGIN_SKILL_TARGETS,
} = {}) {
  const resolvedCanonicalDir = path.resolve(canonicalDir);
  await assertCanonicalSkill(resolvedCanonicalDir);
  const canonicalTree = await readTree(resolvedCanonicalDir);
  const resolvedTargets = normalizedTargets(targets);

  for (const target of resolvedTargets) {
    assertSafeTarget(resolvedCanonicalDir, target.directory);
    assertOverlayIsolation(canonicalTree, target);
    let targetTree = { directories: [], files: [] };
    try {
      targetTree = await readTree(target.directory);
    } catch (error) {
      if (!/does not exist/.test(error.message)) {
        throw error;
      }
    }
    const overlayTree = {
      directories: targetTree.directories.filter((relativePath) =>
        isOverlayPath(relativePath, target.overlayPaths),
      ),
      files: targetTree.files.filter((file) =>
        isOverlayPath(file.relativePath, target.overlayPaths),
      ),
    };

    await fs.rm(target.directory, { recursive: true, force: true });
    await fs.mkdir(target.directory, { recursive: true });

    for (const relativeDirectory of canonicalTree.directories) {
      await fs.mkdir(path.join(target.directory, relativeDirectory), {
        recursive: true,
      });
    }

    for (const file of canonicalTree.files) {
      const outputPath = path.join(target.directory, file.relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, file.content);
    }

    for (const relativeDirectory of overlayTree.directories) {
      await fs.mkdir(path.join(target.directory, relativeDirectory), {
        recursive: true,
      });
    }

    for (const file of overlayTree.files) {
      const outputPath = path.join(target.directory, file.relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, file.content);
    }
  }

  const result = await checkAgentPluginAdapters({
    canonicalDir: resolvedCanonicalDir,
    targets: resolvedTargets,
  });

  return {
    ...result,
    status: "synced",
  };
}

function parseArgs(argv) {
  const options = {
    action: "check",
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--check") {
      options.action = "check";
    } else if (arg === "--sync") {
      options.action = "sync";
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
      "  node scripts/sync-agent-plugin-adapters.mjs --check [--json]",
      "  node scripts/sync-agent-plugin-adapters.mjs --sync [--json]",
      "",
      "The canonical portable skill is copied byte-for-byte into the Codex and Claude plugin adapters.",
      "",
    ].join("\n"),
  );
}

export async function runAgentPluginAdapterCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return;
  }

  const result = options.action === "sync"
    ? await syncAgentPluginAdapters()
    : await checkAgentPluginAdapters();

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `Agent plugin adapter ${result.status}.`,
      `Canonical: ${result.canonical_dir}`,
      `SHA-256: ${result.canonical_sha256}`,
      `Targets: ${result.targets.map((target) => target.client).join(", ")}`,
      "",
    ].join("\n"),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runAgentPluginAdapterCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);

    if (error instanceof AgentPluginAdapterDriftError) {
      for (const failure of error.failures) {
        process.stderr.write(
          `- [${failure.client}] ${failure.issue}: ${failure.path}\n`,
        );
      }
    }

    process.exitCode = 1;
  }
}
