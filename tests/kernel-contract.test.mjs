import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const contract = readJson("contracts/ai-ui-generation.activity-contract.json");

assert.equal(contract.source_model, "fresh_v2");
assert.deepEqual(contract.quality_order.slice(0, 4), [
  "activity fit",
  "domain appropriateness",
  "succinct interaction",
  "decision support",
]);
assert.equal(contract.quality_order.at(-1), "aesthetic fit");

for (const section of [
  "activity_model",
  "interaction_contract",
  "disclosure_policy",
  "evaluation",
]) {
  assert.ok(contract[section], `Missing ${section}`);
}

const hiddenTerms = new Set(contract.activity_model.implementation_concepts_to_hide);
for (const term of [
  "MCP server",
  "tools/list",
  "tool call",
  "prompt template",
  "JSON schema",
  "resource id",
]) {
  assert.ok(hiddenTerms.has(term), `Expected ${term} to be hidden by default`);
  assert.ok(
    contract.disclosure_policy.primary_ui_must_not_show.includes(term),
    `Expected ${term} to be excluded from primary UI`,
  );
}

assert.ok(
  contract.non_goals.some((goal) => goal.includes("design system")),
  "The kernel must reject design-system-first framing.",
);
assert.ok(
  contract.evaluation.failure_signals.some((signal) =>
    signal.includes("visual style changes as the main fix"),
  ),
  "The kernel must fail aesthetic-first fixes.",
);

const readme = readText("README.md");
assert.ok(
  readme.includes("Aesthetics are adapter-layer work"),
  "README must keep aesthetics as a later adapter.",
);
assert.ok(!readme.includes("/Users/mike/judgmentkit"), "README must not anchor to v1 path.");

for (const staleFile of [
  "contracts/design-tokens.schema.json",
  "contracts/component-rules.json",
]) {
  assert.equal(fs.existsSync(path.join(root, staleFile)), false, `${staleFile} should not exist`);
}

console.log("JudgmentKit 2 kernel contract checks passed.");
