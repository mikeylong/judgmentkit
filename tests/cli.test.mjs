import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "bin/judgmentkit2.mjs");

{
  const result = spawnSync(
    process.execPath,
    [cliPath, "analyze"],
    {
      input:
        "Create a UI from the account JSON schema and prompt template for the customer review workflow.",
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.contract_id, "judgmentkit2.ai-ui-generation.activity-contract");
  assert.ok(
    packet.implementation_terms_detected.some((entry) => entry.term === "JSON schema"),
  );
  assert.ok(
    packet.implementation_terms_detected.some((entry) => entry.term === "prompt template"),
  );
  assert.ok(
    packet.disclosure_policy.diagnostic_terms_detected.some(
      (entry) => entry.detected_term === "JSON schema",
    ),
  );
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit2-cli-"));
  const inputPath = path.join(tempDir, "brief.txt");

  fs.writeFileSync(
    inputPath,
    "A reviewer is deciding whether a publishing handoff is ready, blocked, or needs revision.",
  );

  const result = spawnSync(process.execPath, [cliPath, "analyze", "--input", inputPath], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.status, "ready");
  assert.ok(packet.activity_model.observed_participants.includes("reviewer"));
  assert.ok(
    packet.interaction_contract.observed_primary_decisions.some((decision) =>
      decision.includes("publishing handoff"),
    ),
  );
  assert.ok(packet.ui_brief.primary_decision.includes("publishing handoff"));
}

{
  const result = spawnSync(process.execPath, [cliPath, "analyze"], {
    input: "   ",
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  const error = JSON.parse(result.stderr);
  assert.equal(error.error.code, "invalid_input");
}

console.log("CLI checks passed.");
