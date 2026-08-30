import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite, renderHomepage } from "../site/build-site.mjs";
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  LEGACY_ALIASES,
  MODEL_UI_MATRIX_DIMENSIONS,
  MODEL_UI_MATRIX_DIMENSIONS_SPOKEN,
  MODEL_UI_INDEX_FILE,
  MODEL_UI_USE_CASES,
} from "../scripts/model-ui-use-cases.mjs";
import { assertValueAppearanceContract } from "../scripts/verify-public-release.mjs";
import { getHostedMcpMetadata } from "../src/mcp-http.mjs";
import {
  createUiImplementationContract,
  listSurfacePresentationProfiles,
} from "../src/index.mjs";

const EXPECTED_TOOL_NAMES = [
  "analyze_implementation_brief",
  "create_activity_model_review",
  "recommend_surface_types",
  "recommend_ui_workflow_profiles",
  "review_activity_model_candidate",
  "review_ui_workflow_candidate",
  "review_cognitive_dimensions_candidate",
  "create_ui_implementation_contract",
  "review_ui_implementation_candidate",
  "create_ui_generation_handoff",
  "create_frontend_generation_context",
  "create_frontend_implementation_skill_context",
  "create_slide_deck",
  "list_icon_catalog",
  "search_icon_catalog",
  "get_icon_svg",
];
const RUNTIME_COMPONENT_IDS = [
  "action_button",
  "action_group",
  "form_field",
  "text_field",
  "text_area",
  "select_field",
  "checkbox_group",
  "radio_group",
  "toggle",
  "tabs",
  "menu",
  "dialog",
  "alert",
  "table",
  "panel",
  "card",
  "status_message",
];
const PUBLIC_DIAGNOSTIC_CANDIDATE_KEYS = [
  "approach_caption",
  "approach_title",
  "artifact_path",
  "column_id",
  "column_label",
  "context_summary",
  "id",
  "model",
  "model_label",
  "release_evidence_status",
  "row_id",
  "row_label",
  "screenshot_path",
  "title",
  "use_case_id",
  "use_case_label",
];
const root = path.resolve(".");
const RAW_COLOR_VALUE_PATTERN =
  /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|hwb\(|(?:ok)?lab\(|(?:ok)?lch\(|color\(|\b(?:white|black)\b/i;
const APPEARANCE_INVARIANT_SITE_TOKENS = [
  "--captured-artifact-bg",
  "--eval-serif",
  "--fixed-light-ink",
  "--hero-art-bg",
  "--hero-art-overlay",
  "--modal-backdrop-bg",
  "--modal-media-stage-bg",
  "--section-rail-top",
  "--site-gutter",
  "--site-navigation-height",
  "--site-page-top",
  "--site-rail-gap",
  "--site-rail-width",
  "--site-reading-wide",
  "--site-reading-width",
  "--site-shell-width",
];

function canonicalizeJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeJsonValue(value[key])]),
    );
  }

  return value;
}

function hashCanonical(value) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalizeJsonValue(value)))
    .digest("hex")}`;
}

function hashText(value) {
  return `sha256:${crypto.createHash("sha256").update(String(value)).digest("hex")}`;
}

function listRelativeFiles(rootDir) {
  const files = [];
  function visit(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      files.push(path.relative(rootDir, entryPath).split(path.sep).join("/"));
    }
  }
  visit(rootDir);
  return files.sort();
}

function cssCustomPropertyValues(css, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`${escapedName}:\\s*([^;]+);`, "g"))].map((match) => match[1].trim());
}

function cssRuleBody(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(match, `expected CSS rule for ${selector}`);
  return match[1];
}

function cssDeclarationValue(ruleBody, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return ruleBody
    .match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, "m"))?.[1]
    ?.trim();
}

function cssRuleBlocks(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].trim(),
    body: match[2],
  }));
}

function cssCustomPropertyMap(ruleBody) {
  return new Map(
    ruleBody
      .split(";")
      .map((declaration) => declaration.trim().match(/^(--[\w-]+)\s*:\s*([\s\S]+)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()]),
  );
}

function hexColorToRgb(value) {
  const match = value.match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `expected hex color, got ${value}`);
  const hex = match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const toLinear = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(hexColorToRgb(foreground));
  const backgroundLuminance = relativeLuminance(hexColorToRgb(background));
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function assertContrastPair(label, foreground, background, minimum = 4.5) {
  const ratio = contrastRatio(foreground, background);
  assert.ok(ratio >= minimum, `${label} contrast ${ratio.toFixed(2)} is below ${minimum}`);
}

function rawConsumerThemeDeclarations(css) {
  const declarationPattern =
    /(?:^|[;{])\s*(background(?:-color|-image)?|color|border(?:-[a-z-]+)?|fill|stroke|outline(?:-[a-z-]+)?)\s*:\s*([^;}]+)/gim;

  return [...css.matchAll(declarationPattern)]
    .filter((match) => RAW_COLOR_VALUE_PATTERN.test(match[2]))
    .map((match) => `${match[1]}: ${match[2].trim()}`);
}

function rawInlineConsumerThemeDeclarations(html) {
  return [...html.matchAll(/\sstyle=(["'])(.*?)\1/gis)]
    .flatMap((match) => match[2].split(";"))
    .map((declaration) => declaration.trim().match(/^([\w-]+)\s*:\s*(.+)$/s))
    .filter(
      (match) =>
        match &&
        !match[1].startsWith("--") &&
        RAW_COLOR_VALUE_PATTERN.test(match[2]),
    )
    .map((match) => `${match[1]}: ${match[2].trim()}`);
}

function inlineCustomPropertyNames(html) {
  return [...html.matchAll(/\sstyle=(["'])(.*?)\1/gis)]
    .flatMap((match) => match[2].split(";"))
    .map((declaration) => declaration.trim().match(/^(--[\w-]+)\s*:/)?.[1])
    .filter(Boolean);
}

function rawColorCustomPropertyDeclarations(ruleBlocks, allowedSelectors) {
  return ruleBlocks.flatMap(({ selector, body }) => {
    if (allowedSelectors.has(selector)) {
      return [];
    }

    return body
      .split(";")
      .map((declaration) => declaration.trim().match(/^(--[\w-]+)\s*:\s*([\s\S]+)$/))
      .filter((match) => match && RAW_COLOR_VALUE_PATTERN.test(match[2]))
      .map((match) => `${selector} { ${match[1]}: ${match[2].trim()} }`);
  });
}

const OLD_FRAMING = [
  "resource bundle",
  "workflow bundle",
  "MCP-first product",
  "get_workflow_bundle",
  "list_resources",
  "resolve_related",
  "judgmentkit2",
  "JudgmentKit 2",
  "judgmentkit-2",
];

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-"));
const result = await buildSite(tempDir);
const packageJson = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

assert.deepEqual(result.routes, [
  "/",
  "/value/",
  "/docs/",
  "/design-system/",
  "/design-system/tokens/",
  "/design-system/fonts/",
  "/design-system/icons/",
  "/design-system/components/",
  "/design-system/patterns/",
  "/design-system/accessibility/",
  "/examples/",
  "/evals/",
  "/evals/judgmentkit-mcp/",
  "/evals/site-rebuild-log/",
  "/install",
  "/mcp",
]);

for (const route of result.routes.filter((candidate) => candidate.endsWith("/"))) {
  const relativePath = route === "/" ? "index.html" : `${route.slice(1)}index.html`;
  const html = fs.readFileSync(path.join(tempDir, relativePath), "utf8");
  assert.deepEqual(
    rawInlineConsumerThemeDeclarations(html),
    [],
    `${route} inline consumer styles must use theme-aware custom properties`,
  );
  assert.ok(
    html.includes('<footer class="site-footer">'),
    `${route} should include the shared site footer`,
  );
  assert.ok(
    html.includes(
      '<span class="site-footer-brand">JudgmentKit</span>',
    ),
    `${route} footer should retain the JudgmentKit identity`,
  );
  assert.ok(
    html.includes(
      `<a class="site-footer-release" href="https://github.com/mikeylong/judgmentkit/releases/tag/v${packageJson.version}" aria-label="Release v${packageJson.version} on GitHub">`,
    ),
    `${route} footer should link the canonical package version to GitHub Releases`,
  );
  assert.ok(html.includes(`<span>Release v${packageJson.version}</span>`));
  assert.ok(html.includes('<span aria-hidden="true">↗</span>'));
}

function assertAnalyticsBootstrap(html, label) {
  assert.ok(html.includes("window.va = window.va || function"), `${label} should initialize Vercel Analytics queue`);
  assert.ok(html.includes('src="/_vercel/insights/script.js"'), `${label} should load Vercel Analytics script`);
  assert.ok(html.includes('data-sdkn="@vercel/analytics"'), `${label} should name the analytics SDK`);
  assert.ok(html.includes('data-sdkv="2.0.1"'), `${label} should include the analytics SDK version`);
}

const homepage = fs.readFileSync(path.join(tempDir, "index.html"), "utf8");
const llms = fs.readFileSync(path.join(tempDir, "llms.txt"), "utf8");
const siteCss = fs.readFileSync(path.join(tempDir, "assets", "site.css"), "utf8");
const componentSpecimenCss = fs.readFileSync(
  path.join(tempDir, "assets", "component-specimens.css"),
  "utf8",
);
const systemMapFlowJs = fs.readFileSync(path.join(tempDir, "assets", "system-map-flow.js"), "utf8");
const systemMapFlowCss = fs.readFileSync(path.join(tempDir, "assets", "system-map-flow.css"), "utf8");
const systemMapFlowAuthoredCss = fs.readFileSync(
  new URL("../site/system-map-flow.css", import.meta.url),
  "utf8",
);
const systemMapFlowSource = fs.readFileSync(new URL("../site/system-map-flow.jsx", import.meta.url), "utf8");
const platformNavMarkup =
  homepage.match(/<nav class="surfaces-navigation" aria-label="Surfaces platform" data-surfaces-navigation>[\s\S]*?<\/nav>/)
    ?.[0] ?? "";
const homepageMain = homepage.match(/<main>([\s\S]*)<\/main>/)?.[1] ?? "";
const homepageHeroCopy = homepage.match(
  /<div class="homepage-hero-copy">([\s\S]*?)<div class="hero-actions"/,
)?.[1] ?? "";
const homepageFilmPreview = renderHomepage({ homepageFilmEnabled: true });
const homepageFilmPreviewMain = homepageFilmPreview.match(/<main>([\s\S]*)<\/main>/)?.[1] ?? "";
assert.ok(systemMapFlowJs.includes("MCP boundary"));
assert.ok(systemMapFlowJs.includes("JudgmentKit React Flow system design map"));
assert.ok(systemMapFlowJs.includes("Source brief + product context"));
assert.ok(systemMapFlowJs.includes("Renderer choice after reviewed handoff"));
assert.ok(systemMapFlowJs.includes("External adapter"));
assert.ok(systemMapFlowJs.includes("design-system provenance is required"));
assert.equal(systemMapFlowJs.includes("Material UI adapter"), false);
assert.ok(systemMapFlowJs.includes("updated context returns to source/activity review"));
assert.equal(systemMapFlowJs.includes("optional styling path"), false);
assert.ok(systemMapFlowCss.includes(".rf-map-node"));
assert.ok(systemMapFlowCss.includes("overflow-wrap:anywhere"));
assert.ok(systemMapFlowCss.includes(".react-flow__controls"));
assert.ok(systemMapFlowCss.includes("--rf-map-bg: #151a18;"));
assert.ok(systemMapFlowCss.includes("background:var(--rf-map-bg)"));
assert.ok(systemMapFlowCss.includes("background:var(--rf-map-node-kernel-bg)"));
assert.ok(systemMapFlowCss.includes("color:var(--rf-map-ink)"));
assert.ok(systemMapFlowCss.includes("color:var(--rf-map-accent)"));
assert.deepEqual(
  rawConsumerThemeDeclarations(systemMapFlowAuthoredCss),
  [],
  "authored React Flow map consumers must use appearance-aware custom properties",
);
const systemMapRuleBlocks = cssRuleBlocks(systemMapFlowAuthoredCss);
assert.equal(
  systemMapRuleBlocks.filter(({ selector }) => selector === ".system-map-flow-root").length,
  2,
  "React Flow map CSS should define exactly one light and one dark token root",
);
assert.deepEqual(
  rawColorCustomPropertyDeclarations(
    systemMapRuleBlocks,
    new Set([".system-map-flow-root"]),
  ),
  [],
  "React Flow raw color tokens must stay in the governed light and dark roots",
);
const lightSystemMapTokens = cssCustomPropertyMap(
  cssRuleBody(systemMapFlowAuthoredCss, ".system-map-flow-root"),
);
const darkSystemMapRoot = systemMapFlowAuthoredCss.match(
  /@media \(prefers-color-scheme: dark\) \{\s*\.system-map-flow-root\s*\{([^}]*)\}/,
)?.[1];
assert.ok(darkSystemMapRoot, "React Flow map CSS must expose a dark appearance root");
const darkSystemMapTokens = cssCustomPropertyMap(darkSystemMapRoot);
assert.deepEqual(
  [...darkSystemMapTokens.keys()].sort(),
  [...lightSystemMapTokens.keys()].sort(),
  "React Flow map light and dark token sets must stay in parity",
);
assert.ok(systemMapFlowSource.includes('position="bottom-left"'));
assert.ok(systemMapFlowSource.includes('Background color="var(--rf-map-grid)"'));
assert.ok(systemMapFlowSource.includes('stroke: "var(--rf-map-edge-output)"'));
assert.equal(systemMapFlowSource.includes('position="top-left"'), false);
assert.match(
  systemMapFlowSource,
  /id: "external-design-system-adapter"[\s\S]*?style: \{ width: 204, height: 112 \}/,
);
assert.match(
  systemMapFlowSource,
  /id: "judgmentkit-default-source"[\s\S]*?style: \{ width: 204, height: 112 \}/,
);
assert.match(
  systemMapFlowSource,
  /id: "zone-generation"[\s\S]*?style: \{ width: 500, height: 640 \}/,
);
assert.equal(systemMapFlowSource.includes('id: "with-design-system"'), false);
assert.equal(systemMapFlowSource.includes('id: "without-design-system"'), false);
assert.equal(systemMapFlowSource.includes("without design system"), false);
assert.ok(systemMapFlowSource.includes("active"));
assert.ok(systemMapFlowSource.includes("design-system provenance is required"));
assert.ok(
  platformNavMarkup.includes(
    '<a class="surfaces-navigation-identifier" href="/" aria-current="page">JudgmentKit</a>',
  ),
);
assert.ok(platformNavMarkup.includes('<div class="surfaces-navigation-sections" aria-label="Primary">'));
assert.ok(platformNavMarkup.includes('href="/value/"'));
assert.ok(platformNavMarkup.includes('href="/docs/"'));
assert.ok(platformNavMarkup.includes('href="/design-system/"'));
assert.ok(platformNavMarkup.includes('href="/examples/"'));
assert.ok(platformNavMarkup.includes('href="/evals/"'));
assert.ok(platformNavMarkup.includes('href="/mcp"'));
assert.ok(platformNavMarkup.includes('class="surfaces-primary-menu-button"'));
assert.ok(platformNavMarkup.includes('aria-label="Open primary navigation"'));
assert.ok(platformNavMarkup.includes('aria-controls="surfaces-primary-menu"'));
assert.ok(platformNavMarkup.includes('data-surfaces-primary-menu-button'));
assert.ok(platformNavMarkup.includes('data-surfaces-primary-menu-backdrop'));
assert.ok(platformNavMarkup.includes('id="surfaces-primary-menu" hidden data-surfaces-primary-menu-list'));
assert.ok(platformNavMarkup.includes('data-surfaces-primary-menu-list'));
for (const [href, label] of [
  ["/value/", "Value"],
  ["/docs/", "Docs"],
  ["/design-system/", "Design System"],
  ["/examples/", "Examples"],
  ["/evals/", "Evals"],
  ["/mcp", "MCP"],
]) {
  assert.ok(platformNavMarkup.includes(`<a href="${href}">${label}</a>`));
}
assert.ok(platformNavMarkup.includes('class="surfaces-system-switch-button"'));
assert.ok(platformNavMarkup.includes('aria-haspopup="true"'));
assert.equal(platformNavMarkup.includes('role="menu"'), false);
assert.equal(platformNavMarkup.includes('role="menuitem"'), false);
assert.equal(platformNavMarkup.includes('aria-haspopup="menu"'), false);
assert.ok(platformNavMarkup.includes('data-surfaces-system-menu-button'));
assert.ok(platformNavMarkup.includes("<span>judgmentkit.ai</span>"));
assert.ok(platformNavMarkup.includes('href="https://surfaces.systems/"'));
assert.ok(platformNavMarkup.includes('href="https://surfaceops.ai/"'));
assert.ok(platformNavMarkup.includes('href="https://interfacectl.com/"'));
assert.ok(platformNavMarkup.includes('href="https://surfaces.dev/"'));
assert.ok(
  platformNavMarkup.includes('href="https://judgmentkit.ai/" aria-current="page"'),
);
assert.ok(platformNavMarkup.includes("Embedded MCP judgment for live design decisions"));
assert.equal(platformNavMarkup.includes("target="), false);
assert.equal(platformNavMarkup.includes("rel="), false);
assert.equal(platformNavMarkup.includes("pop-out"), false);
const platformNavCss = siteCss.match(/\.surfaces-navigation \{[^}]*\}/)?.[0] ?? "";
assert.ok(siteCss.includes("body {\n  margin: 0;\n  padding-top: 56px;"));
assert.ok(
  siteCss.includes(
    ".surfaces-navigation {\n  height: 56px;\n  background-color: var(--nav-bg);\n  border-bottom: 1px solid var(--nav-border);\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  width: 100%;",
  ),
);
assert.ok(siteCss.includes("color-scheme: light dark;"));
assert.ok(siteCss.includes("@media (prefers-color-scheme: dark)"));
assert.ok(siteCss.includes("--nav-bg: rgba(16, 19, 18, 0.96);"));
assert.ok(siteCss.includes("--focus-ring: rgba(125, 182, 199, 0.38);"));
assert.ok(siteCss.includes("--step-marker-bg: #a9d7e4;"));
assert.ok(siteCss.includes("--step-marker-ink: #101312;"));
assert.ok(siteCss.includes("--menu-item-bg: #181d1b;"));
assert.ok(siteCss.includes("--report-toc-bg: rgba(24, 29, 27, 0.88);"));
assert.ok(siteCss.includes("--system-map-bg: #151a18;"));
assert.ok(siteCss.includes("background: var(--step-marker-bg);"));
assert.ok(siteCss.includes("color: var(--step-marker-ink);"));
assert.ok(siteCss.includes("background-color: var(--menu-item-bg);"));
assert.ok(siteCss.includes("background: var(--soft-surface);"));
assert.ok(siteCss.includes("background: var(--report-toc-bg);"));
assert.ok(siteCss.includes("background: var(--system-map-bg);"));
assert.deepEqual(
  rawConsumerThemeDeclarations(siteCss),
  [],
  "site CSS consumers must use theme-aware custom properties or color-mix instead of raw colors",
);
const siteCssRuleBlocks = cssRuleBlocks(siteCss);
assert.equal(
  siteCssRuleBlocks.filter(({ selector }) => selector === ":root").length,
  4,
  "site CSS should define only the governed site and design-system light/dark roots",
);
assert.deepEqual(
  rawColorCustomPropertyDeclarations(siteCssRuleBlocks, new Set([":root"])),
  [],
  "raw color custom properties must stay in governed appearance roots",
);
const lightAppearanceRoot = siteCss.match(/^:root\s*\{([^}]*)\}/m)?.[1];
const darkAppearanceRoot = siteCss.match(
  /@media \(prefers-color-scheme: dark\) \{\s*:root\s*\{([^}]*)\}/,
)?.[1];
assert.ok(lightAppearanceRoot, "site CSS must expose a light appearance root");
assert.ok(darkAppearanceRoot, "site CSS must expose a dark appearance root");
const lightAppearanceTokens = cssCustomPropertyMap(lightAppearanceRoot);
const darkAppearanceTokens = cssCustomPropertyMap(darkAppearanceRoot);
const lightAppearanceTokenNames = [...lightAppearanceRoot.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(
  (match) => match[1],
);
const darkAppearanceTokenNames = [...darkAppearanceRoot.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(
  (match) => match[1],
);
assert.equal(
  new Set(lightAppearanceTokenNames).size,
  lightAppearanceTokenNames.length,
  "light appearance root must not declare duplicate token names",
);
assert.equal(
  new Set(darkAppearanceTokenNames).size,
  darkAppearanceTokenNames.length,
  "dark appearance root must not declare duplicate token names",
);
const unpairedLightTokens = [...lightAppearanceTokens.keys()]
  .filter((name) => !darkAppearanceTokens.has(name))
  .sort();
assert.deepEqual(
  unpairedLightTokens,
  [...APPEARANCE_INVARIANT_SITE_TOKENS].sort(),
  "every site token needs a dark counterpart or an explicit appearance-invariant classification",
);
assert.deepEqual(
  [...darkAppearanceTokens.keys()].filter((name) => !lightAppearanceTokens.has(name)),
  [],
  "dark appearance tokens must have a light/default counterpart",
);
assert.ok(siteCss.includes(".doc-section[data-system-map-flow-section] {\n  overflow-x: hidden;"));
assert.ok(siteCss.includes(".system-map-canvas {\n  aspect-ratio: 1760 / 1040;\n  position: relative;\n  max-width: 100%;"));
assert.ok(siteCss.includes("contain: layout paint;\n  overflow: hidden;"));
assert.ok(siteCss.includes(".system-map-flow-root .react-flow,\n.system-map-flow-root .react-flow__renderer,\n.system-map-flow-root .react-flow__pane"));
assert.ok(siteCss.includes("box-shadow: 0 0 0 2px var(--focus-ring);"));
const stepMarkerBackgrounds = cssCustomPropertyValues(siteCss, "--step-marker-bg");
const stepMarkerTextColors = cssCustomPropertyValues(siteCss, "--step-marker-ink");
const heroPrimaryBackgrounds = cssCustomPropertyValues(siteCss, "--accent-strong");
const heroPrimaryTextColors = cssCustomPropertyValues(siteCss, "--bg");
const siteBackgrounds = cssCustomPropertyValues(siteCss, "--bg");
const sitePanelBackgrounds = cssCustomPropertyValues(siteCss, "--panel");
const siteTextColors = cssCustomPropertyValues(siteCss, "--ink");
const siteMutedColors = cssCustomPropertyValues(siteCss, "--muted");
const softSurfaceBackgrounds = cssCustomPropertyValues(siteCss, "--soft-surface");
const accentBackgrounds = cssCustomPropertyValues(siteCss, "--accent");
const accentTextColors = cssCustomPropertyValues(siteCss, "--accent-ink");
const designSystemFocusBackgrounds = cssCustomPropertyValues(siteCss, "--jk-color-focus");
const warningColors = cssCustomPropertyValues(siteCss, "--warn");
assert.deepEqual(stepMarkerBackgrounds, ["#245f73", "#a9d7e4"]);
assert.deepEqual(stepMarkerTextColors, ["#ffffff", "#101312"]);
assert.deepEqual(heroPrimaryBackgrounds, ["#133f4e", "#a9d7e4"]);
assert.deepEqual(heroPrimaryTextColors, ["#f8f7f2", "#101312"]);
assert.deepEqual(softSurfaceBackgrounds, ["#fbfaf6", "#151a18"]);
assert.deepEqual(accentTextColors, ["#ffffff", "#101312"]);
assert.deepEqual(designSystemFocusBackgrounds, ["#245f73", "#7db6c7"]);
assertContrastPair("light design-system step marker", stepMarkerTextColors[0], stepMarkerBackgrounds[0]);
assertContrastPair("dark design-system step marker", stepMarkerTextColors[1], stepMarkerBackgrounds[1]);
assertContrastPair("light homepage hero primary action", heroPrimaryTextColors[0], heroPrimaryBackgrounds[0]);
assertContrastPair("dark homepage hero primary action", heroPrimaryTextColors[1], heroPrimaryBackgrounds[1]);
for (const [index, mode] of ["light", "dark"].entries()) {
  assertContrastPair(`${mode} text on soft surface`, siteTextColors[index], softSurfaceBackgrounds[index]);
  assertContrastPair(`${mode} muted text on soft surface`, siteMutedColors[index], softSurfaceBackgrounds[index]);
  assertContrastPair(`${mode} text on accent`, accentTextColors[index], accentBackgrounds[index]);
  assertContrastPair(
    `${mode} specimen primary control text`,
    accentTextColors[index],
    designSystemFocusBackgrounds[index],
  );
  assertContrastPair(
    `${mode} guided chart against panel`,
    accentBackgrounds[index],
    sitePanelBackgrounds[index],
    3,
  );
  assertContrastPair(
    `${mode} baseline chart against panel`,
    warningColors[index],
    sitePanelBackgrounds[index],
    3,
  );
}
assert.equal(platformNavCss.includes("position: sticky;"), false);
assert.ok(siteCss.includes(".surfaces-primary-menu"));
assert.ok(siteCss.includes(".surfaces-primary-menu-button"));
assert.ok(siteCss.includes(".surfaces-primary-menu-list"));
assert.ok(siteCss.includes("@media (max-width: 1120px) and (min-width: 768px)"));
assert.ok(siteCss.includes("@media (max-width: 767px)"));
assert.ok(siteCss.includes(".surfaces-navigation-sections {\n    display: none;"));
assert.ok(siteCss.includes(".surfaces-primary-menu {\n    display: block;"));
assert.ok(siteCss.includes("@media (max-width: 359px)"));
assert.ok(siteCss.includes("--site-gutter: clamp(18px, 4vw, 56px);"));
assert.ok(siteCss.includes("--site-shell-width: 1220px;"));
assert.ok(siteCss.includes("--site-reading-width: 820px;"));
assert.ok(siteCss.includes("--site-reading-wide: 980px;"));
assert.ok(siteCss.includes("--site-rail-width: 180px;"));
assert.ok(siteCss.includes("--site-rail-gap: 28px;"));
assert.ok(siteCss.includes("--site-page-top: clamp(36px, 5vw, 62px);"));
assert.ok(siteCss.includes("--site-navigation-height: 56px;"));
assert.ok(siteCss.includes("--section-rail-top: calc(var(--site-navigation-height) + var(--site-page-top));"));
assert.ok(siteCss.includes(".site-shell {\n  width: 100%;\n  max-width: var(--site-shell-width);"));
assert.ok(siteCss.includes(".site-footer {\n  padding: 18px var(--site-gutter) 20px;"));
assert.match(
  siteCss,
  /\.site-footer-brand \{[^}]*font-family: Inter, sans-serif;[^}]*font-weight: 600;/s,
  "the footer brand should use the same restrained sans-serif weight as the site navigation",
);
assert.match(
  siteCss,
  /\.site-footer-release \{[^}]*color: var\(--accent-strong\);[^}]*font-family: Inter, sans-serif;[^}]*font-weight: 400;[^}]*text-decoration: none;/s,
  "the peripheral release link should use the site link color and regular sans-serif text without an inline-link underline at rest",
);
assert.doesNotMatch(
  siteCss,
  /\.site-footer-release \{[^}]*JetBrains Mono/s,
  "the release link should not introduce a technical monospace treatment",
);
assert.match(
  siteCss,
  /\.site-footer-release:hover,\n\.site-footer-release:focus-visible \{[^}]*text-decoration: underline;[^}]*text-underline-offset: 3px;/s,
  "the release link should restore its underline for pointer and keyboard interaction",
);
assert.ok(siteCss.includes(".site-footer-release:focus-visible"));
assert.ok(siteCss.includes(".site-page-header {\n  max-width: var(--site-reading-width);"));
assert.ok(siteCss.includes(".site-page-header-wide {\n  max-width: var(--site-reading-wide);"));
assert.ok(siteCss.includes(".section-rail-nav {\n  position: fixed;\n  top: var(--section-rail-top);"));
assert.equal(siteCss.includes(".section-rail-nav {\n  position: fixed;\n  top: 88px;"), false);
assert.ok(siteCss.includes(".doc-content {\n  grid-column: 2;"));
assert.ok(siteCss.includes(".section-rail-menu {\n  display: none;"));
assert.ok(siteCss.includes(".section-rail-menu-button"));
assert.ok(siteCss.includes(".section-rail-menu-list"));
assert.ok(siteCss.includes(".section-rail-menu-list a[aria-current]"));
assert.ok(siteCss.includes(".section-rail-nav a[aria-current]"));
assert.ok(siteCss.includes("--section-page-gutter: var(--site-gutter);"));
assert.ok(siteCss.includes(".docs-page {\n  padding-top: var(--site-page-top);\n  overflow-x: hidden;"));
assert.ok(siteCss.includes("grid-template-columns: var(--section-rail-width) minmax(0, 1fr);"));
assert.ok(siteCss.includes("max-width: var(--section-rail-container-width);"));
assert.ok(siteCss.includes("left: calc(var(--section-page-gutter) + max(0px, calc((100vw - var(--section-page-gutter) - var(--section-page-gutter) - var(--section-rail-container-width)) / 2)));"));
assert.ok(siteCss.includes("width: min(var(--section-rail-width), calc(100vw - var(--section-page-gutter) - var(--section-page-gutter)));"));
assert.ok(siteCss.includes("border-radius: 4px;"));
assert.ok(siteCss.includes("--section-rail-container-width: var(--site-shell-width);"));
assert.ok(siteCss.includes("--section-rail-width: var(--site-rail-width);"));
assert.ok(siteCss.includes("gap: var(--site-rail-gap);"));
assert.ok(siteCss.includes("max-height: calc(100vh - var(--section-rail-top) - 24px);"));
assert.ok(siteCss.includes(".design-system-content {\n  grid-column: 2;"));
assert.ok(siteCss.includes("@media (max-width: 1120px) {\n  .doc-layout,\n  .design-system-layout {\n    display: block;"));
assert.ok(siteCss.includes(".section-rail-menu {\n    display: block;"));
assert.ok(siteCss.includes(".section-rail-nav {\n    display: none;"));
assert.ok(siteCss.includes(".doc-content,\n  .design-system-content {\n    grid-column: auto;"));
assert.ok(siteCss.includes(".design-system-content {\n    grid-column: auto;"));
assert.ok(homepage.includes("[data-section-rail-menu]"));
assert.ok(homepage.includes('class="site-shell homepage-section-shell"'));
assert.ok(homepage.includes("[data-surfaces-primary-menu-button]"));
assert.ok(homepage.includes("[data-surfaces-system-menu-button]"));
assert.ok(homepageHeroCopy.includes("Stop AI from building the wrong interface."));
assert.ok(homepageHeroCopy.includes("The judgment layer for AI-generated UI"));
assert.ok(
  homepageHeroCopy.includes(
    "A design system tells an agent how interface elements should look and behave.",
  ),
);
assert.ok(
  homepageHeroCopy.includes(
    "JudgmentKit tells it which interface the user’s work requires, what should stay hidden, and what must be repaired.",
  ),
);
assert.ok(homepageHeroCopy.includes("Use JudgmentKit’s design system—or bring your own."));
assert.equal(homepageHeroCopy.includes("Product judgment for AI-generated UI"), false);
assert.equal(
  homepageHeroCopy.includes(
    "JudgmentKit checks the user's work before generation and tells the agent what to fix when the concept is wrong.",
  ),
  false,
);
assert.equal(homepage.includes("Judgment before generation."), false);
assert.equal(homepage.includes("Human-centered judgment for AI agents"), false);
assert.equal(homepage.includes("Activity-first judgment for AI agents"), false);
assert.equal(homepage.includes("JudgmentKit catches implementation-shaped UI before it ships"), false);
assert.equal((homepageMain.match(/<h1\b/g) ?? []).length, 1);
assert.ok(homepage.includes('href="/value/"'));
assert.ok(homepage.includes('href="/evals/"'));
assert.ok(homepage.includes('class="site-shell homepage-hero-shell"'));
assert.ok(homepage.includes('class="homepage-hero-visual"'));
assert.ok(
  homepage.includes(
    '<img src="/assets/judgment-lens-hero.webp" width="1122" height="1402" alt="Rough stone fragments pass through a teal glass lens and emerge as an ordered path." loading="eager" fetchpriority="high" decoding="async">',
  ),
);
assert.equal(
  homepage.includes(
    "<figcaption>Raw structure, judged against the work, becomes purposeful product direction.</figcaption>",
  ),
  false,
);
assert.equal(homepage.includes('src="/assets/judgment-lens-hero.webp" loading="lazy"'), false);
assert.equal(
  (homepage.match(/href="\/releases\/visual-composition\/"/g) ?? []).length,
  0,
  "homepage should not link to a separate visual-composition release page",
);
assert.equal(
  homepage.includes('class="release-notice"'),
  false,
  "homepage should not restore the retired release banner",
);
assert.equal(
  (homepageMain.match(/<video\b/gi) ?? []).length,
  0,
  "the public homepage should not render the retired film",
);
assert.doesNotMatch(
  homepageMain,
  /homepage-film|data-homepage-film|judgmentkit-select-field-agent-demo/,
  "the public homepage should not ship dormant film markup or behavior",
);
assert.match(
  homepageMain,
  /^\s*<section class="hero homepage-hero">/,
  "the public homepage story should begin with the hero",
);
const homepageCategory = homepageMain.match(
  /<section class="section homepage-category"[^>]*>([\s\S]*?)<\/section>/,
)?.[0] ?? "";
assert.ok(homepageCategory, "homepage should explain JudgmentKit's category directly after the hero");
assert.ok(homepageCategory.includes("A design system can make the wrong interface consistent."));
assert.ok(homepageCategory.includes("JudgmentKit prevents that mistake before the components are composed."));
assert.ok(homepageCategory.includes("Traditional design system"));
assert.ok(homepageCategory.includes("Defines how interface elements look, behave, and remain consistent."));
assert.ok(homepageCategory.includes("Defines what the interface must help someone do, decide, and understand."));
assert.ok(homepageCategory.includes("JudgmentKit uses the design system you choose and tells the agent what to repair."));
const homepageHeroIndex = homepageMain.search(/class="[^"]*\bhomepage-hero\b[^"]*"/);
const homepageCategoryIndex = homepageMain.search(/class="[^"]*\bhomepage-category\b[^"]*"/);
const homepagePreviewIndex = homepageMain.search(/class="[^"]*\bhomepage-preview\b[^"]*"/);
assert.ok(
  homepageHeroIndex >= 0 &&
    homepageCategoryIndex > homepageHeroIndex &&
    homepagePreviewIndex > homepageCategoryIndex,
  "the category explanation should be the first substantive section after the hero",
);

const homepageFilmFrameMatch = homepageFilmPreview.match(
  /<(div|section)\b[^>]*class="[^"]*\bhomepage-film-frame\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/,
);
const homepageFilmFrame = homepageFilmFrameMatch?.[0];
assert.ok(homepageFilmFrame, "homepage should expose the film in one stable frame");
const homepageFilmFrameOpenTag = homepageFilmFrame?.match(/^<(?:div|section)\b[^>]*>/i)?.[0] ?? "";
const homepageFilmMedia = homepageFilmFrame.match(
  /<video\b[^>]*class="[^"]*\bhomepage-film-source-media\b[^"]*"[^>]*>[\s\S]*?<\/video>/,
)?.[0];
const homepageFilmMediaOpenTag = homepageFilmMedia?.match(/<video\b[^>]*>/)?.[0] ?? "";
assert.ok(homepageFilmMedia, "homepage should expose one native video as the complete film");
assert.match(homepageFilmMediaOpenTag, /id="homepage-film-media"/);
assert.match(homepageFilmMediaOpenTag, /data-homepage-film-media(?:\s|=|>)/);
assert.equal(
  (homepageFilmPreviewMain.match(/<video\b/g) ?? []).length,
  1,
  "homepage should contain exactly one media clock",
);
assert.equal(
  (homepageFilmPreviewMain.match(/<iframe\b/g) ?? []).length,
  0,
  "homepage must not hand playback to a live iframe",
);
assert.equal((homepageFilmPreviewMain.match(/<canvas\b/g) ?? []).length, 0);
assert.doesNotMatch(
  homepageFilmFrame,
  /data-homepage-film-(?:stage|live|live-scale|fallback)|data-film-live-(?:src|status)|visual-composition-runtime-demo\.html/,
  "the homepage film must not reference the retired live renderer",
);
assert.doesNotMatch(
  homepageFilmFrameOpenTag,
  /data-film-(?:autoplay|audio)-status=/,
  "the single native video should not expose split-clock recovery state",
);
assert.doesNotMatch(
  homepageFilmPreviewMain,
  /homepage-film-(?:stage|live|live-scale)|homepage-film-source-media--soundtrack/,
  "the single-video renderer must not retain hidden live or soundtrack surfaces",
);
assert.match(
  homepageFilmFrameOpenTag,
  /data-film-source-light="\/assets\/releases\/judgmentkit-select-field-agent-demo\.mp4"/,
);
assert.match(
  homepageFilmFrameOpenTag,
  /data-film-source-dark="\/assets\/releases\/judgmentkit-select-field-agent-demo-dark\.mp4"/,
);
assert.match(
  homepageFilmFrameOpenTag,
  /data-film-poster-light="\/assets\/releases\/judgmentkit-select-field-agent-demo-poster\.png"/,
);
assert.match(
  homepageFilmFrameOpenTag,
  /data-film-poster-dark="\/assets\/releases\/judgmentkit-select-field-agent-demo-poster-dark\.png"/,
);
assert.match(
  homepageFilmMediaOpenTag,
  /(?:\s|^)controls(?:\s|>)/,
  "native controls must remain available before progressive enhancement",
);
assert.match(homepageFilmMediaOpenTag, /(?:\s|^)loop(?:\s|>)/);
assert.match(homepageFilmMediaOpenTag, /(?:\s|^)playsinline(?:\s|>)/);
assert.match(homepageFilmMediaOpenTag, /preload="auto"/);
assert.match(
  homepageFilmMediaOpenTag,
  /(?:\s|^)autoplay(?:\s|>)/,
  "the film should request browser-safe autoplay",
);
assert.match(
  homepageFilmMediaOpenTag,
  /(?:\s|^)muted(?:\s|>)/,
  "autoplay must remain muted until the visitor chooses Unmute",
);
assert.match(
  homepageFilmMediaOpenTag,
  /aria-label="JudgmentKit UI generation, diagnosis, and measured repair"/,
);
assert.match(homepageFilmMediaOpenTag, /aria-describedby="homepage-film-description"/);
const homepageFilmDescription = homepageFilmFrame.match(
  /<span\b[^>]*id="homepage-film-description"[^>]*>[\s\S]*?<\/span>/,
)?.[0] ?? "";
assert.ok(homepageFilmDescription, "homepage film should retain a nonvisual description");
assert.match(homepageFilmDescription, /class="sr-only"/);
assert.match(homepageFilmDescription, /desktop and mobile sizes/);
assert.match(homepageFilmDescription, /misaligned centers and an undersized indicator slot/);
assert.match(homepageFilmDescription, /resubmitted candidate passes/);
const screenReaderOnlyCss = cssRuleBody(siteCss, ".sr-only");
assert.match(screenReaderOnlyCss, /position:\s*absolute;/);
assert.match(screenReaderOnlyCss, /width:\s*1px;/);
assert.match(screenReaderOnlyCss, /height:\s*1px;/);
assert.match(screenReaderOnlyCss, /overflow:\s*hidden;/);
assert.match(screenReaderOnlyCss, /clip-path:\s*inset\(50%\);/);
assert.match(screenReaderOnlyCss, /white-space:\s*nowrap;/);
assert.doesNotMatch(screenReaderOnlyCss, /display:\s*none|visibility:\s*hidden/);
assert.match(
  homepageFilmMediaOpenTag,
  /poster="\/assets\/releases\/judgmentkit-select-field-agent-demo-poster\.png"/,
);
const homepageFilmSource = homepageFilmMedia.match(/<source\b[^>]*>/)?.[0] ?? "";
assert.match(
  homepageFilmSource,
  /src="\/assets\/releases\/judgmentkit-select-field-agent-demo\.mp4"/,
);
assert.match(homepageFilmSource, /type="video\/mp4"/);
assert.doesNotMatch(homepageFilmMedia, /<track\b/i);
assert.doesNotMatch(
  homepageFilmPreviewMain,
  /homepage-film-scroll-cue|data-homepage-film-scroll-icon|Continue to JudgmentKit overview|id="homepage-overview"/,
);
const homepageFilmSectionIndex = homepageFilmPreviewMain.search(
  /class="[^"]*\bhomepage-film-section\b[^"]*"/,
);
const homepageFilmPreviewHeroIndex = homepageFilmPreviewMain.search(
  /class="[^"]*\bhomepage-hero\b[^"]*"/,
);
assert.ok(
  homepageFilmSectionIndex >= 0 &&
    homepageFilmPreviewHeroIndex >= 0 &&
    homepageFilmSectionIndex < homepageFilmPreviewHeroIndex,
  "the film should remain immediately ahead of the homepage story",
);

const homepageFilmControlGroups = [
  ...homepageFilmPreviewMain.matchAll(
    /<div\b[^>]*class="[^"]*\bhomepage-film-controls\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
  ),
].map((match) => match[0]);
assert.equal(homepageFilmControlGroups.length, 1);
const homepageFilmControls = homepageFilmControlGroups[0];
const homepageFilmControlsOpenTag = homepageFilmControls.match(/<div\b[^>]*>/i)?.[0] ?? "";
assert.match(
  homepageFilmControlsOpenTag,
  /(?:\s|^)hidden(?:\s|>)/,
  "custom controls should remain hidden until all behavior is bound",
);
assert.match(homepageFilmControlsOpenTag, /role="group"/);
assert.match(homepageFilmControlsOpenTag, /aria-label="Video controls"/);
const homepageFilmControlElements = [
  ...homepageFilmControls.matchAll(/<(button|input)\b[^>]*>/gi),
].map((match) => match[0]);
assert.equal(homepageFilmControlElements.length, 3);
assert.equal((homepageFilmControls.match(/<button\b/gi) ?? []).length, 2);
assert.equal((homepageFilmControls.match(/<input\b/gi) ?? []).length, 1);
assert.doesNotMatch(homepageFilmControls, /<(?:a|select)\b/i);
const homepageFilmPlayControl =
  homepageFilmControlElements.find((tag) => /data-film-action="play"/.test(tag)) ?? "";
const homepageFilmScrubber =
  homepageFilmControlElements.find((tag) => /data-film-scrubber(?:\s|=|>)/.test(tag)) ?? "";
const homepageFilmMuteControl =
  homepageFilmControlElements.find((tag) => /data-film-action="mute"/.test(tag)) ?? "";
for (const control of [
  homepageFilmPlayControl,
  homepageFilmScrubber,
  homepageFilmMuteControl,
]) {
  assert.match(control, /aria-controls="homepage-film-media"/);
}
assert.match(homepageFilmPlayControl, /^<button\b/i);
assert.match(homepageFilmPlayControl, /type="button"/);
assert.match(homepageFilmPlayControl, /aria-label="Play video"/);
assert.match(homepageFilmScrubber, /^<input\b/i);
assert.match(homepageFilmScrubber, /type="range"/);
assert.match(homepageFilmScrubber, /min="0"/);
assert.match(homepageFilmScrubber, /max="100"/);
assert.match(homepageFilmScrubber, /step="0\.1"/);
assert.match(homepageFilmScrubber, /value="0"/);
assert.match(homepageFilmScrubber, /(?:\s|^)disabled(?:\s|>)/);
assert.match(homepageFilmScrubber, /aria-label="Video progress"/);
assert.match(homepageFilmMuteControl, /^<button\b/i);
assert.match(homepageFilmMuteControl, /type="button"/);
assert.match(homepageFilmMuteControl, /aria-label="Unmute video"/);
const homepageFilmButtonMarkup = [
  ...homepageFilmControls.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/gi),
].map((match) => match[0]);
const homepageFilmPlayButtonMarkup =
  homepageFilmButtonMarkup.find((button) => /data-film-action="play"/.test(button)) ?? "";
const homepageFilmMuteButtonMarkup =
  homepageFilmButtonMarkup.find((button) => /data-film-action="mute"/.test(button)) ?? "";
assert.deepEqual(
  [...homepageFilmPlayButtonMarkup.matchAll(/data-icon-id="([^"]+)"/g)].map(
    (match) => match[1],
  ),
  ["play", "pause"],
);
assert.deepEqual(
  [...homepageFilmMuteButtonMarkup.matchAll(/data-icon-id="([^"]+)"/g)].map(
    (match) => match[1],
  ),
  ["volume-2", "volume-x"],
);
const homepageFilmIconTags = [
  ...homepageFilmControls.matchAll(/<svg\b[^>]*data-icon-id="[^"]+"[^>]*>/gi),
].map((match) => match[0]);
const homepageFilmIconTag = (id) =>
  homepageFilmIconTags.find((tag) => tag.includes('data-icon-id="' + id + '"')) ?? "";
for (const iconId of ["play", "pause", "volume-2", "volume-x"]) {
  assert.match(homepageFilmIconTag(iconId), /^<svg\b/i);
}
assert.doesNotMatch(homepageFilmIconTag("play"), /(?:\s|^)hidden(?:\s|>)/);
assert.match(homepageFilmIconTag("pause"), /(?:\s|^)hidden(?:\s|>)/);
assert.match(homepageFilmIconTag("volume-2"), /(?:\s|^)hidden(?:\s|>)/);
assert.doesNotMatch(homepageFilmIconTag("volume-x"), /(?:\s|^)hidden(?:\s|>)/);
assert.doesNotMatch(homepageFilmPlayButtonMarkup + homepageFilmMuteButtonMarkup, /<span\b/i);
assert.doesNotMatch(homepageFilmControls, /(?:fullscreen|caption|playback[_-]?rate|speed)/i);
assert.doesNotMatch(homepageFilmFrame, /<(?:h[1-6]|p|figcaption)\b/i);

const homepageFilmScripts = [...homepageFilmPreview.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((script) => script.includes("homepage-film"))
  .join("\n");

function runHomepageVideoBehavior(
  script,
  {
    darkSource = "",
    darkPoster = "",
    darkPreference = false,
    deferThemeMetadata = false,
    nativeAutoplayAfterMetadata = false,
    omitScrubber = false,
    playOutcomes = [],
  } = {},
) {
  class FakeNode {
    constructor({ attributes = {}, dataset = {} } = {}) {
      this.attributes = new Map(Object.entries(attributes));
      this.dataset = { ...dataset };
      this.listeners = new Map();
      this.hidden = this.attributes.has("hidden");
      this.styleValues = new Map();
      this.style = {
        setProperty: (name, value) => this.styleValues.set(name, String(value)),
      };
    }

    addEventListener(type, listener, options = {}) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push({ listener, once: options?.once === true });
      this.listeners.set(type, listeners);
    }

    dispatch(type, event = {}) {
      const listeners = [...(this.listeners.get(type) ?? [])];
      for (const entry of listeners) {
        entry.listener({ type, target: this, currentTarget: this, ...event });
        if (entry.once) {
          this.listeners.set(
            type,
            (this.listeners.get(type) ?? []).filter((candidate) => candidate !== entry),
          );
        }
      }
    }

    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }

    hasAttribute(name) {
      return this.attributes.has(name);
    }

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === "hidden") this.hidden = true;
      if (name === "controls") this.controls = true;
    }

    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === "hidden") this.hidden = false;
      if (name === "controls") this.controls = false;
    }
  }

  const player = new FakeNode({
    dataset: {
      filmSourceLight: "/light.mp4",
      filmPosterLight: "/light.png",
      ...(darkSource ? { filmSourceDark: darkSource } : {}),
      ...(darkPoster ? { filmPosterDark: darkPoster } : {}),
    },
  });
  const video = new FakeNode({
    attributes: {
      id: "homepage-film-media",
      class: "homepage-film-source-media",
      controls: "",
      autoplay: "",
      muted: "",
      poster: "/light.png",
    },
  });
  const source = new FakeNode({ attributes: { src: "/light.mp4" } });
  const controls = new FakeNode({ attributes: { hidden: "" } });
  const playButton = new FakeNode({ attributes: { "aria-label": "Play video" } });
  const playIcon = new FakeNode();
  const pauseIcon = new FakeNode({ attributes: { hidden: "" } });
  const scrubber = new FakeNode({ attributes: { "aria-valuetext": "0 percent played" } });
  const muteButton = new FakeNode({ attributes: { "aria-label": "Unmute video" } });
  const soundIcon = new FakeNode({ attributes: { hidden: "" } });
  const mutedIcon = new FakeNode();

  video.controls = true;
  video.paused = true;
  video.ended = false;
  video.duration = 38.2;
  video.currentTime = 0;
  video.readyState = deferThemeMetadata ? 0 : 1;
  video.poster = "/light.png";
  video.playCalls = 0;
  video.pauseCalls = 0;
  video.loadCalls = 0;
  let videoMuted = true;
  let videoVolume = 1;
  Object.defineProperties(video, {
    muted: {
      get: () => videoMuted,
      set: (value) => {
        videoMuted = Boolean(value);
        video.dispatch("volumechange");
      },
    },
    volume: {
      get: () => videoVolume,
      set: (value) => {
        videoVolume = Number(value);
        video.dispatch("volumechange");
      },
    },
  });
  video.play = () => {
    video.playCalls += 1;
    const outcome = playOutcomes[video.playCalls - 1] ?? "resolve";
    if (outcome === "reject") {
      video.paused = true;
      return Promise.reject(new Error("autoplay rejected"));
    }
    video.paused = false;
    video.ended = false;
    video.dispatch("play");
    return Promise.resolve();
  };
  video.pause = () => {
    video.pauseCalls += 1;
    video.paused = true;
    video.dispatch("pause");
  };
  video.load = () => {
    video.loadCalls += 1;
    video.paused = true;
    video.currentTime = 0;
    video.readyState = deferThemeMetadata ? 0 : 1;
  };

  const selectorMap = new Map([
    ["[data-homepage-film-media]", video],
    ["[data-homepage-film-source]", source],
    ["[data-homepage-film-controls]", controls],
    ["[data-homepage-film-play]", playButton],
    ["[data-homepage-film-play-icon]", playIcon],
    ["[data-homepage-film-pause-icon]", pauseIcon],
    ["[data-homepage-film-scrubber]", omitScrubber ? null : scrubber],
    ["[data-homepage-film-mute]", muteButton],
    ["[data-homepage-film-sound-icon]", soundIcon],
    ["[data-homepage-film-muted-icon]", mutedIcon],
  ]);
  player.querySelector = (selector) => selectorMap.get(selector) ?? null;

  const themeQuery = new FakeNode();
  themeQuery.matches = darkPreference;
  let matchMediaCalls = 0;
  const fakeWindow = {
    matchMedia(query) {
      assert.equal(query, "(prefers-color-scheme: dark)");
      matchMediaCalls += 1;
      return themeQuery;
    },
  };
  const fakeDocument = {
    baseURI: "https://judgmentkit.test/",
    querySelector(selector) {
      return selector === "[data-homepage-film-player]" ? player : null;
    },
  };

  Function("document", "window", "URL", script)(fakeDocument, fakeWindow, URL);

  return {
    controls,
    matchMediaCalls: () => matchMediaCalls,
    muteButton,
    mutedIcon,
    pauseIcon,
    playButton,
    playIcon,
    player,
    scrubber,
    source,
    soundIcon,
    themeQuery,
    video,
    dispatchVideoMetadata() {
      video.readyState = 1;
      video.dispatch("loadedmetadata");
      if (nativeAutoplayAfterMetadata && video.hasAttribute("autoplay") && video.paused) {
        video.paused = false;
        video.ended = false;
        video.dispatch("play");
      }
    },
    async settlePlayback() {
      for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
    },
  };
}

assert.doesNotMatch(
  homepageFilmScripts,
  /addEventListener\(\s*["'](?:wheel|touchmove|scroll)["']/,
);
for (const eventName of [
  "click",
  "input",
  "play",
  "pause",
  "ended",
  "timeupdate",
  "durationchange",
  "volumechange",
]) {
  assert.match(
    homepageFilmScripts,
    new RegExp("addEventListener\\(\\s*[\"']" + eventName + "[\"']"),
    "film behavior should respond to " + eventName,
  );
}
assert.match(homepageFilmScripts, /\.play\(\)/);
assert.match(homepageFilmScripts, /\.pause\(\)/);
assert.match(homepageFilmScripts, /\.muted\s*=/);
assert.match(homepageFilmScripts, /\.currentTime\s*=/);
assert.match(homepageFilmScripts, /\.duration\b/);
assert.match(homepageFilmScripts, /aria-label/);
assert.match(homepageFilmScripts, /filmPosterDark/);
assert.match(homepageFilmScripts, /filmSourceDark/);
assert.match(
  homepageFilmScripts,
  /matchMedia\(\s*["']\(prefers-color-scheme:\s*dark\)["']\s*\)/,
);
for (const retiredRuntimePattern of [
  /judgmentkit-visual-composition-v1/,
  /postMessage\(/,
  /addEventListener\(\s*["']message["']/,
  /data-homepage-film-(?:stage|live|live-scale|fallback)/,
  /data-film-live-(?:src|status)/,
  /SOUNDTRACK_RECOVERY_TIMEOUT_MS/,
  /\bsilentClock/,
  /enterSilentLiveMode/,
  /beginLiveSoundtrackRecovery/,
  /requestAnimationFrame/,
  /ResizeObserver/,
]) {
  assert.doesNotMatch(
    homepageFilmScripts,
    retiredRuntimePattern,
    "homepage script must not retain live-handoff or synthetic-clock behavior",
  );
}
assert.equal(
  homepageFilmFrameOpenTag.includes(
    'data-film-source-dark="/assets/releases/judgmentkit-select-field-agent-demo.mp4"',
  ),
  false,
);
assert.equal(
  homepageFilmFrameOpenTag.includes(
    'data-film-poster-dark="/assets/releases/judgmentkit-select-field-agent-demo-poster.png"',
  ),
  false,
);
const homepageFilmLastBindingIndex = homepageFilmScripts.lastIndexOf("addEventListener");
const homepageFilmNativeControlsRemovalIndex = homepageFilmScripts.search(
  /(?:removeAttribute\(\s*["']controls["']\s*\)|\.controls\s*=\s*false)/,
);
const homepageFilmControlsRevealIndex = homepageFilmScripts.search(/\.hidden\s*=\s*false/);
assert.ok(homepageFilmLastBindingIndex >= 0);
assert.ok(
  homepageFilmNativeControlsRemovalIndex > homepageFilmLastBindingIndex,
  "native controls should be removed only after every custom handler is bound",
);
assert.ok(
  homepageFilmControlsRevealIndex > homepageFilmLastBindingIndex,
  "custom controls should be revealed only after every custom handler is bound",
);
assert.match(
  siteCss,
  /\.homepage-film-controls\[hidden\]\s*\{[^}]*display:\s*none;/s,
  "hidden custom controls should not flash before enhancement",
);
const homepageFilmControlsCss = cssRuleBody(siteCss, ".homepage-film-controls");
assert.match(
  homepageFilmControlsCss,
  /color:\s*var\(--homepage-film-control-ink\);/,
  "player icons should inherit the current light or dark site theme instead of fixed light ink",
);
for (const property of [
  "border",
  "background",
  "box-shadow",
  "-webkit-backdrop-filter",
  "backdrop-filter",
]) {
  const value = cssDeclarationValue(homepageFilmControlsCss, property);
  assert.ok(
    value === undefined || /^(?:0|none|transparent)$/i.test(value),
    `the semantic video-control group must not render a shared ${property} surface`,
  );
}
assert.ok(
  !(
    cssDeclarationValue(homepageFilmControlsCss, "left") &&
    !/^auto$/i.test(cssDeclarationValue(homepageFilmControlsCss, "left")) &&
    cssDeclarationValue(homepageFilmControlsCss, "right") &&
    !/^auto$/i.test(cssDeclarationValue(homepageFilmControlsCss, "right"))
  ),
  "the semantic video-control group should not stretch edge-to-edge across the film",
);
assert.match(homepageFilmControlsCss, /right:\s*clamp\(/);
assert.match(homepageFilmControlsCss, /bottom:\s*clamp\(/);
assert.match(homepageFilmControlsCss, /left:\s*auto;/);
assert.match(homepageFilmControlsCss, /transform:\s*none;/);
assert.match(
  homepageFilmControlsCss,
  /width:\s*min\(236px,/,
  "the bottom-right video controls should reduce their visual footprint by about 20 percent",
);
assert.match(homepageFilmControlsCss, /grid-template-columns:\s*44px minmax\(0, 1fr\) 44px;/);
assert.match(homepageFilmControlsCss, /gap:\s*4px;/);
assert.ok(
  !cssDeclarationValue(homepageFilmControlsCss, "opacity") ||
    cssDeclarationValue(homepageFilmControlsCss, "opacity") === "1",
  "the semantic video-control group must not lower every control's contrast with shared opacity",
);
const homepageFilmControlButtonCss = cssRuleBody(siteCss, ".homepage-film-control-button");
assert.match(homepageFilmControlButtonCss, /position:\s*relative;/);
assert.match(homepageFilmControlButtonCss, /width:\s*44px;/);
assert.match(homepageFilmControlButtonCss, /min-width:\s*44px;/);
assert.match(homepageFilmControlButtonCss, /height:\s*44px;/);
assert.match(homepageFilmControlButtonCss, /min-height:\s*44px;/);
assert.match(homepageFilmControlButtonCss, /padding:\s*0;/);
assert.match(homepageFilmControlButtonCss, /border:\s*0;/);
assert.match(homepageFilmControlButtonCss, /background:\s*transparent;/);
assert.match(homepageFilmControlButtonCss, /box-shadow:\s*none;/);
const homepageFilmControlButtonSurfaceCss = cssRuleBody(
  siteCss,
  ".homepage-film-control-button::before",
);
assert.match(homepageFilmControlButtonSurfaceCss, /width:\s*36px;/);
assert.match(homepageFilmControlButtonSurfaceCss, /height:\s*36px;/);
assert.match(
  homepageFilmControlButtonSurfaceCss,
  /background:\s*var\(--homepage-film-control-surface\);/,
  "player button surfaces should use the theme-aware film-control surface",
);
assert.match(
  homepageFilmControlButtonSurfaceCss,
  /border:\s*1px solid var\(--homepage-film-control-border\);/,
);
assert.ok(
  !/border:\s*(?:0|none|transparent)\s*;/i.test(homepageFilmControlButtonSurfaceCss),
  "the reduced button circle should retain a visible boundary",
);
const homepageFilmControlIconCss = cssRuleBody(
  siteCss,
  ".homepage-film-control-button svg",
);
assert.match(homepageFilmControlIconCss, /width:\s*16px;/);
assert.match(homepageFilmControlIconCss, /height:\s*16px;/);
const homepageFilmScrubberCss = cssRuleBody(siteCss, ".homepage-film-scrubber");
assert.match(homepageFilmScrubberCss, /height:\s*44px;/);
assert.match(homepageFilmScrubberCss, /padding:\s*0 8px;/);
assert.match(homepageFilmScrubberCss, /border:\s*0;/);
assert.equal(
  cssDeclarationValue(homepageFilmScrubberCss, "background"),
  "transparent",
  "the native range hitbox should not repaint the oversized scrubber capsule",
);
assert.match(homepageFilmScrubberCss, /box-shadow:\s*none;/);
assert.match(homepageFilmScrubberCss, /-webkit-backdrop-filter:\s*none;/);
assert.match(homepageFilmScrubberCss, /backdrop-filter:\s*none;/);
const homepageFilmWebkitTrackCss = cssRuleBody(
  siteCss,
  ".homepage-film-scrubber::-webkit-slider-runnable-track",
);
assert.match(homepageFilmWebkitTrackCss, /height:\s*4px;/);
assert.match(
  homepageFilmWebkitTrackCss,
  /box-shadow:\s*0 0 0 1px color-mix\(in srgb, var\(--hero-art-bg\) 58%, transparent\)/,
  "the thin scrubber track should retain its established dual-contrast edge",
);
const homepageFilmWebkitThumbCss = cssRuleBody(
  siteCss,
  ".homepage-film-scrubber::-webkit-slider-thumb",
);
assert.match(homepageFilmWebkitThumbCss, /width:\s*(?:14|15)px;/);
assert.match(homepageFilmWebkitThumbCss, /height:\s*(?:14|15)px;/);
const homepageFilmMozThumbCss = cssRuleBody(
  siteCss,
  ".homepage-film-scrubber::-moz-range-thumb",
);
const homepageFilmMozTrackCss = cssRuleBody(
  siteCss,
  ".homepage-film-scrubber::-moz-range-track",
);
const homepageFilmMozProgressCss = cssRuleBody(
  siteCss,
  ".homepage-film-scrubber::-moz-range-progress",
);
assert.match(homepageFilmMozTrackCss, /height:\s*4px;/);
assert.match(homepageFilmMozTrackCss, /box-shadow:\s*0 0 0 1px/);
assert.match(homepageFilmMozProgressCss, /height:\s*4px;/);
assert.match(homepageFilmMozThumbCss, /width:\s*(?:14|15)px;/);
assert.match(homepageFilmMozThumbCss, /height:\s*(?:14|15)px;/);
assert.match(
  siteCss,
  /\.homepage-film-control-button:focus-visible,\s*\n\.homepage-film-scrubber:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--homepage-film-control-ink\);[^}]*box-shadow:\s*0 0 0 5px var\(--homepage-film-control-surface-solid\);/s,
  "both floating control types should retain a theme-aware dual-contrast keyboard-focus treatment",
);
assert.match(
  siteCss,
  /@media \(max-width: 560px\)\s*\{[\s\S]*?\.homepage-film-controls\s*\{[\s\S]*?width:\s*min\(236px,\s*calc\(100% - 24px\)\);[\s\S]*?gap:\s*4px;/,
  "the compact control cluster should remain bounded within narrow mobile film widths",
);
const homepageFilmSectionCss = cssRuleBody(siteCss, ".homepage-film-section");
const homepageFilmShellCss = cssRuleBody(siteCss, ".homepage-film-shell");
const homepageFilmFrameCss = cssRuleBody(siteCss, ".homepage-film-frame");
for (const token of [
  "--homepage-film-control-ink",
  "--homepage-film-control-surface",
  "--homepage-film-control-surface-hover",
  "--homepage-film-control-surface-solid",
  "--homepage-film-control-border",
  "--homepage-film-control-border-hover",
  "--homepage-film-control-shadow",
]) {
  assert.ok(
    lightAppearanceTokens.has(token),
    `the light appearance should define ${token}`,
  );
  assert.ok(
    darkAppearanceTokens.has(token),
    `the dark appearance should define ${token}`,
  );
  assert.notEqual(
    lightAppearanceTokens.get(token),
    darkAppearanceTokens.get(token),
    `${token} should adapt between light and dark appearance`,
  );
}
assert.doesNotMatch(
  siteCss,
  /\.homepage-film-scroll-cue|homepage-film-scroll-cue-bob/,
  "retired jump-control styling and motion should be removed from the site bundle",
);
const homepageFilmMediaCss = cssRuleBody(siteCss, ".homepage-film-source-media");
for (const property of ["padding", "border", "background", "box-shadow"]) {
  const value = cssDeclarationValue(homepageFilmFrameCss, property);
  assert.ok(
    value === undefined || /^(?:0|none|transparent)$/i.test(value),
    "the homepage film wrapper must not render decorative " + property + " chrome",
  );
}
assert.doesNotMatch(
  siteCss,
  /\.homepage-film-frame::(?:before|after)\s*\{/,
  "the full-bleed film wrapper should not recreate a frame with pseudo-elements",
);
assert.match(homepageFilmFrameCss, /overflow:\s*hidden;/);
assert.doesNotMatch(
  homepageFilmSectionCss,
  /(?:radial|linear)-gradient\(/i,
  "the film section should not place a decorative container behind the recording",
);
assert.match(
  homepageFilmSectionCss,
  /padding:\s*0 clamp\(8px,\s*1\.5vw,\s*24px\) clamp\(18px,\s*2\.4vw,\s*34px\);/,
);
const homepageFilmMaxWidth = Number.parseFloat(
  cssDeclarationValue(homepageFilmShellCss, "max-width") ?? "0",
);
assert.equal(
  homepageFilmMaxWidth,
  1440,
  "the native video should grow to but not upscale beyond its 1440px source width",
);
const homepageFilmWideViewportCap = siteCss.match(
  /@media \(min-width: 821px\) and \(min-height: 600px\)\s*\{\s*\.homepage-film-shell\s*\{([^}]*)\}/,
);
assert.ok(homepageFilmWideViewportCap);
assert.match(homepageFilmWideViewportCap[1], /max-width:\s*min\(1440px,\s*108vh\);/);
assert.match(homepageFilmWideViewportCap[1], /max-width:\s*min\(1440px,\s*108svh\);/);
const homepageFilmViewportWidthFactor = Number.parseFloat(
  homepageFilmWideViewportCap[1].match(/min\(1440px,\s*([\d.]+)svh\)/)?.[1] ?? "0",
) / 100;
for (const [viewportWidth, viewportHeight] of [
  [1366, 600],
  [1365, 768],
  [1440, 900],
  [1920, 1080],
]) {
  const renderedWidth = Math.min(
    viewportWidth - 48,
    1440,
    viewportHeight * homepageFilmViewportWidthFactor,
  );
  const followingSectionVisibleHeight = viewportHeight
    - 56
    - 34
    - (renderedWidth * 10 / 16);
  assert.ok(
    followingSectionVisibleHeight >= 100,
    viewportWidth + "x" + viewportHeight + " should reveal the following homepage section",
  );
}
assert.match(homepageFilmMediaCss, /display:\s*block;/);
assert.match(homepageFilmMediaCss, /width:\s*100%;/);
assert.match(homepageFilmMediaCss, /height:\s*auto;/);
assert.match(homepageFilmMediaCss, /aspect-ratio:\s*16\s*\/\s*10;/);
assert.match(homepageFilmMediaCss, /object-fit:\s*cover;/);
assert.match(homepageFilmMediaCss, /border-radius:\s*0;/);
assert.match(homepageFilmMediaCss, /background:\s*var\(--bg\);/);
assert.match(homepageFilmMediaCss, /transform:\s*scaleX\(1\.004\);/);
assert.match(homepageFilmMediaCss, /transform-origin:\s*center;/);
assert.doesNotMatch(
  siteCss,
  /\.homepage-film-(?:stage|live|live-scale)\b|\.homepage-film-source-media--soundtrack\b/,
  "the stylesheet must not retain a second renderer behind or above the video",
);
const missingControlFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  omitScrubber: true,
});
assert.equal(missingControlFilmBehavior.controls.hidden, true);
assert.equal(
  missingControlFilmBehavior.video.controls,
  true,
  "native controls must survive when custom enhancement cannot bind",
);
assert.equal(missingControlFilmBehavior.video.playCalls, 0);

const directFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts);
await directFilmBehavior.settlePlayback();
assert.equal(directFilmBehavior.controls.hidden, false);
assert.equal(
  directFilmBehavior.video.controls,
  false,
  "custom controls may replace native controls only after successful binding",
);
assert.equal(directFilmBehavior.player.getAttribute("data-homepage-film-ready"), "true");
assert.equal(directFilmBehavior.video.paused, false);
assert.equal(directFilmBehavior.video.muted, true);
assert.equal(directFilmBehavior.video.playCalls, 1);
assert.equal(directFilmBehavior.playButton.getAttribute("aria-label"), "Pause video");
assert.equal(directFilmBehavior.muteButton.getAttribute("aria-label"), "Unmute video");
assert.equal(directFilmBehavior.soundIcon.hasAttribute("hidden"), true);
assert.equal(directFilmBehavior.mutedIcon.hasAttribute("hidden"), false);
assert.equal(directFilmBehavior.scrubber.value, "0");
assert.equal(
  directFilmBehavior.matchMediaCalls(),
  0,
  "theme detection should be skipped when no distinct theme assets are supplied",
);
assert.equal(directFilmBehavior.playIcon.hasAttribute("hidden"), true);
assert.equal(directFilmBehavior.pauseIcon.hasAttribute("hidden"), false);

directFilmBehavior.video.currentTime = 9.55;
directFilmBehavior.video.dispatch("timeupdate");
assert.equal(Number(directFilmBehavior.scrubber.value), 25);
directFilmBehavior.playButton.dispatch("click");
assert.equal(directFilmBehavior.video.paused, true);
assert.equal(directFilmBehavior.playButton.getAttribute("aria-label"), "Play video");
const pausedProgress = directFilmBehavior.scrubber.value;
await directFilmBehavior.settlePlayback();
assert.equal(
  directFilmBehavior.scrubber.value,
  pausedProgress,
  "progress must not advance from a synthetic clock while the video is paused",
);

directFilmBehavior.scrubber.value = "50";
directFilmBehavior.scrubber.dispatch("input");
assert.equal(directFilmBehavior.video.currentTime, 19.1);
assert.equal(Number(directFilmBehavior.scrubber.value), 50);

directFilmBehavior.muteButton.dispatch("click");
assert.equal(directFilmBehavior.video.muted, false);
assert.equal(directFilmBehavior.muteButton.getAttribute("aria-label"), "Mute video");
assert.equal(directFilmBehavior.soundIcon.hasAttribute("hidden"), false);
assert.equal(directFilmBehavior.mutedIcon.hasAttribute("hidden"), true);
directFilmBehavior.muteButton.dispatch("click");
assert.equal(directFilmBehavior.video.muted, true);
assert.equal(directFilmBehavior.muteButton.getAttribute("aria-label"), "Unmute video");

directFilmBehavior.video.currentTime = directFilmBehavior.video.duration;
directFilmBehavior.video.ended = true;
directFilmBehavior.video.paused = true;
directFilmBehavior.video.dispatch("ended");
directFilmBehavior.playButton.dispatch("click");
await directFilmBehavior.settlePlayback();
assert.equal(directFilmBehavior.video.currentTime, 0);
assert.equal(directFilmBehavior.video.paused, false);
assert.equal(directFilmBehavior.video.playCalls, 2);

const rejectedAutoplayFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  playOutcomes: ["reject", "resolve"],
});
await rejectedAutoplayFilmBehavior.settlePlayback();
assert.equal(rejectedAutoplayFilmBehavior.video.playCalls, 1);
assert.equal(rejectedAutoplayFilmBehavior.video.paused, true);
assert.equal(rejectedAutoplayFilmBehavior.playButton.getAttribute("aria-label"), "Play video");
rejectedAutoplayFilmBehavior.playButton.dispatch("click");
await rejectedAutoplayFilmBehavior.settlePlayback();
assert.equal(rejectedAutoplayFilmBehavior.video.playCalls, 2);
assert.equal(rejectedAutoplayFilmBehavior.video.paused, false);
assert.equal(rejectedAutoplayFilmBehavior.video.muted, true);
assert.equal(rejectedAutoplayFilmBehavior.playButton.getAttribute("aria-label"), "Pause video");

const darkFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  darkSource: "/dark.mp4",
  darkPoster: "/dark.png",
  darkPreference: true,
});
await darkFilmBehavior.settlePlayback();
assert.equal(darkFilmBehavior.matchMediaCalls(), 1);
assert.equal(darkFilmBehavior.source.getAttribute("src"), "/dark.mp4");
assert.equal(darkFilmBehavior.video.poster, "/dark.png");
assert.equal(darkFilmBehavior.player.getAttribute("data-film-theme"), "dark");
assert.equal(
  darkFilmBehavior.video.playCalls,
  1,
  "the selected dark source should autoplay once it is ready",
);
assert.equal(darkFilmBehavior.video.paused, false);
assert.equal(darkFilmBehavior.video.muted, true);

const initialThemeLoadingFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  darkSource: "/dark.mp4",
  darkPoster: "/dark.png",
  darkPreference: true,
  deferThemeMetadata: true,
});
assert.equal(initialThemeLoadingFilmBehavior.source.getAttribute("src"), "/dark.mp4");
assert.equal(initialThemeLoadingFilmBehavior.video.loadCalls, 1);
assert.equal(
  initialThemeLoadingFilmBehavior.video.playCalls,
  0,
  "autoplay should wait for the selected theme source metadata",
);
assert.equal(initialThemeLoadingFilmBehavior.video.paused, true);
initialThemeLoadingFilmBehavior.dispatchVideoMetadata();
await initialThemeLoadingFilmBehavior.settlePlayback();
assert.equal(
  initialThemeLoadingFilmBehavior.video.playCalls,
  1,
  "metadata settlement should request autoplay exactly once",
);
assert.equal(initialThemeLoadingFilmBehavior.video.paused, false);

const themeLoadingAudioBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  darkSource: "/dark.mp4",
  darkPoster: "/dark.png",
  darkPreference: true,
  deferThemeMetadata: true,
});
themeLoadingAudioBehavior.muteButton.dispatch("click");
themeLoadingAudioBehavior.video.volume = 0.4;
assert.equal(themeLoadingAudioBehavior.video.muted, false);
assert.equal(
  themeLoadingAudioBehavior.video.playCalls,
  1,
  "Unmute should carry the pending playback request inside the visitor gesture",
);
themeLoadingAudioBehavior.dispatchVideoMetadata();
await themeLoadingAudioBehavior.settlePlayback();
assert.equal(
  themeLoadingAudioBehavior.video.muted,
  false,
  "theme metadata must not overwrite a newer mute choice",
);
assert.equal(
  themeLoadingAudioBehavior.video.volume,
  0.4,
  "theme metadata must not overwrite a newer volume choice",
);
assert.equal(
  themeLoadingAudioBehavior.video.playCalls,
  1,
  "theme metadata must not duplicate the user-activated playback request",
);

const themeRaceFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  darkSource: "/dark.mp4",
  darkPoster: "/dark.png",
  darkPreference: false,
  deferThemeMetadata: true,
  nativeAutoplayAfterMetadata: true,
});
await themeRaceFilmBehavior.settlePlayback();
assert.equal(themeRaceFilmBehavior.video.playCalls, 1);
themeRaceFilmBehavior.video.currentTime = 12.5;
themeRaceFilmBehavior.video.volume = 0.4;
themeRaceFilmBehavior.themeQuery.dispatch("change", { matches: true });
assert.equal(themeRaceFilmBehavior.source.getAttribute("src"), "/dark.mp4");
assert.equal(themeRaceFilmBehavior.video.paused, true);
themeRaceFilmBehavior.themeQuery.dispatch("change", { matches: false });
assert.equal(themeRaceFilmBehavior.source.getAttribute("src"), "/light.mp4");
themeRaceFilmBehavior.dispatchVideoMetadata();
await themeRaceFilmBehavior.settlePlayback();
assert.equal(
  themeRaceFilmBehavior.source.getAttribute("src"),
  "/light.mp4",
  "the newest theme request must win a racing source swap",
);
assert.equal(themeRaceFilmBehavior.player.getAttribute("data-film-theme"), "light");
assert.equal(themeRaceFilmBehavior.video.currentTime, 12.5);
assert.equal(themeRaceFilmBehavior.video.muted, true);
assert.equal(themeRaceFilmBehavior.video.volume, 0.4);
assert.equal(themeRaceFilmBehavior.video.paused, false);
assert.equal(
  themeRaceFilmBehavior.video.playCalls,
  2,
  "only the current theme swap may resume the previously playing video",
);
assert.equal(themeRaceFilmBehavior.playButton.getAttribute("aria-label"), "Pause video");

const pausedThemeFilmBehavior = runHomepageVideoBehavior(homepageFilmScripts, {
  darkSource: "/dark.mp4",
  darkPoster: "/dark.png",
  darkPreference: false,
  deferThemeMetadata: true,
  nativeAutoplayAfterMetadata: true,
});
await pausedThemeFilmBehavior.settlePlayback();
pausedThemeFilmBehavior.playButton.dispatch("click");
pausedThemeFilmBehavior.video.currentTime = 7.5;
pausedThemeFilmBehavior.themeQuery.dispatch("change", { matches: true });
pausedThemeFilmBehavior.dispatchVideoMetadata();
await pausedThemeFilmBehavior.settlePlayback();
assert.equal(pausedThemeFilmBehavior.source.getAttribute("src"), "/dark.mp4");
assert.equal(pausedThemeFilmBehavior.video.currentTime, 7.5);
assert.equal(pausedThemeFilmBehavior.video.playCalls, 1);
assert.equal(pausedThemeFilmBehavior.video.paused, true);
assert.equal(pausedThemeFilmBehavior.playButton.getAttribute("aria-label"), "Play video");
pausedThemeFilmBehavior.video.dispatch("error");
assert.equal(pausedThemeFilmBehavior.video.controls, true);
assert.equal(pausedThemeFilmBehavior.controls.hidden, true);
assert.equal(pausedThemeFilmBehavior.player.hasAttribute("data-homepage-film-ready"), false);
pausedThemeFilmBehavior.video.paused = false;
pausedThemeFilmBehavior.video.ended = false;
pausedThemeFilmBehavior.video.dispatch("play");
assert.equal(
  pausedThemeFilmBehavior.video.paused,
  false,
  "restored native controls must remain able to play after custom enhancement falls back",
);
const homepageFilmCss = cssRuleBlocks(siteCss)
  .filter(({ selector }) => selector.includes("homepage-film"))
  .map(({ body }) => body)
  .join("\n");
assert.doesNotMatch(
  homepageFilmCss,
  /scroll-snap/i,
  "homepage film should not use CSS scroll snapping",
);
assert.ok(homepage.includes('class="hero-actions" aria-label="Primary next steps"'));
assert.ok(homepage.includes('class="hero-action hero-action-primary" data-hero-action="primary" href="/value/"'));
assert.ok(homepage.includes('class="hero-action hero-action-secondary" data-hero-action="secondary" href="/examples/"'));
assert.ok(homepage.includes("See a screen repaired"));
assert.ok(homepage.includes("Explore examples"));
assert.equal(homepage.includes('data-hero-action="evidence"'), false);
assert.ok(homepage.includes('class="proof-panel evaluation-panel" aria-label="JudgmentKit repair preview"'));
assert.ok(homepage.includes("The screen follows the system, not the work."));
assert.ok(homepage.includes("The activity is named before the UI."));
assert.ok(homepage.includes("The agent gets a ready handoff."));
assert.ok(homepage.includes("Better first drafts. Less cleanup theater."));
assert.ok(homepage.includes('class="section homepage-failure" aria-labelledby="failure-title"'));
assert.ok(homepage.includes("The problem is not ugly UI. It is the wrong concept of the work."));
assert.ok(homepage.includes("Before judgment"));
assert.ok(homepage.includes("With JudgmentKit"));
assert.ok(homepage.includes("After repair"));
assert.ok(homepage.includes('class="section proof-paths" aria-labelledby="proof-paths-title"'));
assert.ok(homepage.includes("Inspect the loop from product value to repeatable evidence."));
assert.ok(homepage.includes("What it prevents"));
assert.ok(homepage.includes("Replayable examples"));
assert.ok(homepage.includes("Evaluation evidence"));
assert.ok(homepage.includes('class="section adoption-paths" aria-labelledby="adoption-title"'));
assert.ok(homepage.includes("Choose the next surface for the work you are doing."));
assert.ok(homepage.includes("Read the docs"));
assert.ok(homepage.includes("Review the design-system assets"));
assert.ok(homepage.includes("Start installation"));
assert.ok(homepage.includes('href="/docs/"'));
assert.ok(homepage.includes('href="/design-system/"'));
assert.ok(homepage.includes('href="/install"'));
assert.equal(
  fs.existsSync(path.join(tempDir, "releases", "visual-composition", "index.html")),
  false,
  "site build should not publish a separate visual-composition page",
);
assert.equal(
  fs.existsSync(path.join(tempDir, "releases", "visual-composition", "demo", "index.html")),
  false,
  "site build should not publish the retired demo route",
);
assert.ok(siteCss.includes(".evaluation-panel"));
assert.ok(siteCss.includes(".failure-grid"));
assert.ok(siteCss.includes(".route-grid-proof"));
assert.ok(siteCss.includes(".route-grid-adoption"));
assert.ok(siteCss.includes(".homepage-hero-shell {\n  display: grid;"));
assert.ok(siteCss.includes("grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.82fr);"));
assert.ok(siteCss.includes(".homepage-hero-art img {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: cover;"));
assert.ok(siteCss.includes(".hero-action:focus-visible {\n  outline: 0;\n  box-shadow: 0 0 0 3px var(--focus-ring);"));
assert.ok(siteCss.includes("@media (prefers-reduced-motion: reduce)"));
assert.ok(siteCss.includes("@media (prefers-contrast: more)"));
assert.ok(siteCss.includes("@media (forced-colors: active)"));
assert.ok(siteCss.includes(".homepage-hero-shell {\n    grid-template-columns: minmax(0, 1fr);"));
assert.ok(
  siteCss.includes(
    ".homepage-hero .hero-actions {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);",
  ),
);
assert.equal(siteCss.includes("text-decoration-line: underline;"), false);
assert.equal(homepageMain.includes("Prompt"), false);
assert.equal(homepageMain.includes("JSON schema"), false);
assert.equal(homepageMain.includes("prompt template"), false);
assert.equal(homepageMain.includes("tool call"), false);
assert.equal(homepageMain.includes("resource id"), false);
assert.equal(homepageMain.includes("API endpoint"), false);
assert.equal(homepageMain.includes("MCP boundary"), false);
assert.equal(homepageMain.includes("recommend_surface_types"), false);
assert.equal(homepageMain.includes("create_ui_implementation_contract"), false);
assert.equal(homepageMain.includes("create_frontend_generation_context"), false);
assert.equal(homepageMain.includes("create_frontend_implementation_skill_context"), false);
assert.equal(homepage.includes("System map"), false);
assert.equal(homepage.includes('id="system-map"'), false);
assert.equal(homepage.includes('href="/assets/system-map-flow.css?v=judgmentkit-flow-design-source-authority"'), false);
assert.equal(homepage.includes('src="/assets/system-map-flow.js?v=judgmentkit-flow-design-source-authority"'), false);
assert.equal(homepage.includes('data-system-map-flow-section'), false);
assert.equal(homepage.includes('data-system-map-flow-viewer'), false);
assert.equal(homepage.includes('data-system-map-flow-root'), false);
assert.equal(homepage.includes('data-system-map-fallback'), false);
assert.equal(homepage.includes('data-system-map-svg-fallback'), false);
assert.equal(homepage.includes("Scroll the page normally. Drag to pan the map; use controls or pinch/ctrl-wheel to zoom."), false);
assert.equal(homepage.includes("trackpad wheel to zoom"), false);
assert.equal(homepage.includes('data-system-map-viewer'), false);
assert.equal(homepage.includes('data-system-map-canvas'), false);
assert.equal(homepage.includes('data-system-map-zoom-in'), false);
assert.equal(homepage.includes('data-system-map-zoom-out'), false);
assert.equal(homepage.includes('data-system-map-reset'), false);
assert.equal(homepage.includes("JudgmentKit system design map"), false);
assert.equal(homepage.includes("MCP boundary"), false);
assert.equal(homepage.includes("JudgmentKit kernel"), false);
assert.equal(homepage.includes("LLM / provider seam"), false);
assert.equal(homepage.includes("Frontend adapter"), false);
assert.equal(homepage.includes("optional styling path"), false);
assert.equal(homepage.includes("Open system map"), false);
assert.equal(homepage.includes("not the final renderer"), false);
assert.ok(homepage.includes('rel="canonical" href="https://judgmentkit.ai/"'));
assert.ok(homepage.includes('rel="icon" href="/favicon.svg"'));
assert.ok(homepage.includes('rel="image_src" href="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260723-v2.png"'));
assert.ok(homepage.includes('property="og:image" content="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260723-v2.png"'));
assert.ok(homepage.includes('property="og:image:secure_url" content="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260723-v2.png"'));
assert.ok(homepage.includes('property="og:image:type" content="image/png"'));
assert.ok(homepage.includes('property="og:image:width" content="1200"'));
assert.ok(homepage.includes('property="og:image:height" content="630"'));
assert.ok(homepage.includes('property="og:image:alt" content="JudgmentKit. Before the UI."'));
assert.ok(homepage.includes('name="twitter:card" content="summary_large_image"'));
assert.ok(homepage.includes('name="twitter:image" content="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260723-v2.png"'));
assert.ok(homepage.includes('name="twitter:image:alt" content="JudgmentKit. Before the UI."'));
assert.ok(llms.includes("- /evals/judgmentkit-mcp/"));
assert.ok(llms.includes("- /evals/site-rebuild-log/"));
assert.ok(llms.includes("- /value/"));
assert.equal(llms.includes("- /releases/visual-composition/"), false);
assert.ok(llms.includes("- /design-system/"));
assert.ok(llms.includes("- /design-system/llms.txt"));
assert.equal(llms.includes("- /design-system/tokens/"), false);
assert.equal(llms.includes("- /design-system/fonts/"), false);
assert.equal(llms.includes("- /design-system/icons/"), false);
assertAnalyticsBootstrap(homepage, "homepage");

for (const forbidden of OLD_FRAMING) {
  assert.equal(
    homepage.includes(forbidden),
    false,
    `homepage must not use old relaunch framing: ${forbidden}`,
  );
}

const docs = fs.readFileSync(path.join(tempDir, "docs", "index.html"), "utf8");
assertAnalyticsBootstrap(docs, "docs");
assert.ok(docs.includes('<a href="/docs/" aria-current="page">Docs</a>'));
assert.ok(docs.includes('<section class="section docs-page">'));
assert.ok(docs.includes('class="site-shell doc-layout" data-section-rail-current="sections"'));
assert.ok(docs.includes('class="section-rail-menu docs-section-menu" data-section-rail-menu'));
assert.ok(docs.includes('class="section-rail-menu-button"'));
assert.ok(docs.includes('aria-controls="docs-section-menu"'));
assert.ok(docs.includes('data-section-rail-menu-button'));
assert.ok(docs.includes('<span data-section-rail-current-label>Quickstart</span>'));
assert.ok(docs.includes('data-section-rail-menu-backdrop'));
assert.ok(docs.includes('id="docs-section-menu" hidden data-section-rail-menu-list aria-label="Docs sections"'));
assert.ok(docs.includes('class="section-rail-nav doc-nav" aria-label="Docs sections"'));
assert.ok(docs.includes('<a href="#quickstart" data-section-rail-link data-section-rail-target="quickstart" aria-current="location">Quickstart</a>'));
assert.ok(docs.includes('<a href="#profiles" data-section-rail-link data-section-rail-target="profiles">Profiles</a>'));
assert.equal((docs.match(/href="#quickstart" data-section-rail-link data-section-rail-target="quickstart" aria-current="location"/g) ?? []).length, 2);
assert.ok(docs.includes("data-section-rail-current='sections'"));
assert.ok(docs.includes('link.setAttribute("aria-current", "location");'));
assert.ok(docs.includes("window.addEventListener(\"hashchange\""));
assert.ok(docs.includes("window.addEventListener(\"scroll\", scheduleUpdate, { passive: true });"));
assert.ok(docs.includes('class="doc-content"'));
assert.equal(docs.includes('id="docs-section-menu" role="menu"'), false);
assert.equal(docs.includes('<a href="#quickstart" role="menuitem"'), false);
assert.ok(docs.includes("curl -fsSL https://judgmentkit.ai/install | bash"));
assert.ok(docs.includes("curl -fsSL https://judgmentkit.ai/install | bash -s -- --client claude"));
assert.ok(docs.includes("curl -fsSL https://judgmentkit.ai/install | bash -s -- --client cursor"));
assert.ok(docs.includes("Install JudgmentKit for your MCP client"));
assert.ok(docs.includes("Codex is the default client"));
assert.ok(docs.includes("First 10 Minutes"));
assert.ok(docs.includes("examples/ai-native-design-system/first-use.json"));
assert.ok(docs.includes("examples/ai-native-design-system/canonical-examples.json"));
assert.ok(docs.includes("next_agent_action"));
assert.ok(docs.includes("repair_instructions"));
assert.ok(docs.includes("visual_token_adapter"));
assert.ok(docs.includes("optional 17-contract React adapter candidate and its canonical registry"));
assert.ok(
  docs.includes(
    "The root library, CLI, MCP, and <code>visual_token_adapter</code> remain framework-neutral.",
  ),
);
assert.ok(docs.includes("implementation_contract.design_system_source"));
assert.ok(docs.includes("implementation_contract.local_component_authority"));
assert.ok(docs.includes("Planning Mode Examples"));
assert.ok(docs.includes("review whether an agent is using JudgmentKit well"));
assert.ok(docs.includes("Plan a UI for a support lead reviewing refund requests during daily triage"));
assert.ok(docs.includes("approval, policy review, return for evidence, and handoff reasons"));
assert.ok(docs.includes("Plan a dashboard for the system."));
assert.ok(docs.includes("pause instead of inventing a dashboard"));
assert.ok(docs.includes("what work the dashboard supports"));
assert.ok(docs.includes("full dashboard plan with metrics, cards, charts, and navigation invented from no source context"));
assert.ok(docs.includes("Plan an admin UI from our JSON schema"));
assert.ok(docs.includes("implementation terms move into diagnostics"));
assert.ok(docs.includes("tables, schemas, prompt templates, tool calls, or API endpoints become the main product UI"));
assert.ok(docs.includes("https://judgmentkit.ai/mcp"));
assert.ok(docs.includes("hosted Streamable HTTP endpoint"));
assert.ok(docs.includes("Codex, Claude Code, or Cursor"));
assert.ok(docs.includes("structuredContent"));
assert.ok(docs.includes("content[0].text"));
assert.ok(docs.includes("Markdown planning card"));
assert.ok(docs.includes("Codex-style planning chat"));
assert.ok(docs.includes('id="system-map"'));
assert.ok(docs.includes("System Map"));
assert.ok(docs.includes('href="/assets/system-map-flow.css?v=judgmentkit-flow-design-source-authority"'));
assert.ok(docs.includes('src="/assets/system-map-flow.js?v=judgmentkit-flow-design-source-authority"'));
assert.ok(docs.includes('data-system-map-flow-section'));
assert.ok(docs.includes('data-system-map-flow-viewer'));
assert.ok(docs.includes('data-system-map-flow-root'));
assert.ok(docs.includes('data-system-map-fallback'));
assert.ok(docs.includes('data-system-map-svg-fallback'));
assert.equal(docs.includes("Scroll the page normally. Drag to pan the map; use controls or pinch/ctrl-wheel to zoom."), false);
assert.equal(docs.includes("trackpad wheel to zoom"), false);
assert.equal(docs.includes('data-system-map-viewer'), false);
assert.equal(docs.includes('data-system-map-canvas'), false);
assert.equal(docs.includes('data-system-map-zoom-in'), false);
assert.equal(docs.includes('data-system-map-zoom-out'), false);
assert.equal(docs.includes('data-system-map-reset'), false);
assert.ok(docs.includes("JudgmentKit system design map"));
assert.ok(docs.includes("Use JudgmentKit before generation and across iterations"));
assert.ok(docs.includes("create_activity_model_review"));
assert.ok(docs.includes("recommend_surface_types"));
assert.ok(docs.includes("review_ui_workflow_candidate"));
assert.ok(docs.includes("review_cognitive_dimensions_candidate"));
assert.ok(docs.includes("create_ui_generation_handoff"));
assert.ok(docs.includes("create_ui_implementation_contract"));
assert.ok(docs.includes("review_ui_implementation_candidate"));
assert.ok(docs.includes("create_frontend_generation_context"));
assert.ok(docs.includes("create_frontend_implementation_skill_context"));
assert.ok(docs.includes("MCP boundary"));
assert.ok(docs.includes("MCP is access and transport, not the LLM"));
assert.ok(docs.includes("LLM / provider seam"));
assert.ok(docs.includes("JudgmentKit kernel"));
assert.ok(docs.includes("Surface type"));
assert.ok(docs.includes("Frontend adapter"));
assert.ok(docs.includes("Source brief + product context"));
assert.ok(docs.includes("External adapter"));
assert.ok(docs.includes("Complete tokens, components,"));
assert.equal(docs.includes("@mui/material components"), false);
assert.ok(docs.includes("selected surface type"));
assert.ok(docs.includes("Design-system compliance is not a substitute for activity fit"));
assert.ok(docs.includes("design-system provenance is required"));
assert.ok(docs.includes("implementation_contract.design_system_source"));
assert.ok(docs.includes("implementation_contract.local_component_authority"));
assert.ok(docs.includes("implementation_contract.visual_token_adapter"));
assert.ok(docs.includes("implementation_contract.default_ai_native_design_system"));
assert.ok(docs.includes("implementation_contract.visual_asset_policy"));
assert.ok(docs.includes("implementation_contract.accessibility_policy"));
assert.ok(docs.includes("external_design_system"));
assert.ok(docs.includes("complete"));
assert.ok(docs.includes("missing authorities fail"));
assert.equal(docs.includes("without design system"), false);
assert.equal(docs.includes("does not enforce Material UI or any design system"), false);
assert.ok(docs.includes("updated context"));
assert.ok(docs.includes("re-enters source/activity review rather than becoming only a longer prompt"));
assert.ok(docs.includes("resolve targeted questions or leakage details before generating UI"));
assert.ok(docs.includes("not the final UI renderer"));
assert.equal(docs.includes("optional styling path"), false);
assert.ok(docs.includes("operator-review-ui"));
assert.equal(docs.includes("judgmentkit2"), false);

const designSystem = fs.readFileSync(path.join(tempDir, "design-system", "index.html"), "utf8");
const designSystemTokens = fs.readFileSync(
  path.join(tempDir, "design-system", "tokens", "index.html"),
  "utf8",
);
const designSystemFonts = fs.readFileSync(
  path.join(tempDir, "design-system", "fonts", "index.html"),
  "utf8",
);
const designSystemIcons = fs.readFileSync(
  path.join(tempDir, "design-system", "icons", "index.html"),
  "utf8",
);
const designSystemComponents = fs.readFileSync(
  path.join(tempDir, "design-system", "components", "index.html"),
  "utf8",
);
const designSystemPatterns = fs.readFileSync(
  path.join(tempDir, "design-system", "patterns", "index.html"),
  "utf8",
);
const designSystemAccessibility = fs.readFileSync(
  path.join(tempDir, "design-system", "accessibility", "index.html"),
  "utf8",
);
const designSystemMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "index.html.md"),
  "utf8",
);
const designSystemTokensMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "tokens", "index.html.md"),
  "utf8",
);
const designSystemFontsMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "fonts", "index.html.md"),
  "utf8",
);
const designSystemIconsMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "icons", "index.html.md"),
  "utf8",
);
const designSystemComponentsMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "components", "index.html.md"),
  "utf8",
);
const designSystemPatternsMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "patterns", "index.html.md"),
  "utf8",
);
const designSystemAccessibilityMarkdown = fs.readFileSync(
  path.join(tempDir, "design-system", "accessibility", "index.html.md"),
  "utf8",
);
const designSystemLlms = fs.readFileSync(
  path.join(tempDir, "design-system", "llms.txt"),
  "utf8",
);
const designSystemLlmsFull = fs.readFileSync(
  path.join(tempDir, "design-system", "llms-full.txt"),
  "utf8",
);
const designSystemManifest = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "manifest.json"), "utf8"),
);
assert.ok(designSystemTokens.includes('<a href="/design-system/" aria-current="page">Design System</a>'));
assert.ok(designSystemTokens.includes('<a href="/design-system/tokens/" data-section-rail-link aria-current="page">Tokens</a>'));
const visualTokenAdapterExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "visual-token-adapter.json"), "utf8"),
);
const appearanceTokenSets = Object.fromEntries(
  visualTokenAdapterExport.appearance_token_sets.map((tokenSet) => [
    tokenSet.mode,
    tokenSet.css_custom_properties,
  ]),
);
const lightAdapterAppearanceTokenNames = appearanceTokenSets.light.map((token) => token.name);
const darkAdapterAppearanceTokenNames = appearanceTokenSets.dark.map((token) => token.name);
assert.equal(
  new Set(lightAdapterAppearanceTokenNames).size,
  lightAdapterAppearanceTokenNames.length,
  "design-system light appearance tokens must be unique",
);
assert.equal(
  new Set(darkAdapterAppearanceTokenNames).size,
  darkAdapterAppearanceTokenNames.length,
  "design-system dark appearance tokens must be unique",
);
assert.deepEqual(
  [...darkAdapterAppearanceTokenNames].sort(),
  [...lightAdapterAppearanceTokenNames].sort(),
  "design-system light and dark appearance token sets must stay in parity",
);
const adapterAppearanceTokenNames = new Set([
  ...lightAdapterAppearanceTokenNames,
  ...darkAdapterAppearanceTokenNames,
]);
const componentContractsExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "component-contracts.json"), "utf8"),
);
const componentInventoryExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "component-inventory.json"), "utf8"),
);
const componentRegistryExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "component-registry.json"), "utf8"),
);
const patternContractsExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "pattern-contracts.json"), "utf8"),
);
const surfacePresentationProfilesExport = JSON.parse(
  fs.readFileSync(
    path.join(tempDir, "design-system", "surface-presentation-profiles.json"),
    "utf8",
  ),
);
const componentSpecimensExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "component-specimens.json"), "utf8"),
);
const patternSpecimensExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "pattern-specimens.json"), "utf8"),
);
const specimenProvenanceExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "specimen-provenance.json"), "utf8"),
);
const accessibilityPolicyExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "accessibility-policy.json"), "utf8"),
);
const iconScenariosExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "icon-scenarios.json"), "utf8"),
);
const implementationContract = createUiImplementationContract().implementation_contract;
assert.equal(
  implementationContract.design_system_source.source_exports.component_inventory,
  "/design-system/component-inventory.json",
);
const defaultDesignSystem = implementationContract.default_ai_native_design_system;
for (const [label, html] of [
  ["design system overview", designSystem],
  ["design system tokens", designSystemTokens],
  ["design system fonts", designSystemFonts],
  ["design system icons", designSystemIcons],
  ["design system components", designSystemComponents],
  ["design system patterns", designSystemPatterns],
  ["design system accessibility", designSystemAccessibility],
]) {
  assertAnalyticsBootstrap(html, label);
  assert.ok(html.includes("JudgmentKit"), `${label} should identify JudgmentKit`);
  assert.equal(/googleapis|gstatic|unpkg|jsdelivr|fontawesome|icons-material/i.test(html), false);
}
for (const [label, markdown] of [
  ["design system markdown", designSystemMarkdown],
  ["design system tokens markdown", designSystemTokensMarkdown],
  ["design system fonts markdown", designSystemFontsMarkdown],
  ["design system icons markdown", designSystemIconsMarkdown],
  ["design system components markdown", designSystemComponentsMarkdown],
  ["design system patterns markdown", designSystemPatternsMarkdown],
  ["design system accessibility markdown", designSystemAccessibilityMarkdown],
]) {
  assert.ok(markdown.startsWith("# JudgmentKit"), `${label} should start with a title`);
  assert.equal(markdown.includes("<nav"), false, `${label} must not include site navigation`);
  assert.equal(markdown.includes("window.va"), false, `${label} must not include analytics`);
  assert.equal(markdown.includes("data-catalog-icon"), false, `${label} must not embed full icon grid`);
  assert.equal(markdown.includes("<svg"), false, `${label} must not embed SVG payloads`);
  assert.equal(markdown.includes("Agent Consumption"), false, `${label} must not use agent-only IA`);
  assert.equal(markdown.includes("MCP Tools"), false, `${label} must not expose tool flow as a page section`);
}
for (const [label, html] of [
  ["design system overview", designSystem],
  ["design system tokens", designSystemTokens],
  ["design system fonts", designSystemFonts],
  ["design system icons", designSystemIcons],
  ["design system components", designSystemComponents],
  ["design system patterns", designSystemPatterns],
  ["design system accessibility", designSystemAccessibility],
]) {
  assert.equal(html.includes("Agent Consumption"), false, `${label} must not expose agent-only IA`);
  assert.equal(html.includes("Agent Search"), false, `${label} must not frame the page as an agent proof`);
  assert.equal(html.includes("MCP tools"), false, `${label} must not expose tool flow in visible content`);
  assert.equal(html.includes("boundary_only"), false, `${label} must not expose adapter mode`);
  assert.equal(html.includes("adapter-layer metadata"), false, `${label} must not expose adapter metadata as UI copy`);
  assert.equal(html.includes("llms.txt"), false, `${label} must not make machine exports visible IA`);
  assert.equal(html.includes("data-agent-icon-card"), false, `${label} must not keep old icon proof attributes`);
}
assert.ok(designSystem.includes("<h1>Foundations</h1>"));
assert.ok(designSystem.includes("Foundation assets"));
assert.ok(designSystem.includes("How to review"));
assert.ok(designSystem.includes("Principles"));
assert.ok(designSystem.includes("Tokens"));
assert.ok(designSystem.includes("Typography"));
assert.ok(designSystem.includes("Icons"));
assert.ok(designSystem.includes('aria-label="Design system sections"'));
assert.ok(designSystem.includes('aria-label="On this page"'));
assert.ok(designSystem.includes("/design-system/tokens/"));
assert.ok(designSystem.includes("/design-system/fonts/"));
assert.ok(designSystem.includes("/design-system/icons/"));
assert.ok(designSystem.includes("/design-system/components/"));
assert.ok(designSystem.includes("/design-system/patterns/"));
assert.ok(designSystem.includes("/design-system/accessibility/"));
assert.ok(designSystemTokens.includes("<h1>Tokens</h1>"));
assert.ok(designSystemTokens.includes("JudgmentKit token roles"));
assert.ok(designSystemTokens.includes("Portable CSS custom properties"));
assert.ok(designSystemTokens.includes("roles + CSS"));
assert.ok(designSystemTokens.includes("<h2 id=\"appearance\">Appearance</h2>"));
assert.ok(designSystemTokens.includes("system-detected"));
assert.ok(designSystemTokens.includes('data-appearance-default="system"'));
assert.ok(designSystemTokens.includes('data-visible-appearance-toggle="false"'));
assert.ok(designSystemTokens.includes("--jk-color-surface"));
assert.ok(designSystemTokens.includes("#ffffff"));
assert.ok(designSystemTokens.includes("@media (prefers-color-scheme: dark)"));
assert.ok(designSystemTokens.includes("#181d1b"));
assert.ok(designSystemTokens.includes('data-token-value="--jk-color-surface"'));
assert.ok(designSystemTokens.includes('data-token-swatch="--jk-color-surface"'));
assert.ok(designSystemTokens.includes('aria-label="--jk-color-surface color swatch: #ffffff"'));
assert.ok(designSystemTokens.includes("token-value-with-swatch"));
assert.ok(designSystemTokens.includes("role-first layer"));
assert.ok(designSystemTokens.includes("Token roles"));
assert.ok(designSystemTokens.includes("surface"));
assert.ok(designSystemTokens.includes("focus"));
assert.ok(designSystemTokens.includes("receipt"));
assert.ok(designSystemTokens.includes('data-token-role="surface"'));
assert.ok(designSystemTokens.includes('data-token-role="focus"'));
assert.ok(designSystemTokens.includes("<caption>JudgmentKit token roles</caption>"));
assert.ok(designSystemTokens.includes("Accessibility"));
assert.ok(designSystemTokens.includes("Color cannot be the only way"));
assert.ok(designSystemTokensMarkdown.includes("## Appearance"));
assert.ok(designSystemTokensMarkdown.includes("Default mode: `system`"));
assert.ok(designSystemTokensMarkdown.includes("Visible appearance toggle by default: `false`"));
assert.ok(designSystemTokensMarkdown.includes("Token sets: `light`, `dark`"));
assert.equal(designSystemTokens.includes("Evidence Expectations"), false);
assert.equal(designSystemTokens.includes("Failure Signals"), false);
assert.ok(designSystemFonts.includes("<h1>Typography</h1>"));
assert.ok(designSystemFonts.includes("JudgmentKit typography roles"));
assert.ok(designSystemFonts.includes("body"));
assert.ok(designSystemFonts.includes("heading"));
assert.ok(designSystemFonts.includes("label"));
assert.ok(designSystemFonts.includes("numeric"));
assert.ok(designSystemFonts.includes("diagnostic"));
assert.ok(designSystemFonts.includes('data-font-role="body"'));
assert.ok(designSystemFonts.includes('data-font-role="numeric"'));
assert.ok(designSystemFonts.includes('data-font-role="diagnostic"'));
assert.ok(designSystemFonts.includes("system-ui, -apple-system"));
assert.ok(designSystemFonts.includes("ui-monospace"));
assert.ok(designSystemFonts.includes("No font CDN or bundled font files."));
assert.ok(designSystemFonts.includes("Respect browser text scaling"));
assert.ok(designSystemIcons.includes("<h1>Icons</h1>"));
assert.ok(designSystemIcons.includes("A complete Lucide icon catalog"));
assert.ok(designSystemIcons.includes("lucide-static@1.21.0"));
assert.ok(designSystemIcons.includes("1737"));
assert.ok(designSystemIcons.includes("Usage"));
assert.ok(designSystemIcons.includes("Icon index"));
assert.ok(designSystemIcons.includes("Accessibility"));
assert.ok(designSystemIcons.includes("Source"));
assert.ok(designSystemIcons.includes("Choose the icon by the meaning"));
assert.ok(designSystemIcons.includes('data-design-icon-search'));
assert.ok(designSystemIcons.includes('class="site-shell doc-layout design-system-layout"'));
assert.ok(designSystemIcons.includes('class="section-rail-menu design-system-section-menu" data-section-rail-menu'));
assert.ok(designSystemIcons.includes('class="section-rail-menu-button"'));
assert.ok(designSystemIcons.includes('aria-controls="design-system-section-menu-icons"'));
assert.ok(designSystemIcons.includes('data-section-rail-menu-button'));
assert.ok(designSystemIcons.includes('data-section-rail-menu-backdrop'));
assert.ok(designSystemIcons.includes('id="design-system-section-menu-icons" hidden data-section-rail-menu-list aria-label="Design system sections"'));
assert.ok(designSystemIcons.includes('data-section-rail-menu-list'));
assert.ok(designSystemIcons.includes('class="section-rail-nav design-system-nav" aria-label="Design system sections"'));
assert.ok(designSystemIcons.includes('<a href="/design-system/icons/" data-section-rail-link aria-current="page">Icons</a>'));
assert.equal(designSystemIcons.includes('id="design-system-section-menu-icons" role="menu"'), false);
assert.equal(designSystemIcons.includes('<a href="/design-system/icons/" role="menuitem"'), false);
const iconIndexCards = designSystemIcons.match(
  /<li class="design-icon-scenario design-icon-index-card"[\s\S]*?<\/li>/g,
) ?? [];
assert.equal(designSystemIcons.includes("Icon examples"), false);
assert.equal(designSystemIcons.includes('id="icon-examples"'), false);
assert.equal(designSystemIcons.includes('href="#icon-examples"'), false);
assert.equal(designSystemIcons.includes('data-icon-example='), false);
assert.equal(designSystemIcons.includes("data-selected-icon-id"), false);
assert.ok(designSystemIcons.includes('data-icon-scenario="status-success"'));
assert.ok(designSystemIcons.includes('data-icon-id="check"'));
assert.equal(designSystemIcons.includes("<h3>Status success</h3>"), false);
assert.equal(designSystemIcons.includes("<h3>A Arrow Down</h3>"), false);
assert.equal(designSystemIcons.includes("Show a completed status beside a visible result label."), false);
assert.ok(designSystemIcons.includes('data-icon-id="receipt-text"'));
assert.ok(designSystemIcons.includes('data-icon-name="Receipt Text"'));
assert.ok(designSystemIcons.includes("Every catalog entry uses the same icon and ID card format."));
assert.equal(
  designSystemIcons.includes("Every catalog entry uses the same icon, label, and ID card format."),
  false,
);
assert.equal(
  designSystemIcons.includes("Every catalog entry uses the same icon, label, meaning, and ID card format."),
  false,
);
assert.equal(
  designSystemIcons.includes(
    "Lucide catalog icon available for JudgmentKit interface states, actions, navigation, and objects.",
  ),
  false,
);
assert.equal(designSystemIcons.includes("<dt>Icon</dt>"), false);
assert.ok(designSystemIcons.includes('<code class="design-icon-id" aria-label="Icon ID check">check</code>'));
assert.equal(designSystemIcons.includes("list_icon_catalog"), false);
assert.equal(designSystemIcons.includes("search_icon_catalog"), false);
assert.equal(designSystemIcons.includes("get_icon_svg"), false);
assert.ok(designSystemIcons.includes("/examples/lucide-icon-catalog-smoke.html"));
assert.equal(designSystemIcons.includes("data-catalog-icon"), false);
assert.ok(designSystemIcons.includes("<svg"));
assert.ok(designSystemIcons.includes('viewBox="0 0 24 24"'));
assert.equal(iconIndexCards.length, 1737);
assert.equal(iconIndexCards.some((card) => card.includes("<h3>")), false);
assert.equal(iconIndexCards.some((card) => card.includes("<p>")), false);
assert.equal((designSystemIcons.match(/data-icon-scenario=/g) ?? []).length, 16);
assert.equal((designSystemIcons.match(/data-icon-id=/g) ?? []).length, 1737);
assert.equal((designSystemIcons.match(/class="design-icon-id"/g) ?? []).length, 1737);
assert.equal((designSystemIcons.match(/data-catalog-icon=/g) ?? []).length, 0);
assert.equal((designSystemIcons.match(/class="design-icon-scenario(?:\s|")/g) ?? []).length, 1737);
assert.equal(designSystemIcons.includes("without loading the full SVG grid"), false);
assert.equal(siteCss.includes(".design-icon-tile"), false);
assert.equal(siteCss.includes(".design-icon-scenario h3"), false);
assert.equal(siteCss.includes(".design-icon-scenario p"), false);
assert.equal(siteCss.includes("min-height: 178px;"), false);
assert.ok(siteCss.includes(".design-icon-symbol {\n  display: grid;\n  width: 24px;\n  min-height: 24px;\n  place-items: center;\n  color: inherit;\n}"));
assert.ok(siteCss.includes("grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));"));
assert.ok(siteCss.includes(".design-icon-index-list {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  align-items: start;"));
assert.ok(siteCss.includes(".design-icon-index-card[hidden] {\n  display: none;\n}"));
assert.ok(Buffer.byteLength(designSystemIcons, "utf8") < 2_500_000);
assert.ok(designSystemComponents.includes("<h1>Components</h1>"));
assert.equal(
  (designSystemComponents.match(/data-component-coverage="(?:inventory|normalization|runtime)"/g) ?? [])
    .length,
  3,
);
assert.ok(designSystemComponents.includes("128/128 families"));
assert.ok(designSystemComponents.includes("354/354 variants"));
assert.ok(
  designSystemComponents.includes(
    "17/17 contract IDs have local implementation candidates",
  ),
);
assert.ok(
  designSystemComponents.includes(
    `${componentRegistryExport.scenarios.filter((scenario) => scenario.status === "verified").length}/65 required states currently verified`,
  ),
);
assert.deepEqual(componentInventoryExport.totals.all, {
  families: 128,
  variants: 354,
});
assert.ok(designSystemComponents.includes("When to use each component"));
assert.ok(designSystemComponents.includes("<h2 id=\"components\">Components</h2>"));
assert.ok(designSystemComponents.includes("<h2 id=\"inventory\">Inventory</h2>"));
for (const inventoryLabel of [
  "Reference families",
  "Reference variants",
  "JudgmentKit components",
  "State examples",
]) {
  assert.ok(
    designSystemComponents.includes(inventoryLabel),
    `The primary inventory should show ${inventoryLabel}.`,
  );
}
const componentInventorySection = designSystemComponents.match(
  /<section class="design-system-section design-system-inventory"[\s\S]*?<\/section>/,
)?.[0];
assert.ok(componentInventorySection, "The component page must render its inventory section.");
const componentInventoryPrimary = componentInventorySection.split(
  '<details class="design-system-inventory-details">',
)[0];
for (const implementationTerm of [
  "Semantic normalization",
  "Runtime candidate",
  "contract IDs",
  "Audit metadata",
  "Scenario representation",
  "Current evidence",
]) {
  assert.equal(
    componentInventoryPrimary.includes(implementationTerm),
    false,
    `${implementationTerm} must stay out of the primary inventory surface.`,
  );
}
assert.ok(
  componentInventorySection.includes(
    "<summary>How the reference maps to JudgmentKit</summary>",
  ),
  "Reference mapping detail should remain available on demand.",
);
assert.doesNotMatch(
  componentInventorySection,
  /<details class="design-system-inventory-details"[^>]*\sopen(?:\s|>)/,
  "Reference mapping detail must be collapsed by default.",
);
assert.ok(designSystemComponents.includes('data-specimen-id="component.action_button"'));
assert.ok(designSystemComponents.includes('data-contract-hash="sha256:'));
assert.ok(designSystemComponents.includes('data-contract-state="focus-visible"'));
assert.ok(designSystemComponents.includes('data-component-runtime="judgmentkit/react"'));
assert.ok(
  designSystemComponents.includes(
    'href="/assets/component-specimens.css?v=judgmentkit-react-component-candidate-v1"',
  ),
);
assert.ok(designSystemComponents.includes('data-component-anatomy="visible-label"'));
assert.ok(designSystemComponents.includes('data-token-role="decision"'));
assert.ok(designSystemComponents.includes("Contract hash"));
assert.ok(designSystemComponents.includes("Implementation hash"));
assert.ok(designSystemComponents.includes("Output hash"));
assert.ok(designSystemComponents.includes('data-component-contract="action_button"'));
assert.ok(designSystemComponents.includes('data-component-contract="dialog"'));
assert.ok(
  designSystemComponents.includes(
    "Show loading, disabled, empty, and error states with a readable explanation",
  ),
);
assert.equal(designSystemComponents.includes("jk-sample-"), false);
for (const [label, html] of [
  ["component", designSystemComponents],
  ["pattern", designSystemPatterns],
]) {
  const previewTags = html.match(/<div class="jk-specimen-preview[^>]*>/g) ?? [];
  assert.ok(previewTags.length > 0, `${label} specimens should render preview roots`);
  const pinnedAppearanceTokens = inlineCustomPropertyNames(html)
    .filter((tokenName) => adapterAppearanceTokenNames.has(tokenName))
    .sort();
  assert.deepEqual(
    pinnedAppearanceTokens,
    [],
    `${label} specimens must inherit every appearance token instead of pinning it inline`,
  );
}
assert.ok(designSystemPatterns.includes("<h1>Patterns</h1>"));
assert.ok(designSystemPatterns.includes("Surface pattern contracts"));
assert.ok(designSystemPatterns.includes("<h2 id=\"specimens\">Specimens</h2>"));
assert.ok(
  designSystemPatterns.includes(
    '<h2 id="presentation-profiles">Presentation profiles</h2>',
  ),
);
assert.ok(
  designSystemPatterns.includes(
    'data-surface-presentation-profile="judgmentkit.workbench.operational-v1"',
  ),
);
assert.ok(designSystemPatterns.includes("Surface presentation profiles"));
assert.ok(designSystemPatterns.includes('data-specimen-id="pattern.workbench"'));
assert.ok(designSystemPatterns.includes('data-pattern-region="work-queue"'));
assert.ok(designSystemPatterns.includes('data-pattern-control="decision-action"'));
assert.ok(designSystemPatterns.includes('data-pattern-contract="workbench"'));
assert.ok(designSystemPatterns.includes('data-surface-type="operator_review"'));
assert.ok(designSystemPatterns.includes("required regions"));
assert.equal(
  (designSystemPatterns.match(/data-specimen-id="pattern\.[^"]+"/g) ?? []).length,
  patternContractsExport.contracts.length,
  "The pattern page must render one live specimen root per surface contract.",
);
assert.equal(
  (designSystemPatterns.match(/<details class="design-system-specimen-details">/g) ?? [])
    .length,
  patternContractsExport.contracts.length,
  "Every pattern must expose one on-demand metadata disclosure.",
);
assert.doesNotMatch(
  designSystemPatterns,
  /class="design-system-specimen-support"/,
  "Pattern metadata must not occupy a permanent side panel beside the specimen.",
);
assert.doesNotMatch(
  designSystemPatterns,
  /<details class="design-system-specimen-details"[^>]*\sopen(?:\s|>)/,
  "Pattern metadata disclosures must be collapsed by default.",
);
assert.ok(siteCss.includes("--jk-color-surface: #ffffff;"));
assert.ok(
  siteCss.includes(
    ".design-system-specimen[data-pattern-specimen] .design-system-specimen-body {\n  display: block;\n}",
  ),
  "Pattern specimen bodies must reserve the full row for the live surface.",
);
assert.ok(
  siteCss.includes(
    "grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));",
  ),
  "Pattern regions should use the available specimen width before wrapping.",
);
assert.ok(siteCss.includes("--jk-color-surface: #181d1b;"));
assert.ok(
  cssRuleBody(siteCss, ".design-system-search input").includes(
    "background: var(--panel);",
  ),
  "design-system search input must use the appearance-aware panel token",
);
assert.ok(
  cssRuleBody(siteCss, ".design-system-search button").includes(
    "color: var(--accent-ink);",
  ),
  "design-system search button must use the on-accent token",
);
assert.ok(designSystemAccessibility.includes("<h1>Accessibility</h1>"));
assert.ok(designSystemAccessibility.includes("WCAG 2.2 AA"));
assert.ok(designSystemAccessibility.includes("Normal text contrast target: 4.5:1."));
assert.ok(designSystemAccessibility.includes('data-accessibility-contract="keyboard_and_focus"'));
assert.ok(designSystemComponentsMarkdown.includes("## Component Contracts"));
assert.ok(designSystemComponentsMarkdown.includes("## Coverage"));
assert.ok(designSystemComponentsMarkdown.includes("128/128 families"));
assert.ok(designSystemComponentsMarkdown.includes("354/354 variants"));
assert.ok(
  designSystemComponentsMarkdown.includes(
    "17/17 contract IDs have local implementation candidates",
  ),
);
assert.ok(
  designSystemComponentsMarkdown.includes(
    `${componentRegistryExport.scenarios.filter((scenario) => scenario.status === "verified").length}/65 required states currently verified`,
  ),
);
assert.ok(designSystemPatternsMarkdown.includes("## Surface Pattern Contracts"));
assert.ok(designSystemPatternsMarkdown.includes("## Presentation Profiles"));
assert.ok(
  designSystemPatternsMarkdown.includes(
    "`judgmentkit.workbench.operational-v1` (workbench, supported)",
  ),
);
assert.ok(designSystemAccessibilityMarkdown.includes("## Evidence Groups"));
assert.ok(designSystemComponentsMarkdown.includes("## Specimens"));
assert.ok(designSystemPatternsMarkdown.includes("## Specimens"));
const lucideSmokeProof = fs.readFileSync(
  path.join(tempDir, "examples", "lucide-icon-catalog-smoke.html"),
  "utf8",
);
assert.equal((lucideSmokeProof.match(/data-catalog-icon=/g) ?? []).length, 1737);
assert.ok(siteCss.includes(".design-system-page"));
assert.ok(siteCss.includes(".design-system-foundation-list"));
assert.ok(siteCss.includes(".design-system-table"));
assert.ok(siteCss.includes(".design-system-search"));
assert.ok(siteCss.includes(".design-system-example-grid"));
assert.ok(siteCss.includes(".design-system-specimen-list"));
assert.ok(siteCss.includes(".jk-specimen-preview"));
assert.ok(siteCss.includes(".design-icon-index-list"));
assert.ok(siteCss.includes(".design-icon-index-card"));
assert.ok(siteCss.includes(".design-icon-symbol svg"));
assert.ok(designSystemLlms.includes("# JudgmentKit Design System"));
assert.ok(designSystemLlms.includes("Canonical active design-system source"));
assert.ok(designSystemLlms.includes("/design-system/"));
assert.ok(designSystemLlms.includes("/design-system/index.html.md"));
assert.ok(designSystemLlms.includes("/design-system/manifest.json"));
assert.ok(designSystemLlms.includes("/design-system/component-inventory.json"));
assert.ok(designSystemLlms.includes("/design-system/component-registry.json"));
assert.ok(designSystemLlms.includes("/design-system/component-contracts.json"));
assert.ok(designSystemLlms.includes("/design-system/pattern-contracts.json"));
assert.ok(
  designSystemLlms.includes(
    "/design-system/surface-presentation-profiles.json",
  ),
);
assert.ok(designSystemLlms.includes("/design-system/component-specimens.json"));
assert.ok(designSystemLlms.includes("/design-system/pattern-specimens.json"));
assert.ok(designSystemLlms.includes("/design-system/specimen-provenance.json"));
assert.ok(designSystemLlms.includes("/design-system/accessibility-policy.json"));
assert.ok(designSystemLlms.includes("/examples/lucide-icon-catalog-smoke.html"));
assert.ok(designSystemLlmsFull.includes("## Principles"));
assert.equal(designSystemLlmsFull.includes("## Icon Examples"), false);
assert.ok(designSystemLlmsFull.includes("Common interface meanings such as status"));
assert.ok(designSystemLlmsFull.includes("## Specimens"));
assert.ok(designSystemLlmsFull.includes("## Component Contracts"));
assert.ok(designSystemLlmsFull.includes("## Surface Pattern Contracts"));
assert.equal(designSystemLlmsFull.includes("data-catalog-icon"), false);
assert.equal(designSystemLlmsFull.includes("Agent Consumption"), false);
assert.equal(designSystemManifest.exports.llms, "/design-system/llms.txt");
assert.equal(designSystemManifest.exports.visual_token_adapter, "/design-system/visual-token-adapter.json");
assert.equal(
  designSystemManifest.exports.component_inventory,
  "/design-system/component-inventory.json",
);
assert.equal(
  designSystemManifest.exports.component_registry,
  "/design-system/component-registry.json",
);
assert.equal(designSystemManifest.exports.component_contracts, "/design-system/component-contracts.json");
assert.equal(designSystemManifest.exports.pattern_contracts, "/design-system/pattern-contracts.json");
assert.equal(
  designSystemManifest.exports.surface_presentation_profiles,
  "/design-system/surface-presentation-profiles.json",
);
assert.equal(designSystemManifest.exports.component_specimens, "/design-system/component-specimens.json");
assert.equal(designSystemManifest.exports.pattern_specimens, "/design-system/pattern-specimens.json");
assert.equal(designSystemManifest.exports.specimen_provenance, "/design-system/specimen-provenance.json");
assert.equal(designSystemManifest.exports.accessibility_policy, "/design-system/accessibility-policy.json");
assert.equal(designSystemManifest.section, "JudgmentKit Design System");
assert.equal(
  designSystemManifest.purpose,
  "Active default design-system source for implementation contracts.",
);
assert.ok(designSystem.includes("active design-system source"));
assert.ok(designSystem.includes("implementation_contract.design_system_source"));
assert.ok(designSystem.includes("external_design_system"));
assert.ok(designSystem.includes("complete"));
assert.ok(designSystem.includes("design_system_adapter"));
assert.ok(designSystem.includes("missing authorities do not fall back to JudgmentKit defaults"));
assert.ok(designSystemMarkdown.includes("active design-system source"));
assert.equal(designSystemManifest.purpose.includes("Human reference"), false);
assert.equal(
  designSystemManifest.source.design_system_contract_id,
  "judgmentkit.ai-native-default.contract-v1",
);
assert.equal(designSystemManifest.source.lucide.package, "lucide-static");
assert.equal(designSystemManifest.source.lucide.version, "1.21.0");
assert.equal(designSystemManifest.source.lucide.icon_count, 1737);
assert.ok(
  visualTokenAdapterExport.css_custom_properties.some(
    (entry) => entry.name === "--jk-color-surface" && entry.value === "#ffffff",
  ),
);
assert.equal(visualTokenAdapterExport.appearance_policy.default_mode, "system");
assert.equal(visualTokenAdapterExport.appearance_policy.visible_toggle_default, false);
assert.deepEqual(visualTokenAdapterExport.appearance_policy.supported_modes, [
  "light",
  "dark",
  "system",
]);
assert.ok(
  visualTokenAdapterExport.appearance_token_sets.some(
    (entry) =>
      entry.mode === "dark" &&
      entry.color_scheme === "dark" &&
      entry.css_custom_properties.some(
        (token) => token.name === "--jk-color-surface" && token.value === "#181d1b",
      ),
  ),
);
assert.equal(componentContractsExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(componentContractsExport.contracts.length, 17);
assert.ok(componentContractsExport.contracts.some((entry) => entry.id === "action_button"));
const actionButtonSpecimen = componentSpecimensExport.specimens.find(
  (entry) => entry.contract_id === "action_button",
);
assert.ok(actionButtonSpecimen, "action_button should have a rendered specimen");
assert.ok(
  actionButtonSpecimen.rendered_html.includes(
    'data-component-runtime="judgmentkit/react"',
  ),
);
assert.ok(
  actionButtonSpecimen.rendered_html.includes(
    'class="jk-action-button" type="button"',
  ),
);
for (const state of ["ready", "disabled", "focus-visible", "loading"]) {
  assert.ok(
    actionButtonSpecimen.rendered_html.includes(
      `data-scenario-id="action_button.${state}"`,
    ),
    `action_button should SSR its ${state} scenario`,
  );
  assert.ok(
    actionButtonSpecimen.rendered_html.includes(`data-contract-state="${state}"`),
    `action_button should expose its ${state} contract state`,
  );
}
assert.ok(
  actionButtonSpecimen.rendered_html.includes(
    'disabled="" aria-busy="true" data-jk-component="action_button" data-jk-state="loading"',
  ),
  "action_button loading should prevent repeat activation and expose busy state",
);
assert.ok(
  actionButtonSpecimen.rendered_html.includes(
    '<span class="jk-action-button__progress" aria-hidden="true"></span>',
  ),
);
assert.ok(actionButtonSpecimen.rendered_html.includes("Approving refund…"));
assert.equal(actionButtonSpecimen.rendered_html.includes("jk-sample-"), false);
assert.match(
  componentSpecimenCss,
  /\.jk-action-button__label\{[^}]*white-space:nowrap/,
  "The adapter CSS must preserve concise action labels on one line.",
);
assert.match(
  componentSpecimenCss,
  /\.jk-action-button__progress,\.jk-status-message__progress\{[^}]*animation:jk-component-spin \.8s linear infinite/,
  "The adapter CSS must visibly distinguish loading states.",
);
assert.match(
  componentSpecimenCss,
  /@keyframes jk-component-spin\{to\{rotate:360deg}}/,
);
assert.match(
  componentSpecimenCss,
  /@media\(prefers-reduced-motion:reduce\)\{\.jk-action-button__progress,\.jk-status-message__progress\{animation:none;/,
  "The adapter CSS must retain a reduced-motion loading treatment.",
);
assert.match(
  componentSpecimenCss,
  /\.jk-alert\{[^}]*container-name:jk-alert;container-type:inline-size;/,
  "Alert must respond to its own composed width instead of only the viewport.",
);
assert.match(
  componentSpecimenCss,
  /@container jk-alert \(max-width: 18rem\)\{\.jk-alert__cue,\.jk-alert__content,\.jk-alert__action\{grid-column:1 \/ -1}/,
  "A constrained Alert must stack its cue, content, and embedded action.",
);
assert.match(
  componentSpecimenCss,
  /@container jk-alert \(max-width: 10rem\)\{\.jk-alert__action \.jk-action-button\{inline-size:100%}\.jk-alert__action \.jk-action-button__label\{white-space:normal;overflow-wrap:anywhere}/,
  "An Alert action must retain its button boundary even under extreme width pressure.",
);
assert.equal(componentSpecimenCss.includes("jk-sample-"), false);
const actionButtonExport = componentContractsExport.contracts.find(
  (entry) => entry.id === "action_button",
);
assert.ok(
  actionButtonExport.review_checks.some(
    (check) => check.includes("task-specific action phrase") && check.includes("one line"),
  ),
  "The public component contract must publish the concise one-line label rule.",
);
const actionButtonArticle = designSystemComponents.match(
  /<article class="design-system-specimen" id="action-button"[\s\S]*?<\/article>/,
)?.[0];
assert.ok(actionButtonArticle, "The public component page must render the action-button article.");
assert.ok(
  actionButtonArticle.includes("review_checks") &&
    actionButtonArticle.includes("failure_signals") &&
    actionButtonArticle.includes("state metadata") &&
    actionButtonArticle.includes("aria-busy"),
  "The action-button specimen excerpt must expose its one-line, state, loading, and failure rules.",
);
assert.ok(
  componentContractsExport.contracts
    .find((entry) => entry.id === "dialog")
    .accessibility_checks.includes("focus management"),
);
const selectFieldContract = componentContractsExport.contracts.find(
  (entry) => entry.id === "select_field",
);
assert.ok(selectFieldContract.anatomy.includes("selected value"));
assert.ok(selectFieldContract.anatomy.includes("trailing indicator slot"));
assert.ok(selectFieldContract.anatomy.includes("indicator"));
assert.ok(
  selectFieldContract.failure_signals.includes(
    "custom field equates selected-value start padding with the chevron's physical end inset",
  ),
);
assert.ok(
  visualTokenAdapterExport.css_custom_properties.some(
    (entry) =>
      entry.name === "--jk-select-value-start-space" && entry.value === "1rem",
  ),
);
assert.ok(
  visualTokenAdapterExport.css_custom_properties.some(
    (entry) =>
      entry.name === "--jk-select-indicator-slot-width" && entry.value === "3rem",
  ),
);
assert.ok(
  visualTokenAdapterExport.css_custom_properties.some(
    (entry) =>
      entry.name === "--jk-select-indicator-size" && entry.value === "1rem",
  ),
);
assert.equal(patternContractsExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(patternContractsExport.contracts.length, 8);
assert.ok(patternContractsExport.contracts.some((entry) => entry.id === "workbench"));
assert.equal(
  patternContractsExport.contracts.find((entry) => entry.id === "operator_review")
    .surface_type,
  "operator_review",
);
assert.equal(
  surfacePresentationProfilesExport.source,
  "judgmentkit.design-system.source-v1",
);
assert.equal(
  surfacePresentationProfilesExport.contract_source,
  "judgmentkit.ai-native-default.contract-v1",
);
assert.equal(
  surfacePresentationProfilesExport.visual_token_adapter_id,
  visualTokenAdapterExport.id,
);
assert.deepEqual(
  surfacePresentationProfilesExport.profiles,
  listSurfacePresentationProfiles(),
);
assert.equal(surfacePresentationProfilesExport.profiles.length, 2);
const workbenchPresentationProfile = surfacePresentationProfilesExport.profiles.find(
  (entry) => entry.id === "judgmentkit.workbench.operational-v1",
);
assert.ok(workbenchPresentationProfile);
assert.equal(workbenchPresentationProfile.id, "judgmentkit.workbench.operational-v1");
assert.equal(workbenchPresentationProfile.status, "supported");
assert.equal(workbenchPresentationProfile.surface_type, "workbench");
assert.equal(workbenchPresentationProfile.authority.public_contract, true);
assert.equal(workbenchPresentationProfile.authority.runtime_renderer, false);
assert.equal(workbenchPresentationProfile.authority.pattern_contract_id, "workbench");
assert.ok(
  patternContractsExport.contracts.some(
    (entry) =>
      entry.id === workbenchPresentationProfile.authority.pattern_contract_id &&
      entry.surface_type === workbenchPresentationProfile.surface_type,
  ),
  "the supported Workbench presentation profile must bind to the public Workbench pattern contract",
);
const artifactInspectorPresentationProfile =
  surfacePresentationProfilesExport.profiles.find(
    (entry) => entry.id === "judgmentkit.artifact-inspector.v1",
  );
assert.ok(artifactInspectorPresentationProfile);
assert.equal(artifactInspectorPresentationProfile.status, "proposed");
assert.equal(artifactInspectorPresentationProfile.surface_type, "artifact_inspector");
assert.equal(artifactInspectorPresentationProfile.authority.public_contract, true);
assert.equal(artifactInspectorPresentationProfile.authority.runtime_renderer, false);
assert.equal(
  artifactInspectorPresentationProfile.authority.pattern_contract_id,
  "artifact-inspector",
);
assert.equal(
  artifactInspectorPresentationProfile.provenance.external_artifact_review_status,
  "external_not_reviewed",
);
const contractIds = componentContractsExport.contracts.map((entry) => entry.id);
const registryIds = componentRegistryExport.registry.map(
  (entry) => entry.contract_id,
);
assert.equal(
  componentRegistryExport.source,
  "judgmentkit.ai-native-default.contract-v1",
);
assert.equal(
  componentRegistryExport.adapter.id,
  "judgmentkit.react-components.candidate-v1",
);
assert.equal(componentRegistryExport.adapter.package_export, "judgmentkit/react");
assert.equal(
  componentRegistryExport.adapter.stylesheet_export,
  "judgmentkit/react/styles.css",
);
assert.deepEqual(componentRegistryExport.renderer_components, RUNTIME_COMPONENT_IDS);
assert.equal(componentRegistryExport.registry.length, 17);
assert.deepEqual(registryIds, contractIds);
assert.equal(
  (designSystemComponents.match(/data-component-contract=/g) ?? []).length,
  17,
  "The public page must retain every semantic component contract.",
);
for (const contractId of contractIds) {
  assert.ok(
    designSystemComponents.includes(`data-component-contract="${contractId}"`),
    `${contractId} should remain listed on the component page`,
  );
}
const implementedRegistryIds = componentRegistryExport.registry
  .filter((entry) => entry.implementation_status === "implemented")
  .map((entry) => entry.contract_id);
assert.deepEqual(implementedRegistryIds, RUNTIME_COMPONENT_IDS);
for (const entry of componentRegistryExport.registry) {
  const isRuntimeCandidate = RUNTIME_COMPONENT_IDS.includes(entry.contract_id);
  assert.equal(
    entry.implementation_status,
    isRuntimeCandidate ? "implemented" : "not_implemented",
  );
  assert.equal(
    entry.package_export,
    isRuntimeCandidate ? "judgmentkit/react" : null,
  );
  assert.equal(
    entry.stylesheet_export,
    isRuntimeCandidate ? "judgmentkit/react/styles.css" : null,
  );
}
assert.equal(componentSpecimensExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(
  componentSpecimensExport.renderer.id,
  "judgmentkit.react-components.candidate-v1",
);
assert.equal(componentSpecimensExport.renderer.package_export, "judgmentkit/react");
assert.equal(
  componentSpecimensExport.renderer.stylesheet_export,
  "judgmentkit/react/styles.css",
);
assert.deepEqual(
  componentSpecimensExport.specimens.map((entry) => entry.contract_id),
  RUNTIME_COMPONENT_IDS,
);
assert.equal(componentSpecimensExport.contract_coverage.length, 17);
assert.equal(componentSpecimenCss.includes("jk-sample-"), false);
for (const selector of [
  ".jk-form-field",
  ".jk-text-field",
  ".jk-action-button",
  ".jk-action-group",
  ".jk-text-area",
  ".jk-select-field",
  ".jk-choice-group",
  ".jk-toggle",
  ".jk-tabs",
  ".jk-menu",
  ".jk-dialog",
  ".jk-alert",
  ".jk-table",
  ".jk-panel",
  ".jk-card",
  ".jk-status-message",
]) {
  assert.ok(
    componentSpecimenCss.includes(selector),
    `The optional adapter stylesheet should include ${selector}.`,
  );
}
assert.equal(patternSpecimensExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(patternSpecimensExport.renderer.id, "judgmentkit-static-specimens");
assert.equal(patternSpecimensExport.specimens.length, patternContractsExport.contracts.length);
assert.equal(specimenProvenanceExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(
  specimenProvenanceExport.design_system_contract_hash,
  hashCanonical(defaultDesignSystem),
);
assert.equal(
  specimenProvenanceExport.token_hash,
  hashCanonical({
    css_custom_properties: visualTokenAdapterExport.css_custom_properties,
    appearance_policy: visualTokenAdapterExport.appearance_policy,
    appearance_token_sets: visualTokenAdapterExport.appearance_token_sets,
  }),
);
assert.equal(
  specimenProvenanceExport.icon_catalog_hash,
  hashCanonical(visualTokenAdapterExport.icon_catalog),
);

for (const contract of componentContractsExport.contracts) {
  const registryEntry = componentRegistryExport.registry.find(
    (entry) => entry.contract_id === contract.id,
  );
  const coverage = componentSpecimensExport.contract_coverage.find(
    (entry) => entry.contract_id === contract.id,
  );
  const scenarios = componentRegistryExport.scenarios.filter(
    (entry) => entry.contract_id === contract.id,
  );
  const verifiedStates = scenarios
    .filter((entry) => entry.status === "verified")
    .map((entry) => entry.state);
  const unverifiedStates = scenarios
    .filter((entry) => entry.status !== "verified")
    .map((entry) => entry.state);

  assert.ok(registryEntry, `${contract.id} should have one registry entry`);
  assert.ok(coverage, `${contract.id} should have one coverage entry`);
  assert.deepEqual(
    scenarios.map((entry) => entry.state),
    contract.required_states,
    `${contract.id} scenarios should follow the canonical required states`,
  );
  assert.deepEqual(coverage.required_states, contract.required_states);
  assert.deepEqual(
    coverage.covered_states,
    verifiedStates,
    `${contract.id} coverage must come only from verified scenario evidence`,
  );
  assert.deepEqual(
    coverage.unverified_states,
    unverifiedStates,
    `${contract.id} pending coverage must follow current scenario evidence`,
  );

  const specimen = componentSpecimensExport.specimens.find(
    (entry) => entry.contract_id === contract.id,
  );
  const isRuntimeCandidate = RUNTIME_COMPONENT_IDS.includes(contract.id);
  if (!isRuntimeCandidate) {
    assert.equal(specimen, undefined, `${contract.id} must not claim a runtime specimen`);
    assert.equal(
      designSystemComponents.includes(`data-specimen-id="component.${contract.id}"`),
      false,
      `${contract.id} must remain contract-only on the public page`,
    );
    continue;
  }

  assert.ok(specimen, `${contract.id} should have a React candidate specimen`);
  assert.equal(specimen.package_export, "judgmentkit/react");
  assert.equal(specimen.stylesheet_export, "judgmentkit/react/styles.css");
  assert.equal(specimen.public_export, registryEntry.public_export);
  assert.equal(specimen.contract_hash, hashCanonical(contract));
  assert.equal(specimen.output_hash, hashText(specimen.rendered_html));
  assert.deepEqual(specimen.required_states, contract.required_states);
  assert.deepEqual(specimen.covered_states, verifiedStates);
  assert.deepEqual(specimen.unverified_states, unverifiedStates);
  assert.equal(
    specimen.selectors.root,
    `[data-specimen-id="component.${contract.id}"]`,
  );
  assert.ok(
    specimen.rendered_html.includes('data-component-runtime="judgmentkit/react"'),
    `${contract.id} should SSR the public React export`,
  );
  assert.ok(
    specimen.rendered_html.includes(`data-jk-component="${contract.id}"`),
    `${contract.id} should SSR its runtime component marker`,
  );
  assert.ok(
    designSystemComponents.includes(`data-specimen-id="component.${contract.id}"`),
    `${contract.id} specimen root should render`,
  );
  const articleMarker = `<article class="design-system-specimen" id="${specimen.anchor.slice(1)}" data-component-specimen="${contract.id}">`;
  const articleStart = designSystemComponents.indexOf(articleMarker);
  const nextArticleStart = designSystemComponents.indexOf(
    '<article class="design-system-specimen"',
    articleStart + articleMarker.length,
  );
  const specimenArticle = designSystemComponents.slice(
    articleStart,
    nextArticleStart === -1 ? undefined : nextArticleStart,
  );
  assert.notEqual(
    articleStart,
    -1,
    `${contract.id} should have one component-first article`,
  );
  assert.equal(
    (specimenArticle.match(/data-specimen-id="component\.[^"]+"/g) ?? []).length,
    1,
    `${contract.id} must render exactly one live specimen root`,
  );
  assert.ok(
    specimenArticle.includes('<details class="design-system-specimen-details">'),
    `${contract.id} should keep contract and evidence metadata in one disclosure`,
  );
  for (const scenario of scenarios) {
    assert.ok(
      specimen.selectors.states[scenario.state],
      `${contract.id} should expose a selector for ${scenario.state}`,
    );
    assert.ok(
      specimen.rendered_html.includes(`data-scenario-id="${scenario.id}"`),
      `${contract.id} should SSR ${scenario.id}`,
    );
    assert.ok(
      specimen.rendered_html.includes(
        `data-scenario-status="${scenario.status}"`,
      ),
      `${scenario.id} should expose its current evidence status`,
    );
  }
  for (const anatomy of contract.anatomy) {
    const anatomyAttribute = `data-component-anatomy="${anatomy.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}"`;
    assert.ok(
      specimenArticle.includes(anatomyAttribute),
      `${contract.id} should retain its contract anatomy evidence in its disclosure`,
    );
    assert.equal(
      specimen.rendered_html.includes(anatomyAttribute),
      false,
      `${contract.id} anatomy metadata must stay out of the live preview`,
    );
  }
}
assert.equal(
  componentSpecimensExport.specimens.some((entry) =>
    entry.rendered_html.includes("jk-sample-"),
  ),
  false,
  "Component specimen output must not retain legacy hand-authored samples.",
);

for (const contract of patternContractsExport.contracts) {
  const specimen = patternSpecimensExport.specimens.find(
    (entry) => entry.contract_id === contract.id,
  );
  assert.ok(specimen, `${contract.id} should have a pattern specimen`);
  assert.equal(specimen.contract_hash, hashCanonical(contract));
  assert.equal(specimen.output_hash, hashText(specimen.rendered_html));
  assert.equal(
    specimen.selectors.root,
    `[data-specimen-id="pattern.${contract.id}"]`,
  );
  assert.ok(
    designSystemPatterns.includes(`data-specimen-id="pattern.${contract.id}"`),
    `${contract.id} specimen root should render`,
  );
  const articleMarker = `<article class="design-system-specimen" id="${specimen.anchor.slice(1)}" data-pattern-specimen="${contract.id}">`;
  const articleStart = designSystemPatterns.indexOf(articleMarker);
  const nextArticleStart = designSystemPatterns.indexOf(
    '<article class="design-system-specimen"',
    articleStart + articleMarker.length,
  );
  const specimenArticle = designSystemPatterns.slice(
    articleStart,
    nextArticleStart === -1 ? undefined : nextArticleStart,
  );
  assert.notEqual(articleStart, -1, `${contract.id} should have one pattern-first article`);
  assert.equal(
    (specimenArticle.match(/data-specimen-id="pattern\.[^"]+"/g) ?? []).length,
    1,
    `${contract.id} must render exactly one live pattern root`,
  );
  assert.ok(
    specimenArticle.includes('<summary>Pattern details</summary>'),
    `${contract.id} should keep supporting metadata on demand`,
  );
  assert.equal(specimen.surface_type, contract.surface_type);
  for (const region of contract.required_regions) {
    assert.ok(specimen.covered_regions.includes(region), `${contract.id} should cover ${region}`);
    assert.ok(specimen.selectors.regions[region], `${contract.id} should expose selector for ${region}`);
    assert.ok(
      specimen.rendered_html.includes(`data-pattern-region="${region.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}"`),
      `${contract.id} should render region ${region}`,
    );
  }
  for (const control of contract.expected_controls) {
    assert.ok(specimen.covered_controls.includes(control), `${contract.id} should cover ${control}`);
    assert.ok(specimen.selectors.controls[control], `${contract.id} should expose selector for ${control}`);
    assert.ok(
      specimen.rendered_html.includes(`data-pattern-control="${control.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}"`),
      `${contract.id} should render control ${control}`,
    );
  }
}

assert.deepEqual(
  specimenProvenanceExport.component_specimens.map((entry) => entry.id),
  componentSpecimensExport.specimens.map((entry) => entry.id),
);
assert.deepEqual(
  specimenProvenanceExport.pattern_specimens.map((entry) => entry.id),
  patternSpecimensExport.specimens.map((entry) => entry.id),
);
assert.ok(specimenProvenanceExport.proof_scope.includes("do not replace"));
assert.equal(accessibilityPolicyExport.standards_profile.baseline, "WCAG 2.2 AA");
assert.equal(accessibilityPolicyExport.contrast_targets.normal_text_min_ratio, 4.5);
assert.equal(visualTokenAdapterExport.icon_catalog.package, "lucide-static");
assert.equal(visualTokenAdapterExport.icon_catalog.version, "1.21.0");
assert.equal(visualTokenAdapterExport.icon_catalog.icon_count, 1737);
assert.deepEqual(iconScenariosExport.mcp_tools, [
  "list_icon_catalog",
  "search_icon_catalog",
  "get_icon_svg",
]);
assert.equal(iconScenariosExport.source.package, "lucide-static");
assert.equal(iconScenariosExport.source.version, "1.21.0");
assert.equal(iconScenariosExport.source.icon_count, 1737);
assert.equal(iconScenariosExport.scenarios.length, 16);
assert.equal(iconScenariosExport.scenarios.some((scenario) => "inline_svg" in scenario), false);
assert.ok(
  iconScenariosExport.scenarios.some(
    (scenario) => scenario.intent === "Show a completed status beside a visible result label.",
  ),
);
assert.ok(iconScenariosExport.scenarios.some((scenario) => scenario.selected_icon_id === "receipt-text"));

const value = fs.readFileSync(path.join(tempDir, "value", "index.html"), "utf8");
const valuePrimaryStory = value
  .split('<section class="section value-page">')[1]
  .split('<section class="value-evidence"')[0];
assertAnalyticsBootstrap(value, "value");
assert.ok(value.includes('<a href="/value/" aria-current="page">Value</a>'));
assert.ok(value.includes('class="site-shell value-shell"'));
assert.ok(value.includes('class="site-page-header site-page-header-wide value-hero"'));
assert.ok(value.includes("What JudgmentKit Prevents"));
assert.ok(value.includes("What JudgmentKit prevents"));
assert.ok(value.includes("JudgmentKit catches when AI-generated UI turns implementation mechanics into UX"));
assert.equal(valuePrimaryStory.includes('aria-label="Value page actions"'), false);
assert.equal(valuePrimaryStory.includes('class="hero-actions"'), false);
assert.equal(valuePrimaryStory.includes("Install JudgmentKit"), false);
assert.equal(valuePrimaryStory.includes("Review examples"), false);
assert.ok(value.includes("Implementation language leak"));
assert.ok(value.includes("Internal objects stop becoming the product surface."));
assert.ok(value.includes("Unsafe action boundary"));
assert.ok(value.includes("Approval work gets a human decision point."));
assert.ok(value.includes("Missing accessibility evidence"));
assert.ok(value.includes("Claims are not accepted without evidence."));
assert.ok(value.includes("Baseline failure"));
assert.ok(value.includes("JudgmentKit catches"));
assert.ok(value.includes("Repaired outcome"));
assert.ok(value.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png"));
assert.ok(value.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-with-judgmentkit.png"));
assert.ok(value.includes("Public evaluation report"));
assert.ok(value.includes("Latest committed eval report"));
assert.ok(value.includes("Eval catalog JSON"));
assert.ok(value.includes(`current hosted MCP release is ${packageJson.version}`));
assert.ok(value.includes("historical committed eval artifacts"));
assert.ok(value.includes("not current release acceptance proof"));
assert.ok(value.includes("only the evidence intended for external audit"));
for (const privatePilotWording of [
  "Older pilot packets",
  "pilot packets",
  "pilot material",
  "MCP pilot material",
]) {
  assert.equal(
    value.includes(privatePilotWording),
    false,
    `/value/ should not mention private pilot archive framing: ${privatePilotWording}`,
  );
}
assert.equal(value.includes("Latest MCP pilot report"), false);
assert.equal(value.includes("Latest LLM evidence"), false);
assert.equal(value.includes("Milestone proof packet"), false);
assert.equal(value.includes("/evals/mcp-pilot/"), false);
assert.equal(value.includes("mcp-0.2.0"), false);
assert.ok(value.includes("/examples/one-shot-demo.html"));
assert.equal(valuePrimaryStory.includes("MCP"), false);
assert.ok(siteCss.includes(".value-page"));
assert.ok(siteCss.includes(".value-case"));
assert.ok(siteCss.includes(".value-screenshot-pair"));
assert.ok(siteCss.includes(".value-receipt"));
assert.ok(
  cssRuleBody(siteCss, ".value-findings div").includes(
    "background: var(--soft-surface);",
  ),
  "value finding cards must use the appearance-aware soft-surface token",
);
assertValueAppearanceContract(value, siteCss);
assert.throws(
  () =>
    assertValueAppearanceContract(
      value,
      siteCss.replace(
        /(\.value-findings div\s*\{[^}]*?)background: var\(--soft-surface\);/s,
        "$1background: #fbfaf6;",
      ),
    ),
  /value finding card rule should include background: var\(--soft-surface\);/,
  "production appearance verification must reject a light-only value card",
);
assert.throws(
  () =>
    assertValueAppearanceContract(
      value,
      siteCss.replace("--soft-surface: #151a18;", "--soft-surface: #fbfaf6;"),
    ),
  /site CSS dark appearance root should include --soft-surface: #151a18;/,
  "production appearance verification must reject a stale dark token",
);

const examples = fs.readFileSync(path.join(tempDir, "examples", "index.html"), "utf8");
const experimentRoute = "/experiments/netflix-library";
assertAnalyticsBootstrap(examples, "examples");
assert.ok(examples.includes('class="site-shell examples-shell"'));
assert.ok(examples.includes('class="site-page-header examples-hero"'));
for (const publicIndex of [
  ["homepage", homepage],
  ["docs", docs],
  ["examples", examples],
  ["llms", llms],
]) {
  assert.equal(
    publicIndex[1].includes(experimentRoute),
    false,
    `${publicIndex[0]} must not link to the unlisted Netflix experiment`,
  );
}
assert.equal(examples.includes('<div class="examples-intro">'), false);
assert.equal(examples.includes("Static artifacts"), false);
assert.equal(examples.includes("captured-fixture model UI paths"), false);
assert.equal(examples.includes('class="examples-browser" data-examples-browser'), false);
assert.equal(examples.includes('class="examples-rail" aria-label="Examples list"'), false);
assert.equal(examples.includes('class="example-menu" data-example-menu'), false);
assert.equal(examples.includes("<summary>Browse examples</summary>"), false);
assert.ok(examples.includes("<h1>Examples</h1>"));
assert.ok(examples.includes("Start with the replayable AI-native contract examples"));
assert.ok(examples.includes("AI-native design system"));
assert.ok(examples.includes("First-use loop and canonical contract cases"));
assert.ok(examples.includes("/examples/ai-native-design-system/first-use.json"));
assert.ok(examples.includes("/examples/ai-native-design-system/canonical-examples.json"));
assert.ok(examples.includes("/design-system/icons/"));
assert.ok(examples.includes("/examples/lucide-icon-catalog-smoke.html"));
assert.ok(examples.includes("ED flow board MVP"));
assert.ok(examples.includes("/examples/er-flow-dashboard/"));
assert.ok(examples.includes("room occupancy, waiting acuity, turnover, holds, and charge-team next moves"));
assert.ok(examples.includes("The active design-system source supplies token roles"));
assert.ok(examples.includes("component contracts, and provenance expectations"));
assert.ok(examples.includes("The design-system icon page is the reference surface"));
assert.ok(examples.includes("this HTML remains the deterministic regression proof"));
assert.ok(examples.includes("Model UI matrix"));
assert.ok(examples.includes("These matrix examples compare"));
assert.ok(examples.includes('class="model-ui-use-case-select" data-use-case-select aria-label="Use case"'));
assert.equal(examples.includes("<span>Use case</span>"), false);
assert.ok(siteCss.includes(".model-ui-use-case-select"));
assert.ok(siteCss.includes("appearance: none;"));
assert.ok(siteCss.includes("background-position: right 14px center;"));
assert.equal(siteCss.includes(".model-ui-use-case-select-label"), false);
assert.equal(examples.includes('class="model-ui-use-case-rail" aria-label="Model UI use cases"'), false);
assert.equal(examples.includes('class="model-ui-use-case-menu" data-use-case-menu'), false);
assert.equal(examples.includes("<summary>Use cases</summary>"), false);
assert.equal(examples.includes('class="model-ui-use-case-button"'), false);
assert.equal(examples.includes("<span>Refund triage"), false);
assert.equal(examples.includes("<span>Field dispatch"), false);
assert.equal(examples.includes("A field operations manager assigns, reschedules, or escalates a repair visit using route, parts, and SLA constraints.</span>"), false);
assert.ok(examples.includes('data-model-ui-examples'));
assert.ok(examples.includes('aria-label="Model UI generation matrix"'));
assert.equal(examples.includes("<iframe"), false);
assert.equal(examples.includes("data-example-frame"), false);
assert.equal(examples.includes("Inline preview"), false);
assert.ok(examples.includes('class="example-preview-body" data-model-ui-preview'));
assert.ok(examples.includes('class="example-gallery" aria-label="Model UI screenshot gallery"'));
assert.ok(examples.includes('class="example-matrix-table"'));
assert.ok(
  examples.includes(
    `aria-label="Model UI ${MODEL_UI_MATRIX_DIMENSIONS_SPOKEN} comparison matrix"`,
  ),
);
assert.ok(examples.includes('class="example-matrix-column-header"'));
assert.ok(examples.includes('class="example-matrix-cell"'));
assert.ok(examples.includes('class="example-matrix-thumb"'));
assert.ok(examples.includes("Diagnostic only"));
assert.ok(examples.includes("diagnostic-only failed-candidate cells"));
assert.ok(examples.includes("Needs repair before evidence"));
assert.ok(examples.includes("Token provenance failed"));
assert.ok(examples.includes("Capture quality failed"));
assert.equal(examples.includes("data-diagnostic-candidate"), false);
assert.equal(examples.includes("gemma4-lms-with-judgmentkit"), false);
assert.equal(examples.includes("gpt55-xhigh-codex-with-judgmentkit"), false);
assert.equal(examples.includes("repair_and_resubmit"), false);
assert.equal(examples.includes("visual_tokens"), false);
assert.equal(examples.includes("static_capture_quality"), false);
assert.equal(examples.includes("/artifacts/gemma4-lms-with-judgmentkit.html"), false);
assert.equal(examples.includes("/screenshots/gemma4-lms-with-judgmentkit.png"), false);
assert.equal(examples.includes("/artifacts/gpt55-xhigh-codex-with-judgmentkit.html"), false);
assert.equal(examples.includes("/screenshots/gpt55-xhigh-codex-with-judgmentkit.png"), false);
const exampleDiagnosticCell = examples.match(
  /<article class="example-matrix-cell example-matrix-cell-diagnostic"[\s\S]*?<\/article>/,
)?.[0] ?? "";
assert.ok(exampleDiagnosticCell.includes("Diagnostic only"));
assert.equal(exampleDiagnosticCell.includes("<a "), false);
assert.equal(exampleDiagnosticCell.includes("href="), false);
assert.equal(exampleDiagnosticCell.includes("data-gallery-open"), false);
assert.equal(examples.includes('class=\\"example-gallery-meta\\"'), false);
assert.equal(examples.includes("3x4 JudgmentKit and Material UI comparison across four use cases"), false);
assert.ok(examples.includes("Raw brief"));
assert.ok(examples.includes("JudgmentKit skill context"));
assert.ok(examples.includes("Material UI only"));
assert.ok(examples.includes("JudgmentKit skill + Material UI"));
assert.equal(examples.includes("Material UI improves visual consistency"), false);
assert.equal(examples.includes("JudgmentKit improves activity fit"), false);
assert.equal(examples.includes("Committed screenshots"), false);
assert.ok(examples.includes('data-example-gallery-modal'));
assert.ok(examples.includes('role="dialog" aria-modal="true"'));
assert.ok(examples.includes("function modalFocusable()"));
assert.ok(examples.includes("function containModalFocus(event)"));
assert.ok(examples.includes('event.key !== "Tab"'));
assert.ok(examples.includes('modal.addEventListener("keydown", containModalFocus)'));
assert.ok(examples.includes('class="example-gallery-modal-close" type="button" data-gallery-close aria-label="Close gallery">&times;</button>'));
assert.equal(examples.includes("pill-link example-gallery-modal-close"), false);
assert.equal(examples.includes(">Close</button>"), false);
assert.ok(siteCss.includes(".example-gallery-modal-close"));
assert.ok(siteCss.includes("position: absolute;"));
assert.ok(siteCss.includes("right: 18px;"));
assert.ok(siteCss.includes("border: 0;"));
assert.ok(siteCss.includes("background: transparent;"));
assert.ok(siteCss.includes("outline: 2px solid var(--accent);"));
const exampleGalleryMetaCss =
  siteCss.match(/\.example-gallery-meta div,\n\.example-gallery-modal-meta div \{[\s\S]*?\}/)?.[0] ?? "";
assert.ok(exampleGalleryMetaCss.includes("background: var(--soft-surface);"));
assert.equal(exampleGalleryMetaCss.includes("#f8f7f1"), false);
assert.ok(examples.includes('data-gallery-open="0"'));
assert.ok(examples.includes('data-gallery-modal-image'));
assert.ok(examples.includes('data-gallery-modal-context'));
assert.ok(examples.includes('data-gallery-modal-render'));
assert.ok(examples.includes('data-gallery-modal-prompt'));
assert.ok(examples.includes('id="model-ui-examples-data"'));
assert.equal(examples.includes('id="examples-data"'), false);
assert.equal(examples.includes("Open default matrix"), false);
assert.equal(examples.includes("Use-case index"), false);
assert.equal(examples.includes(">Open matrix</a>"), false);
assert.equal(examples.includes(">Manifest</a>"), false);
assert.equal(examples.includes("One-shot proof"), false);
assert.equal(examples.includes("Refund triage comparison"), false);
assert.ok(examples.includes("Model UI generation matrix"));
assert.equal(examples.includes("<h2>Model UI generation matrix</h2>"), false);
assert.equal(examples.includes(`<h2>Model UI generation matrix</h2>
                  <p class="lede">Four 3x4 comparisons`), false);
assert.equal(examples.includes("Dinner playlist comparison"), false);
assert.equal(examples.includes('data-example-id="one-shot-proof"'), false);
assert.equal(examples.includes('data-example-id="refund-triage"'), false);
assert.equal(examples.includes('data-example-id="model-ui-system-map"'), false);
assert.equal(examples.includes('data-example-id="dinner-playlist"'), false);
assert.equal(examples.includes("UI generation eval report"), false);
assert.equal(examples.includes('data-example-id="ui-generation-eval"'), false);
assert.equal(examples.includes("/examples/one-shot-demo.html"), false);
assert.equal(examples.includes("/examples/comparison/refund/version-a.html"), false);
assert.equal(examples.includes("/examples/comparison/refund/version-b.html"), false);
assert.ok(examples.includes("/examples/model-ui/refund-system-map/index.html"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-with-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-material-ui-only.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-judgmentkit-material-ui.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-no-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-material-ui-only.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-judgmentkit-material-ui.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-no-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-material-ui-only.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-judgmentkit-material-ui.png"));
assert.equal(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-with-judgmentkit.png"), false);
assert.equal(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-with-judgmentkit.png"), false);
assert.equal(examples.includes("four use cases"), false);
assert.equal(examples.includes("model-ui-use-case-tabs"), false);
assert.equal(examples.includes("model-ui-use-case-tab"), false);
assert.ok(examples.includes('data-gallery-modal-use-case'));
assert.ok(examples.includes("model-ui-system-map"));
assert.ok(examples.includes("useCaseId"));
assert.ok(examples.includes("data-use-case-select"));
assert.ok(examples.includes("Support refund triage"));
assert.ok(examples.includes("Field service dispatch"));
assert.ok(examples.includes("Clinical intake review"));
assert.ok(examples.includes("B2B renewal risk review"));
assert.ok(examples.includes("field operations manager assigns"));
assert.ok(examples.includes("administrative appointment readiness"));
assert.ok(examples.includes("save plan, executive escalation"));
assert.ok(examples.includes("data-use-case-panel"));
assert.ok(examples.includes("refund-system-map"));
assert.ok(examples.includes("field-service-dispatch"));
assert.ok(examples.includes("clinical-intake-review"));
assert.ok(examples.includes("b2b-renewal-risk"));

const modelUiIndex = JSON.parse(
  fs.readFileSync(path.join(tempDir, ...MODEL_UI_INDEX_FILE.split("/")), "utf8"),
);
assert.equal(modelUiIndex.use_cases.length, 4);
assert.equal(modelUiIndex.default_use_case_id, "refund-system-map");

for (const useCase of MODEL_UI_USE_CASES) {
  const useCaseRoute = `/${useCase.index_path}`;
  assert.ok(examples.includes(useCase.label), `${useCase.id} label should appear in examples`);
  assert.ok(examples.includes(useCase.activity_summary), `${useCase.id} summary should appear in examples`);
  assert.ok(examples.includes(useCaseRoute), `${useCase.id} matrix route should appear`);
  assert.equal(
    fs.existsSync(path.join(tempDir, ...useCase.manifest_path.split("/"))),
    true,
    `${useCase.id} manifest route should be copied`,
  );

  const manifest = JSON.parse(
    fs.readFileSync(path.join(tempDir, ...useCase.manifest_path.split("/")), "utf8"),
  );
  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(root, ...useCase.manifest_path.split("/")), "utf8"),
  );
  const sourceDiagnosticCandidatesById = new Map(
    (sourceManifest.diagnostic_candidates ?? []).map((candidate) => [candidate.id, candidate]),
  );
  assert.equal(manifest.use_case_id, useCase.id);
  assert.equal(manifest.use_case_label, useCase.label);
  assert.equal(manifest.legacy_aliases.length, 0);
  assert.equal(manifest.title, `Model UI ${MODEL_UI_MATRIX_DIMENSIONS} comparison matrix`);
  assert.equal(manifest.comparison_rows.length, COMPARISON_ROWS.length);
  assert.equal(manifest.comparison_columns.length, COMPARISON_COLUMNS.length);
  assert.equal(
    manifest.artifacts.length + manifest.diagnostic_candidates.length,
    COMPARISON_ROWS.length * COMPARISON_COLUMNS.length,
    `${useCase.id} should account for every matrix cell`,
  );
  assert.equal(manifest.artifacts.length, sourceManifest.artifacts.length);
  assert.equal(
    manifest.diagnostic_candidates.length,
    sourceManifest.diagnostic_candidates.length,
  );
  for (const [rowId, effort] of [
    ["gpt56-sol-low-codex", "low"],
    ["gpt56-sol-ultra-codex", "ultra"],
  ]) {
    const row = manifest.comparison_rows.find((candidate) => candidate.id === rowId);
    assert.ok(row, `${rowId} should appear in ${useCase.id}`);
    assert.equal(row.cells.length, COMPARISON_COLUMNS.length);
    for (const cell of row.cells) {
      const sourceCapturePath = path.join(
        root,
        useCase.output_dir,
        "captures",
        `${cell.id}.json`,
      );
      assert.equal(
        fs.existsSync(sourceCapturePath),
        true,
        `${useCase.id}/${cell.id} should have a committed Sol capture`,
      );
      const sourceCapture = JSON.parse(fs.readFileSync(sourceCapturePath, "utf8"));
      assert.equal(sourceCapture.model, "gpt-5.6-sol");
      assert.equal(sourceCapture.reasoning_effort, effort);
      const diagnostic = sourceDiagnosticCandidatesById.get(cell.id);
      assert.equal(
        diagnostic?.failed_checks?.includes("capture_missing") ?? false,
        false,
        `${useCase.id}/${cell.id} should never publish as capture-missing`,
      );
    }
  }
  if (useCase.id === "refund-system-map") {
    for (const [rowId, effort] of [
      ["gpt56-sol-low-codex", "low"],
      ["gpt56-sol-ultra-codex", "ultra"],
    ]) {
      const row = manifest.comparison_rows.find((candidate) => candidate.id === rowId);
      assert.ok(row, `${rowId} should appear in the default public matrix`);
      assert.equal(row.cells.length, COMPARISON_COLUMNS.length);
      assert.equal(
        row.cells.every((cell) => cell.release_evidence_status === "artifact"),
        true,
        `${rowId} should publish four accepted default-use-case artifacts`,
      );
      for (const cell of row.cells) {
        const artifact = manifest.artifacts.find(
          (candidate) => candidate.id === cell.artifact_id,
        );
        assert.ok(artifact, `${cell.id} should resolve to a public artifact`);
        assert.equal(artifact.model, "gpt-5.6-sol");
        assert.equal(artifact.reasoning_effort, effort);
      }
    }
  }

  for (const artifact of manifest.artifacts) {
    const artifactRoute = `/examples/model-ui/${useCase.id}/${artifact.artifact_path}`;
    const screenshotRoute = `/examples/model-ui/${useCase.id}/${artifact.screenshot_path}`;
    assert.ok(examples.includes(artifactRoute), `${artifact.id} artifact route should appear`);
    assert.ok(examples.includes(screenshotRoute), `${artifact.id} screenshot route should appear`);
    assert.equal(
      fs.existsSync(path.join(tempDir, "examples", "model-ui", useCase.id, artifact.artifact_path)),
      true,
      `expected copied artifact ${artifactRoute}`,
    );
    assert.equal(
      fs.existsSync(path.join(tempDir, "examples", "model-ui", useCase.id, artifact.screenshot_path)),
      true,
      `expected copied screenshot ${screenshotRoute}`,
    );
    if (artifact.capture_file) {
      const captureRoute = `/examples/model-ui/${useCase.id}/${artifact.capture_file}`;
      assert.ok(examples.includes(captureRoute), `${artifact.id} capture route should appear`);
      assert.equal(
        fs.existsSync(path.join(tempDir, "examples", "model-ui", useCase.id, artifact.capture_file)),
        true,
        `expected copied capture ${captureRoute}`,
      );
    }
  }

  for (const candidate of manifest.diagnostic_candidates) {
    assert.deepEqual(
      Object.keys(candidate).sort(),
      PUBLIC_DIAGNOSTIC_CANDIDATE_KEYS,
      `${useCase.id}/${candidate.id} public diagnostic candidate should be scrubbed`,
    );
    assert.equal(candidate.release_evidence_status, "diagnostic_only");
    assert.equal(candidate.artifact_path, null);
    assert.equal(candidate.screenshot_path, null);
    const candidateJson = JSON.stringify(candidate);
    for (const privateNeedle of [
      "repair_and_resubmit",
      "visual_tokens",
      "static_capture_quality",
      "capture_file",
      "capture_provenance",
      "transcript_file",
    ]) {
      assert.equal(
        candidateJson.includes(privateNeedle),
        false,
        `${useCase.id}/${candidate.id} should not expose ${privateNeedle}`,
      );
    }

    const sourceCandidate = sourceDiagnosticCandidatesById.get(candidate.id) ?? {};
    for (const diagnosticPath of [
      sourceCandidate.artifact_path ?? `artifacts/${candidate.id}.html`,
      sourceCandidate.screenshot_path ?? `screenshots/${candidate.id}.png`,
      sourceCandidate.capture_file ?? `captures/${candidate.id}.json`,
    ]
      .filter(Boolean)
      .map((relativePath) => ["examples", "model-ui", useCase.id, ...relativePath.split("/")])) {
      assert.equal(
        fs.existsSync(path.join(tempDir, ...diagnosticPath)),
        false,
        `diagnostic-only model UI path should not be copied: ${diagnosticPath.join("/")}`,
      );
    }
  }

  if (useCase.id === "refund-system-map") {
    const activeLegacyAliasIds = new Set(
      (manifest.legacy_aliases ?? []).map((alias) => alias.id),
    );
    for (const alias of LEGACY_ALIASES) {
      if (activeLegacyAliasIds.has(alias.id)) continue;
      for (const inactiveAliasPath of [
        alias.artifact_path,
        alias.screenshot_path,
        alias.capture_file,
      ].filter(Boolean)) {
        const pathParts = [
          "examples",
          "model-ui",
          useCase.id,
          ...inactiveAliasPath.split("/"),
        ];
        assert.equal(
          fs.existsSync(path.join(tempDir, ...pathParts)),
          false,
          `inactive model UI legacy alias should not be copied: ${pathParts.join("/")}`,
        );
      }
    }
  }
	}
	assert.equal(examples.includes("/examples/comparison/music/version-a.html"), false);
assert.equal(examples.includes("/examples/comparison/music/version-b.html"), false);
assert.equal(examples.includes("/examples/comparison/music/facilitator-scorecard.md"), false);
assert.equal(examples.includes("/examples/evals/"), false);
assert.equal(examples.includes("/examples/evals/index.json"), false);
assert.ok(examples.includes("GPT-5.5"));
assert.ok(examples.includes("Gemma 4 via LM Studio lms"));
assert.ok(examples.includes("GPT-5.5 xhigh via codex exec"));
assert.ok(examples.includes("GPT-5.6 Sol Light via codex exec"));
assert.ok(examples.includes("GPT-5.6 Sol Ultra via codex exec"));
assert.ok(examples.includes("static HTML/CSS"));
assert.ok(examples.includes("Material UI SSR"));
assert.equal(examples.includes("with design-system adapter"), false);
assert.equal(examples.includes("raw_brief_baseline"), false);
assert.equal(examples.includes("judgmentkit_handoff"), false);

const evalCatalogPath = path.join(tempDir, "evals", "index.json");
assert.equal(fs.existsSync(evalCatalogPath), true, "expected copied eval catalog");
const evalCatalog = JSON.parse(fs.readFileSync(evalCatalogPath, "utf8"));

const evals = fs.readFileSync(path.join(tempDir, "evals", "index.html"), "utf8");
assertAnalyticsBootstrap(evals, "evals");
assert.ok(evals.includes("Evaluation evidence"));
assert.ok(evals.includes("<h1>Evals</h1>"));
assert.ok(evals.includes("Latest committed eval run"));
assert.ok(evals.includes("Current hosted MCP release"));
assert.ok(evals.includes(packageJson.version));
assert.ok(evals.includes("Historical MCP release"));
assert.ok(evals.includes("Claim level"));
assert.ok(evals.includes("statistically powered benchmark"));
assert.ok(evals.includes("/evals/judgmentkit-mcp/"));
assert.ok(evals.includes("/evals/site-rebuild-log/"));
assert.ok(evals.includes("/evals/index.json"));
assert.ok(evals.includes(`/evals/${evalCatalog.latest.html_report}`));
assert.ok(evals.includes(`/evals/${evalCatalog.latest.json_report}`));
assert.equal(evals.includes("/examples/evals/"), false);
assert.equal(evals.includes("/evals/mcp-pilot/"), false);
assert.ok(evals.includes('class="site-shell evals-shell"'));
assert.ok(siteCss.includes('--eval-serif: "Source Serif 4"'));
assert.ok(siteCss.includes(".evals-page {\n  padding-top: var(--site-page-top);\n  font-family: var(--eval-serif);"));
assert.ok(siteCss.includes(".evals-shell {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);"));
assert.ok(siteCss.includes("font-family: var(--eval-serif);"));
assert.ok(siteCss.includes(".evals-table-shell {\n  max-width: 100%;"));

assert.equal(evalCatalog.catalog_id, "judgmentkit-ui-generation-eval-runs");
assert.ok(evalCatalog.latest, "eval catalog should expose latest run");
assert.equal(
  evalCatalog.latest.mcp_release,
  packageJson.version,
  "latest public UI eval should match the current package version",
);
assert.ok(evalCatalog.latest.html_report.endsWith("/ui-generation-report.html"));
assert.ok(evalCatalog.latest.json_report.endsWith("/ui-generation-report.json"));
assert.equal(
  fs.existsSync(path.join(tempDir, "evals", evalCatalog.latest.html_report)),
  true,
  "expected latest eval HTML report to be copied",
);
assert.equal(
  fs.existsSync(path.join(tempDir, "evals", evalCatalog.latest.json_report)),
  true,
  "expected latest eval JSON report to be copied",
);
const latestEvalReport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "evals", evalCatalog.latest.json_report), "utf8"),
);
const latestScreenshotPath = latestEvalReport.results[0].variants[0].screenshots[0].path;
assert.ok(latestScreenshotPath.endsWith(".png"));
assert.equal(
  fs.existsSync(path.join(tempDir, "evals", latestScreenshotPath)),
  true,
  "expected latest eval screenshot to be copied",
);
const expectedEvalFiles = new Set([
  "index.html",
  "index.json",
  "judgmentkit-mcp/index.html",
  "site-rebuild-log/index.html",
]);
for (const run of evalCatalog.runs) {
  expectedEvalFiles.add(run.html_report);
  expectedEvalFiles.add(run.json_report);
  const sourceReleaseReviewPath = new URL(
    `../evals/reports/${run.run_path}/release-review.html`,
    import.meta.url,
  );
  if (fs.existsSync(sourceReleaseReviewPath)) {
    expectedEvalFiles.add(`${run.run_path}/release-review.html`);
  }
  const sourceReport = JSON.parse(
    fs.readFileSync(new URL(`../evals/reports/${run.json_report}`, import.meta.url), "utf8"),
  );
  for (const resultEntry of sourceReport.results ?? []) {
    for (const variant of resultEntry.variants ?? []) {
      for (const screenshot of variant.screenshots ?? []) {
        expectedEvalFiles.add(screenshot.path);
      }
    }
  }
}
assert.deepEqual(
  listRelativeFiles(path.join(tempDir, "evals")).filter((file) => !expectedEvalFiles.has(file)),
  [],
  "public eval archive should contain only cataloged report files, optional release reviews, and referenced screenshots",
);
for (const run of evalCatalog.runs) {
  const htmlReportPath = path.join(tempDir, "evals", run.html_report);
  const htmlReport = fs.readFileSync(htmlReportPath, "utf8");
  assert.equal(
    htmlReport.includes("../mcp-pilot/") || htmlReport.includes("/evals/mcp-pilot/") || htmlReport.includes("../../../mcp-pilot/"),
    false,
    `${run.html_report} should not link to private MCP pilot archive`,
  );
  const releaseReviewPath = path.join(tempDir, "evals", run.run_path, "release-review.html");
  if (fs.existsSync(releaseReviewPath)) {
    const releaseReview = fs.readFileSync(releaseReviewPath, "utf8");
    assert.ok(
      releaseReview.includes("Historical archive, not an active release gate"),
      `${run.run_path}/release-review.html should be framed as historical`,
    );
    assert.equal(
      releaseReview.includes("Ready for release review"),
      false,
      `${run.run_path}/release-review.html should not use active release-gate status`,
    );
    assert.equal(
      releaseReview.includes("Release gate summary"),
      false,
      `${run.run_path}/release-review.html should not label the public page as a release gate`,
    );
    assert.notEqual(
      releaseReview.indexOf("not current hosted release acceptance proof"),
      -1,
      `${run.run_path}/release-review.html should describe historical evidence limits`,
    );
    for (const privatePilotEvidence of [
      "MCP pilot cases",
      "MCP pilot material",
      "Older pilot packets",
      "pilot packets",
      "pilot material",
      "blinded LLM judge",
      "Blinded LLM judge",
      "capture-required",
      "17/20",
      "18/20",
      "eval:mcp-pilot",
      "run-mcp-pilot",
    ]) {
      assert.equal(
        releaseReview.includes(privatePilotEvidence),
        false,
        `${run.run_path}/release-review.html should not publish private pilot evidence: ${privatePilotEvidence}`,
      );
    }
    assert.equal(
      releaseReview.includes("../mcp-pilot/") ||
        releaseReview.includes("/evals/mcp-pilot/") ||
        releaseReview.includes("../../../mcp-pilot/"),
      false,
      `${run.run_path}/release-review.html should not link to private MCP pilot archive`,
    );
  }
}
assert.equal(
  fs.existsSync(path.join(tempDir, "examples", "evals")),
  false,
  "legacy examples eval compatibility path should not be public",
);
assert.equal(
  fs.existsSync(path.join(tempDir, "evals", "mcp-pilot")),
  false,
  "private MCP pilot archive should not be public",
);
assert.equal(
  fs.existsSync(path.join(tempDir, "evals", "surface-types")),
  false,
  "non-cataloged surface-type archive should not be public",
);

const mcpReportPath = path.join(tempDir, "evals", "judgmentkit-mcp", "index.html");
assert.equal(fs.existsSync(mcpReportPath), true, "expected public UI eval report route");
const mcpReport = fs.readFileSync(mcpReportPath, "utf8");
assertAnalyticsBootstrap(mcpReport, "judgmentkit mcp report");
assert.ok(mcpReport.includes("Activity-First UI Generation Evidence"));
assert.ok(mcpReport.includes('rel="canonical" href="https://judgmentkit.ai/evals/judgmentkit-mcp/"'));
assert.ok(mcpReport.includes("UI paired-artifact evidence"));
assert.ok(mcpReport.includes("not an MCP pilot status page"));
assert.ok(mcpReport.includes("Qualitative paired-artifact evidence"));
assert.ok(mcpReport.includes("not a statistically powered benchmark"));
for (const unfinishedMediaMarker of [
  'class="report-video',
  "Report video placeholder",
  "UI paired-artifact report overview",
  "Raw-to-guided generation placeholder",
  "Disclosure cleanup placeholder",
  "Model matrix walkthrough placeholder",
  "Inline video slot",
  "completed walkthrough videos",
]) {
  assert.equal(
    mcpReport.includes(unfinishedMediaMarker),
    false,
    `the public report should not publish unfinished media UI: ${unfinishedMediaMarker}`,
  );
}
assert.ok(mcpReport.includes('class="report-toc" aria-label="Report table of contents"'));
assert.ok(mcpReport.includes('href="#ui-generation-bottleneck"'));
assert.ok(mcpReport.includes('href="#what-judgmentkit-changes"'));
assert.ok(mcpReport.includes('href="#how-the-evaluation-works"'));
assert.ok(mcpReport.includes('href="#benchmarks"'));
assert.ok(mcpReport.includes('href="#example-evidence"'));
assert.ok(mcpReport.includes('href="#limitations-and-future-work"'));
assert.ok(mcpReport.includes('href="#run-data"'));
assert.ok(mcpReport.includes("The UI generation bottleneck"));
assert.ok(mcpReport.includes("What JudgmentKit changes"));
assert.ok(mcpReport.includes("How the evaluation works"));
assert.ok(mcpReport.includes("Current hosted MCP release"));
assert.ok(mcpReport.includes(packageJson.version));
assert.ok(mcpReport.includes("Latest UI eval MCP release"));
assert.ok(mcpReport.includes("UI paired cases"));
assert.ok(mcpReport.includes("UI paired pass rate"));
assert.equal(mcpReport.includes("<dt>Pass rate</dt>"), false);
assert.equal(mcpReport.includes("Historical eval MCP release"), false);
assert.ok(mcpReport.includes(evalCatalog.latest.mcp_release));
assert.ok(mcpReport.includes("Latest committed eval run"));
assert.ok(mcpReport.includes("Benchmarks"));
assert.ok(mcpReport.includes("Example evidence"));
assert.ok(mcpReport.includes("Limitations and future work"));
assert.ok(mcpReport.includes("Run data"));
assert.ok(mcpReport.includes("Score comparison: raw baseline versus JudgmentKit-guided output."));
assert.ok(mcpReport.includes("Activity-fit terms increase while implementation leakage falls."));
assert.ok(mcpReport.includes('class="report-benchmark-table"'));
assert.ok(mcpReport.includes("Raw screenshot"));
assert.ok(mcpReport.includes("Guided screenshot"));
assert.ok(mcpReport.includes("Context boundary matrix"));
assert.ok(mcpReport.includes("Diagnostic only"));
assert.ok(mcpReport.includes("report-context-cell-diagnostic"));
assert.equal(mcpReport.includes("data-diagnostic-candidate"), false);
assert.equal(mcpReport.includes("gemma4-lms-with-judgmentkit"), false);
assert.equal(mcpReport.includes("gpt55-xhigh-codex-with-judgmentkit"), false);
assert.ok(mcpReport.includes("Needs repair before evidence"));
assert.ok(mcpReport.includes("Token provenance failed"));
assert.ok(mcpReport.includes("Capture quality failed"));
assert.equal(mcpReport.includes("repair_and_resubmit"), false);
assert.equal(mcpReport.includes("visual_tokens"), false);
assert.equal(mcpReport.includes("static_capture_quality"), false);
assert.ok(mcpReport.includes("/examples/model-ui/refund-system-map/artifacts/deterministic-no-judgmentkit.html"));
assert.ok(mcpReport.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png"));
assert.equal(mcpReport.includes("/examples/model-ui/refund-system-map/artifacts/gemma4-lms-with-judgmentkit.html"), false);
assert.equal(mcpReport.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-with-judgmentkit.png"), false);
const reportDiagnosticCell = mcpReport.match(
  /<div class="report-context-cell report-context-cell-diagnostic"[\s\S]*?<\/div>/,
)?.[0] ?? "";
assert.ok(reportDiagnosticCell.includes("Diagnostic only"));
assert.equal(reportDiagnosticCell.includes("<a "), false);
assert.equal(reportDiagnosticCell.includes("href="), false);
assert.equal(reportDiagnosticCell.includes("data-gallery-open"), false);
assert.ok(mcpReport.includes("Support refund triage"));
assert.ok(mcpReport.includes("Field service dispatch"));
assert.ok(mcpReport.includes("Clinical intake review"));
assert.ok(mcpReport.includes("B2B renewal risk review"));
assert.ok(mcpReport.includes(`/evals/${evalCatalog.latest.html_report}`));
assert.ok(mcpReport.includes(`/evals/${evalCatalog.latest.json_report}`));
assert.ok(mcpReport.includes("/examples/model-ui/index.json"));
assert.equal(mcpReport.includes("/evals/judgmentkit-impact/"), false);
assert.equal(mcpReport.includes("/evals/surface-types/"), false);
assert.ok(mcpReport.includes('class="site-shell report-layout"'));
assert.ok(siteCss.includes(".report-page"));
assert.ok(siteCss.includes(".report-page {\n  padding-top: var(--site-page-top);\n  font-family: var(--eval-serif);"));
assert.ok(siteCss.includes(".report-layout {\n  display: grid;\n  gap: clamp(34px, 5vw, 64px);"));
assert.equal(siteCss.includes(".report-video"), false, "removed report media scaffolding should not retain dead CSS");
assert.equal(siteCss.includes("--report-video-"), false, "removed report media scaffolding should not retain dead tokens");
assert.ok(siteCss.includes(".report-score-chart"));
assert.ok(siteCss.includes(".report-context-matrix"));
assert.ok(siteCss.includes(".report-context-cell-diagnostic"));

const siteRebuildLogPath = path.join(tempDir, "evals", "site-rebuild-log", "index.html");
assert.equal(fs.existsSync(siteRebuildLogPath), true, "expected site rebuild log route");
const siteRebuildLog = fs.readFileSync(siteRebuildLogPath, "utf8");
assertAnalyticsBootstrap(siteRebuildLog, "site rebuild log");
assert.ok(siteRebuildLog.includes('class="site-shell report-layout"'));
assert.ok(siteRebuildLog.includes("Site rebuild log"));
assert.ok(siteRebuildLog.includes('rel="canonical" href="https://judgmentkit.ai/evals/site-rebuild-log/"'));
assert.ok(siteRebuildLog.includes("This page records how the current judgmentkit.ai site was rebuilt"));
assert.ok(siteRebuildLog.includes('class="report-toc" aria-label="Site rebuild log sections"'));
assert.ok(siteRebuildLog.includes('href="#what-changed"'));
assert.ok(siteRebuildLog.includes('href="#dogfood-path"'));
assert.ok(siteRebuildLog.includes('href="#design-system-evidence"'));
assert.ok(siteRebuildLog.includes('href="#source-and-tests"'));
assert.ok(siteRebuildLog.includes("The rebuild changed the public site from a system-map-heavy homepage"));
assert.ok(siteRebuildLog.includes("New homepage structure"));
assert.ok(siteRebuildLog.includes("Disclosure boundary"));
assert.ok(siteRebuildLog.includes("Proof route"));
assert.ok(siteRebuildLog.includes("Activity model review"));
assert.ok(siteRebuildLog.includes("Candidate repair"));
assert.ok(siteRebuildLog.includes("Surface selection"));
assert.ok(siteRebuildLog.includes("Workflow review"));
assert.ok(siteRebuildLog.includes("Implementation contract"));
assert.ok(siteRebuildLog.includes("Implementation review"));
assert.ok(siteRebuildLog.includes("review_ui_implementation_candidate: passed"));
assert.ok(siteRebuildLog.includes("Design-system source"));
assert.ok(siteRebuildLog.includes("judgmentkit.ai-native-default.contract-v1"));
assert.ok(siteRebuildLog.includes("Token roles"));
assert.ok(siteRebuildLog.includes("Component contracts"));
assert.ok(siteRebuildLog.includes("Surface patterns"));
assert.ok(siteRebuildLog.includes("1737 Lucide icons"));
assert.ok(siteRebuildLog.includes("judgmentkit-static-specimens"));
assert.ok(siteRebuildLog.includes("/design-system/manifest.json"));
assert.ok(siteRebuildLog.includes("/design-system/specimen-provenance.json"));
assert.ok(siteRebuildLog.includes("same source-controlled static generator"));
assert.ok(siteRebuildLog.includes("tests that verify those assets, contracts, specimens, and provenance"));
assert.ok(siteRebuildLog.includes("site/build-site.mjs"));
assert.ok(siteRebuildLog.includes("tests/site.test.mjs"));
assert.ok(siteRebuildLog.includes("npm run site:build"));
assert.ok(siteRebuildLog.includes("node tests/site.test.mjs"));
assert.ok(siteRebuildLog.includes("npm test"));
assert.ok(siteRebuildLog.includes("Playwright desktop and mobile review"));
assert.ok(siteRebuildLog.includes("Homepage rebuild checks"));
assert.ok(siteRebuildLog.includes("Design-system checks"));
assert.ok(siteRebuildLog.includes("Browser checks"));
assert.equal(siteRebuildLog.includes("judgmentkit2"), false);

for (const copiedExamplePath of [
  ["examples", "one-shot-demo.html"],
  ["examples", "lucide-icon-catalog-smoke.html"],
  ["examples", "er-flow-dashboard", "index.html"],
  ["examples", "comparison", "refund", "version-a.html"],
  ["examples", "comparison", "refund", "version-b.html"],
  ["examples", "model-ui", "refund-system-map", "index.html"],
  ["examples", "model-ui", "refund-system-map", "manifest.json"],
  ["examples", "model-ui", "refund-system-map", "reviewed-handoff.fixture.json"],
  ["examples", "model-ui", "refund-system-map", "design-system-adapter.json"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "deterministic-no-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "deterministic-with-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "deterministic-material-ui-only.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "deterministic-judgmentkit-material-ui.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-lms-no-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-lms-material-ui-only.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-lms-judgmentkit-material-ui.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-no-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-material-ui-only.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-judgmentkit-material-ui.html"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-no-judgmentkit.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-material-ui-only.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-judgmentkit-material-ui.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-no-judgmentkit.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-material-ui-only.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-judgmentkit-material-ui.json"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-no-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-with-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-material-ui-only.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-judgmentkit-material-ui.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-no-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-material-ui-only.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-judgmentkit-material-ui.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-no-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-material-ui-only.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-judgmentkit-material-ui.png"],
  ["examples", "comparison", "music", "version-a.html"],
  ["examples", "comparison", "music", "version-b.html"],
  ["examples", "comparison", "music", "facilitator-scorecard.md"],
  ["evals", "index.html"],
  ["evals", "judgmentkit-mcp", "index.html"],
  ["evals", "site-rebuild-log", "index.html"],
  ["evals", "index.json"],
  ["evals", ...evalCatalog.latest.html_report.split("/")],
  ["evals", ...evalCatalog.latest.json_report.split("/")],
  ["evals", ...latestScreenshotPath.split("/")],
]) {
  const artifactPath = path.join(tempDir, ...copiedExamplePath);

  assert.equal(
    fs.existsSync(artifactPath),
    true,
    `expected copied example artifact ${copiedExamplePath.join("/")}`,
  );

  if (artifactPath.endsWith(".html")) {
    assertAnalyticsBootstrap(
      fs.readFileSync(artifactPath, "utf8"),
      copiedExamplePath.join("/"),
    );
  }
}

const install = fs.readFileSync(path.join(tempDir, "install"), "utf8");
assert.ok(install.startsWith("#!/usr/bin/env bash"));
assert.ok(install.includes("node --input-type=module -"));
assert.ok(install.includes("SUPPORTED_CLIENTS = [\"codex\", \"claude\", \"cursor\"]"));
assert.ok(install.includes("DEFAULT_MCP_URL"));
assert.ok(install.includes("createClaudeInstallCommand"));
assert.ok(install.includes("createCursorConfigBlock"));
assert.ok(install.includes("await runInstallCli(process.argv.slice(2));"));
assert.ok(install.includes("--client codex|claude|cursor"));
assert.ok(install.includes("cursor-agent"));
assert.equal(install.includes("git clone"), false);
assert.equal(install.includes("npm install"), false);
assert.equal(install.includes("mcp:stdio"), false);
assert.equal(fs.existsSync(path.join(tempDir, "favicon.svg")), true);
assert.equal(fs.readFileSync(path.join(tempDir, "robots.txt"), "utf8"), "User-agent: *\nAllow: /\n");
const socialThumbnail = fs.readFileSync(path.join(tempDir, "assets", "judgmentkit-social-thumbnail.png"));
assert.equal(socialThumbnail.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(socialThumbnail.readUInt32BE(16), 1200);
assert.equal(socialThumbnail.readUInt32BE(20), 630);
assert.equal(
  crypto.createHash("sha256").update(socialThumbnail).digest("hex"),
  "969df7ef71c748a151f58357b67d4100e3ee2dbf799da0cd22dbb3c5bc0375ea",
  "social thumbnail must match the visually approved direct SVG render",
);
const socialThumbnailSvg = fs.readFileSync(
  new URL("../site/assets/judgmentkit-social-thumbnail.svg", import.meta.url),
  "utf8",
);
assert.match(
  socialThumbnailSvg,
  /<text x="190" y="158"[\s\S]*?>JudgmentKit<\/text>/,
  "social thumbnail wordmark must retain its optically balanced baseline",
);
const versionedSocialThumbnail = fs.readFileSync(path.join(tempDir, "assets", "judgmentkit-social-thumbnail-20260723-v2.png"));
assert.equal(versionedSocialThumbnail.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(versionedSocialThumbnail.readUInt32BE(16), 1200);
assert.equal(versionedSocialThumbnail.readUInt32BE(20), 630);
assert.deepEqual(versionedSocialThumbnail, socialThumbnail);
const homepageHeroArt = fs.readFileSync(path.join(tempDir, "assets", "judgment-lens-hero.webp"));
const homepageHeroArtSource = fs.readFileSync(
  new URL("../site/assets/judgment-lens-hero.webp", import.meta.url),
);
assert.deepEqual(homepageHeroArt, homepageHeroArtSource);
assert.equal(homepageHeroArt.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(homepageHeroArt.subarray(8, 12).toString("ascii"), "WEBP");
assert.ok(homepageHeroArt.length > 0);
assert.ok(homepageHeroArt.length < 250_000);

const visualCompositionFilmSource = fs.readFileSync(
  new URL(
    "../scripts/visual-composition-film/visual-composition-runtime-demo.html",
    import.meta.url,
  ),
  "utf8",
);
const visualCompositionLiveAssetPath = path.join(
  tempDir,
  "assets",
  "releases",
  "visual-composition-runtime-demo.html",
);
assert.ok(
  fs.existsSync(visualCompositionLiveAssetPath),
  "the standalone authored composition may remain published independently of the homepage",
);
assert.equal(
  fs.readFileSync(visualCompositionLiveAssetPath, "utf8"),
  visualCompositionFilmSource,
  "the public authoring asset should stay byte-for-byte aligned with its editable source",
);
assert.match(
  visualCompositionFilmSource,
  /function startStandaloneCinematicLoop\(\)[\s\S]*?notifyClockEnded\s*=\s*\(\)\s*=>\s*\{[\s\S]*?window\.requestAnimationFrame\([\s\S]*?rebuildCinematicAt\(0,\s*\{\s*play:\s*true\s*\}\)[\s\S]*?startCinematic\(\);/,
  "the standalone authored demo should restart asynchronously after its full 38.2-second clock ends",
);
const standaloneCinematicToggle = visualCompositionFilmSource.match(
  /<button\b[^>]*data-standalone-cinematic-toggle[^>]*>[\s\S]*?<\/button>/i,
)?.[0] ?? "";
assert.ok(
  standaloneCinematicToggle,
  "the looping standalone demo should expose a native playback toggle",
);
assert.match(standaloneCinematicToggle, /type="button"/);
assert.match(standaloneCinematicToggle.match(/<button\b[^>]*>/i)?.[0] ?? "", /(?:\s|^)hidden(?:\s|>)/);
assert.match(standaloneCinematicToggle, /aria-label="Pause animation"/);
assert.deepEqual(
  [...standaloneCinematicToggle.matchAll(/data-icon-id="([^"]+)"/g)].map((match) => match[1]),
  ["play", "pause"],
  "the standalone toggle should use canonical JudgmentKit play and pause icons",
);
assert.match(
  visualCompositionFilmSource,
  /\.standalone-cinematic-toggle\s*\{[^}]*position:\s*fixed;[^}]*width:\s*44px;[^}]*height:\s*44px;[^}]*z-index:\s*(?:100[1-9]|10[1-9]\d|1[1-9]\d{2}|[2-9]\d{3,});[^}]*background:\s*(?!transparent)[^;]+;/s,
  "the standalone toggle should remain a visible 44px target above cinematic effects",
);
assert.match(
  visualCompositionFilmSource,
  /\.standalone-cinematic-toggle:focus-visible\s*\{[^}]*outline:\s*(?!none)[^;]+;/s,
  "the standalone toggle should expose a visible keyboard focus ring",
);
assert.match(
  visualCompositionFilmSource,
  /\.standalone-cinematic-toggle\[hidden\]\s*\{[^}]*display:\s*none;/s,
  "manual, capture, and embedded modes should keep the standalone toggle out of view",
);
assert.match(
  visualCompositionFilmSource,
  /\.standalone-cinematic-toggle\s+svg\[hidden\]\s*\{[^}]*display:\s*none;/s,
  "the standalone toggle should hide its inactive SVG state in Chrome",
);
assert.match(
  visualCompositionFilmSource,
  /body\.cinematic-mode\s+\[data-standalone-cinematic-toggle\]\s*\{[^}]*cursor:\s*pointer\s*!important;/s,
  "the standalone toggle should retain a pointer over the cinematic cursor override",
);
assert.match(
  visualCompositionFilmSource,
  /function startStandaloneCinematicLoop\(\)[\s\S]*?standaloneCinematicToggle\.hidden\s*=\s*false;[\s\S]*?notifyClockState\s*=\s*syncStandalonePlaybackToggle;[\s\S]*?startCinematic\(\);/,
  "only the default standalone loop should reveal and synchronize its playback toggle",
);
assert.equal(
  (visualCompositionFilmSource.match(/standaloneCinematicToggle\.hidden\s*=\s*false/g) ?? []).length,
  1,
  "no other playback mode should reveal the standalone toggle",
);
assert.match(
  visualCompositionFilmSource,
  /standaloneCinematicToggle\.addEventListener\('click',\s*\(\)\s*=>\s*\{[\s\S]*?cueClock\.isPlaying\(\)[\s\S]*?cueClock\.pause\(\)[\s\S]*?cueClock\.play\(\)[\s\S]*?\}\);/,
  "the native standalone toggle should pause and resume the canonical cue clock",
);
const standalonePlaybackSyncSource = visualCompositionFilmSource.slice(
  visualCompositionFilmSource.indexOf("function syncStandalonePlaybackToggle()"),
  visualCompositionFilmSource.indexOf(
    "standaloneCinematicToggle.addEventListener",
    visualCompositionFilmSource.indexOf("function syncStandalonePlaybackToggle()"),
  ),
);
for (const expectedSource of ["aria-label", "Pause animation", "Resume animation"]) {
  assert.ok(
    standalonePlaybackSyncSource.includes(expectedSource),
    `the standalone toggle should synchronize ${expectedSource}`,
  );
}
assert.match(
  visualCompositionFilmSource,
  /else if \(!\['0',\s*'off',\s*'manual'\]\.includes\(autoplayMode\)\)\s*\{\s*startStandaloneCinematicLoop\(\);\s*\}/,
  "a bare standalone demo should autoplay and loop while preserving an explicit manual opt-out",
);
assert.match(
  visualCompositionFilmSource,
  /function createReplayAnimationTracker\(\)[\s\S]*?const elapsedMs\s*=\s*Math\.max\(0,\s*targetMs\s*-\s*cueStartMs\);[\s\S]*?animation\.currentTime\s*=\s*elapsedMs;/,
  "mid-motion seeks should position each animation at its cue-relative elapsed time",
);
assert.match(
  visualCompositionFilmSource,
  /completedReplayAnimations\.add\(animation\)/,
  "animations completed before a seek target must not rewind when playback resumes",
);
assert.match(
  visualCompositionFilmSource,
  /function resumeDocumentAnimations\(\)[\s\S]*?!completedReplayAnimations\.has\(animation\)/,
  "playback should resume only replay animations that remain inside their active interval",
);
assert.match(
  visualCompositionFilmSource,
  /cueClock\.replayTo\(targetMs,\s*replayAnimationTracker\);/,
  "timeline rebuilds should use the cue-aware animation tracker",
);
assert.doesNotMatch(
  visualCompositionFilmSource,
  /settleRebuiltAnimations|animation\.finish\(\)/,
  "seeking must not force every finite animation to its completed pose",
);
assert.match(visualCompositionFilmSource, /data-agent="draftling"/);
assert.match(visualCompositionFilmSource, /data-agent="judgment"/);
assert.match(
  visualCompositionFilmSource,
  /\.cinematic-cursor\s*>\s*\.agent-guide\s*\{[^}]*width:\s*48px;[^}]*height:\s*54px;[^}]*overflow:\s*visible;/s,
  "Judgment actor sizing should target only its direct agent-guide SVG",
);
assert.doesNotMatch(
  visualCompositionFilmSource,
  /\.cinematic-cursor\s+svg\s*\{/,
  "a broad cinematic-cursor SVG rule would also resize SVGs inside the cloned candidate UI",
);
const judgmentMagnifierStart = visualCompositionFilmSource.indexOf('<g class="agent-magnifier">');
const judgmentMagnifierEnd = visualCompositionFilmSource.indexOf(
  '<g class="agent-body">',
  judgmentMagnifierStart,
);
const judgmentMagnifierMarkup = visualCompositionFilmSource.slice(
  judgmentMagnifierStart,
  judgmentMagnifierEnd,
);
assert.match(
  visualCompositionFilmSource,
  /class="agent-magnifier-lens"/,
  "the repair agent should visibly carry its inspection prop",
);
const judgmentMagnifierRadius = Number.parseFloat(
  judgmentMagnifierMarkup.match(/class="agent-magnifier-lens"[^>]*\br="([\d.]+)"/)?.[1] ?? "0",
);
assert.ok(
  judgmentMagnifierRadius >= 10,
  "the repair agent magnifier should remain large enough to read at homepage-film scale",
);
assert.match(
  visualCompositionFilmSource,
  /const magnifierExpandedScale = 2\.6;/,
  "the repair agent should deploy a deliberately oversized inspection lens",
);
assert.match(
  visualCompositionFilmSource,
  /@keyframes agent-magnifier-pullout[\s\S]*scale\(0\.28\)[\s\S]*scale\(2\.78\)[\s\S]*scale\(2\.6\)/,
  "the oversized lens should visibly leave its stowed position, overshoot, and settle",
);
assert.match(
  visualCompositionFilmSource,
  /class="agent-live-lens"[^>]*id="agent-live-lens"[\s\S]*class="agent-live-lens-scene"[^>]*id="agent-live-lens-scene"/,
  "the inspection prop should provide a clipped HTML viewport for the real candidate UI",
);
assert.match(
  judgmentMagnifierMarkup,
  /class="agent-magnifier-lens"[\s\S]*class="agent-magnifier-ring"[\s\S]*class="agent-magnifier-shine"/,
  "the SVG prop should retain only its physical lens, ring, and shine",
);
assert.doesNotMatch(
  judgmentMagnifierMarkup,
  /agent-lens-scene|>Aa<|>28 slot<|>6 inset</,
  "the SVG prop must not substitute synthetic artwork or labels for the inspected DOM",
);
assert.match(
  visualCompositionFilmSource,
  /const liveLensSource = artifactCard\.querySelector\('\.bad-ui'\);[\s\S]*const liveLensClone = liveLensSource\.cloneNode\(true\);[\s\S]*liveLensScene\.appendChild\(liveLensClone\);/,
  "the expanded lens should render a clone of the real candidate UI",
);
assert.match(
  visualCompositionFilmSource,
  /liveLensClone\.classList\.add\('agent-live-lens-source'\);[\s\S]*liveLensClone\.setAttribute\('aria-hidden', 'true'\);[\s\S]*liveLensClone\.setAttribute\('inert', ''\);/,
  "the visual-only clone should be hidden from assistive technology and interaction",
);
const liveLensSanitizationStart = visualCompositionFilmSource.indexOf(
  "[liveLensClone, ...liveLensClone.querySelectorAll('*')]",
);
const liveLensSanitizationEnd = visualCompositionFilmSource.indexOf(
  "liveLensScene.appendChild(liveLensClone)",
  liveLensSanitizationStart,
);
const liveLensSanitizationSource = visualCompositionFilmSource.slice(
  liveLensSanitizationStart,
  liveLensSanitizationEnd,
);
assert.ok(
  liveLensSanitizationStart >= 0 && liveLensSanitizationEnd > liveLensSanitizationStart,
  "the visual-only clone should sanitize itself and every descendant before mounting",
);
assert.match(
  liveLensSanitizationSource,
  /name\.startsWith\('on'\)[\s\S]*node\.removeAttribute\(name\)/,
  "the visual-only clone should discard copied event-handler attributes",
);
for (const attribute of [
  "id",
  "role",
  "tabindex",
  "aria-label",
  "aria-expanded",
  "name",
  "for",
  "href",
  "data-demo-geometry",
  "data-part",
  "data-measure",
]) {
  assert.match(
    liveLensSanitizationSource,
    new RegExp(`['"]${attribute}['"]`),
    `the visual-only clone should remove ${attribute} from copied DOM`,
  );
}
assert.match(
  liveLensSanitizationSource,
  /node\.removeAttribute\(attribute\)/,
  "the visual-only clone should remove duplicate semantics and geometry hooks from every descendant",
);
assert.doesNotMatch(
  visualCompositionFilmSource,
  /document\.querySelector\(['"](?:\.bad-ui|\.bad-lockup(?:-text)?|\.bad-select|\.bad-symbol|\.select-trailing|\[data-demo-geometry="value"\])/,
  "film actions must stay scoped to the retained source UI so the earlier lens clone cannot steal selectors",
);
assert.match(
  visualCompositionFilmSource,
  /liveLensSource\.querySelector\('\.bad-symbol'\)[\s\S]*liveLensSource\.querySelector\('\.bad-lockup-text'\)[\s\S]*liveLensSource\.querySelector\('\[data-demo-geometry="value"\]'\)[\s\S]*liveLensSource\.querySelector\('\.select-trailing'\)/,
  "measured repair traces should resolve every geometry target from the retained source UI",
);
assert.match(
  visualCompositionFilmSource,
  /const sourceRect = liveLensSource\.getBoundingClientRect\(\);[\s\S]*const targetRect = target\.getBoundingClientRect\(\);[\s\S]*x:\s*targetRect\.left \+ targetRect\.width \* anchorX[\s\S]*y:\s*targetRect\.top \+ targetRect\.height \* anchorY[\s\S]*x:\s*point\.x - sourceRect\.left[\s\S]*y:\s*point\.y - sourceRect\.top/,
  "the live close-up should derive its focus from the real source and inspected target rectangles",
);
assert.match(
  visualCompositionFilmSource,
  /liveLensClone\.style\.width\s*=\s*`\$\{sourceRect\.width\}px`;[\s\S]*liveLensClone\.style\.height\s*=\s*`\$\{sourceRect\.height\}px`;/,
  "the cloned candidate should retain the real source border-box geometry inside the lens",
);
assert.match(
  visualCompositionFilmSource,
  /liveLensScene\.style\.transform\s*=\s*`translate(?:3d)?\([\s\S]*scale\(\$\{liveLensOpticalZoom\}\)`;/,
  "the live lens should translate the inspected source point to its center before applying optical zoom",
);
assert.match(
  visualCompositionFilmSource,
  /\.agent-live-lens\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:\s*50%;[^}]*opacity:\s*0;/s,
  "the live close-up should remain clipped and invisible while the prop is stowed",
);
assert.match(
  visualCompositionFilmSource,
  /data-lens-pose="stowed"/,
  "the Judgment agent should begin with the live lens explicitly stowed",
);
assert.match(
  visualCompositionFilmSource,
  /const magnifierHotspot = Object\.freeze\(\{[\s\S]*magnifierExpandedScale[\s\S]*function moveLens\(/,
  "the film should position the close-up from the lens center rather than the opaque agent body",
);
assert.match(
  visualCompositionFilmSource,
  /function prepareLens\([\s\S]*function pullLens\([\s\S]*function stowLens\(/,
  "the lens should have explicit approach, pull-out, and stow behaviors",
);
assert.match(
  visualCompositionFilmSource,
  /alignmentApproach:[\s\S]*alignmentLensOut:[\s\S]*alignmentLensStow:[\s\S]*caretApproach:[\s\S]*caretLensOut:[\s\S]*caretLensStow:/,
  "each defect close-up should be framed by a complete physical prop gesture",
);
const judgmentEntryStart = visualCompositionFilmSource.indexOf(
  "cinematicLater(cinematicTimeline.judgmentEnters",
);
const judgmentEntryEnd = visualCompositionFilmSource.indexOf(
  "cinematicLater(cinematicTimeline.startButtonHover",
  judgmentEntryStart,
);
const judgmentEntrySource = visualCompositionFilmSource.slice(
  judgmentEntryStart,
  judgmentEntryEnd,
);
assert.ok(
  judgmentEntryStart >= 0 && judgmentEntryEnd > judgmentEntryStart,
  "the cinematic should retain a bounded Judgment-agent entrance cue",
);
assert.match(
  judgmentEntrySource,
  /setLensPose\('stowed'\)/,
  "the Judgment agent should enter with the live close-up explicitly stowed",
);
assert.doesNotMatch(
  judgmentEntrySource,
  /pullLens\(|setLensPose\(['"](?:pulling|out)['"]\)/,
  "the live close-up must not pre-show when the Judgment agent enters",
);
const cinematicCue = (name) => Number.parseInt(
  visualCompositionFilmSource.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1] ?? "-1",
  10,
);
assert.ok(
  cinematicCue("diagnosisFailed") < cinematicCue("alignmentLensOut")
    && cinematicCue("alignmentLensStow") < cinematicCue("caretLensOut"),
  "the live close-up must not deploy before failure and must stow between the two inspections",
);
assert.match(
  visualCompositionFilmSource,
  /body\[data-state="failed"\] \.agent-magnifier-ring,[^{]*\{[^}]*stroke:\s*var\(--red\);/s,
  "the magnifier should reinforce the detected-failure state",
);
assert.match(
  visualCompositionFilmSource,
  /\.cinematic-cursor\.success \.agent-guide \.agent-magnifier-ring,[^{]*\{[^}]*stroke:\s*var\(--green\);/s,
  "the magnifier should resolve with the accepted state",
);
assert.match(visualCompositionFilmSource, /data-build-stage="ready"/);
assert.match(
  visualCompositionFilmSource,
  /artifact-card\[data-build-stage="empty"\] \.bad-lockup,[\s\S]*artifact-card\[data-build-stage="empty"\] \.select-demo-shell[\s\S]*opacity:\s*0;[\s\S]*transition:\s*none;/,
  "the cold-open UI children should be hidden before the frame appears so they cannot flash during the first tap",
);
assert.match(
  visualCompositionFilmSource,
  /artifact-card\[data-build-stage="empty"\] \.bad-ui\s*\{[^}]*opacity:\s*0;[^}]*visibility:\s*hidden;[^}]*transition:\s*none;/s,
  "the complete candidate should be unpainted during the cinematic cold open",
);
assert.match(
  visualCompositionFilmSource,
  /artifact-card\[data-build-stage="frame"\] \.bad-lockup,[\s\S]*artifact-card\[data-build-stage="frame"\] \.select-demo-shell,[\s\S]*artifact-card\[data-build-stage="lockup"\] \.select-demo-shell[\s\S]*opacity:\s*0;/,
  "each later candidate part should remain hidden until its own Draftling build cue",
);
const startCinematicSource = visualCompositionFilmSource.slice(
  visualCompositionFilmSource.indexOf("function startCinematic()"),
  visualCompositionFilmSource.indexOf("function reset(", visualCompositionFilmSource.indexOf("function startCinematic()")),
);
assert.ok(
  startCinematicSource.indexOf("artifactCard.dataset.buildStage = 'empty'")
    < startCinematicSource.indexOf("cinematicLater(cinematicTimeline.draftlingEnters"),
  "the empty build stage should be committed before any cinematic build timer can run",
);
assert.match(visualCompositionFilmSource, /First draft ready/);
assert.match(visualCompositionFilmSource, /judgmentkit-demo-cinematic-complete/);
assert.match(
  visualCompositionFilmSource,
  /class="candidate-stack"[\s\S]*class="bad-ui"[\s\S]*class="stage-footer"[\s\S]*id="run-review"/,
  "the film action should remain in the candidate stack immediately after the measured UI",
);
assert.match(
  visualCompositionFilmSource,
  /\.candidate-stack\s*\{[^}]*width:\s*min\(570px,\s*calc\(100% - 56px\)\);[^}]*gap:\s*14px;/s,
  "the film action should sit in a compact, fixed-gap stack with the candidate",
);
assert.match(
  visualCompositionFilmSource,
  /\.stage-footer\s*\{[^}]*justify-content:\s*flex-end;[^}]*margin-top:\s*0;/s,
  "the film action should align to the candidate edge without a detached footer margin",
);
assert.match(
  visualCompositionFilmSource,
  /draftlingEnters:\s*500[\s\S]*judgmentEnters:\s*7300[\s\S]*complete:\s*38000/,
  "the film source should preserve the generation-to-judgment story handoff",
);

const releaseRecordingSource = fs.readFileSync(
  new URL("../site/assets/releases/judgmentkit-select-field-agent-demo.mp4", import.meta.url),
);
const releaseRecordingBuilt = fs.readFileSync(
  path.join(tempDir, "assets", "releases", "judgmentkit-select-field-agent-demo.mp4"),
);
assert.deepEqual(releaseRecordingBuilt, releaseRecordingSource);
assert.equal(releaseRecordingBuilt.subarray(4, 8).toString("ascii"), "ftyp");
assert.ok(releaseRecordingBuilt.length > 0);

const releaseDarkRecordingSource = fs.readFileSync(
  new URL(
    "../site/assets/releases/judgmentkit-select-field-agent-demo-dark.mp4",
    import.meta.url,
  ),
);
const releaseDarkRecordingBuilt = fs.readFileSync(
  path.join(
    tempDir,
    "assets",
    "releases",
    "judgmentkit-select-field-agent-demo-dark.mp4",
  ),
);
assert.deepEqual(releaseDarkRecordingBuilt, releaseDarkRecordingSource);
assert.equal(releaseDarkRecordingBuilt.subarray(4, 8).toString("ascii"), "ftyp");
assert.ok(releaseDarkRecordingBuilt.length > 0);
assert.notDeepEqual(
  releaseDarkRecordingBuilt,
  releaseRecordingBuilt,
  "the dark recording must contain independently rendered dark-theme pixels",
);

function decodedAudioPcm(mediaUrl, startSeconds, durationSeconds) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v", "error",
      "-i", mediaUrl.pathname,
      "-ss", String(startSeconds),
      "-t", String(durationSeconds),
      "-map", "0:a:0",
      "-ac", "2",
      "-ar", "48000",
      "-f", "s16le",
      "pipe:1",
    ],
    { encoding: null, maxBuffer: 2 * 1024 * 1024 },
  );
  assert.equal(
    result.status,
    0,
    `ffmpeg should decode the homepage soundtrack: ${result.stderr?.toString("utf8") ?? result.error?.message ?? "unknown error"}`,
  );
  assert.ok(result.stdout.length > 0, "the soundtrack window should contain decoded PCM audio");
  return result.stdout;
}

function pcmRmsDb(pcm) {
  let squareSum = 0;
  let sampleCount = 0;
  for (let offset = 0; offset + 1 < pcm.length; offset += 2) {
    const normalizedSample = pcm.readInt16LE(offset) / 32768;
    squareSum += normalizedSample * normalizedSample;
    sampleCount += 1;
  }
  return 20 * Math.log10(Math.sqrt(squareSum / sampleCount));
}

function decodedAudioRmsDb(mediaUrl, startSeconds, durationSeconds) {
  return pcmRmsDb(decodedAudioPcm(mediaUrl, startSeconds, durationSeconds));
}

function decodedAudioRmsWindowsDb(
  mediaUrl,
  { startSeconds, windowSeconds, hopSeconds, count },
) {
  const sampleRate = 48_000;
  const bytesPerFrame = 4;
  const durationSeconds = windowSeconds + (count - 1) * hopSeconds;
  const pcm = decodedAudioPcm(mediaUrl, startSeconds, durationSeconds);
  const windowFrames = Math.round(windowSeconds * sampleRate);
  return Array.from({ length: count }, (_, index) => {
    const startFrame = Math.round(index * hopSeconds * sampleRate);
    const startByte = startFrame * bytesPerFrame;
    const endByte = (startFrame + windowFrames) * bytesPerFrame;
    assert.ok(
      pcm.length >= endByte,
      `decoded soundtrack should contain complete ${(windowSeconds * 1000).toFixed(0)}ms analysis windows`,
    );
    return pcmRmsDb(pcm.subarray(startByte, endByte));
  });
}

function encodedAudioSha256(mediaUrl) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v", "error",
      "-i", mediaUrl.pathname,
      "-map", "0:a:0",
      "-c", "copy",
      "-f", "hash",
      "-hash", "sha256",
      "pipe:1",
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  assert.equal(
    result.status,
    0,
    `ffmpeg should hash the homepage soundtrack: ${result.stderr ?? result.error?.message ?? "unknown error"}`,
  );
  return result.stdout.trim();
}

function decodedAudioLoudness(mediaUrl) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i", mediaUrl.pathname,
      "-map", "0:a:0",
      "-af", "loudnorm=print_format=json",
      "-f", "null",
      "-",
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  assert.equal(
    result.status,
    0,
    `ffmpeg should measure homepage soundtrack loudness: ${result.stderr ?? result.error?.message ?? "unknown error"}`,
  );
  const reportMatch = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  assert.ok(reportMatch, "ffmpeg should return a loudnorm input report");
  const report = JSON.parse(reportMatch[0]);
  return {
    integratedLufs: Number(report.input_i),
    truePeakDbtp: Number(report.input_tp),
  };
}

const homepageSoundtrackUrls = new Map([
  [
    "light",
    new URL("../site/assets/releases/judgmentkit-select-field-agent-demo.mp4", import.meta.url),
  ],
  [
    "dark",
    new URL("../site/assets/releases/judgmentkit-select-field-agent-demo-dark.mp4", import.meta.url),
  ],
]);
for (const [theme, mediaUrl] of homepageSoundtrackUrls) {
  const leftAdjacentRmsDb = decodedAudioRmsDb(mediaUrl, 5.2, 0.3);
  const rightAdjacentRmsDb = decodedAudioRmsDb(mediaUrl, 6.4, 0.3);
  const quieterAdjacentRmsDb = Math.min(leftAdjacentRmsDb, rightAdjacentRmsDb);
  const louderAdjacentRmsDb = Math.max(leftAdjacentRmsDb, rightAdjacentRmsDb);
  const handoff100msRmsDb = decodedAudioRmsWindowsDb(mediaUrl, {
    startSeconds: 5.5,
    windowSeconds: 0.1,
    hopSeconds: 0.05,
    count: 17,
  });
  const handoff200msRmsDb = decodedAudioRmsWindowsDb(mediaUrl, {
    startSeconds: 5.5,
    windowSeconds: 0.2,
    hopSeconds: 0.1,
    count: 8,
  });
  const quietest100msRmsDb = Math.min(...handoff100msRmsDb);
  const quietest200msRmsDb = Math.min(...handoff200msRmsDb);
  const loudest100msRmsDb = Math.max(...handoff100msRmsDb);
  assert.ok(
    quieterAdjacentRmsDb - quietest100msRmsDb <= 2.5,
    `${theme} soundtrack must not contain a 100ms dropout through the 5.5–6.4s handoff; adjacent ${quieterAdjacentRmsDb.toFixed(2)} dBFS, quietest window ${quietest100msRmsDb.toFixed(2)} dBFS`,
  );
  assert.ok(
    quieterAdjacentRmsDb - quietest200msRmsDb <= 2,
    `${theme} soundtrack must not contain a sustained 200ms dip through the 5.5–6.4s handoff; adjacent ${quieterAdjacentRmsDb.toFixed(2)} dBFS, quietest window ${quietest200msRmsDb.toFixed(2)} dBFS`,
  );
  assert.ok(
    loudest100msRmsDb - louderAdjacentRmsDb <= 1,
    `${theme} soundtrack repair must not create an audible handoff bump; adjacent ${louderAdjacentRmsDb.toFixed(2)} dBFS, loudest window ${loudest100msRmsDb.toFixed(2)} dBFS`,
  );
  const { integratedLufs, truePeakDbtp } = decodedAudioLoudness(mediaUrl);
  assert.ok(
    integratedLufs >= -18.5 && integratedLufs <= -15,
    `${theme} soundtrack should remain in the approved integrated loudness range; measured ${integratedLufs.toFixed(2)} LUFS`,
  );
  assert.ok(
    truePeakDbtp <= -1,
    `${theme} soundtrack should retain true-peak headroom; measured ${truePeakDbtp.toFixed(2)} dBTP`,
  );
}
assert.equal(
  encodedAudioSha256(
    new URL("../site/assets/releases/judgmentkit-select-field-agent-demo.mp4", import.meta.url),
  ),
  encodedAudioSha256(
    new URL("../site/assets/releases/judgmentkit-select-field-agent-demo-dark.mp4", import.meta.url),
  ),
  "light and dark films should mux the exact same encoded soundtrack",
);

const releasePosterSource = fs.readFileSync(
  new URL(
    "../site/assets/releases/judgmentkit-select-field-agent-demo-poster.png",
    import.meta.url,
  ),
);
const releasePosterBuilt = fs.readFileSync(
  path.join(
    tempDir,
    "assets",
    "releases",
    "judgmentkit-select-field-agent-demo-poster.png",
  ),
);
assert.deepEqual(releasePosterBuilt, releasePosterSource);
assert.equal(releasePosterBuilt.subarray(1, 4).toString("ascii"), "PNG");
assert.ok(releasePosterBuilt.length > 0);

const releaseDarkPosterSource = fs.readFileSync(
  new URL(
    "../site/assets/releases/judgmentkit-select-field-agent-demo-poster-dark.png",
    import.meta.url,
  ),
);
const releaseDarkPosterBuilt = fs.readFileSync(
  path.join(
    tempDir,
    "assets",
    "releases",
    "judgmentkit-select-field-agent-demo-poster-dark.png",
  ),
);
assert.deepEqual(releaseDarkPosterBuilt, releaseDarkPosterSource);
assert.equal(releaseDarkPosterBuilt.subarray(1, 4).toString("ascii"), "PNG");
assert.ok(releaseDarkPosterBuilt.length > 0);
assert.notDeepEqual(
  releaseDarkPosterBuilt,
  releasePosterBuilt,
  "the dark poster must contain independently rendered dark-theme pixels",
);

assert.equal(
  fs.existsSync(
    path.join(tempDir, "assets", "releases", "judgmentkit-select-field-agent-demo.vtt"),
  ),
  false,
  "the public site build should not publish the disabled caption asset",
);

for (const experimentPath of [
  ["experiments", "netflix-library", "index.html"],
  ["experiments", "netflix-library", "judgmentkit", "index.html"],
  ["experiments", "netflix-library", "judgmentkit", "app.js"],
  ["experiments", "netflix-library", "judgmentkit", "styles.css"],
  ["experiments", "netflix-library", "baseline", "index.html"],
  ["experiments", "netflix-library", "baseline", "app.js"],
  ["experiments", "netflix-library", "baseline", "styles.css"],
]) {
  assert.equal(
    fs.existsSync(path.join(tempDir, ...experimentPath)),
    true,
    `expected unlisted experiment artifact ${experimentPath.join("/")}`,
  );
}

for (const [label, htmlPath] of [
  ["experiment root", ["experiments", "netflix-library", "index.html"]],
  ["JudgmentKit variant", ["experiments", "netflix-library", "judgmentkit", "index.html"]],
  ["baseline variant", ["experiments", "netflix-library", "baseline", "index.html"]],
]) {
  const html = fs.readFileSync(path.join(tempDir, ...htmlPath), "utf8");
  assert.ok(html.includes('name="robots" content="noindex, nofollow"'), `${label} should be noindex`);
  assertAnalyticsBootstrap(html, label);
}

const netflixExperiment = fs.readFileSync(
  path.join(tempDir, "experiments", "netflix-library", "index.html"),
  "utf8",
);
assert.equal(netflixExperiment.includes("Unlisted one-shot experiment"), false);
assert.ok(netflixExperiment.includes('href="https://judgmentkit.ai/"'));
assert.ok(netflixExperiment.includes("JudgmentKit.ai home"));
assert.ok(netflixExperiment.includes("Netflix library zero-shot, single-pass comparison"));
assert.equal(netflixExperiment.includes("same one-shot request"), false);
assert.ok(netflixExperiment.includes("same prompt"));
assert.ok(netflixExperiment.includes("Prompt used"));
assert.ok(netflixExperiment.includes("do a zero-shot, single-pass generation of a Netflix video library"));
assert.ok(netflixExperiment.includes('href="./judgmentkit/" target="_blank" rel="noreferrer"'));
assert.ok(netflixExperiment.includes('href="./baseline/" target="_blank" rel="noreferrer"'));

const mcp = getHostedMcpMetadata();
assert.equal(mcp.name, "JudgmentKit");
assert.equal(mcp.transport, "streamable-http");
assert.deepEqual(mcp.public_route, {
  role: "mcp_endpoint_and_metadata",
  hosted_mcp_endpoint: true,
  usage:
    "Connect an MCP Streamable HTTP client to this URL. GET without an SSE Accept header returns this metadata.",
});
assert.deepEqual(
  mcp.capabilities.tools.map((tool) => tool.name),
  EXPECTED_TOOL_NAMES,
);

for (const oldToolName of [
  "list_resources",
  "get_resource",
  "get_workflow_bundle",
  "get_page_markdown",
  "get_example",
  "resolve_related",
]) {
  assert.equal(
    mcp.capabilities.tools.some((tool) => tool.name === oldToolName),
    false,
    `site MCP route must not expose old tool ${oldToolName}`,
  );
}

{
  const originalAnalyticsConfig = process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
  const configuredTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-analytics-"));

  process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG = JSON.stringify({
    analytics: {
      scriptSrc: "/custom/insights/script.js",
      eventEndpoint: "/custom/insights/event",
      viewEndpoint: "/custom/insights/view",
      sessionEndpoint: "/custom/insights/session",
    },
  });

  try {
    await buildSite(configuredTempDir);
    const configuredHomepage = fs.readFileSync(
      path.join(configuredTempDir, "index.html"),
      "utf8",
    );

    assert.ok(configuredHomepage.includes('src="/custom/insights/script.js"'));
    assert.ok(configuredHomepage.includes('data-event-endpoint="/custom/insights/event"'));
    assert.ok(configuredHomepage.includes('data-view-endpoint="/custom/insights/view"'));
    assert.ok(configuredHomepage.includes('data-session-endpoint="/custom/insights/session"'));
  } finally {
    if (originalAnalyticsConfig === undefined) {
      delete process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
    } else {
      process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG = originalAnalyticsConfig;
    }
  }
}

{
  const originalAnalyticsConfig = process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
  const configuredTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "judgmentkit-site-analytics-relative-"));

  process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG = JSON.stringify({
    analytics: {
      scriptSrc: "0011b2377a8b835f/script.js",
      eventEndpoint: "0011b2377a8b835f/event",
    },
  });

  try {
    await buildSite(configuredTempDir);
    const configuredExamples = fs.readFileSync(
      path.join(configuredTempDir, "examples", "index.html"),
      "utf8",
    );

    assert.ok(configuredExamples.includes('src="/0011b2377a8b835f/script.js"'));
    assert.ok(configuredExamples.includes('data-event-endpoint="/0011b2377a8b835f/event"'));
  } finally {
    if (originalAnalyticsConfig === undefined) {
      delete process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
    } else {
      process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG = originalAnalyticsConfig;
    }
  }
}

console.log("Site checks passed.");
