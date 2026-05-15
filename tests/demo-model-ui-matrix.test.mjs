import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  MODEL_UI_INDEX_FILE,
  MODEL_UI_USE_CASES,
} from "../scripts/model-ui-use-cases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-model-ui-matrix.mjs");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const MODEL_ROWS = COMPARISON_ROWS.filter(
  (row) => row.generation_source === "captured_model_output",
);

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

function assertJudgmentKitStaticCaptureQuality(capture, label) {
  assert.equal(capture.frontend_skill_context_status, "ready", `${label} should have ready frontend skill context`);
  assert.equal(capture.frontend_skill_context.raw_skill_exposed, false, `${label} should not expose raw skill text`);
  assert.equal(capture.capture_quality?.status, "passed", `${label} should pass static capture quality`);
  assert.equal(capture.capture_quality?.profile, "judgmentkit_static_html_css", `${label} should use JudgmentKit static quality profile`);
  assert.ok(capture.capture_quality.css_characters >= 650, `${label} CSS should be substantial`);
  assert.ok(capture.capture_quality.html_characters >= 1050, `${label} HTML should be substantial`);
  assert.ok(capture.capture_quality.css_rule_count >= 8, `${label} should include enough CSS rules`);
  assert.ok(capture.capture_quality.class_selector_count >= 6, `${label} should include enough class selectors`);
  assert.ok(capture.capture_quality.semantic_section_count >= 3 || capture.capture_quality.structural_block_count >= 8, `${label} should include enough work-surface regions`);
  assert.ok(capture.capture_quality.button_count >= 3, `${label} should include decision controls`);
  assert.equal(capture.capture_quality.has_responsive_css, true, `${label} should include responsive CSS`);
  assert.equal(capture.capture_quality.has_layout_css, true, `${label} should include grid/flex layout CSS`);
  assert.equal(capture.capture_quality.has_panel_css, true, `${label} should include panel/background/border CSS`);
  assert.equal(capture.capture_quality.has_control_css, true, `${label} should include action/control CSS`);
  assert.equal(capture.capture_quality.has_evidence_content, true, `${label} should include evidence content`);
  assert.equal(capture.capture_quality.has_handoff_content, true, `${label} should include handoff content`);
  assert.equal(capture.capture_quality.compact_template_signature, false, `${label} should not match the rejected compact template`);
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
assert.ok(result.stdout.includes("# JudgmentKit Model UI Matrices"));
assert.ok(result.stdout.includes(`Index: ${MODEL_UI_INDEX_FILE}`));

const indexPath = path.join(root, MODEL_UI_INDEX_FILE);
assert.equal(fs.existsSync(indexPath), true);
const useCaseIndex = readJson(indexPath);
assert.equal(useCaseIndex.use_cases.length, 4);
assert.deepEqual(
  useCaseIndex.use_cases.map((useCase) => useCase.id),
  MODEL_UI_USE_CASES.map((useCase) => useCase.id),
);

let canonicalArtifacts = 0;
let canonicalScreenshots = 0;
let modelCaptures = 0;

for (const useCase of MODEL_UI_USE_CASES) {
  const outputDir = path.join(root, useCase.output_dir);
  const manifestPath = path.join(outputDir, "manifest.json");
  const handoffPath = path.join(outputDir, "reviewed-handoff.fixture.json");
  const designSystemPath = path.join(outputDir, "design-system-adapter.json");
  const indexHtmlPath = path.join(outputDir, "index.html");

  assert.equal(fs.existsSync(manifestPath), true, `missing manifest for ${useCase.id}`);
  assert.equal(fs.existsSync(handoffPath), true, `missing handoff for ${useCase.id}`);
  assert.equal(fs.existsSync(designSystemPath), true, `missing adapter for ${useCase.id}`);
  assert.equal(fs.existsSync(indexHtmlPath), true, `missing index for ${useCase.id}`);

  const manifest = readJson(manifestPath);
  const handoff = readJson(handoffPath);
  const designSystem = readJson(designSystemPath);
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  assert.equal(manifest.matrix_id, useCase.matrix_id);
  assert.equal(manifest.use_case_id, useCase.id);
  assert.equal(manifest.use_case_label, useCase.label);
  assert.equal(manifest.activity_summary, useCase.activity_summary);
  assert.equal(manifest.use_case_index_path, useCase.index_path);
  assert.equal(manifest.title, "Model UI 3x4 comparison matrix");
  assert.equal(manifest.source_brief_file, useCase.source_brief_file);
  assert.equal(manifest.reviewed_handoff_file, `${useCase.output_dir}/reviewed-handoff.fixture.json`);
  assert.equal(manifest.design_system_adapter_file, `${useCase.output_dir}/design-system-adapter.json`);
  assert.equal(manifest.design_system_name, "Material UI");
  assert.equal(manifest.design_system_package, "@mui/material");
  assert.equal(manifest.design_system_render_mode, "static-ssr");
  assert.equal(manifest.comparison_rows.length, 3);
  assert.equal(manifest.comparison_columns.length, 4);
  assert.equal(manifest.artifacts.length, 12);
  assert.equal(
    manifest.legacy_aliases.length,
    useCase.id === "refund-system-map" ? 6 : 0,
  );
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
  assert.ok(manifest.generation_policy.includes("compiled frontend skill context"));
  assert.ok(manifest.generation_policy.includes("Material UI rendering"));

  assert.deepEqual(
    manifest.comparison_rows.map((row) => row.id),
    COMPARISON_ROWS.map((row) => row.id),
  );
  assert.deepEqual(
    manifest.comparison_columns.map((column) => column.id),
    COMPARISON_COLUMNS.map((column) => column.id),
  );

  assert.ok(indexHtml.includes(`${useCase.label} model UI generation matrix`));
  assert.ok(indexHtml.includes("3 x 4 comparison gallery"));
  assert.ok(indexHtml.includes("Raw brief"));
  assert.ok(indexHtml.includes("JudgmentKit skill context"));
  assert.ok(indexHtml.includes("Material UI only"));
  assert.ok(indexHtml.includes("JudgmentKit skill + Material UI"));
  assert.ok(indexHtml.includes("Gemma 4 via LM Studio lms"));
  assert.ok(indexHtml.includes("GPT-5.5 xhigh via codex exec"));
  assert.ok(indexHtml.includes("Material UI improves visual/component consistency"));
  assert.ok(indexHtml.includes("JudgmentKit skill context improves activity fit"));
  assert.equal(indexHtml.includes("capture-required"), false);

  for (const row of COMPARISON_ROWS) {
    const manifestRow = manifest.comparison_rows.find((entry) => entry.id === row.id);
    assert.ok(manifestRow, `missing comparison row ${row.id} for ${useCase.id}`);
    assert.equal(manifestRow.artifact_ids.length, 4);

    for (const column of COMPARISON_COLUMNS) {
      const id = `${row.id}-${column.id}`;
      const entry = manifest.artifacts.find((artifact) => artifact.id === id);
      assert.ok(entry, `missing manifest artifact ${useCase.id}/${id}`);
      assert.equal(entry.use_case_id, useCase.id);
      assert.equal(entry.use_case_label, useCase.label);
      assert.equal(entry.activity_summary, useCase.activity_summary);
      assert.equal(entry.use_case_index_path, useCase.index_path);
      assert.equal(entry.row_id, row.id);
      assert.equal(entry.column_id, column.id);
      assert.equal(entry.model_label, row.model_label);
      assert.equal(entry.generation_source, row.generation_source);
      assert.equal(entry.reasoning_effort, row.reasoning_effort);
      assert.equal(entry.judgmentkit_mode, column.judgmentkit_mode);
      assert.equal(entry.design_system_mode, column.design_system_mode);
      assert.equal(entry.column_label, column.label);
      assert.equal(
        entry.context_included.reviewed_handoff,
        column.judgmentkit_mode === "with_judgmentkit",
      );
      assert.equal(
        entry.context_included.material_ui_adapter,
        column.design_system_mode === "material_ui",
      );
      assert.equal(
        entry.context_included.frontend_skill_context,
        column.judgmentkit_mode === "with_judgmentkit",
      );
      assert.equal(entry.context_included.source_brief, true);
      assert.equal(entry.context_included.sample_case, true);
      assert.ok(entry.source_context_sha256);
      assert.ok(entry.render_source);
      assert.ok(entry.approach_title.includes(column.label));
      assert.ok(entry.approach_caption.includes(entry.row_label));
      assert.ok(indexHtml.includes(entry.screenshot_path));
      assert.ok(indexHtml.includes(entry.approach_title));

      canonicalArtifacts += 1;
      canonicalScreenshots += 1;
      assertPng(path.join(outputDir, entry.screenshot_path));

      if (column.design_system_mode === "material_ui") {
        assert.equal(entry.design_system_adapter_file, `${useCase.output_dir}/design-system-adapter.json`);
        assert.equal(entry.design_system_name, "Material UI");
        assert.equal(entry.design_system_package, "@mui/material");
        assert.equal(entry.design_system_render_mode, "static-ssr");
        assert.ok(entry.render_source.includes("material_ui"));
      } else {
        assert.equal(entry.design_system_adapter_file, null);
        assert.equal(entry.design_system_name, null);
        assert.equal(entry.design_system_package, null);
      }

      if (column.judgmentkit_mode === "with_judgmentkit") {
        assert.equal(entry.reviewed_handoff_file, `${useCase.output_dir}/reviewed-handoff.fixture.json`);
        assert.ok(entry.context_summary.includes("reviewed handoff"));
        assert.ok(entry.context_summary.includes("frontend skill context"));
        assert.equal(entry.frontend_context_status, "ready_for_frontend_implementation");
        assert.equal(entry.frontend_skill_context_status, "ready");
        assert.equal(entry.frontend_skill_context.source_skill, "frontend-ui-implementation");
        assert.equal(entry.frontend_skill_context.raw_skill_exposed, false);
        assert.equal(entry.frontend_skill_context.next_recommended_tool, "review_ui_implementation_candidate");
        if (column.design_system_mode === "material_ui") {
          assert.equal(entry.frontend_skill_context.design_system_mode, "adapter_after_judgment");
          assert.equal(entry.frontend_skill_context.design_system_name, "Material UI");
        } else {
          assert.equal(entry.frontend_skill_context.design_system_mode, "no_design_system_adapter_provided");
          assert.equal(entry.frontend_skill_context.design_system_name, "");
        }
      } else {
        assert.equal(entry.reviewed_handoff_file, null);
        assert.equal(entry.context_summary.includes("reviewed handoff"), false);
        assert.equal(entry.context_summary.includes("frontend skill context"), false);
        assert.equal(entry.frontend_context_status, null);
        assert.equal(entry.frontend_skill_context_status, null);
        assert.equal(entry.frontend_skill_context, null);
      }

      if (row.generation_source === "captured_model_output") {
        modelCaptures += 1;
        assert.equal(entry.capture_provenance.status, "captured");
        assert.ok(entry.capture_file, `model artifact ${useCase.id}/${id} must link a transcript file`);
        assert.equal(entry.capture_provenance.transcript_file, entry.capture_file);
        assert.ok(entry.capture_provenance.prompt_sha256);
        assert.ok(entry.capture_provenance.raw_response_sha256);
        assert.ok(entry.capture_provenance.source_context_sha256);
        assert.equal(entry.raw_response_sha256, entry.capture_provenance.raw_response_sha256);

        const capturePath = path.join(outputDir, entry.capture_file);
        assert.equal(fs.existsSync(capturePath), true, `missing capture transcript for ${useCase.id}/${id}`);
        const capture = readJson(capturePath);
        assert.equal(capture.artifact_id, id);
        assert.equal(capture.use_case_id, useCase.id);
        assert.equal(capture.use_case_label, useCase.label);
        assert.equal(capture.row_id, row.id);
        assert.equal(capture.column_id, column.id);
        assert.equal(capture.model_label, row.model_label);
        assert.equal(capture.judgmentkit_mode, column.judgmentkit_mode);
        assert.equal(capture.design_system_mode, column.design_system_mode);
        assert.equal(capture.reasoning_effort, row.reasoning_effort);
        assert.deepEqual(capture.context_included, entry.context_included);
        assert.equal(capture.frontend_context_status, entry.frontend_context_status);
        assert.equal(capture.frontend_skill_context_status, entry.frontend_skill_context_status);
        assert.deepEqual(capture.frontend_skill_context, entry.frontend_skill_context);
        assert.deepEqual(capture.lms_context ?? null, entry.lms_context);
        assert.deepEqual(capture.capture_quality ?? null, entry.capture_quality);
        assert.deepEqual(entry.capture_provenance.lms_context ?? null, entry.lms_context);
        assert.deepEqual(entry.capture_provenance.capture_quality, entry.capture_quality);
        assert.equal(capture.source_context_sha256, entry.source_context_sha256);
        assert.equal(capture.prompt_sha256, entry.prompt_sha256);
        assert.equal(capture.raw_response_sha256, entry.raw_response_sha256);
        assert.ok(capture.raw_response);
        assert.equal(capture.raw_response.includes("<script"), false);
        assert.equal(capture.raw_response.includes("http://"), false);
        assert.equal(capture.raw_response.includes("https://"), false);
        if (row.cli === "lms") {
          assert.ok(capture.lms_context, `${useCase.id}/${id} should record LM Studio context`);
          assert.ok(
            capture.lms_context.actual_context_length >= 16000,
            `${useCase.id}/${id} should use at least a 16k LM Studio context window`,
          );
          assert.ok(
            capture.command_display.includes("lms chat"),
            `${useCase.id}/${id} should capture through lms chat`,
          );
        }
        if (column.design_system_mode === "material_ui") {
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
          assert.ok(capture.parsed.css.trim().length > 0);
          assert.equal(capture.parsed.html.includes("<script"), false);
          assert.equal(capture.parsed.html.includes("<link"), false);
          assert.equal(capture.parsed.html.includes("http://"), false);
          assert.equal(capture.parsed.html.includes("https://"), false);
          if (column.judgmentkit_mode === "with_judgmentkit") {
            assertJudgmentKitStaticCaptureQuality(capture, `${useCase.id}/${id}`);
          }
        }
      } else {
        assert.equal(entry.capture_file, null);
        assert.equal(entry.capture_provenance.status, "captured");
        assert.equal(entry.prompt_sha256, null);
        assert.equal(entry.raw_response_sha256, null);
      }

      const artifactPath = path.join(outputDir, entry.artifact_path);
      assert.equal(fs.existsSync(artifactPath), true, `missing artifact ${useCase.id}/${id}`);
      const artifactHtml = fs.readFileSync(artifactPath, "utf8");
      const provenance = readProvenance(artifactHtml);
      const primarySurface = visibleText(
        sectionBetween(artifactHtml, "data-primary-surface", "model-ui-provenance"),
      );

      assert.equal(provenance.matrix_id, manifest.matrix_id);
      assert.equal(provenance.use_case_id, useCase.id);
      assert.equal(provenance.use_case_label, useCase.label);
      assert.equal(provenance.activity_summary, useCase.activity_summary);
      assert.equal(provenance.artifact_id, id);
      assert.equal(provenance.row_id, row.id);
      assert.equal(provenance.column_id, column.id);
      assert.equal(provenance.judgmentkit_mode, column.judgmentkit_mode);
      assert.equal(provenance.design_system_mode, column.design_system_mode);
      assert.equal(provenance.render_source, entry.render_source);
      assert.equal(provenance.reasoning_effort, row.reasoning_effort);
      assert.deepEqual(provenance.context_included, entry.context_included);
      assert.deepEqual(provenance.capture_provenance, entry.capture_provenance);
      assert.equal(provenance.frontend_context_status, entry.frontend_context_status);
      assert.equal(provenance.frontend_skill_context_status, entry.frontend_skill_context_status);
      assert.deepEqual(provenance.frontend_skill_context, entry.frontend_skill_context);
      assert.equal(provenance.artifact_path, entry.artifact_path);
      assert.equal(provenance.screenshot_path, entry.screenshot_path);
      assert.equal(artifactHtml.includes("Capture required"), false);
      assert.ok(artifactHtml.includes(".app-shell .evidence-list li"));

      if (column.design_system_mode === "material_ui") {
        assert.ok(artifactHtml.includes('data-emotion="mui'));
        assert.ok(artifactHtml.includes("MuiButton-root"));
        assert.ok(artifactHtml.includes("MuiPaper-root"));
      } else {
        assert.equal(artifactHtml.includes('data-emotion="mui'), false);
        assert.equal(artifactHtml.includes("MuiButton-root"), false);
        assert.equal(artifactHtml.includes("MuiPaper-root"), false);
      }

      assert.ok(primarySurface.trim().length > 100, `${useCase.id}/${id} should render visible UI`);

      if (row.generation_source === "captured_model_output" && column.design_system_mode !== "material_ui") {
        const capture = readJson(path.join(outputDir, entry.capture_file));
        const expectedCandidateText = compactText(visibleText(capture.parsed.html)).slice(0, 80);
        assert.ok(
          artifactHtml.includes("<style data-model-css>"),
          `${useCase.id}/${id} should render captured model CSS`,
        );
        assert.ok(
          compactText(primarySurface).includes(expectedCandidateText),
          `${useCase.id}/${id} should render captured model HTML`,
        );
      }

      if (row.id === "deterministic" && column.judgmentkit_mode === "no_judgmentkit") {
        assert.ok(
          useCase.implementation_terms.some((term) =>
            primarySurface.toLowerCase().includes(term.toLowerCase()),
          ),
          `${useCase.id}/${id} should show implementation-first raw brief behavior`,
        );
      }

      if (row.id === "deterministic" && column.judgmentkit_mode === "with_judgmentkit") {
        for (const term of useCase.implementation_terms) {
          assert.equal(
            primarySurface.toLowerCase().includes(term.toLowerCase()),
            false,
            `${useCase.id}/${id} leaked implementation term: ${term}`,
          );
        }
      }
    }
  }

  for (const alias of manifest.legacy_aliases) {
    const canonical = manifest.artifacts.find((artifact) => artifact.id === alias.canonical_id);
    assert.ok(canonical, `legacy alias ${useCase.id}/${alias.id} should point to a canonical artifact`);
  }
}

const refundDir = path.join(root, "examples/model-ui/refund-system-map");
for (const legacyPath of [
  "artifacts/deterministic-without-design-system.html",
  "artifacts/deterministic-with-design-system.html",
  "artifacts/gemma4-without-design-system.html",
  "artifacts/gemma4-with-design-system.html",
  "artifacts/gpt55-without-design-system.html",
  "artifacts/gpt55-with-design-system.html",
  "screenshots/deterministic-without-design-system.png",
  "screenshots/deterministic-with-design-system.png",
  "screenshots/gemma4-without-design-system.png",
  "screenshots/gemma4-with-design-system.png",
  "screenshots/gpt55-without-design-system.png",
  "screenshots/gpt55-with-design-system.png",
]) {
  const filePath = path.join(refundDir, legacyPath);
  assert.equal(fs.existsSync(filePath), true, `missing refund legacy alias ${legacyPath}`);
  if (legacyPath.endsWith(".png")) assertPng(filePath);
}

for (const legacyCapture of [
  "captures/gemma4-without-design-system.json",
  "captures/gemma4-with-design-system.json",
  "captures/gpt55-without-design-system.json",
  "captures/gpt55-with-design-system.json",
]) {
  const capture = readJson(path.join(refundDir, legacyCapture));
  assert.equal(capture.compatibility_alias, true, `${legacyCapture} should be marked as an alias`);
  assert.ok(capture.canonical_artifact_id);
}

assert.equal(canonicalArtifacts, 48);
assert.equal(canonicalScreenshots, 48);
assert.equal(modelCaptures, MODEL_UI_USE_CASES.length * MODEL_ROWS.length * COMPARISON_COLUMNS.length);

console.log("model UI matrix checks passed.");
