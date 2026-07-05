import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ACTUAL_CASES,
  OUTPUT_POLICY,
  OUTPUT_ROOT,
  outputPath,
  repoRelative,
  requireCommittedOutputUpdateGate,
} from "./actual-constants.mjs";
import { inspectPptx } from "./pptx-structural-inspector.mjs";

const WRITE_MODE = process.argv.includes("--write");
const HASH_ALGORITHM = "sha256";
const OUTPUT_ROOT_REF = repoRelative(OUTPUT_ROOT);
const RASTER_UNAVAILABLE = process.env.JUDGMENTKIT_RASTER_UNAVAILABLE === "1";

function fail(message) {
  throw new Error(message);
}

function sha256Buffer(value) {
  return crypto.createHash(HASH_ALGORITHM).update(value).digest("hex");
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
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stable(entryValue)]),
    );
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Number(value.toFixed(4));
  }

  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stableJson(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sanitizeRuntimeFingerprint(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeRuntimeFingerprint);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeRuntimeFingerprint(entry)]),
    );
  }

  if (
    typeof value === "string" &&
    (value.startsWith("/") || value.startsWith("file://") || /^[A-Za-z]:[\\/]/.test(value))
  ) {
    return {
      kind: "local_path",
      basename: path.basename(value),
      sha256: sha256Buffer(value),
    };
  }

  return value;
}

function runtimeFingerprint() {
  if (!process.env.JUDGMENTKIT_PPTX_RUNTIME_FINGERPRINT) {
    return {
      mode: "committed_replay",
      raster_available: !RASTER_UNAVAILABLE,
    };
  }

  try {
    return sanitizeRuntimeFingerprint(JSON.parse(process.env.JUDGMENTKIT_PPTX_RUNTIME_FINGERPRINT));
  } catch {
    return {
      mode: "unparseable",
      sha256: sha256Buffer(process.env.JUDGMENTKIT_PPTX_RUNTIME_FINGERPRINT),
    };
  }
}

function fixtureRelative(filePath) {
  const relativePath = repoRelative(filePath);
  const prefix = `${OUTPUT_ROOT_REF}/`;
  return relativePath.startsWith(prefix) ? relativePath.slice(prefix.length) : relativePath;
}

function parseNdjson(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function expectedFiles() {
  const files = new Set([
    "README.md",
    "hashes.json",
    "manifest.json",
    "review-summary.json",
  ]);

  for (const caseInfo of ACTUAL_CASES) {
    files.add(`${caseInfo.id}.pptx`);
    files.add(`artifact-previews/${caseInfo.id}.webp`);
    files.add(`evidence/${caseInfo.id}.acceptance.json`);
    files.add(`inspect/${caseInfo.id}.ndjson`);
    files.add(`inspect/${caseInfo.id}.imported.ndjson`);
    files.add(`structural/${caseInfo.id}.structural.json`);

    if (!RASTER_UNAVAILABLE) {
      files.add(`${caseInfo.id}-montage.png`);
    }

    for (let slide = 1; slide <= caseInfo.slides; slide += 1) {
      files.add(`artifact-previews/${caseInfo.id}/slide-${String(slide).padStart(2, "0")}.png`);
      files.add(`layouts/${caseInfo.id}/slide-${String(slide).padStart(2, "0")}.layout.json`);
      files.add(`imported-layouts/${caseInfo.id}/slide-${String(slide).padStart(2, "0")}.layout.json`);

      if (!RASTER_UNAVAILABLE) {
        files.add(`${caseInfo.id}/slide-${slide}.png`);
      }
    }
  }

  return files;
}

function walkFiles(root) {
  const files = [];

  for (const name of fs.readdirSync(root)) {
    const absolutePath = path.join(root, name);
    const stat = fs.lstatSync(absolutePath);

    if (stat.isSymbolicLink()) {
      fail(`Output tree must not contain symlinks: ${repoRelative(absolutePath)}`);
    }

    if (stat.isDirectory()) {
      if (OUTPUT_POLICY.forbiddenNames.has(name) || name.startsWith(".")) {
        fail(`Output tree contains forbidden directory: ${repoRelative(absolutePath)}`);
      }

      files.push(...walkFiles(absolutePath));
      continue;
    }

    if (!stat.isFile()) {
      fail(`Output tree contains unmanaged filesystem entry: ${repoRelative(absolutePath)}`);
    }

    if (OUTPUT_POLICY.forbiddenNames.has(name) || name.startsWith(".")) {
      fail(`Output tree contains forbidden file: ${repoRelative(absolutePath)}`);
    }

    const extension = path.extname(name);
    if (OUTPUT_POLICY.forbiddenExtensions.has(extension) || !OUTPUT_POLICY.allowedExtensions.has(extension)) {
      fail(`Output tree contains forbidden file type: ${repoRelative(absolutePath)}`);
    }

    files.push(absolutePath);
  }

  return files;
}

function kindFor(relativePath) {
  if (relativePath === "README.md") return "readme";
  if (relativePath === "manifest.json") return "manifest";
  if (relativePath === "hashes.json") return "hashes";
  if (relativePath === "review-summary.json") return "manifest";
  if (relativePath.startsWith("evidence/")) return "evidence";
  if (relativePath.startsWith("inspect/")) return "inspect";
  if (relativePath.startsWith("layouts/") || relativePath.startsWith("imported-layouts/")) return "layout";
  if (relativePath.startsWith("structural/")) return "structural";
  if (relativePath.endsWith("-montage.png")) return "montage";
  if (relativePath.endsWith(".pptx")) return "pptx";
  if (relativePath.endsWith(".webp")) return "webp";
  if (relativePath.endsWith(".png")) return "png";
  return "unknown";
}

function caseIdFor(relativePath) {
  return ACTUAL_CASES.find((caseInfo) => relativePath.includes(caseInfo.id))?.id;
}

function semanticGuardPaths(relativePath) {
  const caseId = caseIdFor(relativePath);

  if (!caseId) {
    return [];
  }

  return [
    `${OUTPUT_ROOT_REF}/evidence/${caseId}.acceptance.json`,
    `${OUTPUT_ROOT_REF}/structural/${caseId}.structural.json`,
    `${OUTPUT_ROOT_REF}/inspect/${caseId}.imported.ndjson`,
  ];
}

function semanticGuardSha256(paths) {
  const entries = paths.map((relativePath) => {
    const fixturePath = relativePath.startsWith(`${OUTPUT_ROOT_REF}/`)
      ? relativePath.slice(OUTPUT_ROOT_REF.length + 1)
      : relativePath;
    const filePath = outputPath(fixturePath);

    return {
      path: relativePath,
      sha256: fs.existsSync(filePath) ? sha256File(filePath) : null,
    };
  });

  return sha256Buffer(stableJson(entries));
}

function enrichArtifactSummary(filePath) {
  const relativePath = repoRelative(filePath);
  const fixturePath = fixtureRelative(filePath);
  const artifactKind = kindFor(fixturePath);
  const guardPaths = ["montage", "png", "pptx", "webp"].includes(artifactKind)
    ? semanticGuardPaths(fixturePath)
    : [];

  return {
    kind: artifactKind,
    path: relativePath,
    byte_size: fs.statSync(filePath).size,
    case_id: caseIdFor(fixturePath),
    semantic_guard_paths: guardPaths.length > 0 ? guardPaths : undefined,
    semantic_guard_sha256: guardPaths.length > 0 ? semanticGuardSha256(guardPaths) : undefined,
  };
}

function assertNoAbsoluteLocalPaths(relativePath, filePath) {
  if (!/\.(?:json|ndjson|md)$/.test(relativePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\/.test(source)) {
    fail(`${relativePath} contains an absolute local path.`);
  }
}

function assertImageHeader(relativePath, filePath) {
  const buffer = fs.readFileSync(filePath);

  if (relativePath.endsWith(".png") && !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    fail(`${relativePath} is not a valid PNG.`);
  }

  if (relativePath.endsWith(".webp") && buffer.subarray(0, 4).toString("ascii") !== "RIFF") {
    fail(`${relativePath} is not a valid WEBP.`);
  }

  if (relativePath.endsWith(".pptx") && buffer.subarray(0, 2).toString("ascii") !== "PK") {
    fail(`${relativePath} is not a valid PPTX ZIP.`);
  }
}

function assertNoRawPublicOutput(relativePath, filePath) {
  if (relativePath.startsWith("inspect/")) {
    for (const [index, entry] of parseNdjson(filePath).entries()) {
      assertNoRawEvidencePayload(relativePath, entry, [String(index)]);
    }
    return;
  }

  if (relativePath.startsWith("layouts/") || relativePath.startsWith("imported-layouts/")) {
    assertNoRawEvidencePayload(relativePath, readJson(filePath));
  }
}

function assertOutputPolicy(files) {
  const allowed = expectedFiles();
  const observed = new Set(files.map((filePath) => fixtureRelative(filePath)));

  for (const relativePath of observed) {
    if (!allowed.has(relativePath)) {
      fail(`Output tree contains unmanaged file: ${relativePath}`);
    }
  }

  for (const relativePath of allowed) {
    if (!observed.has(relativePath)) {
      fail(`Output tree is missing managed file: ${relativePath}`);
    }
  }

  for (const filePath of files) {
    const relativePath = fixtureRelative(filePath);
    const kind = kindFor(relativePath);
    const stat = fs.statSync(filePath);
    const maxBytes = OUTPUT_POLICY.maxBytesByKind[kind];

    if (!maxBytes || stat.size > maxBytes) {
      fail(`${relativePath} exceeds the source-owned output size cap for ${kind}.`);
    }

    assertNoAbsoluteLocalPaths(relativePath, filePath);
    assertImageHeader(relativePath, filePath);
    assertNoRawPublicOutput(relativePath, filePath);
  }
}

function normalizedStructural(caseInfo) {
  const structural = inspectPptx(outputPath(`${caseInfo.id}.pptx`));
  return {
    absolute_or_traversal_relationships: structural.absolute_or_traversal_relationships,
    bytes: structural.bytes,
    external_relationships: structural.external_relationships,
    has_content_types: structural.has_content_types,
    has_presentation_xml: structural.has_presentation_xml,
    image_relationships: structural.image_relationships,
    relationship_file_count: structural.relationship_file_count,
    slide_count: structural.slide_count,
    slide_entries: structural.slide_entries,
    slide_size_emu: structural.slide_size_emu,
    theme_colors: structural.theme_colors,
    theme_entries: structural.theme_entries,
    traversal_entries: structural.traversal_entries,
    zip_entries: structural.zip_entries,
  };
}

function validateStructural(caseInfo, structural) {
  if (!structural.has_content_types || !structural.has_presentation_xml) {
    fail(`${caseInfo.id} is missing required PPTX content types or presentation XML.`);
  }

  if (structural.slide_count !== caseInfo.slides) {
    fail(`${caseInfo.id} should contain ${caseInfo.slides} slides, observed ${structural.slide_count}.`);
  }

  if (structural.external_relationships.length > 0) {
    fail(`${caseInfo.id} contains external relationships.`);
  }

  if (structural.absolute_or_traversal_relationships.length > 0 || structural.traversal_entries.length > 0) {
    fail(`${caseInfo.id} contains absolute or traversal paths.`);
  }

  const imageCount =
    (structural.image_relationships?.length ?? 0) +
    structural.slide_entries.reduce(
      (sum, slide) => sum + (slide.pictures ?? 0) + (slide.blips ?? 0),
      0,
    );

  if (imageCount > 0) {
    fail(`${caseInfo.id} contains raster image content without OCR/no-text proof.`);
  }

  const themeColors = Object.values(structural.theme_colors)[0] ?? {};
  for (const slot of ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "lt1", "lt2"]) {
    if (!themeColors[slot]) {
      fail(`${caseInfo.id} structural theme is missing ${slot}.`);
    }
  }
}

function buildManifest(files) {
  return {
    cases: ACTUAL_CASES.map((caseInfo) => ({
      id: caseInfo.id,
      pptx: `${OUTPUT_ROOT_REF}/${caseInfo.id}.pptx`,
      slides: caseInfo.slides,
      size: { height: caseInfo.height, width: caseInfo.width },
      evidence: `${OUTPUT_ROOT_REF}/evidence/${caseInfo.id}.acceptance.json`,
      structural: `${OUTPUT_ROOT_REF}/structural/${caseInfo.id}.structural.json`,
      raster: RASTER_UNAVAILABLE
        ? { status: "unavailable" }
        : {
            status: "available",
            contact_sheet: `${OUTPUT_ROOT_REF}/${caseInfo.id}-montage.png`,
            rendered_png_directory: `${OUTPUT_ROOT_REF}/${caseInfo.id}`,
          },
    })),
    generated_by: OUTPUT_POLICY.generatedBy,
    managed_files: files
      .map((filePath) => repoRelative(filePath))
      .filter((relativePath) => !relativePath.endsWith("hashes.json") && !relativePath.endsWith("manifest.json"))
      .sort(),
    policy_source: OUTPUT_POLICY.evidenceChecker,
    runtime_fingerprint: runtimeFingerprint(),
    version: 1,
  };
}

function buildHashes(files) {
  return {
    algorithm: HASH_ALGORITHM,
    entries: files
      .map((filePath) => {
        const relativePath = repoRelative(filePath);
        const fixturePath = fixtureRelative(filePath);
        const artifactKind = kindFor(fixturePath);
        const guardPaths = ["montage", "png", "pptx", "webp"].includes(artifactKind)
          ? semanticGuardPaths(fixturePath)
          : [];
        return {
          artifact_kind: artifactKind,
          byte_size: fs.statSync(filePath).size,
          case_id: caseIdFor(fixturePath),
          generated_by: OUTPUT_POLICY.generatedBy,
          path: relativePath,
          review_path: relativePath,
          semantic_guard_paths: guardPaths.length > 0 ? guardPaths : undefined,
          semantic_guard_sha256: guardPaths.length > 0 ? semanticGuardSha256(guardPaths) : undefined,
          sha256: sha256File(filePath),
          source_inputs: [OUTPUT_POLICY.generatedBy],
        };
      })
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
}

function buildReviewSummary(files) {
  const binaryArtifacts = files
    .map(enrichArtifactSummary)
    .filter((entry) => ["montage", "png", "pptx", "webp"].includes(entry.kind))
    .sort((left, right) => left.path.localeCompare(right.path));
  const semanticArtifacts = files
    .map(enrichArtifactSummary)
    .filter((entry) => !["montage", "png", "pptx", "webp"].includes(entry.kind))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    binary_artifacts: binaryArtifacts,
    cases: ACTUAL_CASES.map((caseInfo) => ({
      id: caseInfo.id,
      evidence: `${OUTPUT_ROOT_REF}/evidence/${caseInfo.id}.acceptance.json`,
      pptx: `${OUTPUT_ROOT_REF}/${caseInfo.id}.pptx`,
      raster: RASTER_UNAVAILABLE
        ? { status: "unavailable" }
        : {
            status: "available",
            contact_sheet: `${OUTPUT_ROOT_REF}/${caseInfo.id}-montage.png`,
            rendered_png_directory: `${OUTPUT_ROOT_REF}/${caseInfo.id}`,
          },
      slide_count: caseInfo.slides,
      slide_size: { height: caseInfo.height, width: caseInfo.width },
    })),
    file_count: files.length,
    runtime_fingerprint: runtimeFingerprint(),
    semantic_artifacts: semanticArtifacts,
    binary_hash_policy:
      "Binary PPTX/PNG/WEBP hash changes require paired semantic guard changes; hashes include semantic_guard_paths and semantic_guard_sha256 for review.",
    review_order: ["README.md", "manifest.json", "hashes.json", "contact sheets", "full-size PNGs"],
  };
}

function writeReadme() {
  const lines = [
    "# Presentation Theme Actual Evidence",
    "",
    "This directory is committed replay evidence for `judgmentkit/presentation-theme` actual PPTX checks.",
    "Runnable source lives in `scripts/presentation-theme/`; files here are inert outputs.",
    "",
    "Review order:",
    "1. `README.md`",
    "2. `manifest.json`",
    "3. `hashes.json`",
    "4. Contact sheets (`*-montage.png`)",
    "5. Full-size rendered slide PNG folders",
    "",
    "Regenerate only through `npm run presentation-theme:actual:update` with `JUDGMENTKIT_PPTX_ACTUAL=1 JUDGMENTKIT_PPTX_UPDATE=1`.",
    "",
    "Binary PPTX, PNG, and WEBP diffs are meaningful only when paired with updated hashes plus semantic evidence such as structural JSON, evidence JSON, manifest, or review-summary changes.",
  ];

  fs.writeFileSync(outputPath("README.md"), `${lines.join("\n")}\n`);
}

function writeGeneratedStructuralReports() {
  fs.mkdirSync(outputPath("structural"), { recursive: true });

  for (const caseInfo of ACTUAL_CASES) {
    writeJson(outputPath("structural", `${caseInfo.id}.structural.json`), normalizedStructural(caseInfo));
  }
}

function validateEvidence(caseInfo) {
  const evidence = readJson(outputPath("evidence", `${caseInfo.id}.acceptance.json`));

  if (evidence.acceptance_status !== "accepted") {
    fail(`${caseInfo.id} evidence should be accepted.`);
  }

  for (const forbiddenKey of ["source", "slides", "extracted_deck_text"]) {
    if (Object.hasOwn(evidence, forbiddenKey)) {
      fail(`${caseInfo.id} public evidence includes forbidden raw key ${forbiddenKey}.`);
    }
  }

  assertNoRawEvidencePayload(caseInfo.id, evidence);

  if (evidence.legacy_slides?.omitted !== true) {
    fail(`${caseInfo.id} evidence should record legacy slides as omitted supplemental metadata.`);
  }

  if (!evidence.artifact_ref?.sha256 || evidence.artifact_ref.sha256 !== sha256File(outputPath(`${caseInfo.id}.pptx`))) {
    fail(`${caseInfo.id} evidence is not bound to the actual PPTX bytes.`);
  }

  if (evidence.text_authority?.slide_count !== caseInfo.slides) {
    fail(`${caseInfo.id} text authority has the wrong slide count.`);
  }

  if (evidence.text_authority?.authoritative_slide_count !== caseInfo.slides) {
    fail(`${caseInfo.id} text authority does not cover every slide.`);
  }

  if (!Array.isArray(evidence.review?.warnings) || evidence.review.warnings.length !== 0) {
    fail(`${caseInfo.id} committed evidence should not rely on compatibility warnings.`);
  }
}

function assertNoRawEvidencePayload(caseId, value, pathParts = []) {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      assertNoRawEvidencePayload(caseId, entry, [...pathParts, String(index)]);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const forbiddenKeys = new Set([
    "slides",
    "extracted_deck_text",
    "extractedDeckText",
    "source_code",
    "raw_source",
    "raw_slides",
    "raw_text",
    "ocr_text",
    "slide_copy",
    "extractor_preview",
    "logs",
    "exception",
    "text",
    "textPreview",
    "title",
    "preview",
  ]);

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    const dotPath = nextPath.join(".");
    const adapterSource = dotPath === "adapter.source";
    const supplementalSlidesMetadata = dotPath === "evidence_sources.slides";

    if (forbiddenKeys.has(key) && !adapterSource && !supplementalSlidesMetadata) {
      fail(`${caseId} public evidence includes forbidden raw evidence key ${dotPath}.`);
    }

    assertNoRawEvidencePayload(caseId, entry, nextPath);
  }
}

function verifyHashes(files) {
  const current = buildHashes(files);
  const committed = readJson(outputPath("hashes.json"));

  if (stableJson(committed) !== stableJson(current)) {
    fail("hashes.json is stale. Run the opt-in actual update lane to refresh evidence.");
  }
}

function main() {
  if (!fs.existsSync(OUTPUT_ROOT)) {
    fail(`Missing actual evidence directory: ${OUTPUT_ROOT}`);
  }

  if (WRITE_MODE) {
    requireCommittedOutputUpdateGate("refreshing committed actual evidence metadata");
    writeReadme();
    writeGeneratedStructuralReports();
    writeJson(outputPath("manifest.json"), { pending: true });
    writeJson(outputPath("hashes.json"), { algorithm: HASH_ALGORITHM, entries: [] });
    writeJson(outputPath("review-summary.json"), { pending: true });
  }

  const files = walkFiles(OUTPUT_ROOT);
  assertOutputPolicy(files);

  for (const caseInfo of ACTUAL_CASES) {
    const structural = readJson(outputPath("structural", `${caseInfo.id}.structural.json`));
    validateStructural(caseInfo, structural);
    validateEvidence(caseInfo);
  }

  const filesAfterGeneratedWrites = walkFiles(OUTPUT_ROOT);
  const filesForManifest = filesAfterGeneratedWrites.filter(
    (filePath) => !["hashes.json", "manifest.json"].includes(path.basename(filePath)),
  );

  if (WRITE_MODE) {
    const filesForHashes = walkFiles(OUTPUT_ROOT).filter((filePath) => path.basename(filePath) !== "hashes.json");
    writeJson(outputPath("review-summary.json"), buildReviewSummary(filesForHashes));
    const filesForManifestAfterSummary = walkFiles(OUTPUT_ROOT).filter(
      (filePath) => !["hashes.json", "manifest.json"].includes(path.basename(filePath)),
    );
    writeJson(outputPath("manifest.json"), buildManifest(filesForManifestAfterSummary));
    const finalFilesForHashes = walkFiles(OUTPUT_ROOT).filter((filePath) => path.basename(filePath) !== "hashes.json");
    writeJson(outputPath("hashes.json"), buildHashes(finalFilesForHashes));
  } else {
    verifyHashes(filesAfterGeneratedWrites.filter((filePath) => path.basename(filePath) !== "hashes.json"));
  }

  console.log("presentation-theme actual evidence replay passed");
}

main();
