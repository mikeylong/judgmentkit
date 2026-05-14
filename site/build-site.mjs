#!/usr/bin/env node
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildWithEsbuild } from "esbuild";

import {
  JUDGMENTKIT_MCP_TOOL_NAMES,
} from "../scripts/install-mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT_DIR = path.join(__dirname, "dist");
const require = createRequire(import.meta.url);
const ANALYTICS_SDK_VERSION = require("@vercel/analytics/package.json").version;
const SYSTEM_MAP_FLOW_ASSET_VERSION = "judgmentkit-flow-aligned";

function parseArgs(argv) {
  const outIndex = argv.indexOf("--out");
  if (outIndex === -1) {
    return { outDir: DEFAULT_OUT_DIR };
  }

  const outDir = argv[outIndex + 1];
  if (!outDir) {
    throw new Error("--out requires a directory.");
  }

  return { outDir: path.resolve(outDir) };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function serializeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function getAnalyticsConfig() {
  let analyticsConfig = {};

  try {
    analyticsConfig = JSON.parse(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG ?? "{}").analytics ?? {};
  } catch {
    analyticsConfig = {};
  }

  function normalizeRoute(value) {
    if (value === undefined) return undefined;
    if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:")) {
      return value;
    }
    return `/${value.replace(/^\.?\//, "")}`;
  }

  return {
    scriptSrc: normalizeRoute(analyticsConfig.scriptSrc ?? "/_vercel/insights/script.js"),
    eventEndpoint: normalizeRoute(analyticsConfig.eventEndpoint),
    viewEndpoint: normalizeRoute(analyticsConfig.viewEndpoint),
    sessionEndpoint: normalizeRoute(analyticsConfig.sessionEndpoint),
    endpoint: normalizeRoute(analyticsConfig.endpoint),
    dsn: analyticsConfig.dsn,
  };
}

function analyticsAttributes() {
  const config = getAnalyticsConfig();
  const attributes = {
    defer: true,
    src: config.scriptSrc,
    "data-sdkn": "@vercel/analytics",
    "data-sdkv": ANALYTICS_SDK_VERSION,
    "data-event-endpoint": config.eventEndpoint,
    "data-view-endpoint": config.viewEndpoint,
    "data-session-endpoint": config.sessionEndpoint,
    "data-endpoint": config.endpoint,
    "data-dsn": config.dsn,
  };

  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) => (value === true ? name : `${name}="${escapeHtml(value)}"`))
    .join(" ");
}

function analyticsBootstrap() {
  return `    <script>
      window.va = window.va || function () {
        (window.vaq = window.vaq || []).push(arguments);
      };
    </script>
    <script ${analyticsAttributes()}></script>`;
}

function addAnalyticsToHtml(html) {
  if (html.includes("window.va = window.va || function")) {
    return html;
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `${analyticsBootstrap()}\n  </head>`);
  }

  return html;
}

function page(title, body, options = {}) {
  const description =
    options.description ??
    "JudgmentKit is an activity-first judgment layer for AI-generated product work.";
  const pathName = options.path ?? "/";
  const canonicalUrl = `https://judgmentkit.ai${pathName}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <meta property="og:site_name" content="JudgmentKit">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="/assets/site.css">
${options.headExtra ?? ""}
${analyticsBootstrap()}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">JudgmentKit</a>
      <nav aria-label="Primary">
        <a href="/docs/">Docs</a>
        <a href="/examples/">Examples</a>
        <a href="/evals/">Evals</a>
        <a href="/mcp">MCP</a>
      </nav>
    </header>
    <main>${body}</main>
  </body>
</html>`;
}

function systemMapFlowAssets() {
  return `    <link rel="stylesheet" href="/assets/system-map-flow.css?v=${SYSTEM_MAP_FLOW_ASSET_VERSION}">
    <script type="module" src="/assets/system-map-flow.js?v=${SYSTEM_MAP_FLOW_ASSET_VERSION}"></script>`;
}

function systemMapShell(titleId, descId) {
  return `
      <div class="system-map-canvas system-map-flow-shell" data-system-map-flow-viewer>
        <div
          class="system-map-flow-root"
          data-system-map-flow-root
          role="application"
          aria-label="React Flow system design map"
        ></div>
        <div class="system-map-fallback" data-system-map-fallback>
          ${systemMapFallbackSvg(titleId, descId)}
        </div>
      </div>`;
}

function systemMapFallbackSvg(titleId, descId) {
  return `<svg class="system-map-svg system-map-fallback-svg" data-system-map-svg-fallback viewBox="0 0 1760 1120" preserveAspectRatio="xMidYMin meet" role="img" aria-labelledby="${escapeHtml(titleId)} ${escapeHtml(descId)}">
          <title id="${escapeHtml(titleId)}">JudgmentKit system design map</title>
          <desc id="${escapeHtml(descId)}">A static fallback node and edge diagram showing source context, the MCP boundary, JudgmentKit kernel, optional LLM provider seam, UI rendering outside JudgmentKit, Material UI adapter, blocked path, and iteration with updated context returning to source and activity review.</desc>
          <defs>
            <marker id="system-map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#245f73"></path>
            </marker>
          </defs>

          <rect class="map-zone" x="36" y="64" width="330" height="470" rx="18"></rect>
          <text class="map-boundary" x="60" y="104">MCP boundary</text>
          <text class="map-zone-title" x="60" y="138">Agent / Client / MCP</text>
          <rect class="map-node" x="60" y="156" width="282" height="78" rx="12"></rect>
          <text class="map-node-title" x="78" y="188">Codex or agent client</text>
          <text class="map-node-text" x="78" y="212">Calls tools; owns the turn.</text>
          <rect class="map-node" x="60" y="258" width="282" height="112" rx="12"></rect>
          <text class="map-node-title" x="78" y="290">Source brief + product context</text>
          <text class="map-node-text" x="78" y="314">Brief, product facts,</text>
          <text class="map-node-text" x="78" y="338">current draft findings.</text>
          <rect class="map-node" x="60" y="392" width="282" height="116" rx="12"></rect>
          <text class="map-node-title" x="78" y="424">MCP server</text>
          <text class="map-node-text" x="78" y="448">Access and transport only.</text>
          <text class="map-node-text" x="78" y="472">MCP is not the LLM.</text>
          <text class="map-node-code" x="78" y="496">tools/list + tools/call</text>

          <rect class="map-zone map-zone-kernel" x="430" y="64" width="700" height="670" rx="18"></rect>
          <text class="map-boundary" x="458" y="104">JudgmentKit kernel</text>
          <text class="map-zone-title" x="458" y="138">Deterministic review, guardrails, handoff</text>
          <rect class="map-node map-node-kernel" x="462" y="170" width="292" height="100" rx="12"></rect>
          <text class="map-node-code" x="482" y="202">analyze_implementation_brief</text>
          <text class="map-node-text" x="482" y="228">Extract activity evidence, source gaps,</text>
          <text class="map-node-text" x="482" y="250">implementation terms, disclosure risks.</text>
          <rect class="map-node map-node-kernel" x="804" y="170" width="292" height="100" rx="12"></rect>
          <text class="map-node-code" x="824" y="202">create_activity_model_review</text>
          <text class="map-node-text" x="824" y="228">Name activity, participant, objective,</text>
          <text class="map-node-text" x="824" y="250">decision, outcome, vocabulary.</text>
          <rect class="map-node map-node-kernel" x="462" y="318" width="292" height="100" rx="12"></rect>
          <text class="map-node-code" x="482" y="350">review_activity_model_candidate</text>
          <text class="map-node-text" x="482" y="376">Review model or agent candidates</text>
          <text class="map-node-text" x="482" y="398">before trusting them.</text>
          <rect class="map-node map-node-kernel" x="804" y="318" width="292" height="100" rx="12"></rect>
          <text class="map-node-code" x="824" y="350">review_ui_workflow_candidate</text>
          <text class="map-node-text" x="824" y="376">Check grounding, action support,</text>
          <text class="map-node-text" x="824" y="398">handoff clarity, leakage containment.</text>
          <rect class="map-node map-node-kernel" x="462" y="466" width="292" height="100" rx="12"></rect>
          <text class="map-node-code" x="482" y="498">recommend_ui_workflow_profiles</text>
          <text class="map-node-text" x="482" y="524">Optional guidance such as</text>
          <text class="map-node-text" x="482" y="546">operator-review-ui; not styling.</text>
          <rect class="map-node map-node-kernel" x="804" y="466" width="292" height="100" rx="12"></rect>
          <text class="map-node-code" x="824" y="498">create_ui_generation_handoff</text>
          <text class="map-node-text" x="824" y="524">Gate: only ready workflow reviews</text>
          <text class="map-node-text" x="824" y="546">become generation handoffs.</text>
          <rect class="map-node map-node-blocked" x="594" y="606" width="420" height="94" rx="12"></rect>
          <text class="map-node-title" x="616" y="638">Blocked path</text>
          <text class="map-node-text" x="616" y="662">Resolve targeted questions or leakage</text>
          <text class="map-node-text" x="616" y="684">before UI generation.</text>

          <rect class="map-zone map-zone-llm" x="1212" y="64" width="500" height="286" rx="18"></rect>
          <text class="map-boundary" x="1240" y="104">LLM / provider seam</text>
          <text class="map-zone-title" x="1240" y="138">Optional model assistance</text>
          <rect class="map-node map-node-llm" x="1240" y="170" width="204" height="116" rx="12"></rect>
          <text class="map-node-title" x="1258" y="202">Provider adapter</text>
          <text class="map-node-text" x="1258" y="226">OpenAI, local model,</text>
          <text class="map-node-text" x="1258" y="250">or injected caller.</text>
          <rect class="map-node map-node-llm" x="1470" y="170" width="204" height="116" rx="12"></rect>
          <text class="map-node-title" x="1488" y="202">Candidate proposal</text>
          <text class="map-node-text" x="1488" y="226">Activity/workflow JSON.</text>
          <text class="map-node-text" x="1488" y="250">Reviewed before use.</text>

          <rect class="map-zone map-zone-output" x="1212" y="412" width="500" height="640" rx="18"></rect>
          <text class="map-boundary" x="1240" y="452">Outside JudgmentKit</text>
          <text class="map-zone-title" x="1240" y="486">UI rendering from reviewed handoff</text>
          <rect class="map-node map-node-output" x="1240" y="518" width="434" height="94" rx="12"></rect>
          <text class="map-node-title" x="1258" y="550">LLM / agent UI pass</text>
          <text class="map-node-text" x="1258" y="574">Generate from reviewed handoff,</text>
          <text class="map-node-text" x="1258" y="596">not raw brief.</text>
          <rect class="map-node map-node-output" x="1240" y="640" width="434" height="106" rx="12"></rect>
          <text class="map-node-title" x="1258" y="672">Renderer choice after reviewed handoff</text>
          <text class="map-node-text" x="1258" y="696">JudgmentKit does not enforce</text>
          <text class="map-node-text" x="1258" y="720">Material UI or any design system.</text>
          <rect class="map-node map-node-output" x="1240" y="774" width="204" height="112" rx="12"></rect>
          <text class="map-node-title" x="1258" y="806">Material UI adapter</text>
          <text class="map-node-text" x="1258" y="830">@mui/material components</text>
          <text class="map-node-text" x="1258" y="854">applied after judgment.</text>
          <rect class="map-node map-node-output" x="1470" y="774" width="204" height="112" rx="12"></rect>
          <text class="map-node-title" x="1488" y="806">without design</text>
          <text class="map-node-title" x="1488" y="828">system</text>
          <text class="map-node-text" x="1488" y="854">Still use the handoff;</text>
          <text class="map-node-text" x="1488" y="876">choose simple UI primitives.</text>
          <rect class="map-node map-node-output" x="1240" y="916" width="434" height="82" rx="12"></rect>
          <text class="map-node-title" x="1258" y="948">UI draft</text>
          <text class="map-node-text" x="1258" y="972">Reviewed by human or agent for next iteration.</text>

          <rect class="map-zone" x="430" y="780" width="700" height="190" rx="18"></rect>
          <text class="map-boundary" x="458" y="820">Iteration loop</text>
          <text class="map-zone-title" x="458" y="854">Draft findings become updated context</text>
          <rect class="map-node" x="462" y="884" width="292" height="60" rx="12"></rect>
          <text class="map-node-title" x="482" y="920">Review findings</text>
          <rect class="map-node map-node-kernel" x="804" y="884" width="292" height="60" rx="12"></rect>
          <text class="map-node-title" x="824" y="920">updated context</text>

          <path class="map-edge map-edge-muted" d="M 201 370 L 201 392"></path>
          <path class="map-edge" d="M 342 450 C 388 450 382 220 462 220"></path>
          <text class="map-edge-label" x="350" y="360">MCP tool call</text>
          <path class="map-edge map-edge-muted" d="M 754 220 L 804 220"></path>
          <path class="map-edge map-edge-muted" d="M 950 270 L 950 318"></path>
          <path class="map-edge map-edge-muted" d="M 754 368 L 804 368"></path>
          <path class="map-edge map-edge-muted" d="M 950 418 L 950 466"></path>
          <path class="map-edge map-edge-blocked" d="M 804 544 C 744 580 704 590 672 606"></path>
          <path class="map-edge map-edge-blocked" d="M 594 650 C 372 650 342 512 292 508"></path>
          <text class="map-edge-label" x="348" y="620">needs source context</text>
          <path class="map-edge map-edge-llm" d="M 1096 368 C 1166 338 1192 238 1240 226"></path>
          <text class="map-edge-label" x="1130" y="302">request candidate</text>
          <path class="map-edge map-edge-llm" d="M 1470 226 C 1340 300 1220 362 1096 368"></path>
          <text class="map-edge-label" x="1302" y="338">proposed JSON returns for review</text>
          <path class="map-edge map-edge-output" d="M 1096 516 C 1158 516 1178 564 1240 564"></path>
          <text class="map-edge-label" x="1124" y="546">reviewed handoff</text>
          <path class="map-edge map-edge-output" d="M 1457 612 L 1457 640"></path>
          <path class="map-edge map-edge-output" d="M 1457 746 C 1356 746 1342 774 1342 774"></path>
          <text class="map-edge-label" x="1246" y="760">with design system</text>
          <path class="map-edge map-edge-output" d="M 1457 746 C 1560 746 1572 774 1572 774"></path>
          <text class="map-edge-label" x="1500" y="760">without design system</text>
          <path class="map-edge map-edge-output" d="M 1342 886 C 1342 904 1457 904 1457 916"></path>
          <path class="map-edge map-edge-output" d="M 1572 886 C 1572 904 1457 904 1457 916"></path>
          <path class="map-edge" d="M 1240 958 C 1068 920 912 914 754 914"></path>
          <text class="map-edge-label" x="1030" y="930">review draft</text>
          <path class="map-edge map-edge-muted" d="M 754 914 L 804 914"></path>
          <path class="map-edge" d="M 804 914 C 640 760 420 420 342 314"></path>
          <text class="map-edge-label" x="492" y="766">updated context returns to source/activity review</text>
        </svg>`;
}

const stylesheet = `
:root {
  color-scheme: light;
  --bg: #f8f7f2;
  --ink: #171717;
  --muted: #61615c;
  --line: #d7d3c8;
  --panel: #ffffff;
  --accent: #245f73;
  --accent-strong: #133f4e;
  --ok: #2e6b48;
  --warn: #8a5a16;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a {
  color: var(--accent-strong);
}
[id] {
  scroll-margin-top: 126px;
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px clamp(18px, 4vw, 56px);
  border-bottom: 1px solid var(--line);
  background: rgba(248, 247, 242, 0.96);
  position: sticky;
  top: 0;
  z-index: 2;
}
.brand {
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
}
nav {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
nav a {
  color: var(--muted);
  text-decoration: none;
}
.hero,
.section {
  padding: clamp(42px, 7vw, 86px) clamp(18px, 4vw, 56px);
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
  min-height: 78vh;
}
.eyebrow {
  color: var(--accent-strong);
  font-weight: 700;
  margin: 0 0 14px;
}
h1,
h2,
h3,
p {
  margin-top: 0;
}
h1 {
  max-width: 12ch;
  font-size: clamp(44px, 6vw, 78px);
  line-height: 0.98;
  letter-spacing: 0;
  margin-bottom: 20px;
}
h2 {
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.06;
  letter-spacing: 0;
}
.lede {
  max-width: 66ch;
  color: var(--muted);
  font-size: 19px;
}
.note {
  max-width: 74ch;
  color: var(--muted);
}
.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 14px 0 0;
}
.pill-link {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  text-decoration: none;
  font-weight: 700;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
.hero-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid var(--accent-strong);
  border-radius: 8px;
  font-weight: 800;
  text-decoration: none;
}
.hero-action-primary {
  color: var(--bg);
  background: var(--accent-strong);
}
.hero-action-secondary {
  color: var(--accent-strong);
  background: transparent;
}
.proof-panel,
.route-grid article {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 8px;
}
.proof-panel {
  overflow: hidden;
  box-shadow: 0 18px 36px rgba(23, 23, 23, 0.08);
}
.proof-step {
  display: grid;
  grid-template-columns: 134px minmax(0, 1fr);
  gap: 16px;
  padding: 16px 18px;
  border-top: 1px solid var(--line);
}
.proof-step:first-child {
  border-top: 0;
}
.proof-step strong {
  color: var(--accent-strong);
}
.proof-step code,
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.proof-step code {
  font-size: 14px;
  line-height: 1.4;
}
.prompt-evidence {
  color: var(--accent-strong);
  background: rgba(36, 95, 115, 0.07);
  border-radius: 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  padding: 0 0.08em;
}
.prompt-evidence-diagnostic {
  color: #684310;
  background: rgba(138, 90, 22, 0.08);
}
.prompt-evidence-block {
  display: grid;
  gap: 12px;
}
.prompt-evidence-key {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.status {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ok);
  background: #f4fbf6;
  width: fit-content;
}
.status.prompt-evidence-pill {
  border-color: transparent;
  min-height: 26px;
  padding: 3px 9px;
  font-size: 12px;
}
.status.prompt-evidence-pill-activity {
  color: var(--accent-strong);
  background: rgba(36, 95, 115, 0.08);
}
.status.prompt-evidence-pill-diagnostic {
  color: #684310;
  background: rgba(138, 90, 22, 0.09);
}
.section {
  border-top: 1px solid var(--line);
}
.route-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.route-grid article {
  padding: 18px;
}
.route-grid h3 {
  margin-bottom: 8px;
}
.system-diagram {
  margin-top: 18px;
}
.system-diagram-intro {
  max-width: 78ch;
}
.system-flow {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}
.system-flow-detailed {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.system-node {
  position: relative;
  min-height: 118px;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.system-node::after {
  content: "->";
  position: absolute;
  top: 14px;
  right: -9px;
  z-index: 1;
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  background: var(--bg);
  font-size: 11px;
  font-weight: 800;
}
.system-node:last-child::after {
  content: "loop";
  right: 10px;
  width: auto;
  padding: 0 6px;
}
.system-flow-detailed .system-node::after {
  content: none;
}
.system-flow-detailed .system-node:last-child::after {
  content: "loops to 1";
  top: auto;
  right: 10px;
  bottom: 10px;
  width: auto;
  padding: 0 6px;
}
.system-node-kernel {
  border-color: rgba(36, 95, 115, 0.28);
  background: rgba(36, 95, 115, 0.05);
}
.system-node-output {
  border-color: rgba(46, 115, 70, 0.26);
  background: rgba(46, 115, 70, 0.05);
}
.system-node span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.system-node strong {
  display: block;
  margin-top: 7px;
  color: var(--accent-strong);
}
.system-node p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.45;
}
.system-node code {
  font-size: 12px;
}
.system-note {
  max-width: 78ch;
  margin-top: 14px;
  color: var(--muted);
}
.system-branch {
  margin-top: 14px;
  padding: 13px;
  border-left: 3px solid rgba(138, 90, 22, 0.35);
  background: rgba(138, 90, 22, 0.06);
  color: #684310;
}
.system-map-toolbar {
  margin: 18px 0 10px;
}
.system-map-canvas {
  aspect-ratio: 1760 / 1040;
  position: relative;
  min-height: 420px;
  max-height: 760px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
  overflow: hidden;
}
.system-map-flow-root,
.system-map-fallback {
  position: absolute;
  inset: 0;
}
.system-map-flow-root {
  z-index: 2;
}
.system-map-flow-root:empty {
  display: none;
}
.system-map-fallback {
  z-index: 1;
}
.system-map-fallback[hidden] {
  display: none;
}
.system-map-svg {
  display: block;
  width: 100%;
  height: 100%;
}
.system-map-svg text {
  fill: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.system-map-svg .map-zone {
  fill: rgba(255, 255, 255, 0.78);
  stroke: var(--line);
  stroke-width: 2;
}
.system-map-svg .map-zone-kernel {
  fill: rgba(36, 95, 115, 0.06);
  stroke: rgba(36, 95, 115, 0.34);
}
.system-map-svg .map-zone-llm {
  fill: rgba(138, 90, 22, 0.07);
  stroke: rgba(138, 90, 22, 0.32);
}
.system-map-svg .map-zone-output {
  fill: rgba(46, 115, 70, 0.07);
  stroke: rgba(46, 115, 70, 0.32);
}
.system-map-svg .map-zone-title {
  fill: var(--accent-strong);
  font-size: 24px;
  font-weight: 800;
}
.system-map-svg .map-boundary {
  fill: var(--muted);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.system-map-svg .map-node {
  fill: #ffffff;
  stroke: var(--line);
  stroke-width: 2;
}
.system-map-svg .map-node-kernel {
  fill: #eef5f3;
  stroke: rgba(36, 95, 115, 0.34);
}
.system-map-svg .map-node-llm {
  fill: #fbf3e7;
  stroke: rgba(138, 90, 22, 0.34);
}
.system-map-svg .map-node-output {
  fill: #f0f8f2;
  stroke: rgba(46, 115, 70, 0.32);
}
.system-map-svg .map-node-blocked {
  fill: #fff7ec;
  stroke: rgba(138, 90, 22, 0.42);
  stroke-dasharray: 8 6;
}
.system-map-svg .map-node-title {
  fill: var(--accent-strong);
  font-size: 18px;
  font-weight: 800;
}
.system-map-svg .map-node-text {
  fill: var(--ink);
  font-size: 14px;
}
.system-map-svg .map-node-code {
  fill: var(--accent-strong);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  font-weight: 800;
}
.system-map-svg .map-edge {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  marker-end: url(#system-map-arrow);
}
.system-map-svg .map-edge-muted {
  stroke: var(--line);
  stroke-width: 2.5;
}
.system-map-svg .map-edge-llm {
  stroke: var(--warn);
  stroke-dasharray: 8 7;
}
.system-map-svg .map-edge-blocked {
  stroke: var(--warn);
  stroke-dasharray: 5 7;
}
.system-map-svg .map-edge-output {
  stroke: var(--ok);
}
.system-map-svg .map-edge-label {
  fill: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.system-map-summary {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.system-map-summary p {
  margin-bottom: 0;
}
.command {
  display: block;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid var(--line);
  background: #f2f1eb;
  border-radius: 8px;
  overflow-x: auto;
}
.doc-layout {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  max-width: 1120px;
  gap: 32px;
  align-items: start;
}
.doc-nav {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 10px;
}
.doc-section {
  padding-bottom: 28px;
}
.examples-page {
  padding-top: clamp(36px, 5vw, 62px);
}
.example-preview-focus {
  display: grid;
  gap: 24px;
  max-width: 1220px;
  margin: 0 auto;
}
.example-preview-header {
  display: grid;
  gap: 12px;
  margin-bottom: 0;
}
.example-preview-title-row {
  display: flex;
  gap: 18px;
  align-items: start;
  justify-content: space-between;
}
.example-preview-title-row h1 {
  margin-bottom: 14px;
}
.example-preview-title-row h2 {
  margin-bottom: 6px;
}
.example-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.example-preview-body {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.example-static-preview,
.example-gallery-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.example-static-preview {
  padding: clamp(18px, 3vw, 28px);
}
.example-static-preview h3,
.example-gallery-intro h3 {
  margin-bottom: 8px;
}
.example-static-preview p,
.example-gallery-intro p {
  margin-bottom: 16px;
}
.example-gallery {
  display: grid;
  gap: 18px;
}
.example-gallery-intro {
  max-width: 760px;
}
.model-ui-use-case-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.model-ui-use-case-tab {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}
.model-ui-use-case-tab[aria-pressed="true"] {
  border-color: var(--accent);
  background: #edf5f6;
  color: var(--accent-strong);
}
.model-ui-use-case-panel {
  display: grid;
  gap: 16px;
}
.model-ui-use-case-panel[hidden] {
  display: none;
}
.example-gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.example-comparison-list {
  display: grid;
  gap: 18px;
}
.example-comparison-row {
  display: grid;
  gap: 14px;
  padding: clamp(14px, 2vw, 18px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
}
.example-comparison-heading {
  display: grid;
  gap: 4px;
  max-width: 760px;
}
.example-comparison-heading h3,
.example-comparison-heading p {
  margin: 0;
}
.example-comparison-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.example-gallery-card {
  overflow: hidden;
}
.example-matrix-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}
.example-matrix-table {
  display: grid;
  grid-template-columns: minmax(128px, 0.9fr) repeat(4, minmax(0, 1fr));
  min-width: 620px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.example-matrix-axis,
.example-matrix-column-header,
.example-matrix-row-heading,
.example-matrix-cell {
  min-width: 0;
}
.example-matrix-axis,
.example-matrix-column-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  background: #f5f3ec;
}
.example-matrix-axis {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.example-matrix-column-header {
  border-left: 1px solid var(--line);
}
.example-matrix-column-header strong,
.example-matrix-column-header span {
  display: block;
}
.example-matrix-column-header strong {
  font-size: 13px;
  line-height: 1.2;
}
.example-matrix-column-header span {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.25;
}
.example-matrix-row-heading,
.example-matrix-cell {
  border-top: 1px solid var(--line);
}
.example-matrix-row-heading {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 12px;
  background: #fbfaf6;
}
.example-matrix-row-heading .eyebrow,
.example-matrix-row-heading h3,
.example-matrix-row-heading p {
  margin: 0;
}
.example-matrix-row-heading h3 {
  font-size: 16px;
  line-height: 1.2;
}
.example-matrix-row-heading p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}
.example-matrix-cell {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 8px;
  border-left: 1px solid var(--line);
  background: #ffffff;
}
.example-matrix-thumb {
  display: block;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f2f1eb;
}
.example-matrix-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 180ms ease;
}
.example-matrix-thumb:hover img,
.example-matrix-thumb:focus-visible img {
  transform: scale(1.025);
}
.example-matrix-cell-copy {
  display: grid;
  gap: 4px;
}
.example-matrix-cell-copy .eyebrow {
  margin: 0;
  overflow: hidden;
  color: var(--accent);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.example-matrix-cell-copy h4 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 0;
  font-size: 13px;
  line-height: 1.2;
}
.example-matrix-cell-copy .note {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}
.example-gallery-thumb {
  display: block;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: #f2f1eb;
}
.example-gallery-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 180ms ease;
}
.example-gallery-thumb:hover img,
.example-gallery-thumb:focus-visible img {
  transform: scale(1.025);
}
.example-gallery-card-copy {
  display: grid;
  gap: 10px;
  padding: 14px;
}
.example-gallery-card-copy h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.18;
}
.example-gallery-card-copy p {
  margin: 0;
}
.example-gallery-meta,
.example-gallery-modal-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.example-gallery-meta div,
.example-gallery-modal-meta div {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f8f7f1;
}
.example-gallery-meta dt,
.example-gallery-modal-meta dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.example-gallery-meta dd,
.example-gallery-modal-meta dd {
  margin: 2px 0 0;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.example-gallery-card-actions,
.example-gallery-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.example-gallery-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  padding: clamp(12px, 2vw, 24px);
}
.example-gallery-modal[hidden] {
  display: none;
}
.example-gallery-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(20, 28, 31, 0.72);
  cursor: zoom-out;
}
.example-gallery-modal-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 0;
  width: min(1360px, 100%);
  height: min(860px, calc(100vh - clamp(24px, 4vw, 48px)));
  margin: auto;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 24px 80px rgba(20, 28, 31, 0.25);
}
.example-gallery-modal-image {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  padding: clamp(12px, 2vw, 22px);
  background: #10181b;
}
.example-gallery-modal-image img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: 6px;
  object-fit: contain;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}
.example-gallery-modal-copy {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;
  min-width: 0;
  min-height: 0;
  padding: clamp(18px, 2.4vw, 28px);
  overflow-y: auto;
  border-left: 1px solid var(--line);
}
.example-gallery-modal-close {
  justify-self: start;
}
.example-gallery-modal-detail {
  min-width: 0;
}
.example-gallery-modal-detail h2 {
  margin-bottom: 10px;
  font-size: clamp(24px, 3vw, 34px);
}
.example-gallery-modal-detail p {
  margin-bottom: 14px;
}
.example-gallery-modal-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.example-gallery-modal-buttons {
  display: flex;
  gap: 8px;
}
.example-gallery-open,
.example-gallery-open body {
  overflow: hidden;
}
.example-noscript-links {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.evals-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}
.evals-page > * {
  min-width: 0;
}
.evals-header {
  max-width: 820px;
}
.evals-summary {
  display: grid;
  grid-template-columns: minmax(260px, 1.1fr) repeat(3, minmax(160px, 0.75fr));
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  overflow: hidden;
}
.evals-summary div {
  min-width: 0;
  padding: 16px;
  border-right: 1px solid var(--line);
}
.evals-summary div:last-child {
  border-right: 0;
}
.evals-summary dt {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}
.evals-summary dd {
  margin: 4px 0 0;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.evals-summary-primary dd {
  font-size: 28px;
  line-height: 1.05;
}
.evals-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.evals-table-shell {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.evals-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}
.evals-table th,
.evals-table td {
  padding: 11px 12px;
  border-top: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.evals-table thead th {
  border-top: 0;
  color: var(--muted);
  font-size: 13px;
  text-transform: uppercase;
}
.evals-table td {
  overflow-wrap: anywhere;
}
@media (max-width: 1120px) and (min-width: 821px) {
  .doc-layout {
    grid-template-columns: minmax(160px, 200px) minmax(0, 1fr);
    gap: 24px;
  }
}
@media (max-width: 820px) {
  .site-header,
  .hero {
    align-items: start;
  }
  .site-header,
  .hero,
  .doc-layout {
    display: block;
  }
  nav,
  .proof-panel,
  .doc-nav {
    margin-top: 18px;
  }
  .doc-nav {
    position: static;
  }
  .route-grid {
    grid-template-columns: 1fr;
  }
  .system-flow,
  .system-flow-detailed {
    grid-template-columns: 1fr;
  }
  .system-node {
    min-height: auto;
  }
  .system-node::after {
    top: auto;
    right: 12px;
    bottom: -9px;
  }
  .system-node:last-child::after {
    bottom: 10px;
  }
  .system-map-canvas {
    aspect-ratio: auto;
    height: clamp(320px, 82vw, 420px);
    min-height: 0;
  }
  .proof-step {
    grid-template-columns: 1fr;
  }
  .example-preview-title-row {
    display: block;
  }
  .example-actions {
    justify-content: flex-start;
  }
  .example-gallery-grid,
  .example-comparison-pair,
  .example-gallery-modal-panel {
    grid-template-columns: 1fr;
  }
  .example-gallery-modal-panel {
    height: calc(100vh - 24px);
  }
  .example-gallery-modal-image {
    min-height: 46vh;
    padding: 10px;
  }
  .example-gallery-modal-copy {
    grid-template-rows: auto auto auto;
    border-top: 1px solid var(--line);
    border-left: 0;
  }
  .example-gallery-meta,
  .example-gallery-modal-meta {
    grid-template-columns: 1fr;
  }
  .evals-summary {
    grid-template-columns: 1fr;
  }
  .evals-summary div {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .evals-summary div:last-child {
    border-bottom: 0;
  }
}
`;

function homepage() {
  return page(
    "JudgmentKit",
    `
    <section class="hero">
      <div>
        <p class="eyebrow">Activity-first judgment for AI agents</p>
        <h1>Judgment before generation.</h1>
        <p class="lede">JudgmentKit stops implementation mechanics from becoming UX. Use it before accepting AI-generated product work, so the next interface starts from the activity, decision, evidence, and handoff instead of from schemas, prompts, or tool traces.</p>
        <div class="hero-actions" aria-label="Primary proof paths">
          <a class="hero-action hero-action-primary" data-hero-action="primary" href="/examples/">Examples</a>
          <a class="hero-action hero-action-secondary" data-hero-action="secondary" href="/evals/">Evals</a>
        </div>
      </div>
      <div class="proof-panel" aria-label="JudgmentKit proof path">
        <div class="proof-step">
          <strong>Raw brief</strong>
          <div class="prompt-evidence-block">
            <code>A <span class="prompt-evidence" title="Participant">support operations manager</span> is <span class="prompt-evidence" title="Objective and activity">reviewing refund escalation cases</span>. The request says to build from the <span class="prompt-evidence prompt-evidence-diagnostic" title="Diagnostic implementation detail">refund_case data model, database fields, JSON schema, prompt template, tool call results, resource id, API endpoint status, and CRUD</span>. The activity is deciding whether an escalation should be <span class="prompt-evidence" title="Decision">approved, sent to policy review, or returned for missing evidence</span>. The outcome is a <span class="prompt-evidence" title="Outcome">clear handoff with the next action and reason</span>.</code>
            <div class="prompt-evidence-key" aria-label="Prompt evidence color key">
              <span class="status prompt-evidence-pill prompt-evidence-pill-activity">activity evidence</span>
              <span class="status prompt-evidence-pill prompt-evidence-pill-diagnostic">implementation detail</span>
            </div>
          </div>
        </div>
        <div class="proof-step">
          <strong>Judgment</strong>
          <p>Identify the support lead, refund review activity, bounded decision, evidence boundary, and diagnostic terms that should stay out of the primary surface.</p>
        </div>
        <div class="proof-step">
          <strong>Handoff</strong>
          <p>Generate a workflow brief for reviewing evidence, choosing an outcome, and leaving a receipt for the next owner.</p>
        </div>
        <div class="proof-step">
          <strong>State</strong>
          <span class="status">ready for generation</span>
        </div>
      </div>
    </section>
    <section class="section">
      <h2>How agents use it</h2>
      <div class="route-grid">
        <article>
          <h3>Review the activity</h3>
          <p>Name the participant, objective, decision, outcome, vocabulary, and disclosure boundary before screen structure.</p>
        </article>
        <article>
          <h3>Check the workflow</h3>
          <p>Review a proposed UI workflow for grounding, action support, completion clarity, and leakage before implementation.</p>
        </article>
        <article>
          <h3>Hand off cleanly</h3>
          <p>Pass only a ready handoff to the next generation step, with diagnostics kept separate from the product surface.</p>
        </article>
      </div>
    </section>
    <section class="section" id="system-map" aria-labelledby="generation-loop-title" data-system-map-flow-section>
      <h2 id="generation-loop-title">System map</h2>
      <p class="lede system-diagram-intro">JudgmentKit sits before generation and stays in the loop across iterations. It is the judgment layer around LLM UI generation, not the final renderer.</p>
      <div class="system-map-toolbar">
        <p class="note">Scroll the page normally. Drag to pan the map; use controls or pinch/ctrl-wheel to zoom.</p>
      </div>
      ${systemMapShell("homepage-system-map-svg-title", "homepage-system-map-svg-desc")}
      <div class="system-map-summary" aria-label="System map text summary">
        <p><strong>MCP boundary:</strong> agents call JudgmentKit tools through MCP; MCP is access and transport, not the LLM.</p>
        <p><strong>JudgmentKit kernel:</strong> deterministic review, candidate review, disclosure rules, targeted questions, and the handoff gate decide whether UI generation is ready.</p>
        <p><strong>LLM / provider seam:</strong> a model may propose activity or workflow candidates, but JudgmentKit reviews those candidates before trusting them.</p>
              <p><strong>Surface type:</strong> <code>recommend_surface_types</code> classifies activity purpose before workflow or frontend implementation guidance.</p>
              <p><strong>UI generation:</strong> the LLM or agent generates the interface outside JudgmentKit from the reviewed handoff.</p>
              <p><strong>Implementation contract:</strong> <code>create_ui_implementation_contract</code> supplies approved primitives, required states, static checks, and browser QA expectations before final handoff. <code>review_ui_implementation_candidate</code> checks generated UI against that contract.</p>
              <p><strong>Frontend adapter:</strong> <code>create_frontend_generation_context</code> combines a ready handoff, selected surface type, project frontend context, and verification expectations. Design-system compliance is not a substitute for activity fit.</p>
        <p><strong>Iteration:</strong> draft review produces updated context that re-enters source/activity review rather than becoming only a longer prompt.</p>
      </div>
      <p class="system-branch"><strong>Blocked path:</strong> if activity, workflow, or handoff is not ready, resolve targeted questions or leakage details before generating UI.</p>
    </section>
    <section class="section">
      <h2>Install for Codex, Claude Code, or Cursor</h2>
      <p class="lede">The installer configures a hosted Streamable HTTP MCP server named <code>judgmentkit</code> and verifies the current tool catalog before finishing.</p>
      <code class="command">curl -fsSL https://judgmentkit.ai/install | bash</code>
      <code class="command">curl -fsSL https://judgmentkit.ai/install | bash -s -- --client claude</code>
      <code class="command">curl -fsSL https://judgmentkit.ai/install | bash -s -- --client cursor</code>
      <p class="note">Codex is the default when no client is provided. Hosted installs do not clone the repo or require npm.</p>
    </section>
  `,
    {
      description:
        "JudgmentKit helps AI agents review activity, workflow, disclosure, and handoff quality before generating product UI.",
      headExtra: systemMapFlowAssets(),
      path: "/",
    },
  );
}

function docsPage() {
  return page(
    "JudgmentKit Docs",
    `
    <section class="section">
      <div class="doc-layout">
        <aside class="doc-nav" aria-label="Docs sections">
          <a href="#quickstart">Quickstart</a>
          <a href="#planning-examples">Planning Examples</a>
          <a href="#mcp">MCP</a>
          <a href="#system-map">System Map</a>
          <a href="#activity-review">Activity Review</a>
          <a href="#workflow-review">Workflow Review</a>
          <a href="#handoff">Handoff</a>
          <a href="#profiles">Profiles</a>
        </aside>
        <div>
          <section class="doc-section" id="quickstart">
            <h1>Docs</h1>
            <h2>Quickstart</h2>
            <p>Install JudgmentKit for your MCP client, then connect to the hosted Streamable HTTP endpoint.</p>
            <pre><code>curl -fsSL https://judgmentkit.ai/install | bash
curl -fsSL https://judgmentkit.ai/install | bash -s -- --client claude
curl -fsSL https://judgmentkit.ai/install | bash -s -- --client cursor</code></pre>
            <p class="note">Codex is the default client. Use <code>--client codex</code>, <code>--client claude</code>, or <code>--client cursor</code> when scripting.</p>
          </section>
          <section class="doc-section" id="planning-examples">
            <h2>Planning Mode Examples</h2>
            <p>Use these examples to review whether an agent is using JudgmentKit well. A good planning response should make the activity, decision, outcome, and disclosure boundary clearer before it proposes UI structure.</p>
            <h3>Ready brief</h3>
            <pre><code>Plan a UI for a support lead reviewing refund requests during daily triage. They decide whether each case is approved, sent to policy review, or returned for missing evidence. The outcome is a clear handoff with the next action and reason.</code></pre>
            <p><strong>Good response:</strong> proceed to concept planning because the activity, participant, decision, and outcome are clear. Keep the plan centered on evidence review, decision options, and handoff.</p>
            <p><strong>Accept:</strong> approval, policy review, return for evidence, and handoff reasons are easy to compare and complete.</p>
            <p><strong>Reject:</strong> charts, widgets, or visual polish appear before the refund review work is named.</p>
            <h3>Vague brief</h3>
            <pre><code>Plan a dashboard for the system.</code></pre>
            <p><strong>Good response:</strong> pause instead of inventing a dashboard. Ask only targeted questions about the activity, primary decision or next action, and outcome.</p>
            <p><strong>Accept:</strong> the agent asks what work the dashboard supports, what decision it should make easier, and what the user should leave knowing or having done.</p>
            <p><strong>Reject:</strong> a full dashboard plan with metrics, cards, charts, and navigation invented from no source context.</p>
            <h3>Implementation-heavy brief</h3>
            <pre><code>Plan an admin UI from our JSON schema, database tables, tool call traces, prompt template, and API endpoints.</code></pre>
            <p><strong>Good response:</strong> treat schemas, tables, traces, prompts, and endpoints as diagnostic details unless the task is explicitly setup, debugging, auditing, or integration work. Translate toward the user's activity before proposing a primary surface.</p>
            <p><strong>Accept:</strong> implementation terms move into diagnostics and the agent asks for the domain activity or decision behind the admin surface.</p>
            <p><strong>Reject:</strong> tables, schemas, prompt templates, tool calls, or API endpoints become the main product UI.</p>
          </section>
          <section class="doc-section" id="mcp">
            <h2>MCP</h2>
            <p>JudgmentKit supports MCP through the hosted Streamable HTTP endpoint at <code>https://judgmentkit.ai/mcp</code>. The installer registers that endpoint as <code>judgmentkit</code> in Codex, Claude Code, or Cursor. A browser GET to <code>/mcp</code> returns endpoint metadata; MCP clients should connect to the same URL with Streamable HTTP.</p>
            <p>MCP tool responses include <code>structuredContent</code> as the stable machine-readable contract and <code>content[0].text</code> as a concise Markdown planning card for Codex-style planning chat. Use the card to explain status, next step, blocking questions, and compact diagnostics; use structured content for implementation decisions and follow-up tool calls.</p>
          </section>
          <section class="doc-section" id="system-map" data-system-map-flow-section>
            <h2>System Map</h2>
            <p>Use JudgmentKit before generation and across iterations. It is the contract and review layer around the LLM or agent, not the final UI renderer.</p>
            <div class="system-map-toolbar">
              <p class="note">Scroll the page normally. Drag to pan the map; use controls or pinch/ctrl-wheel to zoom.</p>
            </div>
            ${systemMapShell("system-map-svg-title", "system-map-svg-desc")}
            <div class="system-map-summary" aria-label="System map text summary">
              <p><strong>MCP boundary:</strong> agents call JudgmentKit tools through MCP; MCP is access and transport, not the LLM.</p>
              <p><strong>JudgmentKit kernel:</strong> deterministic review, candidate review, disclosure rules, targeted questions, and the handoff gate decide whether UI generation is ready.</p>
              <p><strong>LLM / provider seam:</strong> a model may propose activity or workflow candidates, but JudgmentKit reviews those candidates before trusting them.</p>
              <p><strong>Surface type:</strong> <code>recommend_surface_types</code> classifies activity purpose as marketing, workbench, operator review, form flow, dashboard monitor, content/report, setup/debug tool, or conversation before frontend implementation guidance.</p>
              <p><strong>UI generation:</strong> the LLM or agent generates the interface outside JudgmentKit from the reviewed handoff.</p>
              <p><strong>Implementation contract:</strong> <code>create_ui_implementation_contract</code> supplies approved primitives, required states, static checks, and browser QA expectations before final handoff. <code>review_ui_implementation_candidate</code> checks generated UI against that contract.</p>
              <p><strong>Frontend adapter:</strong> <code>create_frontend_generation_context</code> combines a ready handoff, selected surface type, project frontend context, and verification expectations. Design-system compliance is not a substitute for activity fit.</p>
              <p><strong>Iteration:</strong> draft review produces updated context that re-enters source/activity review rather than becoming only a longer prompt.</p>
            </div>
            <p class="system-branch"><strong>Blocked path:</strong> if activity, workflow, or handoff is not ready, resolve targeted questions or leakage details before generating UI.</p>
          </section>
          <section class="doc-section" id="activity-review">
            <h2>Activity Review</h2>
            <p>Call <code>create_activity_model_review</code> before generating UI from a brief. Use the returned candidate only when the activity, participant, decision, outcome, and disclosure boundary are clear enough.</p>
          </section>
          <section class="doc-section" id="workflow-review">
            <h2>Workflow Review</h2>
            <p>Call <code>review_ui_workflow_candidate</code> before accepting an agent-proposed workflow. It checks source grounding, action support, completion or handoff clarity, and leakage containment.</p>
          </section>
          <section class="doc-section" id="surface-type">
            <h2>Surface Type</h2>
            <p>Call <code>recommend_surface_types</code> after activity review and before workflow or frontend implementation guidance. Surface type is activity-purpose guidance, not a visual theme.</p>
          </section>
          <section class="doc-section" id="handoff">
            <h2>Handoff</h2>
            <p>Call <code>create_ui_generation_handoff</code> only on a ready workflow review. If the gate blocks, resolve the targeted questions or leakage details first.</p>
          </section>
          <section class="doc-section" id="implementation-contract">
            <h2>Implementation Contract</h2>
            <p>Call <code>create_ui_implementation_contract</code> before final handoff so generated UI has approved primitives, state coverage, static checks, and browser QA expectations. Call <code>review_ui_implementation_candidate</code> before accepting generated UI code or evidence.</p>
          </section>
          <section class="doc-section" id="frontend-context">
            <h2>Frontend Context</h2>
            <p>Call <code>create_frontend_generation_context</code> after the handoff gate when an agent needs frontend implementation guidance with selected surface type, project context, and verification expectations.</p>
          </section>
          <section class="doc-section" id="profiles">
            <h2>Guidance Profiles</h2>
            <p>Call <code>recommend_ui_workflow_profiles</code> when a brief sounds like specialized review work. Pass <code>profile_id: "operator-review-ui"</code> only when the recommendation evidence supports it.</p>
          </section>
        </div>
      </div>
    </section>
  `,
    {
      description:
        "JudgmentKit docs for CLI, MCP, activity review, workflow review, handoff, and guidance profiles.",
      headExtra: systemMapFlowAssets(),
      path: "/docs/",
    },
  );
}

async function readJsonIfExists(relativePath) {
  try {
    const content = await fs.readFile(path.join(ROOT, relativePath), "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

const MODEL_UI_EXAMPLE = {
  id: "model-ui-system-map",
  title: "Model UI generation matrix",
  description:
    "Four 3x4 comparisons across deterministic, Gemma 4 (local LLM), and GPT-5.5 xhigh paths, separating raw brief, JudgmentKit handoff, Material UI only, and JudgmentKit plus Material UI.",
  actions: [
    {
      label: "Open default matrix",
      href: "/examples/model-ui/refund-system-map/index.html",
    },
    {
      label: "Use-case index",
      href: "/examples/model-ui/index.json",
    },
  ],
};

function modelUiBaseHref(manifest) {
  const indexPath = manifest?.use_case_index_path ?? "examples/model-ui/refund-system-map/index.html";
  return `/${indexPath.replace(/\/index\.html$/, "")}`;
}

function modelUiExampleHref(manifest, relativePath) {
  return `${modelUiBaseHref(manifest)}/${relativePath}`;
}

function galleryProvenanceLabel(artifact) {
  if (artifact.generation_source === "captured_model_output") {
    const cli = artifact.capture_provenance?.cli;
    if (cli === "lms") {
      return "captured transcript from LM Studio lms";
    }
    if (cli === "codex") {
      return "captured transcript from codex exec";
    }
    return "captured model transcript";
  }

  return "deterministic renderer, no provider call";
}

function galleryRenderLabel(artifact) {
  if (artifact.design_system_mode === "material_ui") return "Material UI SSR";
  if (artifact.generation_source === "captured_model_output") return "static HTML/CSS";
  return "deterministic HTML";
}

function buildModelUiGalleryItems(manifest) {
  const useCaseLabel = manifest?.use_case_label ?? "Support refund triage";
  return (manifest?.artifacts ?? []).map((artifact) => ({
    id: artifact.id,
    useCaseId: manifest?.use_case_id ?? "refund-system-map",
    useCaseLabel,
    title: artifact.approach_title ?? artifact.title,
    caption: artifact.approach_caption ?? "",
    modelLabel: artifact.row_label ?? artifact.model_label ?? artifact.title,
    rowLabel: `${useCaseLabel} / ${artifact.row_label ?? artifact.model_label ?? artifact.title}`,
    columnLabel: artifact.column_label ?? "",
    renderLabel: galleryRenderLabel(artifact),
    renderSource: artifact.render_source ?? artifact.visible_render_source ?? "",
    promptContext: artifact.context_summary ?? "",
    provenance: galleryProvenanceLabel(artifact),
    artifactHref: modelUiExampleHref(manifest, artifact.artifact_path),
    imageHref: modelUiExampleHref(manifest, artifact.screenshot_path),
    captureHref: artifact.capture_file ? modelUiExampleHref(manifest, artifact.capture_file) : "",
  }));
}

function buildModelUiComparisonRows(manifest, galleryItems) {
  const itemsById = new Map(galleryItems.map((item) => [item.id, item]));

  return (manifest?.comparison_rows ?? []).map((row) => ({
    id: row.id,
    title: row.label,
    summary: row.summary,
    items: (row.artifact_ids ?? []).map((id) => itemsById.get(id)).filter(Boolean),
  })).filter((row) => row.items.length);
}

function buildModelUiUseCases(modelUiIndex, manifests) {
  const manifestById = new Map(
    manifests.filter(Boolean).map((manifest) => [manifest.use_case_id, manifest]),
  );

  return (modelUiIndex?.use_cases ?? [])
    .map((useCase) => {
      const manifest = manifestById.get(useCase.id);
      if (!manifest) return null;
      const galleryItems = buildModelUiGalleryItems(manifest);
      return {
        ...useCase,
        manifestHref: `/${useCase.manifest_path}`,
        indexHref: `/${useCase.index_path}`,
        activitySummary: manifest.activity_summary ?? useCase.activity_summary,
        galleryItems,
        comparisonRows: buildModelUiComparisonRows(manifest, galleryItems),
      };
    })
    .filter(Boolean);
}

function renderExampleStaticPreview(example) {
  return `
    <article class="example-static-preview">
      <p class="eyebrow">Standalone artifact</p>
      <h3>${escapeHtml(example.previewLabel)}</h3>
      <p>${escapeHtml(example.description)}</p>
      <div class="link-row">${renderExampleActions(example.actions)}</div>
    </article>`;
}

function renderExampleGalleryCard(item, index) {
  return `
    <article class="example-gallery-card">
      <a class="example-gallery-thumb" href="${escapeHtml(item.artifactHref)}" data-gallery-open="${index}" aria-label="Open gallery view for ${escapeHtml(item.title)}">
        <img src="${escapeHtml(item.imageHref)}" alt="${escapeHtml(item.title)} screenshot" loading="${index < 2 ? "eager" : "lazy"}">
      </a>
      <div class="example-gallery-card-copy">
        <p class="eyebrow">${escapeHtml(item.renderLabel)}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="note">${escapeHtml(item.caption)}</p>
        <dl class="example-gallery-meta">
          <div><dt>Context</dt><dd>${escapeHtml(item.columnLabel)}</dd></div>
          <div><dt>Render</dt><dd>${escapeHtml(item.renderLabel)}</dd></div>
        </dl>
        <div class="example-gallery-card-actions">
          <a class="pill-link" href="${escapeHtml(item.artifactHref)}" target="_blank" rel="noreferrer">Open artifact</a>
          <a class="pill-link" href="${escapeHtml(item.imageHref)}" target="_blank" rel="noreferrer">Open image</a>
        </div>
      </div>
    </article>`;
}

function renderExampleMatrixCell(item) {
  return `
        <article class="example-matrix-cell" role="cell">
          <a class="example-matrix-thumb" href="${escapeHtml(item.artifactHref)}" data-gallery-open="${item.index}" aria-label="Open gallery view for ${escapeHtml(item.title)}">
            <img src="${escapeHtml(item.imageHref)}" alt="${escapeHtml(item.title)} screenshot" loading="${item.index < 4 ? "eager" : "lazy"}">
          </a>
          <div class="example-matrix-cell-copy">
            <p class="eyebrow">${escapeHtml(item.renderLabel)}</p>
            <h4>${escapeHtml(item.columnLabel)}</h4>
            <p class="note">${escapeHtml(item.promptContext)}</p>
          </div>
        </article>`;
}

function renderExampleMatrixTable(matrixRows) {
  const columns = matrixRows[0]?.items ?? [];
  const columnHeaders = columns
    .map(
      (item) => `
        <div class="example-matrix-column-header" role="columnheader">
          <strong>${escapeHtml(item.columnLabel)}</strong>
          <span>${escapeHtml(item.renderLabel)}</span>
        </div>`,
    )
    .join("");

  const rows = matrixRows
    .map(
      (row) => `
        <div class="example-matrix-row-heading" role="rowheader">
          <p class="eyebrow">Generation path</p>
          <h3>${escapeHtml(row.title)}</h3>
          <p>${escapeHtml(row.summary)}</p>
        </div>
        ${row.items.map(renderExampleMatrixCell).join("")}`,
    )
    .join("");

  return `
      <div class="example-matrix-scroll">
        <div class="example-matrix-table" role="table" aria-label="Model UI 3 by 4 comparison matrix">
          <div class="example-matrix-axis" role="columnheader">Path</div>
          ${columnHeaders}
          ${rows}
        </div>
      </div>`;
}

function renderExampleComparisonGroup(group) {
  return `
        <article class="example-comparison-row">
          <div class="example-comparison-heading">
            <p class="eyebrow">Before / after pair</p>
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(group.summary)}</p>
          </div>
          <div class="example-comparison-pair">
            ${renderExampleGalleryCard(group.candidate, group.candidate.index)}
            ${renderExampleGalleryCard(group.reviewed, group.reviewed.index)}
          </div>
        </article>`;
}

function renderModelUiGalleryPreview(example) {
  const useCases = example.useCases ?? [];
  const tabs = useCases
    .map(
      (useCase, index) =>
        `<button class="model-ui-use-case-tab" type="button" data-use-case-id="${escapeHtml(useCase.id)}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(useCase.short_label ?? useCase.label)}</button>`,
    )
    .join("");
  const panels = useCases
    .map((useCase, index) => {
      const matrix = renderExampleMatrixTable(useCase.comparisonRows ?? []);
      return `
        <section class="model-ui-use-case-panel" data-use-case-panel="${escapeHtml(useCase.id)}" ${index === 0 ? "" : "hidden"}>
          <div class="example-gallery-intro">
            <p class="eyebrow">Committed screenshots</p>
            <h3>${escapeHtml(useCase.label)} 3x4 matrix</h3>
            <p>${escapeHtml(useCase.activitySummary)} Columns separate Raw brief, JudgmentKit handoff, Material UI only, and JudgmentKit + Material UI.</p>
            <div class="link-row">
              <a class="pill-link" href="${escapeHtml(useCase.indexHref)}" target="_blank" rel="noreferrer">Open matrix</a>
              <a class="pill-link" href="${escapeHtml(useCase.manifestHref)}" target="_blank" rel="noreferrer">Manifest</a>
            </div>
          </div>
          ${matrix}
        </section>`;
    })
    .join("");

  return `
    <section class="example-gallery" aria-label="Model UI screenshot gallery">
      <div class="example-gallery-intro">
        <p class="eyebrow">Committed screenshots</p>
        <h3>3x4 JudgmentKit and Material UI comparison across four use cases</h3>
        <p>Material UI improves visual consistency; JudgmentKit improves activity fit, workflow fit, and disclosure discipline. Use the tabs to switch activities without changing the row or column definitions.</p>
      </div>
      <div class="model-ui-use-case-tabs" role="tablist" aria-label="Model UI use cases">${tabs}</div>
      ${panels}
    </section>`;
}

function renderExamplePreview(example) {
  if (example.previewKind === "gallery") {
    return renderModelUiGalleryPreview(example);
  }

  return renderExampleStaticPreview(example);
}

function buildModelUiExample(modelUiIndex, modelUiManifests) {
  const modelUiUseCases = buildModelUiUseCases(modelUiIndex, modelUiManifests);
  let galleryIndex = 0;
  for (const useCase of modelUiUseCases) {
    useCase.galleryItems = useCase.galleryItems.map((item) => ({
      ...item,
      index: galleryIndex++,
    }));
    useCase.comparisonRows = buildModelUiComparisonRows(
      modelUiManifests.find((manifest) => manifest?.use_case_id === useCase.id),
      useCase.galleryItems,
    );
  }
  const modelUiGalleryItems = modelUiUseCases.flatMap((useCase) => useCase.galleryItems);

  const example = {
    ...MODEL_UI_EXAMPLE,
    previewKind: "gallery",
    galleryItems: modelUiGalleryItems,
    useCases: modelUiUseCases,
  };

  return {
    ...example,
    previewHtml: renderExamplePreview(example),
  };
}

function renderExampleActions(actions) {
  return actions
    .map(
      (action) =>
        `<a class="pill-link" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`,
    )
    .join("");
}

function renderNoScriptModelUiLinks(example) {
  const useCaseLinks = (example.useCases ?? [])
    .map(
      (useCase) =>
        `<a class="pill-link" href="${escapeHtml(useCase.indexHref)}" target="_blank" rel="noreferrer">${escapeHtml(useCase.label)}</a>`,
    )
    .join("");

  return `
    <section>
      <h3>${escapeHtml(example.title)}</h3>
      <div class="link-row">${renderExampleActions(example.actions)}</div>
      ${useCaseLinks ? `<div class="link-row">${useCaseLinks}</div>` : ""}
    </section>`;
}

function modelUiExamplesScript() {
  return `
    <script>
      (() => {
        const dataNode = document.getElementById("model-ui-examples-data");
        const root = document.querySelector("[data-model-ui-examples]");
        if (!dataNode || !root) return;

        const example = JSON.parse(dataNode.textContent);
        const previewNode = root.querySelector("[data-model-ui-preview]");
        const modal = document.querySelector("[data-example-gallery-modal]");
        const modalImage = modal?.querySelector("[data-gallery-modal-image]");
        const modalKicker = modal?.querySelector("[data-gallery-modal-kicker]");
        const modalTitle = modal?.querySelector("[data-gallery-modal-title]");
        const modalCaption = modal?.querySelector("[data-gallery-modal-caption]");
        const modalContext = modal?.querySelector("[data-gallery-modal-context]");
        const modalUseCase = modal?.querySelector("[data-gallery-modal-use-case]");
        const modalRender = modal?.querySelector("[data-gallery-modal-render]");
        const modalPrompt = modal?.querySelector("[data-gallery-modal-prompt]");
        const modalProvenance = modal?.querySelector("[data-gallery-modal-provenance]");
        const modalArtifactLink = modal?.querySelector("[data-gallery-modal-artifact]");
        const modalImageLink = modal?.querySelector("[data-gallery-modal-source]");
        const modalCount = modal?.querySelector("[data-gallery-modal-count]");
        const modalCloseButton = modal?.querySelector("[data-gallery-close]:not(.example-gallery-modal-backdrop)");
        let activeGalleryItems = [];
        let activeGalleryIndex = 0;
        let previousFocus = null;

        function renderGalleryModal(index) {
          if (!modal || activeGalleryItems.length === 0) return;
          activeGalleryIndex = (index + activeGalleryItems.length) % activeGalleryItems.length;
          const item = activeGalleryItems[activeGalleryIndex];
          modalImage.src = item.imageHref;
          modalImage.alt = item.title + " screenshot";
          modalKicker.textContent = item.rowLabel;
          modalTitle.textContent = item.title;
          modalCaption.textContent = item.caption;
          modalUseCase.textContent = item.useCaseLabel || "";
          modalContext.textContent = item.columnLabel;
          modalRender.textContent = item.renderSource;
          modalPrompt.textContent = item.promptContext;
          modalProvenance.textContent = item.provenance;
          modalArtifactLink.href = item.artifactHref;
          modalImageLink.href = item.imageHref;
          modalCount.textContent = String(activeGalleryIndex + 1) + " of " + String(activeGalleryItems.length);
        }

        function openGallery(items, index) {
          if (!modal || !items?.length) return;
          activeGalleryItems = items;
          previousFocus = document.activeElement;
          renderGalleryModal(index);
          modal.hidden = false;
          modal.setAttribute("aria-hidden", "false");
          document.documentElement.classList.add("example-gallery-open");
          modalCloseButton?.focus();
        }

        function closeGallery() {
          if (!modal || modal.hidden) return;
          modal.hidden = true;
          modal.setAttribute("aria-hidden", "true");
          document.documentElement.classList.remove("example-gallery-open");
          previousFocus?.focus?.();
        }

        function bindGalleryLinks(example) {
          if (!root) return;
          const galleryItems = example.galleryItems ?? [];
          root.querySelectorAll("[data-gallery-open]").forEach((link) => {
            link.addEventListener("click", (event) => {
              if (!galleryItems.length) return;
              event.preventDefault();
              openGallery(galleryItems, Number(link.getAttribute("data-gallery-open") || "0"));
            });
          });
        }

        function selectUseCase(example, useCaseId, options = {}) {
          const useCases = example.useCases ?? [];
          if (!useCases.length) return;
          const activeUseCase = useCases.find((useCase) => useCase.id === useCaseId) ?? useCases[0];
          previewNode.querySelectorAll("[data-use-case-panel]").forEach((panel) => {
            panel.hidden = panel.getAttribute("data-use-case-panel") !== activeUseCase.id;
          });
          previewNode.querySelectorAll("[data-use-case-id]").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.getAttribute("data-use-case-id") === activeUseCase.id));
          });
          if (options.updateHash !== false) {
            history.replaceState(
              null,
              "",
              "#" + [example.id, activeUseCase.id].map(encodeURIComponent).join("/"),
            );
          }
        }

        function bindUseCaseTabs(example, useCaseId, options = {}) {
          if (!previewNode) return;
          previewNode.querySelectorAll("[data-use-case-id]").forEach((button) => {
            button.addEventListener("click", () => {
              selectUseCase(example, button.getAttribute("data-use-case-id"));
            });
          });
          selectUseCase(example, useCaseId, options);
        }

        function parseUseCaseHash() {
          const raw = window.location.hash.slice(1);
          if (!raw) return "";
          const [exampleId = "", useCaseId = ""] = raw.split("/").map(decodeURIComponent);
          if (exampleId !== example.id) return "";
          return useCaseId;
        }

        if (modal) {
          modal.querySelectorAll("[data-gallery-close]").forEach((button) => {
            button.addEventListener("click", closeGallery);
          });
          modal.querySelector("[data-gallery-prev]")?.addEventListener("click", () => renderGalleryModal(activeGalleryIndex - 1));
          modal.querySelector("[data-gallery-next]")?.addEventListener("click", () => renderGalleryModal(activeGalleryIndex + 1));
          document.addEventListener("keydown", (event) => {
            if (modal.hidden) return;
            if (event.key === "Escape") {
              closeGallery();
            } else if (event.key === "ArrowLeft") {
              renderGalleryModal(activeGalleryIndex - 1);
            } else if (event.key === "ArrowRight") {
              renderGalleryModal(activeGalleryIndex + 1);
            }
          });
        }

        bindGalleryLinks(example);
        bindUseCaseTabs(example, parseUseCaseHash(), { updateHash: false });

        window.addEventListener("hashchange", () => {
          selectUseCase(example, parseUseCaseHash(), {
            updateHash: false,
          });
        });
      })();
    </script>`;
}

function renderExampleGalleryModal() {
  return `
    <section class="example-gallery-modal" data-example-gallery-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="example-gallery-modal-title">
      <button class="example-gallery-modal-backdrop" type="button" data-gallery-close aria-label="Close gallery"></button>
      <div class="example-gallery-modal-panel">
        <div class="example-gallery-modal-image">
          <img data-gallery-modal-image src="" alt="">
        </div>
        <aside class="example-gallery-modal-copy">
          <button class="pill-link example-gallery-modal-close" type="button" data-gallery-close>Close</button>
          <div class="example-gallery-modal-detail">
            <p class="eyebrow" data-gallery-modal-kicker></p>
            <h2 id="example-gallery-modal-title" data-gallery-modal-title></h2>
            <p data-gallery-modal-caption></p>
            <dl class="example-gallery-modal-meta">
              <div><dt>Use case</dt><dd data-gallery-modal-use-case></dd></div>
              <div><dt>Context</dt><dd data-gallery-modal-context></dd></div>
              <div><dt>Render</dt><dd data-gallery-modal-render></dd></div>
              <div><dt>Prompt</dt><dd data-gallery-modal-prompt></dd></div>
              <div><dt>Provenance</dt><dd data-gallery-modal-provenance></dd></div>
            </dl>
            <div class="example-gallery-modal-actions">
              <a class="pill-link" data-gallery-modal-artifact href="" target="_blank" rel="noreferrer">Open artifact</a>
              <a class="pill-link" data-gallery-modal-source href="" target="_blank" rel="noreferrer">Open image</a>
            </div>
          </div>
          <div class="example-gallery-modal-footer">
            <span class="note" data-gallery-modal-count></span>
            <div class="example-gallery-modal-buttons">
              <button class="pill-link" type="button" data-gallery-prev>Previous</button>
              <button class="pill-link" type="button" data-gallery-next>Next</button>
            </div>
          </div>
        </aside>
      </div>
    </section>`;
}

async function examplesPage() {
  const modelUiIndex =
    (await readJsonIfExists("examples/model-ui/index.json")) ?? {
      use_cases: [
        {
          id: "refund-system-map",
          label: "Support refund triage",
          short_label: "Refund triage",
          activity_summary:
            "A support operations manager reviews refund escalation cases and decides approve, policy review, or missing evidence.",
          index_path: "examples/model-ui/refund-system-map/index.html",
          manifest_path: "examples/model-ui/refund-system-map/manifest.json",
        },
      ],
    };
  const modelUiManifests = await Promise.all(
    (modelUiIndex.use_cases ?? []).map((useCase) => readJsonIfExists(useCase.manifest_path)),
  );
  const modelUiExample = buildModelUiExample(modelUiIndex, modelUiManifests);

  return page(
    "JudgmentKit Examples",
    `
    <section class="section examples-page" data-model-ui-examples>
      <section id="model-ui-system-map" class="example-preview example-preview-focus" aria-label="Model UI generation matrix">
        <div class="example-preview-header">
          <div class="example-preview-title-row">
            <div>
              <h1>${escapeHtml(modelUiExample.title)}</h1>
              <p class="lede">${escapeHtml(modelUiExample.description)}</p>
            </div>
            <div class="example-actions">
              ${renderExampleActions(modelUiExample.actions)}
            </div>
          </div>
        </div>
        <div class="example-preview-body" data-model-ui-preview>
          ${modelUiExample.previewHtml}
        </div>
      </section>
      <noscript>
        <div class="example-noscript-links">
          <p class="note">JavaScript is disabled. Direct model matrix links remain available here.</p>
          ${renderNoScriptModelUiLinks(modelUiExample)}
        </div>
      </noscript>
      ${renderExampleGalleryModal()}
      <script type="application/json" id="model-ui-examples-data">${serializeJsonForHtml(modelUiExample)}</script>
      ${modelUiExamplesScript()}
    </section>
  `,
    {
      description:
        "JudgmentKit examples comparing raw brief outputs with activity-first handoff outputs.",
      path: "/examples/",
    },
  );
}

function evalRunTitle(run) {
  return `${run.date} / ${run.mcp_release_segment} / ${run.run_id}`;
}

function evalReportPath(reportPath) {
  return `/evals/${reportPath}`;
}

function renderEvalRunRows(runs) {
  return runs
    .map(
      (run) => `
      <tr>
        <td>${escapeHtml(run.date)}</td>
        <td>${escapeHtml(run.mcp_release)}</td>
        <td>${escapeHtml(run.run_id)}</td>
        <td>${escapeHtml(run.claim_level)}</td>
        <td>${escapeHtml(run.summary.passed)}/${escapeHtml(run.summary.cases)} passed</td>
        <td><a href="${escapeHtml(evalReportPath(run.html_report))}">HTML</a> · <a href="${escapeHtml(evalReportPath(run.json_report))}">JSON</a></td>
      </tr>`,
    )
    .join("");
}

async function evalsPage() {
  const catalog = await readJsonIfExists("evals/reports/index.json");
  const latestReport = catalog?.latest
    ? await readJsonIfExists(path.join("evals/reports", catalog.latest.json_report))
    : null;

  if (!catalog?.latest) {
    return page(
      "JudgmentKit Evals",
      `
      <section class="section evals-page">
        <div class="evals-header">
          <h1>Evals</h1>
          <p class="lede">No eval report catalog has been generated yet.</p>
        </div>
      </section>
    `,
      {
        description: "JudgmentKit eval reports and evidence artifacts.",
        path: "/evals/",
      },
    );
  }

  const latest = catalog.latest;
  const benchmarkPolicy =
    latestReport?.benchmark_policy ??
    "Qualitative paired-artifact evidence only; not a statistically powered benchmark.";

  return page(
    "JudgmentKit Evals",
    `
    <section class="section evals-page">
      <div class="evals-header">
        <p class="eyebrow">Evaluation evidence</p>
        <h1>Evals</h1>
        <p class="lede">Immutable UI generation eval runs compare raw generated interfaces with JudgmentKit-guided handoff outputs. Use these reports as evidence, not as broad benchmark claims.</p>
      </div>
      <dl class="evals-summary" aria-label="Latest eval run summary">
        <div class="evals-summary-primary"><dt>Latest run</dt><dd>${escapeHtml(evalRunTitle(latest))}</dd></div>
        <div><dt>Claim level</dt><dd>${escapeHtml(latest.claim_level)}</dd></div>
        <div><dt>Result</dt><dd>${escapeHtml(latest.summary.passed)}/${escapeHtml(latest.summary.cases)} passed</dd></div>
        <div><dt>Guided wins</dt><dd>${escapeHtml(latest.summary.guided_wins)}</dd></div>
      </dl>
      <p class="note">${escapeHtml(benchmarkPolicy)}</p>
      <div class="evals-actions" aria-label="Eval report links">
        <a class="pill-link" href="${escapeHtml(evalReportPath(latest.html_report))}">Latest HTML report</a>
        <a class="pill-link" href="${escapeHtml(evalReportPath(latest.json_report))}">Latest JSON report</a>
        <a class="pill-link" href="/evals/index.json">Catalog JSON</a>
      </div>
      <section>
        <h2>All runs</h2>
        <div class="evals-table-shell">
          <table class="evals-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">MCP release</th>
                <th scope="col">Run</th>
                <th scope="col">Claim level</th>
                <th scope="col">Result</th>
                <th scope="col">Reports</th>
              </tr>
            </thead>
            <tbody>${renderEvalRunRows(catalog.runs)}</tbody>
          </table>
        </div>
      </section>
    </section>
  `,
    {
      description:
        "JudgmentKit eval reports for reviewing UI generation evidence and claim levels.",
      path: "/evals/",
    },
  );
}

async function bootstrapScript() {
  const installerSource = await fs.readFile(path.join(ROOT, "scripts", "install-mcp.mjs"), "utf8");

  if (installerSource.includes("JUDGMENTKIT_INSTALLER_JS")) {
    throw new Error("Installer source cannot contain the bootstrap heredoc delimiter.");
  }

  return `#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd node

exec node --input-type=module - "$@" <<'JUDGMENTKIT_INSTALLER_JS'
${installerSource}

try {
  await runInstallCli(process.argv.slice(2));
} catch (error) {
  if (error?.name === "InstallError") {
    process.stderr.write(\`JudgmentKit installer failed during \${error.phase}: \${error.message}\\n\`);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(\`JudgmentKit installer failed: \${message}\\n\`);
  }
  process.exitCode = 1;
}
JUDGMENTKIT_INSTALLER_JS
`;
}

async function copyIfExists(fromRelative, toPath) {
  const from = path.join(ROOT, fromRelative);

  try {
    await fs.mkdir(path.dirname(toPath), { recursive: true });

    if (from.endsWith(".html")) {
      const html = await fs.readFile(from, "utf8");
      await fs.writeFile(toPath, addAnalyticsToHtml(html));
      return;
    }

    await fs.copyFile(from, toPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function copyDirectoryIfExists(fromRelative, toPath) {
  const from = path.join(ROOT, fromRelative);

  let entries;
  try {
    entries = await fs.readdir(from, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  await fs.mkdir(toPath, { recursive: true });

  for (const entry of entries) {
    const childFromRelative = path.join(fromRelative, entry.name);
    const childToPath = path.join(toPath, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryIfExists(childFromRelative, childToPath);
      continue;
    }

    await copyIfExists(childFromRelative, childToPath);
  }
}

async function buildSystemMapFlowAssets(outDir) {
  await buildWithEsbuild({
    entryPoints: [path.join(__dirname, "system-map-flow.jsx")],
    outfile: path.join(outDir, "assets", "system-map-flow.js"),
    bundle: true,
    format: "esm",
    target: "es2020",
    minify: true,
    logLevel: "silent",
  });
}

export async function buildSite(outDir = DEFAULT_OUT_DIR) {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(outDir, "docs"), { recursive: true });
  await fs.mkdir(path.join(outDir, "evals"), { recursive: true });
  await fs.mkdir(path.join(outDir, "examples"), { recursive: true });

  await fs.writeFile(path.join(outDir, "assets", "site.css"), stylesheet.trimStart());
  await buildSystemMapFlowAssets(outDir);
  await fs.writeFile(
    path.join(outDir, "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#133f4e"/><path d="M18 34.5 28 44l19-24" fill="none" stroke="#f8f7f2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`,
  );
  await fs.writeFile(path.join(outDir, "index.html"), homepage());
  await fs.writeFile(path.join(outDir, "docs", "index.html"), docsPage());
  await fs.writeFile(path.join(outDir, "examples", "index.html"), await examplesPage());
  await fs.writeFile(path.join(outDir, "install"), await bootstrapScript(), { mode: 0o755 });
  await fs.writeFile(
    path.join(outDir, "llms.txt"),
    [
      "# JudgmentKit",
      "",
      "JudgmentKit is an activity-first judgment layer for AI-generated product work.",
      "",
      "- /docs/",
      "- /examples/",
      "- /evals/",
      "- /install",
      "- /mcp",
      "",
      `MCP tools: ${JUDGMENTKIT_MCP_TOOL_NAMES.join(", ")}`,
    ].join("\n"),
  );

  await copyIfExists("examples/demo/one-shot-demo.html", path.join(outDir, "examples", "one-shot-demo.html"));
  await copyIfExists("examples/comparison/version-a.html", path.join(outDir, "examples", "comparison", "refund", "version-a.html"));
  await copyIfExists("examples/comparison/version-b.html", path.join(outDir, "examples", "comparison", "refund", "version-b.html"));
  await copyIfExists("examples/comparison/music/version-a.html", path.join(outDir, "examples", "comparison", "music", "version-a.html"));
  await copyIfExists("examples/comparison/music/version-b.html", path.join(outDir, "examples", "comparison", "music", "version-b.html"));
  await copyIfExists("examples/comparison/music/facilitator-scorecard.md", path.join(outDir, "examples", "comparison", "music", "facilitator-scorecard.md"));
  await copyDirectoryIfExists("evals/reports", path.join(outDir, "evals"));
  await copyDirectoryIfExists("evals/reports", path.join(outDir, "examples", "evals"));
  await fs.writeFile(path.join(outDir, "evals", "index.html"), await evalsPage());
  await copyDirectoryIfExists("examples/model-ui", path.join(outDir, "examples", "model-ui"));

  return {
    out_dir: outDir,
    routes: ["/", "/docs/", "/examples/", "/evals/", "/install", "/mcp"],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { outDir } = parseArgs(process.argv.slice(2));
  const result = await buildSite(outDir);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
