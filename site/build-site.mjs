#!/usr/bin/env node
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_REPOSITORY_URL,
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
    <section class="section" aria-labelledby="generation-loop-title">
      <h2 id="generation-loop-title">Generation loop</h2>
      <p class="lede system-diagram-intro">JudgmentKit sits before generation and stays in the loop across iterations. It does not render the final UI; it keeps each LLM or agent draft grounded in the activity, decision, vocabulary, and handoff.</p>
      <div class="system-diagram" aria-label="JudgmentKit generation loop">
        <ol class="system-flow">
          <li class="system-node">
            <span>Context</span>
            <strong>Source brief</strong>
            <p>Product context, constraints, and implementation-heavy source detail enter the loop.</p>
          </li>
          <li class="system-node system-node-kernel">
            <span>Judgment</span>
            <strong>Activity review</strong>
            <p>Name the participant, objective, decision, outcome, vocabulary, and disclosure boundary.</p>
          </li>
          <li class="system-node system-node-kernel">
            <span>Handoff</span>
            <strong>Ready brief</strong>
            <p>Pass only reviewed workflow guidance to the next generation step.</p>
          </li>
          <li class="system-node system-node-output">
            <span>Generate</span>
            <strong>LLM draft</strong>
            <p>The model or agent generates the UI from the reviewed handoff.</p>
          </li>
          <li class="system-node">
            <span>Review</span>
            <strong>Findings</strong>
            <p>Human or agent review identifies gaps, leaks, missing decisions, or changed constraints.</p>
          </li>
          <li class="system-node system-node-kernel">
            <span>Iterate</span>
            <strong>Updated context</strong>
            <p>Feed the findings back into JudgmentKit instead of just making a longer prompt.</p>
          </li>
        </ol>
      </div>
    </section>
    <section class="section">
      <h2>Install for Codex</h2>
      <p class="lede">The installer clones the public repo, installs dependencies, configures a local MCP server named <code>judgmentkit</code>, and verifies the tool catalog before finishing.</p>
      <code class="command">curl -fsSL https://judgmentkit.ai/install | bash</code>
      <p class="note">First release support is intentionally Codex-only over local stdio.</p>
    </section>
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
          <a href="#mcp">MCP</a>
          <a href="#generation-loop">Generation Loop</a>
          <a href="#activity-review">Activity Review</a>
          <a href="#workflow-review">Workflow Review</a>
          <a href="#handoff">Handoff</a>
          <a href="#profiles">Profiles</a>
        </aside>
        <div>
          <section class="doc-section" id="quickstart">
            <h1>Docs</h1>
            <h2>Quickstart</h2>
            <p>Install JudgmentKit for Codex, then run a local smoke check from the cloned checkout.</p>
            <pre><code>curl -fsSL https://judgmentkit.ai/install | bash
cd ~/.codex/judgmentkit
npm run mcp:smoke
node bin/judgmentkit.mjs review --input examples/refund-triage.brief.txt</code></pre>
            <p class="note">The smoke path is deterministic and does not require a live model provider.</p>
          </section>
          <section class="doc-section" id="mcp">
            <h2>MCP</h2>
            <p>JudgmentKit supports MCP through the hosted Streamable HTTP endpoint at <code>https://judgmentkit.ai/mcp</code> and through the installed local stdio server named <code>judgmentkit</code>. A browser GET to <code>/mcp</code> returns endpoint metadata; MCP clients should connect to the same URL with Streamable HTTP.</p>
          </section>
          <section class="doc-section" id="generation-loop">
            <h2>Generation Loop</h2>
            <p>Use JudgmentKit before generation and across iterations. It is the contract and review layer around the LLM or agent, not the final UI renderer.</p>
            <div class="system-diagram" aria-label="JudgmentKit generation loop for agents">
              <ol class="system-flow system-flow-detailed">
                <li class="system-node">
                  <span>1. Context</span>
                  <strong>Source brief + product context</strong>
                  <p>Start from the user brief, source artifacts, current UI, domain constraints, and implementation detail that may need disclosure control.</p>
                </li>
                <li class="system-node system-node-kernel">
                  <span>2. Activity</span>
                  <strong><code>create_activity_model_review</code></strong>
                  <p>Extract the participant, objective, decision, outcome, vocabulary, and implementation terms before screen structure.</p>
                </li>
                <li class="system-node">
                  <span>3. Candidate</span>
                  <strong>Workflow candidate</strong>
                  <p>An agent, model, or deterministic path proposes steps, actions, decisions, UI responsibilities, and handoff behavior.</p>
                </li>
                <li class="system-node system-node-kernel">
                  <span>4. Review</span>
                  <strong><code>review_ui_workflow_candidate</code></strong>
                  <p>Check grounding, action support, completion clarity, handoff clarity, and leakage containment.</p>
                </li>
                <li class="system-node system-node-kernel">
                  <span>5. Gate</span>
                  <strong><code>create_ui_generation_handoff</code></strong>
                  <p>Only a ready workflow becomes the compact handoff for UI generation.</p>
                </li>
                <li class="system-node system-node-output">
                  <span>6. Generate</span>
                  <strong>LLM or agent UI draft</strong>
                  <p>Generate the interface from the reviewed handoff, not directly from the raw implementation brief.</p>
                </li>
                <li class="system-node">
                  <span>7. Review</span>
                  <strong>Draft findings</strong>
                  <p>Capture missing evidence, wrong vocabulary, weak decisions, leakage, and changed constraints.</p>
                </li>
                <li class="system-node system-node-kernel">
                  <span>8. Iterate</span>
                  <strong>Updated context</strong>
                  <p>Feed findings and revised constraints back into JudgmentKit for the next turn.</p>
                </li>
              </ol>
            </div>
            <p class="system-note">The durable artifact across turns is the reviewed handoff and updated context, not just a longer prompt.</p>
            <p class="system-branch"><strong>Blocked path:</strong> if the handoff gate blocks, resolve targeted questions or leakage details before generating UI.</p>
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
        <p class="lede">Deterministic artifacts show the difference between raw brief generation and JudgmentKit-guided handoff generation without requiring a live model call.</p>
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

function bootstrapScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd git
require_cmd node
require_cmd npm

CHECKOUT_PATH="$HOME/.codex/judgmentkit"
ARGS=("$@")
FORWARDED_ARGS=()

for ((index = 0; index < \${#ARGS[@]}; index += 1)); do
  if [[ "\${ARGS[$index]}" == "--path" ]]; then
    CHECKOUT_PATH="\${ARGS[$((index + 1))]}"
    index=$((index + 1))
    continue
  fi

  FORWARDED_ARGS+=("\${ARGS[$index]}")
done

if [[ ! -d "$CHECKOUT_PATH/.git" ]]; then
  mkdir -p "$(dirname "$CHECKOUT_PATH")"
  git clone "${DEFAULT_REPOSITORY_URL}" "$CHECKOUT_PATH"
fi

cd "$CHECKOUT_PATH"
npm install
exec node ./scripts/install-mcp.mjs --client codex --path "$CHECKOUT_PATH" "\${FORWARDED_ARGS[@]}"
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
  await fs.writeFile(path.join(outDir, "install"), bootstrapScript(), { mode: 0o755 });
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
