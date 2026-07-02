import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  JUDGMENTKIT_DEFAULT_TOKEN_NAMES,
  LEGACY_ALIASES,
  MODEL_UI_INDEX_FILE,
  MODEL_UI_USE_CASES,
} from "../scripts/model-ui-use-cases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "scripts/demo-model-ui-matrix.mjs");
const captureScriptPath = path.join(root, "scripts/capture-model-ui-matrix.mjs");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const activityContract = readJson(
  path.join(root, "contracts/ai-ui-generation.activity-contract.json"),
);
const { analyzeStaticCaptureQuality, validateParsed } = await import(
  "../scripts/capture-model-ui-matrix.mjs"
);
const EXPECTED_TOKEN_BOUNDARY_RULE =
  activityContract.implementation_contract.local_component_authority.token_boundary.rule;
const LOCAL_VISUAL_TOKEN_PATTERN =
  /--(?:bg|canvas|panel|surface(?:-strong)?|ink|text|muted|line(?:-strong)?|border|accent(?:-strong|-soft)?|warn(?:-soft)?|warning|danger(?:-soft)?|risk|success|good(?:-soft)?|focus|brand|status|shadow)\b/i;
const JK_TOKEN_DEFINITION_PATTERN = /--jk-[a-z0-9-]+\s*:/i;
const JUDGMENTKIT_DEFAULT_TOKEN_NAME_SET = new Set(JUDGMENTKIT_DEFAULT_TOKEN_NAMES);

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

function normalizeFrontendSkillSummary(summary) {
  if (!summary) return summary;
  const designSystemMode =
    /^no_design_system_.*provided$/.test(summary.design_system_mode ?? "")
      ? "judgmentkit_default"
      : /^adapter_after_/.test(summary.design_system_mode ?? "")
        ? "external_design_system"
        : summary.design_system_mode;

  return {
    ...summary,
    design_system_mode: designSystemMode,
    design_system_name:
      designSystemMode === "judgmentkit_default" && !summary.design_system_name
        ? "JudgmentKit"
        : summary.design_system_name,
  };
}

function compactText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function assertJudgmentKitStaticTokenUsage(value, label) {
  const text = String(value);

  for (const token of [
    "--jk-color-canvas",
    "--jk-color-surface",
    "--jk-color-text",
    "--jk-color-muted",
    "--jk-color-border",
    "--jk-color-focus",
  ]) {
    assert.ok(text.includes(token), `${label} should include ${token}`);
    assert.ok(
      text.includes(`var(${token})`) || new RegExp(`${token}\\s*:`).test(text),
      `${label} should define or consume ${token}`,
    );
  }

  assert.equal(
    LOCAL_VISUAL_TOKEN_PATTERN.test(text),
    false,
    `${label} should not define or consume local visual token names`,
  );

  const unsupportedJkTokens = [
    ...new Set(
      [...text.matchAll(/--jk-[a-z0-9-]+/gi)]
        .map((match) => match[0].toLowerCase())
        .filter((token) => !JUDGMENTKIT_DEFAULT_TOKEN_NAME_SET.has(token)),
    ),
  ];

  assert.deepEqual(
    unsupportedJkTokens,
    [],
    `${label} should not reference undefined JudgmentKit token names`,
  );
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
  if (capture.source_context_status === "current") {
    assert.equal(capture.capture_quality.has_judgmentkit_default_tokens, true, `${label} should use JudgmentKit default tokens`);
    assert.ok(capture.capture_quality.jk_token_usage_count >= 4, `${label} should use multiple JudgmentKit token references`);
    assert.deepEqual(capture.capture_quality.disallowed_visual_tokens, [], `${label} should not use local visual token names`);
  }
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

const result = spawnSync(process.execPath, [scriptPath, "--check"], {
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
assert.equal(result.stderr, "");
assert.ok(result.stdout.includes("# JudgmentKit Model UI Matrices"));
assert.ok(result.stdout.includes(`Index: ${MODEL_UI_INDEX_FILE}`));
assert.match(
  fs.readFileSync(captureScriptPath, "utf8"),
  /surface_type_guidance:\s*frontendSkillContext\.surface_type_guidance/,
  "capture script should preserve surface_type_guidance so fresh captures record surface_type.",
);

const strictJudgmentKitTarget = {
  artifact_id: "test-with-judgmentkit",
  render_mode: "html",
  judgmentkit_mode: "with_judgmentkit",
  design_system_mode: "none",
};
assert.throws(
  () =>
    validateParsed(
      {
        summary: "Uses local visual variables.",
        css: [
          ":root{--canvas:#fff;--panel:#fff;--ink:#111;--accent:#245f73}",
          ".shell{display:grid;gap:12px;background:var(--canvas);color:var(--ink)}",
          ".panel{border:1px solid var(--accent);background:var(--panel)}",
          ".actions{display:flex;gap:8px}.actions button{padding:8px}",
          "@media(max-width:760px){.shell{display:block}}",
        ].join(""),
        html:
          '<main data-primary-surface><section class="panel"><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button><button>B</button><button>C</button></section><section></section><section></section></main>',
      },
      strictJudgmentKitTarget,
    ),
  /local visual token names|--jk-\*/,
);
assert.throws(
  () =>
    validateParsed(
      {
        summary: "Uses local visual aliases mixed with JK token references.",
        css: [
          ".shell{display:grid;gap:var(--jk-space-4);background:var(--bg);color:var(--jk-color-text)}",
          ".panel{border:1px solid var(--jk-color-border);background:var(--jk-color-surface)}",
          ".warn{color:var(--warn)}.danger{color:var(--danger)}.good{color:var(--good)}",
          ".actions{display:flex;gap:var(--jk-space-2)}.actions button{padding:8px}",
          "@media(max-width:760px){.shell{grid-template-columns:1fr}}",
        ].join(""),
        html:
          '<main data-primary-surface><section class="panel"><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button><button>B</button><button>C</button></section><section></section><section></section></main>',
      },
      strictJudgmentKitTarget,
    ),
  /local visual token names/,
);
assert.throws(
  () =>
    validateParsed(
      {
        summary: "Redefines JudgmentKit tokens inside model CSS.",
        css: [
          ":root{--jk-color-canvas:#111827}",
          ".shell{display:grid;gap:var(--jk-space-4);background:var(--jk-color-canvas);color:var(--jk-color-text)}",
          ".panel{border:1px solid var(--jk-color-border);background:var(--jk-color-surface)}",
          ".muted{color:var(--jk-color-muted)}.actions{display:flex;gap:var(--jk-space-2)}",
          ".primary{background:var(--jk-color-focus);color:var(--jk-color-surface)}",
          ".handoff{background:var(--jk-color-surface)}@media(max-width:760px){.shell{grid-template-columns:1fr}}",
        ].join(""),
        html:
          '<main data-primary-surface><section class="panel"><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button><button>B</button><button>C</button></section><section></section><section></section></main>',
      },
      strictJudgmentKitTarget,
    ),
  /not define or override/,
);
assert.throws(
  () =>
    validateParsed(
      {
        summary: "References invented JudgmentKit token names.",
        css: [
          ".shell{display:grid;gap:var(--jk-space-4);background:var(--jk-color-canvas);color:var(--jk-color-text)}",
          ".panel{border:1px solid var(--jk-color-border);background:var(--jk-color-surface)}",
          ".muted{color:var(--jk-color-muted)}.actions{display:flex;gap:var(--jk-space-2)}",
          ".shadow{box-shadow:var(--jk-shadow)}.primary{background:var(--jk-color-focus);color:var(--jk-color-surface)}",
          ".handoff{background:var(--jk-color-surface)}@media(max-width:760px){.shell{grid-template-columns:1fr}}",
        ].join(""),
        html:
          '<main data-primary-surface><section class="panel"><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button><button>B</button><button>C</button></section><section></section><section></section></main>',
      },
      strictJudgmentKitTarget,
    ),
  /not provided/,
);
const strictTokenQuality = analyzeStaticCaptureQuality(
  {
    css: [
      ".shell{display:grid;gap:var(--jk-space-4);background:var(--jk-color-canvas);color:var(--jk-color-text)}",
      ".panel{border:1px solid var(--jk-color-border);background:var(--jk-color-surface)}",
      ".muted{color:var(--jk-color-muted)}.actions{display:flex;gap:var(--jk-space-2)}",
      ".primary{background:var(--jk-color-focus);color:var(--jk-color-surface)}",
      ".handoff{background:var(--jk-color-surface)}@media(max-width:760px){.shell{grid-template-columns:1fr}}",
    ].join(""),
    html:
      '<main data-primary-surface><section class="panel"><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button><button>B</button><button>C</button></section><section></section><section></section></main>',
  },
  strictJudgmentKitTarget,
);
assert.equal(strictTokenQuality.has_judgmentkit_default_tokens, true);
assert.ok(strictTokenQuality.jk_token_usage_count >= 4);
assert.equal(strictTokenQuality.jk_token_reference_count, strictTokenQuality.jk_token_usage_count);
assert.deepEqual(strictTokenQuality.unsupported_jk_tokens, []);
assert.equal(strictTokenQuality.jk_token_definition_count, 0);
assert.deepEqual(strictTokenQuality.jk_token_definitions, []);
assert.deepEqual(strictTokenQuality.disallowed_visual_tokens, []);

const unsupportedTokenQuality = analyzeStaticCaptureQuality(
  {
    css: [
      ".shell{display:grid;gap:var(--jk-space-4);background:var(--jk-color-canvas);color:var(--jk-color-text)}",
      ".panel{border:1px solid var(--jk-color-border);background:var(--jk-color-surface)}",
      ".shadow{box-shadow:var(--jk-shadow)}.primary{background:var(--jk-color-focus)}",
      "@media(max-width:760px){.shell{grid-template-columns:1fr}}",
    ].join(""),
    html:
      '<main data-primary-surface><section class="panel"><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button><button>B</button><button>C</button></section><section></section><section></section></main>',
  },
  strictJudgmentKitTarget,
);
assert.deepEqual(unsupportedTokenQuality.unsupported_jk_tokens, ["--jk-shadow"]);
assert.equal(unsupportedTokenQuality.status, "failed");

assert.doesNotThrow(() =>
  validateParsed(
    {
      summary: "Uses an external HTML design-system namespace.",
      css: [
        ":root{--acme-color-canvas:#fff;--acme-color-text:#111;--acme-space-3:12px}",
        ".shell{display:grid;gap:var(--acme-space-3);background:var(--acme-color-canvas);color:var(--acme-color-text)}",
      ].join(""),
      html:
        '<main data-primary-surface><section><h1>Review</h1><p>Evidence risk case customer account handoff owner send follow.</p><button>A</button></section></main>',
    },
    {
      artifact_id: "test-with-external-html-design-system",
      render_mode: "html",
      judgmentkit_mode: "with_judgmentkit",
      design_system_mode: "acme",
    },
  ),
);

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
  assert.equal(
    handoff.implementation_contract.local_component_authority.token_boundary.rule,
    EXPECTED_TOKEN_BOUNDARY_RULE,
  );
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
      assert.ok(entry.current_source_context_sha256);
      assert.ok(
        ["current", "legacy_accepted", "missing"].includes(entry.source_context_status),
        `${useCase.id}/${id} should record source context freshness`,
      );
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
        assert.ok(
          handoff.surface_type,
          `${useCase.id} reviewed handoff should carry the selected surface type`,
        );
        assert.equal(
          entry.frontend_skill_context.surface_type,
          handoff.surface_type,
          `${useCase.id}/${id} frontend skill context should preserve the selected surface type`,
        );
        assert.equal(entry.frontend_skill_context.next_recommended_tool, "review_ui_implementation_candidate");
        if (column.design_system_mode === "material_ui") {
          assert.equal(entry.frontend_skill_context.design_system_mode, "external_design_system");
          assert.equal(entry.frontend_skill_context.design_system_name, "Material UI");
        } else {
          assert.equal(entry.frontend_skill_context.design_system_mode, "judgmentkit_default");
          assert.equal(entry.frontend_skill_context.design_system_name, "JudgmentKit");
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
        assert.equal(entry.capture_provenance.source_context_status, entry.source_context_status);
        assert.equal(
          entry.capture_provenance.current_source_context_sha256,
          entry.current_source_context_sha256,
        );
        assert.equal(
          entry.capture_provenance.accepted_source_context_sha256,
          entry.source_context_sha256,
        );
        assert.ok(
          ["current", "legacy_accepted"].includes(entry.capture_provenance.source_context_status),
          `${useCase.id}/${id} captured model output should be current or explicitly legacy`,
        );

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
        assert.deepEqual(
          normalizeFrontendSkillSummary(capture.frontend_skill_context),
          entry.frontend_skill_context,
        );
        assert.deepEqual(capture.lms_context ?? null, entry.lms_context);
        assert.deepEqual(capture.capture_quality ?? null, entry.capture_quality);
        assert.deepEqual(entry.capture_provenance.lms_context ?? null, entry.lms_context);
        assert.deepEqual(entry.capture_provenance.capture_quality, entry.capture_quality);
        assert.equal(capture.source_context_sha256, entry.source_context_sha256);
        assert.equal(
          capture.source_context_status,
          entry.source_context_status,
          `${useCase.id}/${id} capture should record the same context freshness`,
        );
        assert.equal(capture.current_source_context_sha256, entry.current_source_context_sha256);
        assert.equal(capture.accepted_source_context_sha256, entry.source_context_sha256);
        assert.equal(
          entry.capture_provenance.captured_source_context_sha256,
          capture.source_context_sha256,
        );
        if (entry.source_context_status === "legacy_accepted") {
          assert.notEqual(
            entry.current_source_context_sha256,
            entry.source_context_sha256,
            `${useCase.id}/${id} legacy capture should distinguish current and accepted contexts`,
          );
          assert.match(capture.source_context_notes, /legacy capture/i);
          assert.match(entry.capture_provenance.source_context_notes, /legacy capture/i);
        } else {
          assert.equal(entry.current_source_context_sha256, entry.source_context_sha256);
          assert.match(capture.source_context_notes, /current generated matrix context/i);
        }
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
          if (
            column.judgmentkit_mode === "with_judgmentkit" &&
            column.design_system_mode === "none"
          ) {
            assertJudgmentKitStaticCaptureQuality(capture, `${useCase.id}/${id}`);
          }
        }
      } else {
        assert.equal(entry.capture_file, null);
        assert.equal(entry.capture_provenance.status, "captured");
        assert.equal(entry.source_context_status, "current");
        assert.equal(entry.current_source_context_sha256, entry.source_context_sha256);
        assert.equal(entry.capture_provenance.source_context_status, "current");
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
      assert.equal(provenance.source_context_sha256, entry.source_context_sha256);
      assert.equal(
        provenance.current_source_context_sha256,
        entry.current_source_context_sha256,
      );
      assert.equal(provenance.source_context_status, entry.source_context_status);
      assert.deepEqual(provenance.capture_provenance, entry.capture_provenance);
      assert.equal(provenance.frontend_context_status, entry.frontend_context_status);
      assert.equal(provenance.frontend_skill_context_status, entry.frontend_skill_context_status);
      assert.deepEqual(provenance.frontend_skill_context, entry.frontend_skill_context);
      assert.equal(provenance.artifact_path, entry.artifact_path);
      assert.equal(provenance.screenshot_path, entry.screenshot_path);
      assert.equal(artifactHtml.includes("Capture required"), false);
      assert.ok(artifactHtml.includes(".app-shell .evidence-list li"));

      if (
        column.judgmentkit_mode === "with_judgmentkit" &&
        column.design_system_mode === "none"
      ) {
        assert.ok(
          artifactHtml.includes('data-design-system-mode="none"'),
          `${useCase.id}/${id} should preserve the static matrix design-system column metadata`,
        );
        assertJudgmentKitStaticTokenUsage(
          artifactHtml,
          `${useCase.id}/${id} static JudgmentKit artifact`,
        );
      }

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
        if (
          column.judgmentkit_mode === "with_judgmentkit" &&
          column.design_system_mode === "none"
        ) {
          const modelCss = sectionBetween(
            artifactHtml,
            '<style data-model-css>',
            "</style>",
          );
          assert.ok(
            modelCss.includes("--jk-"),
            `${useCase.id}/${id} should normalize rendered model CSS to JudgmentKit tokens`,
          );
          assert.equal(
            LOCAL_VISUAL_TOKEN_PATTERN.test(modelCss),
            false,
            `${useCase.id}/${id} rendered model CSS should not keep local visual token names`,
          );
          assert.equal(
            JK_TOKEN_DEFINITION_PATTERN.test(modelCss),
            false,
            `${useCase.id}/${id} rendered model CSS should not define JudgmentKit token values`,
          );
        }
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

const refundManifest = readJson(path.join(refundDir, "manifest.json"));
const refundArtifactById = new Map(
  refundManifest.artifacts.map((artifact) => [artifact.id, artifact]),
);
for (const alias of LEGACY_ALIASES) {
  const canonical = refundArtifactById.get(alias.canonical_id);
  assert.ok(canonical, `missing canonical manifest entry for ${alias.id}`);

  const aliasHtml = fs.readFileSync(path.join(refundDir, alias.artifact_path), "utf8");
  const aliasProvenance = readProvenance(aliasHtml);
  assert.equal(aliasProvenance.artifact_id, alias.id);
  assert.equal(aliasProvenance.canonical_artifact_id, alias.canonical_id);
  assert.equal(aliasProvenance.compatibility_alias, true);
  assert.equal(aliasProvenance.artifact_path, alias.artifact_path);
  assert.equal(aliasProvenance.screenshot_path, alias.screenshot_path);
  assert.equal(aliasProvenance.source_context_sha256, canonical.source_context_sha256);
  assert.equal(
    aliasProvenance.current_source_context_sha256,
    canonical.current_source_context_sha256,
  );
  assert.equal(aliasProvenance.source_context_status, canonical.source_context_status);

  if (alias.capture_file) {
    const aliasCapture = readJson(path.join(refundDir, alias.capture_file));
    const canonicalCapture = readJson(path.join(refundDir, canonical.capture_file));
    assert.equal(aliasCapture.artifact_id, alias.id);
    assert.equal(aliasCapture.canonical_artifact_id, alias.canonical_id);
    assert.equal(aliasCapture.compatibility_alias, true);
    assert.equal(aliasCapture.source_context_sha256, canonicalCapture.source_context_sha256);
    assert.equal(
      aliasCapture.current_source_context_sha256,
      canonicalCapture.current_source_context_sha256,
    );
    assert.equal(
      aliasCapture.accepted_source_context_sha256,
      canonicalCapture.accepted_source_context_sha256,
    );
    assert.equal(aliasCapture.source_context_status, canonicalCapture.source_context_status);
    assert.deepEqual(
      aliasCapture.frontend_skill_context,
      canonicalCapture.frontend_skill_context,
    );
  }
}

assert.equal(canonicalArtifacts, 48);
assert.equal(canonicalScreenshots, 48);
assert.equal(modelCaptures, MODEL_UI_USE_CASES.length * MODEL_ROWS.length * COMPARISON_COLUMNS.length);

console.log("model UI matrix checks passed.");
