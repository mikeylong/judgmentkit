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

const ROWS = [
  ["deterministic", "Deterministic renderer", "deterministic", null],
  ["gemma4-lms", "Gemma 4 (local LLM)", "captured_model_output", null],
  ["gpt55-xhigh-codex", "GPT-5.5", "captured_model_output", "xhigh"],
];

const COLUMNS = [
  ["no-judgmentkit", "Raw brief", "no_judgmentkit", "none", false, false],
  ["with-judgmentkit", "JudgmentKit handoff", "with_judgmentkit", "none", true, false],
  ["material-ui-only", "Material UI only", "no_judgmentkit", "material_ui", false, true],
  ["judgmentkit-material-ui", "JudgmentKit + Material UI", "with_judgmentkit", "material_ui", true, true],
];

const LEGACY_ALIAS_PATHS = [
  ["artifacts", "deterministic-without-design-system.html"],
  ["artifacts", "deterministic-with-design-system.html"],
  ["artifacts", "gemma4-without-design-system.html"],
  ["artifacts", "gemma4-with-design-system.html"],
  ["artifacts", "gpt55-without-design-system.html"],
  ["artifacts", "gpt55-with-design-system.html"],
  ["screenshots", "deterministic-without-design-system.png"],
  ["screenshots", "deterministic-with-design-system.png"],
  ["screenshots", "gemma4-without-design-system.png"],
  ["screenshots", "gemma4-with-design-system.png"],
  ["screenshots", "gpt55-without-design-system.png"],
  ["screenshots", "gpt55-with-design-system.png"],
];

const IMPLEMENTATION_TERMS = [
  "database table",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
  "refund_case",
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

function compactText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function readProvenance(html) {
  const match = html.match(
    /<script type="application\/json" id="model-ui-provenance">([\s\S]*?)<\/script>/,
  );
  assert.ok(match, "Missing model UI provenance script.");
  return JSON.parse(match[1]);
}

function assertPng(filePath) {
  assert.equal(fs.existsSync(filePath), true, `missing PNG ${filePath}`);
  const screenshot = fs.readFileSync(filePath);
  assert.equal(
    screenshot.subarray(0, pngSignature.length).equals(pngSignature),
    true,
    `invalid PNG screenshot ${filePath}`,
  );
}

const result = spawnSync(process.execPath, [scriptPath], {
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");
assert.ok(result.stdout.includes("# JudgmentKit Model UI Matrix"));
assert.ok(result.stdout.includes("Source brief: examples/demo/refund-ops-implementation-heavy.brief.txt"));
assert.ok(result.stdout.includes("Matrix: examples/model-ui/refund-system-map/index.html"));
assert.ok(result.stdout.includes("Artifacts: 12"));

assert.equal(fs.existsSync(manifestPath), true);
assert.equal(fs.existsSync(handoffPath), true);
assert.equal(fs.existsSync(designSystemPath), true);
assert.equal(fs.existsSync(indexPath), true);

const manifest = readJson(manifestPath);
const handoff = readJson(handoffPath);
const designSystem = readJson(designSystemPath);
const indexHtml = fs.readFileSync(indexPath, "utf8");

assert.equal(manifest.matrix_id, "refund-system-map-model-ui-v2");
assert.equal(manifest.title, "Model UI 3x4 comparison matrix");
assert.equal(manifest.source_brief_file, "examples/demo/refund-ops-implementation-heavy.brief.txt");
assert.equal(manifest.reviewed_handoff_file, "examples/model-ui/refund-system-map/reviewed-handoff.fixture.json");
assert.equal(manifest.design_system_adapter_file, "examples/model-ui/refund-system-map/design-system-adapter.json");
assert.equal(manifest.design_system_name, "Material UI");
assert.equal(manifest.design_system_package, "@mui/material");
assert.equal(manifest.design_system_render_mode, "static-ssr");
assert.equal(manifest.comparison_rows.length, 3);
assert.equal(manifest.comparison_columns.length, 4);
assert.equal(manifest.artifacts.length, 12);
assert.equal(manifest.legacy_aliases.length, 6);
assert.equal(handoff.handoff_status, "ready_for_generation");
assert.equal(designSystem.scope, "example-only");
assert.equal(designSystem.design_system_name, "Material UI");
assert.equal(designSystem.design_system_package, "@mui/material");
assert.equal(designSystem.render_mode, "static-ssr");
assert.ok(designSystem.components.includes("Button"));
assert.ok(designSystem.components.includes("Paper"));
assert.ok(designSystem.constraint.includes("does not supply activity fit"));
assert.ok(manifest.generation_policy.includes("3x4 matrix"));
assert.ok(manifest.generation_policy.includes("raw brief context"));
assert.ok(manifest.generation_policy.includes("JudgmentKit handoff context"));
assert.ok(manifest.generation_policy.includes("Material UI rendering"));

assert.deepEqual(
  manifest.comparison_rows.map((row) => row.id),
  ROWS.map(([id]) => id),
);
assert.deepEqual(
  manifest.comparison_columns.map((column) => column.id),
  COLUMNS.map(([id]) => id),
);

assert.ok(indexHtml.includes("Model UI generation matrix"));
assert.ok(indexHtml.includes("3 x 4 comparison gallery"));
assert.ok(indexHtml.includes("Raw brief"));
assert.ok(indexHtml.includes("JudgmentKit handoff"));
assert.ok(indexHtml.includes("Material UI only"));
assert.ok(indexHtml.includes("JudgmentKit + Material UI"));
assert.ok(indexHtml.includes("Gemma 4 via LM Studio lms"));
assert.ok(indexHtml.includes("GPT-5.5 xhigh via codex exec"));
assert.ok(indexHtml.includes("Material UI improves visual/component consistency"));
assert.ok(indexHtml.includes("JudgmentKit improves activity fit"));
assert.equal(indexHtml.includes("capture-required"), false);
assert.ok(indexHtml.includes('class="matrix-row"'));
assert.ok(indexHtml.includes('class="matrix-cells"'));
assert.ok(indexHtml.includes('data-carousel'));
assert.ok(indexHtml.includes('data-carousel-open="0"'));
assert.ok(indexHtml.includes("Open live artifact"));
assert.ok(indexHtml.includes("Open image"));

for (const [rowId, modelLabel, generationSource, reasoningEffort] of ROWS) {
  const row = manifest.comparison_rows.find((entry) => entry.id === rowId);
  assert.ok(row, `missing comparison row ${rowId}`);
  assert.equal(row.artifact_ids.length, 4);

  for (const [
    columnId,
    columnLabel,
    judgmentkitMode,
    designSystemMode,
    includesHandoff,
    includesMaterialUi,
  ] of COLUMNS) {
    const id = `${rowId}-${columnId}`;
    const entry = manifest.artifacts.find((artifact) => artifact.id === id);
    assert.ok(entry, `missing manifest artifact ${id}`);
    assert.equal(entry.row_id, rowId);
    assert.equal(entry.column_id, columnId);
    assert.equal(entry.model_label, modelLabel);
    assert.equal(entry.generation_source, generationSource);
    assert.equal(entry.reasoning_effort, reasoningEffort);
    assert.equal(entry.judgmentkit_mode, judgmentkitMode);
    assert.equal(entry.design_system_mode, designSystemMode);
    assert.equal(entry.column_label, columnLabel);
    assert.equal(entry.context_included.reviewed_handoff, includesHandoff);
    assert.equal(entry.context_included.material_ui_adapter, includesMaterialUi);
    assert.equal(entry.context_included.source_brief, true);
    assert.equal(entry.context_included.sample_case, true);
    assert.ok(entry.source_context_sha256);
    assert.ok(entry.render_source);
    assert.ok(entry.approach_title.includes(columnLabel));
    assert.ok(entry.approach_caption.includes(entry.row_label));
    assert.ok(indexHtml.includes(entry.screenshot_path));
    assert.ok(indexHtml.includes(entry.approach_title));

    assertPng(path.join(outputDir, entry.screenshot_path));

    if (includesMaterialUi) {
      assert.equal(entry.design_system_adapter_file, "examples/model-ui/refund-system-map/design-system-adapter.json");
      assert.equal(entry.design_system_name, "Material UI");
      assert.equal(entry.design_system_package, "@mui/material");
      assert.equal(entry.design_system_render_mode, "static-ssr");
      assert.ok(entry.render_source.includes("material_ui"));
    } else {
      assert.equal(entry.design_system_adapter_file, null);
      assert.equal(entry.design_system_name, null);
      assert.equal(entry.design_system_package, null);
    }

    if (includesHandoff) {
      assert.equal(entry.reviewed_handoff_file, "examples/model-ui/refund-system-map/reviewed-handoff.fixture.json");
      assert.ok(entry.context_summary.includes("reviewed handoff"));
    } else {
      assert.equal(entry.reviewed_handoff_file, null);
      assert.equal(entry.context_summary.includes("reviewed handoff"), false);
    }

    if (generationSource === "captured_model_output") {
      assert.equal(entry.capture_provenance.status, "captured");
      assert.ok(entry.capture_file, `model artifact ${id} must link a transcript file`);
      assert.equal(entry.capture_provenance.transcript_file, entry.capture_file);
      assert.ok(entry.capture_provenance.prompt_sha256);
      assert.ok(entry.capture_provenance.raw_response_sha256);
      assert.ok(entry.capture_provenance.source_context_sha256);
      assert.equal(entry.raw_response_sha256, entry.capture_provenance.raw_response_sha256);

      const capturePath = path.join(outputDir, entry.capture_file);
      assert.equal(fs.existsSync(capturePath), true, `missing capture transcript for ${id}`);
      const capture = readJson(capturePath);
      assert.equal(capture.artifact_id, id);
      assert.equal(capture.row_id, rowId);
      assert.equal(capture.column_id, columnId);
      assert.equal(capture.model_label, modelLabel);
      assert.equal(capture.judgmentkit_mode, judgmentkitMode);
      assert.equal(capture.design_system_mode, designSystemMode);
      assert.equal(capture.reasoning_effort, reasoningEffort);
      assert.deepEqual(capture.context_included, entry.context_included);
      assert.equal(capture.context_included.reviewed_handoff, includesHandoff);
      assert.equal(capture.source_context_sha256, entry.source_context_sha256);
      assert.equal(capture.prompt_sha256, entry.prompt_sha256);
      assert.equal(capture.raw_response_sha256, entry.raw_response_sha256);
      assert.ok(capture.raw_response);
      assert.equal(capture.raw_response.includes("<script"), false);
      assert.equal(capture.raw_response.includes("http://"), false);
      assert.equal(capture.raw_response.includes("https://"), false);
      if (includesMaterialUi) {
        assert.equal(capture.design_system_name, "Material UI");
        assert.equal(capture.design_system_package, "@mui/material");
        assert.equal(capture.design_system_render_mode, "static-ssr");
        assert.equal(capture.render_mode, "material_ui");
        assert.equal(typeof capture.parsed.surface, "object");
      } else {
        assert.equal(capture.design_system_name, null);
        assert.equal(capture.design_system_package, null);
        assert.equal(capture.render_mode, "html");
        assert.ok(capture.parsed.html.includes("data-primary-surface"));
        assert.equal(capture.parsed.html.includes("<script"), false);
        assert.equal(capture.parsed.html.includes("<link"), false);
        assert.equal(capture.parsed.html.includes("http://"), false);
        assert.equal(capture.parsed.html.includes("https://"), false);
        assert.ok(
          capture.parsed.css === undefined || typeof capture.parsed.css === "string",
          `${id} capture CSS should be omitted or a string`,
        );
      }
    } else {
      assert.equal(entry.capture_file, null);
      assert.equal(entry.capture_provenance.status, "captured");
      assert.equal(entry.prompt_sha256, null);
      assert.equal(entry.raw_response_sha256, null);
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
    assert.equal(provenance.row_id, rowId);
    assert.equal(provenance.column_id, columnId);
    assert.equal(provenance.judgmentkit_mode, judgmentkitMode);
    assert.equal(provenance.design_system_mode, designSystemMode);
    assert.equal(provenance.render_source, entry.render_source);
    assert.equal(provenance.reasoning_effort, reasoningEffort);
    assert.deepEqual(provenance.context_included, entry.context_included);
    assert.deepEqual(provenance.capture_provenance, entry.capture_provenance);
    assert.equal(provenance.artifact_path, entry.artifact_path);
    assert.equal(provenance.screenshot_path, entry.screenshot_path);
    assert.ok(artifactHtml.includes('id="model-ui-provenance"'));
    assert.equal(artifactHtml.includes("Capture required"), false);
    assert.equal(
      /^\s*\.evidence-list\s+li\s*\{/m.test(artifactHtml),
      false,
      `${id} should not apply shell evidence-list grid styles globally to raw model HTML`,
    );
    assert.ok(
      artifactHtml.includes(".app-shell .evidence-list li"),
      `${id} should scope evidence-list grid styles to the deterministic shell`,
    );

    if (includesMaterialUi) {
      assert.ok(artifactHtml.includes('data-emotion="mui'));
      assert.ok(artifactHtml.includes("MuiButton-root"));
      assert.ok(artifactHtml.includes("MuiPaper-root"));
    } else {
      assert.equal(artifactHtml.includes('data-emotion="mui'), false);
      assert.equal(artifactHtml.includes("MuiButton-root"), false);
      assert.equal(artifactHtml.includes("MuiPaper-root"), false);
    }

    assert.ok(primarySurface.trim().length > 100, `${id} should render visible UI`);

    if (generationSource === "captured_model_output" && !includesMaterialUi) {
      const capture = readJson(path.join(outputDir, entry.capture_file));
      const expectedCandidateText = compactText(visibleText(capture.parsed.html)).slice(0, 80);
      assert.ok(
        compactText(primarySurface).includes(expectedCandidateText),
        `${id} should render captured model HTML`,
      );
    }

    if (rowId === "deterministic" && !includesHandoff) {
      assert.ok(
        IMPLEMENTATION_TERMS.some((term) => primarySurface.toLowerCase().includes(term.toLowerCase())),
        `${id} should show implementation-first raw brief behavior`,
      );
    }

    if (rowId === "deterministic" && includesHandoff) {
      for (const term of IMPLEMENTATION_TERMS) {
        assert.equal(
          primarySurface.toLowerCase().includes(term.toLowerCase()),
          false,
          `deterministic JudgmentKit UI for ${id} leaked implementation term: ${term}`,
        );
      }
    }
  }
}

for (const alias of manifest.legacy_aliases) {
  const canonical = manifest.artifacts.find((artifact) => artifact.id === alias.canonical_id);
  assert.ok(canonical, `legacy alias ${alias.id} should point to a canonical artifact`);
}

for (const relativeParts of LEGACY_ALIAS_PATHS) {
  const filePath = path.join(outputDir, ...relativeParts);
  assert.equal(fs.existsSync(filePath), true, `missing legacy alias ${relativeParts.join("/")}`);
  if (relativeParts[0] === "screenshots") assertPng(filePath);
}

for (const legacyCapture of [
  "captures/gemma4-without-design-system.json",
  "captures/gemma4-with-design-system.json",
  "captures/gpt55-without-design-system.json",
  "captures/gpt55-with-design-system.json",
]) {
  const capture = readJson(path.join(outputDir, legacyCapture));
  assert.equal(capture.compatibility_alias, true, `${legacyCapture} should be marked as an alias`);
  assert.ok(capture.canonical_artifact_id);
}

console.log("model UI matrix checks passed.");
