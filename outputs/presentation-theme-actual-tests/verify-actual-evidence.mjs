import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const themeSlots = [
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "bg1",
  "bg2",
  "tx1",
  "tx2",
  "dk1",
  "dk2",
  "lt1",
  "lt2",
  "hlink",
  "folHlink",
];

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(root, ...segments), "utf8"));
}

function readNdjson(...segments) {
  return fs
    .readFileSync(path.join(root, ...segments), "utf8")
    .trim()
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function element(layout, name) {
  const match = layout.elements.find((entry) => entry.name === name);
  assert(match, `Missing layout element ${name}`);
  return match;
}

function pngDimensions(label, ...segments) {
  const png = fs.readFileSync(path.join(root, ...segments));
  assert(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${label} should be a PNG file.`);

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bytes: png.length,
  };
}

function assertPngSlide(label, aspectRatio, ...segments) {
  const image = pngDimensions(label, ...segments);
  assert(image.width >= 900 && image.height >= 500, `${label} should be a rendered slide, not a tiny placeholder.`);
  assert(image.bytes > 10000, `${label} should contain rendered content.`);
  assert(
    Math.abs(image.width / image.height - aspectRatio) < 0.02,
    `${label} should keep the exported slide aspect ratio.`,
  );
}

const canonicalCover = readJson("layouts", "jk-theme-canonical-16x9", "slide-01.layout.json");
assert(canonicalCover.theme.colors.bg1.toLowerCase() === "#f8f7f2", "bg1 should be canvas");
assert(canonicalCover.theme.colors.lt1.toLowerCase() === "#f8f7f2", "lt1 should match bg1");
assert(canonicalCover.theme.colors.bg2.toLowerCase() === "#ffffff", "bg2 should be surface");
assert(canonicalCover.theme.colors.lt2.toLowerCase() === "#ffffff", "lt2 should match bg2");
assert(canonicalCover.theme.colors.accent6.toLowerCase() === "#d7d3c8", "accent6 should be border");
assert(element(canonicalCover, "judgmentkit-title-block-title").bbox[0] === 72, "Title should use the content margin.");
assert(element(canonicalCover, "judgmentkit-status-pill-surface").bbox[0] === 1076, "Status pill should be right aligned.");
assert(element(canonicalCover, "canonical-metric-1-detail").bbox[3] >= 24, "Metric detail should have readable height.");

const canonicalEvidence = readJson("layouts", "jk-theme-canonical-16x9", "slide-02.layout.json");
assert(
  element(canonicalEvidence, "judgmentkit-section-header-title").bbox[1] +
    element(canonicalEvidence, "judgmentkit-section-header-title").bbox[3] +
    16 <=
    element(canonicalEvidence, "judgmentkit-evidence-panel-surface").bbox[1],
  "Wrapped section title should not crowd the evidence panels.",
);

const canonicalTable = readJson("layouts", "jk-theme-canonical-16x9", "slide-04.layout.json");
assert(element(canonicalTable, "judgmentkit-evidence-table").kind === "table", "Table slide should contain a native table.");
assert(element(canonicalTable, "judgmentkit-handoff-receipt-body").bbox[3] >= 24, "Table receipt body should have readable height.");

const importedCanonicalTable = readJson("imported-layouts", "jk-theme-canonical-16x9", "slide-04.layout.json");
const importedTable = element(importedCanonicalTable, "judgmentkit-evidence-table");
assert(importedTable.rows === 4 && importedTable.cols === 3, "Imported table should preserve rows and columns.");
for (const expectedText of ["Theme aliases", "Expected", "Matched"]) {
  assert(importedTable.text.includes(expectedText), `Imported table should preserve ${expectedText}.`);
}

const importedInspect = readNdjson("inspect", "jk-theme-canonical-16x9.imported.ndjson");
const importedInspectTable = importedInspect.find(
  (entry) => entry.kind === "table" && entry.name === "judgmentkit-evidence-table",
);
assert(importedInspectTable?.rows === 4, "Imported inspect evidence should preserve table rows.");
assert(importedInspectTable?.cols === 3, "Imported inspect evidence should preserve table columns.");
assert(importedInspectTable?.preview?.includes("Expected"), "Imported inspect evidence should preserve table header text.");

const fourByThree = readJson("layouts", "jk-theme-custom-4x3", "slide-01.layout.json");
assert(fourByThree.slide.frame.width === 1024, "4:3 deck should export at 1024px wide.");
assert(
  element(fourByThree, "judgmentkit-title-block-subtitle").bbox[1] +
    element(fourByThree, "judgmentkit-title-block-subtitle").bbox[3] <
    element(fourByThree, "judgmentkit-metric-tile-surface").bbox[1],
  "4:3 subtitle should not overlap metric tiles.",
);

const compact = readJson("layouts", "jk-theme-compact-review", "slide-01.layout.json");
assert(compact.slide.frame.width === 960, "Compact deck should export at 960px wide.");
assert(element(compact, "judgmentkit-section-header-title").bbox[3] >= 58, "Compact title should keep readable height.");
assert(element(compact, "judgmentkit-handoff-receipt-body").bbox[3] >= 24, "Compact receipt body should have readable height.");

const expectedSizes = {
  "jk-theme-canonical-16x9.acceptance.json": {
    deck: "jk-theme-canonical-16x9",
    width: 1280,
    height: 720,
    slides: 4,
    aspectRatio: 16 / 9,
  },
  "jk-theme-custom-4x3.acceptance.json": {
    deck: "jk-theme-custom-4x3",
    width: 1024,
    height: 768,
    slides: 1,
    aspectRatio: 4 / 3,
  },
  "jk-theme-compact-review.acceptance.json": {
    deck: "jk-theme-compact-review",
    width: 960,
    height: 540,
    slides: 1,
    aspectRatio: 16 / 9,
  },
};

for (const file of fs.readdirSync(path.join(root, "evidence")).filter((name) => name.endsWith(".json"))) {
  const evidence = readJson("evidence", file);
  assert(evidence.acceptance_status === "accepted", `${file} should be accepted.`);
  assert(Object.keys(evidence.checks ?? {}).length > 0, `${file} should include concrete generated-artifact checks.`);

  const expectedSize = expectedSizes[file];
  assert(expectedSize, `${file} should have an expected size entry.`);
  assert(evidence.checks.actual_slide_size.width === expectedSize.width, `${file} should record actual slide width.`);
  assert(evidence.checks.actual_slide_size.height === expectedSize.height, `${file} should record actual slide height.`);
  assert(evidence.checks.layout_json_exports === expectedSize.slides, `${file} should record layout export count.`);
  assert(evidence.checks.imported_layout_json_exports === expectedSize.slides, `${file} should record imported layout export count.`);
  assert(evidence.checks.artifact_preview_pngs === expectedSize.slides, `${file} should record artifact preview count.`);
  assert(evidence.checks.rendered_pptx_pngs_expected === expectedSize.slides, `${file} should record rendered PNG expectation count.`);
  assert(fs.existsSync(evidence.checks.artifact_preview_directory), `${file} artifact preview directory should exist.`);
  assert(fs.existsSync(evidence.checks.imported_inspect_path), `${file} imported inspect path should exist.`);
  assert(fs.existsSync(evidence.checks.rendered_pptx_png_directory), `${file} rendered PPTX PNG directory should exist.`);

  for (let slide = 1; slide <= expectedSize.slides; slide += 1) {
    assertPngSlide(
      `${expectedSize.deck} artifact preview slide ${slide}`,
      expectedSize.aspectRatio,
      "artifact-previews",
      expectedSize.deck,
      `slide-${String(slide).padStart(2, "0")}.png`,
    );
    assertPngSlide(
      `${expectedSize.deck} rendered PPTX slide ${slide}`,
      expectedSize.aspectRatio,
      expectedSize.deck,
      `slide-${slide}.png`,
    );
  }

  for (const slot of themeSlots) {
    const value = evidence.theme.color_scheme[slot];
    assert(
      typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value),
      `${file} ${slot} should be serialized as a hex color.`,
    );
  }
}

console.log("actual evidence verification passed");
