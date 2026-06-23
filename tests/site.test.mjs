import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../site/build-site.mjs";
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  MODEL_UI_INDEX_FILE,
  MODEL_UI_USE_CASES,
} from "../scripts/model-ui-use-cases.mjs";
import { getHostedMcpMetadata } from "../src/mcp-http.mjs";
import { createUiImplementationContract } from "../src/index.mjs";

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
  "list_icon_catalog",
  "search_icon_catalog",
  "get_icon_svg",
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

function cssCustomPropertyValues(css, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`${escapedName}:\\s*([^;]+);`, "g"))].map((match) => match[1].trim());
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
const mcpPilotCatalog = JSON.parse(
  fs.readFileSync(new URL("../evals/reports/mcp-pilot/index.json", import.meta.url), "utf8"),
);
const latestMcpPilotRun = mcpPilotCatalog.latest;
const latestMcpPilotLlmEvidencePath = new URL(
  `../evals/reports/mcp-pilot/${latestMcpPilotRun.run_path}/mcp-pilot-llm-evidence.md`,
  import.meta.url,
);
const hasLatestMcpPilotLlmEvidence = fs.existsSync(latestMcpPilotLlmEvidencePath);

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

function assertAnalyticsBootstrap(html, label) {
  assert.ok(html.includes("window.va = window.va || function"), `${label} should initialize Vercel Analytics queue`);
  assert.ok(html.includes('src="/_vercel/insights/script.js"'), `${label} should load Vercel Analytics script`);
  assert.ok(html.includes('data-sdkn="@vercel/analytics"'), `${label} should name the analytics SDK`);
  assert.ok(html.includes('data-sdkv="2.0.1"'), `${label} should include the analytics SDK version`);
}

const homepage = fs.readFileSync(path.join(tempDir, "index.html"), "utf8");
const llms = fs.readFileSync(path.join(tempDir, "llms.txt"), "utf8");
const siteCss = fs.readFileSync(path.join(tempDir, "assets", "site.css"), "utf8");
const systemMapFlowJs = fs.readFileSync(path.join(tempDir, "assets", "system-map-flow.js"), "utf8");
const systemMapFlowCss = fs.readFileSync(path.join(tempDir, "assets", "system-map-flow.css"), "utf8");
const systemMapFlowSource = fs.readFileSync(new URL("../site/system-map-flow.jsx", import.meta.url), "utf8");
const platformNavMarkup =
  homepage.match(/<nav class="surfaces-navigation" aria-label="Surfaces platform" data-surfaces-navigation>[\s\S]*?<\/nav>/)
    ?.[0] ?? "";
const homepageMain = homepage.match(/<main>([\s\S]*)<\/main>/)?.[1] ?? "";
assert.ok(systemMapFlowJs.includes("MCP boundary"));
assert.ok(systemMapFlowJs.includes("JudgmentKit React Flow system design map"));
assert.ok(systemMapFlowJs.includes("Source brief + product context"));
assert.ok(systemMapFlowJs.includes("Renderer choice after reviewed handoff"));
assert.ok(systemMapFlowJs.includes("Material UI adapter"));
assert.ok(systemMapFlowJs.includes("@mui/material components"));
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
assert.ok(systemMapFlowSource.includes('position="bottom-left"'));
assert.ok(systemMapFlowSource.includes('Background color="var(--rf-map-grid)"'));
assert.ok(systemMapFlowSource.includes('stroke: "var(--rf-map-edge-output)"'));
assert.equal(systemMapFlowSource.includes('position="top-left"'), false);
assert.match(
  systemMapFlowSource,
  /id: "material-ui-adapter"[\s\S]*?style: \{ width: 204, height: 112 \}/,
);
assert.match(
  systemMapFlowSource,
  /id: "without-design-system"[\s\S]*?style: \{ width: 204, height: 112 \}/,
);
assert.match(
  systemMapFlowSource,
  /id: "zone-generation"[\s\S]*?style: \{ width: 500, height: 640 \}/,
);
assert.equal(systemMapFlowSource.includes('id: "with-design-system"'), false);
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
assert.ok(siteCss.includes("--report-video-bg: #141b19;"));
assert.ok(siteCss.includes("--system-map-bg: #151a18;"));
assert.ok(siteCss.includes("background: var(--step-marker-bg);"));
assert.ok(siteCss.includes("color: var(--step-marker-ink);"));
assert.ok(siteCss.includes("background-color: var(--menu-item-bg);"));
assert.ok(siteCss.includes("background: var(--soft-surface);"));
assert.ok(siteCss.includes("background: var(--report-toc-bg);"));
assert.ok(siteCss.includes("background: var(--report-video-copy-bg);"));
assert.ok(siteCss.includes("background: var(--system-map-bg);"));
assert.ok(siteCss.includes(".doc-section[data-system-map-flow-section] {\n  overflow-x: hidden;"));
assert.ok(siteCss.includes(".system-map-canvas {\n  aspect-ratio: 1760 / 1040;\n  position: relative;\n  max-width: 100%;"));
assert.ok(siteCss.includes("contain: layout paint;\n  overflow: hidden;"));
assert.ok(siteCss.includes(".system-map-flow-root .react-flow,\n.system-map-flow-root .react-flow__renderer,\n.system-map-flow-root .react-flow__pane"));
assert.ok(siteCss.includes("box-shadow: 0 0 0 2px var(--focus-ring);"));
const stepMarkerBackgrounds = cssCustomPropertyValues(siteCss, "--step-marker-bg");
const stepMarkerTextColors = cssCustomPropertyValues(siteCss, "--step-marker-ink");
assert.deepEqual(stepMarkerBackgrounds, ["#245f73", "#a9d7e4"]);
assert.deepEqual(stepMarkerTextColors, ["#ffffff", "#101312"]);
assertContrastPair("light design-system step marker", stepMarkerTextColors[0], stepMarkerBackgrounds[0]);
assertContrastPair("dark design-system step marker", stepMarkerTextColors[1], stepMarkerBackgrounds[1]);
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
assert.ok(homepage.includes("Judgment before generation."));
assert.ok(homepage.includes("JudgmentKit catches implementation-shaped UI before it ships"));
assert.ok(homepage.includes('href="/value/"'));
assert.ok(homepage.includes('href="/evals/"'));
assert.ok(homepage.includes('class="hero-actions" aria-label="Primary proof paths"'));
assert.ok(homepage.includes('class="hero-action hero-action-primary" data-hero-action="primary" href="/value/"'));
assert.ok(homepage.includes('class="hero-action hero-action-secondary" data-hero-action="secondary" href="/examples/"'));
assert.ok(homepage.includes('data-hero-action="evidence" href="/evals/"'));
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
assert.ok(siteCss.includes(".evaluation-panel"));
assert.ok(siteCss.includes(".failure-grid"));
assert.ok(siteCss.includes(".route-grid-proof"));
assert.ok(siteCss.includes(".route-grid-adoption"));
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
assert.equal(homepage.includes('href="/assets/system-map-flow.css?v=judgmentkit-flow-controls-bottom-left"'), false);
assert.equal(homepage.includes('src="/assets/system-map-flow.js?v=judgmentkit-flow-controls-bottom-left"'), false);
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
assert.ok(homepage.includes('rel="image_src" href="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260611.png"'));
assert.ok(homepage.includes('property="og:image" content="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260611.png"'));
assert.ok(homepage.includes('property="og:image:secure_url" content="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260611.png"'));
assert.ok(homepage.includes('property="og:image:type" content="image/png"'));
assert.ok(homepage.includes('property="og:image:width" content="1200"'));
assert.ok(homepage.includes('property="og:image:height" content="630"'));
assert.ok(homepage.includes('property="og:image:alt" content="JudgmentKit. Before the UI."'));
assert.ok(homepage.includes('name="twitter:card" content="summary_large_image"'));
assert.ok(homepage.includes('name="twitter:image" content="https://judgmentkit.ai/assets/judgmentkit-social-thumbnail-20260611.png"'));
assert.ok(homepage.includes('name="twitter:image:alt" content="JudgmentKit. Before the UI."'));
assert.ok(llms.includes("- /evals/judgmentkit-mcp/"));
assert.ok(llms.includes("- /evals/site-rebuild-log/"));
assert.ok(llms.includes("- /value/"));
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
assert.ok(docs.includes("The default renderer/component package starts only after"));
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
assert.ok(docs.includes('href="/assets/system-map-flow.css?v=judgmentkit-flow-controls-bottom-left"'));
assert.ok(docs.includes('src="/assets/system-map-flow.js?v=judgmentkit-flow-controls-bottom-left"'));
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
assert.ok(docs.includes("Material UI adapter"));
assert.ok(docs.includes("selected surface type"));
assert.ok(docs.includes("Design-system compliance is not a substitute for activity fit"));
assert.ok(docs.includes("without design system"));
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
const componentContractsExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "component-contracts.json"), "utf8"),
);
const patternContractsExport = JSON.parse(
  fs.readFileSync(path.join(tempDir, "design-system", "pattern-contracts.json"), "utf8"),
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
assert.ok(designSystemComponents.includes("Core UI component contracts"));
assert.ok(designSystemComponents.includes("<h2 id=\"specimens\">Specimens</h2>"));
assert.ok(designSystemComponents.includes('data-specimen-id="component.action_button"'));
assert.ok(designSystemComponents.includes('data-contract-hash="sha256:'));
assert.ok(designSystemComponents.includes('data-component-state="focus-visible"'));
assert.ok(designSystemComponents.includes('data-component-anatomy="visible-label"'));
assert.ok(designSystemComponents.includes('data-token-role="decision"'));
assert.ok(designSystemComponents.includes("Contract hash"));
assert.ok(designSystemComponents.includes("Output hash"));
assert.ok(designSystemComponents.includes('data-component-contract="action_button"'));
assert.ok(designSystemComponents.includes('data-component-contract="dialog"'));
assert.ok(designSystemComponents.includes("required state coverage"));
assert.ok(designSystemPatterns.includes("<h1>Patterns</h1>"));
assert.ok(designSystemPatterns.includes("Surface pattern contracts"));
assert.ok(designSystemPatterns.includes("<h2 id=\"specimens\">Specimens</h2>"));
assert.ok(designSystemPatterns.includes('data-specimen-id="pattern.workbench"'));
assert.ok(designSystemPatterns.includes('data-pattern-region="work-queue"'));
assert.ok(designSystemPatterns.includes('data-pattern-control="decision-action"'));
assert.ok(designSystemPatterns.includes('data-pattern-contract="workbench"'));
assert.ok(designSystemPatterns.includes('data-surface-type="operator_review"'));
assert.ok(designSystemPatterns.includes("required regions"));
assert.ok(designSystemAccessibility.includes("<h1>Accessibility</h1>"));
assert.ok(designSystemAccessibility.includes("WCAG 2.2 AA"));
assert.ok(designSystemAccessibility.includes("Normal text contrast target: 4.5:1."));
assert.ok(designSystemAccessibility.includes('data-accessibility-contract="keyboard_and_focus"'));
assert.ok(designSystemComponentsMarkdown.includes("## Component Contracts"));
assert.ok(designSystemPatternsMarkdown.includes("## Surface Pattern Contracts"));
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
assert.ok(designSystemLlms.includes("/design-system/"));
assert.ok(designSystemLlms.includes("/design-system/index.html.md"));
assert.ok(designSystemLlms.includes("/design-system/manifest.json"));
assert.ok(designSystemLlms.includes("/design-system/component-contracts.json"));
assert.ok(designSystemLlms.includes("/design-system/pattern-contracts.json"));
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
assert.equal(designSystemManifest.exports.component_contracts, "/design-system/component-contracts.json");
assert.equal(designSystemManifest.exports.pattern_contracts, "/design-system/pattern-contracts.json");
assert.equal(designSystemManifest.exports.component_specimens, "/design-system/component-specimens.json");
assert.equal(designSystemManifest.exports.pattern_specimens, "/design-system/pattern-specimens.json");
assert.equal(designSystemManifest.exports.specimen_provenance, "/design-system/specimen-provenance.json");
assert.equal(designSystemManifest.exports.accessibility_policy, "/design-system/accessibility-policy.json");
assert.equal(designSystemManifest.section, "JudgmentKit Design System");
assert.equal(designSystemManifest.purpose, "Human reference for foundation assets.");
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
assert.ok(
  componentContractsExport.contracts
    .find((entry) => entry.id === "dialog")
    .accessibility_checks.includes("focus management"),
);
assert.equal(patternContractsExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(patternContractsExport.contracts.length, 8);
assert.ok(patternContractsExport.contracts.some((entry) => entry.id === "workbench"));
assert.equal(
  patternContractsExport.contracts.find((entry) => entry.id === "operator_review")
    .surface_type,
  "operator_review",
);
assert.equal(componentSpecimensExport.source, "judgmentkit.ai-native-default.contract-v1");
assert.equal(componentSpecimensExport.renderer.id, "judgmentkit-static-specimens");
assert.equal(componentSpecimensExport.specimens.length, componentContractsExport.contracts.length);
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
  hashCanonical(visualTokenAdapterExport.css_custom_properties),
);
assert.equal(
  specimenProvenanceExport.icon_catalog_hash,
  hashCanonical(visualTokenAdapterExport.icon_catalog),
);

for (const contract of componentContractsExport.contracts) {
  const specimen = componentSpecimensExport.specimens.find(
    (entry) => entry.contract_id === contract.id,
  );
  assert.ok(specimen, `${contract.id} should have a component specimen`);
  assert.equal(specimen.contract_hash, hashCanonical(contract));
  assert.equal(specimen.output_hash, hashText(specimen.rendered_html));
  assert.equal(
    specimen.selectors.root,
    `[data-specimen-id="component.${contract.id}"]`,
  );
  assert.ok(
    designSystemComponents.includes(`data-specimen-id="component.${contract.id}"`),
    `${contract.id} specimen root should render`,
  );
  for (const state of contract.required_states) {
    assert.ok(specimen.covered_states.includes(state), `${contract.id} should cover ${state}`);
    assert.ok(specimen.selectors.states[state], `${contract.id} should expose selector for ${state}`);
    assert.ok(
      specimen.rendered_html.includes(`data-component-state="${state}"`),
      `${contract.id} should render ${state}`,
    );
  }
  for (const anatomy of contract.anatomy) {
    assert.ok(
      specimen.rendered_html.includes(`data-component-anatomy="${anatomy.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}"`),
      `${contract.id} should render anatomy ${anatomy}`,
    );
  }
}

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
assert.ok(value.includes("Latest MCP pilot report"));
assert.ok(value.includes(`/evals/mcp-pilot/${latestMcpPilotRun.html_report}`));
if (hasLatestMcpPilotLlmEvidence) {
  assert.ok(value.includes("Latest LLM evidence"));
  assert.ok(value.includes(`/evals/mcp-pilot/${latestMcpPilotRun.run_path}/mcp-pilot-llm-evidence.md`));
} else {
  assert.equal(value.includes("Latest LLM evidence"), false);
  assert.equal(
    value.includes(`/evals/mcp-pilot/${latestMcpPilotRun.run_path}/mcp-pilot-llm-evidence.md`),
    false,
  );
}
assert.ok(value.includes("Milestone proof packet"));
assert.ok(value.includes("/evals/mcp-pilot/2026-06-15/mcp-0.2.0/run-001/mcp-pilot-evidence-packet.md"));
assert.equal(value.includes("/evals/mcp-pilot/2026-06-15/mcp-0.2.0/run-001/mcp-pilot-report.html"), false);
assert.ok(value.includes("/examples/one-shot-demo.html"));
assert.equal(valuePrimaryStory.includes("MCP"), false);
assert.ok(siteCss.includes(".value-page"));
assert.ok(siteCss.includes(".value-case"));
assert.ok(siteCss.includes(".value-screenshot-pair"));
assert.ok(siteCss.includes(".value-receipt"));

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
assert.ok(examples.includes("Tokens, system font stacks, and Lucide icon catalog policy remain governed metadata"));
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
assert.ok(examples.includes('class=\\"example-gallery\\" aria-label=\\"Model UI screenshot gallery\\"'));
assert.ok(examples.includes('class=\\"example-matrix-table\\"'));
assert.ok(examples.includes('class=\\"example-matrix-column-header\\"'));
assert.ok(examples.includes('class=\\"example-matrix-cell\\"'));
assert.ok(examples.includes('class=\\"example-matrix-thumb\\"'));
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
assert.ok(examples.includes('data-gallery-open=\\"0\\"'));
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
assert.ok(examples.includes("/examples/model-ui/refund-system-map/manifest.json"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-with-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-material-ui-only.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-judgmentkit-material-ui.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-no-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-with-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-material-ui-only.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gemma4-lms-judgmentkit-material-ui.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-no-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-with-judgmentkit.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-material-ui-only.png"));
assert.ok(examples.includes("/examples/model-ui/refund-system-map/screenshots/gpt55-xhigh-codex-judgmentkit-material-ui.png"));
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
  const manifestRoute = `/${useCase.manifest_path}`;
  assert.ok(examples.includes(useCase.label), `${useCase.id} label should appear in examples`);
  assert.ok(examples.includes(useCase.activity_summary), `${useCase.id} summary should appear in examples`);
  assert.ok(examples.includes(useCaseRoute), `${useCase.id} matrix route should appear`);
  assert.ok(examples.includes(manifestRoute), `${useCase.id} manifest route should appear`);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(tempDir, ...useCase.manifest_path.split("/")), "utf8"),
  );
  assert.equal(manifest.use_case_id, useCase.id);
  assert.equal(manifest.use_case_label, useCase.label);
  assert.equal(manifest.comparison_rows.length, 3);
  assert.equal(manifest.comparison_columns.length, 4);
  assert.equal(manifest.artifacts.length, 12);
  assert.equal(
    manifest.artifacts.length,
    COMPARISON_ROWS.length * COMPARISON_COLUMNS.length,
    `${useCase.id} should include every matrix cell`,
  );

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
}
assert.equal(examples.includes("/examples/comparison/music/version-a.html"), false);
assert.equal(examples.includes("/examples/comparison/music/version-b.html"), false);
assert.equal(examples.includes("/examples/comparison/music/facilitator-scorecard.md"), false);
assert.equal(examples.includes("/examples/evals/"), false);
assert.equal(examples.includes("/examples/evals/index.json"), false);
assert.ok(examples.includes("Gemma 4 (local LLM)"));
assert.ok(examples.includes("GPT-5.5"));
assert.ok(examples.includes("Gemma 4 via LM Studio lms"));
assert.ok(examples.includes("GPT-5.5 xhigh via codex exec"));
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
assert.ok(evals.includes("Latest run"));
assert.ok(evals.includes("Claim level"));
assert.ok(evals.includes("statistically powered benchmark"));
assert.ok(evals.includes("/evals/judgmentkit-mcp/"));
assert.ok(evals.includes("/evals/site-rebuild-log/"));
assert.ok(evals.includes("/evals/index.json"));
assert.ok(evals.includes(`/evals/${evalCatalog.latest.html_report}`));
assert.ok(evals.includes(`/evals/${evalCatalog.latest.json_report}`));
assert.equal(evals.includes("/examples/evals/"), false);
assert.ok(evals.includes('class="site-shell evals-shell"'));
assert.ok(siteCss.includes('--eval-serif: "Source Serif 4"'));
assert.ok(siteCss.includes(".evals-page {\n  padding-top: var(--site-page-top);\n  font-family: var(--eval-serif);"));
assert.ok(siteCss.includes(".evals-shell {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);"));
assert.ok(siteCss.includes("font-family: var(--eval-serif);"));
assert.ok(siteCss.includes(".evals-table-shell {\n  max-width: 100%;"));

assert.equal(evalCatalog.catalog_id, "judgmentkit-ui-generation-eval-runs");
assert.ok(evalCatalog.latest, "eval catalog should expose latest run");
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
assert.equal(
  fs.existsSync(path.join(tempDir, "examples", "evals", "index.html")),
  true,
  "expected legacy examples eval index compatibility path",
);
assert.equal(
  fs.existsSync(path.join(tempDir, "examples", "evals", evalCatalog.latest.html_report)),
  true,
  "expected legacy examples eval report compatibility path",
);
assert.equal(
  fs.existsSync(path.join(tempDir, "examples", "evals", latestScreenshotPath)),
  true,
  "expected legacy examples eval screenshot compatibility path",
);

const mcpReportPath = path.join(tempDir, "evals", "judgmentkit-mcp", "index.html");
assert.equal(fs.existsSync(mcpReportPath), true, "expected public JudgmentKit MCP report route");
const mcpReport = fs.readFileSync(mcpReportPath, "utf8");
assertAnalyticsBootstrap(mcpReport, "judgmentkit mcp report");
assert.ok(mcpReport.includes("JudgmentKit MCP: Evidence for Activity-First UI Generation"));
assert.ok(mcpReport.includes('rel="canonical" href="https://judgmentkit.ai/evals/judgmentkit-mcp/"'));
assert.ok(mcpReport.includes("qualitative paired-artifact scoring"));
assert.ok(mcpReport.includes("not a statistically powered benchmark"));
assert.ok(mcpReport.includes("JudgmentKit MCP report overview"));
assert.ok(mcpReport.includes("Raw-to-guided generation placeholder"));
assert.ok(mcpReport.includes("Disclosure cleanup placeholder"));
assert.ok(mcpReport.includes("Model matrix walkthrough placeholder"));
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
assert.ok(mcpReport.includes("/examples/model-ui/refund-system-map/artifacts/deterministic-no-judgmentkit.html"));
assert.ok(mcpReport.includes("/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png"));
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
assert.ok(siteCss.includes(".report-video"));
assert.ok(siteCss.includes(".report-score-chart"));
assert.ok(siteCss.includes(".report-context-matrix"));

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
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-lms-with-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-lms-material-ui-only.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-lms-judgmentkit-material-ui.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-no-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-with-judgmentkit.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-material-ui-only.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-xhigh-codex-judgmentkit-material-ui.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "deterministic-without-design-system.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "deterministic-with-design-system.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-without-design-system.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gemma4-with-design-system.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-without-design-system.html"],
  ["examples", "model-ui", "refund-system-map", "artifacts", "gpt55-with-design-system.html"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-no-judgmentkit.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-with-judgmentkit.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-material-ui-only.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-lms-judgmentkit-material-ui.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-no-judgmentkit.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-with-judgmentkit.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-material-ui-only.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-xhigh-codex-judgmentkit-material-ui.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-without-design-system.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gemma4-with-design-system.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-without-design-system.json"],
  ["examples", "model-ui", "refund-system-map", "captures", "gpt55-with-design-system.json"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-no-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-with-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-material-ui-only.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-judgmentkit-material-ui.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-no-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-with-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-material-ui-only.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-lms-judgmentkit-material-ui.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-no-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-with-judgmentkit.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-material-ui-only.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-xhigh-codex-judgmentkit-material-ui.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-without-design-system.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "deterministic-with-design-system.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-without-design-system.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gemma4-with-design-system.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-without-design-system.png"],
  ["examples", "model-ui", "refund-system-map", "screenshots", "gpt55-with-design-system.png"],
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
  ["examples", "evals", "index.html"],
  ["examples", "evals", "index.json"],
  ["examples", "evals", ...evalCatalog.latest.html_report.split("/")],
  ["examples", "evals", ...evalCatalog.latest.json_report.split("/")],
  ["examples", "evals", ...latestScreenshotPath.split("/")],
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
const versionedSocialThumbnail = fs.readFileSync(path.join(tempDir, "assets", "judgmentkit-social-thumbnail-20260611.png"));
assert.equal(versionedSocialThumbnail.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(versionedSocialThumbnail.readUInt32BE(16), 1200);
assert.equal(versionedSocialThumbnail.readUInt32BE(20), 630);

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
