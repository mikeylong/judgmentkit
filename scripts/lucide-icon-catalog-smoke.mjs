import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleToolCall } from "../src/mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "examples", "lucide-icon-catalog-smoke.html");
const pageLimit = 100;

const agentScenarios = [
  {
    id: "status-success",
    label: "Status success",
    query: "check",
    expected_icon_id: "check",
    intent: "Show a completed status beside a visible result label.",
  },
  {
    id: "status-info",
    label: "Information",
    query: "info",
    expected_icon_id: "info",
    intent: "Mark supporting context without replacing visible text.",
  },
  {
    id: "navigation-next",
    label: "Navigate next",
    query: "chevron right",
    expected_icon_id: "chevron-right",
    intent: "Indicate a drill-in or next-item affordance.",
  },
  {
    id: "filter-list",
    label: "Filter list",
    query: "list filter",
    expected_icon_id: "list-filter",
    intent: "Narrow a queue or worklist with an icon-backed control.",
  },
  {
    id: "send-message",
    label: "Send handoff",
    query: "send",
    expected_icon_id: "send",
    intent: "Submit or forward a completed handoff.",
  },
  {
    id: "receipt-record",
    label: "Receipt text",
    query: "receipt text",
    expected_icon_id: "receipt-text",
    intent: "Represent a completion receipt or record.",
  },
  {
    id: "settings",
    label: "Settings",
    query: "settings",
    expected_icon_id: "settings",
    intent: "Open bounded configuration controls.",
  },
  {
    id: "calendar",
    label: "Calendar",
    query: "calendar",
    expected_icon_id: "calendar",
    intent: "Represent scheduled work or date selection.",
  },
  {
    id: "search",
    label: "Search",
    query: "search",
    expected_icon_id: "search",
    intent: "Find a case, record, or catalog entry.",
  },
  {
    id: "download",
    label: "Download",
    query: "download",
    expected_icon_id: "download",
    intent: "Export or save a generated artifact.",
  },
  {
    id: "upload",
    label: "Upload",
    query: "upload",
    expected_icon_id: "upload",
    intent: "Import a file or handoff attachment.",
  },
  {
    id: "delete",
    label: "Delete",
    query: "trash 2",
    expected_icon_id: "trash-2",
    intent: "Mark a destructive action with explicit visible text.",
  },
  {
    id: "user",
    label: "User",
    query: "user",
    expected_icon_id: "user",
    intent: "Represent a person, owner, or assignee.",
  },
  {
    id: "notification",
    label: "Notification",
    query: "bell",
    expected_icon_id: "bell",
    intent: "Show alerts or updates with adjacent status text.",
  },
  {
    id: "chart",
    label: "Chart",
    query: "chart column",
    expected_icon_id: "chart-column",
    intent: "Represent report metrics without replacing the chart label.",
  },
  {
    id: "risk-alert",
    label: "Risk alert",
    query: "circle alert",
    expected_icon_id: "circle-alert",
    intent: "Mark a risk or warning state beside the reason text.",
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function jsonForHtml(value) {
  return JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
}

function svgFromElements(icon) {
  const elements = Array.isArray(icon?.elements) ? icon.elements : [];
  const body = elements
    .map((element) => {
      const attrs = Object.entries(element.attrs ?? {})
        .map(([name, value]) => `${escapeAttribute(name)}="${escapeAttribute(value)}"`)
        .join(" ");
      return `<${escapeHtml(element.tag)}${attrs ? ` ${attrs}` : ""}></${escapeHtml(element.tag)}>`;
    })
    .join("");

  return `<svg viewBox="0 0 24 24">${body}</svg>`;
}

function assertToolResult(name, result) {
  if (result?.error) {
    throw new Error(`${name} failed: ${result.error.message}`);
  }
  return result;
}

async function selectScenarioIcon(scenario) {
  const searchResult = assertToolResult(
    "search_icon_catalog",
    await handleToolCall("search_icon_catalog", {
      query: scenario.query,
      limit: 8,
    }),
  );
  const selected = searchResult.icons.find(
    (icon) => icon.id === scenario.expected_icon_id,
  );

  if (!selected) {
    throw new Error(
      `Expected ${scenario.expected_icon_id} in search results for "${scenario.query}".`,
    );
  }

  const svgResult = assertToolResult(
    "get_icon_svg",
    await handleToolCall("get_icon_svg", { id: selected.id }),
  );

  return {
    ...scenario,
    selected_icon_id: selected.id,
    selected_icon_name: selected.name,
    search_rank:
      searchResult.icons.findIndex((icon) => icon.id === selected.id) + 1,
    score: selected.score,
    inline_svg: svgFromElements(svgResult.icon),
    source: svgResult.icon.source,
  };
}

async function loadFullCatalog() {
  const icons = [];
  let cursor;
  let source;
  let totalCount;

  do {
    const result = assertToolResult(
      "list_icon_catalog",
      await handleToolCall("list_icon_catalog", {
        limit: pageLimit,
        cursor,
        include_svg: true,
      }),
    );
    source = source ?? result.source;
    totalCount = totalCount ?? result.total_count;
    icons.push(...result.icons);
    cursor = result.next_cursor;
  } while (cursor);

  if (icons.length !== totalCount) {
    throw new Error(`Expected ${totalCount} catalog icons, received ${icons.length}.`);
  }

  return { icons, source, totalCount };
}

function renderScenarioCard(scenario) {
  return `
          <article class="agent-card" data-agent-icon-card="${escapeAttribute(scenario.id)}" data-selected-icon="${escapeAttribute(scenario.selected_icon_id)}">
            <div class="catalog-symbol agent-symbol" aria-hidden="true">${scenario.inline_svg}</div>
            <div>
              <h3>${escapeHtml(scenario.label)}</h3>
              <p>${escapeHtml(scenario.intent)}</p>
              <dl>
                <div><dt>Query</dt><dd>${escapeHtml(scenario.query)}</dd></div>
                <div><dt>Selected</dt><dd><code>${escapeHtml(scenario.selected_icon_id)}</code></dd></div>
                <div><dt>Rank</dt><dd>${escapeHtml(scenario.search_rank)}</dd></div>
              </dl>
            </div>
          </article>`;
}

function renderCatalogIcon(icon) {
  return `
          <div class="catalog-icon" data-catalog-icon="${escapeAttribute(icon.id)}">
            <div class="catalog-symbol" aria-hidden="true">${svgFromElements(icon)}</div>
            <span>${escapeHtml(icon.id)}</span>
          </div>`;
}

function renderHtml({ source, totalCount, scenarios, icons }) {
  const metadata = {
    proof_id: "lucide-icon-catalog-smoke-v1",
    source: {
      library: source.library,
      package: source.package,
      version: source.version,
      icon_count: source.icon_count,
    },
    tools_used: ["search_icon_catalog", "get_icon_svg", "list_icon_catalog"],
    catalog_count: totalCount,
    rendered_grid_count: icons.length,
    agent_scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      query: scenario.query,
      expected_icon_id: scenario.expected_icon_id,
      selected_icon_id: scenario.selected_icon_id,
      search_rank: scenario.search_rank,
      score: scenario.score,
      inline_svg: scenario.inline_svg,
    })),
    grid_icon_ids: icons.map((icon) => icon.id),
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>JudgmentKit Lucide Icon Catalog Smoke Proof</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #162027;
        --muted: #5f6870;
        --line: #d7dde2;
        --surface: #f7f8f8;
        --panel: #ffffff;
        --accent: #23615f;
        --risk: #8f342f;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: var(--surface);
      }

      main {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 40px 0 56px;
      }

      header {
        display: grid;
        gap: 14px;
        padding-bottom: 26px;
        border-bottom: 1px solid var(--line);
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        font-size: clamp(2rem, 5vw, 4.5rem);
        line-height: 0.95;
        max-width: 900px;
      }

      h2 {
        font-size: 1.35rem;
        margin: 36px 0 14px;
      }

      h3 {
        font-size: 1rem;
      }

      p {
        color: var(--muted);
        line-height: 1.55;
      }

      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 0.92em;
      }

      .lede {
        max-width: 780px;
        font-size: 1.08rem;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .stat {
        min-height: 82px;
        border: 1px solid var(--line);
        background: var(--panel);
        padding: 14px;
      }

      .stat strong {
        display: block;
        font-size: 1.4rem;
      }

      .stat span {
        color: var(--muted);
        font-size: 0.88rem;
      }

      .agent-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .agent-card {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        min-height: 176px;
        padding: 14px;
        border: 1px solid var(--line);
        background: var(--panel);
      }

      .catalog-symbol {
        display: grid;
        place-items: center;
        width: 28px;
        min-height: 28px;
        color: var(--accent);
      }

      .agent-symbol {
        margin-top: 1px;
      }

      .catalog-symbol svg {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      dl {
        display: grid;
        gap: 5px;
        margin: 12px 0 0;
      }

      dl div {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr);
        gap: 8px;
      }

      dt {
        color: var(--muted);
        font-size: 0.78rem;
      }

      dd {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
        font-size: 0.82rem;
      }

      .catalog-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
        gap: 8px;
      }

      .catalog-icon {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        min-height: 46px;
        padding: 9px;
        border: 1px solid var(--line);
        background: var(--panel);
      }

      .catalog-icon span {
        min-width: 0;
        overflow-wrap: anywhere;
        font-size: 0.78rem;
      }

      .note {
        margin: 8px 0 14px;
      }

      @media (max-width: 900px) {
        .stats,
        .agent-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        main {
          width: min(100vw - 20px, 1180px);
          padding-top: 24px;
        }

        .stats,
        .agent-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="lede">This deterministic smoke proof exercises JudgmentKit MCP icon tools, then renders the retrieved Lucide SVG data as an HTML artifact agents and tests can inspect.</p>
        <h1>Lucide Icon Catalog Smoke Proof</h1>
        <div class="stats" aria-label="Smoke proof summary">
          <div class="stat"><strong>${escapeHtml(totalCount)}</strong><span>Rendered catalog icons</span></div>
          <div class="stat"><strong>${escapeHtml(source.package)}</strong><span>Source package</span></div>
          <div class="stat"><strong>${escapeHtml(source.version)}</strong><span>Source version</span></div>
          <div class="stat"><strong>3</strong><span>MCP icon tools used</span></div>
        </div>
      </header>

      <section aria-labelledby="agent-proof-title">
        <h2 id="agent-proof-title">Agent search and retrieval proof</h2>
        <p class="note">Each card starts from an agent intent, searches the catalog, retrieves SVG data by canonical Lucide ID, and renders the selected icon with the same inline SVG treatment used in the full catalog grid.</p>
        <div class="agent-grid">
${scenarios.map(renderScenarioCard).join("\n")}
        </div>
      </section>

      <section aria-labelledby="catalog-grid-title">
        <h2 id="catalog-grid-title">Full catalog render grid</h2>
        <p class="note">The grid is produced from paginated <code>list_icon_catalog</code> calls with <code>include_svg: true</code>. Every visible tile has an inline SVG and the canonical icon ID.</p>
        <div class="catalog-grid">
${icons.map(renderCatalogIcon).join("\n")}
        </div>
      </section>
    </main>
    <script type="application/json" id="lucide-icon-smoke-data">${jsonForHtml(metadata)}</script>
  </body>
</html>
`;
}

const scenarios = await Promise.all(agentScenarios.map(selectScenarioIcon));
const { icons, source, totalCount } = await loadFullCatalog();
const html = renderHtml({ source, totalCount, scenarios, icons });

fs.writeFileSync(outputPath, html);
console.log(
  JSON.stringify(
    {
      ok: true,
      output: path.relative(rootDir, outputPath),
      catalog_count: totalCount,
      scenario_count: scenarios.length,
    },
    null,
    2,
  ),
);
