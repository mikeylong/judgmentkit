import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { REPO_ROOT } from "./actual-constants.mjs";

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}

function assertNoCodexGridPackage(packageJson, location) {
  for (const dependencySection of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    for (const dependencyName of Object.keys(packageJson[dependencySection] ?? {})) {
      if (/codex[-_]grid/i.test(dependencyName)) {
        fail(`${location} should not depend on Codex Grid through ${dependencySection}.`);
      }
    }
  }
}

function assertNoArtifactToolPackage(packageJson, location) {
  for (const dependencySection of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    if (packageJson[dependencySection]?.["@oai/artifact-tool"] !== undefined) {
      fail(`${location} should not depend on @oai/artifact-tool through ${dependencySection}.`);
    }
  }
}

function assertNoCodexGridImport(source, location) {
  if (
    /from\s+["'][^"']*codex[-_]grid[^"']*["']|import\s*\(\s*["'][^"']*codex[-_]grid[^"']*["']\s*\)|require\s*\(\s*["'][^"']*codex[-_]grid[^"']*["']\s*\)/i.test(
      source,
    )
  ) {
    fail(`${location} should not import Codex Grid.`);
  }
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-pack-smoke-"));

try {
  const packOutput = run("npm", ["pack", "--json", "--pack-destination", tempRoot]);
  const packInfo = JSON.parse(packOutput)[0];
  const files = packInfo.files.map((entry) => entry.path).sort();

  for (const forbiddenPrefix of ["outputs/", "scripts/", "tests/", "evals/", "packages/"]) {
    if (files.some((file) => file.startsWith(forbiddenPrefix))) {
      fail(`Packed package should not include ${forbiddenPrefix} files.`);
    }
  }

  if (!files.includes("src/presentation-theme/index.mjs")) {
    fail("Packed package should include the presentation-theme public module.");
  }

  const rootPackageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assertNoCodexGridPackage(rootPackageJson, "Root package");
  assertNoArtifactToolPackage(rootPackageJson, "Root package");

  const packageRoot = path.join(tempRoot, "node_modules", "judgmentkit");
  fs.mkdirSync(path.dirname(packageRoot), { recursive: true });
  run("tar", ["-xzf", path.join(tempRoot, packInfo.filename), "-C", tempRoot]);
  fs.renameSync(path.join(tempRoot, "package"), packageRoot);

  const packedPackageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  assertNoCodexGridPackage(packedPackageJson, "Packed package");
  assertNoArtifactToolPackage(packedPackageJson, "Packed package");

  for (const file of files.filter((entry) => entry.startsWith("src/presentation-theme/") && entry.endsWith(".mjs"))) {
    const source = fs.readFileSync(path.join(packageRoot, file), "utf8");
    assertNoCodexGridImport(source, file);
    if (/\b(?:sh|tb)\/|authoringMode|exportName|slide-[0-9]{2}\.mjs|\/Users\//.test(source)) {
      fail(`${file} should not include raw reference source ids, authoring metadata, or local paths.`);
    }
    if (
      file.endsWith("template-layout-data.mjs") &&
      /"(?:source|token|tokenIds|sourceFootnoteMinPx|sourceFontSizeRangePx)"\s*:/.test(source)
    ) {
      fail(`${file} should use neutral runtime catalog field names.`);
    }
  }

  fs.writeFileSync(
    path.join(tempRoot, "check.mjs"),
    [
      'import * as root from "judgmentkit";',
      'import * as provider from "judgmentkit/providers/openai-responses";',
      'import * as theme from "judgmentkit/presentation-theme";',
      'if (!root || !provider || !theme.createJudgmentKitPresentation) throw new Error("missing public import");',
      'const templateApiNames = ["listJudgmentKitPresentationTemplates", "getJudgmentKitPresentationTemplate", "rankJudgmentKitPresentationTemplates", "selectJudgmentKitPresentationTemplate", "composeJudgmentKitPresentationTemplate", "createJudgmentKitPresentationTemplateRegistry"];',
      'for (const name of templateApiNames) if (typeof theme[name] !== "function") throw new Error(`missing template API ${name}`);',
      'const assertPublicSafe = (value, label) => { const json = JSON.stringify(value); for (const key of ["artifact_tool_helpers", "component_factories", "compose_contract", "contentKey", "contentKeys", "content_key", "evidence_refs", "layout_helpers", "parity", "public_import", "slot_kind", "source", "source_compose_name", "source_inputs", "source_refs", "source_region_count", "source_sha256", "source_slot_count", "source_text_flow_count", "text_flow", "token", "tokenIds", "token_ids"]) if (new RegExp(`\\"${key}\\"\\\\s*:`).test(json)) throw new Error(`${label} leaked ${key}`); for (const pattern of [/slide-[0-9]{2}\\.mjs/, /\\b(?:sh|tb|sl)\\//, /\\/Users\\//, /outputs\\//, /scripts\\//, /src\\//]) if (pattern.test(json)) throw new Error(`${label} leaked ${pattern}`); };',
      'if (!theme.JUDGMENTKIT_PRESENTATION_TEMPLATE_REGISTRY) throw new Error("missing template registry constant");',
      'const templates = theme.listJudgmentKitPresentationTemplates();',
      'if (!Array.isArray(templates) || templates.length !== 80) throw new Error("expected 80 presentation templates");',
      'if (!templates.some((template) => template.layout_id === "slide-01")) throw new Error("missing slide-01 template");',
      'if (!templates.some((template) => template.layout_id === "slide-80")) throw new Error("missing slide-80 template");',
      'const slide01 = theme.getJudgmentKitPresentationTemplate("slide-01");',
      'const requiredSelectionFields = ["activity_use", "template_use", "surface_type", "layout_family", "decision_moment", "content_roles", "major_regions", "density_budget", "typography_budget", "canvas_profile", "asset_slots", "use_when", "avoid_when", "text_flows"];',
      'for (const field of requiredSelectionFields) if (!(field in slide01.selection)) throw new Error(`missing selection field ${field}`);',
      'if (!Array.isArray(slide01.selection.major_regions) || slide01.selection.major_regions.length === 0) throw new Error("missing major region context");',
      'if (!Array.isArray(slide01.selection.text_flows) || slide01.selection.text_flows.length === 0) throw new Error("missing text flow context");',
      'if (slide01.selection.text_flows.some((flow) => "token_ids" in flow)) throw new Error("public metadata leaked text-flow token ids");',
      'if (!slide01.selection.density_budget.guidance || !slide01.selection.typography_budget.guidance) throw new Error("missing budget guidance");',
      'if (slide01.preview_ref !== "slide-preview:slide-01.png") throw new Error("missing stable preview reference");',
      'if (JSON.stringify(slide01).includes("slide-01.mjs")) throw new Error("public metadata leaked rebuild module path");',
      'if (/\\b(?:sh|tb)\\//.test(JSON.stringify(slide01))) throw new Error("public metadata leaked source-origin ids");',
      'for (const field of ["compose_contract", "public_import", "source_compose_name", "source_slot_count", "source_region_count", "source_text_flow_count", "parity"]) if (field in slide01) throw new Error(`public metadata leaked ${field}`);',
      'for (const field of ["source", "token"]) if (field in slide01.slots[0]) throw new Error(`public slot metadata leaked ${field}`);',
      'assertPublicSafe(slide01, "installed public template metadata");',
      'if (theme.getJudgmentKitPresentationTemplate("compact-decision-slide")?.layout_id !== "compact-decision-slide") throw new Error("legacy compact template alias failed");',
      'if (theme.selectJudgmentKitPresentationTemplate({ template_use: "chart", layout_family: "chart-evidence" })?.layout_id !== "slide-64") throw new Error("chart template selection failed");',
      'const ranking = theme.rankJudgmentKitPresentationTemplates({ template_use: "chart", layout_family: "chart-evidence", includeDiagnostics: true }, { includeDiagnostics: true, maxAlternatives: 2 });',
      'if (ranking.selected?.template?.layout_id !== "slide-64") throw new Error("chart template ranking failed");',
      'if (ranking.alternatives[0]?.template?.layout_id !== "slide-65") throw new Error("chart template ranking alternative failed");',
      'if (ranking.selected?.tie_count !== 2) throw new Error("chart template ranking tie count failed");',
      'assertPublicSafe(ranking, "installed template ranking");',
      'if (theme.rankJudgmentKitPresentationTemplates({ component: "table" }).selected?.template?.selection?.template_use !== "data-table") throw new Error("component template ranking failed");',
      'if (theme.selectJudgmentKitPresentationTemplate({ nativeSurface: "table" })?.selection?.template_use !== "data-table") throw new Error("native surface template selection failed");',
      'if (theme.rankJudgmentKitPresentationTemplates({ slideSize: { width: 0, height: 540 } }).selected !== null) throw new Error("invalid slide-size ranking criteria selected a template");',
      'if (theme.rankJudgmentKitPresentationTemplates({ slideSize: { width: 1024 }, height: 768 }).criteria.normalized.slide_size !== undefined) throw new Error("partial slide-size ranking criteria mixed candidates");',
      'if (theme.rankJudgmentKitPresentationTemplates({ id: "judgmentkit-template-slide-01" }).selected !== null) throw new Error("internal source compose id selected a template");',
      'try { theme.getJudgmentKitPresentationTemplate("missing-template"); throw new Error("unknown template id accepted"); } catch (error) { if (!/unknown|not found|presentation template/i.test(String(error?.message))) throw error; }',
      'try { theme.selectJudgmentKitPresentationTemplate("judgmentkit-template-slide-01"); throw new Error("internal source compose id accepted"); } catch (error) { if (!/unknown|not found|presentation template/i.test(String(error?.message))) throw error; }',
      'console.log("imports ok");',
      "",
    ].join("\n"),
  );

  run(process.execPath, [path.join(tempRoot, "check.mjs")], { cwd: tempRoot });
  run(process.execPath, [path.join(packageRoot, "bin", "judgmentkit.mjs"), "--help"], { cwd: tempRoot });

  console.log("presentation-theme package surface smoke passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
