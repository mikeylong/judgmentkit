import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { ACTUAL_CASES, OUTPUT_ROOT, REPO_ROOT } from "./actual-constants.mjs";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "check";
const DEFAULT_PRESENTATIONS_SKILL_DIR = path.join(
  process.env.HOME ?? "",
  ".codex/plugins/cache/openai-primary-runtime/presentations/26.630.12135/skills/presentations",
);
const DEFAULT_CODEX_RUNTIME_DEPENDENCIES = path.join(
  process.env.HOME ?? "",
  ".cache/codex-runtimes/codex-primary-runtime/dependencies",
);
const DEFAULT_RUNTIME_PYTHON = path.join(
  DEFAULT_CODEX_RUNTIME_DEPENDENCIES,
  "python/bin/python3",
);
const DEFAULT_RUNTIME_BIN = path.join(DEFAULT_CODEX_RUNTIME_DEPENDENCIES, "bin");

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  console.log([command, ...args].join(" "));
  execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? runtimeEnv(),
    stdio: "inherit",
  });
}

function runtimeEnv(extra = {}) {
  return {
    ...process.env,
    PATH: [DEFAULT_RUNTIME_BIN, process.env.PATH].filter(Boolean).join(path.delimiter),
    ...extra,
  };
}

function requireActualGate() {
  if (process.env.JUDGMENTKIT_PPTX_ACTUAL !== "1") {
    fail("JUDGMENTKIT_ACTUAL_NOT_ENABLED: set JUDGMENTKIT_PPTX_ACTUAL=1 for actual PPTX QA.");
  }

  if (mode === "update" && process.env.JUDGMENTKIT_PPTX_UPDATE !== "1") {
    fail("JUDGMENTKIT_UPDATE_NOT_ENABLED: set JUDGMENTKIT_PPTX_UPDATE=1 to refresh committed PPTX evidence.");
  }
}

function requirePresentationsRuntime() {
  const skillDir = process.env.PRESENTATIONS_SKILL_DIR ?? DEFAULT_PRESENTATIONS_SKILL_DIR;
  const requiredTools = ["render_slides.py", "slides_test.py", "create_montage.py"].map((name) =>
    path.join(skillDir, "container_tools", name),
  );

  for (const toolPath of requiredTools) {
    if (!fs.existsSync(toolPath)) {
      fail(`JUDGMENTKIT_PRESENTATIONS_RUNTIME_MISSING: missing ${toolPath}`);
    }
  }

  return {
    createMontage: requiredTools[2],
    renderSlides: requiredTools[0],
    slidesTest: requiredTools[1],
  };
}

function pythonCandidates() {
  return [
    process.env.JUDGMENTKIT_PPTX_PYTHON,
    process.env.PRESENTATIONS_PYTHON,
    DEFAULT_RUNTIME_PYTHON,
    "python3",
  ].filter(Boolean);
}

function inspectPython(candidate) {
  try {
    const output = execFileSync(
      candidate,
      [
        "-c",
        [
          "import json, sys",
          "result = {'executable': sys.executable, 'version': sys.version.split()[0]}",
          "for module_name in ['pdf2image', 'PIL', 'numpy', 'pptx']:",
          " try:",
          "  module = __import__(module_name)",
          "  result[module_name] = True",
          "  version = getattr(module, '__version__', None)",
          "  if version:",
          "   result[f'{module_name}_version'] = version",
          " except Exception as error:",
          "  result[module_name] = False",
          "  result[f'{module_name}_error'] = f'{type(error).__name__}: {error}'",
          "print(json.dumps(result, sort_keys=True))",
        ].join("\n"),
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: runtimeEnv(),
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return JSON.parse(output);
  } catch (error) {
    return {
      executable: candidate,
      pdf2image: false,
      error: error.message,
    };
  }
}

function resolvePythonRuntime() {
  const inspected = pythonCandidates().map(inspectPython);
  const selected = inspected.find(
    (entry) => entry.pdf2image && entry.PIL && entry.numpy && entry.pptx,
  );

  return {
    selected,
    inspected,
  };
}

function supportsRasterPython(pythonRuntime) {
  if (!pythonRuntime.selected) {
    return false;
  }

  try {
    execFileSync(
      pythonRuntime.selected.executable,
      ["-c", "import pdf2image, PIL, numpy, pptx"],
      {
        cwd: REPO_ROOT,
        env: runtimeEnv(),
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
    return true;
  } catch {
    return false;
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fileIdentity(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }

  const relativePath = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
  return {
    path: relativePath.startsWith("..") ? path.basename(filePath) : relativePath,
    sha256: sha256File(filePath),
  };
}

function resolveArtifactToolPackageInfo() {
  const candidates = [
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
    path.join(
      process.env.HOME ?? "",
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool",
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const packageJsonPath = path.join(candidate, "package.json");
    const modulePath = path.join(candidate, "dist", "artifact_tool.mjs");

    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = readJson(packageJsonPath);
    return {
      package: packageJson.name,
      version: packageJson.version,
      package_json: fileIdentity(packageJsonPath),
      module: fileIdentity(modulePath),
    };
  }

  return { package: "@oai/artifact-tool", status: "not_found" };
}

function runtimeFingerprintPayload(skillDir, pythonRuntime, rasterAvailable, tools) {
  return {
    artifact_tool: resolveArtifactToolPackageInfo(),
    fixture_builder: fileIdentity(path.join(REPO_ROOT, "scripts", "presentation-theme", "build-actual-fixtures.mjs")),
    presentations_skill_dir: skillDir,
    python: pythonRuntime.selected,
    raster_available: rasterAvailable,
    render_tools: {
      create_montage: fileIdentity(tools.createMontage),
      render_slides: fileIdentity(tools.renderSlides),
      slides_test: fileIdentity(tools.slidesTest),
    },
  };
}

function renderCase(caseInfo, outputDir, tools) {
  const deckPath = path.join(outputDir, `${caseInfo.id}.pptx`);
  const renderDir = path.join(outputDir, caseInfo.id);
  const montagePath = path.join(outputDir, `${caseInfo.id}-montage.png`);

  fs.rmSync(renderDir, { recursive: true, force: true });
  fs.mkdirSync(renderDir, { recursive: true });

  const python = tools.python;

  run(python, [tools.renderSlides, deckPath, "--output_dir", renderDir]);
  run(python, [tools.slidesTest, deckPath, "--width", "1600", "--height", "900"]);
  run(python, [
    tools.createMontage,
    "--input_dir",
    renderDir,
    "--output_file",
    montagePath,
    "--fail_on_image_error",
  ]);
}

function removeUnmanagedInspectSidecars(outputDir) {
  for (const name of fs.readdirSync(outputDir)) {
    if (name.endsWith(".pptx.inspect.ndjson")) {
      fs.rmSync(path.join(outputDir, name), { force: true });
    }
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }

  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function parseNdjsonFile(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function fixtureRelativeFromHashPath(entryPath, outputDir) {
  const outputRootRef = path.relative(REPO_ROOT, outputDir).split(path.sep).join("/");
  return entryPath.startsWith(`${outputRootRef}/`) ? entryPath.slice(outputRootRef.length + 1) : entryPath;
}

function hashEntriesByFixturePath(outputDir) {
  const hashes = readJson(path.join(outputDir, "hashes.json"));
  const entries = new Map();

  for (const entry of hashes.entries ?? []) {
    entries.set(fixtureRelativeFromHashPath(entry.path, outputDir), entry);
  }

  return entries;
}

function runtimeFingerprintsMatch(tempOutputDir) {
  const committed = readJson(path.join(OUTPUT_ROOT, "manifest.json")).runtime_fingerprint;
  const generated = readJson(path.join(tempOutputDir, "manifest.json")).runtime_fingerprint;
  return stableJson(committed) === stableJson(generated);
}

function outputRootRef(outputDir) {
  return path.relative(REPO_ROOT, outputDir).split(path.sep).join("/");
}

function normalizeFixtureReference(value, outputDir) {
  const fixtureRoot = outputRootRef(outputDir);

  if (value === fixtureRoot) {
    return "<fixture-root>";
  }

  if (value.startsWith(`${fixtureRoot}/`)) {
    return `<fixture-root>/${value.slice(fixtureRoot.length + 1)}`;
  }

  return value;
}

function normalizeSemanticArtifact(value, outputDir, artifactKind, pathParts = []) {
  const dotPath = pathParts.join(".");
  const key = pathParts.at(-1);

  if (
    artifactKind === "hashes" &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.artifact_kind
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => {
        const volatileHashField =
          entryKey === "byte_size" ||
          entryKey === "semantic_guard_sha256" ||
          entryKey === "sha256";
        return [
          entryKey,
          volatileHashField
            ? `<hashes-${entryKey}>`
            : normalizeSemanticArtifact(entry, outputDir, artifactKind, [...pathParts, entryKey]),
        ];
      }),
    );
  }

  if (
    artifactKind === "manifest" &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value.kind || value.path)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => {
        const summaryOnlyField =
          entryKey === "byte_size" ||
          entryKey === "semantic_guard_sha256";
        return [
          entryKey,
          summaryOnlyField
            ? `<summary-${entryKey}>`
            : normalizeSemanticArtifact(entry, outputDir, artifactKind, [...pathParts, entryKey]),
        ];
      }),
    );
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value.artifact_kind === "pptx" || value.kind === "pptx")
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => {
        const volatilePptxField =
          entryKey === "byte_size" ||
          entryKey === "semantic_guard_sha256" ||
          entryKey === "sha256";
        return [
          entryKey,
          volatilePptxField
            ? `<pptx-${entryKey}>`
            : normalizeSemanticArtifact(entry, outputDir, artifactKind, [...pathParts, entryKey]),
        ];
      }),
    );
  }

  if (dotPath === "artifact_ref.sha256" || dotPath === "text_authority.artifact_sha256") {
    return "<pptx-byte-sha256>";
  }

  if (artifactKind === "inspect" && key === "layoutId") {
    return "<inspect-layout-id>";
  }

  if (artifactKind === "inspect" && key === "id") {
    return "<inspect-object-id>";
  }

  if (
    artifactKind === "layout" &&
    ["aid", "id", "layoutId", "masterLayoutId", "parentLayoutId"].includes(key)
  ) {
    return `<layout-${key}>`;
  }

  if (artifactKind === "layout" && dotPath.endsWith("composeSource.path")) {
    return "<layout-compose-source-path>";
  }

  if (artifactKind === "structural" && dotPath === "bytes") {
    return "<pptx-byte-count>";
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      normalizeSemanticArtifact(entry, outputDir, artifactKind, [...pathParts, String(index)]),
    );
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeSemanticArtifact(entry, outputDir, artifactKind, [...pathParts, key]),
      ]),
    );
  }

  if (typeof value === "string") {
    return normalizeFixtureReference(value, outputDir);
  }

  return value;
}

function readSemanticArtifact(filePath, artifactKind, outputDir) {
  const value = artifactKind === "inspect"
    ? parseNdjsonFile(filePath)
    : artifactKind === "readme"
      ? fs.readFileSync(filePath, "utf8")
      : readJson(filePath);
  return normalizeSemanticArtifact(value, outputDir, artifactKind);
}

function compareSemanticArtifacts(tempOutputDir, committedHashes, generatedHashes) {
  const semanticKinds = new Set(["evidence", "hashes", "inspect", "layout", "manifest", "readme", "structural"]);
  const committedHashesValue = readSemanticArtifact(path.join(OUTPUT_ROOT, "hashes.json"), "hashes", OUTPUT_ROOT);
  const generatedHashesValue = readSemanticArtifact(path.join(tempOutputDir, "hashes.json"), "hashes", tempOutputDir);

  if (stableJson(committedHashesValue) !== stableJson(generatedHashesValue)) {
    fail(
      "hashes.json generated semantic artifact differs from committed replay evidence; refresh committed evidence intentionally with presentation-theme:actual:update.",
    );
  }

  for (const [relativePath, committedEntry] of committedHashes) {
    if (semanticKinds.has(committedEntry.artifact_kind) && !generatedHashes.has(relativePath)) {
      fail(`${relativePath} committed semantic artifact was not regenerated by actual:check.`);
    }
  }

  for (const [relativePath, generatedEntry] of generatedHashes) {
    if (!semanticKinds.has(generatedEntry.artifact_kind)) {
      continue;
    }

    const committedEntry = committedHashes.get(relativePath);
    if (!committedEntry) {
      fail(`${relativePath} generated semantic artifact has no committed replay artifact.`);
    }

    if (committedEntry.artifact_kind !== generatedEntry.artifact_kind) {
      fail(`${relativePath} generated semantic artifact kind differs from committed replay evidence.`);
    }

    const committedValue = readSemanticArtifact(
      path.join(OUTPUT_ROOT, relativePath),
      committedEntry.artifact_kind,
      OUTPUT_ROOT,
    );
    const generatedValue = readSemanticArtifact(
      path.join(tempOutputDir, relativePath),
      generatedEntry.artifact_kind,
      tempOutputDir,
    );

    if (stableJson(committedValue) !== stableJson(generatedValue)) {
      fail(
        `${relativePath} generated semantic artifact differs from committed replay evidence; refresh committed evidence intentionally with presentation-theme:actual:update.`,
      );
    }
  }
}

function compareGeneratedToCommitted(tempOutputDir) {
  const committedHashes = hashEntriesByFixturePath(OUTPUT_ROOT);
  const generatedHashes = hashEntriesByFixturePath(tempOutputDir);
  const exactBinaryKinds = new Set(["montage", "png", "webp"]);

  compareSemanticArtifacts(tempOutputDir, committedHashes, generatedHashes);

  for (const caseInfo of ACTUAL_CASES) {
    const committedEvidence = readJson(
      path.join(OUTPUT_ROOT, "evidence", `${caseInfo.id}.acceptance.json`),
    );
    const generatedEvidence = readJson(
      path.join(tempOutputDir, "evidence", `${caseInfo.id}.acceptance.json`),
    );
    const committedStructural = readJson(
      path.join(OUTPUT_ROOT, "structural", `${caseInfo.id}.structural.json`),
    );
    const generatedStructural = readJson(
      path.join(tempOutputDir, "structural", `${caseInfo.id}.structural.json`),
    );

    const committedSummary = {
      accepted: committedEvidence.acceptance_status,
      authoritative_slide_count: committedEvidence.text_authority?.authoritative_slide_count,
      slide_count: committedEvidence.text_authority?.slide_count,
      theme: committedEvidence.theme?.color_scheme,
    };
    const generatedSummary = {
      accepted: generatedEvidence.acceptance_status,
      authoritative_slide_count: generatedEvidence.text_authority?.authoritative_slide_count,
      slide_count: generatedEvidence.text_authority?.slide_count,
      theme: generatedEvidence.theme?.color_scheme,
    };

    if (JSON.stringify(committedSummary) !== JSON.stringify(generatedSummary)) {
      fail(`${caseInfo.id} generated evidence differs semantically from committed replay evidence.`);
    }

    const committedStructureSummary = {
      slide_count: committedStructural.slide_count,
      slide_entries: committedStructural.slide_entries,
      theme_colors: committedStructural.theme_colors,
    };
    const generatedStructureSummary = {
      slide_count: generatedStructural.slide_count,
      slide_entries: generatedStructural.slide_entries,
      theme_colors: generatedStructural.theme_colors,
    };

    if (JSON.stringify(committedStructureSummary) !== JSON.stringify(generatedStructureSummary)) {
      fail(`${caseInfo.id} generated PPTX structure differs from committed replay evidence.`);
    }
  }

  if (!runtimeFingerprintsMatch(tempOutputDir)) {
    return;
  }

  for (const [relativePath, generatedEntry] of generatedHashes) {
    if (!exactBinaryKinds.has(generatedEntry.artifact_kind)) {
      continue;
    }

    const committedEntry = committedHashes.get(relativePath);
    if (!committedEntry) {
      fail(`${relativePath} generated binary has no committed hash entry.`);
    }

    if (committedEntry.sha256 !== generatedEntry.sha256) {
      fail(
        `${relativePath} binary hash differs under the same runtime fingerprint; refresh committed evidence intentionally with presentation-theme:actual:update.`,
      );
    }
  }
}

function main() {
  if (mode !== "check" && mode !== "update" && mode !== "preflight") {
    fail(`Unknown actual QA mode: ${mode}`);
  }

  if (mode !== "preflight") {
    requireActualGate();
  }

  const tools = requirePresentationsRuntime();
  const pythonRuntime = resolvePythonRuntime();
  const rasterAvailable = supportsRasterPython(pythonRuntime);
  tools.python = pythonRuntime.selected?.executable ?? "python3";
  const skillDir = process.env.PRESENTATIONS_SKILL_DIR ?? DEFAULT_PRESENTATIONS_SKILL_DIR;

  if (mode === "preflight") {
    if (!rasterAvailable) {
      fail(
        [
          "JUDGMENTKIT_RASTER_UNAVAILABLE: actual PPTX raster rendering requires a Python runtime with pdf2image, PIL, numpy, and pptx.",
          `Inspected Python runtimes: ${JSON.stringify(pythonRuntime.inspected)}`,
        ].join("\n"),
      );
    }

    console.log(
      JSON.stringify(
        {
          status: "passed",
          mode,
          runtime_fingerprint: runtimeFingerprintPayload(skillDir, pythonRuntime, rasterAvailable, tools),
        },
        null,
        2,
      ),
    );
    return;
  }

  const fixtureDir =
    mode === "update"
      ? "outputs/presentation-theme-actual-tests"
      : ".presentation-theme-actual-check";
  const outputDir = path.resolve(REPO_ROOT, fixtureDir);
  const env = {
    ...runtimeEnv(),
    JUDGMENTKIT_PPTX_ACTUAL: "1",
    JUDGMENTKIT_PPTX_FIXTURE_DIR: fixtureDir,
    JUDGMENTKIT_PPTX_PYTHON: tools.python,
    JUDGMENTKIT_PPTX_RUNTIME_FINGERPRINT: JSON.stringify(
      runtimeFingerprintPayload(skillDir, pythonRuntime, rasterAvailable, tools),
    ),
  };

  if (mode === "check") {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  run(process.execPath, ["scripts/presentation-theme/build-actual-fixtures.mjs"], { env });
  removeUnmanagedInspectSidecars(outputDir);

  if (rasterAvailable) {
    for (const caseInfo of ACTUAL_CASES) {
      renderCase(caseInfo, outputDir, tools);
    }
  } else {
    console.error(
      [
        "JUDGMENTKIT_RASTER_UNAVAILABLE: no configured Python runtime can import pdf2image; running layout/import/inspect checks only.",
        `Inspected Python runtimes: ${JSON.stringify(pythonRuntime.inspected)}`,
      ].join("\n"),
    );
  }

  run(process.execPath, ["scripts/presentation-theme/actual-evidence-check.mjs", "--write"], {
    env: {
      ...env,
      ...(rasterAvailable ? {} : { JUDGMENTKIT_RASTER_UNAVAILABLE: "1" }),
    },
  });

  if (mode === "check") {
    compareGeneratedToCommitted(outputDir);
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  if (!rasterAvailable) {
    fail(
      "JUDGMENTKIT_RASTER_UNAVAILABLE: layout/import/inspect checks passed, but raster rendering is unavailable and this actual lane is not release-acceptable.",
    );
  }
}

main();
