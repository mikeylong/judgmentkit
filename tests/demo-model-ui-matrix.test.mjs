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
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
assert.equal(designSystem.design_system_name, "Material UI");
assert.equal(designSystem.design_system_package, "@mui/material");
assert.equal(designSystem.render_mode, "static-ssr");
assert.ok(designSystem.components.includes("Button"));
assert.ok(designSystem.components.includes("Paper"));
assert.equal(
  designSystem.constraint.includes("does not change the activity"),
  true,
);
assert.ok(manifest.generation_policy.includes("Model transcripts are provenance"));
assert.ok(manifest.generation_policy.includes("visible artifacts are rendered"));
assert.equal(manifest.design_system_name, "Material UI");
assert.equal(manifest.design_system_package, "@mui/material");
assert.equal(manifest.design_system_render_mode, "static-ssr");
assert.ok(indexHtml.includes("Model UI generation matrix"));
assert.ok(indexHtml.includes("Gemma 4 (local LLM)"));
assert.ok(indexHtml.includes("GPT-5.5"));
assert.ok(indexHtml.includes("committed capture transcripts"));
assert.ok(indexHtml.includes("Material UI adapter"));
assert.ok(indexHtml.includes("visible artifacts are rendered from the reviewed handoff"));
assert.equal(indexHtml.includes("capture-required"), false);
assert.ok(indexHtml.includes("Thumbnail gallery"));
assert.ok(indexHtml.includes('class="gallery"'));
assert.ok(indexHtml.includes('data-carousel'));
assert.ok(indexHtml.includes('data-carousel-open="0"'));
assert.ok(indexHtml.includes("Open live artifact"));
assert.ok(indexHtml.includes("Open image"));
assert.ok(indexHtml.includes("Gemma 4 via LM Studio lms"));
assert.ok(indexHtml.includes("GPT-5.5 via codex exec"));
assert.ok(indexHtml.includes("Deterministic renderer · without design system"));
assert.ok(indexHtml.includes("with Material UI adapter"));
assert.equal(indexHtml.includes("with design-system adapter"), false);

for (const [id, modelLabel, designSystemMode] of EXPECTED_MATRIX) {
  const entry = manifest.artifacts.find((artifact) => artifact.id === id);
  const withMaterialUi = designSystemMode === "with_design_system";
  const expectedVisibleRenderSource = withMaterialUi
    ? "reviewed_handoff_material_ui_adapter"
    : "reviewed_handoff_simple_renderer";
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
  assert.ok(entry.source_context_sha256);
  assert.ok(entry.capture_provenance.status);
  assert.equal(entry.screenshot_path, `screenshots/${id}.png`);
  assert.equal(entry.visible_render_source, expectedVisibleRenderSource);
  assert.ok(entry.rendering_policy.includes("visible UI is rendered"));
  assert.ok(entry.approach_title);
  assert.ok(entry.approach_caption);
  assert.ok(entry.approach_caption.includes("visible snapshot") || entry.approach_caption.includes("visible UI"));
  assert.ok(indexHtml.includes(entry.screenshot_path));
  assert.ok(indexHtml.includes(entry.approach_title));

  const screenshotPath = path.join(outputDir, entry.screenshot_path);
  assert.equal(fs.existsSync(screenshotPath), true, `missing screenshot for ${id}`);
  const screenshot = fs.readFileSync(screenshotPath);
  assert.equal(
    screenshot.subarray(0, pngSignature.length).equals(pngSignature),
    true,
    `invalid PNG screenshot for ${id}`,
  );

  if (withMaterialUi) {
    assert.equal(
      entry.design_system_adapter_file,
      "examples/model-ui/refund-system-map/design-system-adapter.json",
    );
    assert.equal(entry.design_system_name, "Material UI");
    assert.equal(entry.design_system_package, "@mui/material");
    assert.ok(entry.approach_title.includes("with Material UI adapter"));
    assert.ok(entry.rendering_policy.includes("Material UI adapter"));
  } else {
    assert.equal(entry.design_system_adapter_file, null);
    assert.equal(entry.design_system_name, null);
    assert.equal(entry.design_system_package, null);
  }

  if (entry.generation_source === "captured_model_output") {
    assert.equal(entry.capture_provenance.status, "captured");
    assert.ok(entry.capture_file, `model artifact ${id} must link a transcript file`);
    assert.equal(entry.capture_provenance.transcript_file, entry.capture_file);
    assert.ok(entry.capture_provenance.prompt_sha256);
    assert.ok(entry.capture_provenance.raw_response_sha256);
    assert.ok(entry.capture_provenance.source_context_sha256);

    const capturePath = path.join(outputDir, entry.capture_file);
    assert.equal(fs.existsSync(capturePath), true, `missing capture transcript for ${id}`);
    const capture = readJson(capturePath);
    assert.equal(capture.artifact_id, id);
    assert.equal(capture.model_label, modelLabel);
    assert.equal(capture.design_system_mode, designSystemMode);
    assert.equal(capture.source_context_sha256, entry.capture_provenance.source_context_sha256);
    assert.equal(capture.source_context_sha256, entry.source_context_sha256);
    assert.equal(capture.prompt_sha256, entry.prompt_sha256);
    assert.equal(capture.prompt_sha256, entry.capture_provenance.prompt_sha256);
    assert.ok(capture.prompt_sha256);
    assert.ok(capture.raw_response_sha256);
    if (withMaterialUi) {
      assert.equal(capture.design_system_name, "Material UI");
      assert.equal(capture.design_system_package, "@mui/material");
      assert.equal(capture.design_system_render_mode, "static-ssr");
      assert.equal(entry.capture_provenance.design_system_name, "Material UI");
      assert.equal(entry.capture_provenance.design_system_package, "@mui/material");
    } else {
      assert.equal(capture.design_system_name, null);
      assert.equal(capture.design_system_package, null);
    }
    assert.ok(capture.raw_response);
    assert.ok(capture.parsed.html.includes("data-primary-surface"));
    assert.ok(entry.rendering_policy.includes("raw model transcript is committed as provenance"));
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
  assert.equal(provenance.design_system_name, entry.design_system_name);
  assert.equal(provenance.design_system_package, entry.design_system_package);
  assert.equal(provenance.visible_render_source, entry.visible_render_source);
  assert.equal(provenance.rendering_policy, entry.rendering_policy);
  assert.equal(provenance.artifact_path, entry.artifact_path);
  assert.equal(provenance.screenshot_path, entry.screenshot_path);
  assert.equal(provenance.approach_title, entry.approach_title);
  assert.equal(provenance.approach_caption, entry.approach_caption);
  assert.deepEqual(provenance.capture_provenance, entry.capture_provenance);
  assert.ok(artifactHtml.includes('id="model-ui-provenance"'));
  assert.equal(artifactHtml.includes('<p class="capture-warning">'), false);
  assert.equal(artifactHtml.includes("Capture required"), false);
  assert.ok(artifactHtml.includes('class="app-header"'));
  assert.ok(artifactHtml.includes('class="workspace"'));
  assert.ok(artifactHtml.includes('class="queue"'));
  assert.ok(artifactHtml.includes('class="detail"'));
  assert.ok(artifactHtml.includes('class="info-grid"'));
  assert.ok(artifactHtml.includes('class="evidence-list"'));
  assert.ok(artifactHtml.includes('class="policy"'));
  assert.ok(artifactHtml.includes('class="actions"'));
  assert.ok(artifactHtml.includes('class="handoff"'));
  assert.equal(artifactHtml.includes('<li class="check"'), false);
  assert.equal((artifactHtml.match(/<span class="check">/g) ?? []).length, 3);
  if (withMaterialUi) {
    assert.ok(artifactHtml.includes('data-emotion="mui'));
    assert.ok(artifactHtml.includes("MuiButton-root"));
    assert.ok(artifactHtml.includes("MuiPaper-root"));
    assert.ok(artifactHtml.includes("Material UI adapter"));
  } else {
    assert.equal(artifactHtml.includes('data-emotion="mui'), false);
    assert.equal(artifactHtml.includes("MuiButton-root"), false);
    assert.equal(artifactHtml.includes("MuiPaper-root"), false);
  }
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
