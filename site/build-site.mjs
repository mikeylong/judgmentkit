#!/usr/bin/env node
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  JUDGMENTKIT_MCP_TOOL_NAMES,
} from "../scripts/install-mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT_DIR = path.join(__dirname, "dist");
const require = createRequire(import.meta.url);
const ANALYTICS_SDK_VERSION = require("@vercel/analytics/package.json").version;

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

  return {
    scriptSrc: analyticsConfig.scriptSrc ?? "/_vercel/insights/script.js",
    eventEndpoint: analyticsConfig.eventEndpoint,
    viewEndpoint: analyticsConfig.viewEndpoint,
    sessionEndpoint: analyticsConfig.sessionEndpoint,
    endpoint: analyticsConfig.endpoint,
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
${analyticsBootstrap()}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">JudgmentKit</a>
      <nav aria-label="Primary">
        <a href="/docs/">Docs</a>
        <a href="/examples/">Examples</a>
        <a href="/mcp">MCP</a>
      </nav>
    </header>
    <main>${body}</main>
  </body>
</html>`;
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
  text-decoration: none;
  font-weight: 700;
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
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin: 18px 0 10px;
}
.system-map-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.system-map-controls button {
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--accent-strong);
  background: var(--panel);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.system-map-canvas {
  aspect-ratio: 1760 / 1040;
  min-height: 420px;
  max-height: 760px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
}
.system-map-canvas.is-dragging {
  cursor: grabbing;
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
  grid-template-columns: minmax(180px, 240px) minmax(0, 820px);
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
.examples-intro {
  margin-bottom: 28px;
}
.examples-browser {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: clamp(22px, 4vw, 42px);
  align-items: start;
}
.examples-rail {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 10px;
  padding-right: 18px;
  border-right: 1px solid var(--line);
}
.examples-rail-title {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}
.example-list {
  display: grid;
  gap: 8px;
}
.example-select {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.example-select:hover,
.example-select:focus-visible {
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.7);
  outline: none;
}
.example-select[aria-current="true"] {
  border-color: var(--accent);
  background: #ecf4f6;
}
.example-select strong {
  display: block;
  margin-bottom: 2px;
}
.example-select span {
  display: block;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
}
.examples-main {
  min-width: 0;
}
.example-menu {
  display: none;
  margin-bottom: 18px;
}
.example-menu summary {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  font-weight: 700;
}
.example-menu summary::-webkit-details-marker {
  display: none;
}
.example-menu[open] .example-list {
  margin-top: 10px;
}
.example-preview-header {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}
.example-preview-title-row {
  display: flex;
  gap: 18px;
  align-items: start;
  justify-content: space-between;
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
.example-frame-shell {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.example-frame-toolbar {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  background: #f2f1eb;
  color: var(--muted);
  font-size: 13px;
}
.example-frame-title {
  overflow: hidden;
  color: var(--ink);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.example-frame {
  display: block;
  width: 100%;
  height: min(76vh, 760px);
  min-height: 520px;
  border: 0;
  background: #ffffff;
}
.example-noscript-links {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
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
  .examples-browser {
    display: block;
  }
  .examples-rail {
    display: none;
  }
  .example-menu {
    display: block;
  }
  .example-preview-title-row {
    display: block;
  }
  .example-actions {
    justify-content: flex-start;
  }
  .example-frame-toolbar {
    display: block;
  }
  .example-frame {
    height: 68vh;
    min-height: 430px;
  }
}
`;

function systemMapViewerScript() {
  return `
    <script>
      (() => {
        const viewers = document.querySelectorAll("[data-system-map-viewer]");
        if (!viewers.length) return;

        viewers.forEach((viewer) => {
          const svg = viewer.querySelector("[data-system-map-svg]");
          const canvas = viewer.matches("[data-system-map-canvas]")
            ? viewer
            : viewer.querySelector("[data-system-map-canvas]");
          const zoomIn = viewer.querySelector("[data-system-map-zoom-in]");
          const zoomOut = viewer.querySelector("[data-system-map-zoom-out]");
          const reset = viewer.querySelector("[data-system-map-reset]");
          if (!svg || !canvas || !zoomIn || !zoomOut || !reset) return;

          const base = { x: 0, y: 0, width: 1760, height: 1040 };
          const minWidth = 620;
          const maxWidth = 2200;
          const ratio = base.height / base.width;
          let view = { ...base };
          let drag = null;

          function clampView() {
            view.width = Math.min(maxWidth, Math.max(minWidth, view.width));
            view.height = view.width * ratio;
            const margin = 140;
            const minX = base.x - margin;
            const maxX = base.x + base.width - view.width + margin;
            const minY = base.y - margin;
            const maxY = base.y + base.height - view.height + margin;
            view.x = Math.min(maxX, Math.max(minX, view.x));
            view.y = Math.min(maxY, Math.max(minY, view.y));
          }

          function applyView() {
            clampView();
            svg.setAttribute(
              "viewBox",
              [view.x, view.y, view.width, view.height].map((value) => value.toFixed(2)).join(" "),
            );
          }

          function pointFromEvent(event) {
            const rect = svg.getBoundingClientRect();
            return {
              x: view.x + ((event.clientX - rect.left) / rect.width) * view.width,
              y: view.y + ((event.clientY - rect.top) / rect.height) * view.height,
            };
          }

          function zoom(factor, center) {
            const target = center ?? {
              x: view.x + view.width / 2,
              y: view.y + view.height / 2,
            };
            const nextWidth = view.width * factor;
            const nextHeight = nextWidth * ratio;
            const xRatio = (target.x - view.x) / view.width;
            const yRatio = (target.y - view.y) / view.height;
            view = {
              x: target.x - nextWidth * xRatio,
              y: target.y - nextHeight * yRatio,
              width: nextWidth,
              height: nextHeight,
            };
            applyView();
          }

          zoomIn.addEventListener("click", () => zoom(0.82));
          zoomOut.addEventListener("click", () => zoom(1.22));
          reset.addEventListener("click", () => {
            view = { ...base };
            applyView();
          });

          canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            zoom(event.deltaY < 0 ? 0.88 : 1.14, pointFromEvent(event));
          }, { passive: false });

          canvas.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) return;
            drag = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            canvas.classList.add("is-dragging");
            canvas.setPointerCapture(event.pointerId);
          });

          canvas.addEventListener("pointermove", (event) => {
            if (!drag || drag.id !== event.pointerId) return;
            const rect = svg.getBoundingClientRect();
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            drag.x = event.clientX;
            drag.y = event.clientY;
            view.x -= (dx / rect.width) * view.width;
            view.y -= (dy / rect.height) * view.height;
            applyView();
          });

          function endDrag(event) {
            if (!drag || drag.id !== event.pointerId) return;
            canvas.classList.remove("is-dragging");
            drag = null;
          }

          canvas.addEventListener("pointerup", endDrag);
          canvas.addEventListener("pointercancel", endDrag);
          applyView();
        });
      })();
    </script>`;
}

function homepage() {
  return page(
    "JudgmentKit",
    `
    <section class="hero">
      <div>
        <p class="eyebrow">Activity-first judgment for AI agents</p>
        <h1>Judgment before generation.</h1>
        <p class="lede">JudgmentKit stops implementation mechanics from becoming UX. Use it before accepting AI-generated product work, so the next interface starts from the activity, decision, evidence, and handoff instead of from schemas, prompts, or tool traces.</p>
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
    <section class="section" id="system-map" aria-labelledby="generation-loop-title" data-system-map-viewer>
      <h2 id="generation-loop-title">System map</h2>
      <p class="lede system-diagram-intro">JudgmentKit sits before generation and stays in the loop across iterations. It is the judgment layer around LLM UI generation, not the final renderer.</p>
      <div class="system-map-toolbar">
        <p class="note">Drag to pan. Use the controls or trackpad wheel to zoom the SVG canvas.</p>
        <div class="system-map-controls" aria-label="System map controls">
          <button type="button" data-system-map-zoom-in>Zoom in</button>
          <button type="button" data-system-map-zoom-out>Zoom out</button>
          <button type="button" data-system-map-reset>Reset / fit</button>
        </div>
      </div>
      <div class="system-map-canvas" data-system-map-canvas>
        <svg class="system-map-svg" data-system-map-svg viewBox="0 0 1760 1040" preserveAspectRatio="xMidYMin meet" role="img" aria-labelledby="homepage-system-map-svg-title homepage-system-map-svg-desc">
          <title id="homepage-system-map-svg-title">JudgmentKit system design map</title>
          <desc id="homepage-system-map-svg-desc">A node and edge diagram showing the MCP boundary, JudgmentKit kernel, optional LLM provider seam, UI generation outside JudgmentKit, design-system adapter, blocked path, and iteration with updated context.</desc>
          <defs>
            <marker id="system-map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#245f73"></path>
            </marker>
          </defs>

          <rect class="map-zone" x="36" y="64" width="310" height="360" rx="18"></rect>
          <text class="map-boundary" x="60" y="104">MCP boundary</text>
          <text class="map-zone-title" x="60" y="138">Agent / Client / MCP</text>
          <rect class="map-node" x="60" y="170" width="262" height="82" rx="12"></rect>
          <text class="map-node-title" x="78" y="202">Codex or agent client</text>
          <text class="map-node-text" x="78" y="226">Calls tools; owns the turn.</text>
          <rect class="map-node" x="60" y="274" width="262" height="116" rx="12"></rect>
          <text class="map-node-title" x="78" y="306">MCP server</text>
          <text class="map-node-text" x="78" y="330">Access and transport only.</text>
          <text class="map-node-text" x="78" y="354">MCP is not the LLM.</text>
          <text class="map-node-code" x="78" y="378">tools/list + tools/call</text>

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
          <rect class="map-node map-node-blocked" x="594" y="606" width="370" height="82" rx="12"></rect>
          <text class="map-node-title" x="616" y="638">Blocked path</text>
          <text class="map-node-text" x="616" y="662">Resolve targeted questions or leakage before UI generation.</text>

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

          <rect class="map-zone map-zone-output" x="1212" y="412" width="500" height="260" rx="18"></rect>
          <text class="map-boundary" x="1240" y="452">Outside JudgmentKit</text>
          <text class="map-zone-title" x="1240" y="486">UI generation</text>
          <rect class="map-node map-node-output" x="1240" y="518" width="204" height="94" rx="12"></rect>
          <text class="map-node-title" x="1258" y="550">LLM / agent UI pass</text>
          <text class="map-node-text" x="1258" y="574">Generate from reviewed</text>
          <text class="map-node-text" x="1258" y="596">handoff, not raw brief.</text>
          <rect class="map-node map-node-output" x="1470" y="518" width="204" height="94" rx="12"></rect>
          <text class="map-node-title" x="1488" y="550">UI draft</text>
          <text class="map-node-text" x="1488" y="574">Reviewed by human or</text>
          <text class="map-node-text" x="1488" y="596">agent for next iteration.</text>

          <rect class="map-zone" x="1212" y="734" width="500" height="236" rx="18"></rect>
          <text class="map-boundary" x="1240" y="774">Design-system adapter</text>
          <text class="map-zone-title" x="1240" y="808">Optional visual layer after judgment</text>
          <rect class="map-node" x="1240" y="838" width="204" height="88" rx="12"></rect>
          <text class="map-node-title" x="1258" y="870">with design system</text>
          <text class="map-node-text" x="1258" y="894">Tokens, components,</text>
          <text class="map-node-text" x="1258" y="916">layout rules applied later.</text>
          <rect class="map-node" x="1470" y="838" width="204" height="88" rx="12"></rect>
          <text class="map-node-title" x="1488" y="870">without design system</text>
          <text class="map-node-text" x="1488" y="894">Still use the handoff;</text>
          <text class="map-node-text" x="1488" y="916">choose simple UI primitives.</text>

          <rect class="map-zone" x="430" y="780" width="700" height="190" rx="18"></rect>
          <text class="map-boundary" x="458" y="820">Iteration loop</text>
          <text class="map-zone-title" x="458" y="854">Draft findings become updated context</text>
          <rect class="map-node" x="462" y="884" width="292" height="60" rx="12"></rect>
          <text class="map-node-title" x="482" y="920">Review findings</text>
          <rect class="map-node map-node-kernel" x="804" y="884" width="292" height="60" rx="12"></rect>
          <text class="map-node-title" x="824" y="920">updated context</text>

          <path class="map-edge" d="M 322 330 C 374 330 374 220 462 220"></path>
          <text class="map-edge-label" x="352" y="292">MCP tool call</text>
          <path class="map-edge map-edge-muted" d="M 754 220 L 804 220"></path>
          <path class="map-edge map-edge-muted" d="M 950 270 L 950 318"></path>
          <path class="map-edge map-edge-muted" d="M 754 368 L 804 368"></path>
          <path class="map-edge map-edge-muted" d="M 950 418 L 950 466"></path>
          <path class="map-edge map-edge-blocked" d="M 804 544 C 744 580 704 590 672 606"></path>
          <path class="map-edge map-edge-blocked" d="M 594 650 C 372 650 342 452 292 390"></path>
          <text class="map-edge-label" x="348" y="620">needs source context</text>
          <path class="map-edge map-edge-llm" d="M 1096 368 C 1166 338 1192 238 1240 226"></path>
          <text class="map-edge-label" x="1130" y="302">request candidate</text>
          <path class="map-edge map-edge-llm" d="M 1470 226 C 1340 300 1220 362 1096 368"></path>
          <text class="map-edge-label" x="1302" y="338">proposed JSON returns for review</text>
          <path class="map-edge map-edge-output" d="M 1096 516 C 1158 516 1178 564 1240 564"></path>
          <text class="map-edge-label" x="1124" y="546">reviewed handoff</text>
          <path class="map-edge map-edge-output" d="M 1444 564 L 1470 564"></path>
          <path class="map-edge map-edge-muted" d="M 1572 612 L 1572 838"></path>
          <text class="map-edge-label" x="1586" y="720">optional styling path</text>
          <path class="map-edge map-edge-muted" d="M 1444 882 L 1470 882"></path>
          <path class="map-edge" d="M 1470 596 C 1290 754 1040 846 754 914"></path>
          <text class="map-edge-label" x="1090" y="812">review draft</text>
          <path class="map-edge" d="M 804 914 C 648 820 582 736 608 566"></path>
          <text class="map-edge-label" x="650" y="790">next turn</text>
        </svg>
      </div>
      <div class="system-map-summary" aria-label="System map text summary">
        <p><strong>MCP boundary:</strong> agents call JudgmentKit tools through MCP; MCP is access and transport, not the LLM.</p>
        <p><strong>JudgmentKit kernel:</strong> deterministic review, candidate review, disclosure rules, targeted questions, and the handoff gate decide whether UI generation is ready.</p>
        <p><strong>LLM / provider seam:</strong> a model may propose activity or workflow candidates, but JudgmentKit reviews those candidates before trusting them.</p>
        <p><strong>UI generation:</strong> the LLM or agent generates the interface outside JudgmentKit from the reviewed handoff.</p>
        <p><strong>Design-system adapter:</strong> teams can generate with design-system tokens/components or without design system support; in both cases, styling comes after activity/workflow judgment.</p>
        <p><strong>Iteration:</strong> draft review produces updated context that re-enters JudgmentKit rather than becoming only a longer prompt.</p>
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
    ${systemMapViewerScript()}
  `,
    {
      description:
        "JudgmentKit helps AI agents review activity, workflow, disclosure, and handoff quality before generating product UI.",
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
          <section class="doc-section" id="system-map" data-system-map-viewer>
            <h2>System Map</h2>
            <p>Use JudgmentKit before generation and across iterations. It is the contract and review layer around the LLM or agent, not the final UI renderer.</p>
            <div class="system-map-toolbar">
              <p class="note">Drag to pan. Use the controls or trackpad wheel to zoom the SVG canvas.</p>
              <div class="system-map-controls" aria-label="System map controls">
                <button type="button" data-system-map-zoom-in>Zoom in</button>
                <button type="button" data-system-map-zoom-out>Zoom out</button>
                <button type="button" data-system-map-reset>Reset / fit</button>
              </div>
            </div>
            <div class="system-map-canvas" data-system-map-canvas>
              <svg class="system-map-svg" data-system-map-svg viewBox="0 0 1760 1040" preserveAspectRatio="xMidYMin meet" role="img" aria-labelledby="system-map-svg-title system-map-svg-desc">
                <title id="system-map-svg-title">JudgmentKit system design map</title>
                <desc id="system-map-svg-desc">A node and edge diagram showing the MCP boundary, JudgmentKit kernel, optional LLM provider seam, UI generation outside JudgmentKit, design-system adapter, blocked path, and iteration with updated context.</desc>
                <defs>
                  <marker id="system-map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#245f73"></path>
                  </marker>
                </defs>

                <rect class="map-zone" x="36" y="64" width="310" height="360" rx="18"></rect>
                <text class="map-boundary" x="60" y="104">MCP boundary</text>
                <text class="map-zone-title" x="60" y="138">Agent / Client / MCP</text>
                <rect class="map-node" x="60" y="170" width="262" height="82" rx="12"></rect>
                <text class="map-node-title" x="78" y="202">Codex or agent client</text>
                <text class="map-node-text" x="78" y="226">Calls tools; owns the turn.</text>
                <rect class="map-node" x="60" y="274" width="262" height="116" rx="12"></rect>
                <text class="map-node-title" x="78" y="306">MCP server</text>
                <text class="map-node-text" x="78" y="330">Access and transport only.</text>
                <text class="map-node-text" x="78" y="354">MCP is not the LLM.</text>
                <text class="map-node-code" x="78" y="378">tools/list + tools/call</text>

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
                <rect class="map-node map-node-blocked" x="594" y="606" width="370" height="82" rx="12"></rect>
                <text class="map-node-title" x="616" y="638">Blocked path</text>
                <text class="map-node-text" x="616" y="662">Resolve targeted questions or leakage before UI generation.</text>

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

                <rect class="map-zone map-zone-output" x="1212" y="412" width="500" height="260" rx="18"></rect>
                <text class="map-boundary" x="1240" y="452">Outside JudgmentKit</text>
                <text class="map-zone-title" x="1240" y="486">UI generation</text>
                <rect class="map-node map-node-output" x="1240" y="518" width="204" height="94" rx="12"></rect>
                <text class="map-node-title" x="1258" y="550">LLM / agent UI pass</text>
                <text class="map-node-text" x="1258" y="574">Generate from reviewed</text>
                <text class="map-node-text" x="1258" y="596">handoff, not raw brief.</text>
                <rect class="map-node map-node-output" x="1470" y="518" width="204" height="94" rx="12"></rect>
                <text class="map-node-title" x="1488" y="550">UI draft</text>
                <text class="map-node-text" x="1488" y="574">Reviewed by human or</text>
                <text class="map-node-text" x="1488" y="596">agent for next iteration.</text>

                <rect class="map-zone" x="1212" y="734" width="500" height="236" rx="18"></rect>
                <text class="map-boundary" x="1240" y="774">Design-system adapter</text>
                <text class="map-zone-title" x="1240" y="808">Optional visual layer after judgment</text>
                <rect class="map-node" x="1240" y="838" width="204" height="88" rx="12"></rect>
                <text class="map-node-title" x="1258" y="870">with design system</text>
                <text class="map-node-text" x="1258" y="894">Tokens, components,</text>
                <text class="map-node-text" x="1258" y="916">layout rules applied later.</text>
                <rect class="map-node" x="1470" y="838" width="204" height="88" rx="12"></rect>
                <text class="map-node-title" x="1488" y="870">without design system</text>
                <text class="map-node-text" x="1488" y="894">Still use the handoff;</text>
                <text class="map-node-text" x="1488" y="916">choose simple UI primitives.</text>

                <rect class="map-zone" x="430" y="780" width="700" height="190" rx="18"></rect>
                <text class="map-boundary" x="458" y="820">Iteration loop</text>
                <text class="map-zone-title" x="458" y="854">Draft findings become updated context</text>
                <rect class="map-node" x="462" y="884" width="292" height="60" rx="12"></rect>
                <text class="map-node-title" x="482" y="920">Review findings</text>
                <rect class="map-node map-node-kernel" x="804" y="884" width="292" height="60" rx="12"></rect>
                <text class="map-node-title" x="824" y="920">updated context</text>

                <path class="map-edge" d="M 322 330 C 374 330 374 220 462 220"></path>
                <text class="map-edge-label" x="352" y="292">MCP tool call</text>
                <path class="map-edge map-edge-muted" d="M 754 220 L 804 220"></path>
                <path class="map-edge map-edge-muted" d="M 950 270 L 950 318"></path>
                <path class="map-edge map-edge-muted" d="M 754 368 L 804 368"></path>
                <path class="map-edge map-edge-muted" d="M 950 418 L 950 466"></path>
                <path class="map-edge map-edge-blocked" d="M 804 544 C 744 580 704 590 672 606"></path>
                <path class="map-edge map-edge-blocked" d="M 594 650 C 372 650 342 452 292 390"></path>
                <text class="map-edge-label" x="348" y="620">needs source context</text>
                <path class="map-edge map-edge-llm" d="M 1096 368 C 1166 338 1192 238 1240 226"></path>
                <text class="map-edge-label" x="1130" y="302">request candidate</text>
                <path class="map-edge map-edge-llm" d="M 1470 226 C 1340 300 1220 362 1096 368"></path>
                <text class="map-edge-label" x="1302" y="338">proposed JSON returns for review</text>
                <path class="map-edge map-edge-output" d="M 1096 516 C 1158 516 1178 564 1240 564"></path>
                <text class="map-edge-label" x="1124" y="546">reviewed handoff</text>
                <path class="map-edge map-edge-output" d="M 1444 564 L 1470 564"></path>
                <path class="map-edge map-edge-muted" d="M 1572 612 L 1572 838"></path>
                <text class="map-edge-label" x="1586" y="720">optional styling path</text>
                <path class="map-edge map-edge-muted" d="M 1444 882 L 1470 882"></path>
                <path class="map-edge" d="M 1470 596 C 1290 754 1040 846 754 914"></path>
                <text class="map-edge-label" x="1090" y="812">review draft</text>
                <path class="map-edge" d="M 804 914 C 648 820 582 736 608 566"></path>
                <text class="map-edge-label" x="650" y="790">next turn</text>
              </svg>
            </div>
            <div class="system-map-summary" aria-label="System map text summary">
              <p><strong>MCP boundary:</strong> agents call JudgmentKit tools through MCP; MCP is access and transport, not the LLM.</p>
              <p><strong>JudgmentKit kernel:</strong> deterministic review, candidate review, disclosure rules, targeted questions, and the handoff gate decide whether UI generation is ready.</p>
              <p><strong>LLM / provider seam:</strong> a model may propose activity or workflow candidates, but JudgmentKit reviews those candidates before trusting them.</p>
              <p><strong>UI generation:</strong> the LLM or agent generates the interface outside JudgmentKit from the reviewed handoff.</p>
              <p><strong>Design-system adapter:</strong> teams can generate with design-system tokens/components or without design system support; in both cases, styling comes after activity/workflow judgment.</p>
              <p><strong>Iteration:</strong> draft review produces updated context that re-enters JudgmentKit rather than becoming only a longer prompt.</p>
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
          <section class="doc-section" id="handoff">
            <h2>Handoff</h2>
            <p>Call <code>create_ui_generation_handoff</code> only on a ready workflow review. If the gate blocks, resolve the targeted questions or leakage details first.</p>
          </section>
          <section class="doc-section" id="profiles">
            <h2>Guidance Profiles</h2>
            <p>Call <code>recommend_ui_workflow_profiles</code> when a brief sounds like specialized review work. Pass <code>profile_id: "operator-review-ui"</code> only when the recommendation evidence supports it.</p>
          </section>
        </div>
      </div>
    </section>
    ${systemMapViewerScript()}
  `,
    {
      description:
        "JudgmentKit docs for CLI, MCP, activity review, workflow review, handoff, and guidance profiles.",
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

const EXAMPLES = [
  {
    id: "one-shot-proof",
    title: "One-shot proof",
    label: "Proof",
    description:
      "A baseline refund-ops UI beside a JudgmentKit-guided operational review workflow.",
    previewHref: "/examples/one-shot-demo.html",
    previewLabel: "One-shot proof artifact",
    actions: [
      { label: "Open artifact", href: "/examples/one-shot-demo.html" },
    ],
  },
  {
    id: "refund-triage",
    title: "Refund triage comparison",
    label: "Refund ops",
    description:
      "Two standalone review surfaces from the same refund-operations brief: one raw implementation baseline, one JudgmentKit handoff path.",
    previewHref: "/examples/comparison/refund/version-b.html",
    previewLabel: "Refund triage JudgmentKit version",
    actions: [
      { label: "Open baseline", href: "/examples/comparison/refund/version-a.html" },
      {
        label: "Open JudgmentKit version",
        href: "/examples/comparison/refund/version-b.html",
      },
    ],
  },
  {
    id: "model-ui-system-map",
    title: "Model UI generation matrix",
    label: "System map",
    description:
      "One reviewed refund-triage handoff shown across deterministic, Gemma 4 (local LLM), and GPT-5.5 branches, with and without a design-system adapter.",
    previewHref: "/examples/model-ui/refund-system-map/index.html",
    previewLabel: "Model UI generation matrix",
    actions: [
      {
        label: "Open matrix",
        href: "/examples/model-ui/refund-system-map/index.html",
      },
      {
        label: "Manifest",
        href: "/examples/model-ui/refund-system-map/manifest.json",
      },
    ],
  },
  {
    id: "dinner-playlist",
    title: "Dinner playlist comparison",
    label: "Music app",
    description:
      "A non-admin workflow test for activity fit: build a sequenced dinner playlist while honoring constraints and leaving a usable handoff note.",
    previewHref: "/examples/comparison/music/version-b.html",
    previewLabel: "Dinner playlist JudgmentKit version",
    actions: [
      { label: "Open baseline", href: "/examples/comparison/music/version-a.html" },
      {
        label: "Open JudgmentKit version",
        href: "/examples/comparison/music/version-b.html",
      },
      {
        label: "Scorecard",
        href: "/examples/comparison/music/facilitator-scorecard.md",
      },
    ],
  },
];

function renderExampleSelector(example, isActive = false) {
  return `
    <button class="example-select" type="button" data-example-id="${escapeHtml(example.id)}" aria-current="${isActive ? "true" : "false"}">
      <strong>${escapeHtml(example.title)}</strong>
      <span>${escapeHtml(example.label)}</span>
    </button>`;
}

function renderExampleActions(actions) {
  return actions
    .map(
      (action) =>
        `<a class="pill-link" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`,
    )
    .join("");
}

function renderNoScriptExampleLinks(examples) {
  return examples
    .map(
      (example) => `
        <section>
          <h3>${escapeHtml(example.title)}</h3>
          <div class="link-row">${renderExampleActions(example.actions)}</div>
        </section>`,
    )
    .join("");
}

function examplesBrowserScript() {
  return `
    <script>
      (() => {
        const dataNode = document.getElementById("examples-data");
        const browser = document.querySelector("[data-examples-browser]");
        if (!dataNode || !browser) return;

        const examples = JSON.parse(dataNode.textContent);
        const examplesById = new Map(examples.map((example) => [example.id, example]));
        const titleNode = browser.querySelector("[data-example-title]");
        const descriptionNode = browser.querySelector("[data-example-description]");
        const frameNode = browser.querySelector("[data-example-frame]");
        const frameTitleNode = browser.querySelector("[data-example-frame-title]");
        const actionsNode = browser.querySelector("[data-example-actions]");
        const menuNode = browser.querySelector("[data-example-menu]");
        const selectors = Array.from(browser.querySelectorAll("[data-example-id]"));

        function renderActions(actions) {
          actionsNode.replaceChildren();
          for (const action of actions) {
            const link = document.createElement("a");
            link.className = "pill-link";
            link.href = action.href;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = action.label;
            actionsNode.append(link);
          }
        }

        function selectExample(id, options = {}) {
          const example = examplesById.get(id) ?? examples[0];
          titleNode.textContent = example.title;
          descriptionNode.textContent = example.description;
          frameTitleNode.textContent = example.previewLabel;
          frameNode.src = example.previewHref;
          frameNode.title = example.previewLabel;
          renderActions(example.actions);

          for (const selector of selectors) {
            selector.setAttribute("aria-current", String(selector.dataset.exampleId === example.id));
          }

          if (options.updateHash !== false) {
            history.replaceState(null, "", "#" + encodeURIComponent(example.id));
          }

          if (menuNode && window.matchMedia("(max-width: 820px)").matches) {
            menuNode.removeAttribute("open");
          }
        }

        for (const selector of selectors) {
          selector.addEventListener("click", () => {
            selectExample(selector.dataset.exampleId);
          });
        }

        window.addEventListener("hashchange", () => {
          selectExample(decodeURIComponent(window.location.hash.slice(1)), {
            updateHash: false,
          });
        });

        const initialId = window.location.hash
          ? decodeURIComponent(window.location.hash.slice(1))
          : examples[0].id;
        selectExample(initialId, { updateHash: false });
      })();
    </script>`;
}

async function examplesPage() {
  const firstExample = EXAMPLES[0];
  const selectors = EXAMPLES.map((example, index) => renderExampleSelector(example, index === 0)).join("");

  return page(
    "JudgmentKit Examples",
    `
    <section class="section examples-page">
      <div class="examples-intro">
        <h1>Examples</h1>
        <p class="lede">Static artifacts show deterministic demos and captured-fixture model UI paths with explicit provenance. Website builds copy committed files and do not call live providers.</p>
      </div>
      <div class="examples-browser" data-examples-browser>
        <aside class="examples-rail" aria-label="Examples list">
          <p class="examples-rail-title">Examples</p>
          <div class="example-list">${selectors}</div>
        </aside>
        <div class="examples-main">
          <details class="example-menu" data-example-menu>
            <summary>Browse examples</summary>
            <div class="example-list">${selectors}</div>
          </details>
          <section class="example-preview" aria-label="Selected example">
            <div class="example-preview-header">
              <div class="example-preview-title-row">
                <div>
                  <h2 data-example-title>${escapeHtml(firstExample.title)}</h2>
                  <p class="note" data-example-description>${escapeHtml(firstExample.description)}</p>
                </div>
                <div class="example-actions" data-example-actions>
                  ${renderExampleActions(firstExample.actions)}
                </div>
              </div>
            </div>
            <div class="example-frame-shell">
              <div class="example-frame-toolbar">
                <span class="example-frame-title" data-example-frame-title>${escapeHtml(firstExample.previewLabel)}</span>
                <span>Inline preview</span>
              </div>
              <iframe class="example-frame" data-example-frame src="${escapeHtml(firstExample.previewHref)}" title="${escapeHtml(firstExample.previewLabel)}" loading="eager"></iframe>
            </div>
          </section>
          <noscript>
            <div class="example-noscript-links">
              <p class="note">JavaScript is disabled. The first artifact is previewed above; direct links remain available here.</p>
              ${renderNoScriptExampleLinks(EXAMPLES)}
            </div>
          </noscript>
        </div>
      </div>
      <script type="application/json" id="examples-data">${serializeJsonForHtml(EXAMPLES)}</script>
      ${examplesBrowserScript()}
    </section>
  `,
    {
      description:
        "JudgmentKit examples comparing raw brief outputs with activity-first handoff outputs.",
      path: "/examples/",
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

export async function buildSite(outDir = DEFAULT_OUT_DIR) {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(outDir, "docs"), { recursive: true });
  await fs.mkdir(path.join(outDir, "examples"), { recursive: true });

  await fs.writeFile(path.join(outDir, "assets", "site.css"), stylesheet.trimStart());
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
  await copyDirectoryIfExists("examples/model-ui", path.join(outDir, "examples", "model-ui"));

  return {
    out_dir: outDir,
    routes: ["/", "/docs/", "/examples/", "/install", "/mcp"],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { outDir } = parseArgs(process.argv.slice(2));
  const result = await buildSite(outDir);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
