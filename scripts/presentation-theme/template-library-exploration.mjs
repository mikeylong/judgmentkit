import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  JUDGMENTKIT_STYLE_NAMES,
  composeJudgmentKitPresentationTemplate,
  createJudgmentKitPresentation,
  listJudgmentKitPresentationTemplates,
} from "judgmentkit/presentation-theme";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_PRESENTATIONS_SKILL_DIR = path.join(
  process.env.HOME ?? "",
  ".codex/plugins/cache/openai-primary-runtime/presentations/26.630.12135/skills/presentations",
);
const DEFAULT_ARTIFACT_TOOL_PACKAGE = path.join(
  process.env.HOME ?? "",
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool",
);
const SLIDE_SIZE = Object.freeze({ width: 1280, height: 720 });
const CONTACT_SHEET_HELPER = path.join(__dirname, "create-template-contact-sheet.py");
const OUTPUT_CASES = Object.freeze({
  codexGrid: {
    id: "codex-grid-template-library-80",
    label: "Codex Grid",
    reportJson: "baseline-report.json",
    reportMd: "baseline-report.md",
    pptx: "codex-grid-template-library-80.pptx",
  },
  judgmentKit: {
    id: "judgmentkit-template-library-80",
    label: "JudgmentKit",
    reportJson: "review-report.json",
    reportMd: "review-report.md",
    pptx: "judgmentkit-template-library-80.pptx",
  },
  comparison: {
    id: "codex-grid-vs-judgmentkit-template-library-80",
    label: "Codex Grid vs JudgmentKit",
    reportJson: "comparison-report.json",
    reportMd: "comparison-report.md",
  },
});
const REVIEW_PACKET_DIR = "presentation-theme-template-library-visual-qa";

let artifactTool;
let activeOutputBase;

function cliOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function cliFlag(name) {
  return process.argv.includes(name);
}

function mode() {
  return cliOption("--mode", "all");
}

function action() {
  return cliOption("--action", "update");
}

function outputBase() {
  return activeOutputBase ?? path.resolve(REPO_ROOT, cliOption("--output-base", "outputs"));
}

function presentationsSkillDir() {
  return path.resolve(process.env.PRESENTATIONS_SKILL_DIR ?? DEFAULT_PRESENTATIONS_SKILL_DIR);
}

function pythonExecutable() {
  return process.env.JUDGMENTKIT_PPTX_PYTHON ?? process.env.PRESENTATIONS_PYTHON ?? "python3";
}

function requireExplorationGate() {
  if (process.env.JUDGMENTKIT_PPTX_ACTUAL !== "1") {
    throw new Error(
      "JUDGMENTKIT_TEMPLATE_EXPLORATION_NOT_ENABLED: set JUDGMENTKIT_PPTX_ACTUAL=1 to generate presentation template exploration outputs.",
    );
  }
}

function requireUpdateGate() {
  requireExplorationGate();
  if (process.env.JUDGMENTKIT_PPTX_UPDATE !== "1") {
    throw new Error(
      "JUDGMENTKIT_TEMPLATE_EXPLORATION_UPDATE_NOT_ENABLED: set JUDGMENTKIT_PPTX_UPDATE=1 to write template exploration outputs.",
    );
  }
}

function assertNoSymlinkPath(targetPath, rootPath) {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`JUDGMENTKIT_TEMPLATE_EXPLORATION_OUTPUT_BASE_UNSAFE: ${repoRelative(target)} is outside the repo.`);
  }

  const segments = relative ? relative.split(path.sep) : [];
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`JUDGMENTKIT_TEMPLATE_EXPLORATION_OUTPUT_BASE_UNSAFE: output path contains a symlink: ${repoRelative(current)}.`);
    }
  }
}

function validateUpdateOutputBase() {
  const resolvedOutputBase = path.resolve(outputBase());
  const defaultOutputBase = path.join(REPO_ROOT, "outputs");
  if (resolvedOutputBase !== defaultOutputBase) {
    throw new Error(
      `JUDGMENTKIT_TEMPLATE_EXPLORATION_OUTPUT_BASE_UNSAFE: update mode only writes the default ignored output base ${repoRelative(defaultOutputBase)}.`,
    );
  }
  assertNoSymlinkPath(resolvedOutputBase, REPO_ROOT);
  const repoReal = fs.realpathSync(REPO_ROOT);
  const outputParentReal = fs.realpathSync(path.dirname(resolvedOutputBase));
  if (outputParentReal !== repoReal) {
    throw new Error("JUDGMENTKIT_TEMPLATE_EXPLORATION_OUTPUT_BASE_UNSAFE: output parent resolves outside the repo root.");
  }
  if (fs.existsSync(resolvedOutputBase)) {
    const outputReal = fs.realpathSync(resolvedOutputBase);
    if (outputReal !== path.join(repoReal, "outputs")) {
      throw new Error("JUDGMENTKIT_TEMPLATE_EXPLORATION_OUTPUT_BASE_UNSAFE: output base resolves outside the repo outputs directory.");
    }
  }
}

function repoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

function artifactRef(filePath) {
  const relativeToOutput = path.relative(outputBase(), filePath).split(path.sep).join("/");
  if (!relativeToOutput.startsWith("..") && !path.isAbsolute(relativeToOutput)) {
    return path.resolve(outputBase()) === path.join(REPO_ROOT, "outputs")
      ? `outputs/${relativeToOutput}`
      : `template-output/${relativeToOutput}`;
  }
  return repoRelative(filePath);
}

function outputPath(caseInfo, ...segments) {
  return path.join(outputBase(), caseInfo.id, ...segments);
}

function pptxPath(caseInfo) {
  return path.join(outputBase(), caseInfo.pptx);
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Number(value.toFixed(4));
  }

  return value;
}

function generatedAtIso() {
  return new Date().toISOString();
}

function safeTextKey(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function textLengthBucket(value) {
  const length = String(value ?? "").replace(/\s+/g, " ").trim().length;
  if (length === 0) return "0";
  if (length <= 20) return "1-20";
  if (length <= 80) return "21-80";
  if (length <= 200) return "81-200";
  return "201+";
}

function safeTextSummary(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return {
    present: normalized.length > 0,
    sha256: sha256Buffer(normalized),
    length: normalized.length,
    length_bucket: textLengthBucket(normalized),
  };
}

function isSafeStructuralString(key, value) {
  const structuralKeys = new Set([
    "alignment",
    "axis",
    "color",
    "fill",
    "fontFamily",
    "geometry",
    "kind",
    "lineCap",
    "lineJoin",
    "name",
    "role",
    "shape",
    "stroke",
    "style",
    "type",
  ]);
  const text = String(value ?? "");
  if (!structuralKeys.has(key)) {
    return false;
  }
  if (/\/Users\/|\/home\/|\/private\/|\/var\/folders|file:\/\/|[A-Za-z]:[\\/]|\\\\|\b(?:sh|tb|sl)\//.test(text)) {
    return false;
  }
  return text.length <= 96 && !/[.!?]\s|[\n\r]/.test(text);
}

function sanitizeExplorationOutput(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeExplorationOutput(entry, key));
  }

  if (typeof value === "string" && /\b(?:sh|tb|sl)\//.test(value)) {
    return {
      kind: "opaque_id",
      sha256: sha256Buffer(value),
    };
  }

  if (typeof value === "string") {
    return isSafeStructuralString(key, value)
      ? value
      : {
          kind: "string_summary",
          ...safeTextSummary(value),
        };
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeof entry === "string" && !isSafeStructuralString(key, entry)) {
        return [`${safeTextKey(key)}_summary`, safeTextSummary(entry)];
      }
      return [key, sanitizeExplorationOutput(entry, key)];
    }),
  );
}

function sanitizeJsonText(jsonText) {
  return `${JSON.stringify(sanitizeExplorationOutput(JSON.parse(jsonText)), null, 2)}\n`;
}

function sanitizeNdjson(ndjson) {
  return `${String(ndjson)
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.stringify(sanitizeExplorationOutput(JSON.parse(line))))
    .join("\n")}\n`;
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(stable(value), null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, value);
}

async function writeBlob(filePath, blob) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveArtifactToolPackage() {
  const candidates = [
    cliOption("--artifact-tool-package"),
    process.env.JUDGMENTKIT_ARTIFACT_TOOL_PACKAGE,
    process.env.CODEX_RUNTIME_DEPENDENCIES
      ? path.join(process.env.CODEX_RUNTIME_DEPENDENCIES, "node", "node_modules", "@oai", "artifact-tool")
      : undefined,
    process.env.CODEX_WORKSPACE_DEPENDENCIES
      ? path.join(process.env.CODEX_WORKSPACE_DEPENDENCIES, "node", "node_modules", "@oai", "artifact-tool")
      : undefined,
    process.env.CODEX_DEPENDENCIES
      ? path.join(process.env.CODEX_DEPENDENCIES, "node", "node_modules", "@oai", "artifact-tool")
      : undefined,
    DEFAULT_ARTIFACT_TOOL_PACKAGE,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const packageJsonPath = path.join(candidate, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = readJson(packageJsonPath);
    if (packageJson.name !== "@oai/artifact-tool") {
      throw new Error(`JUDGMENTKIT_TEMPLATE_EXPLORATION_INVALID_RUNTIME: ${candidate} is not @oai/artifact-tool.`);
    }

    if (!String(packageJson.version ?? "").startsWith("2.")) {
      throw new Error(
        `JUDGMENTKIT_TEMPLATE_EXPLORATION_UNSUPPORTED_RUNTIME: @oai/artifact-tool ${packageJson.version} is not supported.`,
      );
    }

    return path.resolve(candidate);
  }

  throw new Error(
    "JUDGMENTKIT_TEMPLATE_EXPLORATION_RUNTIME_MISSING: set JUDGMENTKIT_ARTIFACT_TOOL_PACKAGE or --artifact-tool-package.",
  );
}

async function loadArtifactTool() {
  if (artifactTool) {
    return artifactTool;
  }

  const packagePath = resolveArtifactToolPackage();
  const modulePath = path.join(packagePath, "dist", "artifact_tool.mjs");
  artifactTool = {
    ...(await import(pathToFileURL(modulePath).href)),
    packagePath,
  };
  return artifactTool;
}

function preflightContactSheetRuntime() {
  if (cliFlag("--skip-contact-sheets")) {
    return { status: "skipped" };
  }

  try {
    const output = execFileSync(
      pythonExecutable(),
      ["-c", "import json, PIL; print(json.dumps({'pil': True}))"],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { status: "available", python: pythonExecutable(), probe: JSON.parse(output) };
  } catch (error) {
    throw new Error(
      [
        "JUDGMENTKIT_TEMPLATE_CONTACT_SHEET_RUNTIME_MISSING: contact sheets require Pillow.",
        "Install Pillow for the selected Python runtime, pass --skip-contact-sheets, or set JUDGMENTKIT_PPTX_PYTHON.",
        error.stderr?.toString()?.trim() || error.message,
      ].join("\n"),
    );
  }
}

async function inspectCodexGridReference() {
  const skillDir = presentationsSkillDir();
  const sourceRoot = path.join(skillDir, "assets", "builtin_templates", "codex-grid-layout-library");
  const codexGridRegistry = path.join(
    skillDir,
    "assets",
    "builtin_templates",
    "codex-grid-layout-library",
    "artifact-tool-compose",
    "template-registry.json",
  );
  const codexGridIndex = path.join(sourceRoot, "artifact-tool-compose", "index.mjs");

  if (!fs.existsSync(codexGridRegistry)) {
    throw new Error(`JUDGMENTKIT_CODEX_GRID_REFERENCE_MISSING: missing ${codexGridRegistry}`);
  }
  if (!fs.existsSync(codexGridIndex)) {
    throw new Error(`JUDGMENTKIT_CODEX_GRID_REFERENCE_MISSING: missing ${codexGridIndex}`);
  }

  const workspace = await prepareCodexGridWorkspace();
  try {
    const registry = readJson(path.join(workspace.localRoot, "artifact-tool-compose", "template-registry.json"));
    const { builders } = await import(
      `${pathToFileURL(path.join(workspace.localRoot, "artifact-tool-compose", "index.mjs")).href}?preflight=${Date.now()}`,
    );

    if (!Array.isArray(registry.templates) || registry.templates.length !== 80) {
      throw new Error(
        `JUDGMENTKIT_CODEX_GRID_REFERENCE_INVALID: expected 80 registry templates, found ${registry.templates?.length ?? "unknown"}.`,
      );
    }

    if (!Array.isArray(builders) || builders.length !== 80 || builders.some((builder) => typeof builder !== "function")) {
      throw new Error(
        `JUDGMENTKIT_CODEX_GRID_REFERENCE_INVALID: expected 80 builder functions, found ${builders?.length ?? "unknown"}.`,
      );
    }

    return {
      builder_count: builders.length,
      registry: "PRESENTATIONS_SKILL_DIR/assets/builtin_templates/codex-grid-layout-library/artifact-tool-compose/template-registry.json",
      status: "available",
      template_count: registry.templates.length,
    };
  } finally {
    await fsp.rm(workspace.workspace, { force: true, recursive: true });
  }
}

async function runPreflight() {
  const tool = await loadArtifactTool();
  const packageJson = readJson(path.join(tool.packagePath, "package.json"));
  const requiredExports = ["FileBlob", "Presentation", "PresentationFile", "layers", "shape", "table", "text"];
  const missingExports = requiredExports.filter((name) => typeof tool[name] === "undefined");

  if (missingExports.length > 0) {
    throw new Error(
      `JUDGMENTKIT_TEMPLATE_EXPLORATION_INVALID_RUNTIME: missing artifact-tool exports: ${missingExports.join(", ")}`,
    );
  }

  return {
    artifact_tool: {
      package_name: "@oai/artifact-tool",
      package_version: packageJson.version,
      required_exports: requiredExports,
      status: "available",
    },
    codex_grid_reference: await inspectCodexGridReference(),
    contact_sheets: preflightContactSheetRuntime(),
    status: "passed",
  };
}

async function prepareCodexGridWorkspace() {
  const skillDir = presentationsSkillDir();
  const sourceRoot = path.join(skillDir, "assets", "builtin_templates", "codex-grid-layout-library");
  const sourceRegistry = path.join(sourceRoot, "artifact-tool-compose", "template-registry.json");

  if (!fs.existsSync(sourceRegistry)) {
    throw new Error(`JUDGMENTKIT_CODEX_GRID_REFERENCE_MISSING: missing ${sourceRegistry}`);
  }

  const tool = await loadArtifactTool();
  const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), "judgmentkit-template-library-"));
  const localRoot = path.join(workspace, "codex-grid-layout-library");
  const packageLink = path.join(workspace, "node_modules", "@oai", "artifact-tool");

  try {
    await fsp.cp(sourceRoot, localRoot, { recursive: true });
    await fsp.mkdir(path.dirname(packageLink), { recursive: true });
    await fsp.symlink(tool.packagePath, packageLink, "dir");
  } catch (error) {
    await fsp.rm(workspace, { force: true, recursive: true });
    throw error;
  }

  return {
    localRoot,
    sourceRoot,
    workspace,
  };
}

function asNumber(value) {
  if (typeof value === "string" && value.endsWith("px")) {
    return Number.parseFloat(value);
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function frameFrom(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    const [left, top, width, height] = value.map(asNumber);
    if ([left, top, width, height].some((entry) => entry === undefined)) {
      return null;
    }
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  const position = value.position && typeof value.position === "object" ? value.position : value;
  const left = asNumber(position.left ?? position.x);
  const top = asNumber(position.top ?? position.y);
  const width = asNumber(position.width ?? position.w ?? value.width ?? value.w);
  const height = asNumber(position.height ?? position.h ?? value.height ?? value.h);

  if ([left, top, width, height].some((entry) => entry === undefined)) {
    return null;
  }

  return { left, top, width, height, right: left + width, bottom: top + height };
}

function summaryText(value) {
  if (!value || typeof value !== "object" || value.present !== true) {
    return "";
  }

  return "x".repeat(Math.max(1, Number(value.length) || 1));
}

function textValueFromLayoutObject(value) {
  for (const key of ["text", "preview", "label"]) {
    if (typeof value[key] === "string") {
      return value[key];
    }
  }

  for (const key of ["text_summary", "text_preview_summary", "preview_summary", "label_summary", "title_summary"]) {
    const summary = summaryText(value[key]);
    if (summary) {
      return summary;
    }
  }

  return "";
}

function collectLayoutObjects(value, slideNumber, out = [], ancestry = []) {
  if (!value || typeof value !== "object") {
    return out;
  }

  const directFrame =
    frameFrom(value) ??
    frameFrom(value.bounds) ??
    frameFrom(value.bbox) ??
    frameFrom(value.frame) ??
    frameFrom(value.layout) ??
    frameFrom(value.renderedLayout);
  const name = value.name ?? value.id ?? value.kind ?? value.type ?? ancestry.at(-1) ?? "object";
  const textValue = textValueFromLayoutObject(value);

  if (directFrame) {
    out.push({
      slide_number: slideNumber,
      name: String(name),
      kind: String(value.kind ?? value.type ?? value.geometry ?? "object"),
      text: textValue,
      frame: directFrame,
      font_size:
        value.resolvedFontSize ??
        value.fontSize ??
        value.font_size ??
        value.textStyle?.fontSize ??
        value.style?.fontSize ??
        value.resolvedTextStyle?.fontSize,
    });
  }

  for (const [key, child] of Object.entries(value)) {
    if (!child || key === "parent" || key === "theme") {
      continue;
    }
    if (Array.isArray(child)) {
      for (const [index, item] of child.entries()) {
        collectLayoutObjects(item, slideNumber, out, [...ancestry, `${key}[${index}]`]);
      }
      continue;
    }
    if (typeof child === "object") {
      collectLayoutObjects(child, slideNumber, out, [...ancestry, key]);
    }
  }

  return out;
}

function objectKey(object) {
  const frame = object.frame;
  return `${object.name}|${object.kind}|${Math.round(frame.left * 10)}|${Math.round(frame.top * 10)}|${Math.round(frame.width * 10)}|${Math.round(frame.height * 10)}`;
}

function dedupeObjects(objects) {
  const seen = new Set();
  const deduped = [];
  for (const object of objects) {
    const key = objectKey(object);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(object);
    }
  }
  return deduped;
}

function area(frame) {
  return Math.max(0, frame.width) * Math.max(0, frame.height);
}

function intersection(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function isTextObject(object) {
  return Boolean(object.text) || /text|paragraph|textbox/i.test(object.kind) || /title|label|footer|placeholder|slot/i.test(object.name);
}

function estimateLines(textValue, width, fontSize) {
  const text = String(textValue ?? "").replace(/\s+/g, " ").trim();
  if (!text) {
    return 0;
  }
  const charactersPerLine = Math.max(1, Math.floor(width / (fontSize * 0.52)));
  return Math.ceil(text.length / charactersPerLine);
}

function summarizeFindings(allFindings) {
  const byType = {};
  const bySeverity = {};
  for (const finding of allFindings) {
    byType[finding.type] = (byType[finding.type] ?? 0) + 1;
    bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
  }
  return { bySeverity, byType, total: allFindings.length };
}

function layoutCoverageSummary(audit) {
  return {
    slide_count: audit.slideReports.length,
    slides_with_text: audit.slideReports.filter((slide) => slide.text_object_count > 0).length,
    text_object_count: audit.slideReports.reduce((sum, slide) => sum + slide.text_object_count, 0),
  };
}

function assertImportedCoverage(sourceCoverage, importedCoverage) {
  if (sourceCoverage.text_object_count > 0 && importedCoverage.text_object_count === 0) {
    throw new Error(
      "JUDGMENTKIT_TEMPLATE_IMPORTED_COVERAGE_COLLAPSED: imported layout extraction found zero text objects while source layouts contain text.",
    );
  }
}

function findingSeverityWeight(finding) {
  return { High: 3, Medium: 2, Low: 1 }[finding.severity] ?? 0;
}

function roundNumber(value, decimals = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(decimals)) : undefined;
}

function compactFrame(frame) {
  if (!frame) {
    return undefined;
  }
  return {
    height: roundNumber(frame.height),
    left: roundNumber(frame.left),
    top: roundNumber(frame.top),
    width: roundNumber(frame.width),
  };
}

function safeObjectRef(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  if (/\/Users\/|\/private\/|\/var\/folders|\b(?:sh|tb|sl)\//.test(text)) {
    return `object:${sha256(text).slice(0, 12)}`;
  }
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function findingTriageDetail(finding) {
  const objectRefs = [finding.object, ...(Array.isArray(finding.objects) ? finding.objects : [])]
    .map(safeObjectRef)
    .filter(Boolean);
  return {
    estimated_lines: roundNumber(finding.estimated_lines, 1),
    estimated_required_height: roundNumber(finding.estimated_required_height, 1),
    font_size: roundNumber(finding.font_size, 1),
    frame: compactFrame(finding.frame),
    object_refs: objectRefs,
    overlap_area: roundNumber(finding.overlap_area, 1),
    overlap_ratio_of_smaller: roundNumber(finding.overlap_ratio_of_smaller, 2),
    severity: finding.severity,
    type: finding.type,
  };
}

function roleFromObject(object) {
  const value = `${object.kind ?? ""} ${object.name ?? ""}`.toLowerCase();
  if (/title|heading/.test(value)) {
    return "title";
  }
  if (/subtitle|summary|body|paragraph|text|textbox|placeholder/.test(value)) {
    return "body";
  }
  if (/label|eyebrow|caption/.test(value)) {
    return "label";
  }
  if (/footer/.test(value)) {
    return "footer";
  }
  if (/table/.test(value)) {
    return "table";
  }
  if (/chart|graph|plot/.test(value)) {
    return "chart";
  }
  if (/image|picture|media/.test(value)) {
    return "media";
  }
  if (/shape|rect|line|svg/.test(value)) {
    return "shape";
  }
  return "object";
}

function roleKey(role) {
  return `role_${String(role).replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
}

function summarizeFontSizes(textObjects) {
  const values = textObjects
    .map((object) => asNumber(object.font_size))
    .filter((value) => value !== undefined)
    .sort((left, right) => left - right);
  if (values.length === 0) {
    return null;
  }
  return {
    count: values.length,
    max: roundNumber(values.at(-1), 1),
    median: roundNumber(values[Math.floor(values.length / 2)], 1),
    min: roundNumber(values[0], 1),
  };
}

function mergeBbox(box, frame) {
  return {
    left: Math.min(box.left, frame.left),
    top: Math.min(box.top, frame.top),
    right: Math.max(box.right, frame.right),
    bottom: Math.max(box.bottom, frame.bottom),
  };
}

function normalizeBbox(box) {
  if (!Number.isFinite(box.left)) {
    return null;
  }
  return {
    bottom: roundNumber(box.bottom),
    left: roundNumber(box.left),
    right: roundNumber(box.right),
    top: roundNumber(box.top),
  };
}

function summarizeRoleFrames(objects) {
  const groups = new Map();
  for (const object of objects) {
    const role = roleKey(roleFromObject(object));
    const group =
      groups.get(role) ??
      {
        bbox: { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        count: 0,
        text_frame_area: 0,
      };
    group.count += 1;
    group.bbox = mergeBbox(group.bbox, object.frame);
    if (isTextObject(object)) {
      group.text_frame_area += area(object.frame);
    }
    groups.set(role, group);
  }

  return Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([role, group]) => [
        role,
        {
          bbox: normalizeBbox(group.bbox),
          count: group.count,
          text_frame_area: roundNumber(group.text_frame_area),
        },
      ]),
  );
}

function topFlaggedSlides(audit, caseInfo, { comparisonCase = OUTPUT_CASES.comparison, previewKind = "source" } = {}) {
  return audit.slideReports
    .filter((slide) => slide.findings.length > 0)
    .map((slide) => {
      const highestSeverity = slide.findings.reduce(
        (highest, finding) =>
          findingSeverityWeight(finding) > findingSeverityWeight({ severity: highest })
            ? finding.severity
            : highest,
        "Low",
      );
      const start = Math.floor((slide.slide_number - 1) / 20) * 20 + 1;
      const end = start + 19;
      const range = `${pad(start)}-${pad(end)}`;
      const layoutDir = previewKind === "imported" ? "imported-layouts" : "layouts";
      return {
        comparison_sheet: artifactRef(outputPath(comparisonCase, "contact-sheets", `${previewKind}-preview-comparison-${range}.png`)),
        finding_count: slide.findings.length,
        finding_types: [...new Set(slide.findings.map((finding) => finding.type))].sort(),
        full_png: artifactRef(outputPath(caseInfo, `${previewKind}-preview`, `slide-${pad(slide.slide_number)}.png`)),
        highest_severity: highestSeverity,
        layout_family: slide.layout_family,
        layout_json: artifactRef(outputPath(caseInfo, layoutDir, `slide-${pad(slide.slide_number)}.layout.json`)),
        layout_id: slide.layout_id,
        range_sheet: artifactRef(outputPath(caseInfo, "contact-sheets", `${previewKind}-preview-${range}.png`)),
        slide_number: slide.slide_number,
        template_use: slide.template_use,
        top_findings: slide.findings
          .slice()
          .sort((left, right) => findingSeverityWeight(right) - findingSeverityWeight(left))
          .slice(0, 4)
          .map(findingTriageDetail),
      };
    })
    .sort(
      (left, right) =>
        findingSeverityWeight({ severity: right.highest_severity }) -
          findingSeverityWeight({ severity: left.highest_severity }) ||
        right.finding_count - left.finding_count ||
        left.slide_number - right.slide_number,
    );
}

function summarizeLayoutObjects(objects) {
  const textObjects = objects.filter(isTextObject).filter((object) => area(object.frame) > 0);
  const roles = objects.map(roleFromObject);
  const roleCounts = roles.reduce((counts, role) => {
    const key = roleKey(role);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const bbox = objects.reduce(
    (box, object) => ({
      left: Math.min(box.left, object.frame.left),
      top: Math.min(box.top, object.frame.top),
      right: Math.max(box.right, object.frame.right),
      bottom: Math.max(box.bottom, object.frame.bottom),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );

  return {
    font_size_summary: summarizeFontSizes(textObjects),
    object_count: objects.length,
    reading_order_signature: roles.slice(0, 16),
    role_counts: roleCounts,
    role_frame_summary: summarizeRoleFrames(objects),
    text_object_count: textObjects.length,
    text_frame_area: Number(textObjects.reduce((sum, object) => sum + area(object.frame), 0).toFixed(2)),
    visible_bbox: Number.isFinite(bbox.left) ? bbox : null,
    near_edge_text_objects: textObjects
      .filter((object) => object.frame.left < 8 || object.frame.top < 8 || object.frame.right > SLIDE_SIZE.width - 8 || object.frame.bottom > SLIDE_SIZE.height - 8)
      .map((object) => object.name),
  };
}

async function summarizeLayouts(dir, slideCount) {
  const slides = [];
  for (let slideNumber = 1; slideNumber <= slideCount; slideNumber += 1) {
    const layout = readJson(path.join(dir, `slide-${pad(slideNumber)}.layout.json`));
    const objects = dedupeObjects(collectLayoutObjects(layout, slideNumber)).filter((object) => area(object.frame) > 0);
    slides.push({
      slide_number: slideNumber,
      ...summarizeLayoutObjects(objects),
    });
  }
  return slides;
}

async function auditLayoutFiles(templates, dir) {
  const slideReports = [];
  const allFindings = [];

  for (const template of templates) {
    const slideNumber = template.slide_number;
    const layout = readJson(path.join(dir, `slide-${pad(slideNumber)}.layout.json`));
    const objects = dedupeObjects(collectLayoutObjects(layout, slideNumber));
    const textObjects = objects.filter(isTextObject).filter((object) => area(object.frame) > 0);
    const findings = [];

    for (const object of objects) {
      const f = object.frame;
      if (f.width < 0 || f.height < 0 || ![f.left, f.top, f.right, f.bottom].every(Number.isFinite)) {
        findings.push({ frame: f, object: object.name, severity: "High", type: "invalid_frame" });
      }

      if (f.left < -1 || f.top < -1 || f.right > SLIDE_SIZE.width + 1 || f.bottom > SLIDE_SIZE.height + 1) {
        findings.push({ frame: f, object: object.name, severity: "High", type: "out_of_bounds" });
      }
    }

    for (const object of textObjects) {
      const fontSize = asNumber(object.font_size) ?? (object.name.includes("title") ? 34 : 16);
      const lines = estimateLines(object.text || object.name, object.frame.width, fontSize);
      const requiredHeight = Math.max(fontSize * 1.25, lines * fontSize * 1.18);

      if (object.frame.width < 48 || object.frame.height < Math.max(14, fontSize * 0.85)) {
        findings.push({
          frame: object.frame,
          font_size: fontSize,
          object: object.name,
          severity: "Medium",
          type: "very_small_text_frame",
        });
      }

      if (lines > 0 && object.frame.height + 2 < requiredHeight) {
        findings.push({
          estimated_lines: lines,
          estimated_required_height: Number(requiredHeight.toFixed(1)),
          font_size: fontSize,
          frame: object.frame,
          object: object.name,
          severity: "Medium",
          type: "possible_text_overflow",
        });
      }
    }

    for (let i = 0; i < textObjects.length; i += 1) {
      for (let j = i + 1; j < textObjects.length; j += 1) {
        const a = textObjects[i];
        const b = textObjects[j];
        const overlap = intersection(a.frame, b.frame);
        const minArea = Math.min(area(a.frame), area(b.frame));
        if (overlap > 500 && minArea > 0 && overlap / minArea > 0.35) {
          findings.push({
            objects: [a.name, b.name],
            overlap_area: Number(overlap.toFixed(1)),
            overlap_ratio_of_smaller: Number((overlap / minArea).toFixed(2)),
            severity: "Medium",
            type: "possible_text_overlap",
          });
        }
      }
    }

    const uniqueFindings = [...new Map(findings.map((finding) => [JSON.stringify(finding), finding])).values()];
    const objectSummary = summarizeLayoutObjects(objects.filter((object) => area(object.frame) > 0));
    slideReports.push({
      font_size_summary: objectSummary.font_size_summary,
      findings: uniqueFindings,
      layout_family: template.selection?.layout_family,
      layout_id: template.layout_id,
      object_count: objects.length,
      reading_order_signature: objectSummary.reading_order_signature,
      role_counts: objectSummary.role_counts,
      role_frame_summary: objectSummary.role_frame_summary,
      slide_number: slideNumber,
      template_use: template.selection?.template_use,
      text_frame_area: objectSummary.text_frame_area,
      text_object_count: textObjects.length,
      visible_bbox: objectSummary.visible_bbox,
    });
    allFindings.push(
      ...uniqueFindings.map((finding) => ({
        ...finding,
        layout_id: template.layout_id,
        slide_number: slideNumber,
      })),
    );
  }

  return { allFindings, slideReports };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slotValue(template, slot, slotIndex) {
  const number = pad(template.slide_number);
  const use = titleCase(template.selection?.template_use);
  const family = titleCase(template.selection?.layout_family);

  if (slot.role === "title") {
    return slot.name === "title" ? `${number}. ${use} template` : `${family} ${slotIndex + 1}`;
  }
  if (slot.role === "label" || slot.role === "eyebrow") {
    return `${use.toUpperCase()} ${number}`;
  }
  if (slot.role === "footer") {
    return `JudgmentKit ${template.layout_id}`;
  }
  if (slot.role === "stat") {
    return String(template.selection?.density_budget?.max_text_tokens ?? template.source_slot_count ?? slotIndex + 1);
  }
  if (slot.role === "subtitle" || slot.role === "summary") {
    return `Use this when the story needs ${template.selection?.decision_moment ?? "a clear decision moment"}.`;
  }
  if (slot.role === "handoff") {
    return "Reader leaves with the main decision and a named next step.";
  }
  if (slot.role === "risk") {
    return "Check whether the frame holds readable copy without crowding nearby regions.";
  }
  if (slot.role === "evidence" || slot.role === "body") {
    return "This slot should preserve hierarchy, spacing, and bounded text.";
  }
  return `${family} slot ${slotIndex + 1}`;
}

function sampleJudgmentKitContent(template) {
  const number = pad(template.slide_number);
  const use = titleCase(template.selection?.template_use);
  const family = titleCase(template.selection?.layout_family);
  const content = {
    categories: ["Hierarchy", "Bounds", "Theme"],
    evidence: [
      "The hierarchy should be obvious at contact-sheet scale.",
      "Text should stay inside its assigned region.",
      "Spacing should preserve a clear reading order.",
    ],
    evidenceTitle: "Primary read",
    eyebrow: `${use.toUpperCase()} ${number}`,
    handoff: "Use the preview to decide whether this template is safe for real presentation content.",
    handoffTitle: "Exit state",
    label: `${use.toUpperCase()} ${number}`,
    metrics: [
      { detail: "Template regions", label: "Slots", value: String(template.source_slot_count ?? template.slots?.length ?? 0) },
      { detail: "Declared budget", label: "Density", value: titleCase(template.selection?.density_budget?.level) },
      { detail: "Template type", label: "Use", value: use },
    ],
    risk: [
      "Small frames expose typography or bounding-box problems.",
      "Dense copy should not collide with adjacent objects.",
    ],
    riskTitle: "Watch",
    rows: [
      ["Check", "Expected", "Status"],
      ["Hierarchy", "Readable", "Review"],
      ["Bounds", "Inside frame", "Review"],
      ["Theme", "JudgmentKit", "Review"],
    ],
    series: [{ fill: "accent1", name: "Review", values: [8, 6, 9] }],
    status: "Ready",
    statusTone: "success",
    subtitle: `JudgmentKit-styled ${family.toLowerCase()} layout sample.`,
    title: `${number}. ${use} template`,
  };

  for (const [index, slot] of (template.slots ?? []).entries()) {
    content[slot.name] = slotValue(template, slot, index);
    if (slot.content_key) {
      content[slot.content_key] = content[slot.name];
    }
  }

  return content;
}

async function exportPresentationArtifacts(presentation, caseInfo) {
  const root = outputPath(caseInfo);
  const sourcePreviewDir = outputPath(caseInfo, "source-preview");
  const importedPreviewDir = outputPath(caseInfo, "imported-preview");
  const layoutDir = outputPath(caseInfo, "layouts");
  const importedLayoutDir = outputPath(caseInfo, "imported-layouts");
  const inspectPath = outputPath(caseInfo, "inspect.ndjson");
  const importedInspectPath = outputPath(caseInfo, "imported.inspect.ndjson");
  const deckPath = pptxPath(caseInfo);
  const deckInspectSidecarPath = `${deckPath}.inspect.ndjson`;
  const { FileBlob, PresentationFile } = await loadArtifactTool();

  await fsp.rm(root, { force: true, recursive: true });
  await fsp.rm(deckPath, { force: true });
  await fsp.rm(deckInspectSidecarPath, { force: true });
  for (const dir of [sourcePreviewDir, importedPreviewDir, layoutDir, importedLayoutDir]) {
    await fsp.mkdir(dir, { recursive: true });
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${pad(index + 1)}`;
    await writeBlob(path.join(sourcePreviewDir, `${stem}.png`), await presentation.export({ format: "png", scale: 1, slide }));
    await writeText(path.join(layoutDir, `${stem}.layout.json`), sanitizeJsonText(await (await slide.export({ format: "layout" })).text()));
  }

  const inspect = await presentation.inspect({
    kind: "slide,textbox,shape,table,chart,layout",
    maxChars: 400000,
  });
  await writeText(inspectPath, sanitizeNdjson(inspect.ndjson));
  await (await PresentationFile.exportPptx(presentation)).save(deckPath);
  await fsp.rm(deckInspectSidecarPath, { force: true });

  const imported = await PresentationFile.importPptx(await FileBlob.load(deckPath));
  for (const [index, slide] of imported.slides.items.entries()) {
    const stem = `slide-${pad(index + 1)}`;
    await writeBlob(path.join(importedPreviewDir, `${stem}.png`), await imported.export({ format: "png", scale: 1, slide }));
    await writeText(path.join(importedLayoutDir, `${stem}.layout.json`), sanitizeJsonText(await (await slide.export({ format: "layout" })).text()));
  }

  const importedInspect = await imported.inspect({
    kind: "slide,textbox,shape,table,chart,layout",
    maxChars: 400000,
  });
  await writeText(importedInspectPath, sanitizeNdjson(importedInspect.ndjson));

  return {
    deckPath,
    imported,
    importedInspectPath,
    importedLayoutDir,
    importedPreviewDir,
    inspectPath,
    layoutDir,
    root,
    sourcePreviewDir,
  };
}

function contactSheetArgs(inputDir, outputFile, options = {}) {
  const args = [
    CONTACT_SHEET_HELPER,
    "--input-dir",
    inputDir,
    "--output-file",
    outputFile,
    "--columns",
    String(options.columns ?? 5),
    "--thumb-width",
    String(options.thumbWidth ?? 320),
  ];

  if (options.rightDir) {
    args.push("--right-dir", options.rightDir);
    args.push("--left-label", options.leftLabel ?? "left");
    args.push("--right-label", options.rightLabel ?? "right");
  }

  if (options.startSlide) {
    args.push("--start-slide", String(options.startSlide));
  }

  if (options.endSlide) {
    args.push("--end-slide", String(options.endSlide));
  }

  return args;
}

function writeContactSheet(inputDir, outputFile, options = {}) {
  if (cliFlag("--skip-contact-sheets")) {
    return { path: artifactRef(outputFile), status: "skipped" };
  }

  try {
    execFileSync(pythonExecutable(), contactSheetArgs(inputDir, outputFile, options), {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    return { path: artifactRef(outputFile), status: "written" };
  } catch (error) {
    throw new Error(
      [
        "JUDGMENTKIT_TEMPLATE_CONTACT_SHEET_FAILED: could not generate contact sheet.",
        "Install Pillow for the selected Python runtime, pass --skip-contact-sheets, or set JUDGMENTKIT_PPTX_PYTHON.",
        error.stderr?.toString()?.trim() || error.message,
      ].join("\n"),
    );
  }
}

function writeCaseContactSheets(caseInfo) {
  const contactDir = outputPath(caseInfo, "contact-sheets");
  const ranges = [
    [1, 20],
    [21, 40],
    [41, 60],
    [61, 80],
  ];

  const chunks = Object.fromEntries(
    ranges.flatMap(([startSlide, endSlide]) => {
      const rangeLabel = `${pad(startSlide)}-${pad(endSlide)}`;
      return [
        [
          `source_${rangeLabel}`,
          writeContactSheet(
            outputPath(caseInfo, "source-preview"),
            path.join(contactDir, `source-preview-${rangeLabel}.png`),
            { columns: 4, startSlide, endSlide },
          ),
        ],
        [
          `imported_${rangeLabel}`,
          writeContactSheet(
            outputPath(caseInfo, "imported-preview"),
            path.join(contactDir, `imported-preview-${rangeLabel}.png`),
            { columns: 4, startSlide, endSlide },
          ),
        ],
      ];
    }),
  );

  return {
    imported: writeContactSheet(
      outputPath(caseInfo, "imported-preview"),
      path.join(contactDir, "imported-preview.png"),
    ),
    source: writeContactSheet(
      outputPath(caseInfo, "source-preview"),
      path.join(contactDir, "source-preview.png"),
    ),
    ...chunks,
  };
}

function rangeLabels() {
  return ["01-20", "21-40", "41-60", "61-80"];
}

function walkFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      out.push(filePath);
      continue;
    }
    if (entry.isDirectory()) {
      out.push(...walkFiles(filePath));
      continue;
    }
    out.push(filePath);
  }
  return out;
}

function addExpectedCasePaths(expected, caseInfo) {
  expected.add(pptxPath(caseInfo));
  expected.add(outputPath(caseInfo, caseInfo.reportJson));
  expected.add(outputPath(caseInfo, caseInfo.reportMd));
  expected.add(outputPath(caseInfo, "inspect.ndjson"));
  expected.add(outputPath(caseInfo, "imported.inspect.ndjson"));
  for (let slideNumber = 1; slideNumber <= 80; slideNumber += 1) {
    const stem = `slide-${pad(slideNumber)}`;
    expected.add(outputPath(caseInfo, "source-preview", `${stem}.png`));
    expected.add(outputPath(caseInfo, "imported-preview", `${stem}.png`));
    expected.add(outputPath(caseInfo, "layouts", `${stem}.layout.json`));
    expected.add(outputPath(caseInfo, "imported-layouts", `${stem}.layout.json`));
  }
  if (!cliFlag("--skip-contact-sheets")) {
    expected.add(outputPath(caseInfo, "contact-sheets", "source-preview.png"));
    expected.add(outputPath(caseInfo, "contact-sheets", "imported-preview.png"));
    for (const range of rangeLabels()) {
      expected.add(outputPath(caseInfo, "contact-sheets", `source-preview-${range}.png`));
      expected.add(outputPath(caseInfo, "contact-sheets", `imported-preview-${range}.png`));
    }
  }
}

function addExpectedComparisonPaths(expected) {
  const caseInfo = OUTPUT_CASES.comparison;
  expected.add(outputPath(caseInfo, caseInfo.reportJson));
  expected.add(outputPath(caseInfo, caseInfo.reportMd));
  expected.add(outputPath(caseInfo, "manifest.json"));
  expected.add(outputPath(caseInfo, "index.md"));
  expected.add(path.join(outputBase(), REVIEW_PACKET_DIR, "manifest.json"));
  expected.add(path.join(outputBase(), REVIEW_PACKET_DIR, "index.md"));
  if (!cliFlag("--skip-contact-sheets")) {
    expected.add(outputPath(caseInfo, "contact-sheets", "source-preview-comparison.png"));
    expected.add(outputPath(caseInfo, "contact-sheets", "imported-preview-comparison.png"));
    for (const range of rangeLabels()) {
      expected.add(outputPath(caseInfo, "contact-sheets", `source-preview-comparison-${range}.png`));
      expected.add(outputPath(caseInfo, "contact-sheets", `imported-preview-comparison-${range}.png`));
    }
  }
}

function expectedExplorationOutputPaths(requestedMode) {
  const expected = new Set();
  if (requestedMode === "codex-grid" || requestedMode === "all") {
    addExpectedCasePaths(expected, OUTPUT_CASES.codexGrid);
  }
  if (requestedMode === "judgmentkit" || requestedMode === "all") {
    addExpectedCasePaths(expected, OUTPUT_CASES.judgmentKit);
  }
  if (requestedMode === "compare" || requestedMode === "all") {
    addExpectedComparisonPaths(expected);
  }
  return expected;
}

function outputRootsForMode(requestedMode) {
  const roots = [
    ...(requestedMode === "codex-grid" || requestedMode === "all" ? [outputPath(OUTPUT_CASES.codexGrid)] : []),
    ...(requestedMode === "judgmentkit" || requestedMode === "all" ? [outputPath(OUTPUT_CASES.judgmentKit)] : []),
    ...(requestedMode === "compare" || requestedMode === "all"
      ? [outputPath(OUTPUT_CASES.comparison), path.join(outputBase(), REVIEW_PACKET_DIR)]
      : []),
  ];
  return roots;
}

function rootArtifactCandidatesForMode(requestedMode) {
  const paths = [];
  if (requestedMode === "codex-grid" || requestedMode === "all") {
    paths.push(pptxPath(OUTPUT_CASES.codexGrid), `${pptxPath(OUTPUT_CASES.codexGrid)}.inspect.ndjson`);
  }
  if (requestedMode === "judgmentkit" || requestedMode === "all") {
    paths.push(pptxPath(OUTPUT_CASES.judgmentKit), `${pptxPath(OUTPUT_CASES.judgmentKit)}.inspect.ndjson`);
  }
  return paths;
}

function assertArtifactHeader(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size <= 0) {
    throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: empty output file is not allowed: ${repoRelative(filePath)}`);
  }
  const header = fs.readFileSync(filePath).subarray(0, 8);
  if (path.extname(filePath) === ".pptx" && header.subarray(0, 2).toString("utf8") !== "PK") {
    throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: PPTX header is invalid: ${repoRelative(filePath)}`);
  }
  if (path.extname(filePath) === ".png" && header.subarray(0, 4).toString("hex") !== "89504e47") {
    throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: PNG header is invalid: ${repoRelative(filePath)}`);
  }
}

function assertExplorationOutputPolicy(requestedMode) {
  const roots = outputRootsForMode(requestedMode);
  const expected = expectedExplorationOutputPaths(requestedMode);
  const actual = new Set([
    ...roots.flatMap(walkFiles),
    ...rootArtifactCandidatesForMode(requestedMode).filter((filePath) => fs.existsSync(filePath)),
  ]);
  const allowedExtensions = new Set([".json", ".md", ".ndjson", ".png", ".pptx"]);
  const forbiddenNames = new Set(["package.json", "package-lock.json", "node_modules", ".cache"]);

  for (const filePath of expected) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: expected output is missing: ${repoRelative(filePath)}`);
    }
  }

  for (const filePath of actual) {
    const stat = fs.lstatSync(filePath);
    const relative = repoRelative(filePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: symlink output is not allowed: ${relative}`);
    }
    if (stat.isDirectory()) {
      continue;
    }
    if (!expected.has(filePath)) {
      throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: unmanaged output file is not allowed: ${relative}`);
    }
    if (forbiddenNames.has(path.basename(filePath)) || !allowedExtensions.has(path.extname(filePath))) {
      throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: unmanaged output file is not allowed: ${relative}`);
    }
    if (/\.(pptx|png)$/i.test(filePath)) {
      assertArtifactHeader(filePath);
    }
    if (/\.(json|md|ndjson)$/i.test(filePath)) {
      const source = fs.readFileSync(filePath, "utf8");
      if (/\/Users\/|\/home\/|\/private\/|\/var\/folders|file:\/\/|[A-Za-z]:[\\/]|\\\\|\b(?:sh|tb|sl)\//.test(source)) {
        throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: local path or raw source id leaked into ${relative}`);
      }
      if (/"(?:text|textPreview|body|title|label|preview|prompt|alt|sourceText|rawText|slideCopy|extractorPreview)"\s*:/.test(source)) {
        throw new Error(`JUDGMENTKIT_TEMPLATE_OUTPUT_POLICY: raw text payload leaked into ${relative}`);
      }
    }
  }
}

function codexGridMarkdown(report) {
  return `# Codex Grid Template Library 80 Baseline

PPTX: ${report.pptx.path}
Slides: ${report.slide_count}
Templates: ${report.template_count}

This deck was generated directly from the bundled Codex Grid artifact-tool Compose modules, without JudgmentKit.

## Outputs

- Source previews: ${report.previews.source_preview_dir}
- Imported previews: ${report.previews.imported_preview_dir}
- Source layouts: ${report.layouts.source_layout_dir}
- Imported layouts: ${report.layouts.imported_layout_dir}
- Contact sheets: ${report.contact_sheets.source.path}, ${report.contact_sheets.imported.path}

## Baseline Use

Use this as the geometry and hierarchy baseline for JudgmentKit parity. Styling may change in JudgmentKit, but text frames, media frames, table/chart frames, relative hierarchy, and whitespace should not drift unless the template is intentionally redesigned.
`;
}

function judgmentKitMarkdown(report) {
  const lines = [
    "# JudgmentKit Template Library 80 Review",
    "",
    `PPTX: ${report.pptx.path}`,
    `Slides: ${report.slide_count}`,
    `JudgmentKit theme applied: ${report.theme.judgmentkit_theme_applied ? "yes" : "no"}`,
    `PPTX sha256: ${report.pptx.sha256}`,
    "",
    "## Contact Sheets",
    "",
    `- Source: ${report.contact_sheets.source.path}`,
    `- Imported: ${report.contact_sheets.imported.path}`,
    `- Source 01-20: ${report.contact_sheets["source_01-20"]?.path}`,
    `- Source 21-40: ${report.contact_sheets["source_21-40"]?.path}`,
    `- Source 41-60: ${report.contact_sheets["source_41-60"]?.path}`,
    `- Source 61-80: ${report.contact_sheets["source_61-80"]?.path}`,
    `- Imported 01-20: ${report.contact_sheets["imported_01-20"]?.path}`,
    `- Imported 21-40: ${report.contact_sheets["imported_21-40"]?.path}`,
    `- Imported 41-60: ${report.contact_sheets["imported_41-60"]?.path}`,
    `- Imported 61-80: ${report.contact_sheets["imported_61-80"]?.path}`,
    "",
    "## Extraction Coverage",
    "",
    `- Source slides with text: ${report.layout_coverage.source.slides_with_text}/${report.layout_coverage.source.slide_count}`,
    `- Imported slides with text: ${report.layout_coverage.imported.slides_with_text}/${report.layout_coverage.imported.slide_count}`,
    `- Source text objects: ${report.layout_coverage.source.text_object_count}`,
    `- Imported text objects: ${report.layout_coverage.imported.text_object_count}`,
    "",
    "## Automated Layout Findings",
    "",
    `Source render findings: ${report.source_layout_audit.summary.total}`,
    `Imported PPTX findings: ${report.imported_layout_audit.summary.total}`,
    "",
    "### Source Render",
    "",
  ];

  for (const [type, count] of Object.entries(report.source_layout_audit.summary.byType)) {
    lines.push(`- ${type}: ${count}`);
  }

  if (Object.keys(report.source_layout_audit.summary.byType).length === 0) {
    lines.push("- None detected by the structural heuristic.");
  }

  lines.push("", "### Imported PPTX", "");

  for (const [type, count] of Object.entries(report.imported_layout_audit.summary.byType)) {
    lines.push(`- ${type}: ${count}`);
  }

  if (Object.keys(report.imported_layout_audit.summary.byType).length === 0) {
    lines.push("- None detected by the structural heuristic.");
  }

  lines.push("", "## Top Flagged Source Slides", "");
  for (const slide of report.top_flagged_source_slides.slice(0, 12)) {
    lines.push(
      `- Slide ${pad(slide.slide_number)} (${slide.layout_id}, ${slide.template_use}, ${slide.layout_family}): ${slide.finding_count} ${slide.highest_severity} finding(s); types ${slide.finding_types.join(", ")}; PNG ${slide.full_png}; sheet ${slide.range_sheet}; layout ${slide.layout_json}; comparison ${slide.comparison_sheet}`,
    );
    for (const finding of slide.top_findings ?? []) {
      lines.push(
        `  - ${finding.severity} ${finding.type}; objects ${(finding.object_refs ?? []).join(", ") || "n/a"}; frame ${JSON.stringify(finding.frame ?? {})}; font ${finding.font_size ?? "n/a"}; required height ${finding.estimated_required_height ?? "n/a"}`,
      );
    }
  }

  if (report.top_flagged_source_slides.length === 0) {
    lines.push("- None detected by the structural heuristic.");
  }

  lines.push("", "## Top Flagged Imported Slides", "");
  for (const slide of report.top_flagged_imported_slides.slice(0, 12)) {
    lines.push(
      `- Slide ${pad(slide.slide_number)} (${slide.layout_id}, ${slide.template_use}, ${slide.layout_family}): ${slide.finding_count} ${slide.highest_severity} finding(s); types ${slide.finding_types.join(", ")}; PNG ${slide.full_png}; sheet ${slide.range_sheet}; layout ${slide.layout_json}; comparison ${slide.comparison_sheet}`,
    );
    for (const finding of slide.top_findings ?? []) {
      lines.push(
        `  - ${finding.severity} ${finding.type}; objects ${(finding.object_refs ?? []).join(", ") || "n/a"}; frame ${JSON.stringify(finding.frame ?? {})}; font ${finding.font_size ?? "n/a"}; required height ${finding.estimated_required_height ?? "n/a"}`,
      );
    }
  }

  if (report.top_flagged_imported_slides.length === 0) {
    lines.push("- None detected by the structural heuristic.");
  }

  lines.push("", "## Source Slides With Findings", "");
  for (const slide of report.source_layout_audit.slides.filter((entry) => entry.findings.length > 0).slice(0, 20)) {
    lines.push(
      `- Slide ${pad(slide.slide_number)} (${slide.layout_id}, ${slide.template_use}, ${slide.layout_family}): ${slide.findings.length} finding(s)`,
    );
  }

  if (!report.source_layout_audit.slides.some((entry) => entry.findings.length > 0)) {
    lines.push("- None detected by the structural heuristic.");
  }

  if (report.source_layout_audit.slides.filter((entry) => entry.findings.length > 0).length > 20) {
    lines.push("- Additional source findings are listed in the JSON report.");
  }

  lines.push("", "## Imported Slides With Findings", "");
  for (const slide of report.imported_layout_audit.slides.filter((entry) => entry.findings.length > 0).slice(0, 20)) {
    lines.push(
      `- Slide ${pad(slide.slide_number)} (${slide.layout_id}, ${slide.template_use}, ${slide.layout_family}): ${slide.findings.length} finding(s)`,
    );
  }

  if (!report.imported_layout_audit.slides.some((entry) => entry.findings.length > 0)) {
    lines.push("- None detected by the structural heuristic.");
  }

  lines.push("", "## Notes", "");
  lines.push("- This report uses layout-export heuristics. Full visual judgment still comes from the imported preview PNGs and contact sheets.");
  lines.push("- The generated deck is intentionally one slide per registered template and uses JudgmentKit theme creation plus JudgmentKit template composition.");

  return `${lines.join("\n")}\n`;
}

async function buildCodexGridBaseline() {
  const caseInfo = OUTPUT_CASES.codexGrid;
  const tool = await loadArtifactTool();
  const workspace = await prepareCodexGridWorkspace();
  try {
    const entrypoint = path.join(workspace.localRoot, "artifact-tool-compose", "index.mjs");
    const registryPath = path.join(workspace.localRoot, "artifact-tool-compose", "template-registry.json");
    const { builders } = await import(pathToFileURL(entrypoint).href);

    if (!Array.isArray(builders) || builders.some((builder) => typeof builder !== "function")) {
      throw new Error(`JUDGMENTKIT_CODEX_GRID_REFERENCE_INVALID: builders array missing from ${entrypoint}`);
    }

    const presentation = tool.Presentation.create({ slideSize: SLIDE_SIZE });
    for (const buildSlide of builders) {
      buildSlide(presentation);
    }

    const registry = readJson(registryPath);
    const artifacts = await exportPresentationArtifacts(presentation, caseInfo);
    const contactSheets = writeCaseContactSheets(caseInfo);
    const report = {
    contact_sheets: contactSheets,
    generated_at: generatedAtIso(),
    layouts: {
      imported_layout_dir: artifactRef(artifacts.importedLayoutDir),
      imported_layout_summary: await summarizeLayouts(artifacts.importedLayoutDir, artifacts.imported.slides.items.length),
      source_layout_dir: artifactRef(artifacts.layoutDir),
      source_layout_summary: await summarizeLayouts(artifacts.layoutDir, presentation.slides.items.length),
    },
    pptx: {
      bytes: fs.statSync(artifacts.deckPath).size,
      path: artifactRef(artifacts.deckPath),
      sha256: sha256File(artifacts.deckPath),
    },
    previews: {
      imported_preview_count: fs.readdirSync(artifacts.importedPreviewDir).filter((name) => name.endsWith(".png")).length,
      imported_preview_dir: artifactRef(artifacts.importedPreviewDir),
      source_preview_count: fs.readdirSync(artifacts.sourcePreviewDir).filter((name) => name.endsWith(".png")).length,
      source_preview_dir: artifactRef(artifacts.sourcePreviewDir),
    },
    purpose: "Raw Codex Grid 80-template geometry and hierarchy baseline.",
    slide_count: presentation.slides.items.length,
    source: {
      artifact_tool_package: {
        package_name: "@oai/artifact-tool",
        package_version: readJson(path.join(tool.packagePath, "package.json")).version,
      },
      codex_grid_root: "PRESENTATIONS_SKILL_DIR/assets/builtin_templates/codex-grid-layout-library",
      registry: "artifact-tool-compose/template-registry.json",
    },
    template_count: registry.templates.length,
    };

    await writeJson(outputPath(caseInfo, caseInfo.reportJson), report);
    await writeText(outputPath(caseInfo, caseInfo.reportMd), codexGridMarkdown(report));
    return report;
  } finally {
    await fsp.rm(workspace.workspace, { force: true, recursive: true });
  }
}

async function buildJudgmentKitTemplateLibrary() {
  const caseInfo = OUTPUT_CASES.judgmentKit;
  const tool = await loadArtifactTool();
  const helpers = {
    layers: tool.layers,
    shape: tool.shape,
    table: tool.table,
    text: tool.text,
  };
  const deck = createJudgmentKitPresentation({
    Presentation: tool.Presentation,
    helpers,
    slideSize: SLIDE_SIZE,
  });
  const { kit, presentation } = deck;
  const templates = listJudgmentKitPresentationTemplates({ includeDiagnostics: true });

  for (const template of templates) {
    composeJudgmentKitPresentationTemplate(template.layout_id, {
      content: sampleJudgmentKitContent(template),
      helpers,
      includeDiagnostics: true,
      kit,
      presentation,
    });
  }

  const artifacts = await exportPresentationArtifacts(presentation, caseInfo);
  const contactSheets = writeCaseContactSheets(caseInfo);
  const sourceAudit = await auditLayoutFiles(templates, artifacts.layoutDir);
  const importedAudit = await auditLayoutFiles(templates, artifacts.importedLayoutDir);
  const sourceCoverage = layoutCoverageSummary(sourceAudit);
  const importedCoverage = layoutCoverageSummary(importedAudit);
  assertImportedCoverage(sourceCoverage, importedCoverage);
  const report = {
    contact_sheets: contactSheets,
    generated_at: generatedAtIso(),
    imported_layout_audit: {
      slides: importedAudit.slideReports,
      summary: summarizeFindings(importedAudit.allFindings),
    },
    layout_coverage: {
      imported: importedCoverage,
      source: sourceCoverage,
    },
    pptx: {
      bytes: fs.statSync(artifacts.deckPath).size,
      path: artifactRef(artifacts.deckPath),
      sha256: sha256File(artifacts.deckPath),
    },
    previews: {
      imported_preview_count: fs.readdirSync(artifacts.importedPreviewDir).filter((name) => name.endsWith(".png")).length,
      imported_preview_dir: artifactRef(artifacts.importedPreviewDir),
      source_preview_count: fs.readdirSync(artifacts.sourcePreviewDir).filter((name) => name.endsWith(".png")).length,
      source_preview_dir: artifactRef(artifacts.sourcePreviewDir),
    },
    purpose: "One-slide-per-template audit deck for JudgmentKit presentation template registry.",
    slide_count: presentation.slides.items.length,
    source_layout_audit: {
      slides: sourceAudit.slideReports,
      summary: summarizeFindings(sourceAudit.allFindings),
    },
    template_count: templates.length,
    theme: {
      judgmentkit_theme_applied: Boolean(presentation.judgmentKitPresentationTheme),
      manifest_id: presentation.judgmentKitPresentationTheme?.adapter?.id,
      style_names: Object.values(JUDGMENTKIT_STYLE_NAMES).sort(),
    },
    top_flagged_imported_slides: topFlaggedSlides(importedAudit, caseInfo, { previewKind: "imported" }),
    top_flagged_source_slides: topFlaggedSlides(sourceAudit, caseInfo),
  };

  await writeJson(outputPath(caseInfo, caseInfo.reportJson), report);
  await writeText(outputPath(caseInfo, caseInfo.reportMd), judgmentKitMarkdown(report));
  return report;
}

function slideSummaryByNumber(report, key) {
  return new Map((report.layouts?.[key] ?? report[key]?.slides ?? []).map((slide) => [slide.slide_number, slide]));
}

function assertTemplateLibraryReportCounts(label, report) {
  const problems = [];
  if (report.slide_count !== 80) {
    problems.push(`slide_count=${report.slide_count}`);
  }
  if (report.template_count !== undefined && report.template_count !== 80) {
    problems.push(`template_count=${report.template_count}`);
  }
  if (problems.length > 0) {
    throw new Error(`JUDGMENTKIT_TEMPLATE_LIBRARY_COUNT_MISMATCH: ${label} expected 80 slides/templates, found ${problems.join(", ")}.`);
  }
}

function bboxDelta(left, right) {
  if (!left || !right) {
    return null;
  }

  return {
    bottom: Number((right.bottom - left.bottom).toFixed(2)),
    left: Number((right.left - left.left).toFixed(2)),
    right: Number((right.right - left.right).toFixed(2)),
    top: Number((right.top - left.top).toFixed(2)),
  };
}

function countDelta(left = {}, right = {}) {
  const keys = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])].sort();
  return Object.fromEntries(keys.map((key) => [key, (right?.[key] ?? 0) - (left?.[key] ?? 0)]));
}

function roleFrameDeltas(left = {}, right = {}) {
  const roles = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])].sort();
  return Object.fromEntries(
    roles.map((role) => [
      role,
      {
        bbox_delta: bboxDelta(left?.[role]?.bbox, right?.[role]?.bbox),
        count_delta: (right?.[role]?.count ?? 0) - (left?.[role]?.count ?? 0),
        text_frame_area_delta: roundNumber((right?.[role]?.text_frame_area ?? 0) - (left?.[role]?.text_frame_area ?? 0)),
      },
    ]),
  );
}

function fontSizeDelta(left, right) {
  if (!left && !right) {
    return null;
  }
  return {
    count_delta: (right?.count ?? 0) - (left?.count ?? 0),
    max_delta: roundNumber((right?.max ?? 0) - (left?.max ?? 0), 1),
    median_delta: roundNumber((right?.median ?? 0) - (left?.median ?? 0), 1),
    min_delta: roundNumber((right?.min ?? 0) - (left?.min ?? 0), 1),
  };
}

function readingOrderChanged(left = [], right = []) {
  return JSON.stringify(left ?? []) !== JSON.stringify(right ?? []);
}

function hasBboxDrift(delta, threshold = 4) {
  return Boolean(delta) && Object.values(delta).some((value) => Math.abs(value) > threshold);
}

function hasRoleFrameDrift(deltas) {
  return Object.values(deltas ?? {}).some(
    (delta) => delta.count_delta !== 0 || delta.text_frame_area_delta !== 0 || hasBboxDrift(delta.bbox_delta),
  );
}

function hasFontSizeDrift(delta, threshold = 1) {
  return Boolean(delta) && ["min_delta", "median_delta", "max_delta"].some((key) => Math.abs(delta[key] ?? 0) > threshold);
}

function compareLayoutSlides(codexSlide, judgmentSlide) {
  const roleFrameDeltasValue = roleFrameDeltas(codexSlide.role_frame_summary, judgmentSlide.role_frame_summary);
  const fontSizeDeltaValue = fontSizeDelta(codexSlide.font_size_summary, judgmentSlide.font_size_summary);
  return {
    codex_grid: {
      font_size_summary: codexSlide.font_size_summary,
      object_count: codexSlide.object_count,
      reading_order_signature: codexSlide.reading_order_signature,
      role_counts: codexSlide.role_counts,
      role_frame_summary: codexSlide.role_frame_summary,
      text_frame_area: codexSlide.text_frame_area,
      text_object_count: codexSlide.text_object_count,
      visible_bbox: codexSlide.visible_bbox,
    },
    deltas: {
      font_size: fontSizeDeltaValue,
      object_count: (judgmentSlide.object_count ?? 0) - (codexSlide.object_count ?? 0),
      reading_order_changed: readingOrderChanged(codexSlide.reading_order_signature, judgmentSlide.reading_order_signature),
      role_counts: countDelta(codexSlide.role_counts, judgmentSlide.role_counts),
      role_frames: roleFrameDeltasValue,
      text_frame_area: roundNumber((judgmentSlide.text_frame_area ?? 0) - (codexSlide.text_frame_area ?? 0)),
      text_object_count: (judgmentSlide.text_object_count ?? 0) - (codexSlide.text_object_count ?? 0),
      visible_bbox: bboxDelta(codexSlide.visible_bbox, judgmentSlide.visible_bbox),
    },
    judgmentkit: {
      findings: judgmentSlide.findings ?? [],
      font_size_summary: judgmentSlide.font_size_summary,
      layout_family: judgmentSlide.layout_family,
      layout_id: judgmentSlide.layout_id,
      object_count: judgmentSlide.object_count,
      reading_order_signature: judgmentSlide.reading_order_signature,
      role_counts: judgmentSlide.role_counts,
      role_frame_summary: judgmentSlide.role_frame_summary,
      template_use: judgmentSlide.template_use,
      text_frame_area: judgmentSlide.text_frame_area,
      text_object_count: judgmentSlide.text_object_count,
      visible_bbox: judgmentSlide.visible_bbox,
    },
  };
}

function comparisonSummary(slides, phase) {
  return {
    [`${phase}_bbox_drift_slides`]: slides.filter((slide) => hasBboxDrift(slide[phase].deltas.visible_bbox)).length,
    [`${phase}_font_size_drift_slides`]: slides.filter((slide) => hasFontSizeDrift(slide[phase].deltas.font_size)).length,
    [`${phase}_object_count_drift_slides`]: slides.filter((slide) => slide[phase].deltas.object_count !== 0).length,
    [`${phase}_reading_order_drift_slides`]: slides.filter((slide) => slide[phase].deltas.reading_order_changed).length,
    [`${phase}_role_frame_drift_slides`]: slides.filter((slide) => hasRoleFrameDrift(slide[phase].deltas.role_frames)).length,
    [`${phase}_text_count_drift_slides`]: slides.filter((slide) => slide[phase].deltas.text_object_count !== 0).length,
    [`${phase}_text_frame_area_drift_slides`]: slides.filter((slide) => Math.abs(slide[phase].deltas.text_frame_area ?? 0) > 16).length,
  };
}

function comparisonMarkdown(report) {
  return `# Codex Grid vs JudgmentKit Template Library 80

Slides compared: ${report.slide_count}

## Contact Sheets

- Source preview comparison: ${report.contact_sheets.source.path}
- Imported preview comparison: ${report.contact_sheets.imported.path}

## Summary

- Source object-count drift slides: ${report.summary.source_object_count_drift_slides}
- Source text-count drift slides: ${report.summary.source_text_count_drift_slides}
- Source role-frame drift slides: ${report.summary.source_role_frame_drift_slides}
- Source font-size drift slides: ${report.summary.source_font_size_drift_slides}
- Source reading-order drift slides: ${report.summary.source_reading_order_drift_slides}
- Imported object-count drift slides: ${report.summary.imported_object_count_drift_slides}
- Imported text-count drift slides: ${report.summary.imported_text_count_drift_slides}
- Imported role-frame drift slides: ${report.summary.imported_role_frame_drift_slides}
- Imported font-size drift slides: ${report.summary.imported_font_size_drift_slides}
- Imported reading-order drift slides: ${report.summary.imported_reading_order_drift_slides}
- JudgmentKit imported audit findings: ${report.summary.judgmentkit_imported_findings}

Use the contact sheets for visual judgment. This report is a structural companion that highlights where counts, role frames, font scale, reading order, or visible bounds changed.
`;
}

function reviewIndexMarkdown(manifest) {
  const chunkLines = Object.entries(manifest.outputs.comparison.contact_sheet_groups)
    .map(([range, sheets]) => `- ${range}: source ${sheets.source}; imported ${sheets.imported}`)
    .join("\n");
  const topSourceSlides = manifest.top_flagged_source_slides
    .map(
      (slide) =>
        `- Slide ${pad(slide.slide_number)} (${slide.layout_id}, ${slide.template_use}): ${slide.finding_count} ${slide.highest_severity} finding(s); PNG ${slide.full_png}; sheet ${slide.range_sheet}; layout ${slide.layout_json}; comparison ${slide.comparison_sheet}`,
    )
    .join("\n");
  const topImportedSlides = manifest.top_flagged_imported_slides
    .map(
      (slide) =>
        `- Slide ${pad(slide.slide_number)} (${slide.layout_id}, ${slide.template_use}): ${slide.finding_count} ${slide.highest_severity} finding(s); PNG ${slide.full_png}; sheet ${slide.range_sheet}; layout ${slide.layout_json}; comparison ${slide.comparison_sheet}`,
    )
    .join("\n");

  return `# Presentation Template Library Visual QA

Generated: ${manifest.generated_at}
Mode: ${manifest.mode}

## Review Order

1. Codex Grid baseline report: ${manifest.outputs.codex_grid.report_md}
2. JudgmentKit review report: ${manifest.outputs.judgmentkit.report_md}
3. Comparison report: ${manifest.outputs.comparison.report_md}
4. Comparison contact sheets by range:
${chunkLines}
5. Full-size source and imported PNG folders listed in the per-case reports.

## Summary

- Codex Grid slides: ${manifest.summary.codex_grid_slide_count}
- JudgmentKit slides: ${manifest.summary.judgmentkit_slide_count}
- JudgmentKit source findings: ${manifest.summary.judgmentkit_source_findings}
- JudgmentKit imported findings: ${manifest.summary.judgmentkit_imported_findings}
- Source object-count drift slides: ${manifest.summary.source_object_count_drift_slides}
- Source text-count drift slides: ${manifest.summary.source_text_count_drift_slides}
- Source role-frame drift slides: ${manifest.summary.source_role_frame_drift_slides}
- Imported object-count drift slides: ${manifest.summary.imported_object_count_drift_slides}
- Imported text-count drift slides: ${manifest.summary.imported_text_count_drift_slides}
- Imported role-frame drift slides: ${manifest.summary.imported_role_frame_drift_slides}

## Top Flagged Source Slides

${topSourceSlides || "- None detected by the structural heuristic."}

## Top Flagged Imported Slides

${topImportedSlides || "- None detected by the structural heuristic."}

These outputs are ignored review artifacts. Regenerate them with \`JUDGMENTKIT_PPTX_ACTUAL=1 JUDGMENTKIT_PPTX_UPDATE=1 npm run presentation-theme:templates:visual-qa\`.
`;
}

async function writeReviewIndex({ codexReport, comparisonReport, judgmentReport, mode: requestedMode }) {
  const comparisonCase = OUTPUT_CASES.comparison;
  const root = outputPath(comparisonCase);
  const packetRoot = path.join(outputBase(), REVIEW_PACKET_DIR);
  const contactSheets = comparisonReport?.contact_sheets
    ? Object.values(comparisonReport.contact_sheets)
        .filter((entry) => entry?.status === "written")
        .map((entry) => entry.path)
        .sort()
    : [];
  const manifest = {
    generated_at: generatedAtIso(),
    mode: requestedMode,
    outputs: {
      codex_grid: {
        pptx: artifactRef(pptxPath(OUTPUT_CASES.codexGrid)),
        report_json: artifactRef(outputPath(OUTPUT_CASES.codexGrid, OUTPUT_CASES.codexGrid.reportJson)),
        report_md: artifactRef(outputPath(OUTPUT_CASES.codexGrid, OUTPUT_CASES.codexGrid.reportMd)),
      },
      comparison: {
        contact_sheet_groups: {
          "01-20": {
            imported: comparisonReport?.contact_sheets?.["imported_01-20"]?.path,
            source: comparisonReport?.contact_sheets?.["source_01-20"]?.path,
          },
          "21-40": {
            imported: comparisonReport?.contact_sheets?.["imported_21-40"]?.path,
            source: comparisonReport?.contact_sheets?.["source_21-40"]?.path,
          },
          "41-60": {
            imported: comparisonReport?.contact_sheets?.["imported_41-60"]?.path,
            source: comparisonReport?.contact_sheets?.["source_41-60"]?.path,
          },
          "61-80": {
            imported: comparisonReport?.contact_sheets?.["imported_61-80"]?.path,
            source: comparisonReport?.contact_sheets?.["source_61-80"]?.path,
          },
        },
        contact_sheets: contactSheets,
        report_json: artifactRef(outputPath(comparisonCase, comparisonCase.reportJson)),
        report_md: artifactRef(outputPath(comparisonCase, comparisonCase.reportMd)),
      },
      judgmentkit: {
        pptx: artifactRef(pptxPath(OUTPUT_CASES.judgmentKit)),
        report_json: artifactRef(outputPath(OUTPUT_CASES.judgmentKit, OUTPUT_CASES.judgmentKit.reportJson)),
        report_md: artifactRef(outputPath(OUTPUT_CASES.judgmentKit, OUTPUT_CASES.judgmentKit.reportMd)),
      },
    },
    runtime: {
      artifact_tool: {
        package_name: "@oai/artifact-tool",
        package_version: readJson(path.join(resolveArtifactToolPackage(), "package.json")).version,
      },
      codex_grid_reference: "PRESENTATIONS_SKILL_DIR/assets/builtin_templates/codex-grid-layout-library",
    },
    source_scripts: [
      "scripts/presentation-theme/template-library-exploration.mjs",
      "scripts/presentation-theme/create-template-contact-sheet.py",
    ],
    summary: {
      codex_grid_slide_count: codexReport?.slide_count,
      judgmentkit_imported_findings: judgmentReport?.imported_layout_audit?.summary?.total,
      judgmentkit_slide_count: judgmentReport?.slide_count,
      judgmentkit_source_findings: judgmentReport?.source_layout_audit?.summary?.total,
      imported_object_count_drift_slides: comparisonReport?.summary?.imported_object_count_drift_slides,
      imported_role_frame_drift_slides: comparisonReport?.summary?.imported_role_frame_drift_slides,
      imported_text_count_drift_slides: comparisonReport?.summary?.imported_text_count_drift_slides,
      object_count_drift_slides: comparisonReport?.summary?.object_count_drift_slides,
      source_object_count_drift_slides: comparisonReport?.summary?.source_object_count_drift_slides,
      source_role_frame_drift_slides: comparisonReport?.summary?.source_role_frame_drift_slides,
      source_text_count_drift_slides: comparisonReport?.summary?.source_text_count_drift_slides,
      text_count_drift_slides: comparisonReport?.summary?.text_count_drift_slides,
    },
    top_flagged_imported_slides: judgmentReport?.top_flagged_imported_slides?.slice(0, 12) ?? [],
    top_flagged_source_slides: judgmentReport?.top_flagged_source_slides?.slice(0, 12) ?? [],
  };

  await writeJson(path.join(root, "manifest.json"), manifest);
  await writeText(path.join(root, "index.md"), reviewIndexMarkdown(manifest));
  await writeJson(path.join(packetRoot, "manifest.json"), manifest);
  await writeText(path.join(packetRoot, "index.md"), reviewIndexMarkdown(manifest));
  return {
    index: artifactRef(path.join(packetRoot, "index.md")),
    manifest: artifactRef(path.join(packetRoot, "manifest.json")),
  };
}

async function buildComparison() {
  const codexCase = OUTPUT_CASES.codexGrid;
  const judgmentCase = OUTPUT_CASES.judgmentKit;
  const comparisonCase = OUTPUT_CASES.comparison;
  const codexReportPath = outputPath(codexCase, codexCase.reportJson);
  const judgmentReportPath = outputPath(judgmentCase, judgmentCase.reportJson);

  if (!fs.existsSync(codexReportPath) || !fs.existsSync(judgmentReportPath)) {
    throw new Error("JUDGMENTKIT_TEMPLATE_COMPARISON_INPUTS_MISSING: run --mode codex-grid and --mode judgmentkit first.");
  }

  await fsp.rm(outputPath(comparisonCase), { force: true, recursive: true });
  const codexReport = readJson(codexReportPath);
  const judgmentReport = readJson(judgmentReportPath);
  assertTemplateLibraryReportCounts("codex-grid", codexReport);
  assertTemplateLibraryReportCounts("judgmentkit", judgmentReport);
  const codexSource = slideSummaryByNumber(codexReport, "source_layout_summary");
  const codexImported = slideSummaryByNumber(codexReport, "imported_layout_summary");
  const judgmentSource = new Map(judgmentReport.source_layout_audit.slides.map((slide) => [slide.slide_number, slide]));
  const judgmentImported = new Map(judgmentReport.imported_layout_audit.slides.map((slide) => [slide.slide_number, slide]));
  const slides = [];
  const slideCount = 80;

  for (let slideNumber = 1; slideNumber <= slideCount; slideNumber += 1) {
    const codexSourceSlide = codexSource.get(slideNumber);
    const codexImportedSlide = codexImported.get(slideNumber);
    const judgmentSourceSlide = judgmentSource.get(slideNumber);
    const judgmentImportedSlide = judgmentImported.get(slideNumber);
    if (!codexSourceSlide || !codexImportedSlide || !judgmentSourceSlide || !judgmentImportedSlide) {
      throw new Error(
        `JUDGMENTKIT_TEMPLATE_LIBRARY_COUNT_MISMATCH: missing comparison slide ${slideNumber} in source/imported Codex Grid or JudgmentKit report.`,
      );
    }
    const sourceComparison = compareLayoutSlides(codexSourceSlide, judgmentSourceSlide);
    const importedComparison = compareLayoutSlides(codexImportedSlide, judgmentImportedSlide);
    slides.push({
      imported: importedComparison,
      object_count_delta: importedComparison.deltas.object_count,
      slide_number: slideNumber,
      source: sourceComparison,
      text_object_count_delta: importedComparison.deltas.text_object_count,
      visible_bbox_delta: importedComparison.deltas.visible_bbox,
    });
  }

  const contactDir = outputPath(comparisonCase, "contact-sheets");
  const ranges = [
    [1, 20],
    [21, 40],
    [41, 60],
    [61, 80],
  ];
  const chunkSheets = Object.fromEntries(
    ranges.flatMap(([startSlide, endSlide]) => {
      const rangeLabel = `${pad(startSlide)}-${pad(endSlide)}`;
      return [
        [
          `source_${rangeLabel}`,
          writeContactSheet(
            outputPath(codexCase, "source-preview"),
            path.join(contactDir, `source-preview-comparison-${rangeLabel}.png`),
            {
              columns: 2,
              leftLabel: OUTPUT_CASES.codexGrid.label,
              rightDir: outputPath(judgmentCase, "source-preview"),
              rightLabel: OUTPUT_CASES.judgmentKit.label,
              startSlide,
              endSlide,
              thumbWidth: 260,
            },
          ),
        ],
        [
          `imported_${rangeLabel}`,
          writeContactSheet(
            outputPath(codexCase, "imported-preview"),
            path.join(contactDir, `imported-preview-comparison-${rangeLabel}.png`),
            {
              columns: 2,
              leftLabel: OUTPUT_CASES.codexGrid.label,
              rightDir: outputPath(judgmentCase, "imported-preview"),
              rightLabel: OUTPUT_CASES.judgmentKit.label,
              startSlide,
              endSlide,
              thumbWidth: 260,
            },
          ),
        ],
      ];
    }),
  );
  const contactSheets = {
    imported: writeContactSheet(
      outputPath(codexCase, "imported-preview"),
      path.join(contactDir, "imported-preview-comparison.png"),
      {
        leftLabel: OUTPUT_CASES.codexGrid.label,
        rightDir: outputPath(judgmentCase, "imported-preview"),
        rightLabel: OUTPUT_CASES.judgmentKit.label,
        thumbWidth: 260,
      },
    ),
    source: writeContactSheet(
      outputPath(codexCase, "source-preview"),
      path.join(contactDir, "source-preview-comparison.png"),
      {
        leftLabel: OUTPUT_CASES.codexGrid.label,
        rightDir: outputPath(judgmentCase, "source-preview"),
        rightLabel: OUTPUT_CASES.judgmentKit.label,
        thumbWidth: 260,
      },
    ),
    ...chunkSheets,
  };
  const report = {
    contact_sheets: contactSheets,
    generated_at: generatedAtIso(),
    inputs: {
      codex_grid_report: artifactRef(codexReportPath),
      judgmentkit_report: artifactRef(judgmentReportPath),
    },
    slide_count: slideCount,
    slides,
    summary: {
      ...comparisonSummary(slides, "source"),
      ...comparisonSummary(slides, "imported"),
      judgmentkit_imported_findings: judgmentReport.imported_layout_audit.summary.total,
      object_count_drift_slides: slides.filter((slide) => slide.imported.deltas.object_count !== 0).length,
      text_count_drift_slides: slides.filter((slide) => slide.imported.deltas.text_object_count !== 0).length,
    },
  };

  await writeJson(outputPath(comparisonCase, comparisonCase.reportJson), report);
  await writeText(outputPath(comparisonCase, comparisonCase.reportMd), comparisonMarkdown(report));
  return report;
}

function printResult(label, report) {
  console.log(
    JSON.stringify(
      {
        label,
        slide_count: report.slide_count,
        template_count: report.template_count,
        output_base: repoRelative(outputBase()),
      },
      null,
      2,
    ),
  );
}

function printReviewPacket(result) {
  console.log(
    JSON.stringify(
      {
        label: "review-packet",
        index: result.index,
        manifest: result.manifest,
      },
      null,
      2,
    ),
  );
}

async function invalidateComparisonOutputs() {
  await fsp.rm(outputPath(OUTPUT_CASES.comparison), { force: true, recursive: true });
  await fsp.rm(path.join(outputBase(), REVIEW_PACKET_DIR), { force: true, recursive: true });
}

async function main() {
  const requestedMode = mode();
  const requestedAction = action();
  let codexReport;
  let judgmentReport;
  let comparisonReport;

  if (cliFlag("--help")) {
    console.log(`Usage: node scripts/presentation-theme/template-library-exploration.mjs --action <preflight|check|update> --mode <codex-grid|judgmentkit|compare|all>

Options:
  --action <preflight|check|update>  preflight validates runtime, check writes temp output, update writes output-base.
  --artifact-tool-package <path>  Explicit @oai/artifact-tool package path.
  --output-base <path>            Output base directory. Default: outputs.
  --skip-contact-sheets           Skip PNG contact sheet generation.
`);
    return;
  }

  if (!["codex-grid", "judgmentkit", "compare", "all"].includes(requestedMode)) {
    throw new Error(`Unknown template-library exploration mode: ${requestedMode}`);
  }

  if (!["preflight", "check", "update"].includes(requestedAction)) {
    throw new Error(`Unknown template-library exploration action: ${requestedAction}`);
  }

  if (requestedAction === "preflight") {
    console.log(JSON.stringify(await runPreflight(), null, 2));
    return;
  }

  if (requestedAction === "check") {
    requireExplorationGate();
    activeOutputBase = await fsp.mkdtemp(path.join(os.tmpdir(), "judgmentkit-template-library-check-"));
  } else {
    requireUpdateGate();
    validateUpdateOutputBase();
  }

  try {
    if ((requestedMode === "codex-grid" || requestedMode === "judgmentkit") && requestedAction === "update") {
      await invalidateComparisonOutputs();
    }

    if (requestedMode === "codex-grid" || requestedMode === "all") {
      codexReport = await buildCodexGridBaseline();
      printResult("codex-grid", codexReport);
    }

    if (requestedMode === "judgmentkit" || requestedMode === "all") {
      judgmentReport = await buildJudgmentKitTemplateLibrary();
      printResult("judgmentkit", judgmentReport);
    }

    if (requestedMode === "compare" || requestedMode === "all") {
      comparisonReport = await buildComparison();
      printResult("compare", comparisonReport);
      codexReport ??= readJson(outputPath(OUTPUT_CASES.codexGrid, OUTPUT_CASES.codexGrid.reportJson));
      judgmentReport ??= readJson(outputPath(OUTPUT_CASES.judgmentKit, OUTPUT_CASES.judgmentKit.reportJson));
      printReviewPacket(await writeReviewIndex({
        codexReport,
        comparisonReport,
        judgmentReport,
        mode: requestedMode,
      }));
    }
    assertExplorationOutputPolicy(requestedMode);
  } finally {
    if (requestedAction === "check" && activeOutputBase) {
      await fsp.rm(activeOutputBase, { force: true, recursive: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
