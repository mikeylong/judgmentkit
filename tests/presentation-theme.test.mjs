import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  JUDGMENTKIT_PPTX_THEME_COLORS,
  JUDGMENTKIT_SLIDE_SIZE,
  JUDGMENTKIT_STYLE_NAMES,
  JUDGMENTKIT_TEXT_STYLE_CONFIGS,
  JUDGMENTKIT_THEME_COLOR_SLOTS,
  applyJudgmentKitPptxTheme,
  assertCompleteThemeColors,
  contentFrame,
  createJudgmentKitDeckKit,
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
    table: (rows = [], props = {}) => ({ kind: "table", rows, props }),
  };
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
assert.equal(presentation.theme.colorScheme.themeColors.lt2, "#d7d3c8");
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

const created = createJudgmentKitPresentation({
  Presentation: {
    create(options) {
      return {
        ...createFakePresentation(),
        createOptions: options,
      };
    },
  },
  helpers: createFakeHelpers(),
});
assert.equal(created.presentation.createOptions.slideSize.width, JUDGMENTKIT_SLIDE_SIZE.width);
assert.equal(created.presentation.theme.colorScheme.themeColors.bg2, "#ffffff");
assert.ok(created.kit.components.titleBlock, "createJudgmentKitPresentation should attach a deck kit.");

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
});
assert.equal(acceptedEvidence.acceptance_status, "accepted");
assert.deepEqual(acceptedEvidence.review.findings, []);

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
