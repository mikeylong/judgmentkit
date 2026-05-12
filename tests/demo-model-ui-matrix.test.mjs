import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-model-ui-matrix.mjs");
const outputDir = path.join(root, "examples/model-ui/refund-system-map");
const manifestPath = path.join(outputDir, "manifest.json");
const handoffPath = path.join(outputDir, "reviewed-handoff.fixture.json");
const designSystemPath = path.join(outputDir, "design-system-adapter.json");
const indexPath = path.join(outputDir, "index.html");

const EXPECTED_MATRIX = [
  ["deterministic-without-design-system", "Deterministic renderer", "without_design_system"],
  ["deterministic-with-design-system", "Deterministic renderer", "with_design_system"],
  ["gemma4-without-design-system", "Gemma 4 (local LLM)", "without_design_system"],
  ["gemma4-with-design-system", "Gemma 4 (local LLM)", "with_design_system"],
  ["gpt55-without-design-system", "GPT-5.5", "without_design_system"],
  ["gpt55-with-design-system", "GPT-5.5", "with_design_system"],
];

const IMPLEMENTATION_TERMS = [
  "database table",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sectionBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(start, -1, `Missing section start: ${startMarker}`);
  assert.notEqual(end, -1, `Missing section end: ${endMarker}`);

  return text.slice(start, end);
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
}

function readProvenance(html) {
  const match = html.match(
    /<script type="application\/json" id="model-ui-provenance">([\s\S]*?)<\/script>/,
  );
  assert.ok(match, "Missing model UI provenance script.");
  return JSON.parse(match[1]);
}

const result = spawnSync(process.execPath, [scriptPath], {
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");
assert.ok(result.stdout.includes("# JudgmentKit Model UI Matrix"));
assert.ok(result.stdout.includes("Source brief: examples/demo/refund-ops-implementation-heavy.brief.txt"));
assert.ok(result.stdout.includes("Matrix: examples/model-ui/refund-system-map/index.html"));
assert.ok(result.stdout.includes("Artifacts: 6"));

assert.equal(fs.existsSync(manifestPath), true);
assert.equal(fs.existsSync(handoffPath), true);
assert.equal(fs.existsSync(designSystemPath), true);
assert.equal(fs.existsSync(indexPath), true);

const manifest = readJson(manifestPath);
const handoff = readJson(handoffPath);
const designSystem = readJson(designSystemPath);
const indexHtml = fs.readFileSync(indexPath, "utf8");

assert.equal(manifest.matrix_id, "refund-system-map-model-ui-v1");
assert.equal(manifest.title, "Model UI generation matrix");
assert.equal(
  manifest.source_brief_file,
  "examples/demo/refund-ops-implementation-heavy.brief.txt",
);
assert.equal(
  manifest.reviewed_handoff_file,
  "examples/model-ui/refund-system-map/reviewed-handoff.fixture.json",
);
assert.equal(
  manifest.design_system_adapter_file,
  "examples/model-ui/refund-system-map/design-system-adapter.json",
);
assert.ok(manifest.generation_policy.includes("never call a live model"));
assert.deepEqual(manifest.model_labels, [
  "Deterministic renderer",
  "Gemma 4 (local LLM)",
  "GPT-5.5",
]);
assert.equal(manifest.artifacts.length, 6);
assert.equal(handoff.handoff_status, "ready_for_generation");
assert.equal(designSystem.scope, "example-only");
assert.equal(
  designSystem.constraint.includes("does not change the activity"),
  true,
);
assert.ok(indexHtml.includes("Model UI generation matrix"));
assert.ok(indexHtml.includes("Gemma 4 (local LLM)"));
assert.ok(indexHtml.includes("GPT-5.5"));

for (const [id, modelLabel, designSystemMode] of EXPECTED_MATRIX) {
  const entry = manifest.artifacts.find((artifact) => artifact.id === id);
  assert.ok(entry, `missing manifest artifact ${id}`);
  assert.equal(entry.model_label, modelLabel);
  assert.equal(entry.design_system_mode, designSystemMode);
  assert.equal(
    entry.source_brief_file,
    "examples/demo/refund-ops-implementation-heavy.brief.txt",
  );
  assert.equal(
    entry.handoff_source,
    "examples/model-ui/refund-system-map/reviewed-handoff.fixture.json",
  );
  assert.ok(entry.prompt_sha256);
  assert.ok(entry.capture_provenance.status);

  if (designSystemMode === "with_design_system") {
    assert.equal(
      entry.design_system_adapter_file,
      "examples/model-ui/refund-system-map/design-system-adapter.json",
    );
  } else {
    assert.equal(entry.design_system_adapter_file, null);
  }

  if (entry.generation_source === "captured_model_output") {
    assert.ok(
      ["captured", "capture-required"].includes(entry.capture_provenance.status),
      `model artifact ${id} must either carry real capture provenance or say capture-required`,
    );
  }

  const artifactPath = path.join(outputDir, entry.artifact_path);
  assert.equal(fs.existsSync(artifactPath), true, `missing artifact ${id}`);

  const artifactHtml = fs.readFileSync(artifactPath, "utf8");
  const provenance = readProvenance(artifactHtml);
  const primarySurface = visibleText(
    sectionBetween(artifactHtml, "data-primary-surface", "model-ui-provenance"),
  );

  assert.equal(provenance.matrix_id, manifest.matrix_id);
  assert.equal(provenance.artifact_id, id);
  assert.equal(provenance.model_label, modelLabel);
  assert.equal(provenance.design_system_mode, designSystemMode);
  assert.equal(provenance.artifact_path, entry.artifact_path);
  assert.deepEqual(provenance.capture_provenance, entry.capture_provenance);
  assert.ok(artifactHtml.includes('id="model-ui-provenance"'));
  assert.ok(primarySurface.includes("Refund Review Workspace"));
  assert.ok(primarySurface.includes("Evidence"));
  assert.ok(primarySurface.includes("Decision path"));
  assert.ok(primarySurface.includes("Handoff"));

  for (const term of IMPLEMENTATION_TERMS) {
    assert.equal(
      primarySurface.toLowerCase().includes(term.toLowerCase()),
      false,
      `primary UI for ${id} leaked implementation term: ${term}`,
    );
  }
}

console.log("model UI matrix checks passed.");
