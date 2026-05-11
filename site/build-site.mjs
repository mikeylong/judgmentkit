#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMcpMetadata } from "../src/mcp.mjs";
import {
  DEFAULT_REPOSITORY_URL,
  JUDGMENTKIT_MCP_TOOL_NAMES,
} from "../scripts/install-mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT_DIR = path.join(__dirname, "dist");

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

function page(title, body, options = {}) {
  const description =
    options.description ??
    "JudgmentKit is an activity-first judgment layer for AI-generated product work.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="/assets/site.css">
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
.proof-panel,
.route-grid article,
.example-card {
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
  padding: 18px;
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
.status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ok);
  background: #f4fbf6;
}
.section {
  border-top: 1px solid var(--line);
}
.route-grid,
.example-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.route-grid article,
.example-card {
  padding: 18px;
}
.route-grid h3,
.example-card h3 {
  margin-bottom: 8px;
}
.command {
  display: block;
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
  .route-grid,
  .example-grid {
    grid-template-columns: 1fr;
  }
  .proof-step {
    grid-template-columns: 1fr;
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
        <p class="lede">JudgmentKit stops implementation mechanics from becoming UX. It turns a raw product brief into activity guidance, workflow review, and a compact handoff before an agent builds the interface.</p>
      </div>
      <div class="proof-panel" aria-label="JudgmentKit proof path">
        <div class="proof-step">
          <strong>Raw brief</strong>
          <code>Create a dashboard from the refund schema, prompt output, and agent status fields.</code>
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
      <h2>The public workflow</h2>
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
    <section class="section">
      <h2>Install for Codex</h2>
      <p class="lede">The first relaunch supports Codex over local stdio.</p>
      <code class="command">curl -fsSL https://judgmentkit.ai/install | bash</code>
    </section>
  `,
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
          <a href="#activity-review">Activity Review</a>
          <a href="#workflow-review">Workflow Review</a>
          <a href="#handoff">Handoff</a>
          <a href="#profiles">Profiles</a>
        </aside>
        <div>
          <section class="doc-section" id="quickstart">
            <h1>Docs</h1>
            <h2>Quickstart</h2>
            <pre><code>npm run mcp:smoke
judgmentkit review --input examples/refund-triage.brief.txt</code></pre>
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

function manifestCards(manifest) {
  if (!manifest?.variants) {
    return "";
  }

  return manifest.variants
    .map(
      (variant) => `
      <article class="example-card">
        <h3>${escapeHtml(variant.label ?? variant.id)}</h3>
        <p>${escapeHtml(variant.summary ?? variant.treatment ?? "Standalone example variant.")}</p>
        <p><strong>Treatment:</strong> ${escapeHtml(variant.treatment ?? "baseline")}</p>
      </article>`,
    )
    .join("");
}

async function examplesPage() {
  const comparison = await readJsonIfExists("examples/comparison/manifest.json");
  const music = await readJsonIfExists("examples/comparison/music/manifest.json");

  return page(
    "JudgmentKit Examples",
    `
    <section class="section">
      <h1>Examples</h1>
      <p class="lede">Deterministic artifacts show the difference between raw brief generation and JudgmentKit-guided handoff generation without requiring a live model call.</p>
      <div class="example-grid">
        <article class="example-card">
          <h3>One-shot proof</h3>
          <p>A baseline refund-ops UI beside a JudgmentKit-guided operational review workflow.</p>
          <a href="/examples/one-shot-demo.html">Open artifact</a>
        </article>
        ${manifestCards(comparison)}
        ${manifestCards(music)}
      </div>
    </section>
  `,
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
  await fs.writeFile(path.join(outDir, "index.html"), homepage());
  await fs.writeFile(path.join(outDir, "docs", "index.html"), docsPage());
  await fs.writeFile(path.join(outDir, "examples", "index.html"), await examplesPage());
  await fs.writeFile(path.join(outDir, "install"), bootstrapScript(), { mode: 0o755 });
  await fs.writeFile(
    path.join(outDir, "mcp"),
    `${JSON.stringify(getMcpMetadata("stdio"), null, 2)}\n`,
  );
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
