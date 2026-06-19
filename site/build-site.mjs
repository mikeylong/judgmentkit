#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildWithEsbuild } from "esbuild";

import {
  JUDGMENTKIT_MCP_TOOL_NAMES,
} from "../scripts/install-mcp.mjs";
import {
  createUiImplementationContract,
  getIconSvg,
  listIconCatalog,
  searchIconCatalog,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT_DIR = path.join(__dirname, "dist");
const require = createRequire(import.meta.url);
const ANALYTICS_SDK_VERSION = require("@vercel/analytics/package.json").version;
const SYSTEM_MAP_FLOW_ASSET_VERSION = "judgmentkit-flow-controls-bottom-left";
const SITE_ORIGIN = "https://judgmentkit.ai";
const SOCIAL_THUMBNAIL_SOURCE_FILENAME = "judgmentkit-social-thumbnail.png";
const SOCIAL_THUMBNAIL_FILENAME = "judgmentkit-social-thumbnail-20260611.png";
const SOCIAL_THUMBNAIL_PATH = `/assets/${SOCIAL_THUMBNAIL_FILENAME}`;
const SOCIAL_THUMBNAIL_ALT = "JudgmentKit. Before the UI.";
const DESIGN_SYSTEM_SPECIMEN_RENDERER = {
  id: "judgmentkit-static-specimens",
  version: "0.1.0",
};

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

function canonicalJson(value) {
  return JSON.stringify(canonicalizeJsonValue(value));
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function hashCanonical(value) {
  return sha256(canonicalJson(value));
}

function hashText(value) {
  return sha256(String(value));
}

function shortHash(hash) {
  return hash.replace(/^sha256:/, "").slice(0, 12);
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

const platformSites = [
  {
    id: "surfaces",
    label: "surfaces.systems",
    href: "https://surfaces.systems/",
    description: "Canonical source of interface truth",
  },
  {
    id: "surfaceops",
    label: "surfaceops.ai",
    href: "https://surfaceops.ai/",
    description: "Operational enforcement and monitoring",
  },
  {
    id: "interfacectl",
    label: "interfacectl.com",
    href: "https://interfacectl.com/",
    description: "Executable interface control",
  },
  {
    id: "surfaces-dev",
    label: "surfaces.dev",
    href: "https://surfaces.dev/",
    description: "Developer documentation and reference",
  },
  {
    id: "judgmentkit",
    label: "judgmentkit.ai",
    href: "https://judgmentkit.ai/",
    description: "Embedded MCP judgment for live design decisions",
  },
];

const primaryNavLinks = [
  { label: "Value", href: "/value/" },
  { label: "Docs", href: "/docs/" },
  { label: "Design System", href: "/design-system/" },
  { label: "Examples", href: "/examples/" },
  { label: "Evals", href: "/evals/" },
  { label: "MCP", href: "/mcp" },
];

const DESIGN_SYSTEM_ROUTES = [
  "/design-system/",
  "/design-system/tokens/",
  "/design-system/fonts/",
  "/design-system/icons/",
  "/design-system/components/",
  "/design-system/patterns/",
  "/design-system/accessibility/",
];

const ICON_PAGE_SCENARIOS = [
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
    intent: "Represent a person, owner, or participant.",
  },
  {
    id: "notification",
    label: "Bell",
    query: "bell",
    expected_icon_id: "bell",
    intent: "Show a notification or alert entry point.",
  },
  {
    id: "chart",
    label: "Chart column",
    query: "chart column",
    expected_icon_id: "chart-column",
    intent: "Represent a metric or summary visualization.",
  },
  {
    id: "risk-alert",
    label: "Circle alert",
    query: "circle alert",
    expected_icon_id: "circle-alert",
    intent: "Mark risk or escalation beside a visible reason.",
  },
];

function renderPlatformHeader() {
  return `    <nav class="surfaces-navigation" aria-label="Surfaces platform" data-surfaces-navigation>
      <div class="surfaces-navigation-inner">
        <div class="surfaces-navigation-left">
          <a class="surfaces-navigation-identifier" href="/">JudgmentKit</a>
          <div class="surfaces-navigation-sections" aria-label="Primary">
            ${primaryNavLinks
              .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
              .join("\n            ")}
          </div>
          <div class="surfaces-primary-menu" data-surfaces-primary-menu-root>
            <button
              class="surfaces-primary-menu-button"
              type="button"
              aria-label="Open primary navigation"
              aria-expanded="false"
              aria-controls="surfaces-primary-menu"
              aria-haspopup="menu"
              data-surfaces-primary-menu-button
            >
              <span>Menu</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"></path>
              </svg>
            </button>
            <div class="surfaces-primary-menu-backdrop" hidden data-surfaces-primary-menu-backdrop></div>
            <div class="surfaces-primary-menu-list" id="surfaces-primary-menu" role="menu" hidden data-surfaces-primary-menu-list>
              ${primaryNavLinks
                .map((link) => `<a href="${escapeHtml(link.href)}" role="menuitem">${escapeHtml(link.label)}</a>`)
                .join("\n              ")}
            </div>
          </div>
        </div>
        <div class="surfaces-navigation-right">
          <div class="surfaces-system-switch" data-surfaces-system-switch>
            <button class="surfaces-system-switch-button" type="button" aria-expanded="false" aria-haspopup="menu" data-surfaces-system-menu-button>
              <span>judgmentkit.ai</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"></path>
              </svg>
            </button>
            <div class="surfaces-system-switch-backdrop" hidden data-surfaces-system-menu-backdrop></div>
            <div class="surfaces-system-switch-menu" role="menu" hidden data-surfaces-system-menu>
            ${platformSites
              .map((site) => {
                const isCurrent = site.id === "judgmentkit";
                const nameClass =
                  site.id === "interfacectl" || site.id === "surfaces-dev"
                    ? "surfaces-system-switch-name surfaces-system-switch-name-mono"
                    : "surfaces-system-switch-name";

                return `<a href="${escapeHtml(site.href)}" role="menuitem"${isCurrent ? ' aria-current="page"' : ""}>
              <span class="${nameClass}">${escapeHtml(site.label)}</span>
              <span class="surfaces-system-switch-description">${escapeHtml(site.description)}</span>
            </a>`;
              })
              .join("\n            ")}
            </div>
          </div>
        </div>
      </div>
    </nav>`;
}

function platformNavigationScript() {
  return `    <script>
      (() => {
        const navs = document.querySelectorAll("[data-surfaces-navigation]");

        const bindMenu = ({ button, menu, backdrop }) => {
          if (!button || !menu || !backdrop) return;

          const setOpen = (open) => {
            button.setAttribute("aria-expanded", String(open));
            menu.hidden = !open;
            backdrop.hidden = !open;
          };

          button.addEventListener("click", () => {
            setOpen(button.getAttribute("aria-expanded") !== "true");
          });

          backdrop.addEventListener("click", () => setOpen(false));
          menu.addEventListener("click", (event) => {
            if (event.target.closest("a")) setOpen(false);
          });
          document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") setOpen(false);
          });
        };

        for (const nav of navs) {
          bindMenu({
            button: nav.querySelector("[data-surfaces-primary-menu-button]"),
            menu: nav.querySelector("[data-surfaces-primary-menu-list]"),
            backdrop: nav.querySelector("[data-surfaces-primary-menu-backdrop]"),
          });

          bindMenu({
            button: nav.querySelector("[data-surfaces-system-menu-button]"),
            menu: nav.querySelector("[data-surfaces-system-menu]"),
            backdrop: nav.querySelector("[data-surfaces-system-menu-backdrop]"),
          });
        }

        for (const sectionMenu of document.querySelectorAll("[data-design-system-section-menu]")) {
          bindMenu({
            button: sectionMenu.querySelector("[data-design-system-section-menu-button]"),
            menu: sectionMenu.querySelector("[data-design-system-section-menu-list]"),
            backdrop: sectionMenu.querySelector("[data-design-system-section-menu-backdrop]"),
          });
        }
      })();
    </script>`;
}

function page(title, body, options = {}) {
  const description =
    options.description ??
    "JudgmentKit is an activity-first judgment layer for AI-generated product work.";
  const pathName = options.path ?? "/";
  const canonicalUrl = `${SITE_ORIGIN}${pathName}`;
  const socialThumbnailUrl = `${SITE_ORIGIN}${SOCIAL_THUMBNAIL_PATH}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="image_src" href="${escapeHtml(socialThumbnailUrl)}">
    <meta property="og:site_name" content="JudgmentKit">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${escapeHtml(socialThumbnailUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(socialThumbnailUrl)}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(SOCIAL_THUMBNAIL_ALT)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(socialThumbnailUrl)}">
    <meta name="twitter:image:alt" content="${escapeHtml(SOCIAL_THUMBNAIL_ALT)}">
    <link rel="stylesheet" href="/assets/site.css">
${options.headExtra ?? ""}
${analyticsBootstrap()}
  </head>
  <body>
${renderPlatformHeader()}
    <main>${body}</main>
${platformNavigationScript()}
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
  --eval-serif: "Source Serif 4", "Iowan Old Style", Charter, "Palatino Linotype", "Book Antiqua", Georgia, serif;
}
* {
  box-sizing: border-box;
}
html {
  overflow-x: hidden;
}
body {
  margin: 0;
  padding-top: 56px;
  background: var(--bg);
  color: var(--ink);
  overflow-x: hidden;
  font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a {
  color: var(--accent-strong);
}
[id] {
  scroll-margin-top: 126px;
}
.surfaces-navigation {
  height: 56px;
  background-color: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid #e5e5e5;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 50;
  backdrop-filter: blur(8px);
}
.surfaces-navigation-inner {
  max-width: 1120px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 24px;
  padding-right: 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.surfaces-navigation-left {
  display: flex;
  align-items: center;
  gap: 48px;
  min-width: 0;
}
.surfaces-navigation-identifier {
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.surfaces-navigation-sections {
  display: flex;
  align-items: center;
  gap: 32px;
}
.surfaces-navigation-sections a {
  color: #525252;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 400;
  text-decoration: none;
  transition: color 0.12s linear;
}
.surfaces-navigation-sections a:hover,
.surfaces-navigation-sections a:focus-visible {
  color: #171717;
}
.surfaces-primary-menu {
  position: relative;
  display: none;
}
.surfaces-primary-menu-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 5px 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background-color: #ffffff;
  color: #525252;
  cursor: pointer;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 500;
}
.surfaces-primary-menu-button:hover,
.surfaces-primary-menu-button:focus-visible {
  color: #171717;
  outline: 0;
}
.surfaces-primary-menu-button:focus-visible {
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.18);
}
.surfaces-primary-menu-button svg {
  display: block;
  flex: 0 0 auto;
}
.surfaces-primary-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.surfaces-primary-menu-list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 220px;
  max-width: calc(100vw - 48px);
  padding: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background-color: #ffffff;
  z-index: 50;
  animation: surfaces-menu-enter 0.12s linear;
}
.surfaces-primary-menu-backdrop[hidden],
.surfaces-primary-menu-list[hidden] {
  display: none;
}
.surfaces-primary-menu-list a {
  display: block;
  padding: 12px;
  border-radius: 4px;
  color: #171717;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.12s linear;
}
.surfaces-primary-menu-list a:hover,
.surfaces-primary-menu-list a:focus-visible {
  background-color: #fafafa;
  outline: 0;
}
.surfaces-navigation-right {
  display: flex;
  align-items: center;
  gap: 32px;
}
.surfaces-system-switch {
  position: relative;
}
.surfaces-system-switch-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 0;
  background-color: transparent;
  color: #525252;
  cursor: pointer;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 400;
  transition: color 0.12s linear;
}
.surfaces-system-switch-button:hover,
.surfaces-system-switch-button:focus-visible {
  color: #171717;
  outline: 0;
}
.surfaces-system-switch-button:focus-visible {
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.18);
}
.surfaces-system-switch-button svg {
  display: block;
  flex: 0 0 auto;
}
.surfaces-system-switch-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.surfaces-system-switch-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-width: calc(100vw - 48px);
  padding: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background-color: #ffffff;
  z-index: 50;
  animation: surfaces-menu-enter 0.12s linear;
}
.surfaces-system-switch-backdrop[hidden],
.surfaces-system-switch-menu[hidden] {
  display: none;
}
.surfaces-system-switch-menu a {
  display: block;
  padding: 12px;
  border-radius: 4px;
  text-decoration: none;
  transition: background-color 0.12s linear;
}
.surfaces-system-switch-menu a[aria-current="page"] {
  background-color: #f5f5f5;
}
.surfaces-system-switch-menu a:hover,
.surfaces-system-switch-menu a:focus-visible {
  background-color: #fafafa;
  outline: 0;
}
.surfaces-system-switch-menu a[aria-current="page"]:hover,
.surfaces-system-switch-menu a[aria-current="page"]:focus-visible {
  background-color: #f5f5f5;
}
.surfaces-system-switch-name {
  display: block;
  margin-bottom: 4px;
  color: #171717;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
}
.surfaces-system-switch-name-mono {
  font-family: "JetBrains Mono", monospace;
}
.surfaces-system-switch-description {
  display: block;
  color: #525252;
  font-family: Inter, sans-serif;
  font-size: 12px;
  font-weight: 400;
}
@keyframes surfaces-menu-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
.homepage-hero {
  display: block;
  min-height: clamp(420px, 60vh, 640px);
}
.homepage-hero > div {
  max-width: 780px;
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
.evaluation-panel {
  display: grid;
}
.evaluation-step {
  display: grid;
  gap: 8px;
  padding: clamp(17px, 2.4vw, 24px);
  border-top: 1px solid var(--line);
}
.evaluation-step:first-child {
  border-top: 0;
}
.evaluation-step span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.evaluation-step strong {
  color: var(--accent-strong);
  font-size: clamp(19px, 2vw, 24px);
  line-height: 1.12;
}
.evaluation-step p {
  margin-bottom: 0;
  color: var(--muted);
}
.evaluation-step-status {
  background: rgba(46, 107, 72, 0.06);
}
.homepage-preview {
  display: grid;
  gap: clamp(18px, 4vw, 30px);
}
.homepage-preview > div:first-child {
  max-width: 860px;
}
.homepage-preview .evaluation-panel {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.homepage-preview .evaluation-step {
  border-top: 0;
  border-left: 1px solid var(--line);
}
.homepage-preview .evaluation-step:first-child {
  border-left: 0;
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
.homepage-failure,
.proof-paths,
.adoption-paths {
  display: grid;
  gap: clamp(18px, 4vw, 30px);
}
.homepage-failure > div:first-child,
.proof-paths > div:first-child,
.adoption-paths > div:first-child {
  max-width: 900px;
}
.failure-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.failure-grid article {
  padding: 0 18px 0 0;
  border-right: 1px solid var(--line);
}
.failure-grid article:last-child {
  padding-right: 0;
  border-right: 0;
}
.failure-grid h3 {
  margin-bottom: 8px;
}
.failure-grid p {
  margin-bottom: 0;
  color: var(--muted);
}
.route-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.route-grid article {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 18px;
}
.route-grid h3 {
  margin-bottom: 0;
}
.route-grid p {
  margin-bottom: 0;
}
.route-grid .pill-link {
  margin-top: 4px;
  width: fit-content;
}
.route-grid-proof article {
  border-color: rgba(36, 95, 115, 0.18);
}
.route-grid-adoption article {
  border-color: rgba(46, 107, 72, 0.18);
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
.value-page {
  display: grid;
  gap: clamp(28px, 5vw, 52px);
  padding-top: clamp(36px, 5vw, 62px);
}
.value-hero {
  max-width: 980px;
}
.value-hero h1 {
  max-width: 16ch;
}
.value-hero .lede {
  max-width: 72ch;
}
.value-case-grid {
  display: grid;
  gap: 22px;
}
.value-case {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(320px, 1.14fr);
  gap: clamp(18px, 4vw, 34px);
  align-items: start;
  padding: clamp(18px, 4vw, 28px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.value-case h2 {
  max-width: 18ch;
  font-size: clamp(26px, 3vw, 38px);
}
.value-case-copy {
  min-width: 0;
}
.value-findings {
  display: grid;
  gap: 10px;
  margin: 18px 0 0;
}
.value-findings div {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
}
.value-findings dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.value-findings dd {
  margin: 4px 0 0;
}
.value-screenshot-pair,
.value-receipt {
  min-width: 0;
}
.value-screenshot-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}
.value-screenshot-pair a {
  display: grid;
  gap: 8px;
  color: var(--ink);
  font-weight: 800;
  text-decoration: none;
}
.value-screenshot-pair img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: top center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
}
.value-screenshot-pair figcaption,
.value-screenshot-pair span {
  color: var(--muted);
  font-size: 13px;
}
.value-receipt {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(36, 95, 115, 0.22);
  border-radius: 8px;
  background: rgba(36, 95, 115, 0.05);
}
.value-receipt-row {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(36, 95, 115, 0.18);
}
.value-receipt-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.value-receipt-row strong {
  color: var(--accent-strong);
}
.value-receipt-row p {
  margin-bottom: 0;
}
.value-evidence {
  display: grid;
  gap: 14px;
  max-width: 920px;
  padding: clamp(18px, 4vw, 28px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
}
.value-evidence h2 {
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
.design-system-page {
  padding-top: clamp(36px, 5vw, 62px);
}
.design-system-layout {
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 28px;
  max-width: 1220px;
  margin: 0 auto;
}
.design-system-section-menu {
  display: none;
  position: relative;
  margin-bottom: 24px;
}
.design-system-section-menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  width: min(280px, 100%);
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  font-weight: 750;
}
.design-system-section-menu-button:hover,
.design-system-section-menu-button:focus-visible {
  border-color: var(--accent);
  outline: 0;
}
.design-system-section-menu-button:focus-visible {
  box-shadow: 0 0 0 2px rgba(36, 95, 115, 0.18);
}
.design-system-section-menu-button svg {
  flex: 0 0 auto;
}
.design-system-section-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}
.design-system-section-menu-list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  width: min(320px, calc(100vw - 48px));
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  box-shadow: 0 18px 40px rgba(23, 23, 23, 0.12);
  animation: surfaces-menu-enter 0.12s linear;
}
.design-system-section-menu-backdrop[hidden],
.design-system-section-menu-list[hidden] {
  display: none;
}
.design-system-section-menu-list a {
  display: block;
  padding: 11px 12px;
  border-radius: 4px;
  color: var(--accent-strong);
  font-weight: 700;
  text-decoration: underline;
}
.design-system-section-menu-list a:hover,
.design-system-section-menu-list a:focus-visible {
  background: #f8f7f2;
  outline: 0;
}
.design-system-nav {
  position: fixed;
  top: 88px;
  left: max(24px, calc((100vw - 1220px) / 2));
  width: min(160px, calc(100vw - 48px));
  max-height: calc(100vh - 112px);
  overflow-y: auto;
  z-index: 10;
}
.design-system-content {
  grid-column: 2;
  min-width: 0;
}
.design-system-content h1 {
  max-width: 14ch;
}
.design-system-hero {
  display: grid;
  gap: 14px;
}
.design-system-on-this-page {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.design-system-on-this-page span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.design-system-on-this-page a {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fbfaf6;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}
.design-system-nav a[aria-current="page"] {
  color: var(--accent-strong);
  font-weight: 900;
}
.design-system-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 24px 0 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-metrics div {
  min-width: 0;
  padding: 15px;
  border-right: 1px solid var(--line);
}
.design-system-metrics div:last-child {
  border-right: 0;
}
.design-system-metrics dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.design-system-metrics dd {
  margin: 4px 0 0;
  font-size: clamp(20px, 3vw, 30px);
  font-weight: 900;
  line-height: 1.05;
  overflow-wrap: anywhere;
}
.design-system-metrics p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.design-system-section {
  padding-top: clamp(28px, 5vw, 48px);
}
.design-system-foundation-list,
.design-system-step-list,
.design-system-example-grid,
.design-icon-index-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.design-system-foundation-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.design-system-foundation-list article {
  display: grid;
  gap: 10px;
  min-height: 100%;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-foundation-list h3,
.design-system-foundation-list p {
  margin: 0;
}
.design-system-step-list {
  display: grid;
  gap: 10px;
  counter-reset: design-system-step;
}
.design-system-step-list li {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-step-list li::before {
  counter-increment: design-system-step;
  content: counter(design-system-step);
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}
.design-system-review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}
.design-system-review-grid article,
.design-system-example-grid article {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-example-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.design-system-example-grid li {
  min-width: 0;
}
.design-system-example-grid h3 {
  margin-bottom: 10px;
}
.design-system-review-grid h2 {
  margin-bottom: 12px;
  font-size: clamp(22px, 2.6vw, 30px);
}
.design-system-example-grid dl {
  display: grid;
  gap: 12px;
  margin: 0;
}
.design-system-example-grid dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.design-system-example-grid dd {
  margin: 3px 0 0;
}
.design-system-agent-links {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.design-system-agent-links li {
  min-width: 0;
  overflow-wrap: anywhere;
}
.design-system-role-grid,
.design-icon-scenario-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.design-system-role-card,
.design-icon-scenario {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-role-card {
  display: grid;
  gap: 10px;
  padding: 16px;
}
.design-system-role-card h3,
.design-system-role-card p {
  margin: 0;
}
.design-system-role-card dl,
.design-icon-scenario dl {
  display: grid;
  gap: 6px;
  margin: 0;
}
.design-system-role-card dl div,
.design-icon-scenario dl div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
}
.design-system-role-card dt,
.design-icon-scenario dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.design-system-role-card dd,
.design-icon-scenario dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
.design-system-role-card code,
.design-icon-scenario code {
  font-size: 12px;
}
.design-system-rule-list {
  display: grid;
  gap: 10px;
  max-width: 880px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.design-system-rule-list li {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-rule-list-risk li {
  border-color: rgba(138, 90, 22, 0.28);
  background: rgba(138, 90, 22, 0.06);
}
.design-system-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 14px;
}
.design-system-table caption {
  padding: 12px 14px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-align: left;
  text-transform: uppercase;
}
.design-system-table th,
.design-system-table td {
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.design-system-table th {
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}
.design-system-specimen-list {
  display: grid;
  gap: 18px;
  margin-top: 18px;
}
.design-system-specimen {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-specimen-header {
  display: flex;
  gap: 18px;
  align-items: start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}
.design-system-specimen-header h3,
.design-system-specimen-header p {
  margin: 0;
}
.design-system-specimen-header .eyebrow {
  margin-bottom: 4px;
}
.design-system-specimen-body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  min-width: 0;
}
.design-system-specimen-preview-frame,
.design-system-specimen-support {
  min-width: 0;
  padding: 16px;
}
.design-system-specimen-preview-frame {
  border-right: 1px solid var(--line);
  background: #fbfaf6;
}
.design-system-specimen-support {
  display: grid;
  align-content: start;
  gap: 12px;
}
.design-system-specimen-support h4 {
  margin: 0;
  font-size: 13px;
}
.design-system-specimen-pills,
.jk-specimen-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.design-system-specimen-pills li,
.jk-specimen-chip-list li {
  min-width: 0;
  padding: 4px 7px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: 999px;
  background: var(--jk-color-surface, #ffffff);
  color: var(--jk-color-text, var(--ink));
  font-size: 12px;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.design-system-specimen-facts {
  display: grid;
  gap: 8px;
  margin: 0;
}
.design-system-specimen-facts div {
  min-width: 0;
}
.design-system-specimen-facts dt {
  color: var(--muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}
.design-system-specimen-facts dd {
  margin: 2px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.design-system-specimen details {
  min-width: 0;
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.design-system-specimen summary {
  cursor: pointer;
  font-weight: 850;
}
.design-system-specimen pre {
  max-width: 100%;
  margin: 10px 0 0;
  padding: 10px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f5f3ec;
  font-size: 12px;
}
.jk-specimen-preview {
  display: grid;
  gap: var(--jk-space-3, 0.75rem);
  min-width: 0;
  padding: var(--jk-space-4, 1rem);
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
  background: var(--jk-color-canvas, #f8f7f2);
  color: var(--jk-color-text, var(--ink));
  font-size: 14px;
  line-height: 1.4;
}
.jk-component-state-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jk-space-3, 0.75rem);
}
.jk-component-state {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
  min-height: 118px;
  padding: var(--jk-space-3, 0.75rem);
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, #ffffff);
}
.jk-component-state.is-focus-visible {
  box-shadow: var(--jk-focus-ring, 0 0 0 3px rgba(36, 95, 115, 0.28));
}
.jk-component-state.is-error {
  border-color: var(--jk-color-risk, #8f342f);
}
.jk-component-state.is-loading {
  border-style: dashed;
}
.jk-component-state.is-disabled {
  color: var(--jk-color-disabled, #8a8f93);
}
.jk-state-label,
.jk-pattern-header span,
.jk-specimen-map-row > span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}
.jk-sample-button,
.jk-sample-action-group button,
.jk-sample-menu button,
.jk-sample-dialog button,
.jk-sample-alert button,
.jk-sample-card button,
.jk-sample-status button,
.jk-pattern-controls button {
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, #ffffff);
  color: var(--jk-color-text, var(--ink));
  font: inherit;
  font-weight: 850;
}
.jk-sample-button,
.jk-pattern-controls button.is-primary {
  border-color: var(--jk-color-focus, #245f73);
  background: var(--jk-color-focus, #245f73);
  color: #ffffff;
}
.jk-sample-button {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  justify-content: center;
}
.jk-sample-action-group,
.jk-sample-toggle,
.jk-sample-alert,
.jk-sample-status,
.jk-pattern-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.jk-sample-field,
.jk-sample-choice-group,
.jk-sample-tabs,
.jk-sample-menu,
.jk-sample-dialog,
.jk-sample-panel,
.jk-sample-card {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.jk-sample-field input,
.jk-sample-field textarea,
.jk-sample-field select {
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, #ffffff);
  color: var(--jk-color-text, var(--ink));
  font: inherit;
}
.jk-sample-field textarea {
  min-height: 70px;
  resize: vertical;
}
.jk-sample-field strong,
.jk-sample-choice-group span {
  color: var(--jk-color-risk, #8f342f);
}
.jk-sample-choice-group {
  margin: 0;
  padding: 10px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
}
.jk-sample-toggle [data-component-anatomy="switch-control"] {
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: var(--jk-color-success, #2e6b48);
}
.jk-sample-tabs [role="tablist"] {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.jk-sample-tabs [role="tab"],
.jk-sample-menu li {
  padding: 6px 8px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, #ffffff);
}
.jk-sample-tabs [aria-selected="true"] {
  border-color: var(--jk-color-focus, #245f73);
  color: var(--jk-color-focus, #245f73);
  font-weight: 900;
}
.jk-sample-menu ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.jk-sample-dialog,
.jk-sample-panel,
.jk-sample-card,
.jk-sample-status,
.jk-sample-alert {
  padding: 10px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, #ffffff);
}
.jk-sample-dialog h4,
.jk-sample-panel h4,
.jk-sample-card h4,
.jk-sample-dialog p,
.jk-sample-panel p,
.jk-sample-card p,
.jk-sample-status span {
  margin: 0;
}
.jk-sample-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--jk-color-surface, #ffffff);
  font-size: 13px;
}
.jk-sample-table caption,
.jk-sample-table th,
.jk-sample-table td {
  padding: 6px 8px;
  border: 1px solid var(--jk-color-border, var(--line));
  text-align: left;
}
.jk-specimen-map-row {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.jk-pattern-header {
  display: grid;
  gap: 3px;
}
.jk-pattern-header strong {
  font-size: 18px;
}
.jk-pattern-region-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jk-space-3, 0.75rem);
}
.jk-pattern-region-grid section {
  min-width: 0;
  min-height: 92px;
  padding: var(--jk-space-3, 0.75rem);
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, #ffffff);
}
.jk-pattern-region-grid strong,
.jk-pattern-region-grid p,
.jk-pattern-completion {
  margin: 0;
}
.jk-pattern-region-grid p,
.jk-pattern-completion {
  color: var(--jk-color-muted, var(--muted));
}
.jk-pattern-completion {
  padding: 9px 10px;
  border-left: 3px solid var(--jk-color-receipt, #23615f);
  background: rgba(35, 97, 95, 0.08);
}
.token-value-with-swatch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.token-color-swatch {
  display: inline-block;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 1px solid rgba(23, 23, 23, 0.28);
  border-radius: 4px;
  background-color: var(--token-swatch-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.52);
}
.font-specimen {
  display: inline-block;
  min-width: max-content;
}
.font-specimen-heading {
  font-weight: 900;
  font-size: 18px;
}
.font-specimen-label {
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.font-specimen-numeric {
  font-variant-numeric: tabular-nums;
}
.font-specimen-diagnostic {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}
.design-icon-scenario {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px;
}
.design-icon-id {
  display: block;
  width: fit-content;
  max-width: 100%;
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.design-icon-symbol {
  display: grid;
  width: 24px;
  min-height: 24px;
  place-items: center;
  color: inherit;
}
.design-icon-symbol svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.design-system-search {
  display: block;
  margin: 16px 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-search form {
  display: grid;
  gap: 10px;
}
.design-system-search label {
  font-weight: 850;
}
.design-system-search form > div {
  display: flex;
  gap: 8px;
}
.design-system-search input {
  min-width: 0;
  flex: 1;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
}
.design-system-search button {
  min-height: 42px;
  padding: 8px 13px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-weight: 900;
}
.design-icon-index-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  align-items: start;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.design-icon-index-card {
  list-style: none;
}
.design-icon-index-card[hidden] {
  display: none;
}
.examples-page {
  padding-top: clamp(36px, 5vw, 62px);
}
.examples-hero,
.examples-layout {
  max-width: 1220px;
  margin: 0 auto;
}
.examples-hero {
  margin-bottom: clamp(24px, 4vw, 38px);
}
.examples-hero h1 {
  margin-bottom: 12px;
}
.examples-hero .lede {
  max-width: 820px;
}
.examples-layout {
  min-width: 0;
}
.examples-main {
  min-width: 0;
}
.examples-controls {
  display: flex;
  align-items: end;
  gap: 12px;
  margin-bottom: 24px;
}
.model-ui-use-case-select {
  appearance: none;
  -webkit-appearance: none;
  width: min(100%, 260px);
  min-height: 42px;
  padding: 8px 38px 8px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background-color: var(--panel);
  background-image: url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3.5 5.25L7 8.75L10.5 5.25' fill='none' stroke='%230f3f51' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-position: right 14px center;
  background-repeat: no-repeat;
  background-size: 14px 14px;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  line-height: 1.2;
}
.example-preview-focus {
  display: grid;
  gap: 24px;
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
  grid-template-rows: 1fr auto;
  gap: 18px;
  min-width: 0;
  min-height: 0;
  padding: clamp(56px, 5vw, 68px) clamp(18px, 2.4vw, 28px) clamp(18px, 2.4vw, 28px);
  overflow-y: auto;
  border-left: 1px solid var(--line);
}
.example-gallery-modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  font-size: 26px;
  line-height: 1;
}
.example-gallery-modal-close:hover,
.example-gallery-modal-close:focus-visible {
  color: var(--accent-strong);
}
.example-gallery-modal-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
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
  font-family: var(--eval-serif);
  font-size: 17px;
  line-height: 1.58;
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
.report-page {
  padding-top: clamp(36px, 5vw, 62px);
  font-family: var(--eval-serif);
  font-size: 17px;
  line-height: 1.58;
}
.report-heading,
.report-shell {
  max-width: 1180px;
  margin: 0 auto;
}
.report-heading {
  text-align: center;
}
.report-heading h1 {
  max-width: 18ch;
  margin-left: auto;
  margin-right: auto;
  font-size: clamp(38px, 5vw, 64px);
}
.report-heading .lede {
  margin-left: auto;
  margin-right: auto;
}
.report-shell {
  display: grid;
  grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: start;
  margin-top: clamp(34px, 5vw, 64px);
}
.report-toc {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}
.report-toc a {
  color: var(--muted);
  font-size: 14px;
  font-weight: 750;
  text-decoration: none;
}
.report-toc a:hover,
.report-toc a:focus-visible {
  color: var(--accent-strong);
}
.report-article {
  min-width: 0;
}
.report-article > section {
  padding: clamp(28px, 5vw, 52px) 0;
  border-top: 1px solid var(--line);
}
.report-article > section:first-child {
  border-top: 0;
  padding-top: 0;
}
.report-article p,
.report-article ul,
.report-article ol {
  max-width: 760px;
}
.report-video {
  position: relative;
  width: min(100%, 1040px);
  margin: clamp(24px, 4vw, 42px) auto;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid rgba(19, 63, 78, 0.24);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(36, 95, 115, 0.16), rgba(46, 107, 72, 0.10)),
    #f3f1ea;
}
.report-video-hero {
  box-shadow: 0 18px 46px rgba(23, 23, 23, 0.12);
}
.report-video-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  opacity: 0.46;
}
.report-video-grid span {
  border-right: 1px solid rgba(19, 63, 78, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0)),
    repeating-linear-gradient(90deg, rgba(19, 63, 78, 0.12) 0 1px, transparent 1px 18px);
}
.report-video-poster {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
}
.report-video-poster:disabled {
  cursor: default;
}
.report-video-play {
  display: grid;
  width: clamp(48px, 6vw, 68px);
  height: clamp(48px, 6vw, 68px);
  place-items: center;
  border-radius: 999px;
  background: rgba(19, 63, 78, 0.92);
}
.report-video-play::before {
  content: "";
  width: 0;
  height: 0;
  margin-left: 4px;
  border-top: 11px solid transparent;
  border-bottom: 11px solid transparent;
  border-left: 17px solid #fff;
}
.report-video-copy {
  display: grid;
  gap: 4px;
  max-width: min(560px, calc(100% - 40px));
  padding: 12px 14px;
  border: 1px solid rgba(19, 63, 78, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  text-align: center;
}
.report-video-copy strong {
  font-size: clamp(17px, 2vw, 22px);
}
.report-video-copy small {
  color: var(--muted);
  font-size: 13px;
  font-weight: 750;
}
.report-capability-grid,
.report-use-case-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.report-use-case-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.report-capability-grid article,
.report-use-case-grid article {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.report-capability-grid h3,
.report-use-case-grid h3 {
  margin-bottom: 7px;
}
.report-capability-grid p,
.report-use-case-grid p {
  margin-bottom: 0;
}
.report-system-figure,
.report-chart,
.report-small-multiples {
  margin: 22px 0 0;
  padding: clamp(16px, 3vw, 24px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.report-score-chart {
  overflow: hidden;
}
.report-system-figure figcaption,
.report-chart figcaption,
.report-small-multiples figcaption {
  margin-bottom: 14px;
  color: var(--muted);
  font-weight: 800;
}
.report-system-figure ol {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  max-width: none;
  padding: 0;
  list-style: none;
}
.report-system-figure li {
  position: relative;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
}
.report-system-figure li::after {
  content: "->";
  position: absolute;
  top: 14px;
  right: -10px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 900;
}
.report-system-figure li:last-child::after {
  content: "loop";
  right: 10px;
  width: auto;
  padding: 0 6px;
}
.report-system-figure strong,
.report-system-figure span {
  display: block;
}
.report-system-figure span {
  margin-top: 6px;
  color: var(--muted);
  font-size: 14px;
}
.report-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.report-summary div {
  min-width: 0;
  padding: 14px;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.report-summary div:nth-child(4n) {
  border-right: 0;
}
.report-summary div:nth-last-child(-n + 4) {
  border-bottom: 0;
}
.report-summary dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.report-summary dd {
  margin: 4px 0 0;
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 900;
  line-height: 1.05;
  overflow-wrap: anywhere;
}
.report-summary p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.report-chart svg {
  display: block;
  width: 100%;
  height: auto;
}
.report-chart-grid line {
  stroke: rgba(23, 23, 23, 0.10);
}
.report-chart-grid text,
.report-score-label {
  fill: var(--muted);
  font-size: 13px;
  font-weight: 750;
}
.report-chart-axis {
  stroke: var(--ink);
  stroke-width: 1.4;
}
.report-score-bar {
  rx: 5;
}
.report-score-bar-baseline {
  fill: #8a5a16;
}
.report-score-bar-guided {
  fill: #245f73;
}
.report-score-delta {
  fill: var(--accent-strong);
  font-size: 14px;
  font-weight: 900;
}
.report-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 800;
}
.report-chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.report-chart-legend i {
  display: block;
  width: 13px;
  height: 13px;
  border-radius: 3px;
}
.legend-baseline {
  background: #8a5a16;
}
.legend-guided {
  background: #245f73;
}
.report-small-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.report-small-grid article {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfaf6;
}
.report-small-grid h3 {
  margin-bottom: 10px;
}
.report-micro-bars {
  display: grid;
  gap: 10px;
}
.report-micro-bars div {
  display: grid;
  gap: 4px;
}
.report-micro-bars span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.report-micro-bars strong {
  font-size: 14px;
}
.report-micro-bars i {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 4px;
  border-radius: 6px;
  background: #eee9dc;
}
.report-micro-bars b {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: #8a5a16;
}
.report-micro-bars b.guided {
  background: #245f73;
}
.report-table-shell,
.report-context-matrix-shell {
  max-width: 100%;
  margin-top: 20px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.report-benchmark-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}
.report-benchmark-table th,
.report-benchmark-table td {
  padding: 11px 12px;
  border-top: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.report-benchmark-table thead th {
  border-top: 0;
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
}
.report-benchmark-table td,
.report-benchmark-table th {
  overflow-wrap: anywhere;
}
.report-context-matrix {
  display: grid;
  grid-template-columns: minmax(180px, 0.75fr) repeat(4, minmax(170px, 1fr));
  min-width: 940px;
}
.report-context-axis,
.report-context-column,
.report-context-row,
.report-context-cell {
  min-width: 0;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}
.report-context-axis,
.report-context-column {
  padding: 10px 12px;
  border-top: 0;
  background: #f3f0e7;
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.report-context-axis,
.report-context-row {
  border-left: 0;
}
.report-context-row {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 12px;
  background: #fbfaf6;
}
.report-context-row span {
  color: var(--muted);
  font-size: 13px;
}
.report-context-cell {
  display: grid;
  gap: 8px;
  padding: 10px;
  color: var(--ink);
  text-decoration: none;
}
.report-context-cell:hover,
.report-context-cell:focus-visible {
  background: rgba(36, 95, 115, 0.05);
}
.report-context-cell img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: top left;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}
.report-context-cell span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
}
.report-run-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
@media (max-width: 1120px) and (min-width: 768px) {
  .surfaces-navigation-left {
    gap: 28px;
  }
  .surfaces-navigation-sections {
    gap: 20px;
  }
  .doc-layout {
    grid-template-columns: minmax(160px, 200px) minmax(0, 1fr);
    gap: 24px;
  }
}
@media (max-width: 1120px) {
  .design-system-layout {
    display: block;
  }
  .design-system-section-menu {
    display: block;
  }
  .design-system-nav {
    display: none;
  }
  .design-system-content {
    grid-column: auto;
  }
}
@media (max-width: 820px) {
  .hero {
    align-items: start;
  }
  .hero,
  .doc-layout {
    display: block;
  }
  .proof-panel,
  .doc-nav {
    margin-top: 18px;
  }
  .doc-nav {
    position: static;
  }
  .design-system-content {
    grid-column: auto;
  }
  .homepage-preview .evaluation-panel {
    grid-template-columns: 1fr;
  }
  .homepage-preview .evaluation-step {
    border-top: 1px solid var(--line);
    border-left: 0;
  }
  .homepage-preview .evaluation-step:first-child {
    border-top: 0;
  }
  .failure-grid {
    grid-template-columns: 1fr;
  }
  .failure-grid article {
    padding: 0 0 16px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .failure-grid article:last-child {
    padding-bottom: 0;
    border-bottom: 0;
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
  .value-case,
  .example-gallery-modal-panel {
    grid-template-columns: 1fr;
  }
  .value-screenshot-pair {
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
    grid-template-rows: 1fr auto;
    padding: clamp(18px, 2.4vw, 28px);
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
  .report-shell {
    grid-template-columns: 1fr;
  }
  .report-toc {
    position: static;
  }
  .report-capability-grid,
  .report-use-case-grid,
  .report-system-figure ol,
  .report-small-grid,
  .report-summary {
    grid-template-columns: 1fr;
  }
  .report-system-figure li::after {
    top: auto;
    right: 12px;
    bottom: -10px;
  }
  .report-system-figure li:last-child::after {
    bottom: 10px;
  }
  .report-summary div,
  .report-summary div:nth-child(4n),
  .report-summary div:nth-last-child(-n + 4) {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .report-summary div:last-child {
    border-bottom: 0;
  }
  .design-system-metrics,
  .design-system-foundation-list,
  .design-system-review-grid,
  .design-system-example-grid,
  .design-system-role-grid,
  .design-system-specimen-body,
  .jk-component-state-grid,
  .jk-pattern-region-grid,
  .design-icon-scenario-grid,
  .design-icon-index-list {
    grid-template-columns: 1fr;
  }
  .design-system-specimen-preview-frame {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .design-system-metrics div {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .design-system-metrics div:last-child {
    border-bottom: 0;
  }
}
@media (max-width: 767px) {
  .surfaces-navigation-inner {
    padding-left: 16px;
    padding-right: 16px;
  }
  .surfaces-navigation-left {
    gap: 12px;
  }
  .surfaces-navigation-sections {
    display: none;
  }
  .surfaces-primary-menu {
    display: block;
  }
  .surfaces-primary-menu-list {
    position: fixed;
    top: 64px;
    left: 16px;
    right: 16px;
    width: auto;
    max-width: none;
  }
}
@media (max-width: 359px) {
  .surfaces-primary-menu-button span {
    display: none;
  }
}
`;

function homepage() {
  return page(
    "JudgmentKit",
    `
    <section class="hero homepage-hero">
      <div>
        <p class="eyebrow">Activity-first judgment for AI agents</p>
        <h1>Judgment before generation.</h1>
        <p class="lede">JudgmentKit catches implementation-shaped UI before it ships, then gives the agent a repair path grounded in the user's real work.</p>
        <div class="hero-actions" aria-label="Primary proof paths">
          <a class="hero-action hero-action-primary" data-hero-action="primary" href="/value/">What it prevents</a>
          <a class="hero-action hero-action-secondary" data-hero-action="secondary" href="/examples/">Examples</a>
          <a class="hero-action hero-action-secondary" data-hero-action="evidence" href="/evals/">Evals</a>
        </div>
      </div>
    </section>
    <section class="section homepage-preview" aria-labelledby="repair-preview-title">
      <div>
        <p class="eyebrow">Failure-to-repair preview</p>
        <h2 id="repair-preview-title">First drafts should start from the work, not from available internals.</h2>
      </div>
      <div class="proof-panel evaluation-panel" aria-label="JudgmentKit repair preview">
        <div class="evaluation-step">
          <span>Failure</span>
          <strong>The screen follows the system, not the work.</strong>
          <p>Generated interfaces often mirror available internals instead of the activity a person is trying to complete.</p>
        </div>
        <div class="evaluation-step">
          <span>Judgment</span>
          <strong>The activity is named before the UI.</strong>
          <p>JudgmentKit asks what the user is doing, what decision matters, what evidence belongs nearby, and what should stay diagnostic.</p>
        </div>
        <div class="evaluation-step">
          <span>Repair</span>
          <strong>The agent gets a ready handoff.</strong>
          <p>The next generation pass receives product-language responsibilities, approved states, and a disclosure boundary.</p>
        </div>
        <div class="evaluation-step evaluation-step-status">
          <span>Result</span>
          <strong>Better first drafts. Less cleanup theater.</strong>
          <p>Use the proof paths below to inspect the contract loop before installing anything.</p>
        </div>
      </div>
    </section>
    <section class="section homepage-failure" aria-labelledby="failure-title">
      <div>
        <p class="eyebrow">Failure recognition</p>
        <h2 id="failure-title">The problem is not ugly UI. It is the wrong concept of the work.</h2>
      </div>
      <div class="failure-grid">
        <article>
          <h3>Before judgment</h3>
          <p>The agent sees available structure and turns it into labels, navigation, and actions. The user has to translate the system back into their own work.</p>
        </article>
        <article>
          <h3>With JudgmentKit</h3>
          <p>The agent must name the activity, participant, decision, outcome, and disclosure boundary before it treats a workflow as ready.</p>
        </article>
        <article>
          <h3>After repair</h3>
          <p>The interface can be generated from a product-language handoff that makes evidence, decisions, and completion states explicit.</p>
        </article>
      </div>
    </section>
    <section class="section proof-paths" aria-labelledby="proof-paths-title">
      <div>
        <p class="eyebrow">Proof paths</p>
        <h2 id="proof-paths-title">Inspect the loop from product value to repeatable evidence.</h2>
      </div>
      <div class="route-grid route-grid-proof">
        <article>
          <h3>What it prevents</h3>
          <p>See before-and-after cases for implementation-language leakage, unsafe action boundaries, and missing evidence.</p>
          <a class="pill-link" href="/value/">Open value examples</a>
        </article>
        <article>
          <h3>Replayable examples</h3>
          <p>Review generated artifacts, comparison harnesses, and first-use fixtures that show the repair loop in context.</p>
          <a class="pill-link" href="/examples/">Open examples</a>
        </article>
        <article>
          <h3>Evaluation evidence</h3>
          <p>Read the bounded reports and model matrices. The reports are audit material, not broad benchmark claims.</p>
          <a class="pill-link" href="/evals/">Open eval evidence</a>
        </article>
      </div>
    </section>
    <section class="section adoption-paths" aria-labelledby="adoption-title">
      <div>
        <p class="eyebrow">Adoption paths</p>
        <h2 id="adoption-title">Choose the next surface for the work you are doing.</h2>
      </div>
      <div class="route-grid route-grid-adoption">
        <article>
          <h3>Read the docs</h3>
          <p>Use the setup and planning guide when you are ready to connect JudgmentKit to an agent workflow.</p>
          <a class="pill-link" href="/docs/">Open docs</a>
        </article>
        <article>
          <h3>Review the design-system assets</h3>
          <p>Inspect token roles, typography, icons, component contracts, patterns, and accessibility policy.</p>
          <a class="pill-link" href="/design-system/">Open design system</a>
        </article>
        <article>
          <h3>Start installation</h3>
          <p>Go straight to the hosted installer when the product fit and proof are clear enough.</p>
          <a class="pill-link" href="/install">Open install route</a>
        </article>
      </div>
    </section>
  `,
    {
      description:
        "JudgmentKit helps AI agents review activity, workflow, disclosure, and handoff quality before generating product UI.",
      path: "/",
    },
  );
}

async function buildValueEvidenceLinks() {
  const links = [
    {
      label: "Public evaluation report",
      href: "/evals/judgmentkit-mcp/",
    },
  ];
  const mcpPilotCatalog = await readJsonIfExists("evals/reports/mcp-pilot/index.json");
  const latestPilotRun = mcpPilotCatalog?.latest;

  if (latestPilotRun?.html_report) {
    links.push({
      label: "Latest MCP pilot report",
      href: `/evals/mcp-pilot/${latestPilotRun.html_report}`,
    });
  } else {
    links.push({
      label: "MCP pilot reports",
      href: "/evals/mcp-pilot/",
    });
  }

  if (latestPilotRun?.run_path) {
    const latestLlmEvidencePath = path.join(
      "evals/reports/mcp-pilot",
      latestPilotRun.run_path,
      "mcp-pilot-llm-evidence.md",
    );

    try {
      await fs.access(path.join(ROOT, latestLlmEvidencePath));
      links.push({
        label: "Latest LLM evidence",
        href: `/evals/mcp-pilot/${latestPilotRun.run_path}/mcp-pilot-llm-evidence.md`,
      });
    } catch {
      // The report is still useful when optional LLM evidence is absent.
    }
  }

  const milestoneProofPath =
    "evals/reports/mcp-pilot/2026-06-15/mcp-0.2.0/run-001/mcp-pilot-evidence-packet.md";

  try {
    await fs.access(path.join(ROOT, milestoneProofPath));
    links.push({
      label: "Milestone proof packet",
      href: "/evals/mcp-pilot/2026-06-15/mcp-0.2.0/run-001/mcp-pilot-evidence-packet.md",
    });
  } catch {
    // Keep the public page buildable even when local proof packets are not present.
  }

  links.push({
    label: "One-shot demo",
    href: "/examples/one-shot-demo.html",
  });

  return links;
}

function renderValueEvidenceLinks(links) {
  return links
    .map((link) => `<a class="pill-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
    .join("\n          ");
}

function defaultVisualTokenAdapter() {
  return createUiImplementationContract().implementation_contract.visual_token_adapter;
}

function defaultDesignSystemContract() {
  return createUiImplementationContract().implementation_contract
    .default_ai_native_design_system;
}

function defaultAccessibilityPolicy() {
  return createUiImplementationContract().implementation_contract.accessibility_policy;
}

function stripIconScenarioForExport(scenario) {
  const { inline_svg: _inlineSvg, ...exportedScenario } = scenario;
  return exportedScenario;
}

function markdownList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function markdownRoleList(entries, renderDetail) {
  return entries
    .map((entry) => `- \`${entry.role}\`: ${renderDetail(entry)}`)
    .join("\n");
}

function cssCustomPropertyBlock(properties) {
  return `:root {\n${properties
    .map((entry) => `  ${entry.name}: ${entry.value};`)
    .join("\n")}\n}`;
}

function renderCssCustomPropertyValue(row) {
  const value = escapeHtml(row.value);
  if (row.family !== "color") {
    return `<code>${value}</code>`;
  }

  const name = escapeHtml(row.name);
  return `<span class="token-value-with-swatch">
                    <span class="token-color-swatch" data-token-swatch="${name}" style="--token-swatch-color: ${value};" aria-label="${name} color swatch: ${value}" role="img"></span>
                    <code>${value}</code>
                  </span>`;
}

function cssCustomPropertyStyle(properties) {
  return properties
    .map((entry) => `${entry.name}: ${entry.value};`)
    .join(" ");
}

function attrSelector(name, value) {
  return `[${name}="${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"]`;
}

function specimenId(type, contractId) {
  return `${type}.${contractId}`;
}

function specimenAnchor(contractId) {
  return slugId(contractId);
}

function normalizeToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function componentStateClass(state) {
  const normalized = normalizeToken(state);
  if (normalized === "disabled") return "is-disabled";
  if (normalized === "error") return "is-error";
  if (normalized === "loading") return "is-loading";
  if (normalized === "focus-visible") return "is-focus-visible";
  if (normalized === "empty") return "is-empty";
  return "is-ready";
}

function stateLabel(state) {
  return state.replaceAll("-", " ");
}

function renderComponentStatePreview(contract, state) {
  const id = contract.id;
  const label = contract.label;
  const stateSlug = slugId(state);
  const stateClass = componentStateClass(state);
  const disabled = state === "disabled";
  const busy = state === "loading";
  const invalid = state === "error";
  const empty = state === "empty";
  const focus = state === "focus-visible";
  const disabledAttr = disabled ? " disabled aria-disabled=\"true\"" : "";
  const busyAttr = busy ? " aria-busy=\"true\"" : "";
  const invalidAttr = invalid ? " aria-invalid=\"true\"" : "";
  const focusAttr = focus ? " data-focus-visible=\"true\"" : "";
  const stateAttrs = `class="jk-component-state ${stateClass}" data-component-state="${escapeHtml(state)}"`;
  const stateHeading = `<span class="jk-state-label">${escapeHtml(stateLabel(state))}</span>`;
  const sampleId = `${slugId(id)}-${stateSlug}`;
  const valueText = empty ? "" : "Policy review";
  const helpText = invalid
    ? "Add a reason before continuing."
    : disabled
      ? "Unavailable until evidence is complete."
      : busy
        ? "Saving the current decision."
        : "Visible helper text stays with the control.";

  let body;
  switch (id) {
    case "action_button":
      body = `<button class="jk-sample-button"${disabledAttr}${busyAttr}${focusAttr}>
                <span data-component-anatomy="optional-icon" aria-hidden="true">ok</span>
                <span data-component-anatomy="visible-label">${busy ? "Saving decision" : "Approve refund"}</span>
                <span data-component-anatomy="state-affordance">${escapeHtml(stateLabel(state))}</span>
              </button>`;
      break;
    case "action_group":
      body = `<div class="jk-sample-action-group" role="group" aria-label="Refund decision actions"${focusAttr}>
                <span data-component-anatomy="group-label-or-context">Case action</span>
                <button data-component-anatomy="primary-action"${disabledAttr}>Approve</button>
                <button data-component-anatomy="secondary-actions"${disabledAttr}>Return</button>
              </div>`;
      break;
    case "form_field":
    case "text_field":
      body = `<label class="jk-sample-field" for="${escapeHtml(sampleId)}">
                <span data-component-anatomy="label">Reason</span>
                <input id="${escapeHtml(sampleId)}" data-component-anatomy="${id === "form_field" ? "control" : "input"}" value="${escapeHtml(valueText)}" placeholder="Add reason"${disabledAttr}${invalidAttr}${focusAttr}>
                <span data-component-anatomy="help-text">${escapeHtml(helpText)}</span>
                ${invalid ? `<strong data-component-anatomy="error-text">Reason is required.</strong>` : ""}
              </label>`;
      break;
    case "text_area":
      body = `<label class="jk-sample-field" for="${escapeHtml(sampleId)}">
                <span data-component-anatomy="label">Handoff note</span>
                <textarea id="${escapeHtml(sampleId)}" data-component-anatomy="multi-line-control"${disabledAttr}${invalidAttr}${focusAttr}>${empty ? "" : "Customer requested policy review after missing receipt evidence."}</textarea>
                <span data-component-anatomy="help-text">${escapeHtml(helpText)}</span>
                ${invalid ? `<strong data-component-anatomy="error-text">Add a handoff note.</strong>` : ""}
              </label>`;
      break;
    case "select_field":
      body = `<label class="jk-sample-field" for="${escapeHtml(sampleId)}">
                <span data-component-anatomy="label">Decision</span>
                <select id="${escapeHtml(sampleId)}" data-component-anatomy="trigger-or-native-select"${disabledAttr}${invalidAttr}${focusAttr}>
                  <option data-component-anatomy="options">${empty ? "Choose decision" : "Approve"}</option>
                  <option>Return for evidence</option>
                </select>
                <span data-component-anatomy="help-or-error-text">${escapeHtml(helpText)}</span>
              </label>`;
      break;
    case "checkbox_group":
      body = `<fieldset class="jk-sample-choice-group"${disabled ? " disabled" : ""}${focusAttr}>
                <legend data-component-anatomy="legend">Evidence present</legend>
                <label data-component-anatomy="checkbox-options"><input type="checkbox" checked${disabledAttr}> Receipt</label>
                <label data-component-anatomy="checkbox-options"><input type="checkbox"${disabledAttr}> Manager approval</label>
                <span data-component-anatomy="help-or-error-text">${invalid ? "Select at least one evidence source." : "Choose all evidence sources."}</span>
              </fieldset>`;
      break;
    case "radio_group":
      body = `<fieldset class="jk-sample-choice-group"${disabled ? " disabled" : ""}${focusAttr}>
                <legend data-component-anatomy="legend">Outcome</legend>
                <label data-component-anatomy="radio-options"><input type="radio" name="${escapeHtml(sampleId)}" checked${disabledAttr}> Approve</label>
                <label data-component-anatomy="radio-options"><input type="radio" name="${escapeHtml(sampleId)}"${disabledAttr}> Return</label>
                <span data-component-anatomy="help-or-error-text">${invalid ? "Choose one outcome." : "Select one decision."}</span>
              </fieldset>`;
      break;
    case "toggle":
      body = `<button class="jk-sample-toggle" role="switch" aria-checked="${disabled ? "false" : "true"}"${disabledAttr}${focusAttr}>
                <span data-component-anatomy="switch-control" aria-hidden="true"></span>
                <span data-component-anatomy="visible-label">Require approval</span>
                <strong data-component-anatomy="current-state-text">${disabled ? "Off" : "On"}</strong>
              </button>`;
      break;
    case "tabs":
      body = `<div class="jk-sample-tabs"${focusAttr}>
                <div role="tablist" data-component-anatomy="tab-list" aria-label="Case evidence">
                  <button role="tab" aria-selected="true" data-component-anatomy="active-tab tabs"${disabledAttr}>Evidence</button>
                  <button role="tab" data-component-anatomy="tabs"${disabledAttr}>History</button>
                </div>
                <section role="tabpanel" data-component-anatomy="tab-panels">Receipt and approval evidence.</section>
              </div>`;
      break;
    case "menu":
      body = `<div class="jk-sample-menu"${focusAttr}>
                <button data-component-anatomy="trigger"${disabledAttr}>More actions</button>
                <ul role="menu" data-component-anatomy="menu">
                  <li role="menuitem" data-component-anatomy="menu-items">Copy summary</li>
                  <li role="menuitem">Send handoff</li>
                </ul>
                <span data-component-anatomy="dismiss-behavior">Dismiss with Escape or outside click.</span>
              </div>`;
      break;
    case "dialog":
      body = `<section class="jk-sample-dialog" role="dialog" aria-modal="false" aria-labelledby="${escapeHtml(sampleId)}-title"${busyAttr}${focusAttr}>
                <h4 id="${escapeHtml(sampleId)}-title" data-component-anatomy="title">Confirm approval</h4>
                <p data-component-anatomy="body">${invalid ? "Resolve the missing reason before approval." : "This records the refund decision and receipt."}</p>
                <div>
                  <button data-component-anatomy="dismiss-action">Cancel</button>
                  <button data-component-anatomy="primary-action"${busy ? " aria-busy=\"true\"" : ""}>Confirm</button>
                </div>
              </section>`;
      break;
    case "alert":
      body = `<div class="jk-sample-alert" role="${invalid ? "alert" : "status"}"${focusAttr}>
                <span data-component-anatomy="status-indicator" aria-hidden="true">!</span>
                <p data-component-anatomy="message">${invalid ? "Receipt is missing." : "Case is ready for review."}</p>
                <button data-component-anatomy="optional-action">View evidence</button>
              </div>`;
      break;
    case "table":
      body = `<table class="jk-sample-table"${busyAttr}${focusAttr}>
                <caption data-component-anatomy="caption-or-heading">Escalation queue</caption>
                <thead><tr data-component-anatomy="headers"><th>Case</th><th>Status</th></tr></thead>
                <tbody data-component-anatomy="rows">
                  <tr><td data-component-anatomy="cells">${empty ? "No cases" : "RF-1842"}</td><td>${invalid ? "Needs repair" : busy ? "Loading" : "Ready"}</td></tr>
                </tbody>
                <tfoot><tr><td colspan="2" data-component-anatomy="empty-state">${empty ? "No work waiting." : "1 case shown."}</td></tr></tfoot>
              </table>`;
      break;
    case "panel":
      body = `<section class="jk-sample-panel"${busyAttr}>
                <h4 data-component-anatomy="heading">Evidence</h4>
                <p data-component-anatomy="content-region">${invalid ? "Evidence conflict needs review." : busy ? "Loading evidence." : "Receipt, policy, and customer note are grouped here."}</p>
                <button data-component-anatomy="optional-actions">Open detail</button>
              </section>`;
      break;
    case "card":
      body = `<article class="jk-sample-card"${disabled ? " aria-disabled=\"true\"" : ""}${focusAttr}>
                <h4 data-component-anatomy="item-title">Refund RF-1842</h4>
                <p data-component-anatomy="summary">Policy exception with receipt evidence.</p>
                <span data-component-anatomy="metadata">Updated 4 min ago</span>
                <button data-component-anatomy="optional-action"${disabledAttr}>Review</button>
              </article>`;
      break;
    case "status_message":
      body = `<div class="jk-sample-status" role="${invalid ? "alert" : "status"}"${busyAttr}>
                <strong data-component-anatomy="severity-or-result">${invalid ? "Needs repair" : busy ? "Saving" : "Ready"}</strong>
                <span data-component-anatomy="status-text">${invalid ? "Add missing evidence before handoff." : "Decision can be handed off."}</span>
                <button data-component-anatomy="optional-next-action">Continue</button>
              </div>`;
      break;
    default:
      body = `<div class="jk-sample-panel">
                <h4>${escapeHtml(label)}</h4>
                <p>${escapeHtml(contract.purpose)}</p>
              </div>`;
  }

  return `<div ${stateAttrs}>
            ${stateHeading}
            ${body}
          </div>`;
}

function renderSpecimenEvidenceChips(items, attrName, className) {
  return `<ul class="${className}">
            ${items
              .map(
                (item) =>
                  `<li ${attrName}="${escapeHtml(slugId(item))}">${escapeHtml(item)}</li>`,
              )
              .join("\n            ")}
          </ul>`;
}

function renderComponentSpecimenPreview(contract, context) {
  const id = specimenId("component", contract.id);
  return `<div class="jk-specimen-preview jk-component-preview" data-specimen-id="${escapeHtml(id)}" data-contract-id="${escapeHtml(contract.id)}" data-contract-hash="${escapeHtml(context.contract_hash)}" style="${escapeHtml(context.token_style)}">
            <div class="jk-component-state-grid">
              ${(contract.required_states ?? [])
                .map((state) => renderComponentStatePreview(contract, state))
                .join("\n              ")}
            </div>
            <div class="jk-specimen-map-row" aria-label="${escapeHtml(contract.label)} anatomy">
              <span>Anatomy</span>
              ${renderSpecimenEvidenceChips(contract.anatomy ?? [], "data-component-anatomy", "jk-specimen-chip-list")}
            </div>
            <div class="jk-specimen-map-row" aria-label="${escapeHtml(contract.label)} token roles">
              <span>Tokens</span>
              ${renderSpecimenEvidenceChips(contract.token_bindings ?? [], "data-token-role", "jk-specimen-chip-list")}
            </div>
          </div>`;
}

function renderPatternSpecimenPreview(contract, context) {
  const id = specimenId("pattern", contract.id);
  return `<div class="jk-specimen-preview jk-pattern-preview" data-specimen-id="${escapeHtml(id)}" data-contract-id="${escapeHtml(contract.id)}" data-contract-hash="${escapeHtml(context.contract_hash)}" data-surface-type="${escapeHtml(contract.surface_type)}" style="${escapeHtml(context.token_style)}">
            <header class="jk-pattern-header">
              <span>${escapeHtml(contract.surface_type.replaceAll("_", " "))}</span>
              <strong>${escapeHtml(contract.label)}</strong>
            </header>
            <div class="jk-pattern-region-grid">
              ${(contract.required_regions ?? [])
                .map(
                  (region, index) => `<section data-pattern-region="${escapeHtml(slugId(region))}">
                <strong>${escapeHtml(region)}</strong>
                <p>${escapeHtml(patternRegionCopy(contract, region, index))}</p>
              </section>`,
                )
                .join("\n              ")}
            </div>
            <div class="jk-pattern-controls" aria-label="${escapeHtml(contract.label)} controls">
              ${(contract.expected_controls ?? [])
                .map(
                  (control, index) =>
                    `<button data-pattern-control="${escapeHtml(slugId(control))}"${index === 0 ? ' class="is-primary"' : ""}>${escapeHtml(control)}</button>`,
                )
                .join("\n              ")}
            </div>
            <p class="jk-pattern-completion">${escapeHtml(contract.completion_or_handoff)}</p>
          </div>`;
}

function patternRegionCopy(contract, region, index) {
  const lowerRegion = region.toLowerCase();
  if (lowerRegion.includes("evidence")) return "Visible support for the decision stays adjacent to the work.";
  if (lowerRegion.includes("risk")) return "Risk is named in domain terms before action.";
  if (lowerRegion.includes("decision")) return "The next action is bounded by the review context.";
  if (lowerRegion.includes("status")) return "Current state is summarized without hiding exceptions.";
  if (lowerRegion.includes("configuration")) return "Settings are visible because setup is the activity.";
  if (lowerRegion.includes("composer")) return "Message creation stays close to context and status.";
  if (lowerRegion.includes("offer")) return "The main promise is stated before supporting proof.";
  return `${contract.label} region ${index + 1} supports ${contract.purpose.toLowerCase()}`;
}

function buildSpecimenContext(adapter, system) {
  return {
    token_hash: hashCanonical(adapter.css_custom_properties),
    icon_catalog_hash: hashCanonical(adapter.icon_catalog),
    design_system_contract_hash: hashCanonical(system),
    token_style: cssCustomPropertyStyle(adapter.css_custom_properties),
  };
}

function buildComponentSpecimens(contracts, context) {
  return contracts.map((contract) => {
    const id = specimenId("component", contract.id);
    const contractHash = hashCanonical(contract);
    const renderedHtml = renderComponentSpecimenPreview(contract, {
      ...context,
      contract_hash: contractHash,
    });
    const states = contract.required_states ?? [];
    const anatomy = contract.anatomy ?? [];
    const tokenBindings = contract.token_bindings ?? [];

    return {
      id,
      type: "component",
      anchor: `#${specimenAnchor(contract.id)}`,
      contract_id: contract.id,
      label: contract.label,
      purpose: contract.purpose,
      contract_hash: contractHash,
      token_hash: context.token_hash,
      icon_catalog_hash: context.icon_catalog_hash,
      renderer_id: DESIGN_SYSTEM_SPECIMEN_RENDERER.id,
      renderer_version: DESIGN_SYSTEM_SPECIMEN_RENDERER.version,
      output_hash: hashText(renderedHtml),
      selectors: {
        root: attrSelector("data-specimen-id", id),
        states: Object.fromEntries(
          states.map((state) => [
            state,
            `${attrSelector("data-specimen-id", id)} ${attrSelector("data-component-state", state)}`,
          ]),
        ),
        anatomy: Object.fromEntries(
          anatomy.map((item) => [
            item,
            `${attrSelector("data-specimen-id", id)} ${attrSelector("data-component-anatomy", slugId(item))}`,
          ]),
        ),
        token_bindings: Object.fromEntries(
          tokenBindings.map((role) => [
            role,
            `${attrSelector("data-specimen-id", id)} ${attrSelector("data-token-role", slugId(role))}`,
          ]),
        ),
      },
      covered_states: states,
      covered_anatomy: anatomy,
      covered_token_bindings: tokenBindings,
      accessibility_checks: contract.accessibility_checks ?? [],
      review_checks: contract.review_checks ?? [],
      rendered_html: renderedHtml,
      contract,
    };
  });
}

function buildPatternSpecimens(contracts, context) {
  return contracts.map((contract) => {
    const id = specimenId("pattern", contract.id);
    const contractHash = hashCanonical(contract);
    const renderedHtml = renderPatternSpecimenPreview(contract, {
      ...context,
      contract_hash: contractHash,
    });
    const regions = contract.required_regions ?? [];
    const controls = contract.expected_controls ?? [];

    return {
      id,
      type: "pattern",
      anchor: `#${specimenAnchor(contract.id)}`,
      contract_id: contract.id,
      label: contract.label,
      surface_type: contract.surface_type,
      purpose: contract.purpose,
      contract_hash: contractHash,
      token_hash: context.token_hash,
      icon_catalog_hash: context.icon_catalog_hash,
      renderer_id: DESIGN_SYSTEM_SPECIMEN_RENDERER.id,
      renderer_version: DESIGN_SYSTEM_SPECIMEN_RENDERER.version,
      output_hash: hashText(renderedHtml),
      selectors: {
        root: attrSelector("data-specimen-id", id),
        regions: Object.fromEntries(
          regions.map((region) => [
            region,
            `${attrSelector("data-specimen-id", id)} ${attrSelector("data-pattern-region", slugId(region))}`,
          ]),
        ),
        controls: Object.fromEntries(
          controls.map((control) => [
            control,
            `${attrSelector("data-specimen-id", id)} ${attrSelector("data-pattern-control", slugId(control))}`,
          ]),
        ),
      },
      covered_regions: regions,
      covered_controls: controls,
      completion_or_handoff: contract.completion_or_handoff,
      disclosure_boundary: contract.disclosure_boundary,
      accessibility_expectations: contract.accessibility_expectations ?? [],
      rendered_html: renderedHtml,
      contract,
    };
  });
}

function exportSpecimen(specimen) {
  const { contract: _contract, ...exported } = specimen;
  return exported;
}

function designSystemSpecimenProvenance(model) {
  return {
    source: model.system.id,
    renderer: DESIGN_SYSTEM_SPECIMEN_RENDERER,
    generated_from: model.generated_from,
    proof_scope:
      "Hashes and selectors prove specimen provenance and drift control; they do not replace activity, workflow, disclosure, accessibility, static, or browser-QA evidence.",
    design_system_contract_hash: model.specimen_hashes.design_system_contract_hash,
    token_hash: model.specimen_hashes.token_hash,
    icon_catalog_hash: model.specimen_hashes.icon_catalog_hash,
    component_specimens: model.component_specimens.map((specimen) => ({
      id: specimen.id,
      contract_id: specimen.contract_id,
      contract_hash: specimen.contract_hash,
      output_hash: specimen.output_hash,
      covered_states: specimen.covered_states,
    })),
    pattern_specimens: model.pattern_specimens.map((specimen) => ({
      id: specimen.id,
      contract_id: specimen.contract_id,
      surface_type: specimen.surface_type,
      contract_hash: specimen.contract_hash,
      output_hash: specimen.output_hash,
      covered_regions: specimen.covered_regions,
      covered_controls: specimen.covered_controls,
    })),
  };
}

function designSystemExports(model) {
  return {
    manifest: {
      section: "JudgmentKit Design System",
      purpose: "Human reference for foundation assets.",
      routes: model.pages.map((pageEntry) => ({
        id: pageEntry.id,
        title: pageEntry.title,
        html: pageEntry.path,
        markdown: pageEntry.markdown_path,
      })),
      exports: {
        manifest: "/design-system/manifest.json",
        visual_token_adapter: "/design-system/visual-token-adapter.json",
        component_contracts: "/design-system/component-contracts.json",
        pattern_contracts: "/design-system/pattern-contracts.json",
        component_specimens: "/design-system/component-specimens.json",
        pattern_specimens: "/design-system/pattern-specimens.json",
        specimen_provenance: "/design-system/specimen-provenance.json",
        accessibility_policy: "/design-system/accessibility-policy.json",
        icon_scenarios: "/design-system/icon-scenarios.json",
        llms: "/design-system/llms.txt",
        llms_full: "/design-system/llms-full.txt",
      },
      source: {
        visual_token_adapter_id: model.adapter.id,
        design_system_contract_id: model.system.id,
        lucide: model.adapter.icon_catalog,
      },
      principles: model.principles,
    },
    visualTokenAdapter: model.adapter,
    componentContracts: {
      source: model.system.id,
      contracts: model.component_contracts,
    },
    patternContracts: {
      source: model.system.id,
      contracts: model.pattern_contracts,
    },
    componentSpecimens: {
      source: model.system.id,
      renderer: DESIGN_SYSTEM_SPECIMEN_RENDERER,
      specimens: model.component_specimens.map(exportSpecimen),
    },
    patternSpecimens: {
      source: model.system.id,
      renderer: DESIGN_SYSTEM_SPECIMEN_RENDERER,
      specimens: model.pattern_specimens.map(exportSpecimen),
    },
    specimenProvenance: designSystemSpecimenProvenance(model),
    accessibilityPolicy: model.accessibility_policy,
    iconScenarios: {
      source: {
        library: model.adapter.icon_catalog.library,
        package: model.adapter.icon_catalog.package,
        version: model.adapter.icon_catalog.version,
        icon_count: model.adapter.icon_catalog.icon_count,
      },
      mcp_tools: model.adapter.icon_catalog.mcp_tools,
      scenarios: model.icon_scenarios.map(stripIconScenarioForExport),
    },
  };
}

function buildDesignSystemIconIndex(scenarios) {
  const scenariosByIconId = new Map(
    scenarios.map((scenario) => [scenario.selected_icon_id, scenario]),
  );
  const icons = [];
  let cursor;

  do {
    const pageResult = listIconCatalog({
      limit: 100,
      cursor,
      include_svg: false,
    });
    icons.push(...pageResult.icons);
    cursor = pageResult.next_cursor;
  } while (cursor);

  return icons.map((icon) => ({
    ...(scenariosByIconId.has(icon.id)
      ? {
          scenario_id: scenariosByIconId.get(icon.id).id,
        }
      : {}),
    id: icon.id,
    name: icon.name,
    aliases: icon.aliases ?? [],
    categories: icon.categories ?? [],
    tags: icon.tags ?? [],
    search_terms: icon.search_terms ?? [],
    inline_svg: getIconSvg({ id: icon.id }).inline_svg,
  }));
}

function buildDesignSystemContentModel() {
  const adapter = defaultVisualTokenAdapter();
  const system = defaultDesignSystemContract();
  const accessibilityPolicy = defaultAccessibilityPolicy();
  const componentContracts = system.component_contracts ?? [];
  const patternContracts = system.pattern_contracts ?? [];
  const specimenContext = buildSpecimenContext(adapter, system);
  const componentSpecimens = buildComponentSpecimens(componentContracts, specimenContext);
  const patternSpecimens = buildPatternSpecimens(patternContracts, specimenContext);
  const iconScenarios = buildDesignSystemIconScenarios();
  const iconIndex = buildDesignSystemIconIndex(iconScenarios);
  const pages = [
    {
      id: "overview",
      title: "JudgmentKit Design System",
      nav_label: "Overview",
      path: "/design-system/",
      markdown_path: "/design-system/index.html.md",
      heading: "Foundations",
      eyebrow: "Design system",
      summary:
        "Foundation assets and review contracts for building JudgmentKit interfaces: tokens, typography, icons, components, patterns, and accessibility.",
      sections: ["Foundation assets", "How to review", "Principles"],
      examples: [
        {
          title: "Review a generated interface",
          use: "Start with the task and workflow, then use foundations to check consistency, hierarchy, and meaning.",
          caution: "Do not use visual polish as proof that the interface supports the right work.",
        },
      ],
    },
    {
      id: "tokens",
      title: "JudgmentKit Tokens",
      nav_label: "Tokens",
      path: "/design-system/tokens/",
      markdown_path: "/design-system/tokens/index.html.md",
      heading: "Tokens",
      eyebrow: "Foundations",
      summary:
        "Semantic roles and portable CSS defaults for color, spacing, borders, focus, status, risk, disabled states, and receipts.",
      sections: ["Usage", "Values", "Token roles", "Examples", "Accessibility"],
      examples: [
        {
          title: "Status that has visible meaning",
          use: "Pair status color with text such as Approved, Warning, Returned, or Complete.",
          caution: "Do not rely on color alone for decisions, errors, or progress.",
        },
        {
          title: "Focus that is easy to find",
          use: "Use focus roles for keyboard-visible controls and clear active regions.",
          caution: "Do not remove focus styling to make a layout look cleaner.",
        },
      ],
    },
    {
      id: "fonts",
      title: "JudgmentKit Typography",
      nav_label: "Typography",
      path: "/design-system/fonts/",
      markdown_path: "/design-system/fonts/index.html.md",
      heading: "Typography",
      eyebrow: "Foundations",
      summary:
        "System font roles for readable interface text without remote font files or bundled font assets.",
      sections: ["Usage", "Type roles", "Examples", "Accessibility"],
      examples: [
        {
          title: "Numeric values",
          use: "Use the numeric role for counts, prices, times, and aligned values.",
          caution: "Do not use proportional number rendering where column comparison matters.",
        },
        {
          title: "Diagnostic text",
          use: "Reserve monospace for setup, debugging, auditing, integration, or source inspection screens.",
          caution: "Do not make technical identifiers the primary product vocabulary.",
        },
      ],
    },
    {
      id: "icons",
      title: "JudgmentKit Icons",
      nav_label: "Icons",
      path: "/design-system/icons/",
      markdown_path: "/design-system/icons/index.html.md",
      heading: "Icons",
      eyebrow: "Foundations",
      summary:
        "A complete Lucide icon catalog with one coherent 24px outline style, searchable names, and scenario groupings.",
      sections: ["Usage", "Icon index", "Accessibility", "Source"],
      examples: [],
    },
    {
      id: "components",
      title: "JudgmentKit Components",
      nav_label: "Components",
      path: "/design-system/components/",
      markdown_path: "/design-system/components/index.html.md",
      heading: "Components",
      eyebrow: "Contracts",
      summary:
        "Framework-neutral component contracts for core controls, regions, and states.",
      sections: ["Usage", "Specimens", "Component contracts", "Review checks", "Accessibility"],
      examples: [
        {
          title: "Action with a boundary",
          use: "Use an action button when the user can trigger one clear outcome with visible state.",
          caution: "Do not expose risky or destructive action without approval-boundary evidence.",
        },
        {
          title: "Field with clear state",
          use: "Use field contracts when labels, help, validation, disabled state, and focus must stay together.",
          caution: "Do not rely on placeholder text or color-only errors.",
        },
      ],
    },
    {
      id: "patterns",
      title: "JudgmentKit Patterns",
      nav_label: "Patterns",
      path: "/design-system/patterns/",
      markdown_path: "/design-system/patterns/index.html.md",
      heading: "Patterns",
      eyebrow: "Contracts",
      summary:
        "Surface patterns that connect activity purpose to required regions, controls, and completion behavior.",
      sections: ["Usage", "Specimens", "Surface patterns", "Review checks", "Accessibility"],
      examples: [
        {
          title: "Workbench activity",
          use: "Use the workbench pattern when the user repeatedly inspects, compares, decides, and hands off work items.",
          caution: "Do not turn repeated review work into a numbered wizard without staged-flow evidence.",
        },
        {
          title: "Setup or debugging",
          use: "Use the setup pattern when implementation details are the work material.",
          caution: "Do not leak diagnostics into product surfaces where the activity is not setup, auditing, or debugging.",
        },
      ],
    },
    {
      id: "accessibility",
      title: "JudgmentKit Accessibility",
      nav_label: "Accessibility",
      path: "/design-system/accessibility/",
      markdown_path: "/design-system/accessibility/index.html.md",
      heading: "Accessibility",
      eyebrow: "Contracts",
      summary:
        "Accessibility baseline, evidence groups, contrast targets, and failure signals for generated interfaces.",
      sections: ["Usage", "Baseline", "Evidence groups", "Failure signals"],
      examples: [
        {
          title: "Color and status",
          use: "Pair visual state with text, semantics, and non-color cues.",
          caution: "Do not treat a token color or icon as accessibility evidence by itself.",
        },
        {
          title: "Keyboard and focus",
          use: "Check focus order, visible focus, no traps, and equivalent keyboard operation.",
          caution: "Do not accept custom widgets with roles but no matching keyboard behavior.",
        },
      ],
    },
  ];

  const foundationAssets = [
    {
      title: "Tokens",
      href: "/design-system/tokens/",
      summary:
        "Semantic roles for surfaces, text, borders, focus, statuses, decisions, risk, disabled states, and receipts.",
      meta: `${adapter.token_roles.length} roles`,
    },
    {
      title: "Typography",
      href: "/design-system/fonts/",
      summary:
        "System font stacks for body, heading, label, numeric, and diagnostic text.",
      meta: `${adapter.font_roles.length} roles`,
    },
    {
      title: "Icons",
      href: "/design-system/icons/",
      summary:
        "A committed Lucide catalog for selecting one consistent icon family.",
      meta: `${adapter.icon_catalog.icon_count} icons`,
    },
    {
      title: "Components",
      href: "/design-system/components/",
      summary:
        "Core component contracts for actions, fields, choices, dialogs, tables, panels, cards, and status.",
      meta: `${componentContracts.length} contracts + specimens`,
    },
    {
      title: "Patterns",
      href: "/design-system/patterns/",
      summary:
        "Surface contracts for marketing, workbench, review, form, dashboard, report, setup, and conversation work.",
      meta: `${patternContracts.length} patterns + specimens`,
    },
    {
      title: "Accessibility",
      href: "/design-system/accessibility/",
      summary:
        "Baseline checks for contrast, semantics, keyboard operation, focus, states, motion, and responsive behavior.",
      meta: accessibilityPolicy.standards_profile?.baseline ?? "WCAG 2.2 AA",
    },
  ];

  const principles = [
    "Start with the work the interface supports; foundations refine that work after the structure is sound.",
    "Use visible labels, semantic HTML, and accessibility evidence when color, type, or icons carry meaning.",
    "Use component and pattern contracts to review behavior before choosing renderer components.",
    "Use complete source details for review, but keep source mechanics out of the primary browsing path.",
  ];

  const model = {
    id: "judgmentkit-design-system",
    generated_from: "createUiImplementationContract",
    system,
    adapter,
    component_contracts: componentContracts,
    pattern_contracts: patternContracts,
    component_specimens: componentSpecimens,
    pattern_specimens: patternSpecimens,
    specimen_hashes: {
      design_system_contract_hash: specimenContext.design_system_contract_hash,
      token_hash: specimenContext.token_hash,
      icon_catalog_hash: specimenContext.icon_catalog_hash,
    },
    accessibility_policy: accessibilityPolicy,
    icon_index: iconIndex,
    icon_scenarios: iconScenarios,
    foundation_assets: foundationAssets,
    pages,
    principles,
  };

  return {
    ...model,
    exports: designSystemExports(model),
  };
}

function renderDesignSystemNav(model, activeId) {
  return `<aside class="doc-nav design-system-nav" aria-label="Design system sections">
          ${model.pages
            .map(
              (pageEntry) =>
                `<a href="${pageEntry.path}"${pageEntry.id === activeId ? ' aria-current="page"' : ""}>${escapeHtml(pageEntry.nav_label)}</a>`,
            )
            .join("\n          ")}
        </aside>`;
}

function renderDesignSystemSectionMenu(model, activeId) {
  const activePage = model.pages.find((pageEntry) => pageEntry.id === activeId) ?? model.pages[0];
  const menuId = `design-system-section-menu-${activeId}`;

  return `<div class="design-system-section-menu" data-design-system-section-menu>
          <button
            class="design-system-section-menu-button"
            type="button"
            aria-expanded="false"
            aria-controls="${escapeHtml(menuId)}"
            aria-haspopup="menu"
            data-design-system-section-menu-button
          >
            <span>${escapeHtml(activePage.nav_label)}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <div class="design-system-section-menu-backdrop" hidden data-design-system-section-menu-backdrop></div>
          <div class="design-system-section-menu-list" id="${escapeHtml(menuId)}" role="menu" hidden data-design-system-section-menu-list>
            ${model.pages
              .map(
                (pageEntry) =>
                  `<a href="${pageEntry.path}" role="menuitem"${pageEntry.id === activeId ? ' aria-current="page"' : ""}>${escapeHtml(pageEntry.nav_label)}</a>`,
              )
              .join("\n            ")}
          </div>
        </div>`;
}

function renderDesignSystemOnThisPage(pageEntry) {
  return `<nav class="design-system-on-this-page" aria-label="On this page">
            <span>On this page</span>
            ${pageEntry.sections
              .map((label) => `<a href="#${escapeHtml(slugId(label))}">${escapeHtml(label)}</a>`)
              .join("\n            ")}
          </nav>`;
}

function renderDesignSystemLayout(model, activeId, content) {
  return `
    <section class="section design-system-page" data-design-system-page="${escapeHtml(activeId)}">
      <div class="doc-layout design-system-layout">
        ${renderDesignSystemSectionMenu(model, activeId)}
        ${renderDesignSystemNav(model, activeId)}
        <div class="design-system-content">
          ${content}
        </div>
      </div>
    </section>`;
}

function renderDesignSystemHero(pageEntry) {
  return `<header class="design-system-hero">
            <p class="eyebrow">${escapeHtml(pageEntry.eyebrow)}</p>
            <h1>${escapeHtml(pageEntry.heading)}</h1>
            <p class="lede">${escapeHtml(pageEntry.summary)}</p>
            ${renderDesignSystemOnThisPage(pageEntry)}
          </header>`;
}

function renderDesignSystemMetric(label, value, detail = "") {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}</div>`;
}

function renderDesignSystemMetrics(metrics) {
  return `<dl class="design-system-metrics">
          ${metrics.map((metric) => renderDesignSystemMetric(metric.label, metric.value, metric.detail)).join("\n          ")}
        </dl>`;
}

function renderDesignSystemRuleList(items, className = "design-system-rule-list") {
  return `<ul class="${className}">
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>`;
}

function renderDesignSystemExamples(pageEntry) {
  if (!pageEntry.examples?.length) {
    return "";
  }

  return `<section class="design-system-section" aria-labelledby="examples">
            <h2 id="examples">Examples</h2>
            <ul class="design-system-example-grid">
              ${pageEntry.examples
                .map(
                  (example) => `<li>
                <article>
                  <h3>${escapeHtml(example.title)}</h3>
                  <dl>
                    <div><dt>Use</dt><dd>${escapeHtml(example.use)}</dd></div>
                    <div><dt>Watch for</dt><dd>${escapeHtml(example.caution)}</dd></div>
                  </dl>
                </article>
              </li>`,
                )
                .join("\n              ")}
            </ul>
          </section>`;
}

function renderSpecimenFacts(rows) {
  return `<dl class="design-system-specimen-facts">
            ${rows
              .map(
                ([label, value]) =>
                  `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
              )
              .join("\n            ")}
          </dl>`;
}

function renderSpecimenPillList(items, className = "design-system-specimen-pills") {
  return `<ul class="${className}">
            ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n            ")}
          </ul>`;
}

function renderComponentSpecimenList(specimens) {
  return `<div class="design-system-specimen-list">
            ${specimens
              .map((specimen) => {
                const contractExcerpt = {
                  id: specimen.contract_id,
                  purpose: specimen.purpose,
                  required_states: specimen.covered_states,
                  anatomy: specimen.covered_anatomy,
                  token_bindings: specimen.covered_token_bindings,
                };

                return `<article class="design-system-specimen" id="${escapeHtml(specimenAnchor(specimen.contract_id))}" data-component-specimen="${escapeHtml(specimen.contract_id)}">
              <header class="design-system-specimen-header">
                <div>
                  <p class="eyebrow">Component specimen</p>
                  <h3>${escapeHtml(specimen.label)}</h3>
                  <p>${escapeHtml(specimen.purpose)}</p>
                </div>
                <a class="pill-link" href="${escapeHtml(specimen.anchor)}">Open</a>
              </header>
              <div class="design-system-specimen-body">
                <div class="design-system-specimen-preview-frame">
                  ${specimen.rendered_html}
                </div>
                <aside class="design-system-specimen-support" aria-label="${escapeHtml(specimen.label)} coverage">
                  <h4>States</h4>
                  ${renderSpecimenPillList(specimen.covered_states)}
                  <h4>Anatomy</h4>
                  ${renderSpecimenPillList(specimen.covered_anatomy)}
                  <h4>Evidence</h4>
                  ${renderSpecimenFacts([
                    ["Contract", specimen.contract_id],
                    ["Contract hash", shortHash(specimen.contract_hash)],
                    ["Output hash", shortHash(specimen.output_hash)],
                  ])}
                  <details>
                    <summary>Contract</summary>
                    <pre><code>${escapeHtml(JSON.stringify(contractExcerpt, null, 2))}</code></pre>
                  </details>
                </aside>
              </div>
            </article>`;
              })
              .join("\n            ")}
          </div>`;
}

function renderPatternSpecimenList(specimens) {
  return `<div class="design-system-specimen-list">
            ${specimens
              .map((specimen) => {
                const contractExcerpt = {
                  id: specimen.contract_id,
                  surface_type: specimen.surface_type,
                  purpose: specimen.purpose,
                  required_regions: specimen.covered_regions,
                  expected_controls: specimen.covered_controls,
                  completion_or_handoff: specimen.completion_or_handoff,
                };

                return `<article class="design-system-specimen" id="${escapeHtml(specimenAnchor(specimen.contract_id))}" data-pattern-specimen="${escapeHtml(specimen.contract_id)}">
              <header class="design-system-specimen-header">
                <div>
                  <p class="eyebrow">Pattern specimen</p>
                  <h3>${escapeHtml(specimen.label)}</h3>
                  <p>${escapeHtml(specimen.purpose)}</p>
                </div>
                <a class="pill-link" href="${escapeHtml(specimen.anchor)}">Open</a>
              </header>
              <div class="design-system-specimen-body">
                <div class="design-system-specimen-preview-frame">
                  ${specimen.rendered_html}
                </div>
                <aside class="design-system-specimen-support" aria-label="${escapeHtml(specimen.label)} coverage">
                  <h4>Regions</h4>
                  ${renderSpecimenPillList(specimen.covered_regions)}
                  <h4>Controls</h4>
                  ${renderSpecimenPillList(specimen.covered_controls)}
                  <h4>Evidence</h4>
                  ${renderSpecimenFacts([
                    ["Surface", specimen.surface_type],
                    ["Contract hash", shortHash(specimen.contract_hash)],
                    ["Output hash", shortHash(specimen.output_hash)],
                  ])}
                  <details>
                    <summary>Contract</summary>
                    <pre><code>${escapeHtml(JSON.stringify(contractExcerpt, null, 2))}</code></pre>
                  </details>
                </aside>
              </div>
            </article>`;
              })
              .join("\n            ")}
          </div>`;
}

function renderDesignSystemTable({ caption, columns, rows, rowAttributes = () => "" }) {
  return `<div class="design-system-table-wrap">
            <table class="design-system-table">
              <caption>${escapeHtml(caption)}</caption>
              <thead>
                <tr>
                  ${columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (row) => `<tr${rowAttributes(row) ? ` ${rowAttributes(row)}` : ""}>
                  ${columns
                    .map((column) => {
                      const value = column.render ? column.render(row) : escapeHtml(row[column.key] ?? "");
                      return `<td>${value}</td>`;
                    })
                    .join("")}
                </tr>`,
                  )
                  .join("\n                ")}
              </tbody>
            </table>
          </div>`;
}

function designSystemPageById(model, id) {
  const pageEntry = model.pages.find((entry) => entry.id === id);
  if (!pageEntry) {
    throw new Error(`Unknown design-system page: ${id}`);
  }
  return pageEntry;
}

function slugId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tokenReviewNote(role) {
  const notes = {
    surface: "Check that panels, overlays, and page regions are visually distinct without adding clutter.",
    text: "Check readable contrast, line length, and hierarchy before decorative styling.",
    border: "Use borders to clarify grouping, control bounds, and evidence adjacency.",
    focus: "Keyboard focus must remain visible and easy to follow.",
    status: "Pair status treatment with visible words and state changes.",
    decision: "Primary and destructive actions need clear separation and labels.",
    risk: "Escalation and destructive states need visible context, not just stronger color.",
    disabled: "Disabled controls need an unavailable reason when the next step matters.",
    receipt: "Completion states should leave a clear confirmation or handoff record.",
  };

  return notes[role] ?? "Check that the role supports visible work on the page.";
}

function renderDesignSystemOverviewPage(model) {
  const adapter = model.adapter;
  const iconCatalog = adapter.icon_catalog;
  const pageEntry = designSystemPageById(model, "overview");

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "overview",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Token roles",
              value: adapter.token_roles.length,
              detail: "Semantic foundation roles.",
            },
            {
              label: "Type roles",
              value: adapter.font_roles.length,
              detail: "System font stacks.",
            },
            {
              label: "Icons",
              value: iconCatalog.icon_count,
              detail: `${iconCatalog.package}@${iconCatalog.version}`,
            },
          ])}
          <section class="design-system-section" aria-labelledby="foundation-assets">
            <h2 id="foundation-assets">Foundation assets</h2>
            <ul class="design-system-foundation-list">
              ${model.foundation_assets
                .map(
                  (asset) => `<li>
                <article>
                  <p class="status">${escapeHtml(asset.meta)}</p>
                  <h3>${escapeHtml(asset.title)}</h3>
                  <p>${escapeHtml(asset.summary)}</p>
                  <a class="pill-link" href="${escapeHtml(asset.href)}">Open ${escapeHtml(asset.title)}</a>
                </article>
              </li>`,
                )
                .join("\n              ")}
            </ul>
          </section>
          <section class="design-system-section" aria-labelledby="how-to-review">
            <h2 id="how-to-review">How to review</h2>
            <ol class="design-system-step-list">
              <li>Confirm the interface supports the right task and workflow.</li>
              <li>Use foundations to review hierarchy, meaning, consistency, and source constraints.</li>
              <li>Check accessibility evidence when color, type, or icons communicate meaning.</li>
              <li>Reference stable asset names when implementation or review feedback needs precision.</li>
            </ol>
          </section>
          <section class="design-system-section" aria-labelledby="principles">
            <h2 id="principles">Principles</h2>
            ${renderDesignSystemRuleList(model.principles)}
          </section>
          ${renderDesignSystemExamples(pageEntry)}
        `,
    ),
    {
      description:
        "JudgmentKit design-system foundations: tokens, typography, and icons for human review.",
      path: "/design-system/",
    },
  );
}

function renderDesignSystemTokensPage(model) {
  const adapter = model.adapter;
  const pageEntry = designSystemPageById(model, "tokens");

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "tokens",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Families",
              value: adapter.token_families.length,
              detail: adapter.token_families.join(", "),
            },
            {
              label: "Roles",
              value: adapter.token_roles.length,
              detail: "Named by meaning, not raw values.",
            },
            {
              label: "Current scope",
              value: "roles + CSS",
              detail: "Portable values ship as CSS custom properties.",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Use token roles to describe what a visual choice is doing: separating a surface, marking focus, showing status, identifying risk, or recording completion. The CSS custom properties below are portable defaults for generated interfaces; repo-approved design systems can replace the values after the activity and workflow gates are clear.</p>
          </section>
          <section class="design-system-section" aria-labelledby="values">
            <h2 id="values">Values</h2>
            <p class="note">The role-first layer exists because agents need to choose visual intent before choosing a brand palette. The values make that intent renderable and reviewable without pretending this is a full component library.</p>
            <pre><code>${escapeHtml(cssCustomPropertyBlock(adapter.css_custom_properties))}</code></pre>
            ${renderDesignSystemTable({
              caption: "Portable CSS custom properties",
              columns: [
                {
                  key: "name",
                  label: "Property",
                  render: (row) => `<code>${escapeHtml(row.name)}</code>`,
                },
                {
                  key: "value",
                  label: "Value",
                  render: renderCssCustomPropertyValue,
                },
                {
                  key: "role",
                  label: "Role",
                  render: (row) => `<code>${escapeHtml(row.role)}</code>`,
                },
                {
                  key: "usage",
                  label: "Use",
                },
              ],
              rows: adapter.css_custom_properties,
              rowAttributes: (row) => `data-token-value="${escapeHtml(row.name)}"`,
            })}
          </section>
          <section class="design-system-section" aria-labelledby="token-roles">
            <h2 id="token-roles">Token roles</h2>
            ${renderDesignSystemTable({
              caption: "JudgmentKit token roles",
              columns: [
                {
                  key: "role",
                  label: "Role",
                  render: (row) => `<code>${escapeHtml(row.role)}</code>`,
                },
                {
                  key: "families",
                  label: "Families",
                  render: (row) => escapeHtml((row.families ?? []).join(", ")),
                },
                {
                  key: "usage",
                  label: "Use",
                },
                {
                  key: "review",
                  label: "Review check",
                  render: (row) => escapeHtml(tokenReviewNote(row.role)),
                },
              ],
              rows: adapter.token_roles,
              rowAttributes: (row) => `data-token-role="${escapeHtml(row.role)}"`,
            })}
          </section>
          ${renderDesignSystemExamples(pageEntry)}
          <section class="design-system-section" aria-labelledby="accessibility">
            <h2 id="accessibility">Accessibility</h2>
            ${renderDesignSystemRuleList([
              "Color cannot be the only way a user understands status, error, risk, or completion.",
              "Focus treatment must be visible for keyboard users and must not be hidden by surrounding layout.",
              "Status, risk, disabled, and receipt states need visible text or nearby context.",
            ])}
          </section>
        `,
    ),
    {
      description:
        "JudgmentKit token roles for design-system foundations.",
      path: "/design-system/tokens/",
    },
  );
}

function renderDesignSystemFontsPage(model) {
  const adapter = model.adapter;
  const pageEntry = designSystemPageById(model, "fonts");

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "fonts",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Type roles",
              value: adapter.font_roles.length,
              detail: "body, heading, label, numeric, diagnostic",
            },
            {
              label: "Source",
              value: "system",
              detail: "No font CDN or bundled font files.",
            },
            {
              label: "Numeric text",
              value: "tabular",
              detail: "Stable comparison for aligned values.",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Use typography roles to preserve readable hierarchy and predictable rendering across local systems.</p>
          </section>
          <section class="design-system-section" aria-labelledby="type-roles">
            <h2 id="type-roles">Type roles</h2>
            ${renderDesignSystemTable({
              caption: "JudgmentKit typography roles",
              columns: [
                {
                  key: "role",
                  label: "Role",
                  render: (row) => `<code>${escapeHtml(row.role)}</code>`,
                },
                {
                  key: "usage",
                  label: "Use",
                },
                {
                  key: "stack",
                  label: "Stack",
                  render: (row) => `<code>${escapeHtml(row.stack)}</code>`,
                },
                {
                  key: "specimen",
                  label: "Specimen",
                  render: (row) => `<span class="font-specimen font-specimen-${escapeHtml(row.role)}">${escapeHtml(row.role === "numeric" ? "12,480" : row.role === "label" ? "Status label" : row.role === "diagnostic" ? "source.id" : "Interface text")}</span>`,
                },
              ],
              rows: adapter.font_roles,
              rowAttributes: (row) => `data-font-role="${escapeHtml(row.role)}"`,
            })}
          </section>
          ${renderDesignSystemExamples(pageEntry)}
          <section class="design-system-section" aria-labelledby="accessibility">
            <h2 id="accessibility">Accessibility</h2>
            ${renderDesignSystemRuleList([
              "Respect browser text scaling and avoid viewport-based font sizing.",
              "Use heading roles for hierarchy, not just larger text.",
              "Keep diagnostic monospace secondary unless source inspection is the task.",
            ])}
          </section>
        `,
    ),
    {
      description:
        "JudgmentKit typography foundations using portable system font stacks.",
      path: "/design-system/fonts/",
    },
  );
}

function buildDesignSystemIconScenarios() {
  return ICON_PAGE_SCENARIOS.map((scenario) => {
    const searchResult = searchIconCatalog({
      query: scenario.query,
      limit: 8,
      include_svg: false,
    });
    const selected =
      searchResult.icons.find((icon) => icon.id === scenario.expected_icon_id) ??
      searchResult.icons[0];
    const svgResult = getIconSvg({ id: selected.id });

    return {
      ...scenario,
      selected_icon_id: selected.id,
      search_rank: searchResult.icons.findIndex((icon) => icon.id === selected.id) + 1,
      inline_svg: svgResult.inline_svg,
    };
  });
}

function renderDesignSystemIconIndexCard(icon) {
  const scenarioAttribute = icon.scenario_id
    ? ` data-icon-scenario="${escapeHtml(icon.scenario_id)}"`
    : "";

  return `<li class="design-icon-scenario design-icon-index-card" data-icon-id="${escapeHtml(icon.id)}" data-icon-name="${escapeHtml(icon.name)}"${scenarioAttribute}>
            <div class="design-icon-symbol" aria-hidden="true">${icon.inline_svg}</div>
            <div>
              <code class="design-icon-id" aria-label="Icon ID ${escapeHtml(icon.id)}">${escapeHtml(icon.id)}</code>
            </div>
          </li>`;
}

function renderDesignSystemIconIndex(icons) {
  return `<search class="design-system-search" aria-labelledby="icon-index">
            <form action="/design-system/icons/" method="get" role="search" data-design-icon-search-form>
              <label for="icon-search">Search icon names</label>
              <div>
                <input id="icon-search" name="q" type="search" autocomplete="off" placeholder="Try receipt, calendar, alert, upload" data-design-icon-search aria-describedby="icon-search-count">
                <button type="submit">Search</button>
              </div>
              <p id="icon-search-count" class="note" aria-live="polite" data-design-icon-count>${escapeHtml(icons.length)} icons shown</p>
            </form>
          </search>
          <ul class="design-icon-index-list" data-design-icon-results>
            ${icons
              .map((icon) => renderDesignSystemIconIndexCard(icon))
              .join("\n            ")}
          </ul>`;
}

function renderDesignSystemIconSearchScript() {
  return `<script>
      (() => {
        const input = document.querySelector("[data-design-icon-search]");
        const count = document.querySelector("[data-design-icon-count]");
        const items = [...document.querySelectorAll("[data-design-icon-results] [data-icon-id]")];
        const form = document.querySelector("[data-design-icon-search-form]");
        if (!input || !count || !items.length) return;

        const render = () => {
          const terms = input.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
          let visible = 0;
          for (const item of items) {
            const text = item.textContent.toLowerCase();
            const match = terms.every((term) => text.includes(term));
            item.hidden = !match;
            if (match) visible += 1;
          }
          count.textContent = terms.length
            ? visible + " of " + items.length + " icons match"
            : items.length + " icons shown";
        };

        form?.addEventListener("submit", (event) => {
          event.preventDefault();
          render();
        });
        input.addEventListener("input", render);
        render();
      })();
    </script>`;
}

function renderDesignSystemIconsPage(model) {
  const adapter = model.adapter;
  const source = adapter.icon_catalog;
  const totalCount = source.icon_count;
  const pageEntry = designSystemPageById(model, "icons");

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "icons",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Source",
              value: `${source.package}@${source.version}`,
              detail: source.license,
            },
            {
              label: "Catalog icons",
              value: totalCount,
              detail: `${source.library} 24px outline style`,
            },
            {
              label: "Rendering",
              value: source.style_attributes.viewBox,
              detail: "inline SVG, currentColor stroke",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            ${renderDesignSystemRuleList([
              "Choose the icon by the meaning a person needs to recognize: status, direction, filtering, scheduling, handoff, or risk.",
              "Use one Lucide icon family so line weight, corner style, and proportions stay coherent.",
              "Prefer adjacent visible text for meaningful icons and reserve icon-only controls for familiar, named actions.",
            ])}
          </section>
          <section class="design-system-section" aria-labelledby="icon-index">
            <h2 id="icon-index">Icon index</h2>
            <p class="note">Search the committed Lucide IDs and names. Every catalog entry uses the same icon and ID card format.</p>
            ${renderDesignSystemIconIndex(model.icon_index)}
          </section>
          <section class="design-system-section" aria-labelledby="accessibility">
            <h2 id="accessibility">Accessibility</h2>
            ${renderDesignSystemRuleList([
              "Icon-only controls require accessible names, keyboard focus, and adequate target size.",
              "Meaningful icons should have adjacent visible text whenever possible.",
              "Icons that communicate state need non-text contrast evidence and must not replace the state label.",
            ])}
          </section>
          <section class="design-system-section" aria-labelledby="source">
            <h2 id="source">Source</h2>
            <p class="note">The catalog is generated from the committed ${escapeHtml(source.package)} package at version ${escapeHtml(source.version)}. The complete visual smoke proof remains available for regression review.</p>
            <a class="pill-link" href="/examples/lucide-icon-catalog-smoke.html">Open full catalog smoke proof</a>
          </section>
          ${renderDesignSystemIconSearchScript()}
        `,
    ),
    {
      description:
        "JudgmentKit iconography reference using the complete Lucide catalog.",
      path: "/design-system/icons/",
    },
  );
}

function renderDesignSystemComponentsPage(model) {
  const pageEntry = designSystemPageById(model, "components");
  const contracts = model.component_contracts;
  const specimens = model.component_specimens;
  const stateCount = new Set(contracts.flatMap((entry) => entry.required_states ?? [])).size;
  const bindingCount = new Set(contracts.flatMap((entry) => entry.token_bindings ?? [])).size;

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "components",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Specimens",
              value: specimens.length,
              detail: "Rendered from current contracts.",
            },
            {
              label: "States",
              value: stateCount,
              detail: "Required state names across components.",
            },
            {
              label: "Bindings",
              value: bindingCount,
              detail: "Token roles tied to component behavior.",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Use component contracts to choose the smallest interface primitive that supports the work. These contracts describe behavior, state, and review evidence; they are not a renderer package.</p>
          </section>
          <section class="design-system-section" aria-labelledby="specimens">
            <h2 id="specimens">Specimens</h2>
            <p class="note">Each specimen pairs a rendered preview with required state coverage, anatomy, token roles, and source evidence from the current contract.</p>
            ${renderComponentSpecimenList(specimens)}
          </section>
          <section class="design-system-section" aria-labelledby="component-contracts">
            <h2 id="component-contracts">Component contracts</h2>
            ${renderDesignSystemTable({
              caption: "Core UI component contracts",
              columns: [
                {
                  key: "id",
                  label: "Component",
                  render: (row) => `<code>${escapeHtml(row.id)}</code><br>${escapeHtml(row.label)}`,
                },
                {
                  key: "purpose",
                  label: "Purpose",
                },
                {
                  key: "required_states",
                  label: "States",
                  render: (row) => escapeHtml((row.required_states ?? []).join(", ")),
                },
                {
                  key: "review_checks",
                  label: "Review",
                  render: (row) => escapeHtml((row.review_checks ?? []).join("; ")),
                },
              ],
              rows: contracts,
              rowAttributes: (row) => `data-component-contract="${escapeHtml(row.id)}"`,
            })}
          </section>
          <section class="design-system-section" aria-labelledby="review-checks">
            <h2 id="review-checks">Review checks</h2>
            ${renderDesignSystemRuleList([
              "Use only known component contract ids when citing component evidence.",
              "Provide required state coverage for every component contract used.",
              "Keep risky action evidence separate from component evidence.",
              "Do not use renderer or component-library compliance as proof of activity fit.",
            ])}
          </section>
          <section class="design-system-section" aria-labelledby="accessibility">
            <h2 id="accessibility">Accessibility</h2>
            ${renderDesignSystemRuleList([
              "Controls need accessible names, keyboard operation, visible focus, and target-size evidence.",
              "Forms need labels, instructions, text errors, and status messages.",
              "Dialogs, menus, tabs, and custom widgets need name-role-value and focus-management evidence.",
            ])}
          </section>
          ${renderDesignSystemExamples(pageEntry)}
        `,
    ),
  );
}

function renderDesignSystemPatternsPage(model) {
  const pageEntry = designSystemPageById(model, "patterns");
  const contracts = model.pattern_contracts;
  const specimens = model.pattern_specimens;
  const regionCount = new Set(contracts.flatMap((entry) => entry.required_regions ?? [])).size;
  const controlCount = new Set(contracts.flatMap((entry) => entry.expected_controls ?? [])).size;

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "patterns",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Specimens",
              value: specimens.length,
              detail: "Rendered from current contracts.",
            },
            {
              label: "Regions",
              value: regionCount,
              detail: "Required regions across patterns.",
            },
            {
              label: "Controls",
              value: controlCount,
              detail: "Expected control families across patterns.",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Use surface patterns after the activity and surface type are clear. A pattern names the regions, controls, completion behavior, and disclosure boundary the interface must support.</p>
          </section>
          <section class="design-system-section" aria-labelledby="specimens">
            <h2 id="specimens">Specimens</h2>
            <p class="note">Each specimen pairs a rendered miniature surface with required regions, expected controls, completion behavior, and source evidence from the current contract.</p>
            ${renderPatternSpecimenList(specimens)}
          </section>
          <section class="design-system-section" aria-labelledby="surface-patterns">
            <h2 id="surface-patterns">Surface patterns</h2>
            ${renderDesignSystemTable({
              caption: "Surface pattern contracts",
              columns: [
                {
                  key: "id",
                  label: "Pattern",
                  render: (row) => `<code>${escapeHtml(row.id)}</code><br>${escapeHtml(row.label)}`,
                },
                {
                  key: "purpose",
                  label: "Purpose",
                },
                {
                  key: "required_regions",
                  label: "Regions",
                  render: (row) => escapeHtml((row.required_regions ?? []).join(", ")),
                },
                {
                  key: "expected_controls",
                  label: "Controls",
                  render: (row) => escapeHtml((row.expected_controls ?? []).join(", ")),
                },
              ],
              rows: contracts,
              rowAttributes: (row) => `data-pattern-contract="${escapeHtml(row.id)}" data-surface-type="${escapeHtml(row.surface_type)}"`,
            })}
          </section>
          <section class="design-system-section" aria-labelledby="review-checks">
            <h2 id="review-checks">Review checks</h2>
            ${renderDesignSystemRuleList([
              "The selected pattern must match the chosen surface type.",
              "Required regions and expected controls need evidence in the generated interface.",
              "Completion or handoff behavior must leave a result, reason, or next action.",
              "Disclosure boundaries still control whether diagnostic detail belongs on the surface.",
            ])}
          </section>
          <section class="design-system-section" aria-labelledby="accessibility">
            <h2 id="accessibility">Accessibility</h2>
            ${renderDesignSystemRuleList([
              "Patterns with charts, media, or visual status need text alternatives and non-color cues.",
              "Multi-region layouts need keyboard order that preserves the work sequence.",
              "Dense workbenches and dashboards need responsive no-overflow evidence.",
            ])}
          </section>
          ${renderDesignSystemExamples(pageEntry)}
        `,
    ),
  );
}

function renderDesignSystemAccessibilityPage(model) {
  const pageEntry = designSystemPageById(model, "accessibility");
  const policy = model.accessibility_policy;
  const contracts = Object.entries(policy.contracts ?? {}).map(([id, entry]) => ({
    id,
    label: entry.label ?? id,
    evidence: entry.evidence ?? [],
    requirements: entry.requirements ?? [],
  }));
  const conditionalKeys = Object.keys(policy.conditional_evidence ?? {});

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "accessibility",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderDesignSystemMetrics([
            {
              label: "Baseline",
              value: policy.standards_profile?.baseline ?? "WCAG 2.2 AA",
              detail: "Default accessibility target.",
            },
            {
              label: "Required",
              value: policy.required_evidence.length,
              detail: "Core evidence groups.",
            },
            {
              label: "Conditional",
              value: conditionalKeys.length,
              detail: "Added when matching UI patterns appear.",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Accessibility is reviewed as behavior and evidence, not as a visual style claim. Components, patterns, tokens, typography, and icons can support accessibility, but none of them replaces accessibility checks.</p>
          </section>
          <section class="design-system-section" aria-labelledby="baseline">
            <h2 id="baseline">Baseline</h2>
            ${renderDesignSystemRuleList([
              `Normal text contrast target: ${policy.contrast_targets.normal_text_min_ratio}:1.`,
              `Large text contrast target: ${policy.contrast_targets.large_text_min_ratio}:1.`,
              `Non-text contrast target: ${policy.contrast_targets.non_text_min_ratio}:1.`,
              policy.rendered_background_readability.requirement,
            ])}
          </section>
          <section class="design-system-section" aria-labelledby="evidence-groups">
            <h2 id="evidence-groups">Evidence groups</h2>
            ${renderDesignSystemTable({
              caption: "Accessibility evidence groups",
              columns: [
                {
                  key: "id",
                  label: "Group",
                  render: (row) => `<code>${escapeHtml(row.id)}</code><br>${escapeHtml(row.label)}`,
                },
                {
                  key: "requirements",
                  label: "Requirements",
                  render: (row) => escapeHtml((row.requirements ?? []).join("; ")),
                },
                {
                  key: "evidence",
                  label: "Evidence",
                  render: (row) => escapeHtml((row.evidence ?? []).join(", ")),
                },
              ],
              rows: contracts,
              rowAttributes: (row) => `data-accessibility-contract="${escapeHtml(row.id)}"`,
            })}
          </section>
          <section class="design-system-section" aria-labelledby="failure-signals">
            <h2 id="failure-signals">Failure signals</h2>
            ${renderDesignSystemRuleList(policy.failure_signals, "design-system-rule-list design-system-rule-list-risk")}
          </section>
          ${renderDesignSystemExamples(pageEntry)}
        `,
    ),
  );
}

function renderDesignSystemPageMarkdown(model, pageEntry) {
  const adapter = model.adapter;
  const lines = [
    `# ${pageEntry.title}`,
    "",
    pageEntry.summary,
    "",
    `HTML: ${pageEntry.path}`,
    "",
    "## Sections",
    markdownList(pageEntry.sections),
    "",
    "## Examples",
    ...pageEntry.examples.flatMap((example) => [
      `- ${example.title}: ${example.use}`,
      `- Watch for: ${example.caution}`,
    ]),
    "",
  ];

  if (pageEntry.id === "overview") {
    lines.push(
      "## Foundation Assets",
      markdownList(
        model.foundation_assets.map((asset) => `${asset.title}: ${asset.summary} (${asset.href})`),
      ),
      "",
      "## Principles",
      markdownList(model.principles),
      "",
      "## Routes",
      markdownList(model.pages.map((entry) => `${entry.path} -> ${entry.markdown_path}`)),
      "",
    );
  }

  if (pageEntry.id === "tokens") {
    lines.push(
      "## Approach",
      "JudgmentKit uses token roles to name visual intent before choosing brand-specific values. The CSS custom properties are portable defaults for rendering and review; repo-approved design systems can replace them after activity and workflow gates are clear.",
      "",
      "## Token Families",
      markdownList(adapter.token_families.map((family) => `\`${family}\``)),
      "",
      "## Portable CSS Defaults",
      "```css",
      cssCustomPropertyBlock(adapter.css_custom_properties),
      "```",
      "",
      markdownList(
        adapter.css_custom_properties.map(
          (entry) => `\`${entry.name}\` = \`${entry.value}\` (${entry.role}): ${entry.usage}`,
        ),
      ),
      "",
      "## Token Roles",
      markdownRoleList(
        adapter.token_roles,
        (entry) =>
          `${entry.usage}; families: ${(entry.families ?? []).join(", ")}; review: ${tokenReviewNote(entry.role)}`,
      ),
      "",
      "## Accessibility",
      markdownList([
        "Color cannot be the only signal for status, error, risk, or completion.",
        "Focus treatment must remain visible for keyboard users.",
        "Status, risk, disabled, and receipt states need visible text or nearby context.",
      ]),
      "",
    );
  }

  if (pageEntry.id === "fonts") {
    lines.push(
      "## Font Roles",
      markdownRoleList(
        adapter.font_roles,
        (entry) => `${entry.usage}; stack: \`${entry.stack}\``,
      ),
      "",
      "## Accessibility",
      markdownList([
        "Respect browser text scaling and avoid viewport-based font sizing.",
        "Use heading roles for hierarchy, not just larger text.",
        "Keep diagnostic monospace secondary unless source inspection is the task.",
      ]),
      "",
    );
  }

  if (pageEntry.id === "icons") {
    lines.push(
      "## Source",
      `- ${adapter.icon_catalog.package}@${adapter.icon_catalog.version}`,
      `- Icon count: ${adapter.icon_catalog.icon_count}`,
      `- License: ${adapter.icon_catalog.license}`,
      "",
      "## Usage",
      markdownList([
        "Choose the icon by the meaning a person needs to recognize.",
        "Use one Lucide icon family for coherent line weight and proportions.",
        "Prefer adjacent visible text for meaningful icons.",
      ]),
      "",
      "## Icon Index",
      `- ${model.icon_index.length} Lucide icon IDs are included in the HTML icon index.`,
      "- Common interface meanings such as status, navigation, filtering, scheduling, handoff, and risk are grouped into their matching icon index cards.",
      "- Full visual regression proof: `/examples/lucide-icon-catalog-smoke.html`.",
      "",
    );
  }

  if (pageEntry.id === "components") {
    lines.push(
      "## Specimens",
      markdownList(
        model.component_specimens.map(
          (entry) =>
            `\`${entry.id}\`: rendered from \`${entry.contract_id}\`; states: ${entry.covered_states.join(", ")}; output: \`${entry.output_hash}\``,
        ),
      ),
      "",
      "## Component Contracts",
      markdownList(
        model.component_contracts.map(
          (entry) =>
            `\`${entry.id}\`: ${entry.purpose}; states: ${(entry.required_states ?? []).join(", ")}; review: ${(entry.review_checks ?? []).join("; ")}`,
        ),
      ),
      "",
      "## Review Checks",
      markdownList([
        "Use only known component contract ids.",
        "Provide required state evidence for each used component.",
        "Do not use renderer compliance as activity, workflow, accessibility, or browser-QA evidence.",
      ]),
      "",
    );
  }

  if (pageEntry.id === "patterns") {
    lines.push(
      "## Specimens",
      markdownList(
        model.pattern_specimens.map(
          (entry) =>
            `\`${entry.id}\`: rendered from \`${entry.contract_id}\`; regions: ${entry.covered_regions.join(", ")}; controls: ${entry.covered_controls.join(", ")}; output: \`${entry.output_hash}\``,
        ),
      ),
      "",
      "## Surface Pattern Contracts",
      markdownList(
        model.pattern_contracts.map(
          (entry) =>
            `\`${entry.id}\` (${entry.surface_type}): ${entry.purpose}; regions: ${(entry.required_regions ?? []).join(", ")}; controls: ${(entry.expected_controls ?? []).join(", ")}`,
        ),
      ),
      "",
      "## Review Checks",
      markdownList([
        "The selected pattern must match the selected surface type.",
        "Required regions and expected controls need evidence.",
        "Completion or handoff behavior must leave a result, reason, or next action.",
      ]),
      "",
    );
  }

  if (pageEntry.id === "accessibility") {
    lines.push(
      "## Baseline",
      `- ${model.accessibility_policy.standards_profile?.baseline ?? "WCAG 2.2 AA"}`,
      `- Normal text: ${model.accessibility_policy.contrast_targets.normal_text_min_ratio}:1`,
      `- Large text: ${model.accessibility_policy.contrast_targets.large_text_min_ratio}:1`,
      `- Non-text: ${model.accessibility_policy.contrast_targets.non_text_min_ratio}:1`,
      "",
      "## Evidence Groups",
      markdownList(
        Object.entries(model.accessibility_policy.contracts ?? {}).map(
          ([id, entry]) => `\`${id}\`: ${(entry.evidence ?? []).join(", ")}`,
        ),
      ),
      "",
      "## Failure Signals",
      markdownList(model.accessibility_policy.failure_signals),
      "",
    );
  }

  return `${lines.join("\n").trim()}\n`;
}

function renderDesignSystemLlms(model) {
  return `${[
    "# JudgmentKit Design System",
    "",
    "Canonical human reference for JudgmentKit foundation assets.",
    "",
    "## Read first",
    "- /design-system/",
    "- /design-system/index.html.md",
    "- /design-system/manifest.json",
    "",
    "## Asset pages",
    ...model.pages.map((pageEntry) => `- ${pageEntry.title}: ${pageEntry.markdown_path}`),
    "",
    "## JSON exports",
    "- /design-system/visual-token-adapter.json",
    "- /design-system/component-contracts.json",
    "- /design-system/pattern-contracts.json",
    "- /design-system/component-specimens.json",
    "- /design-system/pattern-specimens.json",
    "- /design-system/specimen-provenance.json",
    "- /design-system/accessibility-policy.json",
    "- /design-system/icon-scenarios.json",
    "",
    "## Icon proof",
    "- /examples/lucide-icon-catalog-smoke.html",
    "",
  ].join("\n").trim()}\n`;
}

function renderDesignSystemLlmsFull(model) {
  return `${[
    renderDesignSystemLlms(model).trim(),
    "",
    "## Principles",
    markdownList(model.principles),
    "",
    ...model.pages.map((pageEntry) => renderDesignSystemPageMarkdown(model, pageEntry).trim()),
    "",
  ].join("\n\n").trim()}\n`;
}

function jsonExport(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function valuePage() {
  const evidenceLinks = await buildValueEvidenceLinks();

  return page(
    "What JudgmentKit Prevents",
    `
    <section class="section value-page">
      <div class="value-hero">
        <p class="eyebrow">Shippable value</p>
        <h1>What JudgmentKit prevents</h1>
        <p class="lede">JudgmentKit catches when AI-generated UI turns implementation mechanics into UX, then gives the agent repair instructions before the work ships.</p>
      </div>

      <div class="value-case-grid">
        <article class="value-case" id="implementation-language">
          <div class="value-case-copy">
            <p class="eyebrow">Implementation language leak</p>
            <h2>Internal objects stop becoming the product surface.</h2>
            <p>A raw generation pass tends to expose database fields, schema labels, endpoint status, and debug structure. JudgmentKit redirects the agent toward the actual activity: a support lead reviewing refund evidence and leaving a handoff.</p>
            <dl class="value-findings">
              <div><dt>Baseline failure</dt><dd>Source mechanics become navigation and labels the support lead has to translate.</dd></div>
              <div><dt>JudgmentKit catches</dt><dd>The activity, participant, decision, outcome, and disclosure boundary are missing or weak.</dd></div>
              <div><dt>Repaired outcome</dt><dd>The primary surface uses refund review language and keeps diagnostics secondary.</dd></div>
            </dl>
          </div>
          <figure class="value-screenshot-pair" aria-label="Implementation language before and after screenshots">
            <a href="/examples/model-ui/refund-system-map/artifacts/deterministic-no-judgmentkit.html">
              <img src="/examples/model-ui/refund-system-map/screenshots/deterministic-no-judgmentkit.png" alt="Raw refund triage artifact screenshot">
              <span>Raw brief</span>
            </a>
            <a href="/examples/model-ui/refund-system-map/artifacts/deterministic-with-judgmentkit.html">
              <img src="/examples/model-ui/refund-system-map/screenshots/deterministic-with-judgmentkit.png" alt="JudgmentKit-guided refund triage artifact screenshot">
              <span>JudgmentKit-guided</span>
            </a>
            <figcaption>Same refund activity, different source discipline.</figcaption>
          </figure>
        </article>

        <article class="value-case" id="action-boundary">
          <div class="value-case-copy">
            <p class="eyebrow">Unsafe action boundary</p>
            <h2>Approval work gets a human decision point.</h2>
            <p>Refund review is not a generic submit flow. The user needs to approve, send to policy review, or return for missing evidence with a reason the next owner can trust.</p>
            <dl class="value-findings">
              <div><dt>Baseline failure</dt><dd>Actions advance the case before the approval boundary and handoff reason are explicit.</dd></div>
              <div><dt>JudgmentKit catches</dt><dd>The primary action, reversible states, and next-owner receipt are not grounded in the review activity.</dd></div>
              <div><dt>Repaired outcome</dt><dd>The interface separates decision, reason, and handoff so the case can move forward cleanly.</dd></div>
            </dl>
          </div>
          <div class="value-receipt" aria-label="Refund action boundary repair receipt">
            <div class="value-receipt-row"><strong>Decision</strong><p>Approve, send to policy review, or return for missing evidence.</p></div>
            <div class="value-receipt-row"><strong>Required reason</strong><p>The user records the evidence behind the selected outcome.</p></div>
            <div class="value-receipt-row"><strong>Handoff</strong><p>The next owner receives the action, rationale, and unresolved evidence.</p></div>
          </div>
        </article>

        <article class="value-case" id="accessibility-evidence">
          <div class="value-case-copy">
            <p class="eyebrow">Missing accessibility evidence</p>
            <h2>Claims are not accepted without evidence.</h2>
            <p>JudgmentKit treats accessibility as part of the implementation contract. An agent cannot pass by saying the UI is accessible in a rationale while leaving required evidence out of the candidate.</p>
            <dl class="value-findings">
              <div><dt>Baseline failure</dt><dd>Labels, focus-visible behavior, status messaging, or conditional modal evidence are absent.</dd></div>
              <div><dt>JudgmentKit catches</dt><dd>The failed evidence keys are grouped into repair instructions for the agent.</dd></div>
              <div><dt>Repaired outcome</dt><dd>The candidate resubmits with concrete accessibility evidence before acceptance.</dd></div>
            </dl>
          </div>
          <div class="value-receipt" aria-label="Accessibility repair guidance example">
            <div class="value-receipt-row"><strong>Failed check</strong><p>Missing focus, keyboard, status, or conditional evidence.</p></div>
            <div class="value-receipt-row"><strong>Repair</strong><p>Add the evidence inside the implementation candidate, not only in the rationale.</p></div>
            <div class="value-receipt-row"><strong>Result</strong><p>The agent repairs, resubmits, and either passes or stops for human review after the attempt limit.</p></div>
          </div>
        </article>
      </div>

      <section class="value-evidence" aria-labelledby="value-evidence-title">
        <p class="eyebrow">Evidence, not the main story</p>
        <h2 id="value-evidence-title">Audit material stays available.</h2>
        <p>The public value path above is the product story. The reports remain available for people who want the underlying deterministic proof, model matrix, and repair-loop data.</p>
        <div class="link-row">
          ${renderValueEvidenceLinks(evidenceLinks)}
        </div>
      </section>
    </section>
  `,
    {
      description:
        "Concrete before and after examples of what JudgmentKit prevents in AI-generated product UI.",
      path: "/value/",
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
          <a href="#first-use">First 10 Minutes</a>
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
          <section class="doc-section" id="first-use">
            <h2>First 10 Minutes</h2>
            <p>Use the replayable first-use fixture to see the AI-native design system as a contract loop, not a renderer. The fixture gives the agent one brief, one implementation contract input, one failing candidate, one repaired candidate, and the expected two-attempt transcript.</p>
            <pre><code>examples/ai-native-design-system/first-use.json
examples/ai-native-design-system/canonical-examples.json</code></pre>
            <p><strong>Loop:</strong> create the implementation contract, review the failing candidate, read <code>next_agent_action</code> and grouped <code>repair_instructions</code>, repair the candidate, then resubmit and expect <code>accept</code>.</p>
            <p><strong>Canonical cases:</strong> setup/onboarding, operational dashboard, and high-stakes review/refund workflow. Each case includes the activity model, implementation contract input, failing candidate, repaired candidate, and proof expectation.</p>
            <p><strong>Renderer boundary:</strong> <code>visual_token_adapter</code> remains boundary-only metadata for semantic tokens, portable system font stacks, and Lucide icon catalog policy. The default renderer/component package starts only after the first-use loop and asset boundary stay stable.</p>
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
            ${systemMapShell("system-map-svg-title", "system-map-svg-desc")}
            <div class="system-map-summary" aria-label="System map text summary">
              <p><strong>MCP boundary:</strong> agents call JudgmentKit tools through MCP; MCP is access and transport, not the LLM.</p>
              <p><strong>JudgmentKit kernel:</strong> deterministic review, candidate review, disclosure rules, targeted questions, and the handoff gate decide whether UI generation is ready.</p>
              <p><strong>LLM / provider seam:</strong> a model may propose activity or workflow candidates, but JudgmentKit reviews those candidates before trusting them.</p>
              <p><strong>Surface type:</strong> <code>recommend_surface_types</code> classifies activity purpose as marketing, workbench, operator review, form flow, dashboard monitor, content/report, setup/debug tool, or conversation before frontend implementation guidance.</p>
              <p><strong>UI generation:</strong> the LLM or agent generates the interface outside JudgmentKit from the reviewed handoff.</p>
              <p><strong>Implementation contract:</strong> <code>create_ui_implementation_contract</code> supplies approved primitives, required states, static checks, browser QA expectations, visual asset policy, and accessibility evidence expectations before final handoff. <code>review_ui_implementation_candidate</code> checks generated UI against that contract.</p>
              <p><strong>Frontend adapter:</strong> <code>create_frontend_generation_context</code> combines a ready handoff, selected surface type, project frontend context, and verification expectations. <code>create_frontend_implementation_skill_context</code> turns that ready context into portable implementation instructions, semantic token roles, system font stacks, and Lucide icon catalog policy without exposing raw skill files. Design-system compliance is not a substitute for activity fit.</p>
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
            <p>Call <code>create_ui_implementation_contract</code> before final handoff so generated UI has approved primitives, state coverage, static checks, browser QA expectations, visual asset policy, and accessibility policy. Call <code>review_ui_implementation_candidate</code> before accepting generated UI code or evidence. Visual-heavy pages need browser-rendered contrast/readability evidence for text over images, canvas, WebGL, video, gradients, or generated visuals.</p>
          </section>
          <section class="doc-section" id="frontend-context">
            <h2>Frontend Context</h2>
            <p>Call <code>create_frontend_generation_context</code> after the handoff gate when an agent needs frontend implementation guidance with selected surface type, project context, and verification expectations. Call <code>create_frontend_implementation_skill_context</code> when an MCP client needs compiled implementation skill guidance instead of repo-local skill access.</p>
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
    "Four 3x4 comparisons across deterministic, Gemma 4 (local LLM), and GPT-5.5 xhigh paths, separating raw brief, JudgmentKit skill context, Material UI only, and JudgmentKit skill plus Material UI.",
  actions: [],
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

function renderModelUiUseCaseSelect(useCases) {
  const options = useCases
    .map(
      (useCase, index) =>
        `<option value="${escapeHtml(useCase.id)}" ${index === 0 ? "selected" : ""}>${escapeHtml(useCase.short_label ?? useCase.label)}</option>`,
    )
    .join("");
  return `
      <div class="examples-controls">
        <select class="model-ui-use-case-select" data-use-case-select aria-label="Use case">
          ${options}
        </select>
      </div>`;
}

function renderModelUiGalleryPreview(example) {
  const useCases = example.useCases ?? [];
  const panels = useCases
    .map((useCase, index) => {
      const matrix = renderExampleMatrixTable(useCase.comparisonRows ?? []);
      return `
        <section class="model-ui-use-case-panel" data-use-case-panel="${escapeHtml(useCase.id)}" ${index === 0 ? "" : "hidden"}>
          <div class="example-gallery-intro">
            <h3>${escapeHtml(useCase.label)} 3x4 matrix</h3>
            <p>${escapeHtml(useCase.activitySummary)} Columns separate Raw brief, JudgmentKit skill context, Material UI only, and JudgmentKit skill + Material UI.</p>
          </div>
          ${matrix}
        </section>`;
    })
    .join("");

  return `
    <section class="example-gallery" aria-label="Model UI screenshot gallery">
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
          if (!useCases.length || !previewNode) return;
          const activeUseCase = useCases.find((useCase) => useCase.id === useCaseId) ?? useCases[0];
          previewNode.querySelectorAll("[data-use-case-panel]").forEach((panel) => {
            panel.hidden = panel.getAttribute("data-use-case-panel") !== activeUseCase.id;
          });
          root.querySelectorAll("[data-use-case-select]").forEach((select) => {
            select.value = activeUseCase.id;
          });
          if (options.updateHash !== false) {
            history.replaceState(
              null,
              "",
              "#" + [example.id, activeUseCase.id].map(encodeURIComponent).join("/"),
            );
          }
        }

        function bindUseCaseControls(example, useCaseId, options = {}) {
          root.querySelectorAll("[data-use-case-select]").forEach((select) => {
            select.addEventListener("change", () => {
              selectUseCase(example, select.value);
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
        bindUseCaseControls(example, parseUseCaseHash(), { updateHash: false });

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
        <button class="example-gallery-modal-close" type="button" data-gallery-close aria-label="Close gallery">&times;</button>
        <aside class="example-gallery-modal-copy">
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
      <div class="examples-hero">
        <h1>Examples</h1>
        <p class="lede">Start with the replayable AI-native contract examples, then use the model UI matrix for broader before/after comparison.</p>
      </div>
      <section class="example-preview example-preview-focus" aria-labelledby="ai-native-examples-title">
        <div class="example-preview-body">
          <div class="example-gallery-intro">
            <p class="eyebrow">AI-native design system</p>
            <h2 id="ai-native-examples-title">First-use loop and canonical contract cases</h2>
            <p>The first-use fixture shows the agent-owned loop: create contract, review, repair, resubmit, accept. The canonical examples cover setup/onboarding, an operational dashboard, and high-stakes refund review before any renderer package exists.</p>
          </div>
          <div class="route-grid">
            <article>
              <h3>First-use repair loop</h3>
              <p>One brief, one failing implementation candidate, one repaired candidate, and a two-attempt transcript.</p>
              <div class="link-row">
                <a class="pill-link" href="/examples/ai-native-design-system/first-use.json">Open fixture JSON</a>
              </div>
            </article>
            <article>
              <h3>Canonical examples</h3>
              <p>Replay setup/onboarding, operational dashboard, and high-stakes review/refund contract failures and repairs.</p>
              <div class="link-row">
                <a class="pill-link" href="/examples/ai-native-design-system/canonical-examples.json">Open canonical JSON</a>
              </div>
            </article>
            <article>
              <h3>Renderer boundary</h3>
              <p>Tokens, system font stacks, and Lucide icon catalog policy remain governed metadata. They cannot bypass primitives, states, action boundaries, data visibility, accessibility, static checks, or browser QA.</p>
            </article>
            <article>
              <h3>Lucide icon smoke proof</h3>
              <p>Search, retrieve, and render every committed Lucide icon through the MCP catalog tools. The design-system icon page is the reference surface; this HTML remains the deterministic regression proof.</p>
              <div class="link-row">
                <a class="pill-link" href="/design-system/icons/">Open icon system</a>
                <a class="pill-link" href="/examples/lucide-icon-catalog-smoke.html">Open icon smoke HTML</a>
              </div>
            </article>
          </div>
        </div>
      </section>
      <div class="examples-layout">
        <div class="examples-main">
          <div class="example-gallery-intro">
            <p class="eyebrow">Model UI matrix</p>
            <h2>Before and after generation paths</h2>
            <p>These matrix examples compare how the same activity changes across raw brief, JudgmentKit skill context, Material UI only, and JudgmentKit skill plus Material UI paths.</p>
          </div>
          ${renderModelUiUseCaseSelect(modelUiExample.useCases ?? [])}
          <section id="model-ui-system-map" class="example-preview example-preview-focus" aria-label="Model UI generation matrix">
            <div class="example-preview-body" data-model-ui-preview>
              ${modelUiExample.previewHtml}
            </div>
          </section>
        </div>
      </div>
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

function signedValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  if (number > 0) return `+${number}`;
  return String(number);
}

function variantByTreatment(result, treatment) {
  return (result?.variants ?? []).find((variant) => variant.treatment === treatment) ?? null;
}

function metricPresentCount(variant, metricId) {
  const metric = variant?.metric_results?.[metricId];
  if (!metric || !Array.isArray(metric.present)) return 0;
  return metric.present.length;
}

function disclosureLeakageCount(variant) {
  const metric = variant?.metric_results?.disclosure_discipline;
  if (!metric) return 0;
  if (typeof metric.leakage_count === "number") return metric.leakage_count;
  return [
    ...(metric.implementation_leakage ?? []),
    ...(metric.review_packet_leakage ?? []),
  ].length;
}

function screenshotForViewport(variant, viewportId) {
  return variant?.screenshots?.find((screenshot) => screenshot.viewport?.id === viewportId) ?? null;
}

function evalScreenshotHref(screenshot) {
  if (!screenshot?.path) return "";
  return `/evals/${screenshot.path}`;
}

function buildBenchmarkCases(report) {
  return (report?.results ?? [])
    .map((result) => {
      const baseline = variantByTreatment(result, "raw_brief_baseline");
      const guided = variantByTreatment(result, "judgmentkit_handoff");
      if (!baseline || !guided) return null;

      const baselineActivity = metricPresentCount(baseline, "activity_fit");
      const guidedActivity = metricPresentCount(guided, "activity_fit");
      const baselineLeakage = disclosureLeakageCount(baseline);
      const guidedLeakage = disclosureLeakageCount(guided);
      const baselineScreenshot = screenshotForViewport(baseline, "desktop");
      const guidedScreenshot = screenshotForViewport(guided, "desktop");

      return {
        id: result.id,
        title: result.title,
        expectedOutcomes: result.expected_outcomes ?? [],
        winner: result.winner,
        passed: result.passed,
        baseline,
        guided,
        baselineScore: baseline.score ?? 0,
        guidedScore: guided.score ?? 0,
        scoreDelta: result.score_delta ?? ((guided.score ?? 0) - (baseline.score ?? 0)),
        baselineActivity,
        guidedActivity,
        activityDelta: guidedActivity - baselineActivity,
        baselineLeakage,
        guidedLeakage,
        leakageDelta: guidedLeakage - baselineLeakage,
        baselineScreenshotHref: evalScreenshotHref(baselineScreenshot),
        guidedScreenshotHref: evalScreenshotHref(guidedScreenshot),
        baselineArtifactHref: baseline.public_artifact ?? "",
        guidedArtifactHref: guided.public_artifact ?? "",
      };
    })
    .filter(Boolean);
}

function benchmarkWinnerLabel(winner) {
  if (winner === "judgmentkit_handoff") return "JudgmentKit guided";
  if (winner === "raw_brief_baseline") return "Raw baseline";
  if (winner === "tie") return "Tie";
  return winner ?? "";
}

function videoPlaceholder(label, detail, modifier = "") {
  return `
    <div class="report-video ${modifier}" role="img" aria-label="${escapeHtml(label)}">
      <div class="report-video-grid" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <button class="report-video-poster" type="button" disabled aria-label="${escapeHtml(label)}">
        <span class="report-video-play" aria-hidden="true"></span>
        <span class="report-video-copy">
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
      </button>
    </div>`;
}

function renderMetricCard(label, value, detail = "") {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
    </div>`;
}

function renderReportScoreChart(cases) {
  const width = 760;
  const height = 330;
  const plotTop = 52;
  const plotLeft = 86;
  const plotWidth = 610;
  const plotHeight = 210;
  const groupWidth = cases.length ? plotWidth / cases.length : plotWidth;
  const barWidth = Math.min(44, groupWidth / 5);
  const maxScore = 100;
  const scoreY = (score) => plotTop + plotHeight - (Math.max(0, Math.min(maxScore, Number(score) || 0)) / maxScore) * plotHeight;
  const ticks = [0, 25, 50, 75, 100];
  const tickLines = ticks
    .map((tick) => {
      const y = scoreY(tick);
      return `<line x1="${plotLeft}" y1="${y.toFixed(2)}" x2="${plotLeft + plotWidth}" y2="${y.toFixed(2)}"></line><text x="${plotLeft - 14}" y="${(y + 4).toFixed(2)}" text-anchor="end">${tick}</text>`;
    })
    .join("");
  const bars = cases
    .map((item, index) => {
      const groupX = plotLeft + groupWidth * index + groupWidth / 2;
      const baselineY = scoreY(item.baselineScore);
      const guidedY = scoreY(item.guidedScore);
      const baselineHeight = plotTop + plotHeight - baselineY;
      const guidedHeight = plotTop + plotHeight - guidedY;
      return `
        <g>
          <rect class="report-score-bar report-score-bar-baseline" x="${(groupX - barWidth - 4).toFixed(2)}" y="${baselineY.toFixed(2)}" width="${barWidth}" height="${baselineHeight.toFixed(2)}"></rect>
          <rect class="report-score-bar report-score-bar-guided" x="${(groupX + 4).toFixed(2)}" y="${guidedY.toFixed(2)}" width="${barWidth}" height="${guidedHeight.toFixed(2)}"></rect>
          <text class="report-score-label" x="${groupX.toFixed(2)}" y="${plotTop + plotHeight + 34}" text-anchor="middle">${escapeHtml(item.title)}</text>
          <text class="report-score-delta" x="${groupX.toFixed(2)}" y="${Math.min(baselineY, guidedY) - 10}" text-anchor="middle">${escapeHtml(signedValue(item.scoreDelta))}</text>
        </g>`;
    })
    .join("");

  return `
    <figure class="report-chart report-score-chart">
      <figcaption>Score comparison: raw baseline versus JudgmentKit-guided output.</figcaption>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="report-score-chart-title report-score-chart-desc">
        <title id="report-score-chart-title">Paired score comparison</title>
        <desc id="report-score-chart-desc">Bars compare raw baseline and JudgmentKit-guided scores for each committed paired eval case.</desc>
        <g class="report-chart-grid">${tickLines}</g>
        <line class="report-chart-axis" x1="${plotLeft}" y1="${plotTop + plotHeight}" x2="${plotLeft + plotWidth}" y2="${plotTop + plotHeight}"></line>
        <line class="report-chart-axis" x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotTop + plotHeight}"></line>
        ${bars}
      </svg>
      <div class="report-chart-legend" aria-label="Score chart legend">
        <span><i class="legend-baseline"></i>Raw baseline</span>
        <span><i class="legend-guided"></i>JudgmentKit guided</span>
      </div>
    </figure>`;
}

function renderActivityDisclosureFigure(cases) {
  return `
    <figure class="report-small-multiples">
      <figcaption>Activity-fit terms increase while implementation leakage falls.</figcaption>
      <div class="report-small-grid">
        ${cases
          .map(
            (item) => `
          <article>
            <h3>${escapeHtml(item.title)}</h3>
            <div class="report-micro-bars" aria-label="${escapeHtml(item.title)} activity and disclosure comparison">
              <div>
                <span>Activity terms</span>
                <strong>${escapeHtml(item.baselineActivity)} -> ${escapeHtml(item.guidedActivity)}</strong>
                <i><b style="width:${Math.min(100, item.baselineActivity * 16)}%"></b><b class="guided" style="width:${Math.min(100, item.guidedActivity * 16)}%"></b></i>
              </div>
              <div>
                <span>Implementation leaks</span>
                <strong>${escapeHtml(item.baselineLeakage)} -> ${escapeHtml(item.guidedLeakage)}</strong>
                <i><b style="width:${Math.min(100, item.baselineLeakage * 10)}%"></b><b class="guided" style="width:${Math.min(100, Math.max(2, item.guidedLeakage * 10))}%"></b></i>
              </div>
            </div>
          </article>`,
          )
          .join("")}
      </div>
    </figure>`;
}

function renderBenchmarkTable(cases) {
  return `
    <div class="report-table-shell">
      <table class="report-benchmark-table">
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Raw score</th>
            <th scope="col">Guided score</th>
            <th scope="col">Delta</th>
            <th scope="col">Winner</th>
            <th scope="col">Activity fit</th>
            <th scope="col">Leakage</th>
            <th scope="col">Evidence</th>
          </tr>
        </thead>
        <tbody>
          ${cases
            .map(
              (item) => `
          <tr>
            <th scope="row">${escapeHtml(item.title)}</th>
            <td>${escapeHtml(item.baselineScore)}</td>
            <td>${escapeHtml(item.guidedScore)}</td>
            <td>${escapeHtml(signedValue(item.scoreDelta))}</td>
            <td>${escapeHtml(benchmarkWinnerLabel(item.winner))}</td>
            <td>${escapeHtml(item.baselineActivity)} -> ${escapeHtml(item.guidedActivity)}</td>
            <td>${escapeHtml(item.baselineLeakage)} -> ${escapeHtml(item.guidedLeakage)}</td>
            <td>
              ${item.baselineScreenshotHref ? `<a href="${escapeHtml(item.baselineScreenshotHref)}">Raw screenshot</a>` : ""}
              ${item.baselineScreenshotHref && item.guidedScreenshotHref ? " · " : ""}
              ${item.guidedScreenshotHref ? `<a href="${escapeHtml(item.guidedScreenshotHref)}">Guided screenshot</a>` : ""}
            </td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function modelMatrixArtifactByColumn(row, columnId) {
  return (row?.artifacts ?? []).find((artifact) => artifact.column_id === columnId) ?? null;
}

function renderContextBoundaryMatrix(manifest) {
  if (!manifest) {
    return `<p class="note">Model matrix evidence is unavailable in this checkout.</p>`;
  }

  const columns = manifest.comparison_columns ?? [];
  const rows = manifest.comparison_rows ?? [];
  const baseHref = modelUiBaseHref(manifest);

  return `
    <div class="report-context-matrix-shell">
      <div class="report-context-matrix" role="table" aria-label="Context boundary matrix for ${escapeHtml(manifest.use_case_label)}">
        <div class="report-context-axis" role="columnheader">Generation path</div>
        ${columns
          .map((column) => `<div class="report-context-column" role="columnheader">${escapeHtml(column.label)}</div>`)
          .join("")}
        ${rows
          .map(
            (row) => `
        <div class="report-context-row" role="rowheader">
          <strong>${escapeHtml(row.label)}</strong>
          <span>${escapeHtml(row.summary)}</span>
        </div>
        ${columns
          .map((column) => {
            const artifact = modelMatrixArtifactByColumn(row, column.id);
            if (!artifact) return `<div class="report-context-cell" role="cell"></div>`;
            const artifactHref = `${baseHref}/${artifact.artifact_path}`;
            const screenshotHref = `${baseHref}/${artifact.screenshot_path}`;
            return `
        <a class="report-context-cell" role="cell" href="${escapeHtml(artifactHref)}">
          <img src="${escapeHtml(screenshotHref)}" alt="${escapeHtml(artifact.title)} screenshot" loading="lazy">
          <span>${escapeHtml(artifact.context_summary ?? artifact.column_label)}</span>
        </a>`;
          })
          .join("")}`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderUseCaseSummary(useCases) {
  return `
    <div class="report-use-case-grid">
      ${useCases
        .map(
          (useCase) => `
        <article>
          <h3>${escapeHtml(useCase.label)}</h3>
          <p>${escapeHtml(useCase.activity_summary)}</p>
          <div class="link-row">
            <a class="pill-link" href="/${escapeHtml(useCase.index_path)}">Open matrix</a>
            <a class="pill-link" href="/${escapeHtml(useCase.manifest_path)}">Manifest JSON</a>
          </div>
        </article>`,
        )
        .join("")}
    </div>`;
}

async function judgmentKitMcpReportPage() {
  const catalog = await readJsonIfExists("evals/reports/index.json");
  const latestReport = catalog?.latest
    ? await readJsonIfExists(path.join("evals/reports", catalog.latest.json_report))
    : null;
  const modelUiIndex = await readJsonIfExists("examples/model-ui/index.json");
  const modelUiManifests = await Promise.all(
    (modelUiIndex?.use_cases ?? []).map((useCase) => readJsonIfExists(useCase.manifest_path)),
  );
  const defaultUseCaseId = modelUiIndex?.default_use_case_id ?? modelUiIndex?.use_cases?.[0]?.id;
  const defaultManifest =
    modelUiManifests.find((manifest) => manifest?.use_case_id === defaultUseCaseId) ??
    modelUiManifests.find(Boolean);
  const benchmarkCases = buildBenchmarkCases(latestReport);
  const latest = catalog?.latest;
  const summary = latestReport?.summary ?? latest?.summary ?? {};
  const cases = summary.cases ?? benchmarkCases.length;
  const passed = summary.passed ?? benchmarkCases.filter((item) => item.passed).length;
  const passRate = cases ? `${Math.round((passed / cases) * 100)}%` : "n/a";
  const benchmarkPolicy =
    latestReport?.benchmark_policy ??
    "Qualitative paired-artifact evidence only; not a statistically powered benchmark.";
  const claimLevel = latestReport?.claim_level ?? latest?.claim_level ?? "pending";
  const modelUseCases = modelUiIndex?.use_cases ?? [];

  if (!latestReport || benchmarkCases.length === 0) {
    return page(
      "JudgmentKit MCP: Evidence for Activity-First UI Generation",
      `
      <section class="section report-page">
        <div class="report-article">
          <p class="eyebrow">JudgmentKit MCP evidence</p>
          <h1>JudgmentKit MCP: Evidence for Activity-First UI Generation</h1>
          ${videoPlaceholder("Report video placeholder", "Top-level overview video slot.")}
          <p class="lede">No committed paired eval report is available in this checkout. The report route is ready, but benchmark figures require the latest UI-generation eval catalog.</p>
          <p class="note">${escapeHtml(benchmarkPolicy)}</p>
        </div>
      </section>`,
      {
        description:
          "JudgmentKit MCP qualitative evaluation report for activity-first UI generation.",
        path: "/evals/judgmentkit-mcp/",
      },
    );
  }

  return page(
    "JudgmentKit MCP: Evidence for Activity-First UI Generation",
    `
    <section class="section report-page">
      <div class="report-heading">
        <p class="eyebrow">JudgmentKit MCP evidence</p>
        <h1>JudgmentKit MCP: Evidence for Activity-First UI Generation</h1>
        <p class="lede">A cautious public report on whether activity-first MCP guidance improves generated UI artifacts. The evidence is qualitative paired-artifact scoring and committed model-matrix examples, not a statistically powered benchmark.</p>
      </div>
      ${videoPlaceholder("JudgmentKit MCP report overview", "Hero video placeholder for the benchmark report walkthrough.", "report-video-hero")}
      <div class="report-shell">
        <nav class="report-toc" aria-label="Report table of contents">
          <a href="#ui-generation-bottleneck">The UI generation bottleneck</a>
          <a href="#what-judgmentkit-changes">What JudgmentKit changes</a>
          <a href="#how-the-evaluation-works">How the evaluation works</a>
          <a href="#benchmarks">Benchmarks</a>
          <a href="#example-evidence">Example evidence</a>
          <a href="#limitations-and-future-work">Limitations and future work</a>
          <a href="#run-data">Run data</a>
        </nav>
        <article class="report-article">
          <section id="ui-generation-bottleneck">
            <h2>The UI generation bottleneck</h2>
            <p>Generated interfaces often inherit the shape of the implementation material that fed them. Tables become screens, schemas become forms, internal labels become product language, and the user is left translating the interface back into the work they meant to do.</p>
            <p>JudgmentKit treats that as a judgment problem before it is a styling problem. The relevant question is whether the screen helps a person understand evidence, make a decision, and leave a useful handoff.</p>
          </section>
          <section id="what-judgmentkit-changes">
            <h2>What JudgmentKit changes</h2>
            <p>JudgmentKit adds an activity-first review layer before UI generation. It asks what work is being supported, who participates, what decision matters, what vocabulary belongs in the surface, and what diagnostic detail should stay out of the primary experience.</p>
            <div class="report-capability-grid">
              <article>
                <h3>Activity fit</h3>
                <p>Generated UI is judged against the work, not just against the input structure.</p>
              </article>
              <article>
                <h3>Decision support</h3>
                <p>The surface must make the next judgment or handoff easier to complete.</p>
              </article>
              <article>
                <h3>Disclosure discipline</h3>
                <p>Implementation detail remains diagnostic unless the activity is setup, debugging, or audit.</p>
              </article>
            </div>
            ${videoPlaceholder("Raw-to-guided generation placeholder", "Inline video slot for showing the before and after generation path.")}
            <figure class="report-system-figure">
              <figcaption>Compact activity-first generation flow.</figcaption>
              <ol>
                <li><strong>Source brief</strong><span>Product context and implementation-heavy material enter together.</span></li>
                <li><strong>Activity review</strong><span>Participant, objective, decision, outcome, and vocabulary are named.</span></li>
                <li><strong>Handoff</strong><span>Only ready guidance advances to UI generation.</span></li>
                <li><strong>Generated UI</strong><span>The draft is judged against the work, then loops back with findings.</span></li>
              </ol>
            </figure>
          </section>
          <section id="how-the-evaluation-works">
            <h2>How the evaluation works</h2>
            <p>The committed paired eval compares raw baseline artifacts with JudgmentKit-guided artifacts for the same UI tasks. Scores use a 0-100 weighted total with 0-5 metric scores underneath.</p>
            <p>${escapeHtml(benchmarkPolicy)}</p>
            <p>Desktop and mobile screenshots are captured as visual evidence for review. The screenshots support inspection, but the scoring source is the committed artifact text and deterministic rubric.</p>
            <dl class="report-summary" aria-label="Latest JudgmentKit MCP report summary">
              ${renderMetricCard("Latest run", latest ? evalRunTitle(latest) : "pending")}
              ${renderMetricCard("MCP release", latest?.mcp_release ?? "pending")}
              ${renderMetricCard("Cases", cases)}
              ${renderMetricCard("Pass rate", passRate)}
              ${renderMetricCard("Guided wins", summary.guided_wins ?? 0)}
              ${renderMetricCard("Baseline wins", summary.baseline_wins ?? 0)}
              ${renderMetricCard("Ties", summary.ties ?? 0)}
              ${renderMetricCard("Claim level", claimLevel)}
            </dl>
          </section>
          <section id="benchmarks">
            <h2>Benchmarks</h2>
            ${renderReportScoreChart(benchmarkCases)}
            ${renderActivityDisclosureFigure(benchmarkCases)}
            ${renderBenchmarkTable(benchmarkCases)}
          </section>
          <section id="example-evidence">
            <h2>Example evidence</h2>
            <p>The model UI matrices separate the source context from JudgmentKit guidance and Material UI rendering. The visible matrix below uses ${escapeHtml(defaultManifest?.use_case_label ?? "the default use case")} as a compact example; the full set covers every committed use case.</p>
            ${videoPlaceholder("Disclosure cleanup placeholder", "Inline video slot for showing implementation detail moving into diagnostics.")}
            ${renderContextBoundaryMatrix(defaultManifest)}
            <h3>Committed use cases</h3>
            ${renderUseCaseSummary(modelUseCases)}
            ${videoPlaceholder("Model matrix walkthrough placeholder", "Inline video slot for narrating the 3 by 4 matrix evidence.")}
          </section>
          <section id="limitations-and-future-work">
            <h2>Limitations and future work</h2>
            <p>This report is intentionally narrow. It uses committed paired artifacts and committed model matrix captures. It does not claim broad model behavior, does not call live providers during site build, and does not treat visual polish as proof of activity fit.</p>
            <p>Future versions can add broader MCP impact runs, more surface types, reviewer agreement, richer interaction probes, and completed walkthrough videos without changing this page structure.</p>
          </section>
          <section id="run-data">
            <h2>Run data</h2>
            <p>Implementation details are listed here for audit and reproduction rather than used as primary product language above.</p>
            <div class="report-run-links">
              <a class="pill-link" href="/evals/${escapeHtml(latest.html_report)}">Latest HTML report</a>
              <a class="pill-link" href="/evals/${escapeHtml(latest.json_report)}">Latest JSON report</a>
              <a class="pill-link" href="/evals/index.json">Eval catalog JSON</a>
              <a class="pill-link" href="/examples/model-ui/index.json">Model matrix index JSON</a>
            </div>
          </section>
        </article>
      </div>
    </section>
  `,
    {
      description:
        "JudgmentKit MCP qualitative evaluation report for activity-first UI generation.",
      path: "/evals/judgmentkit-mcp/",
    },
  );
}

function siteRebuildLogPage(designSystemModel) {
  const designSystemSource = designSystemModel.exports.manifest.source;
  const tokenRoleCount = designSystemModel.adapter.token_roles.length;
  const componentContractCount = designSystemModel.component_contracts.length;
  const patternContractCount = designSystemModel.pattern_contracts.length;
  const iconCount = designSystemModel.adapter.icon_catalog.icon_count;

  return page(
    "JudgmentKit Site Rebuild Log",
    `
    <section class="section report-page">
      <div class="report-heading">
        <p class="eyebrow">Rebuild evidence</p>
        <h1>Site rebuild log</h1>
        <p class="lede">This page records how the current judgmentkit.ai site was rebuilt, what counts as evidence, and where the design-system connection is enforced.</p>
      </div>
      <div class="report-shell">
        <nav class="report-toc" aria-label="Site rebuild log sections">
          <a href="#what-changed">What changed</a>
          <a href="#dogfood-path">Dogfood path</a>
          <a href="#design-system-evidence">Design-system evidence</a>
          <a href="#source-and-tests">Source and tests</a>
          <a href="#review-notes">Review notes</a>
        </nav>
        <article class="report-article">
          <section id="what-changed">
            <h2>What changed</h2>
            <p>The rebuild changed the public site from a system-map-heavy homepage into an evidence-first product surface. The homepage now explains the failure JudgmentKit prevents, shows the repair path, and routes visitors into value examples, replayable examples, eval evidence, docs, install, and design-system review.</p>
            <div class="report-capability-grid">
              <article>
                <h3>New homepage structure</h3>
                <p>The homepage uses product-language sections for failure recognition, proof paths, and adoption paths instead of leading with protocol or tool detail.</p>
              </article>
              <article>
                <h3>Disclosure boundary</h3>
                <p>Raw setup and tool language stays out of the homepage main content. Diagnostic detail moves to docs, evals, install, and this rebuild log.</p>
              </article>
              <article>
                <h3>Proof route</h3>
                <p>The evals section now includes this log so the rebuild can be inspected as an artifact instead of inferred from chat history.</p>
              </article>
            </div>
          </section>
          <section id="dogfood-path">
            <h2>Dogfood path</h2>
            <p>The rebuild used JudgmentKit as the planning and review gate before accepting the implementation. The useful signal was not visual taste; it was whether the activity, surface type, disclosure policy, handoff, and implementation evidence were ready.</p>
            <figure class="report-system-figure">
              <figcaption>Rebuild sequence, June 19, 2026.</figcaption>
              <ol>
                <li><strong>Activity model review</strong><span>The brief was reviewed as a public product-site rebuild for AI-agent users and evaluators.</span></li>
                <li><strong>Candidate repair</strong><span>An early activity-model candidate exposed raw implementation vocabulary. It was revised before it was trusted.</span></li>
                <li><strong>Surface selection</strong><span>The homepage was treated as a marketing surface with proof and adoption paths, not a setup/debug tool.</span></li>
                <li><strong>Workflow review</strong><span>The accepted workflow made value, proof, docs, design-system review, examples, evals, install, and MCP setup separate surfaces.</span></li>
                <li><strong>Implementation contract</strong><span>The generator stayed static and deterministic, with source-controlled routes, semantic HTML, responsive behavior, and explicit tests.</span></li>
                <li><strong>Implementation review</strong><span>The final implementation evidence passed after the review evidence was cleaned up and resubmitted.</span></li>
              </ol>
            </figure>
          </section>
          <section id="design-system-evidence">
            <h2>Design-system evidence</h2>
            <p>The strongest evidence is in the build and test contract: the same static site generator builds the product pages and the JudgmentKit design-system pages, then exports the manifest, token adapter, component contracts, pattern contracts, specimens, provenance, accessibility policy, and icon scenarios.</p>
            <dl class="report-summary" aria-label="JudgmentKit design-system evidence">
              ${renderMetricCard("Design-system source", designSystemSource.design_system_contract_id)}
              ${renderMetricCard("Token roles", tokenRoleCount)}
              ${renderMetricCard("Component contracts", componentContractCount)}
              ${renderMetricCard("Surface patterns", patternContractCount)}
              ${renderMetricCard("Icon catalog", `${iconCount} Lucide icons`)}
              ${renderMetricCard("Renderer", DESIGN_SYSTEM_SPECIMEN_RENDERER.id)}
            </dl>
            <div class="report-run-links">
              <a class="pill-link" href="/design-system/">Design-system overview</a>
              <a class="pill-link" href="/design-system/tokens/">Tokens</a>
              <a class="pill-link" href="/design-system/components/">Components</a>
              <a class="pill-link" href="/design-system/patterns/">Patterns</a>
              <a class="pill-link" href="/design-system/manifest.json">Manifest JSON</a>
              <a class="pill-link" href="/design-system/specimen-provenance.json">Specimen provenance</a>
            </div>
            <p class="note">This page should not be read as a claim that every visual rule on the homepage is mechanically generated from exported token JSON. The defensible claim is narrower: the rebuild is in the same source-controlled static generator, routes users into the JudgmentKit design-system surface, emits the design-system assets in the same build, and has tests that verify those assets, contracts, specimens, and provenance.</p>
          </section>
          <section id="source-and-tests">
            <h2>Source and tests</h2>
            <p>The rebuild is inspectable in source and in deterministic checks. These are the files and commands that prove what changed.</p>
            <div class="report-run-links">
              <a class="pill-link" href="/evals/judgmentkit-mcp/">JudgmentKit MCP report</a>
              <a class="pill-link" href="/evals/">Eval index</a>
              <a class="pill-link" href="/docs/#system-map">System map in docs</a>
            </div>
            <pre><code>Changed files:
site/build-site.mjs
tests/site.test.mjs

Verification:
npm run site:build
node tests/site.test.mjs
npm test
Playwright desktop and mobile review
JudgmentKit review_ui_implementation_candidate: passed</code></pre>
            <div class="report-capability-grid">
              <article>
                <h3>Homepage rebuild checks</h3>
                <p>Tests assert the new headline, proof paths, repair preview, failure grid, adoption paths, and absence of raw setup terms in homepage main content.</p>
              </article>
              <article>
                <h3>Design-system checks</h3>
                <p>Tests assert the manifest, token adapter, component contracts, pattern contracts, specimens, provenance hashes, accessibility policy, and Lucide icon catalog.</p>
              </article>
              <article>
                <h3>Browser checks</h3>
                <p>Desktop and mobile review checked no horizontal overflow, visible next-section hint, working menus, and contrast ratios.</p>
              </article>
            </div>
          </section>
          <section id="review-notes">
            <h2>Review notes</h2>
            <p>If you are reviewing whether this is a real rebuild, start with the source diff and tests. If you are reviewing whether it uses the JudgmentKit design system, start with the design-system route, JSON exports, specimen provenance, and the tests that hash those outputs.</p>
            <p>The remaining judgment call is product-level: whether the public story should expose more of this evidence earlier, or keep the homepage focused on the offer and leave this page in evals.</p>
          </section>
        </article>
      </div>
    </section>
  `,
    {
      description:
        "Audit log for the judgmentkit.ai rebuild, including dogfood steps, design-system evidence, source files, and verification commands.",
      path: "/evals/site-rebuild-log/",
    },
  );
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
        <a class="pill-link" href="/evals/judgmentkit-mcp/">JudgmentKit MCP report</a>
        <a class="pill-link" href="/evals/site-rebuild-log/">Site rebuild log</a>
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
  const designSystemModel = buildDesignSystemContentModel();

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(outDir, "docs"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system", "tokens"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system", "fonts"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system", "icons"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system", "components"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system", "patterns"), { recursive: true });
  await fs.mkdir(path.join(outDir, "design-system", "accessibility"), { recursive: true });
  await fs.mkdir(path.join(outDir, "evals"), { recursive: true });
  await fs.mkdir(path.join(outDir, "evals", "judgmentkit-mcp"), { recursive: true });
  await fs.mkdir(path.join(outDir, "evals", "site-rebuild-log"), { recursive: true });
  await fs.mkdir(path.join(outDir, "examples"), { recursive: true });
  await fs.mkdir(path.join(outDir, "value"), { recursive: true });

  await fs.writeFile(path.join(outDir, "assets", "site.css"), stylesheet.trimStart());
  const socialThumbnailSourcePath = path.join(__dirname, "assets", SOCIAL_THUMBNAIL_SOURCE_FILENAME);
  await fs.copyFile(
    socialThumbnailSourcePath,
    path.join(outDir, "assets", SOCIAL_THUMBNAIL_FILENAME),
  );
  await fs.copyFile(
    socialThumbnailSourcePath,
    path.join(outDir, "assets", SOCIAL_THUMBNAIL_SOURCE_FILENAME),
  );
  await buildSystemMapFlowAssets(outDir);
  await fs.writeFile(
    path.join(outDir, "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#133f4e"/><path d="M18 34.5 28 44l19-24" fill="none" stroke="#f8f7f2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`,
  );
  await fs.writeFile(path.join(outDir, "index.html"), homepage());
  await fs.writeFile(path.join(outDir, "robots.txt"), "User-agent: *\nAllow: /\n");
  await fs.writeFile(path.join(outDir, "value", "index.html"), await valuePage());
  await fs.writeFile(path.join(outDir, "docs", "index.html"), docsPage());
  await fs.writeFile(path.join(outDir, "design-system", "index.html"), renderDesignSystemOverviewPage(designSystemModel));
  await fs.writeFile(path.join(outDir, "design-system", "tokens", "index.html"), renderDesignSystemTokensPage(designSystemModel));
  await fs.writeFile(path.join(outDir, "design-system", "fonts", "index.html"), renderDesignSystemFontsPage(designSystemModel));
  await fs.writeFile(path.join(outDir, "design-system", "icons", "index.html"), renderDesignSystemIconsPage(designSystemModel));
  await fs.writeFile(path.join(outDir, "design-system", "components", "index.html"), renderDesignSystemComponentsPage(designSystemModel));
  await fs.writeFile(path.join(outDir, "design-system", "patterns", "index.html"), renderDesignSystemPatternsPage(designSystemModel));
  await fs.writeFile(path.join(outDir, "design-system", "accessibility", "index.html"), renderDesignSystemAccessibilityPage(designSystemModel));
  await fs.writeFile(
    path.join(outDir, "design-system", "manifest.json"),
    jsonExport(designSystemModel.exports.manifest),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "visual-token-adapter.json"),
    jsonExport(designSystemModel.exports.visualTokenAdapter),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "component-contracts.json"),
    jsonExport(designSystemModel.exports.componentContracts),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "pattern-contracts.json"),
    jsonExport(designSystemModel.exports.patternContracts),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "component-specimens.json"),
    jsonExport(designSystemModel.exports.componentSpecimens),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "pattern-specimens.json"),
    jsonExport(designSystemModel.exports.patternSpecimens),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "specimen-provenance.json"),
    jsonExport(designSystemModel.exports.specimenProvenance),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "accessibility-policy.json"),
    jsonExport(designSystemModel.exports.accessibilityPolicy),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "icon-scenarios.json"),
    jsonExport(designSystemModel.exports.iconScenarios),
  );
  await fs.writeFile(path.join(outDir, "design-system", "llms.txt"), renderDesignSystemLlms(designSystemModel));
  await fs.writeFile(
    path.join(outDir, "design-system", "llms-full.txt"),
    renderDesignSystemLlmsFull(designSystemModel),
  );
  for (const pageEntry of designSystemModel.pages) {
    const markdownPath = pageEntry.markdown_path.replace(/^\/design-system\/?/, "");
    await fs.writeFile(
      path.join(outDir, "design-system", markdownPath),
      renderDesignSystemPageMarkdown(designSystemModel, pageEntry),
    );
  }
  await fs.writeFile(path.join(outDir, "examples", "index.html"), await examplesPage());
  await fs.writeFile(path.join(outDir, "install"), await bootstrapScript(), { mode: 0o755 });
  await fs.writeFile(
    path.join(outDir, "llms.txt"),
    [
      "# JudgmentKit",
      "",
      "JudgmentKit is an activity-first judgment layer for AI-generated product work.",
      "",
      "- /value/",
      "- /docs/",
      "- /design-system/",
      "- /design-system/llms.txt",
      "- /examples/",
      "- /evals/",
      "- /evals/judgmentkit-mcp/",
      "- /evals/site-rebuild-log/",
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
  await copyIfExists("examples/lucide-icon-catalog-smoke.html", path.join(outDir, "examples", "lucide-icon-catalog-smoke.html"));
  await copyDirectoryIfExists("examples/ai-native-design-system", path.join(outDir, "examples", "ai-native-design-system"));
  await copyDirectoryIfExists("evals/reports", path.join(outDir, "evals"));
  await copyDirectoryIfExists("evals/reports", path.join(outDir, "examples", "evals"));
  await fs.writeFile(path.join(outDir, "evals", "index.html"), await evalsPage());
  await fs.writeFile(
    path.join(outDir, "evals", "judgmentkit-mcp", "index.html"),
    await judgmentKitMcpReportPage(),
  );
  await fs.writeFile(
    path.join(outDir, "evals", "site-rebuild-log", "index.html"),
    siteRebuildLogPage(designSystemModel),
  );
  await copyDirectoryIfExists("examples/model-ui", path.join(outDir, "examples", "model-ui"));
  await copyDirectoryIfExists("experiments", path.join(outDir, "experiments"));

  return {
    out_dir: outDir,
    routes: [
      "/",
      "/value/",
      "/docs/",
      ...DESIGN_SYSTEM_ROUTES,
      "/examples/",
      "/evals/",
      "/evals/judgmentkit-mcp/",
      "/evals/site-rebuild-log/",
      "/install",
      "/mcp",
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { outDir } = parseArgs(process.argv.slice(2));
  const result = await buildSite(outDir);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
