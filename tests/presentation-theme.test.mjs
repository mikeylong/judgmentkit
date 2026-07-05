import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST,
  JUDGMENTKIT_PPTX_THEME_COLORS,
  JUDGMENTKIT_SLIDE_SIZE,
  JUDGMENTKIT_STYLE_NAMES,
  JUDGMENTKIT_TEXT_STYLE_CONFIGS,
  JUDGMENTKIT_THEME_COLOR_SLOTS,
  applyJudgmentKitPptxTheme,
  assertCompleteThemeColors,
  contentFrame,
  createJudgmentKitDeckKit,
  createJudgmentKitLayout,
  createJudgmentKitColorScheme,
  createJudgmentKitComponentFactories,
  createJudgmentKitPresentation,
  createJudgmentKitPresentationAcceptanceEvidence,
  createJudgmentKitTextStyleConfigs,
  fullSlide,
  gridSpan,
  jk,
  lintJudgmentKitPresentationSource,
  registerJudgmentKitStyles,
} from "judgmentkit/presentation-theme";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const presentationThemeDir = path.join(root, "src", "presentation-theme");
const presentationThemeModule = await import("judgmentkit/presentation-theme");
function sha256File(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

const PRESENTATION_THEME_EXPORTS = [
  "GRID",
  "JUDGMENTKIT_COLOR_TOKENS",
  "JUDGMENTKIT_CSS_CUSTOM_PROPERTIES",
  "JUDGMENTKIT_PPTX_DARK_THEME_COLORS",
  "JUDGMENTKIT_PPTX_THEME_ADAPTER_MANIFEST",
  "JUDGMENTKIT_PPTX_THEME_COLORS",
  "JUDGMENTKIT_PPTX_THEME_COLOR_ROLE_MAP",
  "JUDGMENTKIT_PPTX_THEME_COLOR_SCHEMES",
  "JUDGMENTKIT_PPTX_THEME_NAMES",
  "JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST",
  "JUDGMENTKIT_SLIDE_SIZE",
  "JUDGMENTKIT_STYLE_NAMES",
  "JUDGMENTKIT_TEXT_STYLE_CONFIGS",
  "JUDGMENTKIT_THEME_COLOR_SLOTS",
  "MARGINS",
  "REQUIRED_JUDGMENTKIT_PPTX_THEME_SLOTS",
  "SLIDE_HEIGHT",
  "SLIDE_SIZE",
  "SLIDE_WIDTH",
  "adapterManifest",
  "alignWithin",
  "applyJudgmentKitPptxTheme",
  "assertCompleteThemeColors",
  "cloneJudgmentKitPresentationValue",
  "columns",
  "contentFrame",
  "createJudgmentKitColorScheme",
  "createJudgmentKitComponentFactories",
  "createJudgmentKitDeckKit",
  "createJudgmentKitLayout",
  "createJudgmentKitPresentation",
  "createJudgmentKitPresentationAcceptanceEvidence",
  "createJudgmentKitPresentationEvidence",
  "createJudgmentKitTextStyleConfigs",
  "frame",
  "fullSlide",
  "gridSpan",
  "inset",
  "jk",
  "lintJudgmentKitPresentationSource",
  "normalizeFrame",
  "registerJudgmentKitStyles",
  "resolveJudgmentKitThemeMode",
  "reviewJudgmentKitPresentationEvidence",
  "rows",
  "split",
  "stack",
];
const JUDGMENTKIT_THEME_FIXTURE_ARTIFACT = {
  path: "outputs/presentation-theme-actual-tests/jk-theme-canonical-16x9.pptx",
  kind: "pptx",
  sha256: sha256File("outputs/presentation-theme-actual-tests/jk-theme-canonical-16x9.pptx"),
};
const presentationThemeTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-presentation-theme-"));
process.on("exit", () => {
  fs.rmSync(presentationThemeTempRoot, { recursive: true, force: true });
});
const NO_TEXT_PPTX_ARTIFACT = writeNoTextPptxFixture(presentationThemeTempRoot);
const ARTIFACT_TOOL_THEME_COLOR_SLOTS = [
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function createStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBuffer = Buffer.from(name);
    const contentBuffer = Buffer.from(content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, contentBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + contentBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localDirectory.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, eocd]);
}

function writeNoTextPptxFixture(directory) {
  const pptxPath = path.join(directory, "no-text.pptx");
  fs.writeFileSync(
    pptxPath,
    createStoredZip([
      [
        "[Content_Types].xml",
        '<Types><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>',
      ],
      [
        "ppt/presentation.xml",
        '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldSz cx="9144000" cy="5143500"/><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>',
      ],
      [
        "ppt/slides/slide1.xml",
        '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sld>',
      ],
    ]),
  );

  return {
    kind: "pptx",
    path: "no-text.pptx",
    sha256: crypto.createHash("sha256").update(fs.readFileSync(pptxPath)).digest("hex"),
  };
}

function createFakePresentation() {
  const styleEntries = new Map();
  const calls = {
    textStyles: [],
    stylesAdded: [],
  };

  return {
    calls,
    theme: {
      textStyles(config) {
        calls.textStyles.push(config);
        return config;
      },
    },
    styles: {
      get(name) {
        return styleEntries.get(name);
      },
      add(name) {
        const entry = { name };
        styleEntries.set(name, entry);
        calls.stylesAdded.push(entry);
        return entry;
      },
    },
  };
}

function createFakeHelpers() {
  const legacyFrameKeys = ["frame", "left", "top", "x", "y", "w", "h"];
  const validateFrame = (label, props = {}) => {
    assert.equal(typeof props.position, "object", `${label} should emit position.`);
    assert.equal(Number.isFinite(props.position?.left), true, `${label} should emit finite position.left.`);
    assert.equal(Number.isFinite(props.position?.top), true, `${label} should emit finite position.top.`);
    assert.equal(Number.isFinite(props.width), true, `${label} should emit finite width.`);
    assert.equal(Number.isFinite(props.height), true, `${label} should emit finite height.`);

    for (const key of legacyFrameKeys) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(props, key),
        false,
        `${label} should not emit legacy frame key ${key}.`,
      );
    }
  };

  return {
    layers: (props, children = []) => ({ kind: "layers", props, children }),
    text: (lines, props = {}) => {
      validateFrame("text", props);
      return { kind: "text", lines, props };
    },
    shape: (props = {}) => {
      validateFrame("shape", props);
      return { kind: "shape", props };
    },
    table: (config = {}) => {
      validateFrame("table", config);
      return { kind: "table", config, props: config };
    },
  };
}

function createFakePresentationFactory() {
  return {
    create(options) {
      return {
        ...createFakePresentation(),
        createOptions: options,
        slideSize: options.slideSize,
      };
    },
  };
}

function createOpaqueFakePresentationFactory() {
  return {
    create(options) {
      return {
        ...createFakePresentation(),
        createOptions: options,
      };
    },
  };
}

function childNamed(layer, name) {
  return layer.children.find((child) => child.props?.name === name);
}

function px(value) {
  return Number(String(value).replace(/px$/, ""));
}

function composeLeft(props) {
  return px(props.position.left);
}

function composeTop(props) {
  return px(props.position.top);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractedDeckText(entries, options = {}) {
  const normalizedEntries = entries.map((entry, index) =>
    typeof entry === "string"
      ? {
          slide_index: index,
          slide_number: index + 1,
          kind: "text",
          text: entry,
        }
      : entry,
  );

  return {
    status: options.status ?? "extracted",
    method: "pptx_extract",
    artifact_ref: options.artifactRef ?? JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
    slide_count: options.slideCount ?? normalizedEntries.length,
    entries: normalizedEntries,
  };
}

const packageJson = readJson("package.json");
const packageLock = fs.existsSync(path.join(root, "package-lock.json"))
  ? fs.readFileSync(path.join(root, "package-lock.json"), "utf8")
  : "";
const actualQaSource = fs.readFileSync(
  path.join(root, "scripts", "presentation-theme", "run-actual-qa.mjs"),
  "utf8",
);
const actualBuilderSource = fs.readFileSync(
  path.join(root, "scripts", "presentation-theme", "build-actual-fixtures.mjs"),
  "utf8",
);
const actualEvidenceCheckerSource = fs.readFileSync(
  path.join(root, "scripts", "presentation-theme", "actual-evidence-check.mjs"),
  "utf8",
);

assert.equal(
  packageJson.exports?.["./presentation-theme"],
  "./src/presentation-theme/index.mjs",
  "package.json should expose the presentation-theme adapter subpath.",
);
assert.ok(
  packageJson.scripts?.["test:presentation-theme"]?.includes("node tests/presentation-theme.test.mjs"),
  "test:presentation-theme should include the presentation theme contract test.",
);
assert.ok(
  packageJson.scripts.test.includes("npm run test:presentation-theme"),
  "npm test should call the presentation-theme script instead of wiring the raw test directly.",
);
assert.equal(
  packageJson.scripts.test.includes("&& node tests/presentation-theme.test.mjs &&"),
  false,
  "npm test should not keep a duplicate raw presentation-theme test segment.",
);
assert.deepEqual(
  Object.keys(presentationThemeModule).sort(),
  [...PRESENTATION_THEME_EXPORTS].sort(),
  "The presentation-theme named export surface should stay frozen for PR #16.",
);
assert.deepEqual(
  Object.keys(jk).sort(),
  ["colors", "components", "cssCustomProperties", "layout", "styles"].sort(),
  "The jk public namespace keys should stay stable.",
);
assert.deepEqual(
  Object.keys(jk.components).sort(),
  ["withHelpers"],
  "The jk.components public namespace keys should stay stable.",
);
assert.deepEqual(
  Object.keys(packageJson.exports).sort(),
  [".", "./presentation-theme", "./providers/openai-responses"].sort(),
  "Package export keys should stay frozen.",
);
assert.deepEqual(
  Object.keys(packageJson.bin).sort(),
  ["judgmentkit", "judgmentkit-mcp-stdio"].sort(),
  "Package bin targets should stay frozen.",
);
assert.deepEqual(
  packageJson.files,
  ["bin/", "contracts/", "examples/ai-native-design-system/", "src/", "README.md", "DESIGN.md"],
  "The package file allowlist should keep generated outputs out of npm tarballs.",
);
assert.equal(
  packageLock.includes("@oai/artifact-tool"),
  false,
  "The root lockfile must not introduce @oai/artifact-tool.",
);
assert.equal(
  packageJson.scripts.test.includes("presentation-theme:actual:check"),
  false,
  "The default test lane must not run fresh actual rendering.",
);
assert.equal(
  packageJson.scripts.test.includes("presentation-theme:actual:preflight"),
  false,
  "The default test lane must not probe the optional presentation runtime.",
);
assert.equal(
  packageJson.scripts?.["presentation-theme:actual:preflight"],
  "node scripts/presentation-theme/run-actual-qa.mjs --mode preflight",
  "The actual preflight lane should check runtime readiness without fixture generation.",
);
assert.match(
  actualQaSource,
  /JUDGMENTKIT_PPTX_PYTHON/,
  "The actual QA lane should support an explicit raster-capable Python runtime.",
);
assert.match(
  actualQaSource,
  /DEFAULT_RUNTIME_PYTHON/,
  "The actual QA lane should prefer the bundled Codex runtime Python before system python3.",
);
assert.equal(
  /run\("python3",\s*\[tools\.(?:renderSlides|slidesTest|createMontage)/.test(actualQaSource),
  false,
  "The actual QA lane must not invoke render tools through system python3 directly.",
);
assert.match(
  actualQaSource,
  /runtimeFingerprintsMatch/,
  "The actual check lane should compare binary hashes exactly when the runtime fingerprint matches.",
);
assert.match(
  actualQaSource,
  /mode !== "check" && mode !== "update" && mode !== "preflight"/,
  "The actual QA runner should expose an explicit preflight mode.",
);
assert.match(
  actualBuilderSource,
  /requireCommittedOutputUpdateGate/,
  "The fixture builder should not write the committed output tree without the explicit update gate.",
);
assert.match(
  actualEvidenceCheckerSource,
  /requireCommittedOutputUpdateGate/,
  "The evidence metadata writer should not write the committed output tree without the explicit update gate.",
);
assert.match(
  actualBuilderSource,
  /sanitizeInspectNdjson/,
  "Committed inspect replay artifacts should be sanitized before writing.",
);
assert.match(
  actualEvidenceCheckerSource,
  /assertNoRawPublicOutput/,
  "Committed inspect and layout replay artifacts should be checked for raw text payload keys.",
);
assert.match(
  actualEvidenceCheckerSource,
  /semantic_guard_sha256/,
  "Binary output hash records should include semantic guard digests for review.",
);
for (const dependencySection of ["dependencies", "devDependencies", "peerDependencies"]) {
  assert.equal(
    packageJson[dependencySection]?.["@oai/artifact-tool"],
    undefined,
    `The root package must not require @oai/artifact-tool in ${dependencySection}; the presentations runtime injects it.`,
  );
}
for (const filename of fs.readdirSync(presentationThemeDir)) {
  if (!filename.endsWith(".mjs")) {
    continue;
  }

  const source = fs.readFileSync(path.join(presentationThemeDir, filename), "utf8");
  assert.equal(
    /from\s+["']@oai\/artifact-tool["']|import\s*\(\s*["']@oai\/artifact-tool["']\s*\)/.test(source),
    false,
    `${filename} must not import @oai/artifact-tool at module load time.`,
  );
}

assert.deepEqual(
  Object.keys(JUDGMENTKIT_PPTX_THEME_COLORS).sort(),
  [...ARTIFACT_TOOL_THEME_COLOR_SLOTS].sort(),
  "The adapter must provide every artifact-tool theme color slot.",
);
assert.deepEqual(
  [...JUDGMENTKIT_THEME_COLOR_SLOTS].sort(),
  [...ARTIFACT_TOOL_THEME_COLOR_SLOTS].sort(),
  "The exported slot list should match artifact-tool's 16-slot color scheme.",
);
assert.equal(JUDGMENTKIT_PPTX_THEME_COLORS.bg1, "#f8f7f2");
assert.equal(JUDGMENTKIT_PPTX_THEME_COLORS.bg2, "#ffffff");
assert.equal(JUDGMENTKIT_PPTX_THEME_COLORS.tx1, "#171717");
assert.equal(JUDGMENTKIT_PPTX_THEME_COLORS.accent5, "#8f342f");
assert.equal(
  JUDGMENTKIT_PPTX_THEME_COLORS.lt1,
  "#f8f7f2",
  "PowerPoint bg1 resolves through lt1, so lt1 should carry the canvas color.",
);
assert.equal(
  JUDGMENTKIT_PPTX_THEME_COLORS.lt2,
  "#ffffff",
  "PowerPoint bg2 resolves through lt2, so lt2 should carry the surface color.",
);
assert.equal(
  JUDGMENTKIT_PPTX_THEME_COLORS.accent6,
  "#d7d3c8",
  "The neutral accent slot should carry the visible border color.",
);

const tokenAuthority = JUDGMENTKIT_PRESENTATION_THEME_ADAPTER_MANIFEST.visual_token_authority;
const indexSource = fs.readFileSync(path.join(root, tokenAuthority.module_path), "utf8");
assert.match(
  indexSource,
  new RegExp(
    `const\\s+${escapeRegExp(tokenAuthority.symbol)}\\s*=\\s*{[\\s\\S]*?id:\\s*"${escapeRegExp(
      tokenAuthority.id,
    )}"[\\s\\S]*?mode:\\s*"${escapeRegExp(tokenAuthority.mode)}"`,
  ),
  "The presentation-theme manifest should point at the current default visual-token adapter authority.",
);

const darkScheme = createJudgmentKitColorScheme({ themeMode: "dark" });
assert.equal(darkScheme.name, "JudgmentKit Dark");
assert.equal(darkScheme.themeColors.bg1, "#101312");
assert.equal(darkScheme.themeColors.tx1, "#f2f4ef");

const customScheme = createJudgmentKitColorScheme({
  themeName: "JudgmentKit Custom",
  themeColors: { accent1: "#123456" },
});
assert.equal(customScheme.name, "JudgmentKit Custom");
assert.equal(customScheme.themeColors.accent1, "#123456");
assert.equal(customScheme.themeColors.bg1, "#f8f7f2");

const bgOverrideScheme = createJudgmentKitColorScheme({
  themeColors: { bg1: "#eeeeee" },
});
assert.equal(bgOverrideScheme.themeColors.bg1, "#eeeeee");
assert.equal(
  bgOverrideScheme.themeColors.lt1,
  "#eeeeee",
  "PowerPoint bg1 alias slot lt1 should follow bg1 overrides.",
);

const caseInsensitiveAliasScheme = createJudgmentKitColorScheme({
  themeColors: { bg1: "#eeeeee", lt1: "#EEEEEE" },
});
assert.equal(caseInsensitiveAliasScheme.themeColors.bg1, "#eeeeee");
assert.equal(caseInsensitiveAliasScheme.themeColors.lt1, "#eeeeee");

const ltOverrideScheme = createJudgmentKitColorScheme({
  themeColors: { lt2: "#fefefe" },
});
assert.equal(ltOverrideScheme.themeColors.bg2, "#fefefe");
assert.equal(ltOverrideScheme.themeColors.lt2, "#fefefe");

assert.throws(
  () =>
    createJudgmentKitColorScheme({
      themeColors: { bg1: "#eeeeee", lt1: "#ffffff" },
    }),
  /bg1 and lt1/,
  "Conflicting PowerPoint alias overrides should fail clearly.",
);

assert.throws(
  () =>
    assertCompleteThemeColors({
      ...JUDGMENTKIT_PPTX_THEME_COLORS,
      bg1: {},
    }),
  /6-digit hex strings.*bg1/,
  "Theme evidence must not accept serialized color objects.",
);

for (const slot of ARTIFACT_TOOL_THEME_COLOR_SLOTS) {
  const incomplete = { ...JUDGMENTKIT_PPTX_THEME_COLORS };
  delete incomplete[slot];
  assert.throws(
    () => assertCompleteThemeColors(incomplete),
    new RegExp(slot),
    `Missing ${slot} should fail complete theme validation.`,
  );
}

const presentation = createFakePresentation();
applyJudgmentKitPptxTheme(presentation);
assert.equal(presentation.theme.colorScheme.name, "JudgmentKit Light");
assert.equal(presentation.theme.colorScheme.themeColors.lt1, "#f8f7f2");
assert.equal(presentation.theme.colorScheme.themeColors.lt2, "#ffffff");
assert.equal(presentation.theme.colorScheme.themeColors.accent6, "#d7d3c8");
assert.equal(presentation.calls.textStyles.length, 1);
assert.ok(
  presentation.calls.stylesAdded.some(
    (entry) => entry.name === JUDGMENTKIT_STYLE_NAMES.title,
  ),
  "Named styles should be registered through presentation.styles.",
);
assert.equal(
  presentation.calls.stylesAdded.find(
    (entry) => entry.name === JUDGMENTKIT_STYLE_NAMES.body,
  )?.fontSize,
  18,
);

const explicitStylesPresentation = createFakePresentation();
registerJudgmentKitStyles(explicitStylesPresentation, {
  textStyles: {
    body: { fontSize: 20 },
  },
});
assert.equal(
  explicitStylesPresentation.calls.stylesAdded.find(
    (entry) => entry.name === JUDGMENTKIT_STYLE_NAMES.body,
  )?.fontSize,
  20,
  "Style overrides should apply through semantic style keys.",
);
assert.equal(
  createJudgmentKitTextStyleConfigs()[JUDGMENTKIT_STYLE_NAMES.diagnostic].color,
  "tx2",
);
assert.equal(
  JUDGMENTKIT_TEXT_STYLE_CONFIGS[JUDGMENTKIT_STYLE_NAMES.title].fontSize,
  38,
);
assert.equal(
  JUDGMENTKIT_TEXT_STYLE_CONFIGS[JUDGMENTKIT_STYLE_NAMES.bodySmall].fontSize,
  16,
  "Small body text should meet the presentation readability floor.",
);

const created = createJudgmentKitPresentation({
  Presentation: createFakePresentationFactory(),
  helpers: createFakeHelpers(),
});
assert.deepEqual(
  Object.keys(created).sort(),
  ["kit", "manifest", "presentation"].sort(),
  "createJudgmentKitPresentation should keep its public return-shape keys stable.",
);
assert.deepEqual(
  Object.keys(created.kit).sort(),
  ["components", "layout", "manifest", "presentation", "styleNames"].sort(),
  "createJudgmentKitDeckKit should keep its public return-shape keys stable.",
);
assert.equal(created.presentation.createOptions.slideSize.width, JUDGMENTKIT_SLIDE_SIZE.width);
assert.equal(created.presentation.theme.colorScheme.themeColors.bg2, "#ffffff");
assert.ok(created.kit.components.titleBlock, "createJudgmentKitPresentation should attach a deck kit.");

const presentationOptionsSized = createJudgmentKitPresentation({
  Presentation: createFakePresentationFactory(),
  presentationOptions: {
    slideSize: { width: 1024, height: 768 },
    notes: "preserved option",
  },
  helpers: createFakeHelpers(),
});
assert.equal(presentationOptionsSized.presentation.createOptions.slideSize.width, 1024);
assert.equal(presentationOptionsSized.presentation.createOptions.slideSize.height, 768);
assert.equal(presentationOptionsSized.presentation.createOptions.notes, "preserved option");

const topLevelSlideSize = createJudgmentKitPresentation({
  Presentation: createFakePresentationFactory(),
  presentationOptions: {
    slideSize: { width: 1024, height: 768 },
  },
  slideSize: { width: 960, height: 540 },
  helpers: createFakeHelpers(),
});
assert.equal(topLevelSlideSize.presentation.createOptions.slideSize.width, 960);
assert.equal(topLevelSlideSize.presentation.createOptions.slideSize.height, 540);
assert.equal(topLevelSlideSize.kit.layout.fullSlide().width, 960);
assert.equal(topLevelSlideSize.kit.layout.contentFrame().width, 816);
assert.equal(contentFrame().width, 1136, "The global exported layout should keep canonical defaults.");

const invalidTopLevelSlideSize = createJudgmentKitPresentation({
  Presentation: createFakePresentationFactory(),
  presentationOptions: {
    slideSize: { width: 1024, height: 768 },
  },
  slideSize: { width: 0, height: 540 },
  helpers: createFakeHelpers(),
});
assert.equal(invalidTopLevelSlideSize.presentation.createOptions.slideSize.width, 1024);
assert.equal(invalidTopLevelSlideSize.presentation.createOptions.slideSize.height, 768);
assert.equal(
  invalidTopLevelSlideSize.kit.layout.contentFrame().width,
  880,
  "Invalid top-level slide sizes should fall through atomically to presentationOptions.",
);

const invalidMixedAliasLayout = createJudgmentKitLayout({
  slideSize: { width: 960, h: 540 },
  slide_size: { w: 640, h: 360 },
});
assert.equal(
  invalidMixedAliasLayout.fullSlide().width,
  640,
  "Slide-size resolution should not mix width/height aliases inside one candidate.",
);
assert.equal(invalidMixedAliasLayout.contentFrame().width, 496);

const opaqueCreated = createJudgmentKitPresentation({
  Presentation: createOpaqueFakePresentationFactory(),
  slideSize: { width: 960, height: 540 },
  helpers: createFakeHelpers(),
});
assert.equal(
  opaqueCreated.kit.layout.contentFrame().width,
  816,
  "The requested create size should flow into kit defaults when Presentation.create returns opaque metadata.",
);

const underscoreSlideSize = createJudgmentKitPresentation({
  Presentation: createFakePresentationFactory(),
  slide_size: { width: 1000, height: 500 },
  helpers: createFakeHelpers(),
});
assert.equal(underscoreSlideSize.presentation.createOptions.slideSize.width, 1000);
assert.equal(underscoreSlideSize.kit.layout.contentFrame().width, 856);

const directKit = createJudgmentKitDeckKit({
  presentation: createFakePresentation(),
  helpers: createFakeHelpers(),
  slideSize: { width: 900, height: 500 },
});
assert.equal(directKit.layout.fullSlide().width, 900);
assert.equal(directKit.layout.contentFrame().width, 756);

const defaultKit = createJudgmentKitDeckKit({
  presentation: createFakePresentation(),
  helpers: createFakeHelpers(),
});
assert.equal(defaultKit.layout.contentFrame().width, 1136);

const customPanel = topLevelSlideSize.kit.components.evidencePanel({
  title: "Evidence",
  body: "Policy match and account history.",
});
const customPanelSurface = childNamed(customPanel, "judgmentkit-evidence-panel-surface");
assert.equal(customPanelSurface.props.width, 816);
assert.equal(customPanelSurface.props.height, 428);
assert.equal(customPanelSurface.props.line.fill, "accent6");
assert.ok(composeLeft(customPanelSurface.props) + customPanelSurface.props.width <= 960);

const shortPanel = topLevelSlideSize.kit.components.evidencePanel({
  title: "Outcome",
  body: "This body needs enough vertical room to render readably.",
  frame: { left: 72, top: 120, width: 400, height: 92 },
});
assert.equal(
  childNamed(shortPanel, "judgmentkit-evidence-panel-body"),
  undefined,
  "Evidence panels should not emit body text boxes too short to read.",
);

const customMetric = topLevelSlideSize.kit.components.metricTile({
  label: "Reviewed",
  value: "12",
});
assert.equal(childNamed(customMetric, "judgmentkit-metric-tile-surface").props.width, 816);

const smallMetric = topLevelSlideSize.kit.components.metricTile({
  label: "Reviewed",
  value: "12",
  detail: "Short detail",
  frame: { left: 72, top: 300, width: 240, height: 136 },
});
assert.equal(
  childNamed(smallMetric, "judgmentkit-metric-tile-detail"),
  undefined,
  "Metric tile details should not be emitted when the supplied frame cannot fit them.",
);
assert.equal(
  topLevelSlideSize.kit.components.mediaFrame().props.width,
  816,
  "Default media frames should use the kit-scoped content width.",
);

const tableFallbackKit = createJudgmentKitDeckKit({
  presentation: createFakePresentation(),
  helpers: {
    layers: (props, children = []) => ({ kind: "layers", props, children }),
    text: (lines, props = {}) => ({ kind: "text", lines, props }),
    shape: (props = {}) => ({ kind: "shape", props }),
  },
  slideSize: { width: 960, height: 540 },
});
const fallbackTable = tableFallbackKit.components.evidenceTable({
  rows: [["Claim", "Evidence"]],
});
assert.equal(childNamed(fallbackTable, "judgmentkit-evidence-table-surface").props.width, 816);
const fallbackMixedTable = tableFallbackKit.components.evidenceTable({
  rows: [["Claim", null, "Decision"], "Scalar row", ["Ragged", undefined]],
});
assert.deepEqual(childNamed(fallbackMixedTable, "judgmentkit-evidence-table-body").lines, [
  "Claim    Decision",
  "Scalar row    ",
  "Ragged    ",
]);
const fallbackEmptyTable = tableFallbackKit.components.evidenceTable({ rows: [] });
assert.deepEqual(childNamed(fallbackEmptyTable, "judgmentkit-evidence-table-body").lines, [""],);

const wrappedHeader = topLevelSlideSize.kit.components.sectionHeader({
  label: "WRAPPED",
  title: "The review components should read as deck content, not UI chrome",
  frame: { left: 72, top: 48, width: 540, height: 88 },
});
assert.ok(
  childNamed(wrappedHeader, "judgmentkit-section-header-title").props.height > 58,
  "Wrapped section titles should receive more than one line of vertical space.",
);

const concreteTable = topLevelSlideSize.kit.components.evidenceTable({
  rows: [
    ["Claim", "Evidence", "Decision"],
    ["Trace", "Within bounds"],
  ],
  frame: { left: 80, top: 120, width: 720, height: 180 },
});
assert.equal(concreteTable.kind, "table");
assert.equal(concreteTable.config.rows, 2);
assert.equal(concreteTable.config.columns, 3);
assert.deepEqual(concreteTable.config.values[1], ["Trace", "Within bounds", ""]);
assert.equal(concreteTable.config.position.left, 80);
assert.equal(concreteTable.config.position.top, 120);
assert.equal(concreteTable.config.width, 720);
assert.equal(concreteTable.config.style, JUDGMENTKIT_STYLE_NAMES.bodySmall);
assert.equal(concreteTable.config.textStyle, undefined);

const presentationOptionsFactories = createJudgmentKitComponentFactories({
  helpers: createFakeHelpers(),
  presentationOptions: { slideSize: { width: 720, height: 405 } },
});
const presentationOptionsPanel = presentationOptionsFactories.evidencePanel({
  title: "Evidence",
  body: "Bounded decision support.",
});
assert.equal(
  childNamed(presentationOptionsPanel, "judgmentkit-evidence-panel-surface").props.width,
  576,
);

const helperLayoutCollisionFactories = createJudgmentKitComponentFactories({
  ...createFakeHelpers(),
  layout: { unrelated: true },
});
const helperLayoutCollisionPanel = helperLayoutCollisionFactories.evidencePanel({
  title: "Evidence",
  body: "Helper objects can carry unrelated layout data.",
});
assert.equal(
  childNamed(helperLayoutCollisionPanel, "judgmentkit-evidence-panel-surface").props.width,
  1136,
  "A helper object with a layout key should not be treated as the adapter layout API.",
);

const existingSizedPresentation = createFakePresentation();
existingSizedPresentation.slideSize = { width: 1280, height: 720 };
const existingSizedKit = createJudgmentKitDeckKit({
  presentation: existingSizedPresentation,
  helpers: createFakeHelpers(),
  presentationOptions: { slideSize: { width: 960, height: 540 } },
});
assert.equal(
  existingSizedKit.layout.contentFrame().width,
  1136,
  "An existing presentation object's slide size should win over stale presentationOptions.",
);
const existingSizedCreated = createJudgmentKitPresentation({
  presentation: existingSizedPresentation,
  helpers: createFakeHelpers(),
  presentationOptions: { slideSize: { width: 960, height: 540 } },
});
assert.equal(existingSizedCreated.kit.layout.contentFrame().width, 1136);

const scopedLayout = createJudgmentKitLayout({ slideSize: { width: 640, height: 360 } });
assert.equal(scopedLayout.fullSlide().width, 640);
assert.equal(scopedLayout.contentFrame().width, 496);
assert.equal(scopedLayout.inset(undefined, 0).width, 640);
assert.equal(scopedLayout.inset(undefined, 0).height, 360);
assert.equal(scopedLayout.inset({ left: 10, top: 20, width: 300, height: 100 }, 5).x, 15);
assert.equal(scopedLayout.inset({ left: 10, top: 20, width: 300, height: 100 }, 5).top, 25);

const aliasPill = topLevelSlideSize.kit.components.statusPill({
  label: "Ready",
  frame: { left: 20, top: 30, width: 180, height: 34 },
});
const aliasPillLabel = childNamed(aliasPill, "judgmentkit-status-pill-label");
assert.equal(composeLeft(aliasPillLabel.props), 32);
assert.equal(composeTop(aliasPillLabel.props), 37);

assert.throws(
  () => createJudgmentKitPresentation(),
  /requires options\.Presentation/,
  "The adapter should fail clearly when artifact-tool Presentation is not injected.",
);

assert.deepEqual(fullSlide(), {
  name: "full-slide",
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  width: 1280,
  height: 720,
  w: 1280,
  h: 720,
});
assert.equal(contentFrame().width, 1136);
assert.equal(gridSpan(contentFrame(), { start: 2, span: 3 }).span, 3);

const helpers = createFakeHelpers();
const objectFormKit = createJudgmentKitDeckKit({
  presentation: created.presentation,
  helpers,
});
assert.equal(
  objectFormKit.components.statusPill({ label: "Ready" }).kind,
  "layers",
  "createJudgmentKitDeckKit should support a single object argument with helpers.",
);
const factories = createJudgmentKitComponentFactories({ helpers });
const titleBlock = factories.titleBlock({
  eyebrow: "Review",
  title: "Daily handoff",
  subtitle: "Cases that need a bounded decision.",
});
assert.equal(titleBlock.kind, "layers");
assert.ok(
  titleBlock.children.some((child) => child.props.style === JUDGMENTKIT_STYLE_NAMES.display),
);
const panel = factories.evidencePanel({
  title: "Evidence",
  body: "Policy match and account history.",
});
assert.equal(panel.children[0].props.fill, "bg2");
const { riskCallout } = factories;
assert.equal(
  riskCallout({ body: "Needs approval boundary." }).kind,
  "layers",
  "Component factories should be safe to destructure.",
);

assert.equal(jk.styles.title, JUDGMENTKIT_STYLE_NAMES.title);
assert.equal(jk.layout.fullSlide().width, 1280);

const validSource = [
  'import { createJudgmentKitPresentation, jk } from "judgmentkit/presentation-theme";',
  "const deck = createJudgmentKitPresentation({ Presentation, helpers });",
  "slide.background.fill = \"bg1\";",
  "shape.text.style = jk.styles.body;",
].join("\n");

assert.deepEqual(lintJudgmentKitPresentationSource(validSource).findings, []);

const dynamicImportSource =
  'const adapter = await import("judgmentkit/presentation-theme");';
assert.deepEqual(lintJudgmentKitPresentationSource(dynamicImportSource).findings, []);

assert.deepEqual(
  lintJudgmentKitPresentationSource(
    '// import { jk } from "judgmentkit/presentation-theme";\nconst deck = {};',
  ).findings.map((entry) => entry.id),
  ["missing_adapter_import"],
  "Commented imports must not satisfy the adapter import requirement.",
);

for (const stringImportSource of [
  'const source = \'import { jk } from "judgmentkit/presentation-theme"\';',
  "const source = `import { jk } from \"judgmentkit/presentation-theme\"`;",
]) {
  assert.deepEqual(
    lintJudgmentKitPresentationSource(stringImportSource).findings.map((entry) => entry.id),
    ["missing_adapter_import"],
    "Import text inside string or template literals must not satisfy the adapter import requirement.",
  );
}

for (const invalidAdapterPath of [
  "./presentation-theme",
  "@scope/presentation-theme",
  "judgmentkit/presentation-theme-extra",
]) {
  assert.deepEqual(
    lintJudgmentKitPresentationSource(`import { jk } from "${invalidAdapterPath}";`).findings.map(
      (entry) => entry.id,
    ),
    ["missing_adapter_import"],
    `${invalidAdapterPath} should not satisfy the public adapter import requirement.`,
  );
}

const invalidSource = [
  'import { Presentation } from "@oai/artifact-tool";',
  "const deck = Presentation.create();",
  'slide.background.fill = "#ffffff";',
  'shape.text.style = { fontFamily: "Inter", color: "rgb(0, 0, 0)" };',
].join("\n");
const invalidLint = lintJudgmentKitPresentationSource(invalidSource);
assert.equal(invalidLint.status, "failed");
assert.deepEqual(
  invalidLint.findings.map((entry) => entry.id),
  [
    "missing_adapter_import",
    "raw_hex_color",
    "raw_css_color_function",
    "direct_font_family",
  ],
);

const themeEvidence = {
  colorScheme: { themeColors: JUDGMENTKIT_PPTX_THEME_COLORS },
  styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
};

const acceptedEvidence = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText([
    "Daily handoff Cases that need a bounded decision.",
    "Evidence checked Accept this deck only if rendered previews preserve margins, hierarchy, and readable evidence copy.",
    "A native chart should sit cleanly inside an adapter media frame.",
    "Native tables should export through the adapter without helper errors.",
  ]),
  slides: [
    {
      title: "Daily handoff",
      body: "Cases that need a bounded decision.",
    },
  ],
});
assert.equal(acceptedEvidence.acceptance_status, "accepted");
assert.deepEqual(acceptedEvidence.review.findings, []);
assert.deepEqual(
  Object.keys(acceptedEvidence).sort(),
  [
    "acceptance_status",
    "adapter",
    "artifact_ref",
    "checks",
    "evidence_sources",
    "legacy_slides",
    "review",
    "source_hash",
    "source_lint",
    "source_ref",
    "status",
    "text_authority",
    "theme",
  ].sort(),
  "Presentation evidence should keep a stable redacted public return shape.",
);
assert.equal("source" in acceptedEvidence, false);
assert.equal("slides" in acceptedEvidence, false);
assert.equal(acceptedEvidence.source_hash.length, 64);
assert.deepEqual(acceptedEvidence.legacy_slides, {
  authority: "non_authoritative",
  count: 1,
  omitted: true,
});

const rejectedMissingSlideText = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
});
assert.equal(rejectedMissingSlideText.acceptance_status, "rejected");
assert.ok(
  rejectedMissingSlideText.review.findings.some((entry) => entry.id === "missing_authoritative_text"),
);

const rejectedBlankSlideText = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText(["   "]),
  slides: [{ title: "   ", body: "" }],
});
assert.equal(rejectedBlankSlideText.acceptance_status, "rejected");
assert.ok(
  rejectedBlankSlideText.review.findings.some((entry) => entry.id === "missing_authoritative_text"),
);

const rejectedLegacySlidesOnly = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  slides: [{ title: "Daily handoff", body: "Cases that need a bounded decision." }],
});
assert.equal(rejectedLegacySlidesOnly.acceptance_status, "rejected");
assert.ok(
  rejectedLegacySlidesOnly.review.findings.some((entry) => entry.id === "missing_authoritative_text"),
);
assert.ok(
  rejectedLegacySlidesOnly.review.warnings.some(
    (entry) => entry.id === "legacy_slides_non_authoritative",
  ),
);

const rejectedDisclosureLeak = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText([
    "ready_for_review JSON schema trace and tool call details.",
  ],
  ),
  slides: [{ title: "Daily handoff", body: "Clean handwritten summary." }],
});
assert.equal(rejectedDisclosureLeak.acceptance_status, "rejected");
const disclosureFinding = rejectedDisclosureLeak.review.findings.find(
  (entry) => entry.id === "slide_disclosure_leak",
);
assert.ok(disclosureFinding);
assert.deepEqual(
  disclosureFinding.evidence.matches.map((entry) => entry.term).sort(),
  ["JSON schema", "ready_for_review", "tool call", "trace"].sort(),
);
assert.equal(JSON.stringify(disclosureFinding.evidence).includes("tool call details"), false);
assert.equal(JSON.stringify(rejectedDisclosureLeak).includes("Clean handwritten summary"), false);

const rejectedAdditionalDisclosureTerms = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText([
    [
      "Prompt template, resource id, and MCP server details.",
      "activity_model and review_status are not audience copy.",
      "Primary user and Main decision belong in review packets, not slides.",
      "A tool-call trace, raw system mechanics, model configuration, data model, database table, API endpoint, and CRUD details should stay diagnostic.",
      "Schema fields should not appear in primary copy.",
    ].join(" "),
  ]),
});
assert.equal(rejectedAdditionalDisclosureTerms.acceptance_status, "rejected");
assert.deepEqual(
  rejectedAdditionalDisclosureTerms.review.findings
    .find((entry) => entry.id === "slide_disclosure_leak")
    .evidence.matches.map((entry) => entry.term)
    .sort(),
  [
    "MCP server",
    "Main decision",
    "Primary user",
    "activity_model",
    "API endpoint",
    "CRUD",
    "data model",
    "database table",
    "field",
    "model configuration",
    "prompt template",
    "resource id",
    "review_status",
    "schema",
    "system mechanics",
    "tool call",
    "trace",
  ].sort(),
);

const acceptedDomainTrace = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText([
    "Cold-chain review Temperature trace stayed within bounds after the field visit. The field service team confirmed handoff.",
    "Cold-chain review Temperature trace stayed within bounds after the field visit.",
    "Cold-chain review Temperature trace stayed within bounds after the field visit.",
    "Cold-chain review Temperature trace stayed within bounds after the field visit.",
  ]),
});
assert.equal(acceptedDomainTrace.acceptance_status, "accepted");
assert.deepEqual(acceptedDomainTrace.review.findings, []);

const acceptedNoTextVisualDeck = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  repo_root: presentationThemeTempRoot,
  artifact_ref: NO_TEXT_PPTX_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "no_user_facing_text_proven",
    method: "structural_inspection_plus_ocr_negative",
    extractor_id: "ocr-negative-smoke",
    config_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    artifact_ref: NO_TEXT_PPTX_ARTIFACT,
    slide_count: 1,
    raster_text_region_count: 0,
    entries: [],
  },
});
assert.equal(acceptedNoTextVisualDeck.acceptance_status, "accepted");
assert.deepEqual(acceptedNoTextVisualDeck.review.findings, []);
assert.equal(acceptedNoTextVisualDeck.text_authority.status, "no_user_facing_text_proven");
assert.equal("extracted_deck_text" in acceptedNoTextVisualDeck, false);

const rejectedTextBearingNoTextProof = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "no_user_facing_text_proven",
    method: "structural_inspection_plus_ocr_negative",
    extractor_id: "ocr-negative-smoke",
    config_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
    slide_count: 4,
    raster_text_region_count: 0,
    entries: [],
  },
});
assert.equal(rejectedTextBearingNoTextProof.acceptance_status, "rejected");
assert.ok(
  rejectedTextBearingNoTextProof.review.findings.some(
    (entry) => entry.id === "no_text_proof_incomplete",
  ),
);

const rejectedIncompleteNoTextProof = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "no_user_facing_text_proven",
    method: "manual_visual_review",
    artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
    slide_count: 1,
    raster_text_region_count: 0,
    entries: [],
  },
});
assert.equal(rejectedIncompleteNoTextProof.acceptance_status, "rejected");
assert.ok(
  rejectedIncompleteNoTextProof.review.findings.some(
    (entry) => entry.id === "no_text_proof_incomplete",
  ),
);

const rejectedUnboundNoTextProof = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "no_user_facing_text_proven",
    method: "structural_inspection_plus_ocr_negative",
    extractor_id: "ocr-negative-smoke",
    config_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    artifact_ref: {
      ...JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
      sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    },
    slide_count: 1,
    raster_text_region_count: 0,
    entries: [],
  },
});
assert.equal(rejectedUnboundNoTextProof.acceptance_status, "rejected");
assert.ok(
  rejectedUnboundNoTextProof.review.findings.some(
    (entry) => entry.id === "no_text_proof_not_artifact_bound",
  ),
);

const rejectedOcrInconclusive = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "ocr_inconclusive",
    method: "artifact_bound_ocr",
    artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
    slide_count: 1,
    entries: [],
  },
});
assert.equal(rejectedOcrInconclusive.acceptance_status, "rejected");
assert.ok(
  rejectedOcrInconclusive.review.findings.some((entry) => entry.id === "ocr_inconclusive"),
);

const rejectedDeclaredSlideOmission = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText(
    ["Only one declared slide against a four-slide PPTX artifact."],
    { slideCount: 1 },
  ),
});
assert.equal(rejectedDeclaredSlideOmission.acceptance_status, "rejected");
assert.ok(
  rejectedDeclaredSlideOmission.review.findings.some(
    (entry) => entry.id === "artifact_slide_count_mismatch",
  ),
);

const rejectedRasterTextWithoutOcr = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    ...extractedDeckText([
      "Daily handoff Cases that need a bounded decision.",
      "Evidence checked Accept this deck only if rendered previews preserve margins, hierarchy, and readable evidence copy.",
      "A native chart should sit cleanly inside an adapter media frame.",
      "Native tables should export through the adapter without helper errors.",
    ]),
    raster_text_region_count: 2,
  },
});
assert.equal(rejectedRasterTextWithoutOcr.acceptance_status, "rejected");
assert.ok(
  rejectedRasterTextWithoutOcr.review.findings.some((entry) => entry.id === "ocr_required"),
);

const acceptedOcrRasterTextEvidence = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "ocr_extracted_text",
    method: "artifact_bound_ocr",
    extractor_id: "pinned-ocr-smoke",
    extractor_version: "1.0.0",
    config_sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
    slide_count: 4,
    raster_text_region_count: 8,
    entries: [
      {
        slide_index: 0,
        slide_number: 1,
        kind: "ocr_text",
        confidence: 0.96,
        text: "Daily handoff Cases that need a bounded decision.",
      },
      {
        slide_index: 1,
        slide_number: 2,
        kind: "ocr_text",
        confidence: 0.94,
        text: "Evidence checked Accept this deck only if rendered previews preserve margins, hierarchy, and readable evidence copy.",
      },
      {
        slide_index: 2,
        slide_number: 3,
        kind: "ocr_text",
        confidence: 0.93,
        text: "A native chart should sit cleanly inside an adapter media frame.",
      },
      {
        slide_index: 3,
        slide_number: 4,
        kind: "ocr_text",
        confidence: 0.91,
        text: "Native tables should export through the adapter without helper errors.",
      },
    ],
  },
});
assert.equal(acceptedOcrRasterTextEvidence.acceptance_status, "accepted");
assert.equal(acceptedOcrRasterTextEvidence.text_authority.status, "ocr_extracted_text");
assert.equal(acceptedOcrRasterTextEvidence.text_authority.min_confidence, 0.91);
assert.equal(JSON.stringify(acceptedOcrRasterTextEvidence).includes("Native tables should export"), false);

const rejectedUnpinnedOcrEvidence = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: {
    status: "ocr_extracted_text",
    method: "artifact_bound_ocr",
    extractor_id: "pinned-ocr-smoke",
    artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
    slide_count: 4,
    raster_text_region_count: 8,
    entries: [
      {
        slide_index: 0,
        slide_number: 1,
        kind: "ocr_text",
        confidence: 0.72,
        text: "Daily handoff Cases that need a bounded decision.",
      },
    ],
  },
});
assert.equal(rejectedUnpinnedOcrEvidence.acceptance_status, "rejected");
assert.ok(
  rejectedUnpinnedOcrEvidence.review.findings.some((entry) => entry.id === "ocr_inconclusive"),
);

const rejectedUnboundExtraction = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText(["Daily handoff Cases that need a bounded decision."], {
    artifactRef: {
      ...JUDGMENTKIT_THEME_FIXTURE_ARTIFACT,
      sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    },
  }),
});
assert.equal(rejectedUnboundExtraction.acceptance_status, "rejected");
assert.ok(
  rejectedUnboundExtraction.review.findings.some(
    (entry) => entry.id === "extraction_not_artifact_bound",
  ),
);

const readmeAsPptxArtifact = {
  kind: "pptx",
  path: "README.md",
  sha256: sha256File("README.md"),
};
const rejectedNonPptxArtifact = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact_ref: readmeAsPptxArtifact,
  theme: themeEvidence,
  extracted_deck_text: extractedDeckText(["This should not be accepted."], {
    artifactRef: readmeAsPptxArtifact,
    slideCount: 1,
  }),
});
assert.equal(rejectedNonPptxArtifact.acceptance_status, "rejected");
assert.ok(
  rejectedNonPptxArtifact.review.findings.some((entry) => entry.id === "invalid_pptx_artifact"),
);

const rejectedMissingSource = createJudgmentKitPresentationAcceptanceEvidence({
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    themeColors: JUDGMENTKIT_PPTX_THEME_COLORS,
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
});
assert.equal(rejectedMissingSource.acceptance_status, "rejected");
assert.ok(
  rejectedMissingSource.review.findings.some((entry) => entry.id === "missing_source"),
);

const rejectedEvidence = createJudgmentKitPresentationAcceptanceEvidence({
  source: invalidSource,
  theme: {
    themeColors: { bg1: "#ffffff" },
    styleIds: [],
  },
});
assert.equal(rejectedEvidence.acceptance_status, "rejected");
assert.ok(
  rejectedEvidence.review.findings.some(
    (entry) => entry.id === "incomplete_theme_colors",
  ),
);
assert.ok(
  rejectedEvidence.review.findings.some((entry) => entry.id === "missing_style_ids"),
);
