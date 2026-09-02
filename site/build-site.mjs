#!/usr/bin/env node
import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildWithEsbuild } from "esbuild";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  ActionButton,
  ActionGroup,
  SelectField,
  TextArea,
  TextField,
} from "../src/react/index.mjs";

import {
  JUDGMENTKIT_MCP_TOOL_NAMES,
} from "../scripts/install-mcp.mjs";
import {
  COMPONENT_IMPLEMENTATION_REGISTRY,
  COMPONENT_RUNTIME_ADAPTER,
  createUiImplementationContract,
  coveredStatesForContract,
  createComponentScenarioManifest,
  getIconSvg,
  listComponentReferenceInventory,
  listComponentImplementationRegistry,
  listIconCatalog,
  listSurfacePresentationProfiles,
  loadActivityContract,
  searchIconCatalog,
  summarizeComponentReferenceCoverage,
} from "../src/index.mjs";
import {
  ComponentSpecimenPreview,
  RUNTIME_COMPONENT_IDS,
} from "./component-specimen-runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT_DIR = path.join(__dirname, "dist");
const require = createRequire(import.meta.url);
const ANALYTICS_SDK_VERSION = require("@vercel/analytics/package.json").version;
const JUDGMENTKIT_PACKAGE_VERSION = require("../package.json").version;
const ACTIVITY_CONTRACT = loadActivityContract();
const SYSTEM_MAP_FLOW_ASSET_VERSION = "judgmentkit-flow-design-source-authority";
const COMPONENT_SPECIMEN_ASSET_VERSION =
  "judgmentkit-react-component-candidate-v1";
const SITE_ORIGIN = "https://judgmentkit.ai";
const GITHUB_RELEASE_URL =
  `https://github.com/mikeylong/judgmentkit/releases/tag/v${JUDGMENTKIT_PACKAGE_VERSION}`;
const SOCIAL_THUMBNAIL_SOURCE_FILENAME = "judgmentkit-social-thumbnail.png";
const SOCIAL_THUMBNAIL_FILENAME = "judgmentkit-social-thumbnail-20260723-v2.png";
const SOCIAL_THUMBNAIL_PATH = `/assets/${SOCIAL_THUMBNAIL_FILENAME}`;
const SOCIAL_THUMBNAIL_ALT = "JudgmentKit. Before the UI.";
const HOMEPAGE_HERO_ART_FILENAME = "judgment-lens-hero.webp";
const HOMEPAGE_HERO_ART_PATH = `/assets/${HOMEPAGE_HERO_ART_FILENAME}`;
const VISUAL_COMPOSITION_RECORDING_FILENAME =
  "judgmentkit-select-field-agent-demo.mp4";
const VISUAL_COMPOSITION_DARK_RECORDING_FILENAME =
  "judgmentkit-select-field-agent-demo-dark.mp4";
const VISUAL_COMPOSITION_POSTER_FILENAME =
  "judgmentkit-select-field-agent-demo-poster.png";
const VISUAL_COMPOSITION_DARK_POSTER_FILENAME =
  "judgmentkit-select-field-agent-demo-poster-dark.png";
const VISUAL_COMPOSITION_LIVE_DEMO_FILENAME =
  "visual-composition-runtime-demo.html";
const VISUAL_COMPOSITION_RECORDING_PATH =
  `/assets/releases/${VISUAL_COMPOSITION_RECORDING_FILENAME}`;
const VISUAL_COMPOSITION_DARK_RECORDING_PATH =
  `/assets/releases/${VISUAL_COMPOSITION_DARK_RECORDING_FILENAME}`;
const VISUAL_COMPOSITION_POSTER_PATH =
  `/assets/releases/${VISUAL_COMPOSITION_POSTER_FILENAME}`;
const VISUAL_COMPOSITION_DARK_POSTER_PATH =
  `/assets/releases/${VISUAL_COMPOSITION_DARK_POSTER_FILENAME}`;
const HOMEPAGE_FILM_ENABLED = false;
const DESIGN_SYSTEM_SPECIMEN_RENDERER = {
  id: "judgmentkit-static-specimens",
  version: "0.2.0",
};
const COMPONENT_SPECIMEN_RENDERER = {
  id: COMPONENT_RUNTIME_ADAPTER.id,
  version: JUDGMENTKIT_PACKAGE_VERSION,
  package_export: COMPONENT_RUNTIME_ADAPTER.package_export,
  stylesheet_export: COMPONENT_RUNTIME_ADAPTER.stylesheet_export,
};
const COMPONENT_EVIDENCE_PATH = path.join(
  ROOT,
  "docs",
  "evidence",
  "component-library-candidate-evidence.json",
);
const COMPONENT_EVIDENCE_FIXTURE_SOURCES = Object.freeze([
  "site/component-specimen-runtime.mjs",
  "site/component-specimens.jsx",
]);
const COMPONENT_EVIDENCE_BINDING_SOURCES = Object.freeze([
  "package.json",
  "package-lock.json",
  "src/component-registry.mjs",
  "src/index.mjs",
  "site/build-site.mjs",
  ...COMPONENT_EVIDENCE_FIXTURE_SOURCES,
  "tests/components/component-browser.test.mjs",
  "tests/components/component-package-surface.test.mjs",
  "tests/components/support/chromium-harness.mjs",
  "tests/components/support/indeterminate-browser-probe.jsx",
]);

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

function readJsonSyncIfExists(filePath) {
  try {
    return JSON.parse(fsSync.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function hashComponentAutomatedEvidence(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    return null;
  }
  const {
    reviewer_receipt: _reviewerReceipt,
    automated_evidence_hash: _automatedEvidenceHash,
    ...automatedPayload
  } = bundle;
  return hashCanonical(automatedPayload);
}

function validateReviewerReceipt(bundle) {
  if (!bundle?.reviewer_receipt) return bundle;

  const receipt = bundle.reviewer_receipt;
  const receiptPath = receipt.path;
  const expectedHash = receipt.hash;
  const safePrefix = `docs${path.sep}evidence${path.sep}`;
  const currentAutomatedEvidenceHash = hashComponentAutomatedEvidence(bundle);
  let currentHash = null;
  let receiptDocument = null;

  if (
    typeof receiptPath === "string" &&
    receiptPath.length > 0 &&
    !path.isAbsolute(receiptPath) &&
    path.normalize(receiptPath).startsWith(safePrefix) &&
    typeof expectedHash === "string" &&
    expectedHash.length > 0
  ) {
    try {
      const receiptText = fsSync.readFileSync(
        path.resolve(ROOT, receiptPath),
        "utf8",
      );
      currentHash = hashText(receiptText);
      receiptDocument = JSON.parse(receiptText);
    } catch {
      currentHash = null;
      receiptDocument = null;
    }
  }

  if (
    currentHash === expectedHash &&
    receipt.status === "pass" &&
    receiptDocument?.status === "pass" &&
    typeof bundle.automated_evidence_hash === "string" &&
    bundle.automated_evidence_hash === currentAutomatedEvidenceHash &&
    receiptDocument.automated_evidence_hash === currentAutomatedEvidenceHash
  ) {
    return {
      ...bundle,
      reviewer_receipt: {
        ...receiptDocument,
        path: receiptPath,
        hash: expectedHash,
        status: "pass",
        validation:
          "content, machine-readable scope, and automated evidence payload loaded",
      },
    };
  }

  return {
    ...bundle,
    reviewer_receipt: {
      ...receipt,
      status: "stale",
      validation:
        "missing, unsafe, non-JSON, failed, content hash mismatch, or automated evidence payload mismatch",
    },
  };
}

function buildComponentEvidenceContext(componentContracts, specimenContext) {
  const implementedEntries = COMPONENT_IMPLEMENTATION_REGISTRY.filter(
    (entry) => entry.implementation_status === "implemented",
  );
  const sourcePaths = [
    ...new Set(
      [
        ...implementedEntries.flatMap((entry) => entry.implementation_sources),
        ...COMPONENT_EVIDENCE_BINDING_SOURCES,
      ],
    ),
  ];
  const implementationHash = hashCanonical({
    adapter: COMPONENT_RUNTIME_ADAPTER,
    sources: sourcePaths.map((sourcePath) => ({
      path: sourcePath,
      hash: hashText(fsSync.readFileSync(path.join(ROOT, sourcePath), "utf8")),
    })),
  });
  const contractHashes = Object.fromEntries(
    componentContracts.map((contract) => [
      contract.id,
      hashCanonical(contract),
    ]),
  );
  const implementationHashes = Object.fromEntries(
    implementedEntries.map((entry) => [entry.contract_id, implementationHash]),
  );
  const neutralScenarios = createComponentScenarioManifest(
    componentContracts,
    COMPONENT_IMPLEMENTATION_REGISTRY,
    {
      contract_hashes: contractHashes,
      implementation_hashes: implementationHashes,
      implementation_hash: implementationHash,
    },
  );
  const contractById = new Map(
    componentContracts.map((contract) => [contract.id, contract]),
  );
  const fixtureOutputHashes = Object.fromEntries(
    implementedEntries.map((entry) => {
      const contract = contractById.get(entry.contract_id);
      const renderedHtml = renderComponentSpecimenPreview(
        contract,
        {
          ...specimenContext,
          contract_hash: contractHashes[entry.contract_id],
        },
        neutralScenarios.filter(
          (scenario) => scenario.contract_id === entry.contract_id,
        ),
      );
      return [entry.contract_id, hashText(renderedHtml)];
    }),
  );
  const bundle = validateReviewerReceipt(
    readJsonSyncIfExists(COMPONENT_EVIDENCE_PATH),
  );
  const scenarios = createComponentScenarioManifest(
    componentContracts,
    COMPONENT_IMPLEMENTATION_REGISTRY,
    {
      bundle,
      contract_hashes: contractHashes,
      implementation_hashes: implementationHashes,
      implementation_hash: implementationHash,
      fixture_output_hashes: fixtureOutputHashes,
    },
  );
  const current =
    Boolean(bundle) &&
    scenarios.length > 0 &&
    scenarios.every((scenario) => scenario.status === "verified");

  return {
    bundle,
    current,
    contract_hashes: contractHashes,
    implementation_hashes: implementationHashes,
    implementation_hash: implementationHash,
    implementation_sources: sourcePaths,
    fixture_output_hashes: fixtureOutputHashes,
    scenarios,
  };
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

function isPrimaryNavCurrent(link, pathName) {
  if (link.href === "/") return pathName === "/";
  if (link.href === "/mcp") return pathName === "/mcp";
  return pathName === link.href || pathName.startsWith(link.href);
}

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

function renderPlatformHeader(pathName = "/") {
  return `    <nav class="surfaces-navigation" aria-label="Surfaces platform" data-surfaces-navigation>
      <div class="surfaces-navigation-inner">
        <div class="surfaces-navigation-left">
          <a class="surfaces-navigation-identifier" href="/"${pathName === "/" ? ' aria-current="page"' : ""}>JudgmentKit</a>
          <div class="surfaces-navigation-sections" aria-label="Primary">
            ${primaryNavLinks
              .map((link) => {
                const current = isPrimaryNavCurrent(link, pathName)
                  ? ' aria-current="page"'
                  : "";
                return `<a href="${escapeHtml(link.href)}"${current}>${escapeHtml(link.label)}</a>`;
              })
              .join("\n            ")}
          </div>
          <div class="surfaces-primary-menu" data-surfaces-primary-menu-root>
            <button
              class="surfaces-primary-menu-button"
              type="button"
              aria-label="Open primary navigation"
              aria-expanded="false"
              aria-controls="surfaces-primary-menu"
              aria-haspopup="true"
              data-surfaces-primary-menu-button
            >
              <span>Menu</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"></path>
              </svg>
            </button>
            <div class="surfaces-primary-menu-backdrop" hidden data-surfaces-primary-menu-backdrop></div>
            <div class="surfaces-primary-menu-list" id="surfaces-primary-menu" hidden data-surfaces-primary-menu-list>
              ${primaryNavLinks
                .map((link) => {
                  const current = isPrimaryNavCurrent(link, pathName)
                    ? ' aria-current="page"'
                    : "";
                  return `<a href="${escapeHtml(link.href)}"${current}>${escapeHtml(link.label)}</a>`;
                })
                .join("\n              ")}
            </div>
          </div>
        </div>
        <div class="surfaces-navigation-right">
          <div class="surfaces-system-switch" data-surfaces-system-switch>
            <button class="surfaces-system-switch-button" type="button" aria-expanded="false" aria-haspopup="true" data-surfaces-system-menu-button>
              <span>judgmentkit.ai</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"></path>
              </svg>
            </button>
            <div class="surfaces-system-switch-backdrop" hidden data-surfaces-system-menu-backdrop></div>
            <div class="surfaces-system-switch-menu" hidden data-surfaces-system-menu>
            ${platformSites
              .map((site) => {
                const isCurrent = site.id === "judgmentkit";
                const nameClass =
                  site.id === "interfacectl" || site.id === "surfaces-dev"
                    ? "surfaces-system-switch-name surfaces-system-switch-name-mono"
                    : "surfaces-system-switch-name";

                return `<a href="${escapeHtml(site.href)}"${isCurrent ? ' aria-current="page"' : ""}>
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

          const setOpen = (open, options = {}) => {
            button.setAttribute("aria-expanded", String(open));
            menu.hidden = !open;
            backdrop.hidden = !open;
            if (!open && options.restoreFocus) button.focus();
          };

          button.addEventListener("click", () => {
            setOpen(button.getAttribute("aria-expanded") !== "true");
          });

          backdrop.addEventListener("click", () => setOpen(false));
          menu.addEventListener("click", (event) => {
            if (event.target.closest("a")) setOpen(false);
          });
          document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
              event.preventDefault();
              setOpen(false, { restoreFocus: true });
            }
          });
        };

        const bindSectionRailCurrent = (root) => {
          const links = Array.from(root.querySelectorAll("[data-section-rail-link][href^='#']"));
          const label = root.querySelector("[data-section-rail-current-label]");
          if (links.length === 0) return;

          const targetForLink = (link) => link.getAttribute("data-section-rail-target") || "";
          const items = [];
          const seen = new Set();

          for (const link of links) {
            const id = targetForLink(link);
            if (!id || seen.has(id)) continue;
            const section = document.getElementById(id);
            if (!section) continue;
            seen.add(id);
            items.push({
              id,
              label: link.textContent.trim(),
              section,
            });
          }

          if (items.length === 0) return;

          const hasItem = (id) => items.some((item) => item.id === id);
          let currentId = "";

          const setCurrent = (id) => {
            if (!hasItem(id) || id === currentId) return;
            currentId = id;
            let currentLabel = "";

            for (const link of links) {
              if (targetForLink(link) === id) {
                link.setAttribute("aria-current", "location");
                currentLabel = currentLabel || link.textContent.trim();
              } else {
                link.removeAttribute("aria-current");
              }
            }

            if (label && currentLabel) label.textContent = currentLabel;
          };

          const targetFromHash = () => {
            if (!window.location.hash || window.location.hash.length <= 1) return "";
            try {
              return decodeURIComponent(window.location.hash.slice(1));
            } catch {
              return window.location.hash.slice(1);
            }
          };

          const markerTop = () => {
            const rail = root.querySelector(".section-rail-nav");
            if (rail && getComputedStyle(rail).display !== "none") {
              return rail.getBoundingClientRect().top + 24;
            }
            const railTop = rail ? Number.parseFloat(getComputedStyle(rail).top) : Number.NaN;
            if (!Number.isNaN(railTop)) return railTop + 40;
            const navigation = document.querySelector("[data-surfaces-navigation]");
            return (navigation ? navigation.getBoundingClientRect().bottom : 56) + 40;
          };

          const updateFromScroll = () => {
            const marker = markerTop();
            let nextId = items[0].id;
            for (const item of items) {
              if (item.section.getBoundingClientRect().top <= marker) {
                nextId = item.id;
              }
            }
            setCurrent(nextId);
          };

          let scheduled = false;
          const scheduleUpdate = () => {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(() => {
              scheduled = false;
              updateFromScroll();
            });
          };

          for (const link of links) {
            link.addEventListener("click", () => {
              setCurrent(targetForLink(link));
            });
          }

          window.addEventListener("hashchange", () => {
            const hashTarget = targetFromHash();
            if (hasItem(hashTarget)) {
              setCurrent(hashTarget);
            } else {
              scheduleUpdate();
            }
          });
          window.addEventListener("scroll", scheduleUpdate, { passive: true });
          window.addEventListener("resize", scheduleUpdate);

          const initialTarget = targetFromHash();
          if (hasItem(initialTarget)) {
            setCurrent(initialTarget);
            const restoreHashTarget = () => {
              const hashTarget = targetFromHash();
              if (hasItem(hashTarget)) setCurrent(hashTarget);
            };
            window.requestAnimationFrame(restoreHashTarget);
            window.setTimeout(restoreHashTarget, 80);
          } else {
            setCurrent(items[0].id);
            scheduleUpdate();
          }
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

        for (const sectionMenu of document.querySelectorAll("[data-section-rail-menu]")) {
          bindMenu({
            button: sectionMenu.querySelector("[data-section-rail-menu-button]"),
            menu: sectionMenu.querySelector("[data-section-rail-menu-list]"),
            backdrop: sectionMenu.querySelector("[data-section-rail-menu-backdrop]"),
          });
        }

        for (const railRoot of document.querySelectorAll("[data-section-rail-current='sections']")) {
          bindSectionRailCurrent(railRoot);
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
${renderPlatformHeader(pathName)}
    <main>${body}</main>
${renderSiteFooter()}
${platformNavigationScript()}
  </body>
</html>`;
}

function renderSiteFooter() {
  return `    <footer class="site-footer">
      <div class="site-shell site-footer-inner">
        <span class="site-footer-brand">JudgmentKit</span>
        <a class="site-footer-release" href="${escapeHtml(GITHUB_RELEASE_URL)}" aria-label="Release v${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)} on GitHub">
          <span>Release v${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>`;
}

function systemMapFlowAssets() {
  return `    <link rel="stylesheet" href="/assets/system-map-flow.css?v=${SYSTEM_MAP_FLOW_ASSET_VERSION}">
    <script type="module" src="/assets/system-map-flow.js?v=${SYSTEM_MAP_FLOW_ASSET_VERSION}"></script>`;
}

function componentSpecimenStylesheet() {
  return `    <link rel="stylesheet" href="/assets/component-specimens.css?v=${COMPONENT_SPECIMEN_ASSET_VERSION}">`;
}

function componentSpecimenAssets() {
  return `${componentSpecimenStylesheet()}
    <script type="module" src="/assets/component-specimens.js?v=${COMPONENT_SPECIMEN_ASSET_VERSION}"></script>`;
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
          <desc id="${escapeHtml(descId)}">A static fallback node and edge diagram showing source context, the MCP boundary, JudgmentKit kernel, optional LLM provider seam, UI rendering outside JudgmentKit, design-system source choices with provenance, blocked path, and iteration with updated context returning to source and activity review.</desc>
          <defs>
            <marker id="system-map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path class="map-arrow" d="M 0 0 L 10 5 L 0 10 z"></path>
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
          <text class="map-node-text" x="1258" y="696">Renderer may vary; active</text>
          <text class="map-node-text" x="1258" y="720">design-system provenance is required.</text>
          <rect class="map-node map-node-output" x="1240" y="774" width="204" height="112" rx="12"></rect>
          <text class="map-node-title" x="1258" y="806">External adapter</text>
          <text class="map-node-text" x="1258" y="830">Complete tokens, components,</text>
          <text class="map-node-text" x="1258" y="854">patterns, and provenance.</text>
          <rect class="map-node map-node-output" x="1470" y="774" width="204" height="112" rx="12"></rect>
          <text class="map-node-title" x="1488" y="806">JudgmentKit default</text>
          <text class="map-node-text" x="1488" y="830">Use /design-system/ exports;</text>
          <text class="map-node-text" x="1488" y="854">no fallback from failed adapters.</text>
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
          <text class="map-edge-label" x="1246" y="760">external adapter</text>
          <path class="map-edge map-edge-output" d="M 1457 746 C 1560 746 1572 774 1572 774"></path>
          <text class="map-edge-label" x="1500" y="760">default source</text>
          <path class="map-edge map-edge-output" d="M 1342 886 C 1342 904 1457 904 1457 916"></path>
          <path class="map-edge map-edge-output" d="M 1572 886 C 1572 904 1457 904 1457 916"></path>
          <path class="map-edge" d="M 1240 958 C 1068 920 912 914 754 914"></path>
          <text class="map-edge-label" x="1030" y="930">review draft</text>
          <path class="map-edge map-edge-muted" d="M 754 914 L 804 914"></path>
          <path class="map-edge" d="M 804 914 C 640 760 420 420 342 314"></path>
          <text class="map-edge-label" x="492" y="766">updated context returns to source/activity review</text>
        </svg>`;
}

const siteVisualTokenAdapter = defaultVisualTokenAdapter();
const designSystemAppearanceStylesheet = cssCustomPropertyBlock(
  siteVisualTokenAdapter.css_custom_properties,
  siteVisualTokenAdapter.appearance_policy,
  siteVisualTokenAdapter.appearance_token_sets,
);

const stylesheet = `
:root {
  color-scheme: light dark;
  --bg: #f8f7f2;
  --ink: #171717;
  --muted: #61615c;
  --line: #d7d3c8;
  --panel: #ffffff;
  --accent: #245f73;
  --accent-strong: #133f4e;
  --accent-ink: #ffffff;
  --ok: #2e6b48;
  --warn: #8a5a16;
  --risk: #8f342f;
  --disabled: #8a8f93;
  --receipt: #23615f;
  --nav-bg: rgba(255, 255, 255, 0.98);
  --nav-border: #e5e5e5;
  --nav-muted: #525252;
  --focus-ring: rgba(36, 95, 115, 0.28);
  --step-marker-bg: #245f73;
  --step-marker-ink: #ffffff;
  --menu-item-bg: #ffffff;
  --menu-item-bg-hover: #fafafa;
  --menu-item-bg-current: #f5f5f5;
  --soft-surface: #fbfaf6;
  --code-surface: #f5f3ec;
  --media-surface: #f2f1eb;
  --table-heading-surface: #f3f0e7;
  --bar-track: #eee9dc;
  --status-success-bg: #f4fbf6;
  --status-warning-bg: rgba(138, 90, 22, 0.09);
  --captured-artifact-bg: #ffffff;
  --fixed-light-ink: #ffffff;
  --hero-art-bg: #08181d;
  --homepage-film-control-ink: var(--accent-strong);
  --homepage-film-control-surface: color-mix(in srgb, var(--panel) 88%, transparent);
  --homepage-film-control-surface-hover: color-mix(in srgb, var(--panel) 96%, transparent);
  --homepage-film-control-surface-solid: var(--panel);
  --homepage-film-control-border: color-mix(in srgb, var(--accent-strong) 28%, transparent);
  --homepage-film-control-border-hover: color-mix(in srgb, var(--accent-strong) 44%, transparent);
  --homepage-film-control-shadow: color-mix(in srgb, var(--accent-strong) 16%, transparent);
  --hero-art-overlay:
    linear-gradient(180deg, rgba(4, 18, 23, 0) 58%, rgba(4, 18, 23, 0.3) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.07), transparent 24%);
  --modal-backdrop-bg: rgba(20, 28, 31, 0.72);
  --modal-media-stage-bg: #10181b;
  --report-toc-bg: rgba(255, 255, 255, 0.72);
  --report-chart-grid: rgba(23, 23, 23, 0.1);
  --system-map-bg: #fbfaf6;
  --system-map-zone-bg: rgba(255, 255, 255, 0.78);
  --system-map-node-bg: #ffffff;
  --system-map-node-kernel-bg: #eef5f3;
  --system-map-node-llm-bg: #fbf3e7;
  --system-map-node-output-bg: #f0f8f2;
  --system-map-node-blocked-bg: #fff7ec;
  --hero-bg-end: #edf2ef;
  --hero-glow: rgba(36, 95, 115, 0.17);
  --hero-action-secondary-bg: rgba(255, 255, 255, 0.62);
  --hero-art-border: rgba(255, 255, 255, 0.34);
  --hero-art-shadow: rgba(15, 35, 41, 0.22);
  --eval-serif: "Source Serif 4", "Iowan Old Style", Charter, "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --site-gutter: clamp(18px, 4vw, 56px);
  --site-shell-width: 1220px;
  --site-reading-width: 820px;
  --site-reading-wide: 980px;
  --site-rail-width: 180px;
  --site-rail-gap: 28px;
  --site-page-top: clamp(36px, 5vw, 62px);
  --site-navigation-height: 56px;
  --section-rail-top: calc(var(--site-navigation-height) + var(--site-page-top));
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #101312;
    --ink: #f2f4ef;
    --muted: #b8c0bb;
    --line: #39423f;
    --panel: #181d1b;
    --accent: #7db6c7;
    --accent-strong: #a9d7e4;
    --accent-ink: #101312;
    --ok: #82c99a;
    --warn: #e0b15d;
    --risk: #e37d76;
    --disabled: #7d8580;
    --receipt: #80cbc7;
    --nav-bg: rgba(16, 19, 18, 0.96);
    --nav-border: #29312e;
    --nav-muted: #b8c0bb;
    --focus-ring: rgba(125, 182, 199, 0.38);
    --step-marker-bg: #a9d7e4;
    --step-marker-ink: #101312;
    --menu-item-bg: #181d1b;
    --menu-item-bg-hover: #202723;
    --menu-item-bg-current: #25312d;
    --soft-surface: #151a18;
    --code-surface: #1b211f;
    --media-surface: #141917;
    --table-heading-surface: #202724;
    --bar-track: #29312e;
    --status-success-bg: rgba(130, 201, 154, 0.14);
    --status-warning-bg: rgba(224, 177, 93, 0.16);
    --homepage-film-control-ink: var(--fixed-light-ink);
    --homepage-film-control-surface: color-mix(in srgb, var(--hero-art-bg) 78%, transparent);
    --homepage-film-control-surface-hover: color-mix(in srgb, var(--hero-art-bg) 88%, transparent);
    --homepage-film-control-surface-solid: var(--hero-art-bg);
    --homepage-film-control-border: color-mix(in srgb, var(--fixed-light-ink) 48%, transparent);
    --homepage-film-control-border-hover: color-mix(in srgb, var(--fixed-light-ink) 64%, transparent);
    --homepage-film-control-shadow: color-mix(in srgb, var(--hero-art-bg) 18%, transparent);
    --report-toc-bg: rgba(24, 29, 27, 0.88);
    --report-chart-grid: rgba(242, 244, 239, 0.12);
    --system-map-bg: #151a18;
    --system-map-zone-bg: rgba(24, 29, 27, 0.82);
    --system-map-node-bg: #181d1b;
    --system-map-node-kernel-bg: rgba(125, 182, 199, 0.14);
    --system-map-node-llm-bg: rgba(224, 177, 93, 0.14);
    --system-map-node-output-bg: rgba(130, 201, 154, 0.14);
    --system-map-node-blocked-bg: rgba(224, 177, 93, 0.18);
    --hero-bg-end: #15211e;
    --hero-glow: rgba(125, 182, 199, 0.15);
    --hero-action-secondary-bg: rgba(24, 29, 27, 0.72);
    --hero-art-border: rgba(169, 215, 228, 0.2);
    --hero-art-shadow: rgba(0, 0, 0, 0.46);
  }
}
${designSystemAppearanceStylesheet}
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
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
a {
  color: var(--accent-strong);
}
[id] {
  scroll-margin-top: 126px;
}
.surfaces-navigation {
  height: 56px;
  background-color: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
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
  display: inline-flex;
  align-items: center;
  min-height: 32px;
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
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--nav-muted);
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 400;
  text-decoration: none;
  transition: color 0.12s linear;
}
.surfaces-navigation-sections a:hover,
.surfaces-navigation-sections a:focus-visible,
.surfaces-navigation-sections a[aria-current="page"] {
  color: var(--ink);
}
.surfaces-navigation-identifier:focus-visible,
.surfaces-navigation-sections a:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px var(--focus-ring);
}
.surfaces-navigation-identifier[aria-current="page"],
.surfaces-navigation-sections a[aria-current="page"] {
  font-weight: 800;
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
  border: 1px solid var(--nav-border);
  border-radius: 4px;
  background-color: var(--panel);
  color: var(--nav-muted);
  cursor: pointer;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 500;
}
.surfaces-primary-menu-button:hover,
.surfaces-primary-menu-button:focus-visible {
  color: var(--ink);
  outline: 0;
}
.surfaces-primary-menu-button:focus-visible {
  box-shadow: 0 0 0 2px var(--focus-ring);
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
  border: 1px solid var(--nav-border);
  border-radius: 4px;
  background-color: var(--menu-item-bg);
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
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.12s linear;
}
.surfaces-primary-menu-list a:hover,
.surfaces-primary-menu-list a:focus-visible {
  background-color: var(--menu-item-bg-hover);
  outline: 0;
}
.surfaces-primary-menu-list a[aria-current="page"] {
  background-color: var(--menu-item-bg-current);
  font-weight: 850;
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
  color: var(--nav-muted);
  cursor: pointer;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 400;
  transition: color 0.12s linear;
}
.surfaces-system-switch-button:hover,
.surfaces-system-switch-button:focus-visible {
  color: var(--ink);
  outline: 0;
}
.surfaces-system-switch-button:focus-visible {
  box-shadow: 0 0 0 2px var(--focus-ring);
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
  border: 1px solid var(--nav-border);
  border-radius: 4px;
  background-color: var(--menu-item-bg);
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
  background-color: var(--menu-item-bg-current);
}
.surfaces-system-switch-menu a:hover,
.surfaces-system-switch-menu a:focus-visible {
  background-color: var(--menu-item-bg-hover);
  outline: 0;
}
.surfaces-system-switch-menu a[aria-current="page"]:hover,
.surfaces-system-switch-menu a[aria-current="page"]:focus-visible {
  background-color: var(--menu-item-bg-current);
}
.surfaces-system-switch-name {
  display: block;
  margin-bottom: 4px;
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
}
.surfaces-system-switch-name-mono {
  font-family: "JetBrains Mono", monospace;
}
.surfaces-system-switch-description {
  display: block;
  color: var(--muted);
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
  padding: clamp(42px, 7vw, 86px) var(--site-gutter);
}
.site-shell {
  width: 100%;
  max-width: var(--site-shell-width);
  margin-right: auto;
  margin-left: auto;
  min-width: 0;
}
.site-footer {
  padding: 18px var(--site-gutter) 20px;
  border-top: 1px solid var(--line);
}
.site-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.site-footer-brand {
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 13px;
  font-weight: 600;
}
.site-footer-release {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-strong);
  font-family: Inter, sans-serif;
  font-size: 13px;
  font-weight: 400;
  text-decoration: none;
}
.site-footer-release:hover,
.site-footer-release:focus-visible {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.site-footer-release:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px var(--focus-ring);
}
.site-page-header {
  max-width: var(--site-reading-width);
}
.site-page-header-wide {
  max-width: var(--site-reading-wide);
}
.site-reading {
  max-width: var(--site-reading-width);
}
.site-reading-wide {
  max-width: var(--site-reading-wide);
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
  min-height: 78vh;
}
.homepage-hero {
  position: relative;
  display: block;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(circle at 77% 24%, var(--hero-glow), transparent 34%),
    linear-gradient(132deg, var(--bg) 0%, var(--bg) 54%, var(--hero-bg-end) 100%);
}
.homepage-hero::before {
  content: "";
  position: absolute;
  z-index: -1;
  top: 12%;
  right: -9%;
  width: min(54vw, 760px);
  aspect-ratio: 1;
  border: 1px solid var(--hero-glow);
  border-radius: 50%;
  opacity: 0.55;
  pointer-events: none;
  transform: translate3d(0, 0, 0);
}
.homepage-hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.82fr);
  gap: clamp(40px, 6vw, 78px);
  align-items: center;
  min-height: clamp(590px, calc(100vh - var(--site-navigation-height)), 780px);
}
.homepage-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 690px;
  padding-block: 28px;
}
.homepage-hero .eyebrow {
  display: inline-flex;
  align-items: center;
  margin-bottom: 24px;
  font-size: 13px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.homepage-hero h1 {
  max-width: 10.8ch;
  margin-bottom: 26px;
  font-size: clamp(56px, 6.25vw, 92px);
  line-height: 0.91;
  letter-spacing: -0.055em;
}
.homepage-hero .lede {
  max-width: 58ch;
  font-size: clamp(18px, 1.55vw, 21px);
  line-height: 1.55;
}
.homepage-hero .hero-actions {
  margin-top: 32px;
}
.homepage-hero-visual {
  width: 100%;
  max-width: 510px;
  margin: 0;
  justify-self: end;
}
.homepage-hero-art {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 5;
  border: 1px solid var(--hero-art-border);
  border-radius: clamp(20px, 2.4vw, 34px);
  background: var(--hero-art-bg);
  box-shadow:
    0 42px 100px var(--hero-art-shadow),
    0 12px 28px rgba(15, 35, 41, 0.18);
}
.homepage-hero-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--hero-art-overlay);
  pointer-events: none;
}
.homepage-hero-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 50%;
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
  min-height: 46px;
  padding: 10px 16px;
  border: 1px solid var(--accent-strong);
  border-radius: 8px;
  font-weight: 800;
  text-decoration: none;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}
.hero-action:hover {
  transform: translateY(-2px);
}
.hero-action:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.hero-action-primary {
  color: var(--bg);
  background: var(--accent-strong);
  box-shadow: 0 12px 28px rgba(19, 63, 78, 0.18);
}
.hero-action-secondary {
  color: var(--accent-strong);
  background: var(--hero-action-secondary-bg);
  backdrop-filter: blur(8px);
}
.homepage-film-section {
  position: relative;
  display: grid;
  align-items: center;
  min-height: 0;
  padding: 0 clamp(8px, 1.5vw, 24px) clamp(18px, 2.4vw, 34px);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg);
}
.homepage-film-shell {
  max-width: 1440px;
}
@media (min-width: 821px) and (min-height: 600px) {
  .homepage-film-shell {
    max-width: min(1440px, 108vh);
    max-width: min(1440px, 108svh);
  }
}
.homepage-film-figure {
  margin: 0;
}
.homepage-film-frame {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.homepage-film-source-media {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border: 0;
  border-radius: 0;
  background: var(--bg);
  box-shadow: none;
  /* Cover fractional compositor gaps with an approximately 3px source-edge crop. */
  transform: scaleX(1.004);
  transform-origin: center;
}
.homepage-film-controls[hidden] {
  display: none;
}
.homepage-film-controls {
  position: absolute;
  z-index: 3;
  right: clamp(14px, 2vw, 24px);
  bottom: clamp(14px, 2vw, 24px);
  left: auto;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  gap: 4px;
  align-items: center;
  width: min(236px, calc(100% - 28px));
  padding: 0;
  border: 0;
  color: var(--homepage-film-control-ink);
  background: transparent;
  box-shadow: none;
  transform: none;
}
.homepage-film-control-button {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  color: inherit;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  font: inherit;
}
.homepage-film-control-button::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36px;
  height: 36px;
  border: 1px solid var(--homepage-film-control-border);
  border-radius: 999px;
  background: var(--homepage-film-control-surface);
  box-shadow:
    0 5px 14px var(--homepage-film-control-shadow),
    inset 0 1px color-mix(in srgb, var(--homepage-film-control-ink) 9%, transparent);
  -webkit-backdrop-filter: blur(16px) saturate(1.16);
  backdrop-filter: blur(16px) saturate(1.16);
  content: "";
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: background-color 140ms ease, border-color 140ms ease;
}
.homepage-film-control-button:hover::before {
  border-color: var(--homepage-film-control-border-hover);
  background: var(--homepage-film-control-surface-hover);
}
.homepage-film-control-button:focus-visible,
.homepage-film-scrubber:focus-visible {
  outline: 2px solid var(--homepage-film-control-ink);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px var(--homepage-film-control-surface-solid);
}
.homepage-film-control-button svg {
  position: relative;
  z-index: 1;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}
.homepage-film-control-button svg[hidden] {
  display: none;
}
.homepage-film-scrubber {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 44px;
  margin: 0;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  cursor: pointer;
  appearance: none;
  accent-color: var(--fixed-light-ink);
}
.homepage-film-scrubber:disabled {
  cursor: wait;
  opacity: 0.56;
}
.homepage-film-scrubber::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--fixed-light-ink) 0 var(--film-progress, 0%),
    color-mix(in srgb, var(--fixed-light-ink) 42%, transparent) var(--film-progress, 0%) 100%
  );
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--hero-art-bg) 58%, transparent),
    0 2px 6px color-mix(in srgb, var(--hero-art-bg) 24%, transparent);
}
.homepage-film-scrubber::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border: 2px solid color-mix(in srgb, var(--hero-art-bg) 72%, transparent);
  border-radius: 50%;
  background: var(--fixed-light-ink);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--hero-art-bg) 34%, transparent);
  appearance: none;
}
.homepage-film-scrubber::-moz-range-track {
  width: 100%;
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fixed-light-ink) 42%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--hero-art-bg) 58%, transparent),
    0 2px 6px color-mix(in srgb, var(--hero-art-bg) 24%, transparent);
}
.homepage-film-scrubber::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: var(--fixed-light-ink);
}
.homepage-film-scrubber::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, var(--hero-art-bg) 72%, transparent);
  border-radius: 50%;
  background: var(--fixed-light-ink);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--hero-art-bg) 34%, transparent);
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
  background: color-mix(in srgb, var(--ok) 6%, transparent);
}
.homepage-preview,
.homepage-category,
.homepage-failure,
.homepage-artifact-inspector,
.proof-paths,
.adoption-paths {
  display: block;
}
.homepage-section-shell {
  display: grid;
  gap: clamp(18px, 4vw, 30px);
}
.homepage-preview .homepage-section-shell > div:first-child {
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
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  border-radius: 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  padding: 0 0.08em;
}
.prompt-evidence-diagnostic {
  color: var(--warn);
  background: var(--status-warning-bg);
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
  background: var(--status-success-bg);
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
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.status.prompt-evidence-pill-diagnostic {
  color: var(--warn);
  background: var(--status-warning-bg);
}
.section {
  border-top: 1px solid var(--line);
}
.homepage-category .homepage-section-shell > div:first-child,
.homepage-failure .homepage-section-shell > div:first-child,
.homepage-artifact-inspector .homepage-section-shell > div:first-child,
.proof-paths .homepage-section-shell > div:first-child,
.adoption-paths .homepage-section-shell > div:first-child {
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
  border-color: color-mix(in srgb, var(--accent) 18%, transparent);
}
.route-grid-adoption article {
  border-color: color-mix(in srgb, var(--ok) 18%, transparent);
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
  border-color: color-mix(in srgb, var(--accent) 28%, transparent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}
.system-node-output {
  border-color: color-mix(in srgb, var(--ok) 26%, transparent);
  background: color-mix(in srgb, var(--ok) 5%, transparent);
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
  border-left: 3px solid color-mix(in srgb, var(--warn) 35%, transparent);
  background: var(--status-warning-bg);
  color: var(--warn);
}
.doc-section[data-system-map-flow-section] {
  overflow-x: hidden;
}
.system-map-canvas {
  aspect-ratio: 1760 / 1040;
  position: relative;
  max-width: 100%;
  min-height: 420px;
  max-height: 760px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--system-map-bg);
  contain: layout paint;
  overflow: hidden;
}
.system-map-flow-root,
.system-map-fallback {
  position: absolute;
  inset: 0;
  max-width: 100%;
  overflow: hidden;
}
.system-map-flow-root .react-flow,
.system-map-flow-root .react-flow__renderer,
.system-map-flow-root .react-flow__pane {
  max-width: 100%;
  contain: layout paint;
  overflow: hidden;
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
  fill: var(--system-map-zone-bg);
  stroke: var(--line);
  stroke-width: 2;
}
.system-map-svg .map-zone-kernel {
  fill: color-mix(in srgb, var(--accent) 6%, transparent);
  stroke: color-mix(in srgb, var(--accent) 34%, transparent);
}
.system-map-svg .map-zone-llm {
  fill: color-mix(in srgb, var(--warn) 7%, transparent);
  stroke: color-mix(in srgb, var(--warn) 32%, transparent);
}
.system-map-svg .map-zone-output {
  fill: color-mix(in srgb, var(--ok) 7%, transparent);
  stroke: color-mix(in srgb, var(--ok) 32%, transparent);
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
  fill: var(--system-map-node-bg);
  stroke: var(--line);
  stroke-width: 2;
}
.system-map-svg .map-node-kernel {
  fill: var(--system-map-node-kernel-bg);
  stroke: color-mix(in srgb, var(--accent) 34%, transparent);
}
.system-map-svg .map-node-llm {
  fill: var(--system-map-node-llm-bg);
  stroke: color-mix(in srgb, var(--warn) 34%, transparent);
}
.system-map-svg .map-node-output {
  fill: var(--system-map-node-output-bg);
  stroke: color-mix(in srgb, var(--ok) 32%, transparent);
}
.system-map-svg .map-node-blocked {
  fill: var(--system-map-node-blocked-bg);
  stroke: color-mix(in srgb, var(--warn) 42%, transparent);
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
.system-map-svg .map-arrow {
  fill: var(--accent);
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
  padding-top: var(--site-page-top);
}
.value-shell {
  display: grid;
  gap: clamp(28px, 5vw, 52px);
}
.value-hero {
  max-width: var(--site-reading-wide);
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
  background: var(--soft-surface);
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
  background: var(--captured-artifact-bg);
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
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.value-receipt-row {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
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
  max-width: var(--site-reading-wide);
  padding: clamp(18px, 4vw, 28px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--soft-surface);
}
.value-evidence h2 {
  margin-bottom: 0;
}
.command {
  display: block;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid var(--line);
  background: var(--soft-surface);
  border-radius: 8px;
  overflow-x: auto;
}
.doc-layout {
  --section-page-gutter: var(--site-gutter);
  --section-rail-container-width: var(--site-shell-width);
  --section-rail-width: var(--site-rail-width);
  display: grid;
  grid-template-columns: var(--section-rail-width) minmax(0, 1fr);
  max-width: var(--section-rail-container-width);
  margin: 0 auto;
  gap: var(--site-rail-gap);
  align-items: start;
}
.doc-content {
  grid-column: 2;
  min-width: 0;
}
.doc-section {
  padding-bottom: 28px;
}
.surface-type-list {
  display: grid;
  margin: 18px 0 0;
  border-top: 1px solid var(--line);
}
.surface-type-entry {
  display: grid;
  grid-template-columns: minmax(150px, 0.32fr) minmax(0, 1fr);
  gap: 18px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}
.surface-type-entry dt {
  color: var(--accent-strong);
  font-weight: 800;
}
.surface-type-entry dd {
  margin: 0;
  color: var(--muted);
}
.docs-page {
  padding-top: var(--site-page-top);
  overflow-x: hidden;
}
.design-system-page {
  padding-top: var(--site-page-top);
}
.design-system-layout {
  --section-rail-container-width: var(--site-shell-width);
  --section-rail-width: var(--site-rail-width);
  grid-template-columns: var(--section-rail-width) minmax(0, 1fr);
  max-width: var(--section-rail-container-width);
}
.section-rail-menu {
  display: none;
  position: relative;
  margin-bottom: 24px;
}
.section-rail-menu-button {
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
.section-rail-menu-button:hover,
.section-rail-menu-button:focus-visible {
  border-color: var(--accent);
  outline: 0;
}
.section-rail-menu-button:focus-visible {
  box-shadow: 0 0 0 2px var(--focus-ring);
}
.section-rail-menu-button svg {
  flex: 0 0 auto;
}
.section-rail-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}
.section-rail-menu-list {
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
.section-rail-menu-backdrop[hidden],
.section-rail-menu-list[hidden] {
  display: none;
}
.section-rail-menu-list a {
  display: block;
  padding: 11px 12px;
  border-radius: 4px;
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
}
.section-rail-menu-list a:hover,
.section-rail-menu-list a:focus-visible {
  background: var(--menu-item-bg-hover);
  outline: 0;
}
.section-rail-menu-list a:focus-visible {
  box-shadow: 0 0 0 2px var(--focus-ring);
}
.section-rail-menu-list a[aria-current] {
  background: var(--menu-item-bg-current);
  color: var(--accent-strong);
  font-weight: 850;
}
.section-rail-nav {
  position: fixed;
  top: var(--section-rail-top);
  left: calc(var(--section-page-gutter) + max(0px, calc((100vw - var(--section-page-gutter) - var(--section-page-gutter) - var(--section-rail-container-width)) / 2)));
  display: grid;
  gap: 4px;
  width: min(var(--section-rail-width), calc(100vw - var(--section-page-gutter) - var(--section-page-gutter)));
  max-height: calc(100vh - var(--section-rail-top) - 24px);
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--soft-surface);
  overflow-y: auto;
  z-index: 10;
}
.section-rail-nav a {
  display: block;
  padding: 8px 10px;
  border-radius: 4px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
  text-decoration: none;
}
.section-rail-nav a:hover,
.section-rail-nav a:focus-visible {
  background: var(--menu-item-bg-hover);
  color: var(--ink);
  outline: 0;
}
.section-rail-nav a:focus-visible {
  box-shadow: 0 0 0 2px var(--focus-ring);
}
.section-rail-nav a[aria-current] {
  background: var(--menu-item-bg-current);
  color: var(--accent-strong);
  font-weight: 850;
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
  background: var(--soft-surface);
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
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
.design-system-metrics .design-system-metric-detail {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
}
.design-system-section {
  padding-top: clamp(28px, 5vw, 48px);
}
.design-system-coverage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.design-system-coverage-block {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.design-system-coverage-block h3,
.design-system-coverage-block p,
.design-system-coverage-block dl {
  margin: 0;
}
.design-system-coverage-block h3 {
  font-size: clamp(20px, 2.4vw, 28px);
}
.design-system-coverage-block dl {
  display: grid;
  gap: 8px;
}
.design-system-coverage-block dl div {
  display: grid;
  gap: 2px;
}
.design-system-coverage-block dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.design-system-coverage-block dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.design-system-inventory > .design-system-metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.design-system-inventory-details {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.design-system-inventory-details summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
  font-weight: 850;
}
.design-system-inventory-details[open] summary {
  margin-bottom: 16px;
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
  background: var(--step-marker-bg);
  color: var(--step-marker-ink);
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
  border-color: color-mix(in srgb, var(--warn) 28%, transparent);
  background: color-mix(in srgb, var(--warn) 6%, transparent);
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
  background: var(--soft-surface);
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
  background: var(--jk-color-surface, var(--panel));
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
  background: var(--code-surface);
  font-size: 12px;
}
.design-system-specimen[data-component-specimen] {
  overflow: visible;
  padding: 28px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.design-system-specimen[data-component-specimen] + .design-system-specimen[data-component-specimen] {
  border-top: 1px solid var(--line);
}
.design-system-specimen[data-component-specimen] .design-system-specimen-header {
  display: block;
  padding: 0 0 18px;
  border: 0;
}
.design-system-specimen[data-component-specimen] .design-system-specimen-body {
  display: block;
}
.design-system-specimen[data-component-specimen] .design-system-specimen-preview-frame {
  padding: 0;
  border: 0;
  background: transparent;
}
.design-system-specimen[data-pattern-specimen] {
  overflow: visible;
  padding: 28px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.design-system-specimen[data-pattern-specimen] + .design-system-specimen[data-pattern-specimen] {
  border-top: 1px solid var(--line);
}
.design-system-specimen[data-pattern-specimen] .design-system-specimen-header {
  display: block;
  padding: 0 0 18px;
  border: 0;
}
.design-system-specimen[data-pattern-specimen] .design-system-specimen-body {
  display: block;
}
.design-system-specimen[data-pattern-specimen] .design-system-specimen-preview-frame {
  padding: 0;
  border: 0;
  background: transparent;
}
.design-system-specimen-details {
  margin-top: 22px;
  padding-top: 0;
  border-top: 1px solid var(--line);
}
.design-system-specimen-details summary {
  padding: 12px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.design-system-specimen-details-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  padding: 18px 0 4px;
}
.design-system-specimen-details-grid section {
  min-width: 0;
}
.design-system-specimen-details-grid h4,
.design-system-specimen-details-grid h5 {
  margin: 0 0 8px;
}
.design-system-specimen-details-grid h5 {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
}
.design-system-specimen-details-grid .design-system-specimen-details-wide {
  grid-column: 1 / -1;
}
.design-system-specimen-state-groups {
  display: grid;
  gap: 14px;
}
.design-system-specimen-details pre {
  margin-top: 0;
  padding: 12px 0 0;
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
}
.jk-specimen-preview {
  display: grid;
  gap: var(--jk-space-3, 0.75rem);
  min-width: 0;
  padding: var(--jk-space-4, 1rem);
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
  background: var(--jk-color-canvas, var(--bg));
  color: var(--jk-color-text, var(--ink));
  font-size: 14px;
  line-height: 1.4;
}
.jk-component-state-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
}
.jk-component-preview[data-contract-id="table"] .jk-component-state-grid {
  grid-template-columns: minmax(0, 1fr);
}
.jk-specimen-preview.jk-component-preview {
  gap: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.jk-component-state {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.jk-component-state.is-focus-visible {
  box-shadow: none;
}
.jk-component-state.is-error {
  border-color: transparent;
}
.jk-component-state.is-loading {
  border-style: none;
}
.jk-component-state.is-disabled {
  color: var(--jk-color-disabled, var(--disabled));
}
.jk-component-scenario[data-scenario-status="unverified"] {
  border-style: none;
}
.jk-component-scenario__heading {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
  min-width: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--jk-color-border, var(--line)) 72%, transparent);
}
.jk-component-scenario__status {
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.jk-component-scenario__control {
  min-width: 0;
}
.jk-component-scenario__description,
.jk-component-scenario__interaction {
  margin: 0;
  color: var(--jk-color-muted, var(--muted));
  font-size: 12px;
  overflow-wrap: anywhere;
}
.jk-state-label,
.jk-specimen-map-row > span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}
.jk-pattern-controls {
  min-width: 0;
}
.jk-specimen-map-row {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.jk-specimen-preview.jk-pattern-preview {
  gap: 0;
  padding: 0;
  overflow: hidden;
  background: var(--jk-color-surface, var(--panel));
}
.jk-pattern-surface {
  min-width: 0;
  overflow: hidden;
  background: var(--jk-color-canvas, var(--bg));
  color: var(--jk-color-text, var(--ink));
}
.jk-pattern-surface *,
.jk-pattern-surface *::before,
.jk-pattern-surface *::after {
  box-sizing: border-box;
}
.jk-pattern-surface h4,
.jk-pattern-surface h5,
.jk-pattern-surface h6,
.jk-pattern-surface p,
.jk-pattern-surface dl,
.jk-pattern-surface dd,
.jk-pattern-surface ol,
.jk-pattern-surface ul {
  margin: 0;
}
.jk-pattern-surface ol,
.jk-pattern-surface ul {
  padding: 0;
}
.jk-pattern-surface button,
.jk-pattern-surface input,
.jk-pattern-surface textarea {
  font: inherit;
}
.jk-pattern-surface [aria-disabled="true"] {
  pointer-events: none;
}
.jk-pattern-surface [data-static-control="true"] {
  pointer-events: none;
}
.jk-pattern-static-label {
  display: flex;
  gap: 7px;
  align-items: center;
  min-height: 32px;
  padding: 7px 14px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-soft-surface, var(--soft-surface));
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.jk-pattern-static-label span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--jk-color-receipt, var(--receipt));
}
.jk-surface-kicker {
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.jk-surface-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 14px 16px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-toolbar > div:first-child {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.jk-surface-toolbar h4 {
  font-size: 18px;
}
.jk-surface-text-link {
  color: var(--jk-color-focus, var(--accent));
  font-weight: 800;
  text-underline-offset: 3px;
}
.jk-surface-status-pill {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 5px 8px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: 999px;
  background: var(--jk-color-soft-surface, var(--soft-surface));
  color: var(--jk-color-text, var(--ink));
  font-size: 11px;
  font-weight: 850;
  white-space: nowrap;
}
.jk-surface-status-pill.is-review,
.jk-surface-status-pill.is-warning {
  border-color: color-mix(in srgb, var(--jk-color-warning, var(--warn)) 60%, var(--jk-color-border, var(--line)));
  background: color-mix(in srgb, var(--jk-color-warning, var(--warn)) 10%, var(--jk-color-surface, var(--panel)));
}
.jk-surface-status-pill.is-good {
  border-color: color-mix(in srgb, var(--jk-color-receipt, var(--receipt)) 60%, var(--jk-color-border, var(--line)));
  background: color-mix(in srgb, var(--jk-color-receipt, var(--receipt)) 10%, var(--jk-color-surface, var(--panel)));
}
.jk-pattern-completion {
  margin: 0;
  padding: 9px 10px;
  border-left: 3px solid var(--jk-color-receipt, var(--receipt));
  background: color-mix(in srgb, var(--jk-color-receipt, var(--receipt)) 8%, transparent);
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-marketing-nav {
  display: flex;
  gap: 20px;
  align-items: center;
  min-height: 52px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
  color: var(--jk-color-muted, var(--muted));
  font-size: 12px;
}
.jk-surface-marketing-nav strong {
  margin-right: auto;
  color: var(--jk-color-text, var(--ink));
  font-size: 17px;
}
.jk-surface-marketing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
  gap: 28px;
  align-items: center;
  padding: clamp(24px, 5vw, 56px);
  background: var(--jk-color-canvas, var(--bg));
}
.jk-surface-marketing-offer {
  display: grid;
  gap: 14px;
  align-content: center;
  min-width: 0;
}
.jk-surface-marketing-offer h4 {
  max-width: 15ch;
  font-size: clamp(28px, 5vw, 48px);
  line-height: 0.98;
  letter-spacing: -0.035em;
}
.jk-surface-marketing-offer p:not(.jk-surface-kicker) {
  max-width: 52ch;
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-marketing-offer .jk-action-button {
  width: max-content;
}
.jk-surface-marketing-offer small {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-marketing-proof {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
  background: var(--jk-color-surface, var(--panel));
  box-shadow: 0 16px 36px color-mix(in srgb, var(--jk-color-text, var(--ink)) 10%, transparent);
}
.jk-surface-plan-card {
  display: grid;
  gap: 2px;
}
.jk-surface-plan-card > div {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 2px 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-plan-card > div:last-child {
  border-bottom: 0;
}
.jk-surface-plan-card span {
  grid-row: 1 / 3;
  color: var(--jk-color-focus, var(--accent));
  font-size: 11px;
  font-weight: 900;
}
.jk-surface-plan-card small {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-proof-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--jk-color-border, var(--line));
  border-bottom: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-proof-stats div {
  padding: 10px;
}
.jk-surface-proof-stats div + div {
  border-left: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-proof-stats dt {
  font-size: 18px;
  font-weight: 900;
}
.jk-surface-proof-stats dd {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
}
.jk-surface-marketing-next {
  display: flex;
  gap: 8px 24px;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  border-top: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-soft-surface, var(--soft-surface));
  text-align: center;
}
.jk-surface-marketing-next span {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-workbench-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.8fr);
  min-width: 0;
}
.jk-surface-work-queue {
  min-width: 0;
  border-right: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-queue,
.jk-surface-exceptions {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.jk-surface-queue th,
.jk-surface-queue td,
.jk-surface-exceptions th,
.jk-surface-exceptions td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  text-align: left;
  overflow-wrap: anywhere;
}
.jk-surface-queue th,
.jk-surface-exceptions th {
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
  text-transform: uppercase;
}
.jk-surface-queue th:last-child,
.jk-surface-queue td:last-child,
.jk-surface-exceptions th:last-child,
.jk-surface-exceptions td:last-child {
  width: 35%;
  text-align: right;
}
.jk-surface-queue tr.is-selected > * {
  background: color-mix(in srgb, var(--jk-color-focus, var(--accent)) 10%, var(--jk-color-surface, var(--panel)));
}
.jk-surface-queue-selection {
  max-width: 100%;
  min-block-size: 2rem;
  padding-block: 0.35rem;
  padding-inline: 0.55rem;
  text-align: left;
}
.jk-surface-workspace {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 16px;
}
.jk-surface-workspace > header,
.jk-surface-trend > header,
.jk-surface-diagnostic > header {
  display: flex;
  gap: 14px;
  align-items: start;
  justify-content: space-between;
}
.jk-surface-workspace > header h5 {
  font-size: 20px;
}
.jk-surface-home-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-home-summary div {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 12px;
}
.jk-surface-home-summary div + div {
  border-left: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-home-summary span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
}
.jk-surface-home-summary strong {
  overflow-wrap: anywhere;
}
.jk-surface-home-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
}
.jk-surface-home-facts div {
  padding: 10px;
}
.jk-surface-home-facts div + div {
  border-left: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-home-facts dt {
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
  text-transform: uppercase;
}
.jk-surface-home-facts dd {
  margin-top: 2px;
  font-weight: 850;
}
.jk-surface-evidence {
  padding: 12px;
  border-left: 3px solid var(--jk-color-focus, var(--accent));
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-evidence h6 {
  margin-bottom: 5px;
  font-size: 12px;
}
.jk-surface-evidence ul {
  display: grid;
  gap: 3px;
  padding-left: 18px;
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-decision-bar {
  display: grid;
  gap: 10px;
  padding-top: 2px;
}
.jk-surface-review-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(220px, 0.65fr);
  min-width: 0;
}
.jk-surface-review-document {
  min-width: 0;
  padding: 20px;
  border-right: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-review-document > header {
  display: grid;
  gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-review-document > header span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
}
.jk-surface-review-document > header strong {
  font-size: 18px;
}
.jk-surface-itinerary {
  display: grid;
  list-style: none;
}
.jk-surface-itinerary li {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-itinerary time {
  color: var(--jk-color-muted, var(--muted));
  font-size: 12px;
}
.jk-surface-itinerary li div {
  display: grid;
  gap: 2px;
}
.jk-surface-itinerary li span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 12px;
}
.jk-surface-itinerary li.is-flagged {
  padding-inline: 10px;
  border-left: 3px solid var(--jk-color-warning, var(--warn));
  background: color-mix(in srgb, var(--jk-color-warning, var(--warn)) 8%, transparent);
}
.jk-surface-review-rail {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-review-rail section {
  padding: 12px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-review-rail h5 {
  margin-bottom: 7px;
}
.jk-surface-review-rail ul {
  display: grid;
  gap: 5px;
  padding-left: 18px;
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-review-rail .jk-surface-risk {
  border-color: color-mix(in srgb, var(--jk-color-warning, var(--warn)) 55%, var(--jk-color-border, var(--line)));
}
.jk-surface-risk p {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-review-decision {
  padding: 14px 16px;
  border-top: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-review-receipt,
.jk-surface-confirmation,
.jk-surface-report-share {
  display: flex;
  gap: 8px 18px;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  border-top: 1px solid var(--jk-color-border, var(--line));
  background: color-mix(in srgb, var(--jk-color-receipt, var(--receipt)) 8%, var(--jk-color-soft-surface, var(--soft-surface)));
}
.jk-surface-review-receipt span,
.jk-surface-confirmation span,
.jk-surface-report-share span {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-form {
  display: grid;
  gap: 16px;
  padding: 18px;
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-form > header {
  display: grid;
  gap: 2px;
}
.jk-surface-form > header h4 {
  font-size: 20px;
}
.jk-surface-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  list-style: none;
  counter-reset: steps;
}
.jk-surface-steps li {
  position: relative;
  padding: 28px 6px 7px;
  border-bottom: 3px solid var(--jk-color-border, var(--line));
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}
.jk-surface-steps li::before {
  position: absolute;
  top: 2px;
  left: 50%;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  transform: translateX(-50%);
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: 50%;
  background: var(--jk-color-canvas, var(--bg));
  content: counter(steps);
  counter-increment: steps;
  font-size: 10px;
}
.jk-surface-steps li.is-complete,
.jk-surface-steps li.is-current {
  border-bottom-color: var(--jk-color-focus, var(--accent));
  color: var(--jk-color-text, var(--ink));
}
.jk-surface-steps li.is-complete::before,
.jk-surface-steps li.is-current::before {
  border-color: var(--jk-color-focus, var(--accent));
}
.jk-surface-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
}
.jk-surface-field-grid legend {
  padding: 0 6px;
  font-weight: 850;
}
.jk-surface-field-valid {
  padding: 9px 10px;
  border-left: 3px solid var(--jk-color-success, var(--receipt));
  background: color-mix(in srgb, var(--jk-color-success, var(--receipt)) 8%, transparent);
  color: var(--jk-color-text, var(--ink));
}
.jk-surface-order-review {
  display: flex;
  gap: 18px;
  align-items: end;
  justify-content: space-between;
  min-width: 0;
  padding-top: 2px;
}
.jk-surface-order-review dl {
  display: grid;
  gap: 4px;
  width: min(320px, 100%);
}
.jk-surface-order-review dl div {
  display: flex;
  justify-content: space-between;
}
.jk-surface-order-review dl div:last-child {
  padding-top: 5px;
  border-top: 1px solid var(--jk-color-border, var(--line));
  font-weight: 900;
}
.jk-surface-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.jk-surface-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 16px;
}
.jk-surface-metric-grid article {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-metric-grid span,
.jk-surface-metric-grid small {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-metric-grid span {
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}
.jk-surface-metric-grid strong {
  font-size: 22px;
}
.jk-surface-dashboard-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(220px, 0.55fr);
  gap: 12px;
  padding: 0 16px 16px;
}
.jk-surface-trend,
.jk-surface-exception-panel {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-trend > header div {
  display: grid;
  gap: 2px;
}
.jk-surface-trend > header span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
}
.jk-surface-trend > header > strong {
  color: var(--jk-color-receipt, var(--receipt));
}
.jk-surface-trend-table {
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;
  table-layout: fixed;
}
.jk-surface-trend-table th,
.jk-surface-trend-table td {
  padding: 7px 3px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  font-size: 10px;
  text-align: center;
}
.jk-surface-trend-table th {
  color: var(--jk-color-muted, var(--muted));
  font-weight: 750;
}
.jk-surface-trend-note {
  margin-top: 7px !important;
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
}
.jk-surface-exception-panel h5 {
  margin-bottom: 8px;
}
.jk-surface-follow-up,
.jk-surface-next-fix {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-top: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-follow-up > div,
.jk-surface-next-fix > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.jk-surface-follow-up span,
.jk-surface-next-fix span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 12px;
}
.jk-surface-report-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-report-toolbar > div {
  display: grid;
  gap: 2px;
}
.jk-surface-report-toolbar h4 {
  font-size: 22px;
}
.jk-surface-report-layout {
  display: grid;
  grid-template-columns: minmax(160px, 0.45fr) minmax(0, 1.55fr);
  min-width: 0;
}
.jk-surface-report-toc {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 18px;
  border-right: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-report-toc strong {
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
}
.jk-surface-report-toc a {
  padding: 7px 0;
  color: var(--jk-color-text, var(--ink));
  text-decoration: none;
}
.jk-surface-report-body {
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 22px;
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-report-body > section {
  min-width: 0;
}
.jk-surface-report-body h5 {
  margin: 8px 0 5px;
  font-size: 20px;
}
.jk-surface-report-body p {
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-budget-categories {
  min-width: 0;
}
.jk-surface-budget-categories table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.jk-surface-budget-categories th,
.jk-surface-budget-categories td {
  padding: 8px 6px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  font-size: 11px;
  text-align: right;
  overflow-wrap: anywhere;
}
.jk-surface-budget-categories th:first-child,
.jk-surface-budget-categories td:first-child {
  text-align: left;
}
.jk-surface-budget-categories thead th {
  color: var(--jk-color-muted, var(--muted));
  font-size: 9px;
  text-transform: uppercase;
}
.jk-surface-report-evidence {
  padding: 14px;
  border-left: 3px solid var(--jk-color-receipt, var(--receipt));
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-report-evidence h5 {
  margin-top: 0;
  font-size: 15px;
}
.jk-surface-report-evidence .jk-surface-text-link {
  display: inline-block;
  margin-top: 8px;
}
.jk-surface-debug-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
  gap: 12px;
  padding: 16px;
}
.jk-surface-debug-config,
.jk-surface-test-result,
.jk-surface-diagnostic {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-panel, 8px);
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-debug-config {
  grid-row: 1 / 3;
  display: grid;
  align-content: start;
  gap: 12px;
}
.jk-surface-debug-config .jk-action-button {
  margin-top: 4px;
}
.jk-surface-test-result {
  display: flex;
  gap: 12px;
  align-items: center;
}
.jk-surface-test-result p {
  margin-top: 3px;
  color: var(--jk-color-muted, var(--muted));
}
.jk-surface-result-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--jk-color-warning, var(--warn)) 14%, var(--jk-color-soft-surface, var(--soft-surface)));
  color: var(--jk-color-warning, var(--warn));
  font-weight: 950;
}
.jk-surface-diagnostic > header {
  align-items: center;
}
.jk-surface-diagnostic .jk-action-button {
  min-block-size: 2.25rem;
  padding: 0.45rem 0.7rem;
  font-size: 11px;
}
.jk-surface-console {
  margin: 12px 0 0;
  padding: 12px;
  overflow-x: auto;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--code-surface);
  color: var(--jk-color-text, var(--ink));
  font-size: 12px;
  line-height: 1.7;
}
.jk-surface-conversation-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-conversation-header > div:nth-child(2) {
  min-width: 0;
}
.jk-surface-conversation-header h4 {
  font-size: 17px;
}
.jk-surface-conversation-header div span {
  color: var(--jk-color-muted, var(--muted));
  font-size: 11px;
}
.jk-surface-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: var(--jk-color-focus, var(--accent));
  color: var(--jk-color-canvas, var(--bg));
  font-weight: 900;
}
.jk-surface-status-dot {
  color: var(--jk-color-receipt, var(--receipt));
  font-size: 11px;
  font-weight: 850;
}
.jk-surface-conversation-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(210px, 0.5fr);
  min-width: 0;
}
.jk-surface-thread {
  display: grid;
  grid-template-rows: 1fr auto;
  min-width: 0;
  border-right: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-messages {
  display: grid;
  gap: 11px;
  align-content: start;
  padding: 16px;
  list-style: none;
  background: var(--jk-color-canvas, var(--bg));
}
.jk-surface-messages li {
  display: grid;
  gap: 4px;
  max-width: 78%;
  padding: 10px 12px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: 10px;
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-messages li.is-outgoing {
  justify-self: end;
  background: color-mix(in srgb, var(--jk-color-focus, var(--accent)) 10%, var(--jk-color-surface, var(--panel)));
}
.jk-surface-messages li.is-recovered {
  max-width: 100%;
  border-style: dashed;
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-messages li > span,
.jk-surface-messages li > small {
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
}
.jk-surface-messages .jk-surface-retry {
  justify-self: start;
  min-block-size: 2.1rem;
  padding: 0.4rem 0.65rem;
  font-size: 11px;
}
.jk-surface-composer {
  display: grid;
  gap: 9px;
  padding: 12px 16px;
  border-top: 1px solid var(--jk-color-border, var(--line));
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-composer textarea {
  min-height: 68px;
  resize: none;
}
.jk-surface-composer .jk-pattern-controls .jk-action-group__actions {
  justify-content: flex-end;
}
.jk-surface-context {
  min-width: 0;
  padding: 16px;
  background: var(--jk-color-soft-surface, var(--soft-surface));
}
.jk-surface-context h5 {
  margin-bottom: 12px;
}
.jk-surface-context dl {
  display: grid;
  gap: 10px;
}
.jk-surface-context dl div {
  padding-bottom: 9px;
  border-bottom: 1px solid var(--jk-color-border, var(--line));
}
.jk-surface-context dt {
  color: var(--jk-color-muted, var(--muted));
  font-size: 10px;
  text-transform: uppercase;
}
.jk-surface-context dd {
  margin-top: 2px;
  font-weight: 800;
}
.jk-surface-attachment {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-top: 14px;
  padding: 9px;
  border: 1px solid var(--jk-color-border, var(--line));
  border-radius: var(--jk-radius-control, 4px);
  background: var(--jk-color-surface, var(--panel));
}
.jk-surface-attachment > span {
  padding: 5px;
  border-radius: 3px;
  background: var(--jk-color-focus, var(--accent));
  color: var(--jk-color-canvas, var(--bg));
  font-size: 9px;
  font-weight: 900;
}
.jk-surface-attachment div {
  display: grid;
  min-width: 0;
}
.jk-surface-attachment strong,
.jk-surface-attachment small {
  overflow-wrap: anywhere;
}
.jk-surface-attachment small {
  color: var(--jk-color-muted, var(--muted));
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
  border: 1px solid color-mix(in srgb, var(--ink) 28%, transparent);
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
  background: var(--panel);
  color: var(--ink);
  font: inherit;
}
.design-system-search button {
  min-height: 42px;
  padding: 8px 13px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-ink);
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
  padding-top: var(--site-page-top);
}
.examples-shell {
  display: grid;
  gap: clamp(24px, 4vw, 38px);
}
.examples-hero,
.examples-layout {
  max-width: none;
  margin: 0;
}
.examples-hero {
  margin-bottom: 0;
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
  max-width: var(--site-reading-width);
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
  background: var(--soft-surface);
}
.example-comparison-heading {
  display: grid;
  gap: 4px;
  max-width: var(--site-reading-width);
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
  background: var(--soft-surface);
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
  background: var(--soft-surface);
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
  background: var(--panel);
}
.example-matrix-thumb {
  display: block;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--media-surface);
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
.example-matrix-diagnostic {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 10;
  padding: 14px;
  border: 1px dashed color-mix(in srgb, var(--warn) 58%, var(--line));
  border-radius: 6px;
  background: color-mix(in srgb, var(--warn) 12%, var(--soft-surface));
  color: var(--ink);
  text-align: center;
}
.example-matrix-diagnostic strong {
  display: block;
  color: var(--warn);
  font-size: 12px;
  line-height: 1.2;
}
.example-matrix-diagnostic span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
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
  background: var(--media-surface);
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
  background: var(--soft-surface);
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
  background: var(--modal-backdrop-bg);
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
  background: var(--modal-media-stage-bg);
}
.example-gallery-modal-image img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: 6px;
  object-fit: contain;
  background: var(--captured-artifact-bg);
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
  padding-top: var(--site-page-top);
  font-family: var(--eval-serif);
  font-size: 17px;
  line-height: 1.58;
}
.evals-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}
.evals-shell > * {
  min-width: 0;
}
.evals-header {
  max-width: var(--site-reading-width);
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
  padding-top: var(--site-page-top);
  font-family: var(--eval-serif);
  font-size: 17px;
  line-height: 1.58;
}
.report-layout {
  display: grid;
  gap: clamp(34px, 5vw, 64px);
}
.report-heading,
.report-shell {
  max-width: none;
  margin: 0;
}
.report-heading {
  max-width: var(--site-reading-wide);
  text-align: left;
}
.report-heading h1 {
  max-width: 18ch;
  font-size: clamp(38px, 5vw, 64px);
}
.report-shell {
  display: grid;
  grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: start;
}
.report-toc {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--report-toc-bg);
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
  background: var(--soft-surface);
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
  stroke: var(--report-chart-grid);
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
  fill: var(--warn);
}
.report-score-bar-guided {
  fill: var(--accent);
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
  background: var(--warn);
}
.legend-guided {
  background: var(--accent);
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
  background: var(--soft-surface);
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
  background: var(--bar-track);
}
.report-micro-bars b {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: var(--warn);
}
.report-micro-bars b.guided {
  background: var(--accent);
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
  background: var(--table-heading-surface);
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
  background: var(--soft-surface);
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
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.report-context-cell img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: top left;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--captured-artifact-bg);
}
.report-context-cell span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
}
.report-context-cell-diagnostic {
  align-content: center;
  min-height: 168px;
  border-style: dashed;
  background: var(--status-warning-bg);
}
.report-context-cell-diagnostic strong {
  color: var(--warn);
  font-size: 13px;
}
.report-context-cell-diagnostic code {
  overflow-wrap: anywhere;
  font-size: 11px;
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
}
@media (max-width: 1120px) {
  .doc-layout,
  .design-system-layout {
    display: block;
  }
  .section-rail-menu {
    display: block;
  }
  .section-rail-nav {
    display: none;
  }
  .doc-content,
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
  .homepage-hero {
    padding-top: clamp(44px, 8vw, 68px);
    padding-bottom: clamp(52px, 9vw, 76px);
  }
  .homepage-hero::before {
    top: auto;
    right: -28%;
    bottom: -10%;
    width: min(88vw, 680px);
  }
  .homepage-hero-shell {
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(34px, 7vw, 52px);
    min-height: 0;
  }
  .homepage-hero-copy {
    max-width: 740px;
    padding-block: 0;
  }
  .homepage-hero-visual {
    width: min(100%, 680px);
    max-width: none;
    justify-self: start;
  }
  .homepage-hero-art {
    aspect-ratio: 16 / 11;
  }
  .homepage-hero-art img {
    object-position: 50% 44%;
  }
  .proof-panel {
    margin-top: 18px;
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
  .design-system-coverage-grid,
  .design-system-foundation-list,
  .design-system-review-grid,
  .design-system-example-grid,
  .design-system-role-grid,
  .design-system-specimen-body,
  .jk-component-state-grid,
  .design-icon-scenario-grid,
  .design-icon-index-list {
    grid-template-columns: 1fr;
  }
  .design-system-inventory > .design-system-metrics {
    grid-template-columns: 1fr;
  }
  .design-system-specimen-preview-frame {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .design-system-specimen[data-component-specimen] .design-system-specimen-preview-frame,
  .design-system-specimen[data-pattern-specimen] .design-system-specimen-preview-frame {
    border-bottom: 0;
  }
  .design-system-specimen-details-grid {
    grid-template-columns: 1fr;
  }
  .design-system-specimen-details-grid .design-system-specimen-details-wide {
    grid-column: auto;
  }
  .jk-pattern-static-label {
    padding-inline: 12px;
  }
  .jk-surface-toolbar,
  .jk-surface-report-toolbar,
  .jk-surface-marketing-next,
  .jk-surface-review-receipt,
  .jk-surface-confirmation,
  .jk-surface-report-share,
  .jk-surface-follow-up,
  .jk-surface-next-fix,
  .jk-surface-order-review {
    align-items: stretch;
    flex-direction: column;
  }
  .jk-surface-toolbar,
  .jk-surface-report-toolbar {
    flex-wrap: wrap;
  }
  .jk-surface-toolbar > .jk-surface-filter-row {
    width: 100%;
  }
  .jk-surface-filter-row > * {
    flex: 1 1 120px;
  }
  .jk-surface-marketing-nav {
    min-height: 46px;
    padding-inline: 14px;
  }
  .jk-surface-marketing-nav span {
    display: none;
  }
  .jk-surface-marketing-hero,
  .jk-surface-workbench-layout,
  .jk-surface-review-layout,
  .jk-surface-dashboard-layout,
  .jk-surface-report-layout,
  .jk-surface-debug-layout,
  .jk-surface-conversation-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .jk-surface-marketing-hero {
    gap: 20px;
    padding: 22px 16px;
  }
  .jk-surface-marketing-offer h4 {
    max-width: 18ch;
    font-size: clamp(27px, 10vw, 40px);
  }
  .jk-surface-marketing-proof {
    padding: 14px;
  }
  .jk-surface-marketing-next,
  .jk-surface-review-receipt,
  .jk-surface-confirmation,
  .jk-surface-report-share {
    gap: 3px;
    text-align: left;
  }
  .jk-surface-work-queue,
  .jk-surface-review-document,
  .jk-surface-thread,
  .jk-surface-report-toc {
    border-right: 0;
    border-bottom: 1px solid var(--jk-color-border, var(--line));
  }
  .jk-surface-home-facts {
    grid-template-columns: minmax(0, 1fr);
  }
  .jk-surface-home-facts div + div {
    border-top: 1px solid var(--jk-color-border, var(--line));
    border-left: 0;
  }
  .jk-surface-review-document,
  .jk-surface-review-rail,
  .jk-surface-report-body,
  .jk-surface-context {
    padding: 16px;
  }
  .jk-surface-field-grid,
  .jk-surface-metric-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .jk-surface-steps li {
    padding-inline: 2px;
    font-size: 10px;
  }
  .jk-surface-order-review .jk-pattern-controls,
  .jk-surface-follow-up .jk-action-button,
  .jk-surface-next-fix .jk-action-button {
    width: 100%;
  }
  .jk-surface-dashboard-layout {
    padding-inline: 12px;
  }
  .jk-surface-report-toc {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px 10px;
  }
  .jk-surface-report-toc strong {
    grid-column: 1 / -1;
  }
  .jk-surface-report-toc a {
    font-size: 12px;
  }
  .jk-surface-debug-config {
    grid-row: auto;
  }
  .jk-surface-debug-layout {
    padding: 12px;
  }
  .jk-surface-console {
    font-size: 11px;
  }
  .jk-surface-conversation-header {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .jk-surface-conversation-header > .jk-surface-status-dot {
    grid-column: 2;
  }
  .jk-surface-messages {
    padding: 12px;
  }
  .jk-surface-messages li {
    max-width: 92%;
  }
  .jk-surface-composer {
    padding: 12px;
  }
  [data-pattern-index] .design-system-table-wrap {
    overflow: visible;
    border: 0;
    background: transparent;
  }
  [data-pattern-index] .design-system-table {
    display: block;
    min-width: 0;
  }
  [data-pattern-index] .design-system-table caption,
  [data-pattern-index] .design-system-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  [data-pattern-index] .design-system-table tbody {
    display: grid;
    gap: 10px;
  }
  [data-pattern-index] .design-system-table tr {
    display: grid;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
  }
  [data-pattern-index] .design-system-table td {
    display: grid;
    grid-template-columns: minmax(84px, 0.35fr) minmax(0, 1fr);
    gap: 12px;
    padding: 10px 12px;
    overflow-wrap: anywhere;
  }
  [data-pattern-index] .design-system-table td:first-child {
    border-top: 0;
  }
  [data-pattern-index] .design-system-table td::before {
    content: attr(data-label);
    color: var(--muted);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }
  [data-pattern-index] .design-system-table td a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
  }
  .design-system-metrics div {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .design-system-metrics div:last-child {
    border-bottom: 0;
  }
}
@media (max-width: 560px) {
  .homepage-film-section {
    min-height: auto;
    padding-top: 0;
    padding-bottom: 18px;
  }
  .homepage-film-controls {
    bottom: 12px;
    right: 12px;
    left: auto;
    width: min(236px, calc(100% - 24px));
    gap: 4px;
    padding: 0;
    transform: none;
  }
  .homepage-film-control-button {
    width: 44px;
    min-width: 44px;
    padding: 0;
  }
  .homepage-hero {
    padding-top: 40px;
    padding-bottom: 52px;
  }
  .homepage-hero .eyebrow {
    margin-bottom: 20px;
    font-size: 12px;
  }
  .homepage-hero h1 {
    max-width: 10ch;
    margin-bottom: 22px;
    font-size: clamp(48px, 14.6vw, 66px);
  }
  .homepage-hero .hero-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    margin-top: 28px;
  }
  .homepage-hero .hero-action-primary {
    grid-column: 1 / -1;
  }
  .homepage-hero-art {
    aspect-ratio: 1 / 1;
    border-radius: 20px;
  }
  .homepage-hero-art img {
    object-position: 50% 43%;
  }
  .surface-type-entry {
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
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
@media (prefers-reduced-motion: reduce) {
  .homepage-hero-art img {
    transform: none;
  }
  .hero-action {
    transition: none;
  }
  .homepage-film-controls,
  .homepage-film-control-button::before {
    transition: none;
  }
  .hero-action:hover {
    transform: none;
  }
}
@media (prefers-contrast: more) {
  .homepage-hero-art,
  .hero-action,
  .homepage-film-source-media {
    border-width: 2px;
    border-color: var(--ink);
    box-shadow: none;
  }
  .homepage-film-controls {
    border: 0;
    background: transparent;
    box-shadow: none;
    opacity: 1;
  }
  .homepage-film-control-button::before {
    border: 2px solid var(--homepage-film-control-ink);
    background: var(--homepage-film-control-surface-solid);
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .homepage-film-scrubber {
    background: transparent;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .homepage-film-scrubber::-webkit-slider-runnable-track {
    box-shadow: 0 0 0 2px var(--hero-art-bg);
  }
  .homepage-film-scrubber::-moz-range-track {
    box-shadow: 0 0 0 2px var(--hero-art-bg);
  }
}
@media (forced-colors: active) {
  .homepage-hero,
  .homepage-film-section {
    background: Canvas;
  }
  .homepage-hero::before {
    display: none;
  }
  .homepage-hero-art,
  .hero-action,
  .homepage-film-source-media {
    border-color: CanvasText;
    box-shadow: none;
  }
  .homepage-film-controls {
    border: 0;
    color: CanvasText;
    background: transparent;
    box-shadow: none;
    opacity: 1;
  }
  .homepage-film-control-button::before {
    border: 1px solid ButtonText;
    color: ButtonText;
    background: ButtonFace;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .homepage-film-scrubber {
    color: ButtonText;
    background: transparent;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .homepage-film-scrubber::-webkit-slider-runnable-track {
    border: 1px solid ButtonText;
    background: ButtonFace;
    box-shadow: none;
  }
  .homepage-film-scrubber::-webkit-slider-thumb {
    border-color: ButtonText;
    background: Highlight;
    box-shadow: none;
  }
  .homepage-film-scrubber::-moz-range-track {
    border: 1px solid ButtonText;
    background: ButtonFace;
    box-shadow: none;
  }
  .homepage-film-scrubber::-moz-range-progress {
    background: Highlight;
  }
  .homepage-film-scrubber::-moz-range-thumb {
    border-color: ButtonText;
    background: Highlight;
    box-shadow: none;
  }
  .homepage-film-control-button:focus-visible,
  .homepage-film-scrubber:focus-visible {
    outline-color: Highlight;
  }
  .homepage-film-scrubber {
    accent-color: Highlight;
  }
  .hero-action-primary,
  .hero-action-secondary {
    color: LinkText;
    background: Canvas;
  }
}
`;

function renderHomepageFilmControlIcon(id, stateAttribute, hidden = false) {
  const attributes = [
    `data-icon-id="${escapeHtml(id)}"`,
    'aria-hidden="true"',
    stateAttribute,
    hidden ? "hidden" : "",
  ].filter(Boolean).join(" ");

  return getIconSvg({ id }).inline_svg.replace("<svg ", `<svg ${attributes} `);
}

export function renderHomepage({ homepageFilmEnabled = HOMEPAGE_FILM_ENABLED } = {}) {
  return page(
    "JudgmentKit",
    `
    ${homepageFilmEnabled ? `
    <section class="homepage-film-section" aria-label="UI generation, diagnosis, and repair film">
      <div class="site-shell homepage-film-shell">
        <figure class="homepage-film-figure">
          <div
            class="homepage-film-frame"
            data-homepage-film-player
            data-film-renderer="video"
            data-film-source-light="${VISUAL_COMPOSITION_RECORDING_PATH}"
            data-film-source-dark="${VISUAL_COMPOSITION_DARK_RECORDING_PATH}"
            data-film-poster-light="${VISUAL_COMPOSITION_POSTER_PATH}"
            data-film-poster-dark="${VISUAL_COMPOSITION_DARK_POSTER_PATH}"
          >
            <video
              id="homepage-film-media"
              class="homepage-film-source-media"
              controls
              autoplay
              muted
              loop
              playsinline
              preload="auto"
              poster="${VISUAL_COMPOSITION_POSTER_PATH}"
              aria-label="JudgmentKit UI generation, diagnosis, and measured repair"
              aria-describedby="homepage-film-description"
              data-homepage-film-media
            >
              <source src="${VISUAL_COMPOSITION_RECORDING_PATH}" type="video/mp4" data-homepage-film-source>
              Your browser cannot play this video. <a href="${VISUAL_COMPOSITION_RECORDING_PATH}">Download the demo video</a>.
            </video>
            <span id="homepage-film-description" class="sr-only">Video description: A small agent reviews a generated select field at desktop and mobile sizes. A failure receipt identifies misaligned centers and an undersized indicator slot. The agent repairs the value inset, indicator slot, and caret clearance; the resubmitted candidate passes and the accepted receipt is highlighted.</span>
            <div class="homepage-film-controls" role="group" aria-label="Video controls" hidden data-homepage-film-controls>
              <button class="homepage-film-control-button" type="button" aria-label="Play video" aria-controls="homepage-film-media" data-film-action="play" data-homepage-film-play>
                ${renderHomepageFilmControlIcon("play", "data-homepage-film-play-icon")}
                ${renderHomepageFilmControlIcon("pause", "data-homepage-film-pause-icon", true)}
              </button>
              <input
                class="homepage-film-scrubber"
                type="range"
                min="0"
                max="100"
                step="0.1"
                value="0"
                aria-label="Video progress"
                aria-valuetext="0 percent played"
                aria-controls="homepage-film-media"
                disabled
                data-film-scrubber
                data-homepage-film-scrubber
              >
              <button class="homepage-film-control-button" type="button" aria-label="Unmute video" aria-controls="homepage-film-media" data-film-action="mute" data-homepage-film-mute>
                ${renderHomepageFilmControlIcon("volume-2", "data-homepage-film-sound-icon", true)}
                ${renderHomepageFilmControlIcon("volume-x", "data-homepage-film-muted-icon")}
              </button>
            </div>
          </div>
        </figure>
      </div>
    </section>
    ` : ""}
    <section class="hero homepage-hero">
      <div class="site-shell homepage-hero-shell">
        <div class="homepage-hero-copy">
          <p class="eyebrow">The judgment layer for AI-generated UI</p>
          <h1>Stop AI from building the wrong interface.</h1>
          <p class="lede">A design system tells an agent how interface elements should look and behave. JudgmentKit tells it which interface the user’s work requires, what should stay hidden, and what must be repaired.</p>
          <p><strong>Use JudgmentKit’s design system—or bring your own.</strong></p>
          <div class="hero-actions" aria-label="Primary next steps">
            <a class="hero-action hero-action-primary" data-hero-action="primary" href="/value/">See a screen repaired</a>
            <a class="hero-action hero-action-secondary" data-hero-action="secondary" href="/examples/">Explore examples</a>
          </div>
        </div>
        <figure class="homepage-hero-visual">
          <div class="homepage-hero-art">
            <img src="${HOMEPAGE_HERO_ART_PATH}" width="1122" height="1402" alt="Rough stone fragments pass through a teal glass lens and emerge as an ordered path." loading="eager" fetchpriority="high" decoding="async">
          </div>
        </figure>
      </div>
    </section>
    <section class="section homepage-category" aria-labelledby="category-title">
      <div class="site-shell homepage-section-shell">
        <div>
          <p class="eyebrow">Judgment before components</p>
          <h2 id="category-title">A design system can make the wrong interface consistent.</h2>
          <p>JudgmentKit prevents that mistake before the components are composed.</p>
        </div>
        <div class="failure-grid">
          <article>
            <h3>Traditional design system</h3>
            <p>Defines how interface elements look, behave, and remain consistent.</p>
          </article>
          <article>
            <h3>JudgmentKit</h3>
            <p>Defines what the interface must help someone do, decide, and understand.</p>
          </article>
          <article>
            <h3>Together</h3>
            <p>JudgmentKit uses the design system you choose and tells the agent what to repair.</p>
          </article>
        </div>
      </div>
    </section>
    <section class="section homepage-preview" aria-labelledby="repair-preview-title">
      <div class="site-shell homepage-section-shell">
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
      </div>
    </section>
    <section class="section homepage-failure" aria-labelledby="failure-title">
      <div class="site-shell homepage-section-shell">
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
      </div>
    </section>
    <section class="section homepage-artifact-inspector" aria-labelledby="artifact-inspector-title">
      <div class="site-shell homepage-section-shell">
        <div>
          <p class="eyebrow">Artifact Inspector · Proposed</p>
          <h2 id="artifact-inspector-title">Keep the artifact at the center of the review.</h2>
          <p>Artifact Inspector is for work where one rendered artifact stays primary and the person must act on a specific part of it.</p>
        </div>
        <div class="failure-grid">
          <article>
            <h3>Artifact first</h3>
            <p>People select the exact locus that matters. Evidence, actions, feedback, and results stay attached to that location.</p>
          </article>
          <article>
            <h3>Scoped chrome</h3>
            <p>JudgmentKit governs the inspector chrome and inspection overlay. The artifact keeps its own visual language.</p>
          </article>
          <article>
            <h3>Current boundary</h3>
            <p>Version ${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)} can guide the model, but it cannot yet verify the complete working interaction, so review remains required.</p>
          </article>
        </div>
        <div class="link-row">
          <a class="pill-link" href="/docs/#artifact-inspector">Read the Artifact Inspector guide</a>
          <a class="pill-link" href="${escapeHtml(GITHUB_RELEASE_URL)}">Read the ${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)} release notes</a>
        </div>
      </div>
    </section>
    <section class="section proof-paths" aria-labelledby="proof-paths-title">
      <div class="site-shell homepage-section-shell">
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
      </div>
    </section>
    <section class="section adoption-paths" aria-labelledby="adoption-title">
      <div class="site-shell homepage-section-shell">
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
      </div>
    </section>
    ${homepageFilmEnabled ? `
    <script>
      (() => {
        const player = document.querySelector("[data-homepage-film-player]");
        if (!player) return;

        const video = player.querySelector("[data-homepage-film-media]");
        const source = player.querySelector("[data-homepage-film-source]");
        const controls = player.querySelector("[data-homepage-film-controls]");
        const playButton = player.querySelector("[data-homepage-film-play]");
        const playIcon = player.querySelector("[data-homepage-film-play-icon]");
        const pauseIcon = player.querySelector("[data-homepage-film-pause-icon]");
        const scrubber = player.querySelector("[data-homepage-film-scrubber]");
        const muteButton = player.querySelector("[data-homepage-film-mute]");
        const soundIcon = player.querySelector("[data-homepage-film-sound-icon]");
        const mutedIcon = player.querySelector("[data-homepage-film-muted-icon]");

        if (!video || !source || !controls || !playButton || !playIcon || !pauseIcon || !scrubber || !muteButton || !soundIcon || !mutedIcon) return;

        const hasDuration = () => Number.isFinite(video.duration) && video.duration > 0;
        const setIconHidden = (icon, hidden) => {
          if (hidden) {
            icon.setAttribute("hidden", "");
          } else {
            icon.removeAttribute("hidden");
          }
        };
        const updatePlayState = () => {
          const isPlaying = !video.paused && !video.ended;
          const action = isPlaying ? "Pause" : "Play";
          playButton.setAttribute("aria-label", action + " video");
          setIconHidden(playIcon, isPlaying);
          setIconHidden(pauseIcon, !isPlaying);
        };
        const updateProgress = () => {
          const progress = hasDuration()
            ? Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100))
            : 0;
          scrubber.disabled = !hasDuration();
          scrubber.value = String(progress);
          scrubber.style.setProperty("--film-progress", progress + "%");
          scrubber.setAttribute("aria-valuetext", Math.round(progress) + " percent played");
        };
        const updateMuteState = () => {
          const isMuted = video.muted || video.volume === 0;
          const action = isMuted ? "Unmute" : "Mute";
          muteButton.setAttribute("aria-label", action + " video");
          setIconHidden(soundIcon, isMuted);
          setIconHidden(mutedIcon, !isMuted);
        };
        const normalizeAssetUrl = (value) => {
          if (!value) return "";
          try {
            return new URL(value, document.baseURI).href;
          } catch {
            return value;
          }
        };

        const lightSource = player.dataset.filmSourceLight || source.getAttribute("src") || "";
        const lightPoster = player.dataset.filmPosterLight || video.getAttribute("poster") || "";
        const darkSourceCandidate = player.dataset.filmSourceDark || "";
        const darkPosterCandidate = player.dataset.filmPosterDark || "";
        const hasDarkSource = Boolean(
          darkSourceCandidate &&
          normalizeAssetUrl(darkSourceCandidate) !== normalizeAssetUrl(lightSource),
        );
        const hasDarkPoster = Boolean(
          darkPosterCandidate &&
          normalizeAssetUrl(darkPosterCandidate) !== normalizeAssetUrl(lightPoster),
        );
        const hasThemeVariant = hasDarkSource || hasDarkPoster;
        let sourceSwapToken = 0;
        let sourceSwapPending = false;
        let pendingSourceTimeSeconds = null;
        let playbackRequestToken = 0;
        let playbackRequestPending = false;
        let userPaused = false;
        let pausedForVisibility = false;

        const cancelPlaybackRequest = () => {
          playbackRequestToken += 1;
          playbackRequestPending = false;
        };
        const requestPlayback = () => {
          const requestToken = ++playbackRequestToken;
          let request;

          try {
            request = video.play();
          } catch {
            if (requestToken !== playbackRequestToken) return;
            userPaused = true;
            updatePlayState();
            return;
          }

          if (!request || typeof request.then !== "function") {
            updatePlayState();
            return;
          }
          playbackRequestPending = true;
          request.then(() => {
            if (requestToken !== playbackRequestToken) {
              if (sourceSwapPending || userPaused || pausedForVisibility) video.pause();
              return;
            }
            playbackRequestPending = false;
            if (userPaused || pausedForVisibility) {
              video.pause();
              return;
            }
            updatePlayState();
          }).catch(() => {
            if (requestToken !== playbackRequestToken) return;
            playbackRequestPending = false;
            userPaused = true;
            updatePlayState();
          });
        };
        const enforcePlaybackIntent = () => {
          // Loading a replacement source can retrigger declarative autoplay after an explicit pause.
          if (
            player.hasAttribute("data-homepage-film-ready") &&
            (userPaused || pausedForVisibility)
          ) {
            video.pause();
            updatePlayState();
            return;
          }
          updatePlayState();
        };
        const applyVideoSource = (nextSource, nextPoster) => {
          if (nextPoster) video.poster = nextPoster;
          if (!nextSource) return;

          const sourceChanged =
            normalizeAssetUrl(source.getAttribute("src")) !== normalizeAssetUrl(nextSource);
          if (!sourceChanged) return;

          const savedTime = sourceSwapPending && Number.isFinite(pendingSourceTimeSeconds)
            ? pendingSourceTimeSeconds
            : Number.isFinite(video.currentTime)
              ? video.currentTime
              : 0;
          const swapToken = ++sourceSwapToken;

          sourceSwapPending = true;
          pendingSourceTimeSeconds = savedTime;
          cancelPlaybackRequest();
          video.pause();
          source.setAttribute("src", nextSource);
          video.load();

          const restorePlaybackState = () => {
            if (swapToken !== sourceSwapToken) return;
            sourceSwapPending = false;
            const restoredTime = Number.isFinite(pendingSourceTimeSeconds)
              ? pendingSourceTimeSeconds
              : savedTime;
            pendingSourceTimeSeconds = null;
            if (hasDuration()) video.currentTime = Math.min(restoredTime, video.duration);
            updateProgress();
            updateMuteState();
            if (!userPaused && !pausedForVisibility) {
              if (video.paused && !playbackRequestPending) requestPlayback();
              else updatePlayState();
            } else {
              updatePlayState();
            }
          };

          if (video.readyState >= 1) {
            restorePlaybackState();
          } else {
            video.addEventListener("loadedmetadata", restorePlaybackState, { once: true });
          }
        };
        const applyFilmTheme = (useDarkTheme) => {
          const theme = useDarkTheme ? "dark" : "light";
          const nextSource = useDarkTheme && hasDarkSource ? darkSourceCandidate : lightSource;
          const nextPoster = useDarkTheme && hasDarkPoster ? darkPosterCandidate : lightPoster;

          player.setAttribute("data-film-theme", theme);
          applyVideoSource(nextSource, nextPoster);
        };
        const restoreNativeControls = () => {
          controls.hidden = true;
          video.controls = true;
          player.removeAttribute("data-homepage-film-ready");
        };

        try {
          playButton.addEventListener("click", () => {
            if (video.paused || video.ended) {
              userPaused = false;
              pausedForVisibility = false;
              if (video.ended) video.currentTime = 0;
              requestPlayback();
            } else {
              userPaused = true;
              cancelPlaybackRequest();
              video.pause();
            }
          });
          scrubber.addEventListener("input", () => {
            if (!hasDuration()) return;
            video.currentTime = (Number(scrubber.value) / 100) * video.duration;
            updateProgress();
          });
          muteButton.addEventListener("click", () => {
            if (video.muted || video.volume === 0) {
              video.muted = false;
              if (video.volume === 0) video.volume = 1;
            } else {
              video.muted = true;
            }
            if (!userPaused && !pausedForVisibility && video.paused && !playbackRequestPending) {
              requestPlayback();
            }
          });

          video.addEventListener("play", enforcePlaybackIntent);
          video.addEventListener("pause", updatePlayState);
          video.addEventListener("ended", updatePlayState);
          video.addEventListener("timeupdate", updateProgress);
          video.addEventListener("loadedmetadata", updateProgress);
          video.addEventListener("durationchange", updateProgress);
          video.addEventListener("emptied", updateProgress);
          video.addEventListener("volumechange", updateMuteState);
          video.addEventListener("error", restoreNativeControls);

          if (hasThemeVariant && typeof window.matchMedia === "function") {
            const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleThemeChange = (event) => applyFilmTheme(event.matches);
            if (typeof themeQuery.addEventListener === "function") {
              themeQuery.addEventListener("change", handleThemeChange);
            } else if (typeof themeQuery.addListener === "function") {
              themeQuery.addListener(handleThemeChange);
            }
            applyFilmTheme(themeQuery.matches);
          } else {
            applyFilmTheme(false);
          }

          if (!sourceSwapPending && !userPaused && video.paused && !playbackRequestPending) {
            requestPlayback();
          }

          if (typeof window.IntersectionObserver === "function") {
            const visibilityObserver = new window.IntersectionObserver((entries) => {
              const inView = entries.some((entry) => entry.isIntersecting);
              if (!inView) {
                const shouldResume = !video.ended && !userPaused;
                pausedForVisibility = shouldResume;
                if (shouldResume) {
                  cancelPlaybackRequest();
                  if (!video.paused) video.pause();
                }
                return;
              }

              if (pausedForVisibility && !userPaused) {
                pausedForVisibility = false;
                requestPlayback();
              }
            }, { threshold: 0.1 });
            visibilityObserver.observe(player);
          }

          updatePlayState();
          updateProgress();
          updateMuteState();
          controls.hidden = false;
          video.controls = false;
          player.setAttribute("data-homepage-film-ready", "true");
        } catch {
          restoreNativeControls();
        }
      })();
    </script>
    ` : ""}
  `,
    {
      description:
        "JudgmentKit helps AI agents understand the user's work, choose the right interface, and repair what does not fit.",
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

  const evalCatalog = await readJsonIfExists("evals/reports/index.json");
  if (evalCatalog?.latest?.html_report) {
    links.push({
      label: "Latest committed eval report",
      href: evalReportPath(evalCatalog.latest.html_report),
    });
  }

  links.push({
    label: "Eval catalog JSON",
    href: "/evals/index.json",
  });

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

function defaultVisualCompositionPolicy() {
  return createUiImplementationContract().implementation_contract
    .visual_composition_policy;
}

function defaultDesignSystemContract() {
  return createUiImplementationContract().implementation_contract
    .default_ai_native_design_system;
}

function defaultDesignSystemSource() {
  return createUiImplementationContract().implementation_contract
    .design_system_source;
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

function cssCustomPropertyBlock(properties, appearancePolicy, appearanceTokenSets) {
  const lightProperties =
    (appearanceTokenSets ?? []).find((entry) => entry.mode === "light")
      ?.css_custom_properties ?? properties;
  const darkProperties =
    (appearanceTokenSets ?? []).find((entry) => entry.mode === "dark")
      ?.css_custom_properties ?? [];
  const darkQuery =
    appearancePolicy?.css_strategy?.dark_query ?? "@media (prefers-color-scheme: dark)";
  const darkSelector = appearancePolicy?.css_strategy?.dark_selector ?? ":root";
  const rootBlock = `:root {\n  color-scheme: light dark;\n${lightProperties
    .map((entry) => `  ${entry.name}: ${entry.value};`)
    .join("\n")}\n}`;

  if (!darkProperties.length) {
    return rootBlock;
  }

  return `${rootBlock}\n\n${darkQuery} {\n  ${darkSelector} {\n${darkProperties
    .map((entry) => `    ${entry.name}: ${entry.value};`)
    .join("\n")}\n  }\n}`;
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

function renderSpecimenTokenStyleAttribute(context) {
  return context.token_style ? ` style="${escapeHtml(context.token_style)}"` : "";
}

function renderComponentSpecimenPreview(contract, context, scenarios) {
  const runtimeProps = {
    contractId: contract.id,
    contractHash: context.contract_hash,
    scenarios,
    style: context.token_style_object,
  };
  const runtimeHtml = renderToString(
    createElement(ComponentSpecimenPreview, runtimeProps),
  );

  return `<div data-component-specimen-runtime="${escapeHtml(contract.id)}" data-component-specimen-props="${escapeHtml(serializeJsonForHtml(runtimeProps))}">${runtimeHtml}</div>`;
}

const PATTERN_EXAMPLES = {
  marketing: {
    label: "Weeknight meal planning",
    participant: "Busy household comparing meal-planning memberships",
    activity:
      "Understand the offer, inspect a sample plan and trust signals, and choose whether to try it.",
    surface_layout: "landing-page",
    regions: {
      offer: "Get five flexible dinners planned around the food your household already enjoys.",
      proof: "Preview this week's recipes, the average grocery savings, and how easy it is to swap a meal.",
      "primary next step": "Try a free week or inspect the full sample plan before joining.",
    },
    controls: {
      "primary call to action": "Try a free week",
      "secondary information path": "See a sample plan",
    },
    completion:
      "The shopper can start a trial or inspect the recipes, grocery list, and cancellation terms first.",
  },
  workbench: {
    label: "Apartment shortlist",
    participant: "Renter comparing saved apartments",
    activity:
      "Move through saved homes, compare practical evidence, and decide which listing to advance or share.",
    surface_layout: "queue-workspace",
    regions: {
      "work queue": "Four saved apartments remain after filtering for the move-in date and budget.",
      "detail workspace": "184 Oak Street is a two-bedroom apartment available September 15 for $2,420 per month.",
      evidence: "The commute is 24 minutes, laundry is in-unit, and the estimated monthly total is $2,585.",
      "decision or handoff": "Request a tour or share the listing with a partner before deciding.",
    },
    controls: {
      selection: "Open Oak Street",
      "filter or sort": "Sort by total cost",
      "decision action": "Request a tour",
      "handoff action": "Share with partner",
    },
    completion: "Tour requested for Friday at 4:30 PM, with the cost and commute comparison preserved.",
  },
  operator_review: {
    label: "Family trip review",
    participant: "Parent reviewing an AI-generated family itinerary",
    activity:
      "Review the proposed days, reservation evidence, and practical risks before approving or revising the trip.",
    surface_layout: "document-review",
    regions: {
      "produced work": "A four-day Chicago itinerary balances the aquarium, architecture cruise, parks, and free time.",
      evidence: "Opening hours, reservation windows, walking times, and cancellation terms are linked to each day.",
      risk: "The Saturday plan has a 35-minute transfer with a stroller and no weather backup.",
      decision: "Approve the itinerary, request a slower Saturday, or share the draft for another review.",
      receipt: "Record which version was approved and which concern still needs a change.",
    },
    controls: {
      "approve or accept": "Approve itinerary",
      "return or request changes": "Request changes",
      "handoff action": "Share with family",
    },
    completion: "Changes requested for Saturday; Version 3 records the concern and the family reviewer.",
  },
  form_flow: {
    label: "Grocery delivery checkout",
    participant: "Household shopper scheduling a grocery delivery",
    activity:
      "Enter delivery details, resolve validation, review the basket, and place the order.",
    surface_layout: "staged-form",
    regions: {
      inputs: "Confirm the address, delivery window, phone number, and substitution preference.",
      validation: "The phone number is verified for live substitution approval.",
      "review or submit": "Review 18 items, the delivery fee, and the final estimated total before ordering.",
      confirmation: "Order G-204 is scheduled for Tuesday between 6:00 and 7:00 PM.",
    },
    controls: {
      "field controls": "Delivery details",
      "submit action": "Place order",
      "cancel or back action": "Back to basket",
    },
    completion: "Order G-204 is placed with its delivery window, total, and substitution preference confirmed.",
  },
  dashboard_monitor: {
    label: "Home energy monitor",
    participant: "Homeowner monitoring household energy use",
    activity:
      "Understand current energy use, find unusual devices, compare the weekly trend, and decide whether to investigate.",
    surface_layout: "monitoring-dashboard",
    regions: {
      "status summary": "The home has used 18.4 kWh today, 7% below the usual Tuesday level.",
      exceptions: "The water heater and basement dehumidifier used more energy than expected overnight.",
      "trend or comparison": "Daily use declined across the week after the thermostat schedule changed.",
      "follow-up path": "The water heater accounts for the largest unusual load and is ready for inspection.",
    },
    controls: {
      filter: "Upstairs + kitchen",
      "time range": "Last 7 days",
      "drill in": "Inspect water heater",
    },
    completion: "The homeowner knows current usage and which appliance is most likely to need follow-up.",
  },
  content_report: {
    label: "Household budget report",
    participant: "Household member reviewing the monthly budget",
    activity:
      "Read the monthly summary, inspect category details and source transactions, and share the report.",
    surface_layout: "reading-report",
    regions: {
      summary: "August spending was $4,280, which is $190 below the household plan.",
      sections: "Review housing, food, transport, subscriptions, and flexible spending in reading order.",
      "evidence or references": "Each category links to the transactions and notes that make up its total.",
      "share or export": "Copy a stable report link or export a PDF for the monthly household check-in.",
    },
    controls: {
      "table of contents": "Jump to category",
      "copy or export": "Export PDF",
      "reference navigation": "View transactions",
    },
    completion: "The household understands the month and can share a stable, transaction-backed report.",
  },
  setup_debug_tool: {
    label: "Home Wi-Fi connection test",
    participant: "Resident troubleshooting a slow home connection",
    activity:
      "Choose the network and room, run a test, inspect the result, and follow a specific repair step.",
    surface_layout: "developer-console",
    regions: {
      configuration: "Test the Juniper Home network from the living room on a laptop.",
      "test result": "The internet connection is available, but the living-room signal is weak.",
      "diagnostic detail": "Download is 38 Mbps, latency is 42 ms, and signal strength is -72 dBm.",
      "next fix": "Move the mesh point away from the television, then rerun the room test.",
    },
    controls: {
      "run test": "Run Wi-Fi test",
      "copy diagnostic": "Copy diagnostic",
      "retry or repair": "Rerun room test",
    },
    completion: "The resident sees the likely signal problem and has one concrete repair to try next.",
  },
  conversation: {
    label: "Pet-care handoff",
    participant: "Pet owner coordinating with a weekend sitter",
    activity:
      "Continue a care exchange with the feeding plan, medication note, attachments, and delivery status intact.",
    surface_layout: "message-thread",
    regions: {
      "message history": "The sitter confirms Luna ate breakfast and asks whether the evening tablet should be given with food.",
      composer: "Draft the next care instruction without losing the active weekend context.",
      "context or attachments": "The feeding plan, medication note, vet number, and Luna's photo stay attached.",
      status: "The latest care update is delivered and the medication question is awaiting the owner's reply.",
    },
    controls: {
      send: "Send reply",
      "attach or reference": "Attach care note",
      "recover or retry": "Retry last update",
    },
    completion: "The conversation continues or recovers with Luna's care plan and message status intact.",
  },
};

function patternExample(contract) {
  const example = PATTERN_EXAMPLES[contract.id];
  if (!example) {
    throw new Error(`Missing pattern example for ${contract.id}`);
  }

  for (const region of contract.required_regions ?? []) {
    if (!example.regions?.[region]) {
      throw new Error(`Missing ${contract.id} example region: ${region}`);
    }
  }
  for (const control of contract.expected_controls ?? []) {
    if (!example.controls?.[control]) {
      throw new Error(`Missing ${contract.id} example control: ${control}`);
    }
  }

  return example;
}

function renderPatternControl(
  control,
  index,
  label = control,
  className = "",
  type = "button",
) {
  return renderToString(
    createElement(
      ActionButton,
      {
        "aria-label": `${label} (static example)`,
        "data-pattern-control": slugId(control),
        className: className || undefined,
        disabled: true,
        tone: index === 0 ? "decision" : "secondary",
        type,
      },
      label,
    ),
  );
}

function renderPatternActionGroup(label, actions) {
  return renderToString(
    createElement(
      ActionGroup,
      {
        "aria-label": `${label} (static example)`,
        className: "jk-pattern-controls",
        disabled: true,
        id: `pattern-${slugId(label)}-actions`,
      },
      actions.map((action, index) =>
        createElement(
          ActionButton,
          {
            "aria-label": `${action.label} (static example)`,
            "data-pattern-control": slugId(action.control),
            key: action.control,
            tone: action.tone ?? (index === 0 ? "decision" : "secondary"),
            type: action.type ?? "button",
          },
          action.label,
        ),
      ),
    ),
  );
}

function renderPatternStaticLink(control, label, href = "#", className = "jk-surface-text-link") {
  return `<a class="${escapeHtml(className)}" href="${escapeHtml(href)}" data-pattern-control="${escapeHtml(slugId(control))}" data-static-control="true" tabindex="-1">${escapeHtml(label)}</a>`;
}

function renderPatternTextField({
  id,
  label,
  value = "",
  placeholder,
  errorMessage,
  ...inputProps
}) {
  return renderToString(
    createElement(TextField, {
      id,
      label,
      value,
      placeholder,
      errorMessage,
      readOnly: true,
      tabIndex: -1,
      "aria-disabled": "true",
      ...inputProps,
    }),
  );
}

function renderPatternTextArea({ id, label, placeholder, value = "" }) {
  return renderToString(
    createElement(TextArea, {
      id,
      label,
      value,
      placeholder,
      readOnly: true,
      rows: 3,
      tabIndex: -1,
      "aria-disabled": "true",
    }),
  );
}

function renderPatternSelectField({ control, id, label, value, options }) {
  return renderToString(
    createElement(SelectField, {
      "data-pattern-control": control ? slugId(control) : undefined,
      id,
      label,
      value,
      options,
      tabIndex: -1,
      "aria-disabled": "true",
    }),
  );
}

function renderPatternSurfaceShell(contract, example, content) {
  return `<section class="jk-pattern-surface jk-pattern-surface-${escapeHtml(slugId(contract.id))}" data-pattern-surface="${escapeHtml(contract.id)}" data-surface-layout="${escapeHtml(example.surface_layout)}" data-fictional-example="true" aria-label="${escapeHtml(example.label)} fictional static UI example">
              <div class="jk-pattern-static-label"><span aria-hidden="true"></span>Fictional static UI example</div>
              ${content}
            </section>`;
}

function renderMarketingSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-marketing-shell">
                <div class="jk-surface-marketing-nav">
                  <strong>Savor</strong>
                  <span>How it works</span>
                  <span>Recipes</span>
                  <span>Pricing</span>
                </div>
                <div class="jk-surface-marketing-hero">
                  <section class="jk-surface-marketing-offer" data-pattern-region="offer">
                    <p class="jk-surface-kicker">Five dinners. One calm week.</p>
                    <h4>${escapeHtml(example.regions.offer)}</h4>
                    <p>Flexible recipes, one organized grocery list, and simple swaps for nights when plans change.</p>
                    ${renderPatternControl("primary call to action", 0, example.controls["primary call to action"])}
                    <small>No card required · Cancel any time</small>
                  </section>
                  <aside class="jk-surface-marketing-proof" id="meal-plan" data-pattern-region="proof" aria-label="This week's sample plan">
                    <div class="jk-surface-plan-card">
                      <div><span>Mon</span><strong>Lemon herb pasta</strong><small>25 min · family favorite</small></div>
                      <div><span>Wed</span><strong>Crispy tofu bowls</strong><small>30 min · easy swap</small></div>
                      <div><span>Fri</span><strong>Sheet-pan fajitas</strong><small>35 min · one pan</small></div>
                    </div>
                    <dl class="jk-surface-proof-stats">
                      <div><dt>4.8/5</dt><dd>member rating</dd></div>
                      <div><dt>$34</dt><dd>average weekly savings</dd></div>
                    </dl>
                    ${renderPatternStaticLink("secondary information path", example.controls["secondary information path"], "#meal-plan")}
                  </aside>
                </div>
                <footer class="jk-surface-marketing-next" data-pattern-region="primary-next-step" data-pattern-completion>
                  <strong>See the whole week before joining.</strong>
                  <span>Recipes, grocery list, swaps, and cancellation terms are included.</span>
                </footer>
              </div>`,
  );
}

function renderWorkbenchSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-workbench-shell">
                <header class="jk-surface-toolbar">
                  <div><span class="jk-surface-kicker">4 saved homes</span><h4>Apartment shortlist</h4></div>
                  ${renderPatternSelectField({
                    control: "filter or sort",
                    id: "apartment-sort",
                    label: "Sort homes",
                    value: "total-cost",
                    options: [
                      { value: "total-cost", label: "Total monthly cost" },
                      { value: "commute", label: "Commute time" },
                      { value: "move-in", label: "Move-in date" },
                    ],
                  })}
                </header>
                <div class="jk-surface-workbench-layout">
                  <aside class="jk-surface-work-queue" data-pattern-region="work-queue" aria-label="Saved apartments">
                    <table class="jk-surface-queue">
                      <thead><tr><th>Home</th><th>Total</th></tr></thead>
                      <tbody>
                        <tr class="is-selected" aria-current="true"><td><span class="sr-only">Selected apartment: </span>${renderPatternControl("selection", 1, "184 Oak Street", "jk-surface-queue-selection")}</td><td>$2,585</td></tr>
                        <tr><td>32 Garden Lane</td><td>$2,640</td></tr>
                        <tr><td>8 Lakeview Court</td><td>$2,710</td></tr>
                        <tr><td>77 Mercer Avenue</td><td>$2,760</td></tr>
                      </tbody>
                    </table>
                  </aside>
                  <section class="jk-surface-workspace" data-pattern-region="detail-workspace">
                    <header><div><span class="jk-surface-kicker">Top match</span><h5>184 Oak Street</h5></div><strong>$2,420/mo</strong></header>
                    <section class="jk-surface-home-summary" aria-label="Oak Street shortlist summary">
                      <div><span>Budget fit</span><strong>$165 under max</strong></div>
                      <div><span>Commute rank</span><strong>2nd of 4</strong></div>
                      <div><span>Move-in</span><strong>September 15</strong></div>
                    </section>
                    <dl class="jk-surface-home-facts">
                      <div><dt>Commute</dt><dd>24 min</dd></div>
                      <div><dt>Monthly total</dt><dd>$2,585</dd></div>
                      <div><dt>Laundry</dt><dd>In unit</dd></div>
                    </dl>
                    <section class="jk-surface-evidence" data-pattern-region="evidence">
                      <h6>What stands out</h6>
                      <ul><li>Quiet street after 8 PM</li><li>Groceries within a 6-minute walk</li><li>$45 pet fee included in total</li></ul>
                    </section>
                    <footer class="jk-surface-decision-bar" data-pattern-region="decision-or-handoff">
                      ${renderPatternActionGroup("Apartment decision actions", [
                        { control: "decision action", label: example.controls["decision action"] },
                        { control: "handoff action", label: example.controls["handoff action"] },
                      ])}
                      <p class="jk-pattern-completion" data-pattern-completion>${escapeHtml(example.completion)}</p>
                    </footer>
                  </section>
                </div>
              </div>`,
  );
}

function renderOperatorReviewSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-review-shell">
                <header class="jk-surface-toolbar">
                  <div><span class="jk-surface-kicker">Family trip · Version 3</span><h4>Chicago · 4 days</h4></div>
                  <span class="jk-surface-status-pill is-review">Changes requested</span>
                </header>
                <div class="jk-surface-review-layout">
                  <article class="jk-surface-review-document" data-pattern-region="produced-work">
                    <header><span>Saturday · Museum Campus</span><strong>Aquarium, lakefront, and an easy dinner</strong></header>
                    <ol class="jk-surface-itinerary">
                      <li><time>9:00</time><div><strong>Shedd Aquarium</strong><span>Timed entry · confirmation held</span></div></li>
                      <li><time>1:15</time><div><strong>Lakefront lunch</strong><span>Indoor backup nearby</span></div></li>
                      <li class="is-flagged"><time>3:00</time><div><strong>Architecture cruise</strong><span>35-minute transfer with stroller</span></div></li>
                      <li><time>6:30</time><div><strong>Pizza near the hotel</strong><span>Reservation optional</span></div></li>
                    </ol>
                  </article>
                  <aside class="jk-surface-review-rail">
                    <section data-pattern-region="evidence"><h5>Checked details</h5><ul><li>Hours verified today</li><li>Tickets refundable until Friday</li><li>Walking times include stroller pace</li></ul></section>
                    <section class="jk-surface-risk" data-pattern-region="risk"><h5>Saturday concern</h5><p>No weather backup and only 35 minutes between venues.</p></section>
                  </aside>
                </div>
                <section class="jk-surface-review-decision" data-pattern-region="decision">
                  ${renderPatternActionGroup("Itinerary review actions", [
                    { control: "approve or accept", label: example.controls["approve or accept"] },
                    { control: "return or request changes", label: example.controls["return or request changes"] },
                    { control: "handoff action", label: example.controls["handoff action"] },
                  ])}
                </section>
                <section class="jk-surface-review-receipt" data-pattern-region="receipt" data-pattern-completion>
                  <strong>Changes requested</strong><span>${escapeHtml(example.completion)}</span>
                </section>
              </div>`,
  );
}

function renderFormFlowSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<form class="jk-surface-form" aria-label="Grocery delivery checkout">
                <header><span class="jk-surface-kicker">FreshCart · 18 items</span><h4>Delivery checkout</h4></header>
                <ol class="jk-surface-steps" aria-label="Checkout progress">
                  <li class="is-complete"><span class="sr-only">Completed step: </span>Basket</li><li class="is-complete"><span class="sr-only">Completed step: </span>Delivery</li><li class="is-complete"><span class="sr-only">Completed step: </span>Review</li><li class="is-current" aria-current="step">Confirmation</li>
                </ol>
                <fieldset class="jk-surface-field-grid" data-pattern-region="inputs" data-pattern-control="field-controls">
                  <legend>Delivery details</legend>
                  ${renderPatternTextField({ id: "grocery-address", label: "Address", value: "42 Maple Avenue", autoComplete: "street-address" })}
                  ${renderPatternSelectField({
                    id: "grocery-window",
                    label: "Delivery window",
                    value: "tue-6",
                    options: [
                      { value: "tue-6", label: "Tue · 6–7 PM" },
                      { value: "tue-7", label: "Tue · 7–8 PM" },
                      { value: "wed-5", label: "Wed · 5–6 PM" },
                    ],
                  })}
                  ${renderPatternTextField({ id: "grocery-phone", label: "Phone for substitutions", value: "(555) 014-2068", type: "tel", inputMode: "tel", autoComplete: "tel", required: true })}
                  ${renderPatternSelectField({
                    id: "grocery-substitutions",
                    label: "Substitutions",
                    value: "ask-first",
                    options: [
                      { value: "ask-first", label: "Ask me before replacing" },
                      { value: "best-match", label: "Choose the closest match" },
                      { value: "refund", label: "Refund unavailable items" },
                    ],
                  })}
                </fieldset>
                <p class="jk-surface-field-valid" data-pattern-region="validation"><strong>Validation complete.</strong> ${escapeHtml(example.regions.validation)}</p>
                <section class="jk-surface-order-review" data-pattern-region="review-or-submit">
                  <dl><div><dt>Items</dt><dd>$82.40</dd></div><div><dt>Delivery</dt><dd>$4.99</dd></div><div><dt>Estimated total</dt><dd>$87.39</dd></div></dl>
                  ${renderPatternActionGroup("Checkout actions", [
                    { control: "cancel or back action", label: example.controls["cancel or back action"], tone: "secondary" },
                    { control: "submit action", label: example.controls["submit action"], tone: "decision", type: "submit" },
                  ])}
                </section>
                <footer class="jk-surface-confirmation" data-pattern-region="confirmation" data-pattern-completion>
                  <strong>Order G-204 confirmed</strong><span>${escapeHtml(example.completion)}</span>
                </footer>
              </form>`,
  );
}

function renderDashboardSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-dashboard-shell">
                <header class="jk-surface-toolbar">
                  <div><span class="jk-surface-kicker">Maple Avenue</span><h4>Home energy</h4></div>
                  <div class="jk-surface-filter-row">
                    ${renderPatternSelectField({
                      control: "filter",
                      id: "energy-area",
                      label: "Area",
                      value: "upstairs-kitchen",
                      options: [
                        { value: "whole-home", label: "Whole home" },
                        { value: "upstairs-kitchen", label: "Upstairs + kitchen" },
                        { value: "basement", label: "Basement" },
                      ],
                    })}
                    ${renderPatternSelectField({
                      control: "time range",
                      id: "energy-range",
                      label: "Time range",
                      value: "7-days",
                      options: [
                        { value: "today", label: "Today" },
                        { value: "7-days", label: "Last 7 days" },
                        { value: "30-days", label: "Last 30 days" },
                      ],
                    })}
                  </div>
                </header>
                <section class="jk-surface-metric-grid" data-pattern-region="status-summary">
                  <article><span>Today</span><strong>18.4 kWh</strong><small>7% below usual</small></article>
                  <article><span>Current draw</span><strong>1.2 kW</strong><small>Mostly heating</small></article>
                  <article><span>Estimated month</span><strong>$142</strong><small>$11 under plan</small></article>
                </section>
                <div class="jk-surface-dashboard-layout">
                  <section class="jk-surface-trend" data-pattern-region="trend-or-comparison">
                    <header><div><h5>Daily use</h5><span>Down after the thermostat change</span></div><strong>−9%</strong></header>
                    <table class="jk-surface-trend-table" aria-label="Daily home energy use over the last seven days">
                      <thead><tr><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th><th>Mon</th><th>Tue</th></tr></thead>
                      <tbody><tr><td>23.1</td><td>21.4</td><td>22.2</td><td>20.1</td><td>19.4</td><td>18.9</td><td><strong>18.4</strong></td></tr></tbody>
                    </table>
                    <p class="jk-surface-trend-note">kWh per day · Tuesday is 9% below last Wednesday</p>
                  </section>
                  <section class="jk-surface-exception-panel" data-pattern-region="exceptions">
                    <h5>Needs attention</h5>
                    <table class="jk-surface-exceptions"><thead><tr><th>Device</th><th>Change</th></tr></thead><tbody><tr><td>Water heater</td><td>+18%</td></tr><tr><td>Dehumidifier</td><td>+9%</td></tr></tbody></table>
                  </section>
                </div>
                <footer class="jk-surface-follow-up" data-pattern-region="follow-up-path" data-pattern-completion>
                  <div><strong>Water heater used 3.8 kWh overnight</strong><span>Largest unusual load · compare schedule and temperature</span></div>
                  ${renderPatternControl("drill in", 0, example.controls["drill in"])}
                </footer>
              </div>`,
  );
}

function renderContentReportSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-report-shell">
                <header class="jk-surface-report-toolbar">
                  <div><span class="jk-surface-kicker">August 2026</span><h4>Household budget</h4></div>
                  ${renderPatternControl("copy or export", 1, example.controls["copy or export"])}
                </header>
                <div class="jk-surface-report-layout">
                  <nav class="jk-surface-report-toc" data-pattern-region="sections" data-pattern-control="table-of-contents" aria-label="Budget report contents">
                    <strong>In this report</strong>
                    <a href="#budget-summary" data-static-control="true" tabindex="-1">Summary</a>
                    <a href="#budget-categories" data-static-control="true" tabindex="-1">Categories</a>
                    <a href="#budget-notes" data-static-control="true" tabindex="-1">Notes</a>
                  </nav>
                  <article class="jk-surface-report-body">
                    <section id="budget-summary" data-pattern-region="summary">
                      <span class="jk-surface-status-pill is-good">$190 below plan</span>
                      <h5>August stayed on track</h5>
                      <p>Total spending was <strong>$4,280</strong>. Grocery costs rose, while transport and flexible spending came in lower than planned.</p>
                    </section>
                    <section id="budget-categories" class="jk-surface-budget-categories">
                      <table aria-label="Budget category totals compared with plan">
                        <thead><tr><th>Category</th><th>Actual</th><th>Plan</th><th>Result</th></tr></thead>
                        <tbody>
                          <tr><th scope="row">Housing</th><td>$2,120</td><td>$2,120</td><td>On plan</td></tr>
                          <tr><th scope="row">Food</th><td>$760</td><td>$650</td><td>$110 over</td></tr>
                          <tr><th scope="row">Transport</th><td>$410</td><td>$520</td><td>$110 under</td></tr>
                          <tr><th scope="row">Everything else</th><td>$990</td><td>$1,180</td><td>$190 under</td></tr>
                        </tbody>
                      </table>
                    </section>
                    <section id="budget-notes" class="jk-surface-report-evidence" data-pattern-region="evidence-or-references">
                      <h5>Why food was higher</h5><p>Two hosted dinners added $96. Every category total is backed by its source transactions.</p>
                      <span id="budget-transactions" class="sr-only">Budget source transactions</span>
                      ${renderPatternStaticLink("reference navigation", example.controls["reference navigation"], "#budget-transactions")}
                    </section>
                  </article>
                </div>
                <footer class="jk-surface-report-share" data-pattern-region="share-or-export" data-pattern-completion>
                  <strong>Report ready to share</strong><span>Stable link · transaction-backed totals · PDF available</span>
                </footer>
              </div>`,
  );
}

function renderSetupDebugSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-debug-shell">
                <header class="jk-surface-toolbar"><div><span class="jk-surface-kicker">Juniper Home</span><h4>Wi-Fi connection test</h4></div><span class="jk-surface-status-pill is-warning">Weak signal</span></header>
                <div class="jk-surface-debug-layout">
                  <form class="jk-surface-debug-config" data-pattern-region="configuration" aria-label="Wi-Fi test configuration">
                    ${renderPatternSelectField({
                      id: "wifi-network",
                      label: "Network",
                      value: "juniper-home",
                      options: [
                        { value: "juniper-home", label: "Juniper Home" },
                        { value: "juniper-guest", label: "Juniper Guest" },
                      ],
                    })}
                    ${renderPatternSelectField({
                      id: "wifi-room",
                      label: "Room",
                      value: "living-room",
                      options: [
                        { value: "living-room", label: "Living room" },
                        { value: "bedroom", label: "Bedroom" },
                        { value: "home-office", label: "Home office" },
                      ],
                    })}
                    ${renderPatternSelectField({
                      id: "wifi-device",
                      label: "Device",
                      value: "laptop",
                      options: [
                        { value: "laptop", label: "Laptop" },
                        { value: "phone", label: "Phone" },
                        { value: "television", label: "Television" },
                      ],
                    })}
                    ${renderPatternControl("run test", 0, example.controls["run test"], "", "submit")}
                  </form>
                  <section class="jk-surface-test-result" data-pattern-region="test-result">
                    <span class="jk-surface-result-icon" aria-hidden="true">!</span>
                    <div><strong>Connected, but the signal is weak</strong><p>Browsing should work; video calls may become unstable.</p></div>
                  </section>
                  <section class="jk-surface-diagnostic" data-pattern-region="diagnostic-detail">
                    <header><h5>Room diagnostic</h5>${renderPatternControl("copy diagnostic", 1, example.controls["copy diagnostic"])} </header>
                    <pre class="jk-surface-console"><code>download   38 Mbps
latency    42 ms
signal    -72 dBm
channel     149
mesh hop      2</code></pre>
                  </section>
                </div>
                <footer class="jk-surface-next-fix" data-pattern-region="next-fix" data-pattern-completion>
                  <div><strong>Move the mesh point away from the television</strong><span>Then rerun this room test to compare the signal.</span></div>
                  ${renderPatternControl("retry or repair", 1, example.controls["retry or repair"])}
                </footer>
              </div>`,
  );
}

function renderConversationSurface(contract, example) {
  return renderPatternSurfaceShell(
    contract,
    example,
    `<div class="jk-surface-conversation-shell">
                <header class="jk-surface-conversation-header" data-pattern-region="status" data-pattern-completion>
                  <div class="jk-surface-avatar" aria-hidden="true">L</div>
                  <div><h4>Luna · Weekend care</h4><span>Latest update delivered · medication question waiting</span></div>
                  <span class="jk-surface-status-dot">Delivered</span>
                </header>
                <div class="jk-surface-conversation-layout">
                  <section class="jk-surface-thread" data-pattern-region="message-history">
                    <ol class="jk-surface-messages">
                      <li class="is-incoming"><span>Sam · 8:12 AM</span><p>Luna ate all of breakfast and had her morning walk.</p></li>
                      <li class="is-outgoing"><span>You · 8:18 AM</span><p>Perfect—thank you. Her blue tablet is due with dinner.</p><small>Delivered</small></li>
                      <li class="is-incoming"><span>Sam · 5:42 PM</span><p>Should I hide the tablet in food, or give it just after she eats?</p></li>
                      <li class="is-recovered"><span>Earlier update · recovered</span><p>The photo upload finished after reconnecting.</p>${renderPatternControl("recover or retry", 1, example.controls["recover or retry"], "jk-surface-retry")}</li>
                    </ol>
                    <form class="jk-surface-composer" data-pattern-region="composer" aria-label="Reply composer">
                      ${renderPatternTextArea({ id: "pet-care-reply", label: "Reply to Sam", placeholder: "Write a care update" })}
                      ${renderPatternActionGroup("Pet-care message actions", [
                        { control: "attach or reference", label: example.controls["attach or reference"], tone: "secondary" },
                        { control: "send", label: example.controls.send, tone: "decision", type: "submit" },
                      ])}
                    </form>
                  </section>
                  <aside class="jk-surface-context" data-pattern-region="context-or-attachments">
                    <h5>Care plan</h5>
                    <dl><div><dt>Dinner</dt><dd>6:00 PM · 1 cup</dd></div><div><dt>Medication</dt><dd>Blue tablet with food</dd></div><div><dt>Vet</dt><dd>Northside Animal Care</dd></div></dl>
                    <div class="jk-surface-attachment"><span aria-hidden="true">JPG</span><div><strong>Luna-medication.jpg</strong><small>Attached by you</small></div></div>
                  </aside>
                </div>
              </div>`,
  );
}

const PATTERN_SURFACE_RENDERERS = {
  marketing: renderMarketingSurface,
  workbench: renderWorkbenchSurface,
  operator_review: renderOperatorReviewSurface,
  form_flow: renderFormFlowSurface,
  dashboard_monitor: renderDashboardSurface,
  content_report: renderContentReportSurface,
  setup_debug_tool: renderSetupDebugSurface,
  conversation: renderConversationSurface,
};

function renderPatternSpecimenPreview(contract, context) {
  const id = specimenId("pattern", contract.id);
  const example = patternExample(contract);
  const renderSurface = PATTERN_SURFACE_RENDERERS[contract.id];
  if (!renderSurface) {
    throw new Error(`Missing pattern surface renderer for ${contract.id}`);
  }

  return `<div class="jk-specimen-preview jk-pattern-preview" data-specimen-id="${escapeHtml(id)}" data-pattern-example="${escapeHtml(contract.id)}" data-contract-id="${escapeHtml(contract.id)}" data-contract-hash="${escapeHtml(context.contract_hash)}" data-surface-type="${escapeHtml(contract.surface_type)}"${renderSpecimenTokenStyleAttribute(context)}>
            ${renderSurface(contract, example)}
          </div>`;
}

function buildSpecimenContext(adapter, system) {
  const appearancePropertyNames = new Set(
    (adapter.appearance_token_sets ?? []).flatMap((tokenSet) =>
      (tokenSet.css_custom_properties ?? []).map((property) => property.name),
    ),
  );
  const nonAppearanceProperties = appearancePropertyNames.size
    ? adapter.css_custom_properties.filter(
        (property) => !appearancePropertyNames.has(property.name),
      )
    : adapter.css_custom_properties;

  return {
    token_hash: hashCanonical({
      css_custom_properties: adapter.css_custom_properties,
      appearance_policy: adapter.appearance_policy,
      appearance_token_sets: adapter.appearance_token_sets,
    }),
    icon_catalog_hash: hashCanonical(adapter.icon_catalog),
    design_system_contract_hash: hashCanonical(system),
    token_style: cssCustomPropertyStyle(nonAppearanceProperties),
    token_style_object: Object.fromEntries(
      nonAppearanceProperties.map((property) => [property.name, property.value]),
    ),
  };
}

function buildComponentSpecimens(contracts, context, evidenceContext) {
  const runtimeContracts = contracts.filter((contract) =>
    RUNTIME_COMPONENT_IDS.includes(contract.id),
  );

  return runtimeContracts.map((contract) => {
    const id = specimenId("component", contract.id);
    const registryEntry = COMPONENT_IMPLEMENTATION_REGISTRY.find(
      (entry) => entry.contract_id === contract.id,
    );
    const contractHash = evidenceContext.contract_hashes[contract.id];
    const scenarios = evidenceContext.scenarios.filter(
      (scenario) => scenario.contract_id === contract.id,
    );
    const renderedHtml = renderComponentSpecimenPreview(contract, {
      ...context,
      contract_hash: contractHash,
    }, scenarios);
    const states = contract.required_states ?? [];
    const coveredStates = coveredStatesForContract(
      contract.id,
      evidenceContext.scenarios,
    );
    const unverifiedStates = states.filter(
      (state) => !coveredStates.includes(state),
    );
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
      renderer_id: COMPONENT_SPECIMEN_RENDERER.id,
      renderer_version: COMPONENT_SPECIMEN_RENDERER.version,
      package_export: COMPONENT_SPECIMEN_RENDERER.package_export,
      stylesheet_export: COMPONENT_SPECIMEN_RENDERER.stylesheet_export,
      public_export: registryEntry?.public_export,
      implementation_hash:
        evidenceContext.implementation_hashes[contract.id],
      implementation_sources: evidenceContext.implementation_sources,
      fixture_output_hash:
        evidenceContext.fixture_output_hashes[contract.id],
      output_hash: hashText(renderedHtml),
      selectors: {
        root: attrSelector("data-specimen-id", id),
        states: Object.fromEntries(
          states.map((state) => [
            state,
            `${attrSelector("data-specimen-id", id)} ${attrSelector("data-scenario-id", `${contract.id}.${state}`)}`,
          ]),
        ),
        anatomy: Object.fromEntries(
          anatomy.map((item) => [
            item,
            `${attrSelector("data-component-specimen", contract.id)} ${attrSelector("data-component-anatomy", slugId(item))}`,
          ]),
        ),
        token_bindings: Object.fromEntries(
          tokenBindings.map((role) => [
            role,
            `${attrSelector("data-component-specimen", contract.id)} ${attrSelector("data-token-role", slugId(role))}`,
          ]),
        ),
      },
      required_states: states,
      covered_states: coveredStates,
      unverified_states: unverifiedStates,
      scenarios,
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
    const example = patternExample(contract);
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
      example,
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
    component_renderer: COMPONENT_SPECIMEN_RENDERER,
    pattern_renderer: DESIGN_SYSTEM_SPECIMEN_RENDERER,
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
      implementation_hash: specimen.implementation_hash,
      output_hash: specimen.output_hash,
      required_states: specimen.required_states,
      covered_states: specimen.covered_states,
      unverified_states: specimen.unverified_states,
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
      purpose: "Active default design-system source for implementation contracts.",
      routes: model.pages.map((pageEntry) => ({
        id: pageEntry.id,
        title: pageEntry.title,
        html: pageEntry.path,
        markdown: pageEntry.markdown_path,
      })),
      exports: {
        manifest: "/design-system/manifest.json",
        visual_token_adapter: "/design-system/visual-token-adapter.json",
        visual_composition_policy:
          "/design-system/visual-composition-policy.json",
        component_inventory: "/design-system/component-inventory.json",
        component_registry: "/design-system/component-registry.json",
        component_contracts: "/design-system/component-contracts.json",
        pattern_contracts: "/design-system/pattern-contracts.json",
        surface_presentation_profiles:
          "/design-system/surface-presentation-profiles.json",
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
        visual_composition_policy_id: model.visual_composition_policy.id,
        design_system_contract_id: model.system.id,
        component_reference_inventory_id:
          model.component_reference_inventory.inventory_id,
        lucide: model.adapter.icon_catalog,
      },
      principles: model.principles,
    },
    visualTokenAdapter: model.adapter,
    visualCompositionPolicy: model.visual_composition_policy,
    componentInventory: model.component_reference_inventory,
    componentContracts: {
      source: model.system.id,
      contracts: model.component_contracts,
    },
    componentRegistry: {
      source: model.system.id,
      adapter: COMPONENT_RUNTIME_ADAPTER,
      renderer_components: model.design_system_source.renderer_components,
      registry: model.component_registry,
      scenarios: model.component_scenarios,
      evidence: model.component_evidence,
    },
    patternContracts: {
      source: model.system.id,
      contracts: model.pattern_contracts,
    },
    surfacePresentationProfiles: {
      source: model.design_system_source.id,
      contract_source: model.system.id,
      visual_token_adapter_id: model.adapter.id,
      profiles: model.surface_presentation_profiles,
    },
    componentSpecimens: {
      source: model.system.id,
      renderer: COMPONENT_SPECIMEN_RENDERER,
      evidence: model.component_evidence,
      contract_coverage: model.component_contracts.map((contract) => {
        const registryEntry = model.component_registry.find(
          (entry) => entry.contract_id === contract.id,
        );
        const scenarios = model.component_scenarios.filter(
          (scenario) => scenario.contract_id === contract.id,
        );

        return {
          contract_id: contract.id,
          classification: registryEntry?.classification ?? "contract_only",
          implementation_status:
            registryEntry?.implementation_status ?? "not_implemented",
          required_states: contract.required_states ?? [],
          covered_states: coveredStatesForContract(
            contract.id,
            model.component_scenarios,
          ),
          unverified_states: scenarios
            .filter((scenario) => scenario.status !== "verified")
            .map((scenario) => scenario.state),
        };
      }),
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
  const visualCompositionPolicy = defaultVisualCompositionPolicy();
  const system = defaultDesignSystemContract();
  const designSystemSource = defaultDesignSystemSource();
  const accessibilityPolicy = defaultAccessibilityPolicy();
  const componentReferenceInventory = listComponentReferenceInventory();
  const componentContracts = system.component_contracts ?? [];
  const patternContracts = system.pattern_contracts ?? [];
  const componentRegistry = listComponentImplementationRegistry();
  const surfacePresentationProfiles = listSurfacePresentationProfiles();
  const specimenContext = buildSpecimenContext(adapter, system);
  const componentEvidence = buildComponentEvidenceContext(
    componentContracts,
    specimenContext,
  );
  const componentReferenceCoverage = summarizeComponentReferenceCoverage(
    componentReferenceInventory,
    componentContracts,
    componentRegistry,
    componentEvidence.scenarios,
  );
  const componentSpecimens = buildComponentSpecimens(
    componentContracts,
    specimenContext,
    componentEvidence,
  );
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
        "Active default design-system source and review contracts for building JudgmentKit interfaces: tokens, typography, icons, components, patterns, provenance, and accessibility.",
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
      eyebrow: "Design system",
      summary:
        "Reusable JudgmentKit components and states, informed by the breadth of Simple Design System without copying its styling.",
      sections: [
        "Inventory",
        "Usage",
        "Components",
        "Component guidance",
        "Quality checklist",
        "Accessibility",
      ],
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
      sections: [
        "Surface patterns",
        "Pattern examples",
        "Presentation profiles",
        "Review checks",
        "Accessibility",
      ],
      examples: [],
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
        "Reference inventory, semantic dispositions, contracts, runtime candidates, and current evidence status.",
      meta: `${componentReferenceInventory.totals.all.families} reference families · ${componentContracts.length} contracts · ${componentSpecimens.length} runtime`,
    },
    {
      title: "Patterns",
      href: "/design-system/patterns/",
      summary:
        "Surface contracts for marketing, workbench, review, artifact inspection, form, dashboard, report, setup, and conversation work.",
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
    design_system_source: designSystemSource,
    adapter,
    visual_composition_policy: visualCompositionPolicy,
    component_contracts: componentContracts,
    component_reference_inventory: componentReferenceInventory,
    component_reference_coverage: componentReferenceCoverage,
    component_registry: componentRegistry,
    component_scenarios: componentEvidence.scenarios,
    component_evidence: {
      current: componentEvidence.current,
      run_id: componentEvidence.current
        ? componentEvidence.bundle?.run_id ?? null
        : null,
      source_run_id: componentEvidence.bundle?.run_id ?? null,
      browser_version: componentEvidence.current
        ? componentEvidence.bundle?.browser_version ?? null
        : null,
      implementation_hash: componentEvidence.implementation_hash,
      implementation_sources: componentEvidence.implementation_sources,
      fixture_output_hashes: componentEvidence.fixture_output_hashes,
      package_status: componentEvidence.current
        ? componentEvidence.bundle?.package_status ?? "unverified"
        : "unverified",
      automated_accessibility_status:
        componentEvidence.current
          ? componentEvidence.bundle?.automated_accessibility_status ??
            "unverified"
          : "unverified",
      automated_evidence_hash: componentEvidence.current
        ? componentEvidence.bundle?.automated_evidence_hash ?? null
        : null,
      unsupported_claims: [
        ...COMPONENT_RUNTIME_ADAPTER.support_limits,
      ],
      reviewer_receipt: componentEvidence.bundle?.reviewer_receipt ?? null,
    },
    pattern_contracts: patternContracts,
    surface_presentation_profiles: surfacePresentationProfiles,
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

function renderSectionRailAnchor(item) {
  const currentValue = item.current ? (item.currentValue ?? "page") : "";
  const targetAttribute = item.href.startsWith("#")
    ? ` data-section-rail-target="${escapeHtml(item.href.slice(1))}"`
    : "";
  const currentAttribute = currentValue ? ` aria-current="${escapeHtml(currentValue)}"` : "";

  return `<a href="${escapeHtml(item.href)}" data-section-rail-link${targetAttribute}${currentAttribute}>${escapeHtml(item.label)}</a>`;
}

function renderSectionRailNav({ label, items, className = "" }) {
  const classes = ["section-rail-nav", className].filter(Boolean).join(" ");
  return `<aside class="${escapeHtml(classes)}" aria-label="${escapeHtml(label)}">
          ${items
            .map((item) => renderSectionRailAnchor(item))
            .join("\n          ")}
        </aside>`;
}

function renderSectionRailMenu({ label, items, activeLabel, menuId, className = "" }) {
  const classes = ["section-rail-menu", className].filter(Boolean).join(" ");

  return `<div class="${escapeHtml(classes)}" data-section-rail-menu>
          <button
            class="section-rail-menu-button"
            type="button"
            aria-expanded="false"
            aria-controls="${escapeHtml(menuId)}"
            aria-haspopup="true"
            data-section-rail-menu-button
          >
            <span data-section-rail-current-label>${escapeHtml(activeLabel)}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <div class="section-rail-menu-backdrop" hidden data-section-rail-menu-backdrop></div>
          <div class="section-rail-menu-list" id="${escapeHtml(menuId)}" hidden data-section-rail-menu-list aria-label="${escapeHtml(label)}">
            ${items
              .map((item) => renderSectionRailAnchor(item))
              .join("\n            ")}
          </div>
        </div>`;
}

function designSystemRailItems(model, activeId) {
  return model.pages.map((pageEntry) => ({
    href: pageEntry.path,
    label: pageEntry.nav_label,
    current: pageEntry.id === activeId,
  }));
}

function renderDesignSystemNav(model, activeId) {
  return renderSectionRailNav({
    label: "Design system sections",
    items: designSystemRailItems(model, activeId),
    className: "design-system-nav",
  });
}

function renderDesignSystemSectionMenu(model, activeId) {
  const activePage = model.pages.find((pageEntry) => pageEntry.id === activeId) ?? model.pages[0];
  const menuId = `design-system-section-menu-${activeId}`;

  return renderSectionRailMenu({
    label: "Design system sections",
    items: designSystemRailItems(model, activeId),
    activeLabel: activePage.nav_label,
    menuId,
    className: "design-system-section-menu",
  });
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
      <div class="site-shell doc-layout design-system-layout">
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
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>${detail ? `<dd class="design-system-metric-detail">${escapeHtml(detail)}</dd>` : ""}</div>`;
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
  if (!items.length) {
    return '<p class="note">None</p>';
  }

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
                  required_states: specimen.required_states,
                  verified_states: specimen.covered_states,
                  pending_states: specimen.unverified_states,
                  anatomy: specimen.covered_anatomy,
                  token_bindings: specimen.covered_token_bindings,
                  accessibility_checks: specimen.accessibility_checks,
                  review_checks: specimen.review_checks,
                  failure_signals: specimen.contract.failure_signals ?? [],
                };

                return `<article class="design-system-specimen" id="${escapeHtml(specimenAnchor(specimen.contract_id))}" data-component-specimen="${escapeHtml(specimen.contract_id)}">
              <header class="design-system-specimen-header">
                <div>
                  <h3>${escapeHtml(specimen.label)}</h3>
                  <p>${escapeHtml(specimen.purpose)}</p>
                </div>
              </header>
              <div class="design-system-specimen-body">
                <div class="design-system-specimen-preview-frame">
                  ${specimen.rendered_html}
                </div>
                <details class="design-system-specimen-details">
                  <summary>Component details</summary>
                  <div class="design-system-specimen-details-grid">
                    <section>
                      <h4>State coverage</h4>
                      <div class="design-system-specimen-state-groups">
                        <div><h5>Required</h5>${renderSpecimenPillList(specimen.required_states)}</div>
                        <div><h5>Verified</h5>${renderSpecimenPillList(specimen.covered_states)}</div>
                        <div><h5>Pending</h5>${renderSpecimenPillList(specimen.unverified_states)}</div>
                      </div>
                    </section>
                    <section>
                      <h4>Anatomy</h4>
                      ${renderSpecimenEvidenceChips(specimen.covered_anatomy, "data-component-anatomy", "design-system-specimen-pills")}
                      <h4>Token roles</h4>
                      ${renderSpecimenEvidenceChips(specimen.covered_token_bindings, "data-token-role", "design-system-specimen-pills")}
                    </section>
                    <section>
                      <h4>Implementation</h4>
                      ${renderSpecimenFacts([
                        ["Contract", specimen.contract_id],
                        ["Package", `${specimen.package_export}#${specimen.public_export}`],
                        ["Contract hash", shortHash(specimen.contract_hash)],
                        ["Implementation hash", shortHash(specimen.implementation_hash)],
                        ["Output hash", shortHash(specimen.output_hash)],
                      ])}
                    </section>
                    <section class="design-system-specimen-details-wide">
                      <h4>Contract excerpt</h4>
                      <pre><code>${escapeHtml(JSON.stringify(contractExcerpt, null, 2))}</code></pre>
                    </section>
                  </div>
                </details>
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
                  <p class="eyebrow">Fictional screen example · ${escapeHtml(specimen.example.label)}</p>
                  <h3>${escapeHtml(specimen.label)}</h3>
                  <p>${escapeHtml(specimen.example.activity)}</p>
                </div>
              </header>
              <div class="design-system-specimen-body">
                <div class="design-system-specimen-preview-frame">
                  ${specimen.rendered_html}
                </div>
                <details class="design-system-specimen-details">
                  <summary>Pattern details</summary>
                  <div class="design-system-specimen-details-grid">
                    <section>
                      <h4>Regions</h4>
                      ${renderSpecimenPillList(specimen.covered_regions)}
                    </section>
                    <section>
                      <h4>Controls</h4>
                      ${renderSpecimenPillList(specimen.covered_controls)}
                    </section>
                    <section>
                      <h4>Evidence</h4>
                      ${renderSpecimenFacts([
                        ["Surface", specimen.surface_type],
                        ["Contract hash", shortHash(specimen.contract_hash)],
                        ["Output hash", shortHash(specimen.output_hash)],
                      ])}
                    </section>
                    <section class="design-system-specimen-details-wide">
                      <h4>Contract excerpt</h4>
                      <pre><code>${escapeHtml(JSON.stringify(contractExcerpt, null, 2))}</code></pre>
                    </section>
                  </div>
                </details>
              </div>
            </article>`;
              })
              .join("\n            ")}
          </div>`;
}

function renderDesignSystemTable({
  caption,
  columns,
  rows,
  rowAttributes = () => "",
  responsiveLabels = false,
}) {
  return `<div class="design-system-table-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">
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
                      const labelAttribute = responsiveLabels
                        ? ` data-label="${escapeHtml(column.label)}"`
                        : "";
                      return `<td${labelAttribute}>${value}</td>`;
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
            <p class="note">This route is the active design-system source for <code>implementation_contract.design_system_source.mode: "judgmentkit_default"</code>. A complete <code>design_system_adapter</code> can switch the contract to <code>external_design_system</code>; missing authorities do not fall back to JudgmentKit defaults.</p>
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
            {
              label: "Appearance",
              value: adapter.appearance_policy.default_mode,
              detail: "Follows system preference; no visible toggle by default.",
            },
          ])}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Use token roles to describe what a visual choice is doing: separating a surface, marking focus, showing status, identifying risk, or recording completion. The CSS custom properties below are portable defaults for generated interfaces. Repo-approved design systems can replace them only through a complete <code>design_system_adapter</code> selected by the implementation contract; incomplete adapters fail instead of falling back to these defaults.</p>
          </section>
          <section class="design-system-section" aria-labelledby="appearance">
            <h2 id="appearance">Appearance</h2>
            <p class="note" data-appearance-default="${escapeHtml(adapter.appearance_policy.default_mode)}" data-visible-appearance-toggle="${adapter.appearance_policy.visible_toggle_default ? "true" : "false"}">JudgmentKit provides light and dark values. The default is system-detected: generated surfaces should follow the user's operating-system or browser color-scheme preference. Do not add a visible appearance toggle unless the activity specifically needs a persistent preference.</p>
            ${renderDesignSystemRuleList([
              "Use light values as the default token map.",
              "Use dark values inside the system color-scheme media query.",
              "Keep appearance controls out of the UI unless they support the activity.",
            ])}
          </section>
          <section class="design-system-section" aria-labelledby="values">
            <h2 id="values">Values</h2>
            <p class="note">The role-first layer exists because agents need to choose visual intent before choosing a brand palette. The values make that intent renderable and reviewable without pretending this is a full component library.</p>
            <pre><code>${escapeHtml(cssCustomPropertyBlock(adapter.css_custom_properties, adapter.appearance_policy, adapter.appearance_token_sets))}</code></pre>
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

function referenceDispositionLabel(kind) {
  return String(kind).replaceAll("_", " ");
}

function renderComponentCoverage(model) {
  const coverage = model.component_reference_coverage;
  const target = model.component_reference_inventory.totals;
  const { accounting, normalization, runtime } = coverage;
  const dispositions = Object.entries(normalization.by_kind).map(
    ([kind, counts]) =>
      `${referenceDispositionLabel(kind)}: ${counts.families} families`,
  );

  return `<section class="design-system-section design-system-inventory" aria-labelledby="inventory">
            <h2 id="inventory">Inventory</h2>
            <p class="note">Simple Design System sets the breadth benchmark. All ${escapeHtml(target.all.families)} families and ${escapeHtml(target.all.variants)} variants are accounted for; JudgmentKit's current library contains ${escapeHtml(runtime.contracts.implemented)} reusable components and ${escapeHtml(runtime.states.supported)} state examples.</p>
            ${renderDesignSystemMetrics([
              {
                label: "Reference families",
                value: accounting.all.families,
                detail: `${accounting.public.families} public and ${accounting.hidden.families} hidden`,
              },
              {
                label: "Reference variants",
                value: accounting.all.variants,
                detail: `${accounting.public.variants} public and ${accounting.hidden.variants} hidden`,
              },
              {
                label: "JudgmentKit components",
                value: runtime.contracts.implemented,
                detail: "Every component is shown below",
              },
              {
                label: "State examples",
                value: runtime.states.supported,
                detail: "Meaningful states shown where relevant",
              },
            ])}
            <p class="note">Standalone icons are excluded from this count because JudgmentKit maintains its icon library separately.</p>
            <details class="design-system-inventory-details">
              <summary>How the reference maps to JudgmentKit</summary>
              <div class="design-system-coverage-grid">
              <article class="design-system-coverage-block" data-component-coverage="inventory">
                <p class="eyebrow">Inventory parity</p>
                <h3>${escapeHtml(`${accounting.all.families}/${target.all.families} families`)}</h3>
                <p><strong>${escapeHtml(`${accounting.all.variants}/${target.all.variants} variants`)}</strong> accounted for.</p>
                <dl>
                  <div><dt>Public</dt><dd>${escapeHtml(`${accounting.public.families} public families / ${accounting.public.variants} public variants`)}</dd></div>
                  <div><dt>Hidden</dt><dd>${escapeHtml(`${accounting.hidden.families} hidden families / ${accounting.hidden.variants} hidden variants`)}</dd></div>
                </dl>
                <p>Standalone icons are excluded; icon-bearing component families remain in the accounting.</p>
              </article>
              <article class="design-system-coverage-block" data-component-coverage="normalization">
                <p class="eyebrow">Semantic normalization</p>
                <h3>${escapeHtml(`${normalization.families.dispositioned}/${normalization.families.total} families classified`)}</h3>
                <p><strong>${escapeHtml(`${normalization.variants.semantically_normalized}/${normalization.variants.total} reference variants`)}</strong> are axis-bearing and semantically normalized; the remaining ${escapeHtml(normalization.variants.partially_documented + normalization.variants.not_documented)} are singleton masters with no variant axes.</p>
                <dl>
                  <div><dt>Axis-bearing</dt><dd>${escapeHtml(`${normalization.metadata.documented.families} families / ${normalization.metadata.documented.variants} variants`)}</dd></div>
                  <div><dt>Singleton masters</dt><dd>${escapeHtml(`${normalization.metadata.partially_documented.families + normalization.metadata.not_documented.families} families / ${normalization.variants.partially_documented + normalization.variants.not_documented} masters`)}</dd></div>
                  <div><dt>Semantic axes</dt><dd>${escapeHtml(`${normalization.semantic_axes.classified}/${normalization.semantic_axes.eligible} classified`)}</dd></div>
                  <div><dt>Audit metadata</dt><dd>${escapeHtml(`${normalization.metadata.partially_documented.families} partial / ${normalization.metadata.not_documented.families} without axis metadata`)}</dd></div>
                </dl>
                <p>Family disposition and variant-axis semantics are recorded separately.</p>
                <ul class="design-system-rule-list">
                  ${dispositions.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("\n                  ")}
                </ul>
              </article>
              <article class="design-system-coverage-block" data-component-coverage="runtime">
                <p class="eyebrow">Runtime candidate</p>
                <h3>${escapeHtml(`${runtime.contracts.implemented}/${runtime.contracts.total} contract IDs have local implementation candidates`)}</h3>
                <p><strong>${escapeHtml(`${runtime.states.verified}/${runtime.states.total} required states currently verified`)}</strong></p>
                <dl>
                  <div><dt>Scenario representation</dt><dd>${escapeHtml(`${runtime.states.supported}/${runtime.states.total} required-state scenarios represented`)}</dd></div>
                  <div><dt>Pending implementation candidates</dt><dd>${escapeHtml(runtime.contracts.not_implemented)}</dd></div>
                  <div><dt>Unverified required states</dt><dd>${escapeHtml(runtime.states.total - runtime.states.verified)}</dd></div>
                  <div><dt>Current evidence</dt><dd>${escapeHtml(`${runtime.scenarios.verified_records} verified / ${runtime.scenarios.records} scenario records`)}</dd></div>
                  <div><dt>Exact Figma variant evidence</dt><dd>${escapeHtml(`${runtime.reference_mapping.exact_variant_evidence.variants}/${accounting.all.variants} verified`)}</dd></div>
                </dl>
              </article>
            </div>
            </details>
          </section>`;
}

function renderDesignSystemComponentsPage(model) {
  const pageEntry = designSystemPageById(model, "components");
  const contracts = model.component_contracts;
  const specimens = model.component_specimens;
  const contractRows = contracts.map((contract) => ({
    ...contract,
    ...(model.component_registry.find(
      (entry) => entry.contract_id === contract.id,
    ) ?? {}),
  }));

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "components",
      `
          ${renderDesignSystemHero(pageEntry)}
          ${renderComponentCoverage(model)}
          <section class="design-system-section" aria-labelledby="usage">
            <h2 id="usage">Usage</h2>
            <p class="note">Choose the component that matches the user's task, then inspect every state the interface needs to handle. The examples below use the same JudgmentKit components intended for product interfaces, not look-alike specimen controls.</p>
          </section>
          <section class="design-system-section" aria-labelledby="components">
            <h2 id="components">Components</h2>
            <p class="note">Explore each component in the states it needs to handle. Interact with the controls directly; supporting details stay collapsed until requested.</p>
            ${renderComponentSpecimenList(specimens)}
          </section>
          <section class="design-system-section" aria-labelledby="component-guidance">
            <h2 id="component-guidance">Component guidance</h2>
            ${renderDesignSystemTable({
              caption: "When to use each component",
              columns: [
                {
                  key: "id",
                  label: "Component",
                  render: (row) => `<strong>${escapeHtml(row.label)}</strong>`,
                },
                {
                  key: "purpose",
                  label: "Use",
                },
                {
                  key: "required_states",
                  label: "States",
                  render: (row) =>
                    escapeHtml(
                      (row.required_states ?? [])
                        .map((state) => state.replaceAll("-", " "))
                        .join(", "),
                    ),
                },
                {
                  key: "review_checks",
                  label: "Quality",
                  render: (row) => escapeHtml((row.review_checks ?? []).join("; ")),
                },
              ],
              rows: contractRows,
              rowAttributes: (row) =>
                `data-component-contract="${escapeHtml(row.id)}" data-component-runtime-status="${escapeHtml(row.implementation_status)}"`,
            })}
          </section>
          <section class="design-system-section" aria-labelledby="quality-checklist">
            <h2 id="quality-checklist">Quality checklist</h2>
            ${renderDesignSystemRuleList([
              "Choose components by the user's task, not by the shape of the underlying data.",
              "Show loading, disabled, empty, and error states with a readable explanation when they apply.",
              "Keep risky decisions bounded and visibly distinct from routine actions.",
              "Reuse the actual JudgmentKit component instead of recreating its appearance with one-off markup.",
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
    {
      description:
        "Reusable JudgmentKit components and states, with Simple Design System as the breadth reference.",
      headExtra: componentSpecimenAssets(),
      path: "/design-system/components/",
    },
  );
}

function renderDesignSystemPatternsPage(model) {
  const pageEntry = designSystemPageById(model, "patterns");
  const contracts = model.pattern_contracts;
  const specimens = model.pattern_specimens;
  const profiles = model.surface_presentation_profiles;
  const regionCount = new Set(contracts.flatMap((entry) => entry.required_regions ?? [])).size;
  const controlCount = new Set(contracts.flatMap((entry) => entry.expected_controls ?? [])).size;

  return page(
    pageEntry.title,
    renderDesignSystemLayout(
      model,
      "patterns",
      `
          ${renderDesignSystemHero(pageEntry)}
          <section class="design-system-section" aria-labelledby="surface-patterns" data-pattern-index>
            <h2 id="surface-patterns">Surface patterns</h2>
            <p class="note">Choose after the activity and surface type are clear: use what the participant is trying to accomplish and what completion needs to mean. Every public pattern links to one fictional consumer-domain screen below; the examples show required regions and controls through distinct UI compositions.</p>
            ${renderDesignSystemTable({
              caption: "Surface pattern contracts",
              columns: [
                {
                  key: "id",
                  label: "Pattern",
                  render: (row) => `<span><code>${escapeHtml(row.id)}</code><br>${escapeHtml(row.label)}</span>`,
                },
                {
                  key: "purpose",
                  label: "Use when",
                },
                {
                  key: "completion_or_handoff",
                  label: "Done means",
                },
                {
                  key: "example",
                  label: "Example",
                  render: (row) =>
                    `<a href="#${escapeHtml(specimenAnchor(row.id))}">View ${escapeHtml(row.label)} example</a>`,
                },
              ],
              rows: contracts,
              responsiveLabels: true,
              rowAttributes: (row) => `data-pattern-contract="${escapeHtml(row.id)}" data-surface-type="${escapeHtml(row.surface_type)}"`,
            })}
          </section>
          ${renderDesignSystemMetrics([
            {
              label: "Examples",
              value: specimens.length,
              detail: "One for every public pattern.",
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
          <section class="design-system-section" id="specimens" aria-labelledby="pattern-examples">
            <h2 id="pattern-examples">Pattern examples</h2>
            <p class="note">Each fictional composition renders a recognizable surface UI with consumer-domain content, contextual controls, and a visible completion or handoff. The scenarios are illustrative rather than customer evidence; contract and source evidence stays available in the collapsed details.</p>
            ${renderPatternSpecimenList(specimens)}
          </section>
          <section class="design-system-section" aria-labelledby="presentation-profiles">
            <h2 id="presentation-profiles">Presentation profiles</h2>
            <p class="note">Presentation profiles specialize a surface pattern after the activity, interaction contract, and active design-system source are established. Their status identifies whether the profile is supported or still proposed; they do not reclassify the activity or select a runtime renderer.</p>
            ${renderDesignSystemTable({
              caption: "Surface presentation profiles",
              columns: [
                {
                  key: "id",
                  label: "Profile",
                  render: (row) => `<code>${escapeHtml(row.id)}</code><br>${escapeHtml(row.name)}`,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => escapeHtml(row.status ?? "proposed"),
                },
                {
                  key: "surface_type",
                  label: "Surface",
                  render: (row) => `${escapeHtml(row.surface_type)}<br><code>${escapeHtml(row.authority?.pattern_contract_id ?? "")}</code>`,
                },
                {
                  key: "composition",
                  label: "Presentation",
                  render: (row) => escapeHtml(
                    [
                      row.composition?.density,
                      row.composition?.hierarchy,
                      `${row.appearance?.default_mode ?? "system"} appearance`,
                    ]
                      .filter(Boolean)
                      .join("; "),
                  ),
                },
                {
                  key: "responsive",
                  label: "Compact behavior",
                  render: (row) =>
                    escapeHtml(
                      row.responsive?.compact ?? row.responsive?.narrow ?? "",
                    ),
                },
              ],
              rows: profiles,
              rowAttributes: (row) =>
                `data-surface-presentation-profile="${escapeHtml(row.id)}" data-surface-type="${escapeHtml(row.surface_type)}"`,
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
        `,
    ),
    {
      description:
        "JudgmentKit surface patterns composed with the reusable component library.",
      headExtra: componentSpecimenStylesheet(),
      path: "/design-system/patterns/",
    },
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
      "This route is the active design-system source for `implementation_contract.design_system_source.mode: \"judgmentkit_default\"`. A complete `design_system_adapter` can switch the contract to `external_design_system`; missing authorities do not fall back to JudgmentKit defaults.",
      "",
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
      "JudgmentKit uses token roles to name visual intent before choosing brand-specific values. The CSS custom properties are portable defaults for rendering and review. Repo-approved design systems can replace them only through a complete `design_system_adapter` selected by the implementation contract; incomplete adapters fail instead of falling back to these defaults.",
      "",
      "## Token Families",
      markdownList(adapter.token_families.map((family) => `\`${family}\``)),
      "",
      "## Appearance",
      `- Default mode: \`${adapter.appearance_policy.default_mode}\``,
      `- Visible appearance toggle by default: \`${adapter.appearance_policy.visible_toggle_default ? "true" : "false"}\``,
      `- Policy: ${adapter.appearance_policy.visible_toggle_policy}`,
      `- Token sets: ${(adapter.appearance_token_sets ?? []).map((entry) => `\`${entry.mode}\``).join(", ")}`,
      "",
      "## Portable CSS Defaults",
      "```css",
      cssCustomPropertyBlock(adapter.css_custom_properties, adapter.appearance_policy, adapter.appearance_token_sets),
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
    const coverage = model.component_reference_coverage;
    const target = model.component_reference_inventory.totals;
    const dispositionLines = Object.entries(
      coverage.normalization.by_kind,
    ).map(
      ([kind, counts]) =>
        `${referenceDispositionLabel(kind)}: ${counts.families} families`,
    );

    lines.push(
      "## Coverage",
      "Simple Design System is the component-family and variant reference. Its styling is not a parity target.",
      "",
      "### Inventory parity",
      `- ${coverage.accounting.all.families}/${target.all.families} families`,
      `- ${coverage.accounting.all.variants}/${target.all.variants} variants`,
      `- ${coverage.accounting.public.families} public families / ${coverage.accounting.public.variants} public variants`,
      `- ${coverage.accounting.hidden.families} hidden families / ${coverage.accounting.hidden.variants} hidden variants`,
      "- Standalone icons are excluded; icon-bearing component families remain in the accounting.",
      "",
      "### Semantic normalization",
      `- ${coverage.normalization.families.dispositioned}/${coverage.normalization.families.total} families classified with provisional family-level dispositions`,
      `- ${coverage.normalization.variants.semantically_normalized}/${coverage.normalization.variants.total} reference variants are axis-bearing and semantically normalized`,
      `- ${coverage.normalization.metadata.partially_documented.families + coverage.normalization.metadata.not_documented.families} singleton families / ${coverage.normalization.variants.partially_documented + coverage.normalization.variants.not_documented} singleton masters have no variant axes`,
      `- Audit metadata: ${coverage.normalization.metadata.partially_documented.families} partial / ${coverage.normalization.metadata.not_documented.families} without axis metadata`,
      `- Semantic axes: ${coverage.normalization.semantic_axes.classified}/${coverage.normalization.semantic_axes.eligible} classified`,
      ...dispositionLines.map((entry) => `- ${entry}`),
      "",
      "### Runtime candidate and evidence",
      `- ${coverage.runtime.contracts.implemented}/${coverage.runtime.contracts.total} contract IDs have local implementation candidates`,
      `- ${coverage.runtime.states.supported}/${coverage.runtime.states.total} required-state scenarios are represented`,
      `- ${coverage.runtime.states.verified}/${coverage.runtime.states.total} required states currently verified`,
      `- ${coverage.runtime.scenarios.verified_records}/${coverage.runtime.scenarios.records} scenario records verified`,
      `- ${coverage.runtime.reference_mapping.exact_variant_evidence.variants}/${coverage.accounting.all.variants} exact Figma variants have runtime evidence`,
      "",
      "## Specimens",
      markdownList(
        model.component_specimens.map(
          (entry) =>
            `\`${entry.id}\`: \`${entry.package_export}#${entry.public_export}\`; required: ${entry.required_states.join(", ")}; verified: ${entry.covered_states.join(", ") || "none"}; pending: ${entry.unverified_states.join(", ") || "none"}; output: \`${entry.output_hash}\``,
        ),
      ),
      "",
      "## Component Contracts",
      markdownList(
        model.component_contracts.map(
          (entry) => {
            const registryEntry = model.component_registry.find(
              (candidate) => candidate.contract_id === entry.id,
            );
            return `\`${entry.id}\` (${registryEntry?.implementation_status ?? "not_implemented"}, ${registryEntry?.classification ?? "contract_only"}): ${entry.purpose}; states: ${(entry.required_states ?? []).join(", ")}; review: ${(entry.review_checks ?? []).join("; ")}`;
          },
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
      "## Surface Pattern Contracts",
      markdownList(
        model.pattern_contracts.map(
          (entry) =>
            `\`${entry.id}\` (${entry.surface_type}): ${entry.purpose}; regions: ${(entry.required_regions ?? []).join(", ")}; controls: ${(entry.expected_controls ?? []).join(", ")}`,
        ),
      ),
      "",
      "## Pattern Examples",
      markdownList(
        model.pattern_specimens.map(
          (entry) =>
            `\`${entry.id}\`: ${entry.example.label} for ${entry.example.participant}; activity: ${entry.example.activity}; regions: ${entry.covered_regions.join(", ")}; controls: ${entry.covered_controls.join(", ")}; completion: ${entry.example.completion}; output: \`${entry.output_hash}\``,
        ),
      ),
      "",
      "## Presentation Profiles",
      markdownList(
        model.surface_presentation_profiles.map(
          (entry) =>
            `\`${entry.id}\` (${entry.surface_type}, ${entry.status}): ${entry.purpose}; pattern: \`${entry.authority?.pattern_contract_id}\`; appearance: ${entry.appearance?.default_mode ?? "system"}; presentation: ${entry.composition?.density ?? "unspecified"}, ${entry.composition?.hierarchy ?? "unspecified"}; compact or narrow: ${entry.responsive?.compact ?? entry.responsive?.narrow ?? "unspecified"}`,
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
    "Canonical active design-system source for JudgmentKit implementation contracts.",
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
    "- /design-system/visual-composition-policy.json",
    "- /design-system/component-inventory.json",
    "- /design-system/component-registry.json",
    "- /design-system/component-contracts.json",
    "- /design-system/pattern-contracts.json",
    "- /design-system/surface-presentation-profiles.json",
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
      <div class="site-shell value-shell">
        <div class="site-page-header site-page-header-wide value-hero">
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
          <p>The public value path above is the product story. The current hosted MCP release is ${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)}; linked reports are historical committed eval artifacts for deterministic proof, model matrix, and repair-loop data, not current release acceptance proof. The public archive includes only the evidence intended for external audit.</p>
          <div class="link-row">
            ${renderValueEvidenceLinks(evidenceLinks)}
          </div>
        </section>
      </div>
    </section>
  `,
    {
      description:
        "Concrete before and after examples of what JudgmentKit prevents in AI-generated product UI.",
      path: "/value/",
    },
  );
}

function renderSurfaceTypeEntries() {
  return Object.entries(ACTIVITY_CONTRACT.surface_types ?? {})
    .map(
      ([surfaceTypeId, surfaceType]) => `
        <div class="surface-type-entry" data-surface-type="${escapeHtml(surfaceTypeId)}">
          <dt>${escapeHtml(surfaceType.label)}</dt>
          <dd>${escapeHtml(surfaceType.purpose)}</dd>
        </div>`,
    )
    .join("");
}

const DOCS_SECTION_ITEMS = [
  { href: "#quickstart", label: "Quickstart", current: true, currentValue: "location" },
  { href: "#first-use", label: "First 10 Minutes" },
  { href: "#planning-examples", label: "Planning Examples" },
  { href: "#mcp", label: "MCP" },
  { href: "#system-map", label: "System Map" },
  { href: "#activity-review", label: "Activity Review" },
  { href: "#workflow-review", label: "Workflow Review" },
  { href: "#cognitive-dimensions", label: "Cognitive Dimensions" },
  { href: "#surface-type", label: "Surface Type" },
  { href: "#artifact-inspector", label: "Artifact Inspector" },
  { href: "#handoff", label: "Handoff" },
  { href: "#implementation-contract", label: "Implementation Contract" },
  { href: "#frontend-context", label: "Frontend Context" },
  { href: "#profiles", label: "Profiles" },
];

function docsPage() {
  return page(
    "JudgmentKit Docs",
    `
    <section class="section docs-page">
      <div class="site-shell doc-layout" data-section-rail-current="sections">
        ${renderSectionRailMenu({
          label: "Docs sections",
          items: DOCS_SECTION_ITEMS,
          activeLabel: "Quickstart",
          menuId: "docs-section-menu",
          className: "docs-section-menu",
        })}
        ${renderSectionRailNav({
          label: "Docs sections",
          items: DOCS_SECTION_ITEMS,
          className: "doc-nav",
        })}
        <div class="doc-content">
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
            <p><strong>Runtime boundary:</strong> <code>implementation_contract.design_system_source</code> exposes the optional 17-contract React adapter candidate and its canonical registry. The root library, CLI, MCP, and <code>visual_token_adapter</code> remain framework-neutral. A complete <code>design_system_adapter</code> selects <code>external_design_system</code>; missing authorities fail instead of falling back to JudgmentKit defaults.</p>
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
            <p><strong>Good response:</strong> infer and show the best provisional activity premise the prompt can support without inventing dashboard content. Ask at most one consequential question only when its answer would materially change the interaction and be costly to reverse.</p>
            <p><strong>Accept:</strong> the agent states its provisional premise and first direction, then asks the single highest-value question only if the unsupported activity, decision, or completion fork would change that direction.</p>
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
            <p>MCP tool responses include <code>structuredContent</code> as the stable machine-readable contract. Agents should translate it into ordinary domain language: a working premise, consequential decisions, the first direction, and at most one material question. Raw <code>content[0].text</code> is for explicit setup, audit, debugging, or integration work, not ordinary designer-facing conversation.</p>
          </section>
          <section class="doc-section" id="system-map" data-system-map-flow-section>
            <h2>System Map</h2>
            <p>Use JudgmentKit before generation and across iterations. It is the contract and review layer around the LLM or agent, not the final UI renderer.</p>
            ${systemMapShell("system-map-svg-title", "system-map-svg-desc")}
            <div class="system-map-summary" aria-label="System map text summary">
              <p><strong>MCP boundary:</strong> agents call JudgmentKit tools through MCP; MCP is access and transport, not the LLM.</p>
              <p><strong>JudgmentKit kernel:</strong> deterministic review, candidate review, disclosure rules, targeted questions, and the handoff gate decide whether UI generation is ready.</p>
              <p><strong>LLM / provider seam:</strong> a model may propose activity or workflow candidates, but JudgmentKit reviews those candidates before trusting them.</p>
              <p><strong>Surface type:</strong> <code>recommend_surface_types</code> classifies activity purpose as marketing, workbench, operator review, artifact inspection, form flow, dashboard monitoring, content/report, setup/debug work, or conversation before frontend implementation guidance.</p>
              <p><strong>UI generation:</strong> the LLM or agent generates the interface outside JudgmentKit from the reviewed handoff.</p>
              <p><strong>Implementation contract:</strong> <code>create_ui_implementation_contract</code> supplies <code>implementation_contract.design_system_source</code>, <code>implementation_contract.local_component_authority</code>, <code>implementation_contract.visual_token_adapter</code>, <code>implementation_contract.default_ai_native_design_system</code>, approved primitives, required states, static checks, browser QA expectations, <code>implementation_contract.visual_asset_policy</code>, and <code>implementation_contract.accessibility_policy</code> before final handoff. <code>review_ui_implementation_candidate</code> checks generated UI against that contract and marks failed design-system candidates as repair-only diagnostics, not accepted artifacts.</p>
              <p><strong>Frontend adapter:</strong> <code>create_frontend_generation_context</code> combines a ready handoff, selected surface type, project frontend context, and verification expectations. <code>create_frontend_implementation_skill_context</code> turns that ready context into portable implementation instructions, semantic token roles, system font stacks, Lucide icon catalog policy, design-system provenance expectations, and local component authority without exposing raw skill files. Design-system compliance is not a substitute for activity fit.</p>
              <p><strong>Slide decks:</strong> <code>create_slide_deck</code> plans or exports JudgmentKit presentation-theme decks from user-facing slide content. Hosted callers can use dry-run planning; PPTX export requires a local artifact runtime.</p>
              <p><strong>Iteration:</strong> draft review produces updated context that re-enters source/activity review rather than becoming only a longer prompt.</p>
            </div>
            <p class="system-branch"><strong>Blocked path:</strong> if activity, workflow, or handoff is not ready, resolve targeted questions or leakage details before generating UI.</p>
          </section>
          <section class="doc-section" id="activity-review">
            <h2>Activity Review</h2>
            <p>Call <code>create_activity_model_review</code> before generating UI from a brief. Treat its deterministic candidate as a baseline, let the host model infer the complete best-current activity case, then call <code>review_activity_model_candidate</code> before trusting that inferred case.</p>
          </section>
          <section class="doc-section" id="workflow-review">
            <h2>Workflow Review</h2>
            <p>Call <code>review_ui_workflow_candidate</code> before accepting an agent-proposed workflow. It checks source grounding, action support, completion or handoff clarity, and leakage containment.</p>
          </section>
          <section class="doc-section" id="cognitive-dimensions">
            <h2>Cognitive Dimensions Review</h2>
            <p>Call <code>review_cognitive_dimensions_candidate</code> when a workflow or implementation candidate needs review for domain mapping, evidence near action, hidden dependencies, premature commitment, progressive evaluation, change cost, memory-heavy transitions, or disclosure leakage. Findings are diagnostic guidance for agents and reviewers; do not copy Cognitive Dimensions terminology into product UI.</p>
          </section>
          <section class="doc-section" id="surface-type">
            <h2>Surface Type</h2>
            <p>Call <code>recommend_surface_types</code> after activity review and before workflow or frontend implementation guidance. Surface type is activity-purpose guidance, not a visual theme.</p>
            <dl class="surface-type-list" aria-label="Canonical surface types">
              ${renderSurfaceTypeEntries()}
            </dl>
          </section>
          <section class="doc-section" id="artifact-inspector">
            <p class="eyebrow">Status: ${escapeHtml(ACTIVITY_CONTRACT.interaction_models.artifact_inspector.status)}</p>
            <h2>Artifact Inspector</h2>
            <p>Artifact Inspector is a proposed interaction model for work centered on one rendered artifact. Use it only when the artifact must remain visible and primary, the person must select a semantic locus within it, and supporting evidence, actions, or results are meaningful in relation to that locus.</p>
            <p>Keep the existing surface type when a queue, case, collection, report, dashboard, form, setup flow, or conversation is primary. A live artifact keeps its native behavior until the person explicitly enters inspection mode.</p>
            <h3>Identifiers and current status</h3>
            <pre><code>surface_type: artifact_inspector
workflow_profile: artifact-inspector-ui
frontend_surface_profile: judgmentkit.artifact-inspector.v1
topology_kind: artifact_centered
status: proposed
implementation_review_status: review_required
primary_artifact_review_status: external_not_reviewed</code></pre>
            <h3>Authority boundary</h3>
            <p>JudgmentKit governs the inspector chrome and inspection overlay, not the artifact itself. The declared external authority owns the artifact’s typography, components, color, elevation, internal layout, semantics, and native interactions. Reviews report chrome, overlay, artifact preservation, and boundary behavior separately.</p>
            <h3>Current review boundary</h3>
            <p>JudgmentKit ${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)} can identify and validate the artifact-centered contract and carry it into generation guidance. It does not yet have a trusted interactive-attestation producer or verifier, so an otherwise valid implementation remains <code>review_required</code>.</p>
            <p>Screenshots, static metadata, caller-authored evidence, or unchanged fingerprints cannot close that gate. Future acceptance must verify real pointer, touch, keyboard, and assistive-technology crossings; focus order and return; overlay obstruction and target drift; style isolation in both directions; artifact preservation; and required states across desktop and narrow viewports.</p>
            <div class="link-row">
              <a class="pill-link" href="${escapeHtml(GITHUB_RELEASE_URL)}">Read the ${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)} release notes</a>
            </div>
          </section>
          <section class="doc-section" id="handoff">
            <h2>Handoff</h2>
            <p>Call <code>create_ui_generation_handoff</code> only on a ready workflow review, resupplying the exact current <code>brief</code> and attributed <code>context_items</code> so protected risk and workflow authority are revalidated from raw source. If the gate blocks, resolve the material ambiguity or authoritative-source boundary first.</p>
          </section>
          <section class="doc-section" id="implementation-contract">
            <h2>Implementation Contract</h2>
            <p>Call <code>create_ui_implementation_contract</code> before final handoff so generated UI has approved primitives, state coverage, <code>implementation_contract.design_system_source</code>, <code>implementation_contract.local_component_authority</code>, <code>implementation_contract.visual_token_adapter</code>, <code>implementation_contract.default_ai_native_design_system</code>, static checks, browser QA expectations, <code>implementation_contract.visual_asset_policy</code>, and <code>implementation_contract.accessibility_policy</code>. Call <code>review_ui_implementation_candidate</code> before accepting generated UI code or evidence. Visual-heavy pages need browser-rendered contrast/readability evidence for text over images, canvas, WebGL, video, gradients, or generated visuals.</p>
          </section>
          <section class="doc-section" id="frontend-context">
            <h2>Frontend Context</h2>
            <p>Call <code>create_frontend_generation_context</code> after the handoff gate when an agent needs frontend implementation guidance with selected surface type, project context, and verification expectations. Resupply the exact current <code>brief</code> and attributed <code>context_items</code>. Call <code>create_frontend_implementation_skill_context</code> with that same raw source and the ready frontend context when an MCP client needs compiled implementation guidance instead of repo-local skill access.</p>
          </section>
          <section class="doc-section" id="slide-decks">
            <h2>Slide Decks</h2>
            <p>Call <code>create_slide_deck</code> when an allowed brief, workflow review, handoff, or implementation evidence should become a JudgmentKit presentation, PowerPoint, or PPTX. The tool returns selected templates and content keys in dry-run mode, and writes PPTX artifacts only from a local <code>@oai/artifact-tool</code> runtime under the guarded output directory.</p>
          </section>
          <section class="doc-section" id="profiles">
            <h2>Guidance Profiles</h2>
            <p>Call <code>recommend_ui_workflow_profiles</code> when a brief sounds like specialized review work. Pass <code>profile_id: "operator-review-ui"</code> only when the recommendation evidence supports it. Artifact-centered work may use the proposed <code>artifact-inspector-ui</code> workflow profile with <code>judgmentkit.artifact-inspector.v1</code>; that profile guides generation but does not change its <code>review_required</code> status.</p>
          </section>
        </div>
      </div>
    </section>
  `,
    {
      description:
        "JudgmentKit docs for CLI, MCP, activity review, workflow review, Artifact Inspector, handoff, and guidance profiles.",
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

async function readRequiredJson(relativePath, label) {
  const value = await readJsonIfExists(relativePath);
  if (!value) {
    throw new Error(`${label} must be present and valid JSON at ${relativePath}`);
  }
  return value;
}

const MODEL_UI_EXAMPLE = {
  id: "model-ui-system-map",
  title: "Model UI generation matrix",
  description:
    "Four use-case matrix comparisons across fixture-rendered baseline, Gemma 4 (local LLM), GPT-5.5 xhigh, GPT-5.6 Sol Light, and GPT-5.6 Sol Ultra paths, separating raw brief, JudgmentKit skill context, Material UI only, and JudgmentKit skill plus Material UI. Each use case shows accepted snapshots plus diagnostic-only failed-candidate cells.",
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

  return "fixture-rendered baseline, no model generation";
}

function galleryRenderLabel(artifact) {
  if (artifact.design_system_mode === "material_ui") return "Material UI SSR";
  if (artifact.generation_source === "captured_model_output") return "static HTML/CSS";
  return "scripted fixture HTML";
}

function diagnosticActionLabel(action) {
  const labels = {
    accept: "Accepted",
    repair_and_resubmit: "Needs repair before evidence",
  };
  if (!action) return "Needs review";
  return labels[action] ?? action.replace(/[_-]+/g, " ");
}

function diagnosticCheckLabel(check) {
  const labels = {
    static_capture_quality: "Capture quality failed",
    visual_tokens: "Token provenance failed",
  };
  if (!check) return "Review gate";
  return labels[check] ?? check.replace(/[_-]+/g, " ");
}

function diagnosticChecksLabel(checks) {
  const labels = (checks ?? []).map(diagnosticCheckLabel);
  return labels.length ? labels.join(", ") : "Implementation review gate";
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

function buildModelUiDiagnosticItems(manifest) {
  const useCaseLabel = manifest?.use_case_label ?? "Support refund triage";
  return (manifest?.diagnostic_candidates ?? []).map((candidate) => ({
    id: candidate.id,
    isDiagnostic: true,
    useCaseId: manifest?.use_case_id ?? "refund-system-map",
    useCaseLabel,
    title: candidate.approach_title ?? candidate.title,
    caption: candidate.approach_caption ?? "",
    modelLabel: candidate.row_label ?? candidate.model_label ?? candidate.title,
    rowLabel: `${useCaseLabel} / ${candidate.row_label ?? candidate.model_label ?? candidate.title}`,
    columnLabel: candidate.column_label ?? "",
    renderLabel: "Diagnostic only",
    renderSource: candidate.render_source ?? candidate.visible_render_source ?? "",
    promptContext: candidate.context_summary ?? "",
    provenance: galleryProvenanceLabel(candidate),
    nextAgentAction: candidate.next_agent_action ?? "repair_and_resubmit",
    failedChecks: candidate.failed_checks ?? [],
    status: candidate.release_evidence_status ?? "diagnostic_only",
    captureHref: candidate.capture_file ? modelUiExampleHref(manifest, candidate.capture_file) : "",
  }));
}

function buildModelUiComparisonRows(manifest, galleryItems, diagnosticItems = []) {
  const itemsById = new Map(galleryItems.map((item) => [item.id, item]));
  const diagnosticsById = new Map(diagnosticItems.map((item) => [item.id, item]));

  return (manifest?.comparison_rows ?? []).map((row) => ({
    id: row.id,
    title: row.label,
    summary: row.summary,
    items: (row.cells ?? [])
      .map((cell) => {
        if (cell.release_evidence_status === "diagnostic_only") {
          return diagnosticsById.get(cell.diagnostic_candidate_id);
        }
        return itemsById.get(cell.artifact_id);
      })
      .filter(Boolean),
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
      const diagnosticItems = buildModelUiDiagnosticItems(manifest);
      return {
        ...useCase,
        manifestHref: `/${useCase.manifest_path}`,
        indexHref: `/${useCase.index_path}`,
        activitySummary: manifest.activity_summary ?? useCase.activity_summary,
        acceptedCount: manifest.artifacts?.length ?? 0,
        diagnosticCount: manifest.diagnostic_candidates?.length ?? 0,
        galleryItems,
        diagnosticItems,
        comparisonRows: buildModelUiComparisonRows(manifest, galleryItems, diagnosticItems),
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
  if (item.isDiagnostic) {
    const failedChecks = diagnosticChecksLabel(item.failedChecks);
    const nextAction = diagnosticActionLabel(item.nextAgentAction);
    return `
        <article class="example-matrix-cell example-matrix-cell-diagnostic" role="cell">
          <div class="example-matrix-diagnostic" aria-label="Diagnostic only candidate for ${escapeHtml(item.title)}">
            <strong>Diagnostic only</strong>
            <span>Failed candidate, not release evidence.</span>
          </div>
          <div class="example-matrix-cell-copy">
            <p class="eyebrow">${escapeHtml(item.renderLabel)}</p>
            <h4>${escapeHtml(item.title)}</h4>
            <p class="note">${escapeHtml(item.columnLabel)}</p>
            <p class="note">Status: ${escapeHtml(nextAction)}</p>
            <p class="note">Failed checks: ${escapeHtml(failedChecks)}</p>
          </div>
        </article>`;
  }

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
  const matrixDimensions = `${matrixRows.length} by ${columns.length}`;
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
        <div class="example-matrix-table" role="table" aria-label="Model UI ${escapeHtml(matrixDimensions)} comparison matrix">
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
      const rowCount = useCase.comparisonRows?.length ?? 0;
      const columnCount = useCase.comparisonRows?.[0]?.items?.length ?? 0;
      return `
        <section class="model-ui-use-case-panel" data-use-case-panel="${escapeHtml(useCase.id)}" ${index === 0 ? "" : "hidden"}>
          <div class="example-gallery-intro">
            <h3>${escapeHtml(useCase.label)} ${escapeHtml(`${rowCount}x${columnCount}`)} matrix</h3>
            <p>${escapeHtml(useCase.activitySummary)} Columns separate Raw brief, JudgmentKit skill context, Material UI only, and JudgmentKit skill + Material UI. This use case currently shows ${escapeHtml(useCase.acceptedCount ?? 0)} accepted snapshots plus ${escapeHtml(useCase.diagnosticCount ?? 0)} diagnostic-only failed-candidate cells; diagnostic cells are not artifact links or release evidence.</p>
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
      useCase.diagnosticItems,
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

function publicModelUiExamplePayload(example) {
  return {
    id: example.id,
    galleryItems: example.galleryItems,
    useCases: (example.useCases ?? []).map((useCase) => ({
      id: useCase.id,
    })),
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
        const focusableSelector = [
          'a[href]',
          'button:not([disabled]):not(.example-gallery-modal-backdrop)',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(", ");

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

        function modalFocusable() {
          if (!modal || modal.hidden) return [];
          return Array.from(modal.querySelectorAll(focusableSelector)).filter(
            (element) => element.getClientRects().length > 0,
          );
        }

        function containModalFocus(event) {
          if (!modal || modal.hidden || event.key !== "Tab") return;
          const focusable = modalFocusable();
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const activeElement = document.activeElement;

          if (!modal.contains(activeElement)) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }

        function openGallery(items, index) {
          if (!modal || !items?.length) return;
          activeGalleryItems = items;
          previousFocus = document.activeElement;
          renderGalleryModal(index);
          modal.hidden = false;
          modal.setAttribute("aria-hidden", "false");
          document.documentElement.classList.add("example-gallery-open");
          (modalCloseButton ?? modalFocusable()[0])?.focus();
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
          modal.addEventListener("keydown", containModalFocus);
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
      <div class="site-shell examples-shell">
      <div class="site-page-header examples-hero">
        <h1>Examples</h1>
        <p class="lede">Start with the replayable AI-native contract examples, then use the model UI matrix for broader before/after comparison.</p>
      </div>
      <section class="example-preview example-preview-focus" aria-labelledby="ai-native-examples-title">
        <div class="example-preview-body">
          <div class="example-gallery-intro">
            <p class="eyebrow">AI-native design system</p>
            <h2 id="ai-native-examples-title">First-use loop and canonical contract cases</h2>
            <p>The first-use fixture shows the agent-owned loop: create contract, review, repair, resubmit, accept. The canonical examples cover setup/onboarding, an operational dashboard, and high-stakes refund review; they remain contract examples rather than runtime component demos.</p>
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
              <p>The active design-system source supplies token roles, system font stacks, Lucide icon catalog policy, component contracts, and provenance expectations. Those authorities cannot bypass primitives, states, action boundaries, data visibility, accessibility, static checks, or browser QA.</p>
            </article>
            <article>
              <h3>Lucide icon smoke proof</h3>
              <p>Search, retrieve, and render every committed Lucide icon through the MCP catalog tools. The design-system icon page is the reference surface; this HTML remains the deterministic regression proof.</p>
              <div class="link-row">
                <a class="pill-link" href="/design-system/icons/">Open icon system</a>
                <a class="pill-link" href="/examples/lucide-icon-catalog-smoke.html">Open icon smoke HTML</a>
              </div>
            </article>
            <article>
              <h3>ED flow board MVP</h3>
              <p>A static in-situ feedback prototype for room occupancy, waiting acuity, turnover, holds, and charge-team next moves.</p>
              <div class="link-row">
                <a class="pill-link" href="/examples/er-flow-dashboard/">Open ED flow board</a>
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
      </div>
      ${renderExampleGalleryModal()}
      <script type="application/json" id="model-ui-examples-data">${serializeJsonForHtml(publicModelUiExamplePayload(modelUiExample))}</script>
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

function modelMatrixDiagnosticByColumn(manifest, row, columnId) {
  const diagnosticCandidateId = (row?.cells ?? []).find(
    (cell) => cell.column_id === columnId && cell.release_evidence_status === "diagnostic_only",
  )?.diagnostic_candidate_id;

  if (!diagnosticCandidateId) return null;

  return (manifest?.diagnostic_candidates ?? []).find(
    (candidate) => candidate.id === diagnosticCandidateId,
  ) ?? null;
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
            const diagnostic = modelMatrixDiagnosticByColumn(manifest, row, column.id);
            if (diagnostic) {
              return `
        <div class="report-context-cell report-context-cell-diagnostic" role="cell">
          <strong>Diagnostic only</strong>
          <span>${escapeHtml(diagnostic.approach_title ?? diagnostic.title)}</span>
          <span>Status: ${escapeHtml(diagnosticActionLabel(diagnostic.next_agent_action ?? "repair_and_resubmit"))}</span>
          <span>Failed checks: ${escapeHtml(diagnosticChecksLabel(diagnostic.failed_checks))}</span>
        </div>`;
            }
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
      "Activity-First UI Generation Evidence",
      `
      <section class="section report-page">
        <div class="site-shell report-layout">
        <div class="report-article">
          <p class="eyebrow">UI paired-artifact evidence</p>
          <h1>Activity-First UI Generation Evidence</h1>
          <p class="lede">No committed paired eval report is available in this checkout. The report route is ready, but benchmark figures require the latest UI-generation eval catalog.</p>
          <p class="note">${escapeHtml(benchmarkPolicy)}</p>
        </div>
        </div>
      </section>`,
      {
        description:
          "JudgmentKit public UI paired-artifact evaluation report for activity-first UI generation.",
        path: "/evals/judgmentkit-mcp/",
      },
    );
  }

  return page(
    "Activity-First UI Generation Evidence",
    `
    <section class="section report-page">
      <div class="site-shell report-layout">
      <div class="report-heading">
        <p class="eyebrow">UI paired-artifact evidence</p>
        <h1>Activity-First UI Generation Evidence</h1>
        <p class="lede">A cautious public report on a small UI paired-artifact rerun. It compares committed baseline and JudgmentKit-guided UI artifacts; it is not an MCP pilot status page or a statistically powered benchmark.</p>
      </div>
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
            <p>The committed UI paired-artifact eval compares raw baseline artifacts with JudgmentKit-guided artifacts for the same UI tasks. Scores use a 0-100 weighted total with 0-5 metric scores underneath. Current hosted MCP release: <strong>${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)}</strong>. Latest UI eval MCP release: <strong>${escapeHtml(latest?.mcp_release ?? "pending")}</strong>. These figures do not claim MCP pilot pass/fail status.</p>
            <p>${escapeHtml(benchmarkPolicy)}</p>
            <p>Desktop and mobile screenshots are captured as visual evidence for review. The screenshots support inspection, but the scoring source is the committed artifact text and deterministic rubric.</p>
            <dl class="report-summary" aria-label="Latest public UI paired-artifact eval summary">
              ${renderMetricCard("Latest committed eval run", latest ? evalRunTitle(latest) : "pending")}
              ${renderMetricCard("Current hosted MCP release", JUDGMENTKIT_PACKAGE_VERSION)}
              ${renderMetricCard("Latest UI eval MCP release", latest?.mcp_release ?? "pending")}
              ${renderMetricCard("UI paired cases", cases)}
              ${renderMetricCard("UI paired pass rate", passRate)}
              ${renderMetricCard("UI guided wins", summary.guided_wins ?? 0)}
              ${renderMetricCard("UI baseline wins", summary.baseline_wins ?? 0)}
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
            ${renderContextBoundaryMatrix(defaultManifest)}
            <h3>Committed use cases</h3>
            ${renderUseCaseSummary(modelUseCases)}
          </section>
          <section id="limitations-and-future-work">
            <h2>Limitations and future work</h2>
            <p>This report is intentionally narrow. It uses committed paired artifacts and committed model matrix captures. It does not claim broad model behavior, does not call live providers during site build, does not claim MCP pilot pass/fail status, and does not treat visual polish as proof of activity fit.</p>
            <p>Future versions can add broader MCP impact runs, more surface types, reviewer agreement, and richer interaction probes.</p>
          </section>
          <section id="run-data">
            <h2>Run data</h2>
            <p>Implementation details are listed here for audit and reproduction rather than used as primary product language above.</p>
            <div class="report-run-links">
              <a class="pill-link" href="/evals/${escapeHtml(latest.html_report)}">Latest committed HTML report</a>
              <a class="pill-link" href="/evals/${escapeHtml(latest.json_report)}">Latest committed JSON report</a>
              <a class="pill-link" href="/evals/index.json">Eval catalog JSON</a>
              <a class="pill-link" href="/examples/model-ui/index.json">Model matrix index JSON</a>
            </div>
          </section>
        </article>
      </div>
      </div>
    </section>
  `,
    {
      description:
        "JudgmentKit public UI paired-artifact evaluation report for activity-first UI generation.",
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
      <div class="site-shell report-layout">
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
              <a class="pill-link" href="/evals/judgmentkit-mcp/">UI eval report</a>
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
        <div class="site-shell evals-shell">
        <div class="evals-header">
          <h1>Evals</h1>
          <p class="lede">No eval report catalog has been generated yet.</p>
        </div>
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
      <div class="site-shell evals-shell">
      <div class="evals-header">
        <p class="eyebrow">Evaluation evidence</p>
        <h1>Evals</h1>
        <p class="lede">Immutable UI generation eval runs compare raw generated interfaces with JudgmentKit-guided handoff outputs. Use these reports as historical committed evidence, not as broad benchmark claims or as the current hosted MCP version.</p>
      </div>
      <dl class="evals-summary" aria-label="Latest eval run summary">
        <div class="evals-summary-primary"><dt>Latest committed eval run</dt><dd>${escapeHtml(evalRunTitle(latest))}</dd></div>
        <div><dt>Current hosted MCP release</dt><dd>${escapeHtml(JUDGMENTKIT_PACKAGE_VERSION)}</dd></div>
        <div><dt>Historical MCP release</dt><dd>${escapeHtml(latest.mcp_release)}</dd></div>
        <div><dt>Claim level</dt><dd>${escapeHtml(latest.claim_level)}</dd></div>
        <div><dt>Result</dt><dd>${escapeHtml(latest.summary.passed)}/${escapeHtml(latest.summary.cases)} passed</dd></div>
        <div><dt>Guided wins</dt><dd>${escapeHtml(latest.summary.guided_wins)}</dd></div>
      </dl>
      <p class="note">${escapeHtml(benchmarkPolicy)}</p>
      <div class="evals-actions" aria-label="Eval report links">
        <a class="pill-link" href="/evals/judgmentkit-mcp/">UI eval report</a>
        <a class="pill-link" href="/evals/site-rebuild-log/">Site rebuild log</a>
        <a class="pill-link" href="${escapeHtml(evalReportPath(latest.html_report))}">Latest committed HTML report</a>
        <a class="pill-link" href="${escapeHtml(evalReportPath(latest.json_report))}">Latest committed JSON report</a>
        <a class="pill-link" href="/evals/index.json">Catalog JSON</a>
      </div>
      <section>
        <h2>All runs</h2>
        <div class="evals-table-shell">
          <table class="evals-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Historical MCP release</th>
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
      </div>
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

function isSafeRelativePath(relativePath) {
  return (
    typeof relativePath === "string" &&
    relativePath.length > 0 &&
    !path.isAbsolute(relativePath) &&
    !relativePath.includes(":") &&
    !relativePath.includes("?") &&
    !relativePath.includes("#") &&
    !relativePath.includes("\\") &&
    !relativePath.split(/[\\/]/).includes("..")
  );
}

function assertSafeRelativePath(relativePath, label) {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error(`${label} must be a safe relative path, got ${JSON.stringify(relativePath)}`);
  }
  return relativePath;
}

export function modelUiPublicPath(useCase, field) {
  const id = useCase?.id ?? "model UI use case";
  const relativePath = assertSafeRelativePath(useCase?.[field], `${id} ${field}`);
  if (!relativePath.startsWith("examples/model-ui/")) {
    throw new Error(`${id} ${field} must stay under examples/model-ui/, got ${relativePath}`);
  }
  return relativePath;
}

async function readModelUiIndexForPublicBuild() {
  const index = await readRequiredJson("examples/model-ui/index.json", "model UI index");
  if (!Array.isArray(index.use_cases)) {
    throw new Error("model UI index must include use_cases.");
  }
  for (const useCase of index.use_cases) {
    modelUiPublicPath(useCase, "index_path");
    modelUiPublicPath(useCase, "manifest_path");
  }
  return index;
}

async function readModelUiManifestForPublicBuild(useCase) {
  const manifestPath = modelUiPublicPath(useCase, "manifest_path");
  return readRequiredJson(manifestPath, `${useCase.id} model UI manifest`);
}

async function copyPublicEvalReports(outDir) {
  const catalog = await readJsonIfExists("evals/reports/index.json");
  await copyIfExists("evals/reports/index.json", path.join(outDir, "evals", "index.json"));

  const publicFiles = new Set();

  for (const run of catalog?.runs ?? []) {
    for (const reportPath of [run.html_report, run.json_report]) {
      if (isSafeRelativePath(reportPath)) {
        publicFiles.add(reportPath);
      }
    }

    if (isSafeRelativePath(run.run_path)) {
      publicFiles.add(path.join(run.run_path, "release-review.html"));
    }

    if (!isSafeRelativePath(run.json_report)) continue;
    const report = await readJsonIfExists(path.join("evals/reports", run.json_report));
    for (const result of report?.results ?? []) {
      for (const variant of result.variants ?? []) {
        for (const screenshot of variant.screenshots ?? []) {
          if (isSafeRelativePath(screenshot.path)) {
            publicFiles.add(screenshot.path);
          }
        }
      }
    }
  }

  for (const publicFile of publicFiles) {
    await copyIfExists(
      path.join("evals/reports", publicFile),
      path.join(outDir, "evals", publicFile),
    );
  }
}

function publicModelUiDiagnosticCandidate(candidate) {
  return {
    id: candidate.id,
    use_case_id: candidate.use_case_id,
    use_case_label: candidate.use_case_label,
    row_id: candidate.row_id,
    row_label: candidate.row_label,
    column_id: candidate.column_id,
    column_label: candidate.column_label,
    title: candidate.title,
    model: candidate.model,
    model_label: candidate.model_label,
    approach_title: candidate.approach_title,
    approach_caption: candidate.approach_caption,
    context_summary: candidate.context_summary,
    release_evidence_status: candidate.release_evidence_status,
    artifact_path: null,
    screenshot_path: null,
  };
}

function publicModelUiManifest(manifest) {
  return {
    ...manifest,
    diagnostic_candidates: (manifest?.diagnostic_candidates ?? []).map(
      publicModelUiDiagnosticCandidate,
    ),
  };
}

async function writePublicModelUiManifests(outDir) {
  const index = await readModelUiIndexForPublicBuild();
  for (const useCase of index.use_cases) {
    const manifestPath = modelUiPublicPath(useCase, "manifest_path");
    const manifest = await readModelUiManifestForPublicBuild(useCase);
    await fs.writeFile(
      path.join(outDir, ...manifestPath.split("/")),
      jsonExport(publicModelUiManifest(manifest)),
    );
  }
}

async function removePublicModelUiDiagnosticFiles(outDir) {
  const index = await readModelUiIndexForPublicBuild();
  for (const useCase of index.use_cases) {
    const manifestPath = modelUiPublicPath(useCase, "manifest_path");
    const manifest = await readModelUiManifestForPublicBuild(useCase);
    const useCaseDir = path.join(outDir, path.dirname(manifestPath));

    for (const candidate of manifest?.diagnostic_candidates ?? []) {
      for (const relativePath of [
        candidate.artifact_path,
        candidate.screenshot_path,
        candidate.capture_file,
      ]) {
        if (relativePath === undefined || relativePath === null) continue;
        const safePath = assertSafeRelativePath(
          relativePath,
          `${useCase.id}/${candidate.id} diagnostic source path`,
        );
        await fs.rm(path.join(useCaseDir, safePath), { force: true });
      }
    }
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

async function buildComponentSpecimenAssets(outDir) {
  await buildWithEsbuild({
    entryPoints: [path.join(__dirname, "component-specimens.jsx")],
    outfile: path.join(outDir, "assets", "component-specimens.js"),
    bundle: true,
    format: "esm",
    target: "es2020",
    minify: true,
    logLevel: "silent",
  });
}

export async function buildSite(
  outDir = DEFAULT_OUT_DIR,
  { homepageFilmEnabled = HOMEPAGE_FILM_ENABLED } = {},
) {
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
  await fs.mkdir(path.join(outDir, "assets", "releases"), { recursive: true });

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
  await fs.copyFile(
    path.join(__dirname, "assets", HOMEPAGE_HERO_ART_FILENAME),
    path.join(outDir, "assets", HOMEPAGE_HERO_ART_FILENAME),
  );
  await fs.copyFile(
    path.join(
      __dirname,
      "assets",
      "releases",
      VISUAL_COMPOSITION_RECORDING_FILENAME,
    ),
    path.join(
      outDir,
      "assets",
      "releases",
      VISUAL_COMPOSITION_RECORDING_FILENAME,
    ),
  );
  await fs.copyFile(
    path.join(
      __dirname,
      "assets",
      "releases",
      VISUAL_COMPOSITION_DARK_RECORDING_FILENAME,
    ),
    path.join(
      outDir,
      "assets",
      "releases",
      VISUAL_COMPOSITION_DARK_RECORDING_FILENAME,
    ),
  );
  await fs.copyFile(
    path.join(
      __dirname,
      "assets",
      "releases",
      VISUAL_COMPOSITION_POSTER_FILENAME,
    ),
    path.join(
      outDir,
      "assets",
      "releases",
      VISUAL_COMPOSITION_POSTER_FILENAME,
    ),
  );
  await fs.copyFile(
    path.join(
      __dirname,
      "assets",
      "releases",
      VISUAL_COMPOSITION_DARK_POSTER_FILENAME,
    ),
    path.join(
      outDir,
      "assets",
      "releases",
      VISUAL_COMPOSITION_DARK_POSTER_FILENAME,
    ),
  );
  await fs.copyFile(
    path.join(
      ROOT,
      "scripts",
      "visual-composition-film",
      VISUAL_COMPOSITION_LIVE_DEMO_FILENAME,
    ),
    path.join(
      outDir,
      "assets",
      "releases",
      VISUAL_COMPOSITION_LIVE_DEMO_FILENAME,
    ),
  );
  await buildSystemMapFlowAssets(outDir);
  await buildComponentSpecimenAssets(outDir);
  await fs.writeFile(
    path.join(outDir, "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#133f4e"/><path d="M18 34.5 28 44l19-24" fill="none" stroke="#f8f7f2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`,
  );
  await fs.writeFile(
    path.join(outDir, "index.html"),
    renderHomepage({ homepageFilmEnabled }),
  );
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
    path.join(outDir, "design-system", "visual-composition-policy.json"),
    jsonExport(designSystemModel.exports.visualCompositionPolicy),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "component-inventory.json"),
    jsonExport(designSystemModel.exports.componentInventory),
  );
  await fs.writeFile(
    path.join(outDir, "design-system", "component-registry.json"),
    jsonExport(designSystemModel.exports.componentRegistry),
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
    path.join(outDir, "design-system", "surface-presentation-profiles.json"),
    jsonExport(designSystemModel.exports.surfacePresentationProfiles),
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
  await copyDirectoryIfExists("examples/er-flow-dashboard", path.join(outDir, "examples", "er-flow-dashboard"));
  await copyDirectoryIfExists("examples/ai-native-design-system", path.join(outDir, "examples", "ai-native-design-system"));
  await copyPublicEvalReports(outDir);
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
  await writePublicModelUiManifests(outDir);
  await removePublicModelUiDiagnosticFiles(outDir);
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
