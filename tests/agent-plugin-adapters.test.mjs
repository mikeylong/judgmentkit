import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AGENT_PLUGIN_SKILL_TARGETS,
  AgentPluginAdapterDriftError,
  CANONICAL_AGENT_SKILL_DIR,
  checkAgentPluginAdapters,
  syncAgentPluginAdapters,
} from "../scripts/sync-agent-plugin-adapters.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const claudePluginDir = path.join(root, "packages", "claude-plugin");

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function assertAdapterDrift(operation, expectedIssue, expectedClient) {
  await assert.rejects(operation, (error) => {
    assert.ok(error instanceof AgentPluginAdapterDriftError);
    assert.ok(
      error.failures.some(
        (failure) =>
          failure.issue === expectedIssue &&
          (!expectedClient || failure.client === expectedClient),
      ),
      `expected ${expectedIssue} drift for ${expectedClient ?? "any client"}`,
    );
    return true;
  });
}

{
  const manifest = await readJson(
    path.join(claudePluginDir, ".claude-plugin", "plugin.json"),
  );
  const mcpConfig = await readJson(path.join(claudePluginDir, ".mcp.json"));
  const codexManifest = await readJson(
    path.join(root, "packages", "codex-plugin", ".codex-plugin", "plugin.json"),
  );
  const codexMcpConfig = await readJson(
    path.join(root, "packages", "codex-plugin", ".mcp.json"),
  );

  assert.equal(manifest.name, "judgmentkit");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.version, codexManifest.version);
  assert.equal(typeof manifest.description, "string");
  assert.ok(manifest.description.length > 0);
  assert.deepEqual(Object.keys(mcpConfig), ["mcpServers"]);
  assert.deepEqual(mcpConfig, {
    mcpServers: {
      judgmentkit: {
        type: "http",
        url: "https://judgmentkit.ai/mcp",
      },
    },
  });
  assert.deepEqual(
    mcpConfig.mcpServers.judgmentkit,
    codexMcpConfig.mcpServers.judgmentkit,
  );
}

{
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "judgmentkit-agent-plugin-adapters-"),
  );
  const canonicalDir = path.join(
    tempDir,
    "canonical",
    "judgmentkit-hosted-mcp",
  );
  const targets = [
    {
      client: "codex",
      directory: path.join(
        tempDir,
        "codex",
        "skills",
        "judgmentkit-hosted-mcp",
      ),
      overlayPaths: ["agents"],
    },
    {
      client: "claude",
      directory: path.join(
        tempDir,
        "claude",
        "skills",
        "judgmentkit-hosted-mcp",
      ),
    },
  ];

  try {
    await writeFile(
      path.join(canonicalDir, "SKILL.md"),
      "---\nname: judgmentkit-hosted-mcp\n---\n\n# Canonical\n",
    );
    await writeFile(
      path.join(canonicalDir, "references", "guide.md"),
      "# Portable guidance\n",
    );

    await writeFile(
      path.join(targets[0].directory, "codex-overlay", "metadata.txt"),
      "not declared as an overlay\n",
    );
    await writeFile(
      path.join(targets[0].directory, "agents", "openai.yaml"),
      "interface:\n  display_name: Codex overlay\n",
    );

    const firstSync = await syncAgentPluginAdapters({
      canonicalDir,
      targets,
    });
    assert.equal(firstSync.status, "synced");
    assert.equal(firstSync.targets.length, 2);
    assert.ok(
      firstSync.targets.every(
        (target) => target.sha256 === firstSync.canonical_sha256,
      ),
    );
    assert.equal(
      await fs.readFile(
        path.join(targets[0].directory, "agents", "openai.yaml"),
        "utf8",
      ),
      "interface:\n  display_name: Codex overlay\n",
    );
    await assert.rejects(
      () => fs.access(path.join(targets[0].directory, "codex-overlay")),
      (error) => error.code === "ENOENT",
    );

    const secondSync = await syncAgentPluginAdapters({
      canonicalDir,
      targets,
    });
    assert.equal(secondSync.canonical_sha256, firstSync.canonical_sha256);

    await fs.appendFile(path.join(targets[0].directory, "SKILL.md"), "drift\n");
    await assertAdapterDrift(
      () => checkAgentPluginAdapters({ canonicalDir, targets }),
      "content_mismatch",
      "codex",
    );

    await syncAgentPluginAdapters({ canonicalDir, targets });
    await writeFile(path.join(targets[1].directory, "extra.md"), "drift\n");
    await assertAdapterDrift(
      () => checkAgentPluginAdapters({ canonicalDir, targets }),
      "unexpected_file",
      "claude",
    );

    await fs.rm(targets[1].directory, { recursive: true, force: true });
    await assertAdapterDrift(
      () => checkAgentPluginAdapters({ canonicalDir, targets }),
      "missing_target",
      "claude",
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

await fs.access(path.join(CANONICAL_AGENT_SKILL_DIR, "SKILL.md"));
assert.deepEqual(
  AGENT_PLUGIN_SKILL_TARGETS.map((target) => target.client),
  ["codex", "claude"],
);

const repositoryCheck = await checkAgentPluginAdapters();
assert.equal(repositoryCheck.status, "passed");
assert.equal(repositoryCheck.targets.length, 2);
assert.ok(
  repositoryCheck.targets.every(
    (target) => target.sha256 === repositoryCheck.canonical_sha256,
  ),
);
await assert.rejects(
  () =>
    fs.access(
      path.join(
        claudePluginDir,
        "skills",
        "judgmentkit-hosted-mcp",
        "agents",
        "openai.yaml",
      ),
    ),
  (error) => error.code === "ENOENT",
);

console.log("Agent plugin adapter checks passed.");
