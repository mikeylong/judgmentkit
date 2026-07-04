import assert from "node:assert/strict";
import fs from "node:fs";
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
  return {
    layers: (props, children = []) => ({ kind: "layers", props, children }),
    text: (lines, props = {}) => ({ kind: "text", lines, props }),
    shape: (props = {}) => ({ kind: "shape", props }),
    table: (config = {}) => ({ kind: "table", config, props: config }),
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

function childNamed(layer, name) {
  return layer.children.find((child) => child.props?.name === name);
}

function px(value) {
  return Number(String(value).replace(/px$/, ""));
}

function composeLeft(props) {
  return px(props.position?.left ?? props.left);
}

function composeTop(props) {
  return px(props.position?.top ?? props.top);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const packageJson = readJson("package.json");

assert.equal(
  packageJson.exports?.["./presentation-theme"],
  "./src/presentation-theme/index.mjs",
  "package.json should expose the presentation-theme adapter subpath.",
);
assert.ok(
  packageJson.scripts.test.includes("tests/presentation-theme.test.mjs"),
  "npm test should include the presentation theme contract test.",
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

const acceptedEvidence = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    colorScheme: { themeColors: JUDGMENTKIT_PPTX_THEME_COLORS },
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
  slides: [
    {
      title: "Daily handoff",
      body: "Cases that need a bounded decision.",
    },
  ],
});
assert.equal(acceptedEvidence.acceptance_status, "accepted");
assert.deepEqual(acceptedEvidence.review.findings, []);

const rejectedMissingSlideText = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    colorScheme: { themeColors: JUDGMENTKIT_PPTX_THEME_COLORS },
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
});
assert.equal(rejectedMissingSlideText.acceptance_status, "rejected");
assert.ok(
  rejectedMissingSlideText.review.findings.some((entry) => entry.id === "missing_slide_text"),
);

const rejectedBlankSlideText = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    colorScheme: { themeColors: JUDGMENTKIT_PPTX_THEME_COLORS },
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
  slides: [{ title: "   ", body: "" }],
});
assert.equal(rejectedBlankSlideText.acceptance_status, "rejected");
assert.ok(
  rejectedBlankSlideText.review.findings.some((entry) => entry.id === "missing_slide_text"),
);

const rejectedDisclosureLeak = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    themeColors: JUDGMENTKIT_PPTX_THEME_COLORS,
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
  slides: [
    {
      title: "ready_for_review",
      body: "JSON schema trace and tool call details.",
    },
  ],
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

const rejectedAdditionalDisclosureTerms = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    themeColors: JUDGMENTKIT_PPTX_THEME_COLORS,
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
  slides: [
    {
      title: "Implementation notes",
      body: [
        "Prompt template, resource id, and MCP server details.",
        "activity_model and review_status are not audience copy.",
        "Primary user and Main decision belong in review packets, not slides.",
        "A tool-call trace and raw system mechanics should stay diagnostic.",
      ],
    },
  ],
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
    "prompt template",
    "resource id",
    "review_status",
    "system mechanics",
    "tool call",
    "trace",
  ].sort(),
);

const acceptedDomainTrace = createJudgmentKitPresentationAcceptanceEvidence({
  source: validSource,
  artifact: { path: "/tmp/judgmentkit-theme-fixture.pptx", kind: "pptx" },
  theme: {
    themeColors: JUDGMENTKIT_PPTX_THEME_COLORS,
    styleIds: Object.values(JUDGMENTKIT_STYLE_NAMES),
  },
  slides: [
    {
      title: "Cold-chain review",
      body: "Temperature trace stayed within bounds.",
    },
  ],
});
assert.equal(acceptedDomainTrace.acceptance_status, "accepted");
assert.deepEqual(acceptedDomainTrace.review.findings, []);

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
